<?php

/**
 * Fetch donor list from sandiel8_live:donors
 * Called when contribute page is loaded
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


// needed tables are in the sandiel8_live dB 
require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
echo json_encode($Controller->db->query("SELECT * FROM `donors` WHERE 1;")->fetchAll());
