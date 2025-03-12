import fs from "fs";
import cron from "node-cron";
import { isDirectory } from "./fileOps.js";
import { log } from "./log.js";
import { pb, pbInit } from "./pb.js";

await pbInit();

const ToId = (x: string) => {
  return "0".repeat(15 - x.length) + x;
};

function getFileDate(filePath: string): number | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.getTime();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function getImageStats(directoryPath: string): ImageStats {
  let indexA: boolean[] = Array(9999).fill(false);
  let indexB: boolean[] = Array(9999).fill(false);

  const results: ImageStats = {
    CameraA: {
      // original camera pointing right
      starting: {
        file: "",
        time: +Infinity,
      },
      ending: {
        file: "",
        time: -Infinity,
      },
      smallestIndex: 0,
      largestIndex: 0,
      numFiles: 0,
      numMissing: 0,
      isContinuous: true,
      video: false,
    },
    formatType: 0, // 0:image1000.jpg 1:image10000.jpg 2:image-1/2-10000.jpg
  };

  try {
    const files = fs.readdirSync(directoryPath);
    if (!files || files.length === 0) {
      log("getImageStats", "no files in ", directoryPath);
      return results;
    }
    if (files[0].match(/image\d{4}.jpg/)) {
      results.formatType = 0;
    } else if (files[0].match(/image\d{5}.jpg/)) {
      results.formatType = 1;
    } else if (files[0].match(/image-\d-\d{5}.jpg/)) {
      results.formatType = 2;
      results.CameraB = { ...results.CameraA }; // second camera pointing left
    }
    files.forEach((file: string) => {
      if (file.match(/image/)) {
        let Camera = results.CameraA;
        let Index = indexA;
        if (results.formatType == 2 && file.match(/-2-/)) {
          Camera = results.CameraB!;
          Index = indexB;
        }
        Camera.numFiles++;
        const fileDate = getFileDate(directoryPath + "/" + file);
        if (fileDate) {
          if (fileDate < Camera.starting.time) {
            Camera.starting.time = fileDate;
            Camera.starting.file = file;
          }
          if (fileDate > Camera.ending.time) {
            Camera.ending.time = fileDate;
            Camera.ending.file = file;
          }
        }

        //extract the 4 or 5 digit number from the name
        let num = parseInt(file.match(/\d{4,5}/)![0]);
        if (results.formatType == 0) num -= 1000;
        else num -= 10000;
        Index[num] = true;
        if (num > Camera.largestIndex) Camera.largestIndex = num;
        if (num < Camera.smallestIndex) Camera.smallestIndex = num;
      } else {
        // log("skipping ", file);
      }
    });
    for (let i = results.CameraA.smallestIndex; i <= results.CameraA.largestIndex; i++) {
      if (!indexA[i]) {
        results.CameraA.isContinuous = false;
        results.CameraA.numMissing++;
      }
    }

    if (
      results.CameraA.isContinuous &&
      results.CameraA.largestIndex - results.CameraA.smallestIndex + 1 != results.CameraA.numFiles
    )
      log(
        "getImageStats",
        "CameraA: ",
        results.CameraA.largestIndex,
        results.CameraA.smallestIndex,
        results.CameraA.numFiles
      );

    if (results.CameraB) {
      for (let i = results.CameraB.smallestIndex; i <= results.CameraB.largestIndex; i++) {
        if (!indexB[i]) {
          results.CameraB.isContinuous = false;
          results.CameraB.numMissing++;
        }
      }

      if (
        results.CameraB.isContinuous &&
        results.CameraB.largestIndex - results.CameraB.smallestIndex + 1 != results.CameraB.numFiles
      )
        log(
          "getImageStats",
          "CameraB: ",
          results.CameraB.largestIndex,
          results.CameraB.smallestIndex,
          results.CameraB.numFiles
        );
    }
    return results;
  } catch (err: any) {
    log("getImageStats", directoryPath, err.message);
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

  let images: Record<string, Record<string, Record<string, ImageStats>>> = {};
  //scan the /app/gliderport directory for directories of the form 20xx where xx are numbers
  files = fs.readdirSync("/app/gliderport");
  log("scanEntireDirectory", "files: ", files.length);
  for (let i = 0; i < files.length; i++) {
    let year = files[i];
    if (year == "video") {
    }
    if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/${year}`)) {
      images[year] = {};
      let months = fs.readdirSync(`/app/gliderport/${year}`);

      log("scanEntireDirectory", months.length, "months to do this year");
      for (let j = 0; j < months.length; j++) {
        let month = months[j];
        log("scanEntireDirectory", "date: " + year + "/" + month);
        // scan that directory for 'nn' format directories (two numbers) that are directories themselves
        if (month.match(/^\d{2}$/) && isDirectory(`/app/gliderport/${year}/${month}`)) {
          images[year][month] = {};
          let dates = fs.readdirSync(`/app/gliderport/${year}/${month}`);
          log("scanEntireDirectory", dates.length, "dates to do this month");
          for (let k = 0; k < dates.length; k++) {
            let date = dates[k];
            // 'day' is like 2024-10-12
            images[year][month][date] = getImageStats(`/app/gliderport/${year}/${month}/${date}`);
            const v = videos[year].filter((fn: string) => fn.match(new RegExp(`^${date}.*mp4$`)));
            v.forEach((f: string) => {
              if (f.match(/-2-/)) images[year][month][date].CameraB!.video = true;
              else images[year][month][date].CameraA.video = true;
            });
          }
          const id = ToId(year + month);
          log("scanEntireDirectory", "id: ", id);
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

  log("mostRecent: ", mostRecent.items[0].id, "year:", year, "month:", month);

  if (isDirectory(`/app/gliderport/${year}/${month}`)) {
    log("rescan", `/app/gliderport/${year}/${month}`);
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
    log("id: ", id);
    await pb
      .collection("ImageFileData")
      .update(id, { data: res })
      .catch((err: any) => console.error(err.message));
    await pb
      .collection("ImageFileData")
      .update(listing.id, { data: listing.data })
      .catch((err: any) => console.error(err.message));
  } else log("directory does not exist");

  month = parseInt(month) + 1;
  year = parseInt(year);
  if (month > 12) {
    month = 1;
    year = year + 1;
  }
  month = month.toString().padStart(2, "0");
  year = year.toString();

  if (isDirectory(`/app/gliderport/${year}/${month}`)) {
    log("scan", `/app/gliderport/${year}/${month}`);
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

// Schedule scanLatestDirectory to run at 1:00 am every day.
cron.schedule("0 1 * * *", () => {
  scanLatestDirectory();
});
