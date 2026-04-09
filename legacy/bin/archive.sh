#!/usr/bin/bash
# Script is called from perl/images_archive.pl
# parameter 1: directoy name with image files to process (e.g. 2023-04-21)
# parameter 2: archive directoy (e.g. /media/pi/62DE-3F10/gliderport)
# 1. removes current.jpg and enc from directory
# 2. order images so there are no 0 length files or skipped numbers
# 3. create a video from the images
# 4. upload video to updateserver
# 5. create tar.gz with all images and the video in the parameter 2 directory

if [ -f  "$1/current.jpg" ];
then
  rm "$1/current.jpg"
fi

if [ -f  "$1/enc" ];
then
  rm "$1/enc"
fi
#read -p "Press enter to continue"

#find $1 -type f -size 0 -exec cp -f /home/pi/gpImages/Error.jpg {} \;
echo -n "checking and ordering Images..."
/home/pi/bin/checkAndOrderImages.sh "$1"
echo " DONE"
#read -p "Press enter to continue"

ffmpeg -y -f image2 -i $1/image-1-1%4d.jpg -s 960x540 video/$1-1.mp4 >/dev/null 2>&1
ffmpeg -y -f image2 -i $1/image-2-1%4d.jpg -s 960x540 video/$1-2.mp4 >/dev/null 2>&1
ls -l video
#read -p "Press enter to continue"
# video and gz go to the same place now.... so we don't need this any longer
#curl -v -F video=\@video/$1.mp4 https://gliderportupdateserver.thilenius.org/uploadVideo
#read -p "Press enter to continue"
tar cvfz $2/$1.tar.gz $1 video/$1-1.mp4 video/$1-2.mp4
#read -p "Press enter to continue"

rm -rf $1
rm video/$1-*.mp4

# in case we've been interupted ... do all gz files that are avl
cd $2
FILES=*.gz
for f in $FILES
do
sftp cmosdsnr@buddbliss.com << XX
cd /media/cmosdsnr/My\ Passport/gliderport/
put $f
quit
XX
mv  $f archive
done