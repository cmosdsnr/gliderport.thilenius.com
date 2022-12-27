post data:
{"method":"global.setCurrentTime","params":{"time":"2022-07-12 13:49:07","tolerance":5},"id":215,"session":"83c8f75c02491993d300882323443756"}

{"method":"system.multicall","params":[{"method":"configManager.setConfig","params":{"name":"Locales","table":{"DSTEnable":true,"DSTEnd":{"Day":0,"Hour":2,"Minute":0,"Month":11,"Week":1,"Year":2022},"DSTStart":{"Day":0,"Hour":2,"Minute":0,"Month":3,"Week":2,"Year":2022},"TimeFormat":"MM-dd-yyyy hh:mm:ss"},"options":[]},"id":220,"session":"83c8f75c02491993d300882323443756"},{"method":"configManager.setConfig","params":{"name":"NTP","table":{"Address":"pool.ntp.org","Enable":true,"Port":123,"TimeZone":25,"UpdatePeriod":10},"options":[]},"id":221,"session":"83c8f75c02491993d300882323443756"}],"id":222,"session":"83c8f75c02491993d300882323443756"}

{"method":"system.multicall","params":[{"method":"configManager.setConfig","params":
{"name":"Encode","table":[{"ExtraFormat":[{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},
"AudioEnable":false,"Video":{"BitRate":256,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"D1","FPS":15,
"GOP":30,"Height":480,"Pack":"DHAV","Priority":0,"Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":704},
"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},
"AudioEnable":false,
"Video":{"BitRate":1024,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"D1","FPS":30,"GOP":60,"Height":480,
"Pack":"DHAV","Priority":0,"Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":704},"VideoEnable":false},
{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},
"AudioEnable":false,"Video":{"BitRate":1024,"BitRateControl":"CBR","Compression":"H.264",
"CustomResolutionName":"D1","FPS":30,"GOP":60,"Height":480,"Pack":"DHAV","Priority":0,"
Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":704},"VideoEnable":false}],
"MainFormat":[{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},
"AudioEnable":false,"Video":{"BitRate":2570,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":
"3840x2160","FPS":15,"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":4,
"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,
"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":2570,"BitRateControl":"CBR","Compression"
:"H.264","CustomResolutionName":"3840x2160","FPS":15,"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile"
:"Main","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,
"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{
"BitRate":2570,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"3840x2160","FPS":15,
"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":1024,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"720P","FPS":15,"GOP":30,"Height":720,"Pack":"DHAV","Priority":0,"Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1280},"VideoEnable":true}],"SnapFormat":[{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true}]}],"options":[]},"id":273,"session":"83c8f75c02491993d300882323443756"},{"method":"configManager.setConfig","params":{"name":"VideoWaterMark","table":[{"Enable":false,"Key":"1","String":"LOREX"}],"options":[]},"id":274,"session":"83c8f75c02491993d300882323443756"},{"method":"configManager.setConfig","params":{"name":"SmartEncode","table":[{"Enable":false}],"options":[]},"id":275,"session":"83c8f75c02491993d300882323443756"}],"id":276,"session":"83c8f75c02491993d300882323443756"}

{"method":"encode.getSmartCaps","params":{"channel":0,"config":[{"Compression":"H.264","Policy":0},{"Compression":"H.264","Policy":0},{"Compression":"H.264","Policy":0}]},"id":279,"session":"83c8f75c02491993d300882323443756"}:



{"method":"encode.getConfigCaps","params":
{"channel":0,
"config":[{"ExtraFormat":
[
{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},
"AudioEnable":false,
"Video":{"BitRate":256,
"BitRateControl":"CBR",
"Compression":"H.264",
"CustomResolutionName":"D1",
"FPS":15,
"GOP":30,
"Height":480,
"Pack":"DHAV",
"Priority":0,
"Profile":"High",
"Quality":4,"QualityRange":6,
"SVCTLayer":1,"Width":704},
"VideoEnable":true},
{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},
"AudioEnable":false,
"Video":{"BitRate":1024,
"BitRateControl":"CBR",
"Compression":"H.264",
"CustomResolutionName":"D1",
"FPS":30,"GOP":60,"Height":480,
"Pack":"DHAV","Priority":0,"Profile":"High",
"Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":704},
"VideoEnable":false},
{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":1024,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"D1","FPS":30,"GOP":60,"Height":480,"Pack":"DHAV","Priority":0,"Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":704},"VideoEnable":false}],
"MainFormat":[{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},
"AudioEnable":false,"Video":{"BitRate":2570,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"3840x2160","FPS":15,"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":2570,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"3840x2160","FPS":15,"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":2570,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"3840x2160","FPS":15,"GOP":30,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"AAC","Depth":16,"Frequency":8000,"Mode":0,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":1024,"BitRateControl":"CBR","Compression":"H.264","CustomResolutionName":"720P","FPS":15,"GOP":30,"Height":720,"Pack":"DHAV","Priority":0,"Profile":"High","Quality":4,"QualityRange":6,"SVCTLayer":1,"Width":1280},"VideoEnable":true}],"SnapFormat":[{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true},{"Audio":{"Bitrate":64,"Compression":"G.711A","Depth":16,"Frequency":44000,"Pack":"DHAV"},"AudioEnable":false,"Video":{"BitRate":5120,"BitRateControl":"VBR","Compression":"MJPG","CustomResolutionName":"3840x2160","FPS":0.1,"GOP":60,"Height":1080,"Pack":"DHAV","Priority":0,"Profile":"Main","Quality":5,"QualityRange":6,"SVCTLayer":1,"Width":1920},"VideoEnable":true}]}],"stream":"All"},"id":278,"session":"83c8f75c02491993d300882323443756"}:



to RPC2_login
{"method":"global.login","params":{"userName":"admin","password":"B1A2B6AD7DB058BF84385AABEF6C68BA","clientType":"Web3.0","loginType":"Direct","authorityType":"Default"},"id":326,"session":"d9eb960dddb2482e773d70a60a16ec77"}:
﻿