import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import type { Venue } from '@/types'

interface VenueForm {
  name: string
  location_text: string
  size_description: string
  fish_types: string
  notes: string
}

const BLANK_FORM: VenueForm = {
  name: '',
  location_text: '',
  size_description: '',
  fish_types: '',
  notes: '',
}

interface ToastState {
  message: string
  kind: 'success' | 'error'
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-40"
      onClick={onClick}
    />
  )
}

export function AdminVenues() {
  const { venues, setVenues } = useStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<VenueForm>(BLANK_FORM)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit
  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [editForm, setEditForm] = useState<VenueForm>(BLANK_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<Venue | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadVenues()
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string, kind: ToastState['kind'] = 'success') {
    setToast({ message, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function loadVenues() {
    setLoading(true)
    const { data } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true })
    if (data) setVenues(data as Venue[])
    setLoading(false)
  }

  const filtered = venues.filter((v) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      v.name.toLowerCase().includes(q) ||
      (v.location_text ?? '').toLowerCase().includes(q) ||
      (v.fish_types ?? '').toLowerCase().includes(q)
    )
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const { data, error } = await supabase
      .from('venues')
      .insert({
        name: createForm.name,
        location_text: createForm.location_text || null,
        size_description: createForm.size_description || null,
        fish_types: createForm.fish_types || null,
        notes: createForm.notes || null,
      })
      .select()
      .single()

    setCreateLoading(false)
    if (error) {
      setCreateError(error.message)
      return
    }
    if (data) setVenues([...venues, data as Venue].sort((a, b) => a.name.localeCompare(b.name)))
    setShowCreate(false)
    setCreateForm(BLANK_FORM)
    showToast('Venue created')
  }

  function openEdit(v: Venue) {
    setEditVenue(v)
    setEditForm({
      name: v.name,
      location_text: v.location_text ?? '',
      size_description: v.size_description ?? '',
      fish_types: v.fish_types ?? '',
      notes: v.notes ?? '',
    })
    setEditError(null)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editVenue) return
    setEditLoading(true)
    setEditError(null)

    const { data, error } = await supabase
      .from('venues')
      .update({
        name: editForm.name,
        location_text: editForm.location_text || null,
        size_description: editForm.size_description || null,
        fish_types: editForm.fish_types || null,
        notes: editForm.notes || null,
      })
      .eq('id', editVenue.id)
      .select()
      .single()

    setEditLoading(false)
    if (error) {
      setEditError(error.message)
      return
    }
    if (data) {
      setVenues(
        venues
          .map((v) => (v.id === editVenue.id ? (data as Venue) : v))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    }
    setEditVenue(null)
    showToast('Venue updated')
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return
    setDeleteLoading(true)
    const { error } = await supabase.from('venues').delete().eq('id', confirmDelete.id)
    setDeleteLoading(false)
    if (error) {
      showToast(error.message, 'error')
    } else {
      setVenues(venues.filter((v) => v.id !== confirmDelete.id))
      showToast('Venue deleted')
    }
    setConfirmDelete(null)
  }

  const VenueDrawer = ({
    title,
    form,
    setForm,
    onSubmit,
    loading: formLoading,
    error: formError,
    onClose,
  }: {
    title: string
    form: VenueForm
    setForm: (f: VenueForm) => void
    onSubmit: (e: React.FormEvent) => void
    loading: boolean
    error: string | null
    onClose: () => void
  }) => (
    <>
      <Backdrop onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-admin-bg2 border-l border-admin-border z-50 overflow-y-auto"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-admin-text">{title}</h2>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text hover:bg-admin-bg3 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 flex-1">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Hallcroft Fishery"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Retford, NG22 0AX"
                value={form.location_text}
                onChange={(e) => setForm({ ...form, location_text: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Size</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 8+ lakes"
                value={form.size_description}
                onChange={(e) => setForm({ ...form, size_description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fish Types</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Carp, F1s, Silvers"
                value={form.fish_types}
                onChange={(e) => setForm({ ...form, fish_types: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Optional notes…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{formError}</p>
              </div>
            )}

            <div className="mt-auto pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                {formLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-admin-text">Venues</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <span>+</span>
          Add Venue
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues…"
          className="input max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-admin-text3 py-12">
          {venues.length === 0 ? 'No venues yet.' : 'No venues match your search.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-admin-text3 text-xs uppercase tracking-[0.06em] border-b border-admin-border">
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold hidden sm:table-cell">Location</th>
                <th className="py-2 pr-4 font-semibold hidden md:table-cell">Size</th>
                <th className="py-2 pr-4 font-semibold hidden lg:table-cell">Fish Types</th>
                <th className="py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-admin-border/50 hover:bg-admin-bg3/50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-admin-text">{v.name}</td>
                  <td className="py-3 pr-4 text-admin-text3 hidden sm:table-cell">
                    {v.location_text ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-admin-text3 hidden md:table-cell">
                    {v.size_description ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-admin-text3 hidden lg:table-cell">
                    {v.fish_types ?? '—'}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(v)}
                        className="btn-ghost text-xs py-1.5 px-3 min-h-0"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(v)}
                        className="btn-danger text-xs py-1.5 px-3 min-h-0"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create drawer */}
      <AnimatePresence>
        {showCreate && (
          <VenueDrawer
            title="Add Venue"
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreate}
            loading={createLoading}
            error={createError}
            onClose={() => { setShowCreate(false); setCreateError(null) }}
          />
        )}
      </AnimatePresence>

      {/* Edit drawer */}
      <AnimatePresence>
        {editVenue && (
          <VenueDrawer
            title="Edit Venue"
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleEditSave}
            loading={editLoading}
            error={editError}
            onClose={() => { setEditVenue(null); setEditError(null) }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <Backdrop onClick={() => setConfirmDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Delete Venue</h3>
                <p className="text-admin-text2 text-sm mb-2">
                  Delete{' '}
                  <span className="text-admin-text font-semibold">{confirmDelete.name}</span>?
                </p>
                <p className="text-admin-text3 text-xs mb-6">
                  This will unlink the venue from any existing competitions and catches but won't
                  delete them.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteLoading}
                    className="btn-danger flex-1"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]"
          >
            <div
              className={`rounded-xl px-4 py-3 shadow-2xl border font-medium text-sm ${
                toast.kind === 'success'
                  ? 'bg-admin-bg2 border-admin-teal/40 text-admin-text'
                  : 'bg-admin-bg2 border-red-500/40 text-red-300'
              }`}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
