#!/usr/bin/perl -w
use strict;
use warnings;
use Net::FTP;
use Scalar::Util qw(looks_like_number);
use DateTime;
use Math::Trig;
use constant PI => 3.14159265358979;

#print debug statements
my $debug=0;

# open the logToFile(file)
my $filename = '/home/pi/logs/images_only.log';
open my $fh, '>>', $filename or die "Could not open file '$filename' $!";
$fh->autoflush;
print {$fh} "\n";


my $ftpImageloc = 'ftp.sandiegofreeflight.com'; #flytorrey server to recieve image
#my $ftpImageloc2 = '68.65.122.49'; #namecheap server to recieve image
my $ftploc = '66.75.35.7';        #pi4 to archive
my $camera1= '192.168.88.216';        #glipderport camera from the inside
my $camera2= '192.168.88.217';        #glipderport camera from the inside
#my $camera = '104.36.31.118:8080';        #glipderport camera from the outside


my $Sunset;
my $Sunrise;
my $timeZone;
my $imageCnt = 10000;
my $tz = DateTime::TimeZone->new( name => 'America/Los_Angeles' );
my $delay = 15;  #seconds between images
my $waitTime;
my $dp;
my $dir;
my $minutes=-1;
my $lastMinutes=-1;
my $startLog= 0;

my $minBeforeSunrise = 15;
my $minAfterSunset = 22;

my $root = '/home/pi/gpImages';
my $dest = '/media/pi/62DE-3F10/gliderport';
my $nightTime = "OffTime.jpg";
my $outOfOrder = "OutOfOrder.jpg";
my $failed = 0;
my $retryZip = 0;

sub logToFile {
   my ($text) = @_;
   #print $text;
   print {$fh} $text;
}

sub sunTimes  {
#    my ($file_name, $event, $delta) = @_;
    my $latitude = 32.89;
    my $longitude= -117.25;
    my $tz = DateTime::TimeZone->new( name => 'America/Los_Angeles' );
    my $dt = DateTime->now;
    $dt->set_time_zone( $tz );
    $dt->set_hour(12);
    $dt->set_minute(0);
    $dt->set_second(0);
    
    my $epoc = $dt->epoch;
    my $julianDay = $epoc / 86400.0 + 2440587.5;
    $timeZone = $tz->offset_for_datetime( $dt )/3600;

    my $julianCentury = ($julianDay-2451545.0)/36525.0;
    my $geomMeanLongSun = (280.46646+$julianCentury*(36000.76983 + $julianCentury*0.0003032));
    $geomMeanLongSun = $geomMeanLongSun - 360*int($geomMeanLongSun/360);
    my $geomMeanAnomSun = 357.52911+$julianCentury*(35999.05029 - 0.0001537*$julianCentury);
    my $EccentEarthOrbit = 0.016708634-$julianCentury*(0.000042037+0.0000001267*$julianCentury);
    my $SunEqofCtr = sin(deg2rad($geomMeanAnomSun))*(1.914602-$julianCentury*(0.004817+0.000014*$julianCentury))+sin(deg2rad(2*$geomMeanAnomSun))*(0.019993-0.000101*$julianCentury)+sin(deg2rad(3*$geomMeanAnomSun))*0.000289;
    my $SunTrueLong = $geomMeanLongSun + $SunEqofCtr;
    my $SunAppLong = $SunTrueLong-0.00569-0.00478*sin(deg2rad(125.04-1934.136*$julianCentury));
    my $MeanObliqEcliptic = 23+(26+((21.448-$julianCentury*(46.815+$julianCentury*(0.00059-$julianCentury*0.001813))))/60)/60;
    my $ObliqCorr  = $MeanObliqEcliptic+0.00256*cos(deg2rad(125.04-1934.136*$julianCentury));
    my $SunDeclin = rad2deg(asin(sin(deg2rad($ObliqCorr))*sin(deg2rad($SunAppLong))));
    my $ha = rad2deg(
                  acos(
                    cos(deg2rad(90.833))/
                      (cos(deg2rad($latitude)) * cos(deg2rad($SunDeclin)))-
                  tan(deg2rad($latitude))*tan(deg2rad($SunDeclin))));
    my $VarY =  tan(deg2rad($ObliqCorr/2))*tan(deg2rad($ObliqCorr/2));
    my $EqOfTime = 4*rad2deg($VarY*sin(2*deg2rad($geomMeanLongSun))-2*$EccentEarthOrbit*sin(deg2rad($geomMeanAnomSun))+4*$EccentEarthOrbit*$VarY*sin(deg2rad($geomMeanAnomSun))*cos(2*deg2rad($geomMeanLongSun))-0.5*$VarY*$VarY*sin(4*deg2rad($geomMeanLongSun))-1.25*$EccentEarthOrbit*$EccentEarthOrbit*sin(2*deg2rad($geomMeanAnomSun)));
    my $SolarNoon = (720-4*$longitude - $EqOfTime+$timeZone*60)/1440;
    $Sunrise =($SolarNoon*1440-$ha*4)/1440;
    $Sunset  =($SolarNoon*1440+$ha*4)/1440;

    $Sunrise -= $minBeforeSunrise/(60*24);   # 15 min before sunrise
    $Sunset  += $minAfterSunset/(60*24);   # 22 min after  sunset


    logToFile("$minBeforeSunrise min before Sunrise is at ".dayFraToTime($Sunrise)."\n");
    logToFile("$minAfterSunset min after Sunset is at ".dayFraToTime($Sunset)."\n");
}

