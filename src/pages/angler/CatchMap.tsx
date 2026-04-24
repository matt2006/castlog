import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { format } from 'date-fns'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { getSpeciesEmoji } from '@/lib/species'
import type { Catch } from '@/types'

type Scope = 'mine' | 'all'

const DEFAULT_CENTER: LatLngExpression = [54.5, -2.5]
const DEFAULT_ZOOM = 5

function hasCoords(c: Catch): c is Catch & { latitude: number; longitude: number } {
  return c.latitude !== null && c.longitude !== null
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true })
      return
    }
    const bounds: LatLngBoundsExpression = points.map(([lat, lng]) => [lat, lng])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true })
  }, [map, points])
  return null
}

export function CatchMap() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const myCatches = useStore((s) => s.catches)

  const [scope, setScope] = useState<Scope>('mine')
  const [allCatches, setAllCatches] = useState<Catch[] | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)

  useEffect(() => {
    if (scope !== 'all' || allCatches !== null) return
    let cancelled = false
    setLoadingAll(true)
    supabase
      .from('catches')
      .select('*, profiles(username, avatar_emoji, avatar_color)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return
        if (data) setAllCatches(data as Catch[])
        setLoadingAll(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope, allCatches])

  const source = scope === 'mine' ? myCatches : (allCatches ?? [])
  const mapped = useMemo(() => source.filter(hasCoords), [source])
  const points = useMemo<Array<[number, number]>>(
    () => mapped.map((c) => [c.latitude, c.longitude]),
    [mapped]
  )

  if (!profile) return null

  return (
    <div data-theme="angler" className="h-screen w-full flex flex-col bg-angler-bg">
      <header className="bg-angler-white px-5 pt-[calc(env(safe-area-inset-top,0)+0.75rem)] pb-3 border-b border-angler-border z-[1000]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-angler-text2 hover:text-angler-text min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-xl"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="font-extrabold text-angler-text text-[20px] tracking-tight">Catch Map</h1>
          <span className="ml-auto text-angler-text3 text-[13px] font-semibold tabular-nums">
            {loadingAll ? '…' : mapped.length}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          {(['mine', 'all'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 px-4 h-10 rounded-full text-[13px] font-semibold min-h-[44px] transition-all ${
                scope === s
                  ? 'bg-angler-teal text-white shadow-card-light'
                  : 'bg-angler-white text-angler-text2 border border-angler-border'
              }`}
            >
              {s === 'mine' ? 'My Catches' : 'Everyone'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 relative">
        {mapped.length === 0 && !loadingAll && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
            <div className="bg-angler-white border border-angler-border rounded-[14px] shadow-elevated-light px-5 py-4 text-center max-w-xs">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-angler-text2 text-[13px] font-medium">
                {scope === 'mine'
                  ? 'None of your catches have GPS locations yet.'
                  : 'No catches with locations to show.'}
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {mapped.map((c) => (
            <Marker key={c.id} position={[c.latitude, c.longitude]}>
              <Popup>
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt={c.species}
                        className="w-11 h-11 rounded-[10px] object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-[10px] bg-angler-teal-l flex items-center justify-center text-2xl flex-shrink-0">
                        {getSpeciesEmoji(c.species)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-angler-text leading-tight truncate text-[14px]">
                        {c.species}
                      </p>
                      <p className="text-angler-teal font-extrabold text-[14px] tabular-nums">
                        {c.weight_kg.toFixed(2)} kg
                        {c.length_cm !== null && (
                          <span className="text-angler-text3 font-semibold text-[11px] ml-1.5">
                            · {c.length_cm} cm
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {scope === 'all' && c.profiles && (
                    <p className="text-angler-text2 text-[12px] mb-1">
                      <span style={{ color: c.profiles.avatar_color }}>
                        {c.profiles.avatar_emoji}
                      </span>{' '}
                      {c.profiles.username}
                    </p>
                  )}
                  {c.location_name && (
                    <p className="text-angler-text2 text-[11px] mb-0.5">📍 {c.location_name}</p>
                  )}
                  <p className="text-angler-text3 text-[11px]">
                    {format(new Date(c.timestamp), 'dd MMM yyyy • HH:mm')}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
