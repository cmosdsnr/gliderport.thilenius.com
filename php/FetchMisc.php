<?php

/**
 * Fetch codes from history record date=1 from sandiel8_live:history which has todays forecast codes
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


// needed tables are in the sandiel8_live dB 
require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

if ($_GET['id']) {
    $d = $db->query("SELECT * FROM `miscellaneous` WHERE id='{$_GET['id']}';")->fetch();
    if ($d) {
        echo $d->data;
    } else {
        echo "{error:'did not find record {$_GET['id']}'}";
    }
} else {
    echo "{error:'id not provided'}";
}
