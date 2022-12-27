<?php

//putenv("GOOGLE_APPLICATION_CREDENTIALS='/home/thillnea/www/gliderport/newsite/php/netninja-game-guidez-1d8c2-firebase-adminsdk-w55cp-e90b7fc724.json'");
require __DIR__ . '/vendor/autoload.php';


//https://googleapis.github.io/google-cloud-php/#/docs/cloud-firestore/v1.20.1/firestore/documentsnapshot?method=reference


use Google\Cloud\Firestore\FirestoreClient;

$firestore = new FirestoreClient();
$collection = $firestore->collection('donors');


//add a new document
$newUser = $collection->add([
    'name' => 'Test Case'
]);

//query just that document
$query = $collection->where('name', '=', 'Test Case');
$donors = $query->documents();
print "Count: " . $donors->size() . "\n";
foreach ($donors as $donor) {
    printf('Donor: %s' . PHP_EOL, $donor['name']);
}
print "\n";

// look at everything
$snapshot = $collection->documents();
foreach ($snapshot as $donor) {
    printf('Donor: %s %s' . PHP_EOL, $donor->name(), $donor['name']);
    if ($donor['name'] == 'Test Case') {
        $donor->reference()->delete();
    }
}
print "\n";

// look at everything again
$snapshot = $collection->documents();
foreach ($snapshot as $donor) {
    printf('Donor: %s %s' . PHP_EOL, $donor->name(), $donor['name']);
}
print "\n";


//"create" a new collection
$collection = $firestore->collection('Nusers');

//add a new document
$newUser = $collection->add([
    'firstName' => 'Stephen',
    'lastName' => 'Thilenius'
]);

//look at everything
$snapshot = $collection->documents();
foreach ($snapshot as $user) {
    printf('User: %s %s %s' . PHP_EOL, $user->name(), $user['firstName'], $user['lastName']);
}
// remove all the documents (which gets rid of the collection)
foreach ($snapshot as $user) {
    $user->reference()->delete();
}
print "\n";
