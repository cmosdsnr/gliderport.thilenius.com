#!/usr/bin/perl -w
use POSIX;
use strict;
use warnings;
use Proc::Find qw(find_proc proc_exists);
use IO::Handle;

my $filename = '/home/pi/logs/cameraWait.log';
open my $fh, '>>', $filename or die "Could not open file '$filename' $!";
$fh->autoflush;

my $offline=0;
my $cmd = "wget 192.168.88.216 2>&1";
my $i = `$cmd`;
# print "$i\n";
if($i =~ /failed/) {
    print "camera not online\n";
    print "starting loop\n";
    $offline = 1;
} else {
    print "camera is online\n";
}
# select()->flush();

while ($offline) {
    sleep(60);
    $i = `$cmd`;
    # print "$i\n";
    if(!($i =~ /failed/)) {
        print "camera is online\n";
        $offline = 0;
    } else {
        print "camera not online\n";
    }
    # select()->flush();
} 


close $fh;



