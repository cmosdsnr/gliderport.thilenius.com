# Overview

This directory contains the backend Node.js server for the Torrey Pines Gliderport site. It is responsible for collecting, archiving, and synchronizing sensor data from the gliderport hardware (ESP32, Raspberry Pi, etc.) with PocketBase and SQL databases. The server exposes API endpoints for system status, data retrieval, and device management, and handles periodic data export and cleanup.

## Connecting

### Externally Exposed Ports

- Esp32            : Needs To be done   [http:/104.36.31.118:8080](http:/104.36.31.118:8080)
- Camera 1 (right) : [http:/104.36.31.118:8081](http:/104.36.31.118:8081)
- Camera 2 (Left)  : [http:/104.36.31.118:8082](http:/104.36.31.118:8082)
- Camera 1 Stream  : [http:/104.36.31.118:554](http:/104.36.31.118:554)
- Camera 2 Stream  : [http:/104.36.31.118:555](http:/104.36.31.118:555)

### SSH connection

```powershell
ssh -L 3307:127.0.0.1:3306 -L 8085:127.0.0.1:80     -L 90:192.168.88.1:80 \
    -L 91:192.168.88.16:80 -L 216:192.168.88.216:80 -L 217:192.168.88.217:80 \
    pi@104.36.31.118
```

| Localhost Port | Description           | MAC Address       |
| -------------- | --------------------- | ----------------- |
| 3307           | MySQL database        | cmosdsnr/qwe123   |
| 8085           | Pi3 web interface     |                   |
| 90             | RouterOS management   |                   |
| 91             | ESP32 device web page |                   |
| 216            | Camera 1  (right)     | 00:1F:54:8B:8C:23 |
| 217            | Camera 2  (left)      | 00:1F:54:8B:90:19 |

u:admin pw:gliderport  (both cameras)

## Directory Overview

