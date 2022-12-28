server
dokku apps:create gliderportupdateserver
dokku mysql:link gliderport gliderportupdateserver

local
git remote add dokku dokku@thilenius.org:gliderportupdateserver
git commit -m "message"
git push dokku master

local tunnel to exposed database port:
ssh -L 26669:127.0.0.1:26669 stephen@thilenius.org