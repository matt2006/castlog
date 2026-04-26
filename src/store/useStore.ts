import { create } from 'zustand'
import type { Session, Profile, Catch, Competition, AchievementEarned, OfflineCatch, Venue } from '@/types'
import { supabase, uploadPhotoBlob } from '@/lib/supabase'
import { cacheProfile, cacheCatches, getOfflineQueue, removeOfflineItem } from '@/lib/offline'

interface AppState {
  session: Session | null
  profile: Profile | null
  authLoading: boolean

  catches: Catch[]
  competitions: Competition[]
  earnedAchievements: AchievementEarned[]
  venues: Venue[]

  isOnline: boolean
  offlineQueue: OfflineCatch[]

  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setAuthLoading: (v: boolean) => void
  setCatches: (catches: Catch[]) => void
  addCatch: (c: Catch) => void
  removeCatch: (id: string) => void
  setCompetitions: (c: Competition[]) => void
  updateCompetition: (c: Competition) => void
  setEarnedAchievements: (a: AchievementEarned[]) => void
  addEarnedAchievement: (a: AchievementEarned) => void
  setVenues: (v: Venue[]) => void
  setIsOnline: (v: boolean) => void
  setOfflineQueue: (q: OfflineCatch[]) => void
  addOfflineItem: (item: OfflineCatch) => void
  removeOfflineItem: (id: string) => void

  initAuth: () => () => void
  loadProfile: (userId: string) => Promise<void>
  loadUserData: (userId: string) => Promise<void>
  replayOfflineQueue: () => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  authLoading: true,

  catches: [],
  competitions: [],
  earnedAchievements: [],
  venues: [],

  isOnline: navigator.onLine,
  offlineQueue: [],

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setCatches: (catches) => set({ catches }),
  addCatch: (c) => set((s) => ({ catches: [c, ...s.catches] })),
  removeCatch: (id) => set((s) => ({ catches: s.catches.filter((c) => c.id !== id) })),
  setCompetitions: (competitions) => set({ competitions }),
  updateCompetition: (comp) =>
    set((s) => ({
      competitions: s.competitions.map((c) => (c.id === comp.id ? comp : c)),
    })),
  setEarnedAchievements: (earnedAchievements) => set({ earnedAchievements }),
  addEarnedAchievement: (a) =>
    set((s) => ({ earnedAchievements: [...s.earnedAchievements, a] })),
  setVenues: (venues) => set({ venues }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setOfflineQueue: (offlineQueue) => set({ offlineQueue }),
  addOfflineItem: (item) =>
    set((s) => ({ offlineQueue: [...s.offlineQueue, item] })),
  removeOfflineItem: (id) =>
    set((s) => ({ offlineQueue: s.offlineQueue.filter((i) => i.id !== id) })),

  initAuth: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, authLoading: false })
      if (session?.user) {
        get().loadProfile(session.user.id)
        get().loadUserData(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session })
        if (session?.user) {
          get().loadProfile(session.user.id)
          get().loadUserData(session.user.id)
        } else {
          set({ profile: null, catches: [], competitions: [], earnedAchievements: [] })
        }
      }
    )

    // Online/offline listeners
    const handleOnline = () => {
      set({ isOnline: true })
      get().replayOfflineQueue()
    }
    const handleOffline = () => set({ isOnline: false })
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    getOfflineQueue().then((q) => set({ offlineQueue: q }))

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },

  loadProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      set({ profile: data as Profile })
      cacheProfile(data as Profile)
    }
  },

  loadUserData: async (userId) => {
    const [catchesRes, achievementsRes, competitionMembersRes, venuesRes] = await Promise.all([
      supabase
        .from('catches')
        .select('*, profiles(username, avatar_emoji, avatar_color), venue:venues(*)')
        .eq('angler_id', userId)
        .order('timestamp', { ascending: false }),
      supabase
        .from('achievements_earned')
        .select('*')
        .eq('angler_id', userId),
      supabase
        .from('competition_members')
        .select('competition_id')
        .eq('angler_id', userId),
      supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),
    ])

    if (catchesRes.data) {
      set({ catches: catchesRes.data as Catch[] })
      cacheCatches(catchesRes.data as Catch[])
    }
    if (achievementsRes.data) set({ earnedAchievements: achievementsRes.data as AchievementEarned[] })
    if (venuesRes.data) set({ venues: venuesRes.data as Venue[] })

    if (competitionMembersRes.data?.length) {
      const ids = competitionMembersRes.data.map((m) => m.competition_id)
      const { data: comps } = await supabase
        .from('competitions')
        .select('*, venue:venues(*)')
        .in('id', ids)
        .order('start_time', { ascending: false })
      if (comps) set({ competitions: comps as Competition[] })
    }
  },

  replayOfflineQueue: async () => {
    const { offlineQueue, session } = get()
    if (!session || offlineQueue.length === 0) return

    for (const item of offlineQueue) {
      let data = item.data

      // Upload the stashed base64 photo (if any) before inserting, and rewrite
      // data.photo_url with the resulting public URL. If upload fails, fall
      // back to inserting the catch without a photo — better than losing it.
      if (item.photo_base64) {
        try {
          const res = await fetch(item.photo_base64)
          const blob = await res.blob()
          const url = await uploadPhotoBlob(blob, item.data.angler_id)
          if (url) data = { ...data, photo_url: url }
        } catch {
          // swallow — insert the catch anyway
        }
      }

      const { error } = await supabase.from('catches').insert(data)
      if (!error) {
        await removeOfflineItem(item.id)
        get().removeOfflineItem(item.id)
      }
    }

    get().loadUserData(session.user.id)
  },
}))
