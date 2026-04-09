#!/usr/bin/perl -w

# ********************************
# CALLED EVERY TWO HOURS FROM CRON
# in cron/EveryTwoHours
# ********************************

use strict;
use warnings;
use Net::FTP;
use Scalar::Util qw(looks_like_number);
use DateTime;
# open the logToFile(file)
my $filename = '/home/pi/logs/images_archive.log';
open my $fh, '>>', $filename or die "Could not open file '$filename' $!";
$fh->autoflush;
print {$fh} "\n";

my $ftploc = '66.75.35.7';       #pi4 at home to archive
my $ftpImageloc = '68.65.122.49'; #namecheap server to recieve image
my $root = '/home/pi/gpImages';
my $dest = '/media/pi/6C61-F47F9/gliderport';

sub logToFile {
   my ($text) = @_;
   #print $text;
   print {$fh} $text;
}

sub uploadFile {
    my ($file) = @_;
    `/home/pi/bin/put.sh $file`;
    `mv $file archive`
}

sub uploadVideo {
    my ($dir) = @_;

   # NO LONGER NECESSARY:
   #upload video/$dir.mp4 to thilenius.com
   #`curl -v -F video=\@video/$dir.mp4 https://gpupdate.thilenius.com/uploadVideo`;
   return 0;
}

#find today
my $tz = DateTime::TimeZone->new( name => 'America/Los_Angeles' );
my $dt = DateTime->now;
$dt->set_time_zone( $tz );
my $y = $dt->year;
my $r = $dt->month;
if($r<10) { $r ="0".$r;}
my $d = $dt->day;
if($d<10) { $d ="0".$d;}
my $today = "$y-$r-$d";
logToFile($dt->strftime('%Y-%m-%d %H:%M:%S')."\n");
# print "$today\n";

my $flag = 0;
#find directories that need packing
if(1) {
    logToFile("look for directories that need packing");
    chdir $root;
    opendir (DIR, ".") or die $!;
    while (my $dir = readdir(DIR)) {
        if(-d $dir && $dir ne $today && $dir =~ /(\d{4})-(\d{2})-(\d{2})/) {
            $flag = 1;
            logToFile("\nprocessing $dir...\n");
            if(-e "video/$dir.mp4") {
                unlink("video/$dir.mp4");
                                logToFile("   found video file that shouldn't be there yet\n");
            }
            logToFile("Archiving...");
            `/home/pi/bin/archive.sh $dir $dest`;
            logToFile("done.\n");
        }
    }
    if($flag) {
      logToFile("")
    } else {
      logToFile(": none found\n")
    }
    closedir(DIR);
}

#find tar.gz's that need uploading
if(1) {
    logToFile("check tar.gz files for buddbliss Archive");
    $flag = 0;
    chdir $dest;
    opendir (DIR, ".") or die $!;
    while (my $file = readdir(DIR)) {
        if($file =~ /(\d{4})-(\d{2})-(\d{2}).tar.gz/) {
            $flag = 1;
            logToFile("\nuploading $file...");
            uploadFile($file);
            logToFile("done.");
        }
    }
    if($flag) {
      logToFile("\n")
    } else {
      logToFile(": none found\n")
    }
    closedir(DIR);
}


#delete some files from usb stick if it's getting full
if(1) {
    chdir "$dest/archive";
    my @a=`df /dev/sda1`;
    @a = split / +/, $a[1];
    $a[4] =~ s/%//g;
    my $f = $a[4];
    logToFile("USB is $f% full");
    my $found = 1;
    if($f > 90) {
        logToFile(", remove some older days\n");
    } else
    {
        logToFile(", all good\n")
    }
    while($f > 90 && $found) {
        my ($y, $m, $d) = (3000,13,32);
        $found = 0;
        opendir (DIR, ".") or die $!;
        while (my $file = readdir(DIR)) {
            # print "$file\n";
            if($file =~ /(\d{4})-(\d{2})-(\d{2}).tar.gz/) {
                $found = 1;
                if($1 < $y) {
                    $y = $1;
                    $m = $2;
                    $d = $3;
                }
                else {
                    if($1 == $y && $2 < $m) {
                      $m = $2;
                      $d = $3;
                    } else {
                       if($1 == $y && $2 == $m && $3 < $d) {
                           $d = $3;
                       }
                    }
                }
            }
        }
        if($found) {
            @a=`df /dev/sda1`;
            @a = split / +/, $a[1];
            $a[4] =~ s/%//g;
            $f = $a[4];
            logToFile("remove the oldest file is $y-$m-$d.tar.gz, now $f% used\n");
            unlink("$y-$m-$d.tar.gz");
        }
    }
}