'use client'

import React from 'react'

export const BANNER_HEIGHT = 32 // 32px or 2rem (h-8)

export function GlobalBanner() {
    return (
        <div 
            className="fixed top-0 left-0 right-0 h-8 flex items-center justify-center text-xs font-bold uppercase tracking-wider"
            style={{ 
                height: `${BANNER_HEIGHT}px`, 
                zIndex: 99999, 
                backgroundColor: 'yellow', // zinc-900
                color: 'black',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                display: 'flex'
            }}
        >
            old version for demostration purpose, upgrading in progress
        </div>
    )
}
