// var gulp = require("gulp"),
//     gutil = require("gulp-util"),
//     ftp = require("vinyl-ftp"),
//     watch = require("gulp-watch");

import gulp from 'gulp'
import gutil from 'gulp-util'
import ftp from 'vinyl-ftp'
import watch from 'gulp-watch'

function getFtpConnection() {
    return ftp.create({
        host: "ftp.sandiegofreeflight.com",
        user: "sandiel8",
        password: "Flyt0rrey1!",
        idleTimeout: 200,
        parallel: 2,
        maxConnections: 2,
        log: gutil.log,
        //secure: true
    });
}

function getFtpConnection_old() {
    return ftp.create({
        host: "gliderport.thilenius.com",
        user: "thillnea",
        password: "Qwe123qwe!",
        idleTimeout: 200,
        parallel: 2,
        maxConnections: 2,
        log: gutil.log,
        //secure: true
    });
}

function getPiFtpConnection() {
    return ftp.create({
        host: "192.168.0.7",
        user: "pi",
        password: "qwe123",
        idleTimeout: 200,
        parallel: 2,
        maxConnections: 2,
        log: gutil.log,
        //secure: true
    });
}

var conn, localFiles, remoteFolder, localFolder;

gulp.task("ftp-deploy-watch", function () {
    gulp
        .watch(localFiles, { debounceDelay: 9000, awaitWriteFinish: true })
        .on("change", function (path, stats) {
            return gulp
                .src([path], { base: localFolder, buffer: false })
                .pipe(conn.dest(remoteFolder));
        });
});

gulp.task("ftp-plus-deploy-watch", function () {
    gulp
        .watch(["cron/**/*"], { debounceDelay: 9000, awaitWriteFinish: true })
        .on("change", function (path, stats) {
            return gulp
                .src([path], { base: 'cron', buffer: false })
                .pipe(conn.dest('/public_html/live/cron'));
        });
    gulp
        .watch(["php/**/*", "!php/backup", "!php/config_*", "!php/testing", "!php/composer.json"], { debounceDelay: 9000, awaitWriteFinish: true })
        .on("change", function (path, stats) {
            return gulp
                .src([path], { base: 'php', buffer: false })
                .pipe(conn.dest("/public_html/live/php"));
        });
    gulp
        .watch(localFiles, { debounceDelay: 9000, awaitWriteFinish: true })
        .on("change", function (path, stats) {
            // conn.clean("/public_html/live/static/**/*", 'dist/static');
            return gulp
                .src([path], { base: localFolder, buffer: false })
                .pipe(conn.dest(remoteFolder));
        });



});

gulp.task("ftp-deploy", function () {
    return gulp
        .src(localFiles, { base: localFolder, buffer: false })
        .pipe(conn.newer(remoteFolder)) // only upload newer files
        .pipe(conn.dest(remoteFolder));

});

gulp.task("ftp-plus-deploy", function () {
    gulp
        .src(localFiles, { base: localFolder, buffer: false })
        .pipe(conn.newer(remoteFolder)) // only upload newer files
        .pipe(conn.dest(remoteFolder));
    // conn.clean("/public_html/live/static/**/*", 'dist/static');
    gulp
        .src(["php/**/*", "!php/backup/*", "!php/config_*", "!php/testing/*", "!php/composer.json"], { buffer: false })
        .pipe(conn.newer("/public_html/live/php")) // only upload newer files
        .pipe(conn.dest("/public_html/live/php"));
    return gulp
        .src(["cron/**/*"], { buffer: false })
        .pipe(conn.newer("/public_html/live/cron")) // only upload newer files
        .pipe(conn.dest('/public_html/live/cron'));

});

gulp.task("flyTorreyConn", function (cb) {
    conn = getFtpConnection();
    localFiles = ["dist/**/*"];
    remoteFolder = "/public_html/live";
    localFolder = "dist";
    cb();
});


gulp.task("PiConn", function (cb) {
    conn = getPiFtpConnection();
    localFiles = ["../Pi3 at gliderport/php/**/*.*"];
    remoteFolder = "/var/www/html/php";
    localFolder = "../Pi3 at gliderport/php";
    cb();
});

gulp.task("PyConn", function (cb) {
    conn = getPiFtpConnection();
    localFiles = ["../Pi3 at gliderport/python/**/*.*"];
    remoteFolder = "/home/pi/python";
    localFolder = "../Pi3 at gliderport/python";
    cb();
});

gulp.task("default", gulp.series(["flyTorreyConn", "ftp-plus-deploy", "ftp-plus-deploy-watch"]));
gulp.task("pi", gulp.series(["PiConn", "ftp-deploy", "ftp-deploy-watch"]));
gulp.task("py", gulp.series(["PyConn", "ftp-deploy", "ftp-deploy-watch"]));
