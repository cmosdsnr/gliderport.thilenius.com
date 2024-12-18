# Gliderport Update server

dokku storage:mount gliderportupdateserver /media/cmosdsnr/passport/gliderport/video:/app/video
dokku storage:report gliderportupdateserver
dokku ps:restart gliderportupdateserver
## A node server used to:

#### Check every hour if it's a new day and update sunrise/set data (updateSunData)

#### Respond to the following calls:

  1. '/getLastEntry'  : called from Pi3 node server: return the last entry in gliderport db
  2. '/ImageAdded'    : called from Pi3 at gliderport: Update the time the last image was added to now in the server_sent table
  3. '/addData'       : called from Pi3 node server: with new record(s)
  4. '/updateSmallImage1' : called from Pi3: Update the small image data (left camera)
  5. '/updateBigImage1' :  called from Pi3 : Update the large image data (left camera)
  6. '/updateSmallImage2' : called from Pi3: Update the small image data (right camera)
  7. '/updateBigImage2' :  called from Pi3 : Update the large image data (right camera)

 #### For Debug

  1. '/current1.jpg    : browser call to get latest small image  (left camera)
  2. '/currentBig1.jpg : browser call to get latest small image (left camera)
  3. '/current2.jpg    : browser call to get latest small image  (right camera)
  4. '/currentBig2.jpg : browser call to get latest small image (right camera)
  5. '/info           : browser call to get lots of info about current situation

# Database
This server uses a SQL database created with docker and locally accessed. ( same as socketserver)


