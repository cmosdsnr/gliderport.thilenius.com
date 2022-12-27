<?php

/**
 * New functionality 7/15/22
 * Called from pi4 /home/pi/php/monInternetConn.pl which in turn is called by cron and checks status every 60s
 * called only when status changes with status = 0,1
 * 
 * ***  Update the ServerSent table of the database with the current status
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

if (!array_key_exists('password', $_GET)) {
    echo "password not provided\n";
    exit();
}
if ($_GET['password'] === "ilove2fly") {
    if (isset($_GET['status'])) {
        // make sure it's a 0 or 1 or 2
        $dt = new DateTime();
        $dt->setTimezone(timezone_open('America/Los_Angeles'));

        if ($_GET['status'] == 2) {
            $sql  = "UPDATE `server_sent` SET `online_status_touched`='{$dt->format("Y-m-d H:i:s")}' WHERE 1";
            $db->query($sql);
        } else {
            if ($_GET['status'] == 1) {
                $i = 1;
            } else {
                $i = 0;
            }

            $sql  = "UPDATE `server_sent` SET `online_status`=$i WHERE `id`=1";
            $db->query($sql);

            $sql  = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('{$dt->format("Y-m-d H:i:s")}',$i)";
            $db->query($sql);

            echo "changed status to $i\n";
            exit();
        }
    }
    echo "status was not set\n";
    exit();
}
echo "password of `" . $_GET['password'] . "` is wrong\n";
