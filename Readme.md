# Gliderport Update server

## A node server

- reads ESP32 every 15s and places the information in the local raw_table
- checks and syncs records with pocketbase (gpData)
- while OldUpdates is included it will also sync with the SQL db via gpUpdate
- on the second of every month, it will archive the month before last in raw_data, and delete any records earlier than that month

### Respond to the following calls

  1. '/espIP'   : for the ESP to occasionally call to update the IP of the ESP32
  2. '/stats'   : get some debug info
  3. '/tryRead' : to test the loading of (2025,1)


### To Transfer to pi3 @ gliderport

1. Run go.bat to add/commit/push to github
2. ssh to pi3
3. cd gliderport/gp_pi3_server
4. run: git pull origin main; yarn build;
5. OR form ~/gliderport: 
    mv gp_pi3_server/bin .; rm -rf gp_pi3_server; git clone git@github.com:cmosdsnr/gp_pi3_server.git; mv bin gp_pi3_server