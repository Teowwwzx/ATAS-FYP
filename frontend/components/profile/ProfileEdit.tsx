import React, { useRef, useState } from 'react'
import { ProfileUpdate, ProfileResponse, EducationCreate, JobExperienceCreate, OrganizationResponse } from '@/services/api.types'

interface ProfileEditProps {
    formData: ProfileUpdate
    setFormData: (data: ProfileUpdate) => void
    profile: ProfileResponse

    // Education Props
    newEducation: EducationCreate
    setNewEducation: (data: EducationCreate) => void
    onAddEducation: (e: React.FormEvent) => void
    onDeleteEducation: (id: string) => void
    addingEdu: boolean

    // Job Props
    newJob: JobExperienceCreate
    setNewJob: (data: JobExperienceCreate) => void
    onAddJob: (e: React.FormEvent) => void
    onDeleteJob: (id: string) => void
    addingJob: boolean

    // Org Props
    orgSearch: string
    setOrgSearch: (s: string) => void
    orgOptions: OrganizationResponse[]
    orgLoading: boolean
    selectedOrg: OrganizationResponse | null
    setSelectedOrg: (org: OrganizationResponse | null) => void
    showCreateOrg: boolean
    setShowCreateOrg: (show: boolean) => void
    newOrgName: string
    setNewOrgName: (name: string) => void
    newOrgType: any
    setNewOrgType: (type: any) => void
    onCreateOrg: () => void
    creatingOrg: boolean

    // Tags
    availableTags: { id: string, name: string }[]
    onTagToggle: (id: string) => void
    myTags: { id: string, name: string }[]

    // Actions
    onSave: (e: React.FormEvent) => void
    onCancel: () => void
    saving: boolean
}

