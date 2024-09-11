import React, { useState, useEffect, ChangeEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Provider {
    [key: string]: [string, string, string]
}

const provider: Provider = {
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

interface PhoneNumberInputProps {
    updateUserText: (data: { address: string, provider: string }) => void
    [key: string]: any
}

interface User {
    phone: string
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = (props) => {
    const { updateUserText, ...rest } = props
    const [phone, setPhone] = useState<string>("")
    const { currentUser, updateUser } = useAuth()

    useEffect(() => {
        setPhone(currentUser.phone)
    }, [])

    useEffect(() => {
        console.log("phone changed: ", phone)
    }, [phone])

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPhone(e.target.value)
        const fn = formatPhoneNumber(e.target.value)
        if (fn.length === 14) {
            gatewayPhoneNumber(fn)
            updateUser('phone', fn)
            console.log("fn: ", fn)
        }
    }

    const formatPhoneNumber = (value: string): string => {
        if (!value) return ""
        const numbersOnly = value.replace(/[^\d]/g, '')
        if (numbersOnly.length < 4)
            return numbersOnly
        if (numbersOnly.length < 7)
            return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3)}`
        else
            return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3, 6)}-${numbersOnly.slice(6, 10)}`
    }

    const gatewayPhoneNumber = (value: string): void => {
        const numbersOnly = value.replace(/[^\d]/g, '')
        if (numbersOnly.length === 10) {
            const url = `${import.meta.env.VITE_UPDATE_SERVER_URL}/PhoneFinder?area=${numbersOnly.slice(0, 3)}&prefix=${numbersOnly.slice(3, 6)}&number=${numbersOnly.slice(6, 10)}`
            fetch(url)
                .then(response => response.text())
                .then(carrier => {
                    if (carrier.length > 0 && provider[carrier] !== undefined) {
                        updateUserText({ address: `${numbersOnly}@${provider[carrier][0]}`, provider: provider[carrier][1] })
                    } else {
                        console.log(`Received (${carrier.length} bytes): "${carrier}" which is not in provider object`)
                    }
                })
        }
    }

    return (
        <input {...rest} onChange={handleChange} value={phone} />
    )
}
