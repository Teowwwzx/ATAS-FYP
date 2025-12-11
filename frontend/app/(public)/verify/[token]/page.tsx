// frontend/app/(public)/verify/[token]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'

import { verifyEmail } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'
import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'

export default function VerifyEmailPage() {
    const router = useRouter()
    const params = useParams()
    const { token } = params
    const [message, setMessage] = useState('Verifying your email...')

    useEffect(() => {
        if (token) {
            const doVerification = async () => {
                try {
                    await verifyEmail(token as string)
                    toast.success('Email verified! You may now log in.')
                    setMessage('Verification successful! Redirecting to login...')
                    try { localStorage.setItem('email_verified', '1') } catch {}
                } catch (error) {
                    const err = error as AxiosError<ApiErrorResponse>
                    const detail =
                        err.response?.data?.detail || 'Invalid or expired token.'
                    toast.error(detail)
                    setMessage(`${detail}. Redirecting to login...`)
                } finally {
                    // Redirect to login after a short delay
                    setTimeout(() => {
                        router.push('/login')
                    }, 3000)
                }
            }
            doVerification()
        }
    }, [token, router])

    return (
        <>
            <LoadingBackdrop isLoading={true} />
            <div className="w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
            </div>
        </>
    )
}