- **src/**  
  Main TypeScript source code for the update server, including:
  - `app.ts`: Main loop for periodic data sync and update.
  - `startExpress.ts`: Express server setup and route registration.
  - `routes/`: Express route handlers for ESP device, stats, and SQL endpoints.
  - `sql.ts`: MySQL connection and raw data ingestion.
  - `syncCycle.ts`: Main logic for ingesting ESP sensor data, storing in SQL, and syncing with PocketBase.
  - `pb.ts`: PocketBase integration and admin authentication.
  - `records/`: Utilities for exporting, packing, and reading monthly binary data files.
  - `log.ts`: File-based logging utility.
  - `init.ts`: Initialization helpers and delay utility.
  - `oldUpdates.ts`: Legacy sync logic for backfilling data to the remote server.

## What it does

- Reads ESP32 sensor data every 15 seconds and stores it in the local SQL database.
- Syncs new records with PocketBase (gpData) and, if enabled, with the legacy SQL db.
- On the second of every month, exports the previous month's data to a binary file and deletes records older than two months.
- Provides HTTP endpoints for device management, system status, and data retrieval.
- Logs all activity to a rotating log file.

## API Endpoints ([http://localhost:8085](http://localhost:8085))

- `/espIP`: Update the ESP32 device IP address.
- `/stats`: Get system status and debug info.
- `/tryRead`: Test binary file reading for a given month/year.
- `/getRawData`: Retrieve raw sensor data from a given timestamp.

## Deployment

To deploy or update on the Raspberry Pi at the gliderport:

1. Run `go.bat` to add/commit/push to GitHub.
2. SSH to the Pi.
3. `cd gliderport/gp_pi3_server`
4. Run: `git pull origin main; yarn build;`
5. Or from `~/gliderport`:

```bash
    mv gp_pi3_server/bin .
    rm -rf gp_pi3_server
    git clone git@github.com:cmosdsnr/gp_pi3_server.git
    mv bin gp_pi3_server
```

## Other Pi3 Operations

### CRON jobs

- crontab -e has
  - @reboot /home/pi/cron/reboot
  - 0 0 \* \* \* /home/pi/gliderport/archive.sh       (midnight)

#### reboot

```bash
#!/bin/bash
date > /home/pi/logs/reboot.log
sleep 10

cd /home/pi/gliderport/gp_pi3_server
node dist/app.js &> /home/pi/logs/pi3.log &
cd ~

echo "started reboot, waiting for camera..." >> /home/pi/logs/reboot.log
#wait 10s for all networks to start up
sleep 10
/home/pi/perl/waitForCamera.pl
echo "done" >> /home/pi/logs/reboot.log
date >> /home/pi/logs/reboot.log

/home/pi/gliderport/collectImages.pl &

#run this in case we lots power at night and didn't do out archiving
/home/pi/gliderport/archive.pl &

echo "started programs" >> /home/pi/logs/reboot.log
```


#### waitForCamera.pl

```perl
#!/usr/bin/perl -w
use POSIX;
use strict;
use warnings;
use Proc::Find qw(find_proc proc_exists);
use IO::Handle;

my $filename = '/home/pi/cameraWait.log';
open my $fh, '>>', $filename or die "Could not open file '$filename' $!";
$fh->autoflush;

my $offline=0;
my $cmd = "wget 192.168.88.216 2>&1";
my $i = `$cmd`;
if($i =~ /failed/) {
    print "camera not online\n";
    print "starting loop\n";
    $offline = 1;
} else {
    print "camera is online\n";
}

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
```

#### collectImages.pl

```perl
#!/usr/bin/perl -w
use strict;
use warnings;
use DateTime;
use DateTime::Event::Sunrise;

# Open the log file
my $logFilePath = '/home/pi/logs/cameras.log';
open my $logFH, '>>', $logFilePath or die "Could not open file '$logFilePath': $!";
$logFH->autoflush;
print {$logFH} "\n";

# Global settings
my $debug = 0;
my $sunriseDt;
my $sunsetDt;
my $sunriseDayFraction;    # fraction of the day for sunrise (0..1)
my $sunsetDayFraction;     # fraction of the day for sunset  (0..1)
my $imageIndex       = 10000;
my $localTimeZone    = DateTime::TimeZone->new( name => 'America/Los_Angeles' );

my $taskInterval          = 15;  # seconds between tasks
my $taskCnt               = 0;  # 0,1,2: 0=15s mark
my $imagesRootDir         = '/home/pi/gliderport/gpImages';

my $leadBeforeSunriseMins = 15;
my $delayAfterSunsetMins  = 22;

my $loggingStarted        = 0;
my $minutes               = -1;  # (Unused, but left in if needed)
my $lastMinutes           = -1;  # (Unused, but left in if needed)

# Logging helper
sub logToFile {
    my ($text) = @_;
    print {$logFH} $text;
}

# Convert a fraction (0-1) of a day into "HH:MM:SS"
sub fractionToTime {
    my ($fraction) = @_;
    my $seconds = int($fraction * 24 * 3600);
    return sprintf(
        "%02d:%02d:%02d",
        int($seconds / 3600),
        int(($seconds % 3600) / 60),
        $seconds % 60
    );
}

# Calculate sunrise/sunset times (as day fractions) using DateTime::Event::Sunrise
sub sunTimes {
    my $latitude  = 32.89;
    my $longitude = -117.25;
    my $tzName    = 'America/Los_Angeles';
    my $dt        = DateTime->now( time_zone => $tzName );

    my $sun = DateTime::Event::Sunrise->new(
      latitude   => 32.89,
      longitude  => -117.25,
      iteration  => 1,  # sometimes needed for certain calculations
    );

    # Build a DateTime object for today's date
    my $sunDate = DateTime->new(
      year      => $dt->year,
      month     => $dt->month,
      day       => $dt->day,
      time_zone => 'America/Los_Angeles',
    );

    # Calculate sunrise
    $sunriseDt = $sun->sunrise_datetime($sunDate);
    $sunsetDt = $sun->sunset_datetime($sunDate);

    #print $sunriseDt->ymd, "T", $sunriseDt->hms, "\n";
    #print $sunsetDt->ymd, "T", $sunsetDt->hms, "\n";

    # Adjust sunrise/sunset by lead/delay
    $sunriseDt->subtract( minutes => $leadBeforeSunriseMins );
    $sunsetDt->add(      minutes => $delayAfterSunsetMins  );

    my $sunriseSeconds = $sunriseDt->hour * 3600
                       + $sunriseDt->minute * 60
                       + $sunriseDt->second;

    my $sunsetSeconds  = $sunsetDt->hour * 3600
                       + $sunsetDt->minute * 60
                       + $sunsetDt->second;

    $sunriseDayFraction = $sunriseSeconds / (24 * 3600);
    $sunsetDayFraction  = $sunsetSeconds  / (24 * 3600);

    # $sunriseDayFraction = 0.1 if $debug;
    # $sunsetDayFraction = 1 if $debug;

    logToFile("$leadBeforeSunriseMins min before Sunrise is at "
              . fractionToTime($sunriseDayFraction) . "\n");
    logToFile("$delayAfterSunsetMins min after Sunset is at "
              . fractionToTime($sunsetDayFraction)  . "\n");
}

# Create or change to today's directory based on local date
sub gotoDir {
    chdir $imagesRootDir or die "Cannot change to directory $imagesRootDir: $!";
    $imageIndex = 10000;

    my $dt  = DateTime->now( time_zone => $localTimeZone );
    my $dir = sprintf("%04d-%02d-%02d", $dt->year, $dt->month, $dt->day);
    logToFile("Today's directory is $dir\n");

    if (-d $dir) {
        logToFile("The directory $dir already exists\n");
        chdir $dir or die "Cannot chdir to $dir: $!";
        opendir(my $dh, ".") or die "Cannot open directory: $!";
        while (my $file = readdir($dh)) {
            if ($file =~ /image-[12]-(\d{5})\.jpg/) {
                my $num = $1;
                $imageIndex = $num + 1 if $num >= $imageIndex;
            }
        }
        closedir($dh);
        logToFile("first file will be image$imageIndex\n");
        print "first file will be image$imageIndex\n" if $debug;
    }
    else {
        logToFile("Creating the directory $dir\n");
        mkdir $dir or die "Cannot create directory $dir: $!";
        chdir $dir or die "Cannot chdir to $dir: $!";
    }
}


gotoDir();
sunTimes();
print "sunrise ",$sunriseDt->ymd, "T", $sunriseDt->hms, "\n" if $debug;
print "sunset  ",$sunsetDt->ymd, "T", $sunsetDt->hms, "\n" if $debug;
my $waitingForMidnight   = 0;

# Wait until the next half-minute mark
my $initialWait = DateTime->now->epoch;
$initialWait    = 30 - (int($initialWait) - 30 * int($initialWait / 30));
logToFile("wait for half-minute mark, ${initialWait}s\n");
print "wait for half-minute mark, ${initialWait}s\n" if $debug;
sleep $initialWait;
my $lastScheduledEpoch = DateTime->now->epoch;
my $sleeping = 0;

# Main loop
while (1) {
    my $dt  = DateTime->now( time_zone => $localTimeZone );
    my $seconds  = $dt->hour * 3600
                       + $dt->minute * 60
                       + $dt->second;
    my $currentDayFraction = $seconds / (24 * 3600);
    print "sr: ",$sunriseDayFraction," now: ",$currentDayFraction, " ss: ",$sunsetDayFraction,"\n" if $debug;
    my $sleepDuration = $taskInterval;

    if ($waitingForMidnight) {
        sunTimes();
        $waitingForMidnight = 0;
    }

    # If we're before sunrise => sleep until sunrise
    if ($currentDayFraction < $sunriseDayFraction) {
        gotoDir();
        $sleepDuration = int(60 * 60 * 24 * ($sunriseDayFraction - $currentDayFraction)) + 10;
        logToFile("$leadBeforeSunriseMins min before Sunrise will be in $sleepDuration seconds, going to sleep till then\n");
    }

    # If we're after sunset => wait for midnight
    if ($currentDayFraction > $sunsetDayFraction) {
        if($sleeping == 0) {
           `wget -q https://gliderport.thilenius.com/gotoSleep`;
           $sleeping = 1;
           logToFile("\nSending sleep signal\n");
        }
        $sleepDuration    = 60 + int(60 * 60 * 24 * (1 - $currentDayFraction));
        $waitingForMidnight = 1;
        logToFile("\nSun has set, wait till after midnight in $sleepDuration seconds\n");
        chdir $imagesRootDir;
        system("bash", "/home/pi/gliderport/specialImages.sh", "n");
    }

    # Normal scheduled check
    if ($sleepDuration == $taskInterval) {
        print "process\n" if $debug;
        if($sleeping) {
            `wget -q https://gliderport.thilenius.com/wakeUp`;
            $sleeping = 0;
            $taskCnt = 0;
           logToFile("\nSending wakeUp signal\n");
        }
        my $exitStatus = system("bash", "/home/pi/gliderport/processImages.sh", $imageIndex, $taskCnt);
        if (($exitStatus >> 8) == 0) {logToFile(".");}
        if (($exitStatus >> 8) == 2) {logToFile("1");}
        if (($exitStatus >> 8) == 3) {logToFile("2");}
        if (($exitStatus >> 8) == 4) {logToFile("x");}
        if ($taskCnt == 0) {$imageIndex++;}

        my $nowEpoch = DateTime->now->epoch;
        my $timeBehind = $nowEpoch - $lastScheduledEpoch;

        # number of intervals that have passed
        my $intervalsMissed = int($timeBehind / $taskInterval) + 1;
        $lastScheduledEpoch += $intervalsMissed * $taskInterval;

        $sleepDuration = $lastScheduledEpoch - $nowEpoch;
        $taskCnt = ($taskCnt +1) % 3;
    }

    print "sleep for ",$sleepDuration,"\n" if $debug;
    sleep($sleepDuration) if $sleepDuration > 0;
}
```

#### specialImages.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Endpoints
UPLOAD_ENDPOINT="http://gliderport.thilenius.com/updateImage"
LOG_ENDPOINT="http://gliderport.thilenius.com/updateLog"

# Check for exactly one parameter
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <n|o>"
  exit 1
fi

param="$1"

# Choose file based on parameter
case "$param" in
  n)
    file="/home/pi/gliderport/OffTime.base64"
    ;;
  o)
    file="/home/pi/gliderport/OutOfOrder.base64"
    ;;
  *)
    echo "Invalid parameter. Please use 'n' or 'o'."
    exit 1
    ;;
esac

# Verify the file exists
if [ ! -f "$file" ]; then
  echo "Error: File not found: $file"
  exit 1
fi

# Load file content into a variable and remove newlines
content=$(tr -d '\n' < "$file")
echo "Content size: ${#content}"

# Create JSON payload and Post JSON payload using wget
json_payload=$(printf '{"A": "%s", "camera": 1, "size": 1}' "$content")
response1=$(wget -O - --header="Content-Type: application/json" --post-data="$json_payload" "$UPLOAD_ENDPOINT" 2>&1)

json_payload=$(printf '{"A": "%s", "camera": 1, "size": 2}' "$content")
response2=$(wget -O - --header="Content-Type: application/json" --post-data="$json_payload" "$UPLOAD_ENDPOINT" 2>&1)

json_payload=$(printf '{"A": "%s", "camera": 2, "size": 1}' "$content")
response3=$(wget -O - --header="Content-Type: application/json" --post-data="$json_payload" "$UPLOAD_ENDPOINT" 2>&1)

json_payload=$(printf '{"A": "%s", "camera": 2, "size": 2}' "$content")
response4=$(wget -O - --header="Content-Type: application/json" --post-data="$json_payload" "$UPLOAD_ENDPOINT" 2>&1)

# Optionally, you might want to echo or log the responses:
echo "Response 1: $response1"
echo "Response 2: $response2"
echo "Response 3: $response3"
echo "Response 4: $response4"
```

#### processImages.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Check for required parameter
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <image_number>"
  exit 1
fi

num="$1"
taskCnt="$2"

# Endpoints
UPLOAD_ENDPOINT="http://gliderport.thilenius.com/updateImage"
LOG_ENDPOINT="http://gliderport.thilenius.com/updateLog"

# Helper function to escape a string for JSON using Python
escape_json() {
    python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'
}

###############################################
# Function: retry_wget
# Attempts to wget a file up to 3 times
# Also checks that the downloaded file is > 50000 bytes
# Returns 0 if successful, nonzero if fails after all tries
###############################################
retry_wget() {
    local url="$1"
    local outfile="$2"
    local attempts=3
    local attempt=0

    for (( attempt=1; attempt<=attempts; attempt++ )); do
        echo "Download attempt $attempt/$attempts: $url"

        set +e
        local download_response
        download_response=$(wget -O "$outfile" --http-user=admin --http-password=gliderport "$url" 2>&1)
        local wget_status=$?
        set -e

        if [ $wget_status -eq 0 ]; then
            local filesize
            filesize=$(stat -c %s "$outfile" 2>/dev/null || echo 0)
            if [ "$filesize" -gt 50000 ]; then
                # success
                echo "$download_response"
                return 0
            else
                echo "Attempt $attempt failed: file too small (${filesize} bytes)"
            fi
        else
            echo "Attempt $attempt failed: $download_response"
        fi
    done

    # If we reach here, all attempts failed
    return 1
}

###############################################
# Function: camera_error
# Post an error for a single camera
###############################################
camera_error() {
    local camnum="$1"
    local msg="$2"
    local operation_date
    operation_date=$(date --iso-8601=seconds)
    local escaped_error
    escaped_error=$(echo "$msg" | escape_json)

    local json_payload
    json_payload=$(printf '{"error": %s, "camera": %d, "operation_date": "%s"}' \
                   "$escaped_error" "$camnum" "$operation_date")

    echo "$json_payload" > cam${camnum}-error.json
    wget -q -O - --header="Content-Type: application/json" --post-file=cam${camnum}-error.json "$LOG_ENDPOINT" 2>&1
    rm -f cam${camnum}-error.json
}

###############################################
# Function: do_camera
# Attempts:
#   1) Download (with retry_wget)
#   2) ffmpeg
#   3) Upload
# Returns 0 if fully succeeded, or specific code if it fails
###############################################
do_camera() {
    local camnum="$1"
    local url="$2"
    local outfile="$3"
    local smallfile="$4"

    # 1) Download with retry_wget
    set +e
    local download_resp
    download_resp=$(retry_wget "$url" "$outfile")
    local wget_stat=$?
    set -e

    if [ $wget_stat -ne 0 ]; then
        local msg="Camera${camnum} download failed after retries: $download_resp"
        camera_error "$camnum" "$msg"
        return $((camnum + 1))
    fi

    # 2) ffmpeg scale
    set +e
    local ffmpeg_output
    ffmpeg_output=$(ffmpeg -y -i "$outfile" -vf scale=860:-1 "$smallfile" -hide_banner -loglevel error 2>&1)
    local ffmpeg_stat=$?
    set -e

    if [ $ffmpeg_stat -ne 0 ]; then
        local msg="Camera${camnum} ffmpeg error: $ffmpeg_output"
        camera_error "$camnum" "$msg"
        return $((camnum + 1))
    fi

    # 3) If success => post both small & big
    if [ $taskCnt -eq 0 ]; then
        do_upload_payload "$outfile" "$camnum" 2
    fi
    do_upload_payload "$smallfile" "$camnum" 1

    return 0
}

###############################################
# Function: do_upload_payload
#   Post JSON payload for <infile>, <camera>, <size>
###############################################
do_upload_payload() {
  local infile="$1"
  local camera="$2"
  local size="$3"

  local base64val
  base64val=$(base64 "$infile" | tr '/+' '_-' | tr -d '\n=')

  local json_payload
  json_payload=$(printf '{"A": "%s", "camera": %d, "size": %d}' "$base64val" "$camera" "$size")

  local json_file="payload.json"
  echo "$json_payload" > "$json_file"

  local response
  response=$(wget -q -O - --header="Content-Type: application/json" --post-file="$json_file" "$UPLOAD_ENDPOINT" 2>&1)

  rm -f "$json_file"
  echo "Camera${camera} size=${size} upload response: $response"
}

###############################################
# MAIN
###############################################

cam1_status=0
cam2_status=0

# Camera1
do_camera 1 "http://192.168.88.216/cgi-bin/snapshot.cgi" "image-1-${num}.jpg" "c1.jpg" || cam1_status=$?
# Camera2
do_camera 2 "http://192.168.88.217/cgi-bin/snapshot.cgi" "image-2-${num}.jpg" "c2.jpg" || cam2_status=$?

#############################################
# Post Summary JSON
#############################################
operation_date=$(date --iso-8601=seconds)
json_payload=$(printf '{"operation_date": "%s"}' "$operation_date")
echo "$json_payload" > summary.json

summary_response=$(wget -q -O - --header="Content-Type: application/json" --post-file=summary.json "$LOG_ENDPOINT" 2>&1)
echo "HTTP response: $summary_response"

rm -f summary.json

#############################################
# Cleanup
#############################################
rm -f "c1.jpg" "c2.jpg"

#############################################
# Determine final exit code
# 0 => both success
# 2 => camera1 fail, camera2 success
# 3 => camera2 fail, camera1 success
# 4 => both fail
#############################################
if [ "$cam1_status" -eq 0 ] && [ "$cam2_status" -eq 0 ]; then
    echo "Both cameras succeeded"
    exit 0
elif [ "$cam1_status" -ne 0 ] && [ "$cam2_status" -eq 0 ]; then
    echo "Camera1 failed, camera2 success"
    exit 2
elif [ "$cam1_status" -eq 0 ] && [ "$cam2_status" -ne 0 ]; then
    echo "Camera1 success, camera2 failed"
    exit 3
else
    echo "Both cameras failed"
    exit 4
fi
```

#### archive.sh 

- Run by cron at "0 0 * * * /home/pi/gliderport/archive.sh"

```bash
#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# archive.sh
#
# Unifies:
#  - The old "images_archive.pl" housekeeping logic
#  - "archive.sh" for per-directory archiving
#  - "put.sh" for waking remote disk + sftp uploading
#  - "checkAndOrderImages.sh" for validating & reindexing images
#
# Enhancements:
#   1) Additional Error Handling
#   2) Better Logging (timestamps)
#   3) Sorting for Old Deletion
#   4) Single SFTP Session for .tar.gz
#
# Schedule in cron (e.g., every 2 hours):
#   0 */2 * * * /path/to/archive.sh
###############################################################################

