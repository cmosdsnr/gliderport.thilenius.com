server
dokku apps:create gliderportupdateserver
dokku mysql:link gliderport gliderportupdateserver

local
git remote add dokku dokku@thilenius.org:gliderportupdateserver
git commit -m "message"
git push dokku master

github
git remote add origin https://github.com/cmosdsnr/gliderportupdateserver.git
git push origin master

local tunnel to exposed database port:
ssh -L 26669:127.0.0.1:26669 stephen@thilenius.org

regenerate hit stats           :   https://gliderportupdateserver.thilenius.org/HandleHits
regenerate hours table         :   https://gliderportupdateserver.thilenius.org/RegenerateAllHours
page with lots of info about Db:   https://gliderportupdateserver.thilenius.org/info
see code                       :   https://gliderportupdateserver.thilenius.org/fixHistory
fetch current image            :   https://gliderportupdateserver.thilenius.org/current.jpg
fetch current image            :   https://gliderportupdateserver.thilenius.org/currentBig.jpg