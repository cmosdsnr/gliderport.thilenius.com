# Gliderport React 

## create react app
    npx create-react-app my-app
    cd my-app
    npm start

    https://www.youtube.com/watch?v=PKwu15ldZ7k&ab_channel=WebDevSimplified
    https://github.com/WebDevSimplified/React-Firebase-Auth

## to publish to namecheap:
    npm run build
    run gulp

# Hosting
    #New Site location:
    https://live.flytorrey.com

    #Hostmonster
    FTP Username: sandiel8  
    FTP server: Flyt0rrey1!
    FTP & explicit FTPS port:  21

    FTP Username: thilenius@live.flytorrey.com  
    FTP server: ftp.sandiegofreeflight.com
    FTP & explicit FTPS port:  21

    SQL Database: sandiel8_live
    user: sandiel8_thilenius
    pass: nbqp3TC84s@8

    url: https://my.hostmonster.com/web-hosting/cplogin
    user: sandiegofreeflight.com
    pass: Flyt0rrey1!

    SSH Key: hostmonster_flytorrey passphrase: 'I love to fly'
    SSH user: sandiel8
    SSH password: Flyt0rrey1!
    

Hosting on Alecs Dokku
create static.dist
see https://v2.vitejs.dev/guide/static-deploy.html#heroku

on server
dokku apps:destroy gliderport
dokku apps:create gliderport
dokku buildpacks:set gliderport https://github.com/heroku/heroku-buildpack-static.git

local  
git remote add dokku dokku@thilenius.org:gliderport
git commit -m "message"
git push dokku master


github
git remote add origin https://github.com/cmosdsnr/gliderport.git
git push origin master
