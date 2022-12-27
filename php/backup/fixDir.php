<?php

/**
 * Maintain firestore graphs data 
 * Add POST data to local Db sandiel8_live
 */

ini_set('display_errors', 1);

error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "config_raspberry.php";  // use raspberry data base on namecheap, table gliderport
require "libs/Database.php";
require "libs/Controller.php";


$Controller = new Controller();
$db = $Controller->db;
if (isset($_GET['d']) && isset($_GET['a'])) {
    $sql  = "UPDATE `gliderport` SET `direction`=" . $_GET['d'] . " WHERE `recorded`='" . $_GET['a'] . "';";
    // $query = $db->query($sql);
    echo "$sql\n";
}
