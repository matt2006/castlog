import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  blobToBase64,
  compressImageToBlob,
  fetchWeather,
  supabase,
  uploadCatchPhoto,
} from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { checkNewAchievements } from '@/lib/achievements'
import { getSpeciesEmoji, searchSpecies } from '@/lib/species'
import { queueOfflineCatch } from '@/lib/offline'
import type { Catch, WeatherSnapshot } from '@/types'

type Step = 1 | 2 | 3 | 4
type MethodOption = 'Rod' | 'Float' | 'Fly' | 'Lure' | 'Net' | 'Other'
type CategoryFilter = 'All' | 'Coarse' | 'Game' | 'Sea'

const METHODS: MethodOption[] = ['Rod', 'Float', 'Fly', 'Lure', 'Net', 'Other']
const CATEGORY_FILTERS: CategoryFilter[] = ['All', 'Coarse', 'Game', 'Sea']

interface FormData {
  species: string
  customSpecies: string
  weight: string
  length: string
  method: MethodOption | null
  locationName: string
  latitude: number | null
  longitude: number | null
  weather: WeatherSnapshot | null
  photoFile: File | null
  photoPreview: string | null
  competitionId: string | null
}

interface AchievementToast {
  id: string
  name: string
  description: string
  icon: string
  rarity: string
}

const INITIAL_FORM: FormData = {
  species: '',
  customSpecies: '',
  weight: '',
  length: '',
  method: null,
  locationName: '',
  latitude: null,
  longitude: null,
  weather: null,
  photoFile: null,
  photoPreview: null,
  competitionId: null,
}

