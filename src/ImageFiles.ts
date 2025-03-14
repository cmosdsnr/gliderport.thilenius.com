import express, { Request, Response, Router } from "express";
import fs from "fs";
import cron from "node-cron";
import { isDirectory } from "./fileOps.js";
import { log } from "./log.js";
import { pb } from "./pb.js";
import { connection } from "./SqlConnect.js";

const ImageFiles = (): Router => {
  const lastFiveSmallImagesCamera1: Buffer[] = [];
  const lastFiveSmallImagesCamera2: Buffer[] = [];

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

  const cameraDefault = {
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
  };

  function getImageStats(directoryPath: string): ImageStats {
    let indexA: boolean[] = Array(9999).fill(false);
    let indexB: boolean[] = Array(9999).fill(false);

    const results: ImageStats = {
      CameraA: { ...cameraDefault },
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
        results.CameraB = { ...cameraDefault };
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

  const imageCount = (date: string, from: number, to: number, camera: number) => {
    let ans: string[] = [];
    // split date at - and check for 3 parts
    const [year, month, day] = date.split("-");
    if (year.length != 4 || month.length != 2 || day.length != 2) return { error: "date format is not yyyy-mm-dd" };
    const directoryPath = `/app/gliderport/${year}/${month}/${date}`;
    try {
      let files = fs.readdirSync(`/app/gliderport/${year}/${month}/${date}`);
      files.forEach((file: string) => {
        if (file.match(/image/)) {
          if (camera == 1 && file.match(/-2-/)) return;
          if (camera == 2 && file.match(/-1-/)) return;
        }
        const fileDate = getFileDate(directoryPath + "/" + file);
        const hour = fileDate ? new Date(fileDate).getHours() : -1;
        if (hour >= from && hour <= to) ans.push(file);
      });
      return { files: ans };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  //scan all files and create the information database
  const scanEntireDirectory = async () => {
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
  const createListingRecord = async () => {
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

  const getListingRecord = async () => {
    const res = await pb.collection("ImageFileData").getOne(ToId("listing"));
    return res.data;
  };

  const getImageData = async (year: number, month: number) => {
    try {
      const res = await pb.collection("ImageFileData").getOne(ToId(year + month.toString().padStart(2, "0")));
      return res.data;
    } catch (err) {
      return {};
    }
  };

  const scanLatestDirectory = async () => {
    try {
      const listing = await pb.collection("ImageFileData").getOne(ToId("listing"));
      const mostRecent = await pb.collection("ImageFileData").getList(1, 1, {
        filter: 'id~"000020"',
        sort: "-id", // descending
      });
      // log("rescan", "latest record", JSON.stringify(mostRecent));
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
          listing.data[year][parseInt(month).toString()].push(parseInt(day.slice(8, 10)));
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
    } catch (err: any) {
      log("scan", `error in scanLatestDirectory: ${err.message}`);
      console.error(err);
    }
  };

  // Schedule scanLatestDirectory to run at 1:00 am every day.
  cron.schedule("0 1 * * *", () => {
    scanLatestDirectory();
  });

  const router = express.Router();

  router.get("/scanLatestDirectory", async (req: Request, res: Response) => {
    res.json(await scanLatestDirectory());
  });

  router.get("/scanEntireDirectory", async (req: Request, res: Response) => {
    scanEntireDirectory();
    res.json({ status: "ok" });
  });

  router.get("/createListingRecord", async (req: Request, res: Response) => {
    createListingRecord();
    res.json({ status: "ok" });
  });

  router.get("/listing", async (req: Request, res: Response) => {
    res.json(await getListingRecord());
  });

  router.get("/imageCount", (req: Request, res: Response) => {
    // check for required parameters
    if (req.query.date === undefined)
      return res
        .status(400)
        .json({ error: "date not provided", ...req.query, help: "add ?date=2025-04-12 to the url" });
    if (req.query.from === undefined)
      return res.status(400).json({ error: "from not provided", ...req.query, help: "add ?from=0 to the url" });
    if (req.query.to === undefined)
      return res.status(400).json({ error: "to not provided", ...req.query, help: "add ?to=23 to the url" });
    if (req.query.camera === undefined)
      return res.status(400).json({ error: "camera not provided", ...req.query, help: "add ?camera=1|2 to the url" });
    res.json(
      imageCount(
        req.query.date as string,
        parseInt(req.query.from as string),
        parseInt(req.query.to as string),
        parseInt(req.query.camera as string)
      )
    );
  });

  // read the image data from a directory on disk
  router.get("/getImageData", async (req: Request, res: Response) => {
    if (req.query.year === undefined)
      return res.status(400).json({ error: "year not provided", ...req.query, help: "add ?year=2025 to the url" });
    if (req.query.month === undefined)
      return res.status(400).json({ error: "month not provided", ...req.query, help: "add ?month=4 to the url" });
    res.json(await getImageData(parseInt(req.query.year as string), parseInt(req.query.month as string)));
  });

  // called by the front end when it loads
  router.get("/latestImages", (req: Request, res: Response) => {
    res.json();
  });

  router.post("/updateImage", (req: Request, res: Response) => {
    //size 1=small, 2=big
    //camera 1=left, 2=right
    if (
      req.body.A === undefined ||
      req.body.size === undefined ||
      req.body.camera === undefined ||
      req.body.size < 1 ||
      req.body.camera < 1 ||
      req.body.size > 2 ||
      req.body.camera > 2
    )
      return res
        .status(400)
        .json({ error: "data, size or camera not provided", ...req.body, help: "add data, size and camera to body" });

    const imageBuffer = Buffer.from(req.body.A, "base64");
    const index = req.body.size + 2 * (req.body.camera - 1);
    connection?.query("UPDATE images SET d=? WHERE `id`=" + index, imageBuffer, function (err, results, fields) {});
    if (index == 4)
      connection?.query(
        `UPDATE server_sent SET last_image=${Math.floor(new Date().getTime() / 1000)} WHERE id=1`,
        () => {}
      );
    // Store last 5 small images for each camera
    if (req.body.size === 1) {
      if (req.body.camera === 1) {
        lastFiveSmallImagesCamera1.push(imageBuffer);
        if (lastFiveSmallImagesCamera1.length > 5) {
          lastFiveSmallImagesCamera1.shift(); // Remove the oldest image
        }
      } else if (req.body.camera === 2) {
        lastFiveSmallImagesCamera2.push(imageBuffer);
        if (lastFiveSmallImagesCamera2.length > 5) {
          lastFiveSmallImagesCamera2.shift(); // Remove the oldest image
        }
      }
    }
    res.json({ status: "Ok", camera: req.body.camera, size: req.body.size, index: index });
  });

  router.get("/getLastFiveSmallImages", (req: Request, res: Response) => {
    res.json({
      camera1: lastFiveSmallImagesCamera1.map((buf) => buf.toString("base64")), // Convert buffers to Base64
      camera2: lastFiveSmallImagesCamera2.map((buf) => buf.toString("base64")),
    });
  });

  router.post("/updateLog", (req: Request, res: Response) => {
    //   const { operation_date } = req.body;
    //   // Create a Date object from the ISO8601 string
    //   const opDate = new Date(operation_date);

    //   // Optionally, check if the date is valid:
    //   if (isNaN(opDate.getTime())) {
    //     return res.status(400).json({ error: "Invalid operation_date" });
    //   }

    //   console.log("Parsed operation date:", opDate);

    //   // Further processing...

    res.json({ status: "ok", sent: req.body });
  });

  router.get("/gotoSleep", (req: Request, res: Response) => {
    connection?.query("UPDATE `server_sent` SET `sleeping`=`true` WHERE `id`=1", (err, results, fields) => {
      res.json({ status: "going to sleep", results });
    });
  });

  router.get("/wakeUp", (req: Request, res: Response) => {
    connection?.query("UPDATE `server_sent` SET `sleeping`=`false` WHERE `id`=1", (err, results, fields) => {
      res.json({ status: "waking up", results });
    });
  });

  return router;
};

export default ImageFiles;
