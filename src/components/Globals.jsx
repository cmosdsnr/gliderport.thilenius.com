import { useEffect, useRef } from "react"

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


export const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest function.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            if (typeof savedCallback.current === 'function')
                savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

export const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    if (b64Data === null) {
        console.log("b64toBlob called with null")
        return null
    }
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}


export const months = [
    { "value": 1, "name": "January" },
    { "value": 2, "name": "February" },
    { "value": 3, "name": "March" },
    { "value": 4, "name": "April" },
    { "value": 5, "name": "May" },
    { "value": 6, "name": "June" },
    { "value": 7, "name": "July" },
    { "value": 8, "name": "August" },
    { "value": 9, "name": "September" },
    { "value": 10, "name": "October" },
    { "value": 11, "name": "November" },
    { "value": 12, "name": "December" }];


export function Vids() {
    const videoRef = useRef(null);

    useEffect(() => {
        getVideo();
    }, [videoRef]);

    const getVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 300 } })
            .then(stream => {
                let video = videoRef.current;
                video.srcObject = stream;
                video.play();
            })
            .catch(err => {
                console.error("error:", err);
            });
    };

    return (
        <div>
            <div>
                <button>Take a photo</button>
                <video ref={videoRef} />
            </div>
        </div>
    );
};
