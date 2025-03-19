import nodemailer from "nodemailer";
import { pb } from "./pb";

type Targets = {
  [userId: string]: {
    address: string;
    direction: number;
    duration: number;
    errorAngle: number;
    speed: number;
    name: string;
    sent: number;
  };
};

const targets: Targets = {};

export const resetTextUsers = () => {
  Object.keys(targets).forEach((targetKey, i) => {
    targets[targetKey].sent = 0;
  });
};

export const syncTextUsers = () => {
  return;
  try {
    pb.collection("users")
      .getFullList(2000, {
        filter: "textMe = true",
        expand: "user",
      })
      .then((users: any[]) => {
        for (const user of users) {
          targets[user.id] = {
            address: user.settings.address,
            direction: user.settings.direction,
            duration: user.settings.duration,
            errorAngle: user.settings.errorAngle,
            speed: user.settings.speed,
            name: user.user.firstName ? user.user.firstName : "User",
            sent: 0,
          };
        }
      });
    pb.collection("users").subscribe("*", (e: any) => {
      const user = e.record;
      if (user && (e.action === "create" || e.action === "update"))
        if (user.textMe === true)
          targets[user.id] = {
            address: user.settings.address,
            direction: user.settings.direction,
            duration: user.settings.duration,
            errorAngle: user.settings.errorAngle,
            speed: user.settings.speed,
            name: user.user.firstName ? user.user.firstName : "User",
            sent: 0,
          };
        else delete targets[user.id];
    });
  } catch (error: any) {
    console.error("Error syncing text users", error.message);
  }
};

export const checkAndSendTexts = (speed: number[], dir: number[]) => {
  Object.keys(targets).forEach(async (targetKey, i) => {
    const target = targets[targetKey];
    const targetSpeed = speed[target.duration];
    const targetDir = dir[target.duration];
    const duration = [1, 5, 15][target.duration];

    if (!target.sent && targetSpeed >= target.speed && Math.abs(270 - targetDir) <= target.errorAngle) {
      sendTextMessage(target.address, target.name, {
        speed: targetSpeed,
        direction: targetDir,
        duration: duration,
      });
      target.sent = new Date().getTime();
    }
  });
};

export const sendTextMessage = (to: string, name: string, data: any) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "glider.port.wind.alert@gmail.com",
      pass: "qxhzpfxewjdnqcky",
    },
  });

  var mailOptions: mailOptionsType = {
    from: "glider.port.wind.alert@gmail.com",
    name: "Gliderport Wind",
    to: to,
    subject: "",
  };

  if (data === null) {
    mailOptions.text = `Hi ${name}, This message is a test from the gliderport`;
  } else {
    mailOptions.html =
      `${name}, Time to Fly!\n` +
      `Wind was at ${data.direction} deg at ${data.speed} mph over the past ${data.duration} min, ` +
      "\nMake changes to your alert <a href='https://gliderport.thilenius.com'>here</a>";
  }
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
