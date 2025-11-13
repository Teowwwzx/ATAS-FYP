'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('atas_token')
        if (token) {
            router.replace('/dashboard')
        } else {
            router.replace('/login')
        }
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    )
}
