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

## Database
This server uses a SQL database created with docker and locally accessed. ( same as socketserver)

## Routes

| file            | type | URL                    | description                                                                                |
| --------------- | ---- | ---------------------- | ------------------------------------------------------------------------------------------ |
| archive         | GET  | runScheduledArchive    | Manually triggers the archival process.                                                    |
| codes           | GET  | updateCodeHistory      | Triggers an update of the current day's code history based on new wind data.               |
| codes           | GET  | sqlToPbCodeHistory     | Imports SQL code history records into the PocketBase "codeHistory" collection.             |
| hitCounter      | GET  | HandleHits             | For testing purposes, this endpoint triggers the process of updating                       |
| ImageFiles      | GET  | scanLatestDirectory    | Triggers a scan of the latest directory.                                                   |
| ImageFiles      | GET  | scanEntireDirectory    | Scans the entire directory structure.                                                      |
| ImageFiles      | GET  | createListingRecord    | Creates the listing record in PocketBase.                                                  |
| ImageFiles      | GET  | listing                | Retrieves the current listing record.                                                      |
| ImageFiles      | GET  | imageCount             | Returns image count for a specified date and time range.                                   |
| ImageFiles      | GET  | getImageData           | Retrieves image data for a specific year and month.                                        |
| ImageFiles      | GET  | latestImages           | Returns the latest images (for front-end display).                                         |
| ImageFiles      | GET  | getLastFiveSmallImages | Returns the last five small images for each camera.                                        |
| ImageFiles      | GET  | gotoSleep              | Sets the server state to "sleeping".                                                       |
| ImageFiles      | GET  | wakeUp                 | Sets the server state to "awake".                                                          |
| ImageFiles      | POST | updateImage            | Updates an image record based on data from the front end.                                  |
| ImageFiles      | POST | updateLog              | (Debug) Updates log data.                                                                  |
| sendTextMessage | GET  | PhoneFinder            | Accepts query parameters (area, prefix, number) to look up phone carrier info.             |
| sendTextMessage | GET  | sendTestSms            | Triggers a test text alert by calling sendTextMessage with null data.                      |
| sendTextMessage | GET  | testWindSpeeds         | Returns current wind average data as JSON.                                                 |
| sun             | GET  | UpdateSun              | Manually triggers a sun data update and returns the current sun data.                      |
| wind            | GET  | getLastEntry           | Returns the timestamp of the most recent wind data record.                                 |
| wind            | GET  | addWindFromSQL         | Processes and inserts new wind records from the SQL database into PocketBase.              |
| wind            | GET  | fixSaveErrors          | Corrects errors in saved wind data by swapping temperature, pressure, and humidity values. |
| wind            | POST | addData                | Adds new wind data from the request to the wind table and PocketBase.                      |

## to recreate

- grep -R -h -- "- GET" .\src\* > results.txt
- grep -R -h -- "- POST" .\src\* >> results.txt