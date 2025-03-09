import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";

export var app: any | null = null;

export const startExpress = () => {
  app = express();

  const port = process.env.PORT || 1234;
  app.listen(port, () => {
    console.log(`Updater listening on port data.${port}`);
  });

  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  var corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/, /.*/],
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  };
  //
  app.use(cors(corsOptions));
  app.use(express.static("/app/gliderport"));

  // enable files upload
  // const options: fileUpload.Options = {
  //   createParentPath: true,
  //   limits: {
  //     fileSize: 2 * 1024 * 1024 * 1024, //2GB max file(s) size
  //   },
  // };
  // app.use(fileUpload(options));

  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
};
