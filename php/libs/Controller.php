<?php
/**
 * This is the "base controller class". All other "real" controllers extend this 
 * class.
 * Whenever a controller is created, we also
 * 1. initialize a session
 * 2. check if the user is not logged in anymore (session timeout) but has a cookie
 * 3. create a database connection (that will be passed to all models that need a 
 *    database connection)
 * 4. create a view object
 * 
 * PHP version 5
 *
 * @category   CategoryName
 * @package    PackageName
 * @author     Stephen Thilenius <stephen@thilenius.com>
 * @copyright  2000-2020 Thilenius Group
 * @license    http://www.php.net/license/3_01.txt  PHP License 3.01
 * @version    SVN: $Id$
 * @link       http://pear.php.net/package/PackageName
 * @see        NetOther, Net_Sample::Net_Sample()
 * @since      File available since Release 1.2.0
 * @deprecated File deprecated in Release 2.0.0
 */

/**
 * Controller
 * 
 * PHP version 5
 *
 * @category CategoryName
 * @package  PackageName
 * @author   Stephen Thilenius <stephen@thilenius.com>
 * @license  http://www.php.net/license/3_01.txt  PHP License 3.01
 * @link     http://pear.php.net/package/PackageName
 */
class Controller
{
    
    /**
     * __construct
     *
     * @return void  Adds database to controller
     */
    function __construct()
    {

        // create database connection
        try {
            $this->db = new Database();
        } catch (PDOException $e) {
            die('{"Error":"Database connection could not be established."}');
        }
    }
}