sub dayFraToTime {
    my ($dayFra) = @_;
    my ($h, $m, $s);
    $h = int(24*$dayFra);
    $m = int(24*60*$dayFra) - 60*$h;
    $s = int(24*60*60*$dayFra) -60*$m - 60*60*$h;
    if($h < 10) { $h = "0".$h; }
    if($m < 10) { $m = "0".$m; }
    if($s < 10) { $s = "0".$s; }
    $minutes = $m;
    return "$h:$m:$s";
}

sub secToTime {
    my ($numSec) = @_;
    my ($h, $m, $s);
    $h = int($numSec/3600);
    $m = int($numSec/60) - 60*$h;
    $s = $numSec -60*$m - 60*60*$h;
    if($h < 10) { $h = "0".$h; }
    if($m < 10) { $m = "0".$m; }
    if($s < 10) { $s = "0".$s; }
    return "$h:$m:$s";
}

sub gotoDir  {
    chdir $root;
    $imageCnt = 10000;
    my $dt = DateTime->now;
    $dt->set_time_zone( $tz );
                my $y = $dt->year;
    my $r = $dt->month;
    if($r<10) { $r ="0".$r;}
    my $d = $dt->day;
    if($d<10) { $d ="0".$d;}
    $dir = "$y-$r-$d";
    logToFile("Todays directory is $dir\n");

    if(-d $dir) {
        logToFile("The directory $dir already exists\n");
        chdir $dir;
        opendir (DIR, ".") or die $!;
        while (my $file = readdir(DIR)) {
            if($file =~ /image(\d{5}).jpg/) {
                if($1 >= $imageCnt) {
                    $imageCnt = 1+$1;
                }
            }
        }
        closedir(DIR);
        logToFile("first file will be image$imageCnt\n");
    } else {
        logToFile("Creating the directory $dir\n");
        mkdir $dir;
        chdir $dir;
    }
}

sub uploadImage{
   my ($file1, $file2, $camera) = @_;

   #upload current.jpg to thilenius.com
   `cat $file1 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `echo "camera=$camera" >>enc`;
   `echo "size=0" >>enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateImage" --post-file='enc'`;

   #upload image$imageCnt.jpg to thilenius.com
   `cat $file2 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `echo "camera=$camera" >>enc`;
   `echo "size=1" >>enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateImage" --post-file='enc'`;
}

sub uploadImage1{
   my ($file1, $file2) = @_;

   #upload current.jpg to thilenius.com
   `cat $file1 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateSmallImage1" --post-file='enc'`;

   #upload image$imageCnt.jpg to thilenius.com
   `cat $file2 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateBigImage1" --post-file='enc'`;
}

sub uploadImage2{
   my ($file1, $file2) = @_;

   #upload current.jpg to thilenius.com
   `cat $file1 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateSmallImage2" --post-file='enc'`;

   #upload image$imageCnt.jpg to thilenius.com
   `cat $file2 | base64 |  tr '/+' '_-' | tr -d '\n=' | sed -E 's/^/A=/' >enc`;
   `wget -q -O -  "http://gpupdate.thilenius.com/updateBigImage2" --post-file='enc'`;
}

