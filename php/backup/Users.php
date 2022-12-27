<?php
require_once './vendor/autoload.php';

use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

class Users
{
    protected $database;
    protected $dbname = 'donors';

    public function __construct()
    {
        $acc = ServiceAccount::fromJsonFile(__DIR__ . '/netninja-game-guidez-1d8c2-firebase-adminsdk-w55cp-e90b7fc724.json');
        $firebase = (new Factory)->withServiceAccount($acc)->create();
        $this->database = $firebase->getDatabase();
    }

    public function get(int $name = NULL)
    {
        if (empty($name) || !isset($name)) {
            return FALSE;
        }
        if ($this->database->getReference($this->dbname)->getSnapshot()->hasChild($name)) {
            return $this->database->getReference($this->dbname)->getChild($name)->getValue();
        } else {
            return FALSE;
        }
    }

    public function vd(int $name = NULL)
    {
        var_dump($this->database->getReference($this->dbname)->getSnapshot());
    }

    public function insert(array $data)
    {
        if (empty($data) || !isset($data)) {
            return FALSE;
        }
        foreach ($data as $key => $value) {
            $this->database->getReference()->getChild($this->dbname)->getChild($key)->set($value);
        }
        return TRUE;
    }

    public function delete(int $name)
    {
        if (empty($name) || !isset($name)) {
            return FALSE;
        }
        if ($this->database->getReference($this->dbname)->getSnapshot()->hasChild($name)) {
            $this->database->getReference($this->dbname)->getChild($name)->remove();
            return TRUE;
        } else {
            return FALSE;
        }
    }
}
