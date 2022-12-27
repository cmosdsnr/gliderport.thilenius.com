<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;


require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/Exception.php';
require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/PHPMailer.php';
require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/SMTP.php';

$mail = new PHPMailer();
$mail->IsSMTP();
$mail->Mailer = "smtp";

$mail->SMTPDebug  = 1;  
$mail->SMTPAuth   = TRUE;
$mail->SMTPSecure = "tls";
$mail->Port       = 587;
$mail->Host       = "smtp.gmail.com";
$mail->Username   = 'glider.port.wind.alert@gmail.com';
$mail->Password   = 'qxhzpfxewjdnqcky';
$mail->IsHTML(true);
$mail->AddAddress("stephen@thilenius.com", "Stephen Thilenius");
$mail->SetFrom("glider.port.wind.alert@gmail.com", "Wind Alert");
$mail->Subject = "Test is Test Email sent via Gmail SMTP Server using PHP Mailer";
$content = "<b>This is a Test Email sent via Gmail SMTP Server using PHP mailer class.</b>";

$mail->MsgHTML($content); 
if(!$mail->Send()) {
  echo "Error while sending Email.";
  var_dump($mail);
} else {
  echo "Email sent successfully";
}