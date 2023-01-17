import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useInterval } from "./Globals"

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
    const { updateUserText, ...rest } = props
    //use a local copy of phone to avoid thrashing the database
    const [phone, setPhone] = useState("")
    const { currentUser, updateUser } = useAuth()


    const report = () => console.log("cu:", currentUser.phone, " p:", phone)
    const interval = useInterval(() => {
        report()
    }, 5000)

    useEffect(() => {
        setPhone(currentUser.phone)
    }, [])

    useEffect(() => {
        console.log("phone changed: ", phone)
    }, [phone])

    const handleChange = (e) => {
        setPhone(e.target.value)
        const fn = formatPhoneNumber(e.target.value)
        debugger
        if (fn.length === 14) {
            gatewayPhoneNumber(fn)
            updateUser('phone', fn)
            console.log("fn: ", fn)
        }
    }

    const formatPhoneNumber = (value) => {
        if (!value) return ""
        const numbersOnly = value.replace(/[^\d]/g, '')
        if (numbersOnly.length < 4)
            return numbersOnly
        if (numbersOnly.length < 7)
            return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3)}`
        else
            return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3, 6)}-${numbersOnly.slice(6, 10)}`
    }


    const gatewayPhoneNumber = (value) => {
        const numbersOnly = value.replace(/[^\d]/g, '')
        if (numbersOnly.length === 10) {
            // it's a full 10-digit new number, check the validity and carrier
            // debugger
            const url = "https://gliderportupdateserver.thilenius.org/PhoneFinder?area=" + numbersOnly.slice(0, 3)
                + "&prefix=" + numbersOnly.slice(3, 6)
                + "&number=" + numbersOnly.slice(6, 10)
            fetch(url)
                .then(response => response.text())
                .then(carrier => {
                    if (carrier.length > 0 && provider[carrier] != undefined)
                        updateUserText({ address: numbersOnly + '@' + provider[carrier][0], provider: provider[carrier][1] })
                    else {
                        console.log(`Received (${carrier.length} bytes): "${carrier}" which is not in provider object`)
                    }
                })
        }
    }


    return (
        <input {...rest} onChange={e => handleChange(e)} value={phone} />
    )
}
