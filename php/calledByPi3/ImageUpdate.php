<?php

/**
 * Update last_image in server_sent table
 * Called from raspberry Pi at gliderport
 */

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$ts = (new DateTime("now", timezone_open('America/Los_Angeles')))->getTimestamp();
$Controller = new Controller();
$Controller->db->query("UPDATE `server_sent` SET `last_image`=$ts WHERE `id`=1");
