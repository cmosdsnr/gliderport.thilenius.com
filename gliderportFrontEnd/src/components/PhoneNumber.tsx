/**
 * @packageDocumentation
 * PhoneNumberInput component for the Gliderport application.
 * Handles phone number formatting, carrier lookup, and SMS gateway address generation.
 */
import React, { useState, useEffect, ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { API } from '@/api';

/**
 * Map of carrier keys to a tuple of `[mmsGateway, displayName, fonefinderName]`.
 * Used to resolve a carrier string returned by fonefinder.net into an SMS gateway address.
 *
 * @example
 * // provider['att'] → ['mms.att.net', 'AT&T', 'NotFoundYet']
 */
export interface Provider {
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

/**
 * Props accepted by {@link PhoneNumberInput}.
 * Any additional HTML input attributes (e.g. `style`, `className`) are forwarded
 * directly to the underlying `<input>` element.
 */
export interface PhoneNumberInputProps {
    [key: string]: any
}

/**
 * Minimal user shape used when the full `AuthContext` user type is not needed.
 */
export interface User {
    phone: string
}

/**
 * PhoneNumberInput component for entering and formatting a phone number,
 * and looking up the carrier to generate an SMS gateway address.
 * @param props - Input props and handlers.
 * @returns {React.ReactElement} The rendered phone number input.
 */
export function PhoneNumberInput(props: PhoneNumberInputProps): React.ReactElement {
    const { updateUserText, ...rest } = props
    const { currentUser, updateUser, updateUserSettings } = useAuth()


    useEffect(() => {
        console.log("phone changed: ", currentUser?.settings.phone)
    }, [currentUser?.settings.phone])

    /**
     * Handles input change events: formats the raw value and, once a complete
     * 10-digit number is entered (14 formatted chars), triggers a carrier lookup
     * and persists the phone number to user settings.
     *
     * @param e - The change event from the `<input>` element.
     */
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const fn = formatPhoneNumber(e.target.value)
        if (fn.length === 14) {
            gatewayPhoneNumber(fn)
            updateUserSettings({ phone: fn })
            console.log("fn: ", fn)
        }
    }

    /**
     * Formats a raw string into `(NXX) NXX-XXXX` US phone number format,
     * stripping all non-digit characters first.
     *
     * @param value - Raw input string (may contain dashes, spaces, parentheses, etc.).
     * @returns The formatted phone number string, or the raw digits for partial input.
     *
     * @example
     * formatPhoneNumber("5559991234") // "(555) 999-1234"
     */
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

    /**
     * Looks up the carrier for a 10-digit phone number via fonefinder.net (proxied
     * through the Gliderport API) and, if found in the {@link provider} map, updates
     * the user's SMS gateway address and provider display name.
     *
     * @param value - The formatted phone number string (digits will be extracted).
     */
    const gatewayPhoneNumber = (value: string): void => {
        const numbersOnly = value.replace(/[^\d]/g, '')
        if (numbersOnly.length === 10) {

            fetch(API.phoneFinder(numbersOnly.slice(0, 3), numbersOnly.slice(3, 6), numbersOnly.slice(6, 10)))
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
        <input {...rest} onChange={handleChange} value={currentUser?.settings.phone} />
    )
}