############################################
# Configuration
############################################

LOG_FILE="/home/pi/logs/archive.log"

# Root directory containing daily dirs named YYYY-MM-DD
ROOT="/home/pi/gliderport/gpImages"
# Where we store intermediate mp4
VIDEO_DIR="video"

# Remote SFTP details
REMOTE_USER="cmosdsnr"
REMOTE_HOST="buddbliss.com"
REMOTE_DISK_DIR="/media/cmosdsnr/passport/gliderport"

# Regex for your USB mount from 'mount' output: /dev/sdX on /something
USB_MOUNT_REGEX='^(/dev/sd\w+)\s+on\s+([^[:space:]]+)'

############################################
# Logging
############################################

# Log a line with a timestamp
logToFile() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

############################################
# Wake remote disk by SSH checking
############################################
wakeRemoteDisk() {
  logToFile "Waking up remote disk..."
  while ! ssh "$REMOTE_USER@$REMOTE_HOST" "test -d '$REMOTE_DISK_DIR'" 2>/dev/null; do
    logToFile "Remote disk not ready, waiting..."
    sleep 1
  done
  logToFile "Remote disk is ready."
}

############################################
# checkAndOrderImages
############################################
checkAndOrderImages() {
  local dir="$1"

  # For image-1-*.jpg
  local index=10000
  for file in "$dir"/image-1-*.jpg; do
    [[ -f "$file" ]] || continue
    if file "$file" | grep -q "image data"; then
      local file_index
      file_index=$(echo "$file" | grep -oP '(?<=image-1-)\d+(?=.jpg)')
      if [[ "$file_index" != "$index" ]]; then
        mv "$file" "$dir/image-1-$index.jpg" || {
          logToFile "Error renaming $file to image-1-$index.jpg"
          return 1
        }
      fi
      ((index++))
    else
      rm -f "$file"
    fi
  done

  # For image-2-*.jpg
  index=10000
  for file in "$dir"/image-2-*.jpg; do
    [[ -f "$file" ]] || continue
    if file "$file" | grep -q "image data"; then
      local file_index
      file_index=$(echo "$file" | grep -oP '(?<=image-2-)\d+(?=.jpg)')
      if [[ "$file_index" != "$index" ]]; then
        mv "$file" "$dir/image-2-$index.jpg" || {
          logToFile "Error renaming $file to image-2-$index.jpg"
          return 1
        }
      fi
      ((index++))
    else
      rm -f "$file"
    fi
  done
}

