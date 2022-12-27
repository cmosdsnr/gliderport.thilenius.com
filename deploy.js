import FtpDeploy from 'ftp-deploy';

const ftpDeploy = new FtpDeploy();

const config = {
    host: "ftp.sandiegofreeflight.com",
    user: "sandiel8",
    password: "Flyt0rrey1!",
    port: 21,
    localRoot: "./dist",
    remoteRoot: "/public_html/live/",
    include: ["*", "**/*"],
    // e.g. exclude sourcemaps, and ALL files in node_modules (including dot files)
    exclude: [
        "dist/**/*.map",
        "node_modules/**",
        "node_modules/**/.*",
        ".git/**",
    ],
    // delete ALL existing files at destination before uploading, if true
    deleteRemote: false,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false,
};

ftpDeploy
    .deploy(config)
    .then((res) => console.log("finished:", res))
    .catch((err) => console.log(err));