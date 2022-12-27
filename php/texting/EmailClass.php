<?php
/**
 * Class Email
 * Creates a phpMailer object and mails messages
 * Used to email text messages to folks
 */


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;


require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/Exception.php';
require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/PHPMailer.php';
require '/home1/sandiel8/www/live/php/texting/PHPMailer/src/SMTP.php';

// Options: 0 = off, 1 = commands, 2 = commands and data, perfect to see SMTP 
// errors, see the PHPMailer manual for more
define("PHPMAILER_DEBUG_MODE", 1);
// use SMTP or basic mail() ? SMTP is strongly recommended
define("EMAIL_USE_SMTP", true);
// leave this true until your SMTP can be used without login
define("EMAIL_SMTP_AUTH", true);
// SMTP provider port
define("EMAIL_SMTP_PORT", 587);
// SMTP encryption, usually SMTP providers use "tls" or "ssl", for details 
//see the PHPMailer manual
define("EMAIL_SMTP_ENCRYPTION", 'tls');

define("EMAIL_SMTP_HOST",     'smtp.gmail.com');
define("EMAIL_SMTP_USERNAME", 'glider.port.wind.alert@gmail.com');
define("EMAIL_SMTP_PASSWORD", 'qxhzpfxewjdnqcky');

define("EMAIL_FROM_EMAIL",    "glider.port.wind.alert@gmail.com");
define("EMAIL_FROM_NAME",     "Gliderport Wind");


$mail = new PHPMailer();
$mail->IsSMTP();
$mail->Mailer = "smtp";


/**
 * Email
 *
 */
class Email
{
    
    /**
     * __construct 
     */
    public function __construct()
    {
        $this->mail = new PHPMailer;
        // set PHPMailer to use SMTP
        $this->mail->IsSMTP();
        // useful for debugging, shows full SMTP errors, config this in 
        // config/config.php
        $this->mail->SMTPDebug = PHPMAILER_DEBUG_MODE;
        // enable SMTP authentication
        $this->mail->SMTPAuth = EMAIL_SMTP_AUTH;
        // enable encryption, usually SSL/TLS 
        if (defined('EMAIL_SMTP_ENCRYPTION')) {
            $this->mail->SMTPSecure = EMAIL_SMTP_ENCRYPTION;
        }
        // set SMTP provider's credentials
        $this->mail->Host = EMAIL_SMTP_HOST;
        $this->mail->Username = EMAIL_SMTP_USERNAME;
        $this->mail->Password = EMAIL_SMTP_PASSWORD;
        $this->mail->Port = EMAIL_SMTP_PORT;
        
        // fill mail with data
        $this->mail->IsHTML(true);
        $this->mail->From = EMAIL_FROM_EMAIL;
        $this->mail->FromName = EMAIL_FROM_NAME;

    }
    
  
    // **************************************
    // Email functions
    // **************************************
        
    /**
     * Text the person whos conditions have been met
     */
    public function letThemKnow($subject, $message, $to)
    {
        $this->mail->AddAddress($to);
        $this->mail->Subject = $subject;
        $this->mail->Body = $message;
        // final sending and check
        try {
            $h = $this->mail->Send();
        } catch (phpmailerException $e) {
            return $e->errorMessage(); //Pretty error messages from PHPMailer
        }
        return $h;
    }
            
    /**
     * Test message to address
     */
    public function sendTestMessage($to, $name)
    {
        $this->mail->AddAddress($to);
        $this->mail->Body = "Hi $name, This message is a test from live.torrey.com";
        // final sending and check
        try {
            $h = $this->mail->Send();
        } catch (phpmailerException $e) {
            return $e->errorMessage(); //Pretty error messages from PHPMailer
        }
        return $h;
    }
}


