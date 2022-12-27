<?php

/**
 * Class Database
 * Creates a PDO database connection. This connection will be passed 
 * into the models (so we use the same connection for 
 * all models and prevent to open multiple connections at once)
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
 * Database
 * 
 * PHP version 5
 *
 * @category CategoryName
 * @package  PackageName
 * @author   Stephen Thilenius <stephen@thilenius.com>
 * @license  http://www.php.net/license/3_01.txt  PHP License 3.01
 * @link     http://pear.php.net/package/PackageName
 */
class Database extends PDO
{
    /**
     * Construct this Database object, extending the PDO object
     * By the way, the PDO object is built into PHP by default
     */
    public function __construct()
    {
        /**
         * Set the (optional) options of the PDO connection. in this case, we set
         * the fetch mode to "objects", which means all results will be objects, 
         * like this: $result->user_name !
         * For example, fetch mode FETCH_ASSOC would return results like this: 
         *  $result["user_name"] 
         * 
         * @see http://www.php.net/manual/en/pdostatement.fetch.php
         */
        $options = array(
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ, 
            PDO::ATTR_ERRMODE => PDO::ERRMODE_WARNING
        );

        /**
         * Generate a database connection, using the PDO connector
         * 
         * @see http://net.tutsplus.com/tutorials/php/why-you-should-be-using-phps-pdo-for-database-access/
         * Also important: We include the charset, as leaving it out seems to be a
         * security issue
         */
        parent::__construct(
            DB_TYPE . ':host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8', 
            DB_USER, 
            DB_PASS, 
            $options
        );
    }
}
