import fs from "fs";
import { isDirectory } from "./fileOps.js";

import { pb, pbInit } from "./pb.js";
await pbInit();

const ToId = (x: string) => {
  return "0".repeat(15 - x.length) + x;
};

function getFileDate(filePath: string): Date | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function getImageStats(directoryPath: string): ImageStats {
  let index: boolean[] = Array(9999).fill(false);

  const results: ImageStats = {
    isContinuous: true,
    numFiles: 0,
    numMissing: 0,
    earliestFile: "",
    lastFile: "",
    formatType: -1,
    smallestIndex: 999999,
    largestIndex: 0,
  };
  let ed = new Date();
  let ld = new Date(0);

  try {
    const files = fs.readdirSync(directoryPath);
    files.forEach((file: string) => {
      if (file.match(/image/)) {
        results.numFiles++;
        if (results.formatType === -1) {
          if (file.match(/image\d{4}.jpg/)) {
            results.formatType = 0;
          } else if (file.match(/image\d{5}.jpg/)) {
            results.formatType = 1;
          } else if (file.match(/image-\d-\d{5}.jpg/)) {
            results.formatType = 2;
          }
        }
        const fileDate = getFileDate(directoryPath + "/" + file);
        if (fileDate) {
          if (fileDate < ed) {
            ed = fileDate;
            results.earliestFile = file;
          }
          if (fileDate > ld) {
            ld = fileDate;
            results.lastFile = file;
          }
        }
        const filePath = `${directoryPath}/${file}`;
        //extract the 4 or 5 digit number from the name
        let num = parseInt(file.match(/\d{4,5}/)![0]);
        if (results.formatType == 0) num -= 1000;
        else num -= 10000;
        index[num] = true;
        if (num > results.largestIndex) results.largestIndex = num;
        if (num < results.smallestIndex) results.smallestIndex = num;
      } else {
        // console.log("skipping ", file);
      }
    });
    for (let i = results.smallestIndex; i <= results.largestIndex; i++) {
      if (!index[i]) {
        results.isContinuous = false;
        results.numMissing++;
      }
    }
    results.earliestTime = ed.getTime();
    results.lastTime = ld.getTime();
    return results;
  } catch (err: any) {
    console.error(err);
    results.error = err.message;
    return results;
  }
}

//scan all files and create the information database
export const scanEntireDirectory = async () => {
  let videos: any = {};
  let files = fs.readdirSync("/app/gliderport/video");
  for (let i = 0; i < files.length; i++) {
    let year = files[i];
    if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/video/${year}`))
      videos[year] = fs.readdirSync(`/app/gliderport/video/${year}`);
  }

  let images: any = {};
  //scan the /app/gliderport directory for directories of the form 20xx where xx are numbers
  files = fs.readdirSync("/app/gliderport");
  //   console.log("files: ", files.length);
  for (let i = 0; i < files.length; i++) {
    let year = files[i];
    if (year == "video") {
    }
    if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/${year}`)) {
      images[year] = {};
      let months = fs.readdirSync(`/app/gliderport/${year}`);
      for (let j = 0; j < months.length; j++) {
        let month = months[j];
        // console.log("month: ", month);
        // scan that directory for 'nn' format directories (two numbers) that are directories themselves
        if (month.match(/^\d{2}$/) && isDirectory(`/app/gliderport/${year}/${month}`)) {
          images[year][month] = {};
          let days = fs.readdirSync(`/app/gliderport/${year}/${month}`);
          for (let k = 0; k < days.length; k++) {
            let day = days[k];
            // 'day' is like 2024-10-12
            images[year][month][day] = getImageStats(`/app/gliderport/${year}/${month}/${day}`);
            images[year][month][day].video = videos[year].filter((fn: string) => fn.match(new RegExp(`^${day}.*mp4$`)));
          }
          const id = ToId(year + month);
          console.log("id: ", id);
          await pb
            .collection("ImageFileData")
            .update(id, { data: images[year][month] })
            .catch((err: any) => console.error(err.message));
        }
      }
    }
  }
};

