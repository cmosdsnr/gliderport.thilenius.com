

// (window.location.protocol === "https:") ? "https://gliderport.thilenius.com/" : "http://gliderport.thilenius.com/";
export const phpLoc = "https://live.flytorrey.com/php/"

export const clone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj) {
        temp[key] = clone(obj[key]);
    }
    return temp;
};

export const codeDef = {
    IT_IS_DARK: 0,
    SLED_RIDE_BAD_ANGLE: 1,
    SLED_RIDE_POOR_ANGLE: 2,
    SLED_RIDE: 3,
    BAD_ANGLE: 4,
    POOR_ANGLE: 5,
    GOOD: 6,
    EXCELLENT: 7,
    SPEED_BAR: 8,
    TOO_WINDY: 9,
    NO_DATA: 10
}

export const codes = [
    { "color": "rgb(136, 136, 136)", "opacity": 0.1, "code": "It Is dark" },           // IT_IS_DARK 
    { "color": "rgb(238, 238, 180)", "opacity": 0.1, "code": "Sled ride, bad angle" },  // SLED_RIDE_BAD_ANGLE 
    { "color": "rgb(238, 220, 180)", "opacity": 0.1, "code": "Sled ride, poor angle" }, // SLED_RIDE_POOR_ANGLE 
    { "color": "rgb(238, 238, 238)", "opacity": 0.1, "code": "Sled ride" },            // SLED_RIDE 
    { "color": "rgb(205, 255, 205)", "opacity": 0.1, "code": "Bad angle" },            // BAD_ANGLE 
    { "color": "rgb(167, 255, 167)", "opacity": 0.1, "code": "Poor angle" },           // POOR_ANGLE 
    { "color": "rgb(  0, 255,   0)", "opacity": 0.1, "code": "Good" },                 // GOOD 
    { "color": "rgb(  0, 255, 255)", "opacity": 0.1, "code": "Excellent" },            // EXCELLENT
    { "color": "rgb(  0,   0, 255)", "opacity": 0.1, "code": "Use Speed bar!" },       // SPEED_BAR
    { "color": "rgb(255, 187, 186)", "opacity": 0.1, "code": "Too windy" },            // TOO_WINDY
    { "color": "rgb(255,   0,   0)", "opacity": 0.1, "code": "No data" }               // NO_DATA
];

export const config = {
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    }
};

export const formatDate = (myDate) => {
    // var abbrMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var abbrDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return abbrDays[myDate.getDay()]; // + ", " + myDate.getDate() + " " + (abbrMonths[myDate.getMonth()]);
}


