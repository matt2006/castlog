import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Catch } from '@/types'

interface Stats {
  totalUsers: number
  totalCatches: number
  activeCompetitions: number
  totalWeight: number
}

function SkeletonStat() {
  return (
    <div className="bg-admin-bg2 border border-admin-border rounded-[18px] p-5 animate-pulse">
      <div className="h-5 w-5 bg-admin-text3/20 rounded mb-3" />
      <div className="h-8 w-24 bg-admin-text3/20 rounded-lg mb-2" />
      <div className="h-3 w-16 bg-admin-text3/10 rounded" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-admin-bg2 border border-admin-border rounded-2xl p-4 flex items-center gap-3 animate-pulse">
      <div className="w-[38px] h-[38px] rounded-full bg-admin-text3/20 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 w-24 bg-admin-text3/20 rounded mb-1.5" />
        <div className="h-3 w-16 bg-admin-text3/10 rounded" />
      </div>
      <div className="h-3 w-12 bg-admin-text3/10 rounded" />
    </div>
  )
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentCatches, setRecentCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const [usersRes, catchesRes, competitionsRes, allCatchesCount, weightRes] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase
            .from('catches')
            .select('*, profiles(username, avatar_emoji, avatar_color)')
            .order('timestamp', { ascending: false })
            .limit(20),
          supabase
            .from('competitions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'live'),
          supabase.from('catches').select('id', { count: 'exact', head: true }),
          supabase.from('catches').select('weight_kg'),
        ])

      const totalWeight = (weightRes.data ?? []).reduce(
        (acc, c) => acc + (c.weight_kg ?? 0),
        0
      )

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalCatches: allCatchesCount.count ?? 0,
        activeCompetitions: competitionsRes.count ?? 0,
        totalWeight,
      })
      setRecentCatches((catchesRes.data ?? []) as Catch[])
      setLoading(false)
    }

    fetchAll()
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Good night'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const today = format(new Date(), 'EEEE, dd MMMM yyyy')

  const statItems = stats
    ? [
        {
          label: 'Anglers',
          value: stats.totalUsers.toString(),
          icon: '👥',
          accent: 'teal' as const,
        },
        {
          label: 'Catches',
          value: stats.totalCatches.toString(),
          icon: '🐟',
          accent: 'teal' as const,
        },
        {
          label: 'Active Events',
          value: stats.activeCompetitions.toString(),
          icon: '🏆',
          accent: 'gold' as const,
        },
        {
          label: 'Total Weight',
          value: `${stats.totalWeight.toFixed(1)} kg`,
          icon: '⚖️',
          accent: 'gold' as const,
        },
      ]
    : []

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-[12px] font-medium text-admin-text2">{today}</p>
        <h1 className="text-[30px] font-extrabold text-admin-text tracking-tight mt-0.5">
          {greeting} 👋
        </h1>
      </motion.header>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : statItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -2 }}
                className="bg-admin-bg2 border border-admin-border rounded-[18px] px-5 py-[18px] transition-colors hover:bg-admin-bg3"
              >
                <span
                  className={`text-[20px] leading-none ${
                    item.accent === 'teal' ? 'text-admin-teal' : 'text-admin-gold'
                  }`}
                >
                  {item.icon}
                </span>
                <p className="text-[32px] font-extrabold text-admin-text tracking-[-0.03em] leading-none mt-3 tabular-nums">
                  {item.value}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-text2 mt-1.5">
                  {item.label}
                </p>
              </motion.div>
            ))}
      </div>

      {/* Recent Catches */}
      <div className="mb-8">
        <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-admin-text2 mb-3">
          Recent Catches
        </p>
        <div className="flex flex-col gap-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            : recentCatches.length === 0
            ? (
                <div className="bg-admin-bg2 border border-admin-border rounded-2xl text-center text-admin-text2 py-8">
                  No catches yet.
                </div>
              )
            : recentCatches.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-admin-bg2 border border-admin-border rounded-[14px] p-3 flex items-center gap-3"
                >
                  <div
                    className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: c.profiles?.avatar_color ?? 'oklch(0.20 0.02 226)' }}
                  >
                    {c.profiles?.avatar_emoji ?? '🎣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-admin-text font-semibold text-[14px] leading-tight truncate">
                      {c.species}
                    </p>
                    <p className="text-admin-text2 text-[12px] mt-0.5 truncate">
                      {c.profiles?.username ?? 'Unknown'}
                      {c.competition_id && <span className="text-admin-text3"> · comp</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0 leading-tight">
                    <p className="text-admin-teal font-bold text-[15px] tabular-nums">
                      {c.weight_kg.toFixed(2)} kg
                    </p>
                    {c.length_cm !== null && (
                      <p className="text-admin-text3 text-[11px] tabular-nums mt-0.5">
                        {c.length_cm} cm
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-admin-text2 mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/admin/users?create=true"
            className="bg-admin-bg2 border border-admin-border rounded-[14px] p-4 flex items-center gap-3 hover:border-admin-teal/50 hover:bg-admin-bg3 transition-colors"
          >
            <span className="text-admin-teal text-xl">👤</span>
            <span className="text-admin-text font-semibold text-[14px]">Create Angler</span>
          </Link>
          <Link
            to="/admin/competitions?create=true"
            className="bg-admin-bg2 border border-admin-border rounded-[14px] p-4 flex items-center gap-3 hover:border-admin-gold/50 hover:bg-admin-bg3 transition-colors"
          >
            <span className="text-admin-gold text-xl">🏆</span>
            <span className="text-admin-text font-semibold text-[14px]">Create Event</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
