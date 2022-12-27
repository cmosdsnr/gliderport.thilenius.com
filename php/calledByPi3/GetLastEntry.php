<?php

/**
 * Called from gliderport raspberry pi 3 to see what the last entry was in the gliderport table
 * 
 */

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

$row = $db->query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1")->fetch();
echo json_encode($row);
