import { useEffect, useRef } from 'react'

// prints out the data: Mar 14,2025, 6:28:21 PM
export const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
});

// clone an object
export const clone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj))
}


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


type Code = {
    color: string,
    opacity: number,
    code: string,
}

export const codes: Code[] = [
    { color: "rgb(136, 136, 136)", opacity: 0.1, code: "It Is dark" },           // IT_IS_DARK
    { color: "rgb(238, 238, 180)", opacity: 0.1, code: "Sled ride, bad angle" },  // SLED_RIDE_BAD_ANGLE
    { color: "rgb(238, 220, 180)", opacity: 0.1, code: "Sled ride, poor angle" }, // SLED_RIDE_POOR_ANGLE
    { color: "rgb(238, 238, 238)", opacity: 0.1, code: "Sled ride" },            // SLED_RIDE
    { color: "rgb(205, 255, 205)", opacity: 0.1, code: "Bad angle" },            // BAD_ANGLE
    { color: "rgb(167, 255, 167)", opacity: 0.1, code: "Poor angle" },           // POOR_ANGLE
    { color: "rgb(  0, 255,   0)", opacity: 0.1, code: "Good" },                 // GOOD
    { color: "rgb(  0, 255, 255)", opacity: 0.1, code: "Excellent" },            // EXCELLENT
    { color: "rgb(  0,   0, 255)", opacity: 0.1, code: "Use Speed bar!" },       // SPEED_BAR
    { color: "rgb(255, 187, 186)", opacity: 0.1, code: "Too windy" },            // TOO_WINDY
    { color: "rgb(255,   0,   0)", opacity: 0.1, code: "No data" }               // NO_DATA
];

export const b64toBlob = (b64Data: string, contentType: string = '', sliceSize: number = 512): Blob | null => {
    if (b64Data === null) {
        console.log("b64toBlob called with null")
        return null
    }
    try {
        const byteCharacters = atob(b64Data);
    } catch (error) {
        console.log("b64toBlob called with invalid image")
        return null
    }
    const byteCharacters: string = atob(b64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers: number[] = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}


export const formatDate = (myDate: Date): string => {
    // var abbrMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var abbrDays: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return abbrDays[myDate.getDay()]; // + ", " + myDate.getDate() + " " + (abbrMonths[myDate.getMonth()]);
}

// type Month = {
//     value: number,
//     name: string,
// }
// export const months: Month[] = [
//     { value: 1, name: "January" },
//     { value: 2, name: "February" },
//     { value: 3, name: "March" },
//     { value: 4, name: "April" },
//     { value: 5, name: "May" },
//     { value: 6, name: "June" },
//     { value: 7, name: "July" },
//     { value: 8, name: "August" },
//     { value: 9, name: "September" },
//     { value: 10, name: "October" },
//     { value: 11, name: "November" },
//     { value: 12, name: "December" }];


