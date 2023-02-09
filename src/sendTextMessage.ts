import nodemailer from "nodemailer";
import { globals } from "./globals";

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
    globals.debugInfo.sentTexts.push({
      direction: data.direction,
      duration: data.duration,
      speed: data.speed,
      to,
      when: Math.floor((Date.now() + globals.offset) / 1000),
    });
    mailOptions.html =
      `${name}, Time to Fly!\n` +
      `Wind was at ${data.direction} deg at ${data.speed} mph over the past ${data.duration} min, ` +
      "\nMake changes to your alert <a href='https://live.flytorrey.com'>here</a>";
  }
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