export function LogCatch() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useStore((s) => s.profile)
  const catches = useStore((s) => s.catches)
  const competitions = useStore((s) => s.competitions)
  const earnedAchievements = useStore((s) => s.earnedAchievements)
  const isOnline = useStore((s) => s.isOnline)
  const addCatch = useStore((s) => s.addCatch)
  const addEarnedAchievement = useStore((s) => s.addEarnedAchievement)
  const addOfflineItem = useStore((s) => s.addOfflineItem)

  const [isOpen, setIsOpen] = useState(true)
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [newCatch, setNewCatch] = useState<Catch | null>(null)
  const [isPB, setIsPB] = useState(false)
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([])
  const [assignCompId, setAssignCompId] = useState<string | null>(null)
  const [assigningComp, setAssigningComp] = useState(false)

  const [speciesSearch, setSpeciesSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const [locationMode, setLocationMode] = useState<'gps' | 'text' | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsObtained, setGpsObtained] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  const update = (patch: Partial<FormData>) =>
    setFormData((prev) => ({ ...prev, ...patch }))

  // Lock body scroll while sheet is mounted
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // ── DIAGNOSTIC: watch step changes ──────────────────────────────────────
  useEffect(() => {
    console.log('[LogCatch] step_changed_to', step)
  }, [step])

  // ── DIAGNOSTIC: watch isOpen changes ────────────────────────────────────
  useEffect(() => {
    console.log('[LogCatch] isOpen_changed_to', isOpen)
  }, [isOpen])

  // ── DIAGNOSTIC: unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      console.log('[LogCatch] UNMOUNTING — step at unmount time captured in closure')
    }
  }, [])

  // stepRef lets the unmount log see the current step without stale closure
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => {
    return () => {
      console.log('[LogCatch] UNMOUNTING — stepRef.current =', stepRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    console.trace('[LogCatch] close_called — isOpen:', isOpen, 'step:', stepRef.current, 'submitting (via ref below)')
    setIsOpen(false)
  }

  const onSheetClosed = () => {
    console.log('[LogCatch] onSheetClosed — location.key:', location.key, 'navigating', location.key === 'default' ? 'to /' : 'back')
    // Deep-link to /log (no in-app history) → fall back to Home.
    // Otherwise navigate back to wherever we came from.
    if (location.key === 'default') {
      navigate('/', { replace: true })
    } else {
      navigate(-1)
    }
  }

  const filteredSpecies = useMemo(() => {
    let list = searchSpecies(speciesSearch)
    if (categoryFilter !== 'All') {
      list = list.filter((s) => s.category === categoryFilter.toLowerCase())
    }
    return list
  }, [speciesSearch, categoryFilter])

  const effectiveSpecies = formData.customSpecies.trim() || formData.species

  const liveComps = useMemo(
    () => competitions.filter((c) => c.status === 'live'),
    [competitions]
  )

  function handleGetGPS() {
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        update({ latitude, longitude })
        setGpsObtained(true)
        setGpsLoading(false)
        setWeatherLoading(true)
        const weather = await fetchWeather(latitude, longitude)
        if (weather) update({ weather })
        setWeatherLoading(false)
      },
      (err) => {
        setGpsError(err.message || 'Could not get location.')
        setGpsLoading(false)
      },
      { timeout: 10000 }
    )
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    update({ photoFile: file, photoPreview: preview })
  }

  function handleRemovePhoto() {
    if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview)
    update({ photoFile: null, photoPreview: null })
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (libraryInputRef.current) libraryInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!profile) return

    // ── DIAGNOSTIC ────────────────────────────────────────────────────────
    console.log('[LogCatch] submit_start', {
      step,
      species: formData.customSpecies.trim() || formData.species,
      weight: formData.weight,
      has_photo: !!formData.photoFile,
      has_competition: !!formData.competitionId,
      isOnline,
    })
    // ─────────────────────────────────────────────────────────────────────

    setSubmitting(true)

    let savedCatch: Catch | null = null

    try {
      // Online: upload immediately. Offline: stash a compressed base64 copy so
      // replayOfflineQueue can upload it on reconnect.
      let photoUrl: string | null = null
      let photoBase64: string | null = null
      if (formData.photoFile) {
        if (isOnline) {
          console.log('[LogCatch] photo_upload_start')
          photoUrl = await uploadCatchPhoto(formData.photoFile, profile.id)
          console.log('[LogCatch] photo_upload_done — url:', photoUrl)
        } else {
          const compressed = await compressImageToBlob(formData.photoFile, 800)
          photoBase64 = await blobToBase64(compressed)
        }
      }

      const species = formData.customSpecies.trim() || formData.species
      const weight = parseFloat(formData.weight)
      const parsedLen = formData.length.trim() ? parseFloat(formData.length) : NaN
      const length_cm = Number.isFinite(parsedLen) ? parsedLen : null

      const catchData = {
        angler_id: profile.id,
        species,
        weight_kg: weight,
        length_cm,
        method: formData.method ?? null,
        location_name: formData.locationName.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photo_url: photoUrl,
        weather_snapshot: formData.weather,
        competition_id: formData.competitionId,
      }

      const prevPB = catches.length > 0 ? Math.max(...catches.map((c) => c.weight_kg)) : 0
      const isNewPB = weight > prevPB

      const fallbackCatch = (): Catch => ({
        id: crypto.randomUUID(),
        ...catchData,
        timestamp: new Date().toISOString(),
        profiles: {
          username: profile.username,
          avatar_emoji: profile.avatar_emoji,
          avatar_color: profile.avatar_color,
        },
      })

      if (isOnline) {
        try {
          console.log('[LogCatch] insert_start', catchData)
          const { data, error } = await supabase
            .from('catches')
            .insert(catchData)
            .select('*, profiles(username, avatar_emoji, avatar_color)')
            .single()
          if (error) {
            console.error('[LogCatch] insert_error', error)
          } else {
            console.log('[LogCatch] insert_done — row:', data)
          }
          savedCatch = (data as Catch | null) ?? fallbackCatch()
        } catch (err) {
          console.error('[LogCatch] insert_threw', err)
          savedCatch = fallbackCatch()
        }
        addCatch(savedCatch)
      } else {
        const id = crypto.randomUUID()
        const offlineItem = {
          id,
          data: catchData,
          photo_base64: photoBase64,
          timestamp: new Date().toISOString(),
        }
        await queueOfflineCatch(offlineItem)
        addOfflineItem(offlineItem)
        savedCatch = { id, ...catchData, timestamp: new Date().toISOString(), profiles: {
          username: profile.username,
          avatar_emoji: profile.avatar_emoji,
          avatar_color: profile.avatar_color,
        }}
        addCatch(savedCatch)
      }

      // Achievements — wrapped so a duplicate-insert or any other error here
      // never prevents step 4 from rendering.
      try {
        const earnedIds = earnedAchievements.map((a) => a.achievement_id)
        const allCatches = [savedCatch, ...catches]
        const newAchievements = checkNewAchievements(allCatches, earnedIds)
        console.log('[LogCatch] achievements_start — newAchievements:', newAchievements.length)
        for (const ach of newAchievements) {
          console.log('[LogCatch] achievement_processing — id:', ach.id)
          if (isOnline) {
            const { data, error } = await supabase
              .from('achievements_earned')
              .insert({ angler_id: profile.id, achievement_id: ach.id })
              .select()
              .single()
            console.log('[LogCatch] achievement_insert_result — data:', data, 'error:', error)
            if (data) addEarnedAchievement(data)
          }
          setAchievementToasts((prev) => [
            ...prev,
            { id: ach.id, name: ach.name, description: ach.description, icon: ach.icon, rarity: ach.rarity },
          ])
        }
        console.log('[LogCatch] achievements_done')
      } catch (err) {
        console.error('[LogCatch] achievements_error', err)
      }

      navigator.vibrate?.(200)

      if (isNewPB) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
        setIsPB(true)
      }
    } catch (err) {
      console.error('[LogCatch] submit_caught_error — unexpected throw in outer try:', err)
    } finally {
      console.log('[LogCatch] submit_finally — about to setStep(4), current step via ref:', stepRef.current, 'isOpen:', isOpen)
      setNewCatch(savedCatch)
      setSubmitting(false)
      console.log('[LogCatch] set_step_4_called')
      setStep(4)
    }
  }

  useEffect(() => {
    if (achievementToasts.length === 0) return
    const timer = setTimeout(() => {
      setAchievementToasts((prev) => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [achievementToasts])

  async function handleAssignComp() {
    if (!newCatch || !assignCompId) return
    setAssigningComp(true)
    await supabase
      .from('catches')
      .update({ competition_id: assignCompId })
      .eq('id', newCatch.id)
    setAssigningComp(false)
    close()
  }

  function resetForNext() {
    setStep(1)
    setFormData(INITIAL_FORM)
    setSpeciesSearch('')
    setCategoryFilter('All')
    setGpsObtained(false)
    setLocationMode(null)
    setNewCatch(null)
    setIsPB(false)
    setAssignCompId(null)
    setShowCustomInput(false)
  }

  if (!profile) return null

  const canSubmit =
    !submitting && !!formData.weight && parseFloat(formData.weight) > 0

  return (
    <>
      <AnimatePresence onExitComplete={onSheetClosed}>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={submitting || step === 4 ? undefined : close}
          >
            <motion.div
              key="sheet"
              data-theme="angler"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-0 bg-angler-bg rounded-t-[24px] shadow-sheet max-h-[92vh] flex flex-col font-sans"
            >
              {/* Drag handle */}
              <div className="pt-3 pb-1 flex-shrink-0 flex justify-center">
                <div className="w-10 h-1.5 rounded-full bg-angler-text3/40" />
              </div>

              {/* Header */}
              <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
                <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
                  {step === 1 && 'Pick a species'}
                  {step === 2 && 'Catch details'}
                  {step === 3 && 'Add a photo'}
                  {step === 4 && 'Logged!'}
                </h1>
                <button
                  onClick={close}
                  aria-label="Close"
                  disabled={submitting}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-angler-text2 hover:bg-angler-bg2 transition-colors disabled:opacity-0"
                >
                  ✕
                </button>
              </div>

              {/* Progress indicator — 3 input steps (Species · Details · Photo). Hidden on the final Done view. */}
              {step !== 4 && (
                <div className="px-5 pb-3 flex items-center justify-center gap-1.5 flex-shrink-0">
                  {[1, 2, 3].map((n) => {
                    const active = n === step
                    const done = n < step
                    return (
                      <motion.div
                        key={n}
                        layout
                        animate={{ width: active ? 20 : 6 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={`h-1.5 rounded-full ${
                          active
                            ? 'bg-angler-teal'
                            : done
                            ? 'bg-angler-teal/60'
                            : 'bg-angler-border'
                        }`}
                      />
                    )
                  })}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0)+1.25rem)]">
                {/* Steps 1–3 use mode="wait" so slides feel snappy between pages.
                    Step 4 (success) is rendered OUTSIDE AnimatePresence so it appears
                    immediately — no 220 ms exit-wait gap that would leave the backdrop
                    live over an empty content area (causing accidental close taps). */}
                {step < 4 && (
                <AnimatePresence mode="wait" initial={false}>
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      {/* Search */}
                      <div className="relative mb-3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-angler-text3">
                          🔍
                        </span>
                        <input
                          type="text"
                          className="w-full bg-angler-white border border-angler-border rounded-[12px] pl-9 pr-4 py-3 text-[14px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                          placeholder="Search species…"
                          value={speciesSearch}
                          onChange={(e) => setSpeciesSearch(e.target.value)}
                        />
                      </div>

                      {/* Category pills */}
                      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide mb-4">
                        {CATEGORY_FILTERS.map((f) => (
                          <button
                            key={f}
                            onClick={() => setCategoryFilter(f)}
                            className={`flex-shrink-0 px-4 h-10 rounded-full text-[13px] font-semibold min-h-[44px] transition-all ${
                              categoryFilter === f
                                ? 'bg-angler-teal text-white shadow-card-light'
                                : 'bg-angler-white text-angler-text2 border border-angler-border'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* Species grid */}
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        {filteredSpecies.map((s) => {
                          const active =
                            formData.species === s.name && !formData.customSpecies
                          return (
                            <button
                              key={s.name}
                              onClick={() => {
                                update({ species: s.name, customSpecies: '' })
                                setShowCustomInput(false)
                                setStep(2)
                              }}
                              className={`flex flex-col items-center justify-center gap-1.5 rounded-[14px] border p-3 min-h-[86px] transition-colors ${
                                active
                                  ? 'border-angler-teal bg-angler-teal-l'
                                  : 'border-angler-border bg-angler-white'
                              }`}
                            >
                              <span className="text-[28px] leading-none">{s.emoji}</span>
                              <span className="text-[13px] font-semibold text-angler-text text-center leading-tight">
                                {s.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Other / custom */}
                      <button
                        onClick={() => {
                          setShowCustomInput(true)
                          update({ species: '', customSpecies: '' })
                        }}
                        className={`w-full rounded-[14px] border py-3 text-[13px] font-semibold transition-all ${
                          showCustomInput
                            ? 'border-angler-teal bg-angler-teal-l text-angler-teal'
                            : 'border-angler-border bg-angler-white text-angler-text2'
                        }`}
                      >
                        Other species
                      </button>
                      {showCustomInput && (
                        <>
                          <input
                            type="text"
                            className="w-full mt-2 bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[14px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                            placeholder="Enter species name…"
                            autoFocus
                            value={formData.customSpecies}
                            onChange={(e) => update({ customSpecies: e.target.value })}
                          />
                          <button
                            onClick={() => effectiveSpecies && setStep(2)}
                            disabled={!effectiveSpecies}
                            className="mt-3 w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] transition-opacity disabled:bg-angler-text3/30 min-h-[44px]"
                          >
                            Continue →
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Selected species recap */}
                      <button
                        onClick={() => setStep(1)}
                        className="w-full flex items-center gap-2.5 bg-angler-teal-l border border-angler-teal-m rounded-[12px] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
                      >
                        <span className="text-[24px] leading-none">
                          {getSpeciesEmoji(effectiveSpecies)}
                        </span>
                        <span className="flex-1 font-bold text-angler-teal text-[14px]">
                          {effectiveSpecies}
                        </span>
                        <span className="text-angler-teal text-[12px] font-semibold">
                          Change
                        </span>
                      </button>

                      {/* Weight */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                          ⚖️ Weight (kg)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[15px] font-semibold text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                          placeholder="0.000"
                          step="0.001"
                          min="0"
                          value={formData.weight}
                          onChange={(e) => update({ weight: e.target.value })}
                        />
                      </div>

                      {/* Length */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                          📏 Length (cm) · optional
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[15px] font-semibold text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                          placeholder="e.g. 45.5"
                          step="0.1"
                          min="0"
                          max="999.9"
                          value={formData.length}
                          onChange={(e) => update({ length: e.target.value })}
                        />
                      </div>

                      {/* Method */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                          Method
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {METHODS.map((m) => (
                            <button
                              key={m}
                              onClick={() =>
                                update({ method: formData.method === m ? null : m })
                              }
                              className={`px-4 h-10 rounded-full text-[13px] font-semibold min-h-[44px] transition-all ${
                                formData.method === m
                                  ? 'bg-angler-teal text-white shadow-card-light'
                                  : 'bg-angler-white text-angler-text2 border border-angler-border'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                          📍 Location
                        </label>
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => {
                              setLocationMode('gps')
                              if (!gpsObtained) handleGetGPS()
                            }}
                            className={`flex-1 min-h-[44px] rounded-[12px] border text-[13px] font-semibold transition-all px-3 ${
                              locationMode === 'gps'
                                ? 'border-angler-teal bg-angler-teal-l text-angler-teal'
                                : 'border-angler-border bg-angler-white text-angler-text2'
                            }`}
                          >
                            {gpsLoading
                              ? '⏳ Getting…'
                              : gpsObtained
                              ? '📍 GPS obtained'
                              : '📍 Use GPS'}
                          </button>
                          <button
                            onClick={() => setLocationMode('text')}
                            className={`flex-1 min-h-[44px] rounded-[12px] border text-[13px] font-semibold transition-all px-3 ${
                              locationMode === 'text'
                                ? 'border-angler-teal bg-angler-teal-l text-angler-teal'
                                : 'border-angler-border bg-angler-white text-angler-text2'
                            }`}
                          >
                            ✏️ Type name
                          </button>
                        </div>
                        {gpsError && (
                          <p className="text-red-500 text-[12px] mb-1">{gpsError}</p>
                        )}
                        {locationMode === 'text' && (
                          <input
                            type="text"
                            className="w-full bg-angler-white border border-angler-border rounded-[12px] px-4 py-3 text-[14px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]"
                            placeholder="e.g. River Wye, Hereford"
                            value={formData.locationName}
                            onChange={(e) => update({ locationName: e.target.value })}
                          />
                        )}
                        {weatherLoading && (
                          <p className="text-angler-text3 text-[12px] mt-1">
                            🌤 Fetching weather…
                          </p>
                        )}
                        {formData.weather && (
                          <div className="bg-angler-bg2 border border-angler-border rounded-[12px] px-3 py-2 mt-1 text-[12px] text-angler-text2">
                            🌤 {formData.weather.temperature}°C · {formData.weather.windspeed} km/h ·{' '}
                            {formData.weather.description}
                          </div>
                        )}
                      </div>

                      {/* Competition */}
                      {liveComps.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5">
                            🏆 Competition · optional
                          </label>
                          <div className="space-y-2">
                            <button
                              onClick={() => update({ competitionId: null })}
                              className={`w-full text-left px-4 py-3 rounded-[12px] border text-[13px] font-semibold min-h-[44px] transition-all ${
                                formData.competitionId === null
                                  ? 'border-angler-teal bg-angler-teal-l text-angler-teal'
                                  : 'border-angler-border bg-angler-white text-angler-text2'
                              }`}
                            >
                              No competition
                            </button>
                            {liveComps.map((comp) => (
                              <button
                                key={comp.id}
                                onClick={() => update({ competitionId: comp.id })}
                                className={`w-full text-left px-4 py-3 rounded-[12px] border text-[13px] font-semibold min-h-[44px] transition-all ${
                                  formData.competitionId === comp.id
                                    ? 'border-angler-teal bg-angler-teal-l text-angler-teal'
                                    : 'border-angler-border bg-angler-white text-angler-text2'
                                }`}
                              >
                                🏆 {comp.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advance to photo step */}
                      <button
                        onClick={() => setStep(3)}
                        disabled={!canSubmit}
                        className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] transition-opacity disabled:bg-angler-text3/30 min-h-[44px]"
                      >
                        Next: Add Photo →
                      </button>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3photo"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Back-to-details recap */}
                      <button
                        onClick={() => setStep(2)}
                        className="w-full flex items-center gap-2.5 bg-angler-teal-l border border-angler-teal-m rounded-[12px] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
                      >
                        <span className="text-[20px] leading-none">{getSpeciesEmoji(effectiveSpecies)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-angler-teal text-[14px] font-bold truncate">
                            {effectiveSpecies}
                          </p>
                          <p className="text-angler-text2 text-[11px] tabular-nums">
                            {formData.weight || '0'} kg
                            {formData.length ? ` · ${formData.length} cm` : ''}
                            {formData.method ? ` · ${formData.method}` : ''}
                          </p>
                        </div>
                        <span className="text-angler-teal text-[12px] font-semibold">Edit</span>
                      </button>

                      {/* Preview or dashed placeholder */}
                      <div
                        className={`relative w-full aspect-[4/3] rounded-[18px] overflow-hidden ${
                          formData.photoPreview
                            ? ''
                            : 'border-2 border-dashed border-angler-border bg-angler-bg'
                        }`}
                      >
                        {formData.photoPreview ? (
                          <>
                            <img
                              src={formData.photoPreview}
                              alt="Catch preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={handleRemovePhoto}
                              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                              aria-label="Remove photo"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <div className="text-[48px] leading-none mb-3">📷</div>
                            <p className="text-angler-text3 text-[14px] font-medium">
                              No photo yet
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Hidden inputs: camera (capture="environment") and library (no capture) */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={handlePhotoChange}
                      />
                      <input
                        ref={libraryInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handlePhotoChange}
                      />

                      {/* Take Photo / Library */}
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 bg-angler-teal-l border-[1.5px] border-angler-teal rounded-[14px] px-4 py-3.5 text-angler-teal font-bold text-[14px] flex items-center justify-center gap-1.5 min-h-[44px] active:scale-[0.99] transition-transform"
                        >
                          <span>📷</span> Take Photo
                        </button>
                        <button
                          onClick={() => libraryInputRef.current?.click()}
                          className="flex-1 bg-angler-bg border-[1.5px] border-angler-border rounded-[14px] px-4 py-3.5 text-angler-text2 font-bold text-[14px] flex items-center justify-center gap-1.5 min-h-[44px] active:scale-[0.99] transition-transform"
                        >
                          <span>🖼</span> Library
                        </button>
                      </div>

                      {/* Submit — Skip & Log (no photo) OR Log Catch (photo attached) */}
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] transition-opacity disabled:bg-angler-text3/30 min-h-[44px]"
                      >
                        {submitting
                          ? 'Saving…'
                          : formData.photoPreview
                          ? 'Log Catch →'
                          : 'Skip & Log →'}
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
                )}

                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="text-center pt-2"
                  >
                      {formData.photoPreview ? (
                        <div className="w-[120px] h-[120px] rounded-full overflow-hidden mx-auto mb-4 border-4 border-angler-teal">
                          <img
                            src={formData.photoPreview}
                            alt="catch"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="text-[72px] leading-none mb-3">🎣</div>
                      )}
                      <h2 className="text-[22px] font-extrabold text-angler-text leading-tight">
                        {effectiveSpecies}
                      </h2>
                      <p className="text-[28px] font-extrabold text-angler-teal mt-1 tabular-nums">
                        {parseFloat(formData.weight).toFixed(2)} kg
                      </p>
                      {formData.length.trim() && (
                        <p className="text-[13px] text-angler-text3 mt-1 tabular-nums">
                          {parseFloat(formData.length)} cm
                        </p>
                      )}

                      {isPB && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="mt-4 bg-angler-gold-l border border-angler-gold/40 rounded-[14px] p-3"
                        >
                          <p className="text-angler-gold font-extrabold text-[15px]">
                            🏆 New Personal Best!
                          </p>
                          <p className="text-angler-text2 text-[12px] mt-0.5">
                            Beats your previous best
                          </p>
                        </motion.div>
                      )}

                      {/* Competition assignment — only available once the DB catch exists */}
                      {liveComps.length > 0 && !formData.competitionId && newCatch && (
                        <div className="mt-5 bg-angler-white border border-angler-border rounded-[14px] p-4 text-left shadow-card-light">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-2">
                            Add to competition?
                          </p>
                          <select
                            className="w-full bg-angler-bg2 border border-angler-border rounded-[12px] px-3 py-2.5 text-[14px] text-angler-text focus:outline-none focus:border-angler-teal min-h-[44px] mb-2"
                            value={assignCompId ?? ''}
                            onChange={(e) => setAssignCompId(e.target.value || null)}
                          >
                            <option value="">Select competition…</option>
                            {liveComps.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {assignCompId && (
                            <button
                              onClick={handleAssignComp}
                              disabled={assigningComp}
                              className="w-full py-3 rounded-[12px] bg-angler-teal text-white font-bold text-[14px] disabled:opacity-50 min-h-[44px]"
                            >
                              {assigningComp ? 'Saving…' : 'Add to competition'}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="mt-6 flex flex-col gap-1">
                        <button
                          onClick={close}
                          className="w-full py-3.5 rounded-[12px] bg-angler-teal text-white font-bold text-[15px] min-h-[44px]"
                        >
                          Done
                        </button>
                        <button
                          onClick={resetForNext}
                          className="py-2.5 text-angler-teal text-[13px] font-semibold min-h-[44px]"
                        >
                          Log another catch
                        </button>
                      </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement toasts — rendered outside the sheet so they're not torn down on exit */}
      <div className="fixed top-4 left-4 right-4 z-[60] space-y-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {achievementToasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="bg-angler-white border border-angler-teal/40 rounded-[14px] p-3 flex items-center gap-3 shadow-elevated-light pointer-events-auto"
            >
              <span className="text-2xl">{toast.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-angler-teal text-[13px] leading-tight">
                  🎖 {toast.name} unlocked!
                </p>
                <p className="text-angler-text2 text-[11px] leading-tight mt-0.5">
                  {toast.description}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  toast.rarity === 'legendary'
                    ? 'text-angler-gold'
                    : toast.rarity === 'epic'
                    ? 'text-angler-purple'
                    : toast.rarity === 'rare'
                    ? 'text-blue-500'
                    : 'text-angler-text3'
                }`}
              >
                {toast.rarity}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