############################################
# archiveDirectory
############################################
archiveDirectory() {
  local dir="$1"
  local dest="$2"

# Remove all files in $dir that do NOT match image*.jpg
  find "$dir" -maxdepth 1 -type f ! -name 'image*.jpg' -delete

  logToFile "checking and ordering Images in $dir..."
  checkAndOrderImages "$dir" || {
    logToFile "Error in checkAndOrderImages for $dir"
    return 1
  }
  logToFile "Ordering done."

  # Create 2 mp4 from image-1 and image-2
  ffmpeg -y -f image2 -i "$dir/image-1-1%4d.jpg" -s 960x540 "$VIDEO_DIR/$dir-1.mp4" >/dev/null 2>&1 || {
    logToFile "FFmpeg error creating $VIDEO_DIR/$dir-1.mp4"
    return 1
  }
  ffmpeg -y -f image2 -i "$dir/image-2-1%4d.jpg" -s 960x540 "$VIDEO_DIR/$dir-2.mp4" >/dev/null 2>&1 || {
    logToFile "FFmpeg error creating $VIDEO_DIR/$dir-2.mp4"
    return 1
  }

  ls -l "$VIDEO_DIR" >> "$LOG_FILE"

  # Tar + gz => $dest/$dir.tar.gz
  tar -czf "$dest/$dir.tar.gz" "$dir" "$VIDEO_DIR/$dir-1.mp4" "$VIDEO_DIR/$dir-2.mp4" || {
    logToFile "Error creating tar for $dir"
    return 1
  }

  rm -rf "$dir"
  rm -f "$VIDEO_DIR/$dir"-*.mp4
}

