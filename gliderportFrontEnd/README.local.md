# Gliderport React 

## Cameras
    104.36.31.118:8080 (left looking) -> 168.192.88.217  MAC: 00 1F 54 8B 90 19  
    104.36.31.118:8081 (right looking) -> 168.192.88.216  MAC: 00 1F 54 8B 8C 23  
    u:admin pw:gliderport  
### ESP32 prot forwarding
    104.36.31.118:8082 ESP32 -> 192.168.88.16

## see what's on the network
    on raspberry run 'sudo arp-scan --interface=eth0 --localnet' ... look for Lorex

## access the router remotely
    locally:  ssh  -L 90:192.168.88.1:80 pi@104.36.31.118  
    then: localhost:90 in browser to access MikroTik (u: Gabriel ps:gliderport)



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
    


##on server
    dokku apps:destroy gliderport
    dokku apps:create gliderport
    dokku buildpacks:set gliderport https://github.com/heroku/heroku-buildpack-static.git

##local  
    git remote add dokku dokku@thilenius.org:gliderport
    git commit -m "message"
    git push dokku master


##github
    git remote add github https://github.com/cmosdsnr/gliderport.git
    git push github master