export function ProfileEdit(props: ProfileEditProps) {
    const {
        formData, setFormData, profile,
        newEducation, setNewEducation, onAddEducation, onDeleteEducation, addingEdu,
        newJob, setNewJob, onAddJob, onDeleteJob, addingJob,
        orgSearch, setOrgSearch, orgOptions, orgLoading, selectedOrg, setSelectedOrg,
        showCreateOrg, setShowCreateOrg, newOrgName, setNewOrgName, newOrgType, setNewOrgType, onCreateOrg, creatingOrg,
        availableTags, onTagToggle, myTags,
        onSave, onCancel, saving
    } = props

    const [deleteModal, setDeleteModal] = useState<{ id: string, type: 'job' | 'edu' } | null>(null)

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100 // offset for sticky header
            window.scrollTo({ top: y, behavior: 'smooth' })
        }
    }

    const sections = [
        { id: 'section-basic', label: 'Basic Info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'section-experience', label: 'Work Experience', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { id: 'section-education', label: 'Education', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.5c-2.177 0-4.316-.559-6.16-1.922L12 14z' },
        { id: 'section-skills', label: 'Skills & Tags', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'section-social', label: 'Social Links', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    ]

    return (
        <div className="pb-32 px-4 sm:px-8">
            {/* Deletion Modal */}
            {deleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100 transform scale-100 transition-all">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Confirm Deletion</h3>
                        <p className="text-zinc-600 font-medium mb-8">
                            Are you sure you want to delete this {deleteModal.type === 'job' ? 'experience' : 'education'} entry? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 py-3 bg-gray-100 text-zinc-700 font-bold rounded-xl hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteModal.type === 'job') onDeleteJob(deleteModal.id)
                                    else onDeleteEducation(deleteModal.id)
                                    setDeleteModal(null)
                                }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Desktop Sticky Sidebar Navigation */}
                <aside className="hidden md:block md:col-span-3 lg:col-span-3">
                    <div className="sticky top-28 space-y-1">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 px-3">Edit Sections</h3>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-600 hover:bg-white hover:shadow-sm hover:text-zinc-900 transition-all text-left"
                            >
                                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={section.icon} />
                                </svg>
                                {section.label}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Edit Column */}
                <div className="md:col-span-9 lg:col-span-8 space-y-12">
                    {/* Basic Info */}
                    <div id="section-basic" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Basic Info</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name || ''}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-bold py-3 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Professional Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Software Engineer"
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Bio</label>
                                <textarea
                                    rows={4}
                                    value={formData.bio || ''}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Location (City, Country)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.city || ''}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="City"
                                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                        />
                                        <input
                                            type="text"
                                            value={formData.country || ''}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            placeholder="Country"
                                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Current Status</label>
                                    <input
                                        type="text"
                                        value={formData.today_status || ''}
                                        onChange={(e) => setFormData({ ...formData, today_status: e.target.value })}
                                        placeholder="e.g. Open to work"
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="can_be_speaker"
                                    checked={formData.can_be_speaker || false}
                                    onChange={(e) => setFormData({ ...formData, can_be_speaker: e.target.checked })}
                                    className="w-5 h-5 rounded text-yellow-400 focus:ring-yellow-400 border-gray-300"
                                />
                                <label htmlFor="can_be_speaker" className="font-bold text-zinc-900 cursor-pointer">I am open to being a speaker at events</label>
                            </div>
                        </div>
                    </div>

                    {/* Work Experience */}
                    <div id="section-experience" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Work Experience</h3>
                        </div>

                        {profile.job_experiences && profile.job_experiences.length > 0 && (
                            <div className="space-y-4 mb-8">
                                {profile.job_experiences.map(job => (
                                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="font-bold text-zinc-900">{job.title}</div>
                                            <div className="text-sm text-zinc-500">{job.description}</div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteModal({ id: job.id, type: 'job' })}
                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Job Form */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">Add New Experience</h4>
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Job Title / Role"
                                        required
                                        className="w-full bg-white border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                        value={newJob.title}
                                        onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-zinc-900 ml-1">Organization (optional)</label>
                                    {selectedOrg ? (
                                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden">
                                                    {selectedOrg?.logo_url ? (
                                                        <img src={selectedOrg?.logo_url || ''} alt={selectedOrg?.name || ''} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-zinc-900 font-bold text-sm">{selectedOrg?.name?.charAt(0) || ''}</span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-bold text-zinc-900">{selectedOrg?.name || ''}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedOrg(null); setNewJob({ ...newJob, org_id: undefined }); setOrgSearch(''); }}
                                                className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-zinc-600 hover:bg-gray-50"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : showCreateOrg ? (
                                        <div className="space-y-3 bg-white rounded-xl border border-gray-200 p-4 animate-fadeIn">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-bold text-sm text-zinc-900">Create New Organization</h5>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateOrg(false)}
                                                    className="text-xs font-bold text-zinc-500 hover:text-zinc-700"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Organization Name"
                                                    className="bg-gray-50 border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-400"
                                                    value={newOrgName}
                                                    onChange={e => setNewOrgName(e.target.value)}
                                                />
                                                <select
                                                    className="bg-gray-50 border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 focus:ring-2 focus:ring-yellow-400"
                                                    value={newOrgType}
                                                    onChange={e => setNewOrgType(e.target.value as any)}
                                                >
                                                    <option value="company">Company</option>
                                                    <option value="university">University</option>
                                                    <option value="community">Community</option>
                                                    <option value="nonprofit">Nonprofit</option>
                                                    <option value="government">Government</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={creatingOrg || !newOrgName.trim()}
                                                onClick={onCreateOrg}
                                                className="w-full py-3 rounded-xl bg-zinc-900 text-yellow-400 text-sm font-bold disabled:opacity-50 hover:bg-zinc-800 transition-all"
                                            >
                                                {creatingOrg ? 'Creating...' : 'Create & Select'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 relative">
                                            <input
                                                type="text"
                                                placeholder="Search organization..."
                                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                                value={orgSearch}
                                                onChange={e => setOrgSearch(e.target.value)}
                                            />
                                            {orgLoading && <div className="absolute right-4 top-3.5 text-xs text-zinc-400">Searching...</div>}

                                            {/* Dropdown Results */}
                                            {orgSearch && !selectedOrg && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden max-h-60 overflow-y-auto">
                                                    {orgOptions.length > 0 ? (
                                                        <>
                                                            {orgOptions.map(o => (
                                                                <button
                                                                    key={o.id}
                                                                    type="button"
                                                                    onClick={() => { setSelectedOrg(o); setNewJob({ ...newJob, org_id: o.id }); setOrgSearch(''); }}
                                                                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-yellow-50 transition-colors border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden shrink-0">
                                                                        {o.logo_url ? <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" /> : <span className="text-zinc-900 font-bold text-sm">{o.name.charAt(0)}</span>}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-zinc-900">{o.name}</div>
                                                                        <div className="text-xs text-zinc-500 capitalize">{o.type}</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {/* Option to create even if results exist, in case user doesn't see theirs */}
                                                            <button
                                                                type="button"
                                                                onClick={() => { setNewOrgName(orgSearch); setShowCreateOrg(true); }}
                                                                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-zinc-600 border-t border-gray-100 flex items-center gap-2"
                                                            >
                                                                <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">+</span>
                                                                Not found? Create "{orgSearch}"
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setNewOrgName(orgSearch); setShowCreateOrg(true); }}
                                                            className="w-full text-left p-4 hover:bg-gray-50 transition-colors group"
                                                        >
                                                            <div className="text-sm text-zinc-500 mb-1">No organization found matching "{orgSearch}"</div>
                                                            <div className="text-yellow-600 font-bold flex items-center gap-2 group-hover:underline">
                                                                Create "{orgSearch}" as a new organization
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Description (Optional if Organization selected)"
                                        className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400 mt-2"
                                        value={newJob.description || ''}
                                        onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={onAddJob}
                                    disabled={addingJob || !newJob.title}
                                    className="w-full py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    {addingJob ? 'Adding...' : 'Add Position'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Education */}
                    <div id="section-education" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Education</h3>
                        </div>

                        {profile.educations && profile.educations.length > 0 && (
                            <div className="space-y-4 mb-8">
                                {profile.educations.map(edu => (
                                    <div key={edu.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="font-bold text-zinc-900">{edu.qualification}</div>
                                            <div className="text-sm text-zinc-500">{edu.field_of_study}</div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteModal({ id: edu.id, type: 'edu' })}
                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Qualification (e.g. BSc)"
                                value={newEducation.qualification}
                                onChange={e => setNewEducation({ ...newEducation, qualification: e.target.value })}
                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                            />
                            <input
                                type="text"
                                placeholder="Field / School"
                                value={newEducation.field_of_study}
                                onChange={e => setNewEducation({ ...newEducation, field_of_study: e.target.value })}
                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                            />
                            <button
                                onClick={onAddEducation}
                                disabled={addingEdu || !newEducation.qualification}
                                className="md:col-span-2 w-full py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {addingEdu ? 'Adding...' : 'Add Education'}
                            </button>
                        </div>
                    </div>

                    {/* Skills & Tags */}
                    <div id="section-skills" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Skills & Tags</h3>
                        </div>

                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {availableTags.map(tag => {
                                const isSelected = myTags.some(t => t.id === tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => onTagToggle(tag.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${isSelected
                                            ? 'bg-zinc-900 text-yellow-400 border-zinc-900'
                                            : 'bg-white text-zinc-500 border-gray-200 hover:border-zinc-300'
                                            }`}
                                    >
                                        {tag.name} {isSelected && '✓'}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Social Links */}
                    <div id="section-social" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Social Links</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { key: 'website_url', label: 'Website' },
                                { key: 'github_url', label: 'GitHub' },
                                { key: 'linkedin_url', label: 'LinkedIn' },
                                { key: 'twitter_url', label: 'Twitter' },
                            ].map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">{field.label}</label>
                                    <input
                                        type="url"
                                        value={(formData as any)[field.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                        placeholder="https://..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl z-50 flex justify-end gap-3 md:pr-10">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-white border border-gray-200 text-zinc-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="px-8 py-3 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-zinc-900/20"
                >
                    {saving ? 'Saving Changes...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    )
}