#    my $ftp = Net::FTP->new($ftpImageloc, Debug => 0, Timeout => 30 );
#    if($ftp) {
#        unless ($ftp->login('sandiel8','Flyt0rrey1!')) {
#            logToFile("Cannot login ".$ftp->message);
#            return 1;
#        }
#        $ftp->binary();
#        $ftp->cwd('www/live/images');
#        $ftp->put($file1, "current.jpg");
#        $ftp->put($file2, "current_big.jpg");
#        $ftp->quit;
#        return 0;
#    } else {
#    logToFile("Could not connect to thilenius site\n");
#    return 2;
#    }                                        

# go to next 30s mark
my $del = DateTime->now->epoch;
$del = 30 - (int($del) - 30*int($del/30));
logToFile("wait for half-minute mark, ${del}s\n");
sleep $del;

#timestamp after wake
my $ts = DateTime->now->epoch;

# create/goto gpimage directory & set first image name
gotoDir();
sunTimes();
my $once = 1;
my $waitForMidnight = 0;

while(1){
    my $dt = DateTime->now;
    my $epoc = $dt->epoch;
    $epoc += $timeZone*3600;
    $epoc /= 3600*24;
     # dp has the fraction of amount of this day that has passed, 0 = none, 1 = all of it
    $dp = $epoc-int($epoc);
    my $tmm = dayFraToTime($dp);
    $waitTime = $delay;

    if($waitForMidnight) {
        # it's the start of a new day
        # so calculate new sunrise/sunset times once
        sunTimes();
        $waitForMidnight = 0;
    }

    if($dp < $Sunrise) {
        # it is right after midnight, prep and wait till sunrise
        gotoDir();
        $waitTime = int(60*60*24*($Sunrise-$dp))+10;
        logToFile("($tmm) $minBeforeSunrise min before Sunrise will be in $waitTime seconds (".secToTime($waitTime)."), going to sleep till then\n");
    }

    if($dp > $Sunset) {
        # the sun just set, set night image and sleep till midnight
        $waitTime = 60+int(60*60*24*(1-$dp));
        # when we wake up it will be a new day, so calc new sun times above
        $waitForMidnight = 1;
        logToFile("\n($tmm) Sun has set, wait till after midnight in $waitTime seconds (".secToTime($waitTime).")\n");
        chdir $root;
        eval { uploadImage1($nightTime, $nightTime); }; #isoate errors so they don't crash the program
        eval { uploadImage2($nightTime, $nightTime); }; #isoate errors so they don't crash the program
    }


    if($waitTime == $delay) {
        `wget -q -O image-1-$imageCnt.jpg --http-user=admin --http-password=gliderport http://$camera1/cgi-bin/snapshot.cgi`;

        if(-s "image-1-$imageCnt.jpg" > 50000) { #file seems to have arrived
            `ffmpeg -y -i image-1-$imageCnt.jpg -vf scale=860:-1 current-1.jpg -hide_banner -loglevel error`;
            eval { uploadImage1("current-1.jpg", "image-1-$imageCnt.jpg"); };  #isoate errors so they don't crash the program

            $lastMinutes = $minutes;
            if(($startLog == 0) || ($minutes < $lastMinutes)) {
              logToFile("\n$tmm: cnt:$imageCnt ");
              $startLog = 1;
            } else {
                logToFile(".");
            }
            $imageCnt++;
                        $dt = DateTime->now->epoch;
            while( $ts < $dt ) {$ts += $delay; }
            $waitTime = $ts - $dt;
            $once = 1;
        } else {
            # got bad size for image$imageCnt
            # write this error only once untill we get a valid file again
            if($once){
                my $s = -s "image$imageCnt.jpg";
                logToFile("x");
                #logToFile("got a bad file of size $s... try again\n");
                $once = 0;
            }
            $waitTime = 5;
        }

        `wget -q -O image-2-$imageCnt.jpg --http-user=admin --http-password=gliderport http://$camera2/cgi-bin/snapshot.cgi`;
        if(-s "image-2-$imageCnt.jpg" > 50000) { #file seems to have arrived
            `ffmpeg -y -i image-2-$imageCnt.jpg -vf scale=860:-1 current-2.jpg -hide_banner -loglevel error`;
            eval { uploadImage2("current-2.jpg", "image-2-$imageCnt.jpg"); };  #isoate errors so they don't crash the program
        }

    }
    if($waitTime > 0) {
       sleep $waitTime;
    }

}