############################################
# Single sftp session for uploading many .tar.gz
############################################
singleSftpUpload() {
  local files=("$@")  # array of filenames
  # Wake remote disk first
  wakeRemoteDisk

  # Create a batch file for sftp
  echo "cd $REMOTE_DISK_DIR" > sftp_batch.txt
  for f in "${files[@]}"; do
    echo "put $f" >> sftp_batch.txt
  done
  echo "quit" >> sftp_batch.txt

  sftp -b sftp_batch.txt "$REMOTE_USER@$REMOTE_HOST" || {
    logToFile "SFTP batch upload failed"
    rm -f sftp_batch.txt
    return 1
  }
  rm -f sftp_batch.txt

  # Move local files to archive/
  mkdir -p archive
  for f in "${files[@]}"; do
    [[ -f "$f" ]] && mv "$f" archive/
  done
}

############################################
# removeOldTarIfFull (sort & remove oldest)
############################################
removeOldTarIfFull() {
  local archpath="$1"
  mkdir -p "$archpath/archive"
  cd "$archpath/archive" || return 0

  local used_pct
  used_pct=$(df -P /dev/sda1 | awk 'END { gsub("%","",$5); print $5 }')

  logToFile "USB is ${used_pct}% full"

  if (( used_pct > 90 )); then
    logToFile ", remove some older days"
  else
    logToFile ", all good"
  fi
  echo >> "$LOG_FILE"

  while (( used_pct > 90 )); do
    # gather sorted list
    mapfile -t oldfiles < <(ls -1 *.tar.gz 2>/dev/null | sort)
    if (( ${#oldfiles[@]} == 0 )); then
      break
    fi
    local oldest="${oldfiles[0]}"
    logToFile "Removing oldest tar: $oldest"
    echo >> "$LOG_FILE"
    rm -f "$oldest"

    # re-check usage
    used_pct=$(df -P /dev/sda1 | awk 'END { gsub("%","",$5); print $5 }')
  done
}

############################################
# MAIN
############################################

# Start a new log line
echo >> "$LOG_FILE"
logToFile "Starting archive script"

# 1) Attempt to find the USB device => $dest
dest=""
while IFS= read -r line; do
  if [[ "$line" =~ $USB_MOUNT_REGEX ]]; then
    dev="${BASH_REMATCH[1]}"
    mountpoint="${BASH_REMATCH[2]}"
    logToFile "USB Device: $dev is mounted at $mountpoint"
    dest="$mountpoint/gliderport"
    break  # If you only need the first match
  fi
done < <(mount)

if [[ -z "$dest" ]]; then
  logToFile "No USB device found – cannot proceed"
  exit 1
fi

logToFile "$dest"
df "$dest" >> "$LOG_FILE"

# 2) "Today" in local time
today="$(TZ=America/Los_Angeles date +'%Y-%m-%d')"

logToFile "Look for directories older than $today"

cd "$ROOT" || exit 1
found_any=0

# 3) For each directory older => archive
for dir in *; do
  [[ -d "$dir" ]] || continue
  [[ "$dir" == "$today" ]] && continue
  if [[ "$dir" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    found_any=1
    logToFile "processing $dir"

    # remove leftover single mp4 if it exists
    if [[ -f "video/$dir.mp4" ]]; then
      rm -f "video/$dir.mp4"
      logToFile "   removed leftover video/$dir.mp4"
    fi

    logToFile "Archiving $dir..."
    archiveDirectory "$dir" "$dest" || {
      logToFile "archiveDirectory returned error for $dir"
      continue
    }
    logToFile "done with $dir"
  fi
done

if (( found_any == 0 )); then
  logToFile "No older directories found"
fi

# 4) Now find *.tar.gz in "$dest" => singleSftpUpload
logToFile "Check *.tar.gz files for buddbliss Archive"
cd "$dest" || exit 1
mkdir -p archive

# Gather sorted list of tar files
mapfile -t tars < <(ls -1 *.tar.gz 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.tar\.gz$' | sort)
if (( ${#tars[@]} == 0 )); then
  logToFile "No tar.gz found"
else
  logToFile "Uploading ${#tars[@]} tar.gz files in a single sftp session"
  singleSftpUpload "${tars[@]}"
  logToFile "Uploaded them; moved locally to archive/"
fi

# 5) If USB is >90% => remove oldest
removeOldTarIfFull "$dest"

logToFile "Archive script done."
echo >> "$LOG_FILE"

exit 0
```
