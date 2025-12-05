'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, getMyProfile } from '@/services/api'
import type { OnboardingData } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState<OnboardingData>({ full_name: '', role: 'student' })
  const [loading, setLoading] = useState(false)

  const updateField = (key: keyof OnboardingData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!form.full_name.trim()) {
      toast.error('Please enter your full name')
      return
    }
    setLoading(true)
    try {
      await completeOnboarding(form)
      const prof = await getMyProfile()
      const chosePending = form.role === 'expert' || form.role === 'sponsor'
      if (chosePending) {
        toast.success('Request submitted. Admin will review your role.')
      } else {
        toast.success('Onboarding completed')
      }
      router.push('/discover')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 sm:px-10 py-8 border-b border-zinc-100">
            <h1 className="text-2xl font-black text-zinc-900">Welcome! Let’s set up your account</h1>
            <p className="text-zinc-500 mt-2">Choose your primary role and tell us your name.</p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 sm:px-10 py-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                placeholder="e.g., Alex Chen"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Choose role</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'student', title: 'Student', desc: 'Join events and organize activities' },
                  { key: 'expert', title: 'Expert (Pending)', desc: 'Be a speaker; requires admin approval' },
                  { key: 'sponsor', title: 'Sponsor (Pending)', desc: 'Support events; requires admin approval' },
                ].map((opt) => (
                  <label key={opt.key} className={`cursor-pointer rounded-2xl border ${form.role === opt.key ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-200 bg-white'} p-4 shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="role"
                        value={opt.key}
                        checked={form.role === opt.key}
                        onChange={(e) => updateField('role', e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-bold text-zinc-900">{opt.title}</div>
                        <div className="text-sm text-zinc-500 mt-1">{opt.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-yellow-400 text-zinc-900 font-bold shadow-[0_4px_0_rgb(0,0,0)] hover:shadow-[0_2px_0_rgb(0,0,0)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

