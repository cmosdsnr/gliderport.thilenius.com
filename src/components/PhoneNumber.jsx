import React, { useState, useEffect } from 'react'


const provider = {
    'alltel': ['mms.alltelwireless.com', 'Alltel', 'NotFoundYet'],
    'att': ['mms.att.net', 'AT&T', 'NotFoundYet'],
    'boost': ['myboostmobile.com', 'Boost Mobile', 'NotFoundYet'],
    'cricket': ['mms.cricketwireless.net', 'Cricket Wireless', 'NotFoundYet'],
    'fi': ['msg.fi.google.com', 'Project Fi', 'NotFoundYet'],
    'sprint': ['pm.sprint.com', 'Sprint', 'NotFoundYet'],
    'tmobile': ['tmomail.net', 'T-Mobile', 'NotFoundYet'],
    'uscellular': ['mms.uscc.net', 'U.S. Cellular', 'UNITED STATES CELLULAR CORP'],
    'verizon': ['vzwpix.com', 'Verizon', 'NotFoundYet'],
    'virgin': ['vmpix.com', 'Virgin Mobile', 'NotFoundYet'],
    'republic': ['text.republicwireless.com', 'Republic Wireless', 'NotFoundYet'],
    'metropcs': ['mymetropcs.com', 'Metro by T-Mobile (MetroPCS)', 'NotFoundYet'],
    'telus': ['msg.telus.com', 'Telus', 'NotFoundYet'],
    'rogers': ['pcs.rogers.com', 'Rogers', 'NotFoundYet'],
    'cellularsouth': ['csouth1.com', 'Cellular South', 'CELLULAR SOUTH, INC.'],
    'bellca': ['bellmobility.ca', 'Bell Canada', 'NotFoundYet'],
    'windstream': ['windstream.net', 'Windstream', 'NotFoundYet'],
    'bellmobility': ['txt.bellmobility.ca', 'Bell Mobility Canada', 'Bell Mobility']
}


export const PhoneNumberInput = (props) => {
    const { parentPhoneNumber, updateUser, updateUserText } = props

    const [phoneNumber, setPhoneNumber] = useState("")

    // change ph. num. from parent's setValue constant prop
    useEffect(() => {
        if (parentPhoneNumber && (parentPhoneNumber !== phoneNumber))
            setPhoneNumber(formatPhoneNumber(parentPhoneNumber, 0))
    }, [parentPhoneNumber])

    const handleChange = (e) => {
        const formattedPhoneNumber = formatPhoneNumber(e.target.value, 1)
        setPhoneNumber(formattedPhoneNumber)
    }

    const formatPhoneNumber = (value, lookup) => {
        if (!value) return value
        const numbersOnly = value.replace(/[^\d]/g, '')
        const numbersOnlyLength = numbersOnly.length
        if (numbersOnlyLength === 10) {
            // it's a full number
            updateUser("phone", numbersOnly)
            //check the validity and carrier
            const url = "http://www.fonefinder.net/findome.php?npa=" + numbersOnly.slice(0, 3)
                + "&nxx=" + numbersOnly.slice(3, 6)
                + "&thoublock=" + numbersOnly.slice(6, 10)
                + "&usaquerytype=Search+by+Number"
            if (lookup)
                fetch(url)
                    .then(response => response.text())
                    .then(data => {
                        var el = document.createElement('html');
                        el.innerHTML = data
                        const href = ((((el.getElementsByTagName('table')[1]).getElementsByTagName('tr')[1]).getElementsByTagName('td')[4]).getElementsByTagName('a')[0]).href
                        const carrier = href.slice(1 + href.lastIndexOf('/'), href.lastIndexOf('.'))
                        updateUserText({ address: numbersOnly + '@' + provider[carrier][0], provider: provider[carrier][1] })


                        // There may still be issues here with 3 carriers: (see CheckNum.php)
                        // $prv = [
                        //     ["uscellular",       "UNITED STATES CELLULAR CORP"],
                        //     ["cellularsouth",    "CELLULAR SOUTH, INC."],
                        //     ["bellmobility",     "Bell Mobility"]
                        // ];
                        //         if (strpos($d[5], "fonefinder.net/")) {
                        //          ...
                        //         } else {
                        // It didn't find 'fonefinder.net/' in the link
                        //             if (strlen($d[5])) {
                        // It just has those words in it
                        //                 foreach ($provider as $i => $f) {
                        //                     if (!(strpos($d[5], $f[1]) === false)) {
                        //                         $h['carrier'] = $f[0];
                        //                         echo json_encode($h);
                        //                         exit;
                        //                     }
                        //                 }
                        //             }
                        //         }
                        //     }
                    })
        }
        if (numbersOnlyLength < 4) return numbersOnly
        if (numbersOnlyLength < 7) {
            return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3)}`
        }
        return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3, 6)}-${numbersOnly.slice(6, 10)}`
    }

    return (
        <input onChange={e => handleChange(e)} value={phoneNumber} />
    )
}
