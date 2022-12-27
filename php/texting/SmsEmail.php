<?php

/**
 * Send a text message to an address
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


require "EmailClass.php";

if($_GET['to']){
    $mailClass    = new Email();
    $mailClass->sendTestMessage($_GET['to']);
}