import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Catch, Competition } from '@/types'

const PAGE_SIZE = 50

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

export function AdminCatches() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [anglerFilter, setAnglerFilter] = useState('')
  const [competitionFilter, setCompetitionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Detail modal
  const [detailCatch, setDetailCatch] = useState<Catch | null>(null)

  // Single delete
  const [deleteTarget, setDeleteTarget] = useState<Catch | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const allFetchedRef = useRef<Catch[]>([])

  useEffect(() => {
    loadCatches(1)
    loadCompetitions()
  }, [])

  async function loadCompetitions() {
    const { data } = await supabase
      .from('competitions')
      .select('id, name')
      .order('name')
    if (data) setCompetitions(data as Competition[])
  }

  async function loadCatches(pageNum: number) {
    if (pageNum === 1) setLoading(true)

    const from = (pageNum - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data } = await supabase
      .from('catches')
      .select('*, profiles(username, avatar_emoji, avatar_color)')
      .order('timestamp', { ascending: false })
      .range(from, to)

    if (data) {
      if (pageNum === 1) {
        allFetchedRef.current = data as Catch[]
        setCatches(data as Catch[])
      } else {
        allFetchedRef.current = [...allFetchedRef.current, ...(data as Catch[])]
        setCatches(allFetchedRef.current)
      }
      setHasMore(data.length === PAGE_SIZE)
      setPage(pageNum)
    }

    setLoading(false)
  }

  function loadMore() {
    loadCatches(page + 1)
  }

  // Unique anglers from loaded catches
  const uniqueAnglers = Array.from(
    new Map(
      catches
        .filter((c) => c.profiles?.username)
        .map((c) => [c.angler_id, c.profiles!.username])
    ).entries()
  )

  // Filtered catches
  const filtered = catches.filter((c) => {
    if (speciesFilter && !c.species.toLowerCase().includes(speciesFilter.toLowerCase()))
      return false
    if (anglerFilter && c.angler_id !== anglerFilter) return false
    if (competitionFilter) {
      if (competitionFilter === '__none__' && c.competition_id !== null) return false
      if (competitionFilter !== '__none__' && c.competition_id !== competitionFilter)
        return false
    }
    if (dateFrom && new Date(c.timestamp) < new Date(dateFrom)) return false
    if (dateTo && new Date(c.timestamp) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  async function handleBulkDelete() {
    setBulkDeleteLoading(true)
    const ids = Array.from(selectedIds)
    await supabase.from('catches').delete().in('id', ids)
    setCatches((prev) => prev.filter((c) => !selectedIds.has(c.id)))
    allFetchedRef.current = allFetchedRef.current.filter((c) => !selectedIds.has(c.id))
    setSelectedIds(new Set())
    setBulkDeleteLoading(false)
    setConfirmBulkDelete(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await supabase.from('catches').delete().eq('id', deleteTarget.id)
    setCatches((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    allFetchedRef.current = allFetchedRef.current.filter((c) => c.id !== deleteTarget.id)
    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  function competitionName(id: string | null) {
    if (!id) return '—'
    return competitions.find((c) => c.id === id)?.name ?? 'Unknown'
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-black text-admin-text mb-6">Catches</h1>

      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <input
          type="text"
          className="input min-w-[140px] flex-shrink-0"
          placeholder="Species…"
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
        />
        <select
          className="input min-w-[140px] flex-shrink-0"
          value={anglerFilter}
          onChange={(e) => setAnglerFilter(e.target.value)}
        >
          <option value="">All Anglers</option>
          {uniqueAnglers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="input min-w-[160px] flex-shrink-0"
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
        >
          <option value="">All Competitions</option>
          <option value="__none__">No Competition</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input min-w-[140px] flex-shrink-0"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
        />
        <input
          type="date"
          className="input min-w-[140px] flex-shrink-0"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
        />
        {(speciesFilter || anglerFilter || competitionFilter || dateFrom || dateTo) && (
          <button
            className="btn-ghost flex-shrink-0 text-sm px-3"
            onClick={() => {
              setSpeciesFilter('')
              setAnglerFilter('')
              setCompetitionFilter('')
              setDateFrom('')
              setDateTo('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-admin-text3 text-xs mb-3">
        Showing {filtered.length} catch{filtered.length !== 1 ? 'es' : ''}
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-admin-text3 py-12">No catches found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="text-left py-3 px-2 w-10">
                    <input
                      type="checkbox"
                      className="accent-teal w-4 h-4"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Angler</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Species</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Weight</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Method</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Location</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Competition</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Date</th>
                  <th className="text-left text-admin-text3 font-medium py-3 px-2">Photo</th>
                  <th className="text-right text-admin-text3 font-medium py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-admin-border/50 transition-colors ${
                      selectedIds.has(c.id) ? 'bg-admin-teal/5' : 'hover:bg-admin-bg3'
                    }`}
                  >
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        className="accent-teal w-4 h-4"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{ backgroundColor: c.profiles?.avatar_color ?? '#1E3454' }}
                        >
                          {c.profiles?.avatar_emoji ?? '🎣'}
                        </div>
                        <span className="text-admin-text font-medium">
                          {c.profiles?.username ?? 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-admin-text">{c.species}</td>
                    <td className="py-3 px-2 text-admin-text">{c.weight_kg.toFixed(2)} kg</td>
                    <td className="py-3 px-2 text-admin-text2">{c.method ?? '—'}</td>
                    <td className="py-3 px-2 text-admin-text2 max-w-[120px] truncate">
                      {c.location_name ?? '—'}
                    </td>
                    <td className="py-3 px-2 text-admin-text2 max-w-[120px] truncate">
                      {competitionName(c.competition_id)}
                    </td>
                    <td className="py-3 px-2 text-admin-text2 whitespace-nowrap">
                      {format(new Date(c.timestamp), 'dd MMM yy')}
                    </td>
                    <td className="py-3 px-2 text-admin-text3">
                      {c.photo_url ? '📷' : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailCatch(c)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-admin-bg3 text-admin-text3 hover:text-admin-text transition-colors"
                          title="View"
                        >
                          👁
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-500/10 text-admin-text3 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`card ${selectedIds.has(c.id) ? 'border-admin-teal/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="accent-teal w-4 h-4 mt-1 shrink-0"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: c.profiles?.avatar_color ?? '#1E3454' }}
                  >
                    {c.profiles?.avatar_emoji ?? '🎣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-admin-text font-semibold text-sm">
                      {c.profiles?.username ?? 'Unknown'}
                    </p>
                    <p className="text-admin-text2 text-sm">
                      {c.species} · {c.weight_kg.toFixed(2)} kg
                    </p>
                    <p className="text-admin-text3 text-xs mt-0.5">
                      {format(new Date(c.timestamp), 'dd MMM yyyy HH:mm')}
                      {c.photo_url ? ' · 📷' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setDetailCatch(c)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-admin-text3"
                    >
                      👁
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-admin-text3 hover:text-red-400 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button onClick={loadMore} className="btn-ghost">
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Bulk delete sticky bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-auto z-30"
          >
            <div className="card shadow-2xl flex items-center gap-4 justify-between">
              <span className="text-admin-text text-sm font-semibold">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="btn-ghost text-sm py-2 px-3"
                >
                  Clear
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  className="btn-danger text-sm py-2 px-3"
                >
                  Delete ({selectedIds.size})
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailCatch && (
          <>
            <Backdrop onClick={() => setDetailCatch(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-admin-text font-black text-lg">Catch Detail</h3>
                  <button
                    onClick={() => setDetailCatch(null)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-admin-text2 hover:text-admin-text transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {detailCatch.photo_url && (
                  <img
                    src={detailCatch.photo_url}
                    alt={detailCatch.species}
                    className="w-full rounded-xl object-cover max-h-60 mb-4"
                  />
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: detailCatch.profiles?.avatar_color ?? '#1E3454' }}
                  >
                    {detailCatch.profiles?.avatar_emoji ?? '🎣'}
                  </div>
                  <div>
                    <p className="text-admin-text font-semibold">
                      {detailCatch.profiles?.username ?? 'Unknown'}
                    </p>
                    <p className="text-admin-text3 text-xs">
                      {format(new Date(detailCatch.timestamp), 'dd MMMM yyyy · HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-admin-bg3 rounded-xl p-3">
                    <p className="text-admin-text3 text-xs mb-0.5">Species</p>
                    <p className="text-admin-text font-semibold">{detailCatch.species}</p>
                  </div>
                  <div className="bg-admin-bg3 rounded-xl p-3">
                    <p className="text-admin-text3 text-xs mb-0.5">Weight</p>
                    <p className="text-admin-text font-semibold">{detailCatch.weight_kg.toFixed(2)} kg</p>
                  </div>
                  <div className="bg-admin-bg3 rounded-xl p-3">
                    <p className="text-admin-text3 text-xs mb-0.5">Method</p>
                    <p className="text-admin-text font-semibold">{detailCatch.method ?? '—'}</p>
                  </div>
                  <div className="bg-admin-bg3 rounded-xl p-3">
                    <p className="text-admin-text3 text-xs mb-0.5">Competition</p>
                    <p className="text-admin-text font-semibold">
                      {competitionName(detailCatch.competition_id)}
                    </p>
                  </div>
                  {detailCatch.location_name && (
                    <div className="bg-admin-bg3 rounded-xl p-3 col-span-2">
                      <p className="text-admin-text3 text-xs mb-0.5">Location</p>
                      <p className="text-admin-text font-semibold">{detailCatch.location_name}</p>
                    </div>
                  )}
                  {detailCatch.latitude !== null && detailCatch.longitude !== null && (
                    <div className="bg-admin-bg3 rounded-xl p-3 col-span-2">
                      <p className="text-admin-text3 text-xs mb-0.5">Coordinates</p>
                      <p className="text-admin-text font-semibold font-mono text-sm">
                        📍 {detailCatch.latitude.toFixed(5)}, {detailCatch.longitude.toFixed(5)}
                      </p>
                    </div>
                  )}
                  {detailCatch.weather_snapshot && (
                    <div className="bg-admin-bg3 rounded-xl p-3 col-span-2">
                      <p className="text-admin-text3 text-xs mb-0.5">Weather</p>
                      <p className="text-admin-text font-semibold text-sm">
                        {detailCatch.weather_snapshot.description} ·{' '}
                        {detailCatch.weather_snapshot.temperature}°C ·{' '}
                        {detailCatch.weather_snapshot.windspeed} km/h
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <button onClick={() => setDetailCatch(null)} className="btn-ghost flex-1">
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(detailCatch)
                      setDetailCatch(null)
                    }}
                    className="btn-danger"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk delete confirmation */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <>
            <Backdrop onClick={() => setConfirmBulkDelete(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Delete Catches</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  This will permanently delete{' '}
                  <span className="text-admin-text font-semibold">{selectedIds.size}</span> catch
                  {selectedIds.size !== 1 ? 'es' : ''}. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmBulkDelete(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteLoading}
                    className="btn-danger flex-1"
                  >
                    {bulkDeleteLoading ? 'Deleting…' : `Delete ${selectedIds.size}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Single delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <Backdrop onClick={() => setDeleteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card max-w-sm w-full shadow-2xl">
                <h3 className="text-admin-text font-black text-lg mb-2">Delete Catch</h3>
                <p className="text-admin-text2 text-sm mb-6">
                  Delete{' '}
                  <span className="text-admin-text font-semibold">
                    {deleteTarget.species} ({deleteTarget.weight_kg.toFixed(2)} kg)
                  </span>{' '}
                  by {deleteTarget.profiles?.username ?? 'Unknown'}? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
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
    </div>
  )
}