//create the listing record
export const createListingRecord = async () => {
  // load all records from ImageFileData
  let ans: any = {};
  const res = await pb.collection("ImageFileData").getList(0, 9999);
  res.items.forEach((item: any) => {
    let year = parseInt(item.id.slice(9, 13));
    //if year is a number
    if (!isNaN(year)) {
      if (ans[year] === undefined) ans[year] = {};
      let month = parseInt(item.id.slice(13, 15));
      if (ans[year][month] === undefined) ans[year][month] = [];
      Object.keys(item.data).forEach((date: string) => {
        ans[year][month].push(parseInt(date.slice(8, 10)));
      });
    }
  });
  await pb
    .collection("ImageFileData")
    .update(ToId("listing"), { data: ans })
    .catch((err: any) => console.error(err.message));
};

export const getListingRecord = async () => {
  const res = await pb.collection("ImageFileData").getOne(ToId("listing"));
  return res.data;
};

export const getImageData = async (year: number, month: number) => {
  try {
    const res = await pb.collection("ImageFileData").getOne(ToId(year + month.toString().padStart(2, "0")));
    return res.data;
  } catch (err) {
    return {};
  }
};

export const scanLatestDirectory = async () => {
  const listing = await pb.collection("ImageFileData").getOne(ToId("listing"));
  const mostRecent = await pb.collection("ImageFileData").getList(1, 1, {
    filter: { id: { $regex: "20\\d{4}" } },
    sort: "-id", // descending
  });
  // id has format 000000000202503 where 2025 is the year and 03 is the month
  let year = mostRecent.items[0].id.slice(9, 13);
  let month = mostRecent.items[0].id.slice(13, 15);

  console.log("mostRecent: ", mostRecent.items[0].id, "year:", year, "month:", month);

  if (isDirectory(`/app/gliderport/${year}/${month}`)) {
    console.log("rescan", `/app/gliderport/${year}/${month}`);
    listing.data[year][month] = [];
    let res: any = {};
    let videos = fs.readdirSync(`/app/gliderport/video/${year}`);
    let days = fs.readdirSync(`/app/gliderport/${year}/${month}`);
    for (let k = 0; k < days.length; k++) {
      let day = days[k];
      res[day] = getImageStats(`/app/gliderport/${year}/${month}/${day}`);
      res[day].video = videos.filter((fn: string) => fn.match(new RegExp(`^${day}.*mp4$`)));
      listing.data[year][month].push(parseInt(day.slice(8, 10)));
    }
    const id = ToId(year + month);
    console.log("id: ", id);
    await pb
      .collection("ImageFileData")
      .update(id, { data: res })
      .catch((err: any) => console.error(err.message));
    await pb
      .collection("ImageFileData")
      .update(listing.id, { data: listing.data })
      .catch((err: any) => console.error(err.message));
  } else console.log("directory does not exist");

  month = parseInt(month) + 1;
  year = parseInt(year);
  if (month > 12) {
    month = 1;
    year = year + 1;
  }
  month = month.toString().padStart(2, "0");
  year = year.toString();

  if (isDirectory(`/app/gliderport/${year}/${month}`)) {
    console.log("scan", `/app/gliderport/${year}/${month}`);
    let res: any = {};
    let videos = fs.readdirSync(`/app/gliderport/video/${year}`);
    let days = fs.readdirSync(`/app/gliderport/${year}/${month}`);
    for (let k = 0; k < days.length; k++) {
      let day = days[k];
      res[day] = getImageStats(`/app/gliderport/${year}/${month}/${day}`);
      res[day].video = videos.filter((fn: string) => fn.match(new RegExp(`^${day}.*mp4$`)));
    }
    const id = ToId(year + month);
    await pb
      .collection("ImageFileData")
      .create({ id, data: res })
      .catch((err: any) => console.error(err.message));
  }
};

// everyday at between 1-2am local time, call backup
setInterval(() => {
  if (new Date().getHours() == 1) scanLatestDirectory();
}, 3600000); // 1 hr
