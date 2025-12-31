'use client'

import React, { useState } from 'react'
import GooglePlacesAutocomplete from 'react-google-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

interface Props {
    onPlaceSelect: (place: { label: string; value: any }) => void
    defaultValue?: string
}

const libraries: ("places")[] = ["places"]

export function PlacesAutocomplete({ onPlaceSelect, defaultValue }: Props) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    const [value, setValue] = useState<{ label: string; value: any } | null>(
        defaultValue ? { label: defaultValue, value: null } : null
    )

    if (!isLoaded) return <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />

    return (
        <div className="w-full">
            <GooglePlacesAutocomplete
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                selectProps={{
                    value,
                    onChange: (val: any) => {
                        setValue(val)
                        if (val) {
                            onPlaceSelect(val)
                        }
                    },
                    placeholder: 'Search for venue...',
                    styles: {
                        control: (provided) => ({
                            ...provided,
                            borderColor: '#e5e7eb', // gray-200
                            borderRadius: '0.5rem', // rounded-lg
                            paddingTop: '2px',
                            paddingBottom: '2px',
                            boxShadow: 'none',
                            '&:hover': {
                                borderColor: '#3b82f6', // blue-500
                            },
                        }),
                        input: (provided) => ({
                            ...provided,
                            color: '#111827', // gray-900
                            fontSize: '0.875rem', // text-sm
                        }),
                        singleValue: (provided) => ({
                            ...provided,
                            color: '#111827', // gray-900
                            fontSize: '0.875rem', // text-sm
                        }),
                        option: (provided, state) => ({
                            ...provided,
                            fontSize: '0.875rem',
                            backgroundColor: state.isFocused ? '#eff6ff' : 'white', // blue-50
                            color: '#111827',
                        }),
                    }
                }}
            />
        </div>
    )
}
