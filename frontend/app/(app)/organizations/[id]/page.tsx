'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getOrganizationById } from '@/services/api'
import { OrganizationResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { AppNavbar } from '@/components/ui/AppNavbar'

export default function OrganizationDetailPage() {
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrganizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      try {
        const data = await getOrganizationById(orgId)
        setOrg(data)
      } catch (error: unknown) {
        const e = error as { response?: { status?: number; data?: { detail?: string } } }
        if (e.response?.status === 401) {
          localStorage.removeItem('atas_token')
          window.location.href = '/login'
          return
        }
        const msg = e.response?.data?.detail || 'Failed to load organization'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [orgId])

  if (loading) return <div className="min-h-screen bg-amber-50"><AppNavbar /><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-zinc-500">Loading...</div></div>
  if (error) return <div className="min-h-screen bg-amber-50"><AppNavbar /><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-red-600">{error}</div></div>
  if (!org) return <div className="min-h-screen bg-amber-50"><AppNavbar /><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-zinc-500">Organization not found.</div></div>

  return (
    <div className="min-h-screen bg-amber-50">
      <AppNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden">
          {org.cover_url && (<img src={org.cover_url} alt="cover" className="w-full h-56 object-cover" />)}
          <div className="px-6 py-6">
            <div className="flex items-center gap-4 mb-4">
              {org.logo_url && (<img src={org.logo_url} alt="logo" className="h-16 w-16 rounded-lg ring-2 ring-yellow-400" />)}
              <div>
                <h1 className="text-2xl font-black text-zinc-900">{org.name}</h1>
                {org.type && (<span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{org.type}</span>)}
              </div>
            </div>
            {org.description && (<p className="text-zinc-700 mb-4">{org.description}</p>)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {org.website_url && (
                <div><span className="font-bold text-zinc-700">Website:</span> <a href={org.website_url} className="text-yellow-600 font-bold" target="_blank" rel="noreferrer">{org.website_url}</a></div>
              )}
              {org.location && (
                <div><span className="font-bold text-zinc-700">Location:</span> <span className="text-zinc-800">{org.location}</span></div>
              )}
              <div><span className="font-bold text-zinc-700">Visibility:</span> <span className="text-zinc-800">{org.visibility}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
