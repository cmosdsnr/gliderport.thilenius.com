server
dokku apps:create gliderportupdateserver
dokku mysql:link gliderport gliderportupdateserver

local
git remote add dokku dokku@thilenius.org:gliderportupdateserver
git commit
git push dokku master
