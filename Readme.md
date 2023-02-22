# Gliderport Update server

## A node server used to:
####Check every hour if it's a new day and update sunrise/set data (updateSunData)
####Respond to the following calls:
 1. '/getLastEntry'  : called from Pi3: return the last entry in gliderport db
  2. '/ImageAdded'    : called from Pi3 at gliderport: Update the time the last image was added to now in the server_sent table
  3. '/addData'       : called from Pi3: with new record(s)
  4. '/updateSmallImage' : called from Pi3: Update the small image data
  5. '/updateBigImage' :  called from Pi3: Update the large image data

 ####For Debug
  1. '/current.jpg    : browser call to get latest small image
  2. '/currentBig.jpg : browser call to get latest small image
  3. '/info           : browser call to get lots of info about current situation

#Database
This server uses a SQL database created with docker and locally accessed. ( same as socketserver)


