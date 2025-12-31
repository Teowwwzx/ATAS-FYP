'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'react-hot-toast'
import { createCategory, updateCategory } from '@/services/api'
import type { CategoryResponse } from '@/services/api.types'

interface CreateCategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingCategory?: CategoryResponse | null
}

export function CreateCategoryModal({ isOpen, onClose, onSuccess, editingCategory }: CreateCategoryModalProps) {
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name)
        } else {
            setName('')
        }
    }, [editingCategory, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('Category name is required')
            return
        }

        setIsLoading(true)
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name: name.trim() })
                toast.success('Category updated')
            } else {
                await createCategory({ name: name.trim() })
                toast.success('Category created')
            }
            onSuccess()
            setName('')
            onClose()
        } catch (e) {
            toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category')
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl z-50 max-w-md w-full outline-none">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                        {editingCategory ? 'Edit Category' : 'Create Category'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-gray-900 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="e.g., Machine Learning"
                                required
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Will be displayed as capitalized text (e.g., "Machine Learning")
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
