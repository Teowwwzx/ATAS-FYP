'use client'

import React from 'react'

export function FormButton({ children }: { children: React.ReactNode }) {
    return (
        <button
            type="submit"
            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
            {children}
        </button>
    )
}