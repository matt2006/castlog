import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '@/lib/achievements'
import type { Profile, AchievementEarned } from '@/types'

interface EarnedRow extends AchievementEarned {
  profiles?: { username: string; avatar_emoji: string; avatar_color: string }
}

export function AdminAchievements() {
  const [tab, setTab] = useState<'earned' | 'grant'>('earned')
  const [earned, setEarned] = useState<EarnedRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [anglerSearch, setAnglerSearch] = useState('')
  const [achievementFilter, setAchievementFilter] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<EarnedRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Grant form
  const [grantAngler, setGrantAngler] = useState('')
  const [grantAchievement, setGrantAchievement] = useState('')
  const [anglerEarnedIds, setAnglerEarnedIds] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('achievements_earned')
        .select('*, profiles(username, avatar_emoji, avatar_color)')
        .order('earned_at', { ascending: false }),
      supabase.from('profiles').select('*').order('username'),
    ]).then(([earnedRes, profilesRes]) => {
      if (earnedRes.data) setEarned(earnedRes.data as EarnedRow[])
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!grantAngler) { setAnglerEarnedIds([]); return }
    supabase.from('achievements_earned').select('achievement_id').eq('angler_id', grantAngler)
      .then(({ data }) => setAnglerEarnedIds(data?.map((r) => r.achievement_id) ?? []))
  }, [grantAngler])

  const revoke = async (row: EarnedRow) => {
    setActionLoading(true)
    await supabase.from('achievements_earned').delete().eq('id', row.id)
    setEarned((prev) => prev.filter((r) => r.id !== row.id))
    setRevokeTarget(null)
    setActionLoading(false)
  }

  const grant = async () => {
    if (!grantAngler || !grantAchievement) return
    setActionLoading(true)
    const { data, error } = await supabase.from('achievements_earned').insert({
      angler_id: grantAngler,
      achievement_id: grantAchievement,
      earned_at: new Date().toISOString(),
    }).select('*, profiles(username, avatar_emoji, avatar_color)').single()

    if (!error && data) {
      setEarned((prev) => [data as EarnedRow, ...prev])
      setAnglerEarnedIds((prev) => [...prev, grantAchievement])
      setGrantAchievement('')
      const ach = ACHIEVEMENT_MAP[grantAchievement]
      setToast(`${ach?.icon} ${ach?.name} granted!`)
      setTimeout(() => setToast(null), 3000)
    }
    setActionLoading(false)
  }

  const filteredEarned = earned.filter((r) => {
    if (anglerSearch && !r.profiles?.username.toLowerCase().includes(anglerSearch.toLowerCase())) return false
    if (achievementFilter && r.achievement_id !== achievementFilter) return false
    return true
  })

  const rarityColors: Record<string, string> = {
    common: 'text-gray-300',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-yellow-400',
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-black text-admin-text mb-6">Achievements</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-admin-bg3 rounded-xl p-1">
        {(['earned', 'grant'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
              tab === t ? 'bg-admin-teal text-admin-bg' : 'text-admin-text2 hover:text-admin-text'
            }`}
          >
            {t === 'earned' ? '🎖 Earned' : '✨ Grant'}
          </button>
        ))}
      </div>

      {tab === 'earned' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input
              placeholder="Search angler…"
              className="input text-sm flex-1"
              value={anglerSearch}
              onChange={(e) => setAnglerSearch(e.target.value)}
            />
            <select
              className="input text-sm flex-1"
              value={achievementFilter}
              onChange={(e) => setAchievementFilter(e.target.value)}
            >
              <option value="">All achievements</option>
              {ACHIEVEMENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          <p className="text-admin-text3 text-sm mb-3">{filteredEarned.length} records</p>

          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-admin-bg3" />)}</div>
          ) : filteredEarned.length === 0 ? (
            <div className="text-center py-12 text-admin-text3">No achievements found</div>
          ) : (
            <div className="space-y-2">
              {filteredEarned.map((row) => {
                const ach = ACHIEVEMENT_MAP[row.achievement_id]
                return (
                  <div key={row.id} className="card flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: row.profiles?.avatar_color ? `${row.profiles.avatar_color}22` : '#00E5C822' }}
                    >
                      {row.profiles?.avatar_emoji ?? '🎣'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-admin-text text-sm">{row.profiles?.username ?? '—'}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span>{ach?.icon}</span>
                        <span className="text-admin-text">{ach?.name ?? row.achievement_id}</span>
                        {ach && <span className={`font-bold capitalize ${rarityColors[ach.rarity]}`}>{ach.rarity}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-admin-text3 text-xs">{format(new Date(row.earned_at), 'dd MMM yyyy')}</p>
                      <button
                        onClick={() => setRevokeTarget(row)}
                        className="text-red-400 text-xs hover:text-red-300 mt-1"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'grant' && (
        <div className="card max-w-sm">
          <h2 className="font-bold text-admin-text mb-4">Grant Achievement</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Angler</label>
              <select className="input" value={grantAngler} onChange={(e) => setGrantAngler(e.target.value)}>
                <option value="">Select angler…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.avatar_emoji} {p.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Achievement</label>
              <select className="input" value={grantAchievement} onChange={(e) => setGrantAchievement(e.target.value)} disabled={!grantAngler}>
                <option value="">Select achievement…</option>
                {ACHIEVEMENTS.map((a) => {
                  const alreadyEarned = anglerEarnedIds.includes(a.id)
                  return (
                    <option key={a.id} value={a.id} disabled={alreadyEarned}>
                      {a.icon} {a.name} {alreadyEarned ? '(earned)' : `· ${a.rarity}`}
                    </option>
                  )
                })}
              </select>
            </div>
            <button
              onClick={grant}
              disabled={!grantAngler || !grantAchievement || actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Granting…' : '✨ Grant Achievement'}
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirm */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-admin-bg2 border border-admin-border rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-lg font-bold text-admin-text mb-2">Revoke achievement?</h2>
              <p className="text-admin-text2 text-sm mb-4">
                Remove <strong>{ACHIEVEMENT_MAP[revokeTarget.achievement_id]?.name}</strong> from <strong>{revokeTarget.profiles?.username}</strong>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRevokeTarget(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => revoke(revokeTarget)} disabled={actionLoading} className="btn-danger flex-1">Revoke</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-admin-teal text-admin-bg font-bold px-6 py-3 rounded-2xl shadow-xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
