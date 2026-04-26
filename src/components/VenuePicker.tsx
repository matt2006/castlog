import { useMemo, useState } from 'react'
import type { Venue } from '@/types'

interface Props {
  venues: Venue[]
  value: string | null          // venue_id or null
  onChange: (venueId: string | null, venueName: string | null) => void
  theme?: 'angler' | 'admin'
}

export function VenuePicker({ venues, value, onChange, theme = 'angler' }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => venues.find((v) => v.id === value) ?? null,
    [venues, value]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return venues
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.location_text ?? '').toLowerCase().includes(q)
    )
  }, [venues, query])

  // Theme-aware class helpers
  const isAdmin = theme === 'admin'
  const inputCls = isAdmin
    ? 'w-full bg-admin-bg3 border border-admin-border rounded-[10px] px-3 py-2 text-[13px] text-admin-text placeholder-admin-text3 focus:outline-none focus:border-admin-teal transition-colors min-h-[44px]'
    : 'w-full bg-angler-white border border-angler-border rounded-[12px] px-3 py-2 text-[13px] text-angler-text placeholder-angler-text3 focus:outline-none focus:border-angler-teal transition-colors min-h-[44px]'
  const dropdownCls = isAdmin
    ? 'absolute z-50 top-full mt-1 left-0 right-0 bg-admin-bg2 border border-admin-border rounded-[12px] shadow-lg overflow-hidden max-h-52 overflow-y-auto'
    : 'absolute z-50 top-full mt-1 left-0 right-0 bg-angler-white border border-angler-border rounded-[12px] shadow-elevated-light overflow-hidden max-h-52 overflow-y-auto'
  const rowBaseCls = isAdmin
    ? 'w-full text-left px-3 py-2.5 text-[13px] transition-colors min-h-[44px] flex flex-col justify-center'
    : 'w-full text-left px-3 py-2.5 text-[13px] transition-colors min-h-[44px] flex flex-col justify-center'
  const rowHoverCls = isAdmin ? 'hover:bg-admin-bg3' : 'hover:bg-angler-bg2'
  const rowActiveCls = isAdmin
    ? 'bg-admin-teal-dim text-admin-teal'
    : 'bg-angler-teal-l text-angler-teal'
  const pillCls = isAdmin
    ? 'bg-admin-bg3 border border-admin-border rounded-[10px] px-3 py-2.5 text-[13px] text-admin-text cursor-pointer min-h-[44px] flex items-center gap-2 transition-colors hover:border-admin-teal'
    : 'bg-angler-white border border-angler-border rounded-[12px] px-3 py-2.5 text-[13px] text-angler-text cursor-pointer min-h-[44px] flex items-center gap-2 transition-colors hover:border-angler-teal'
  const labelCls = isAdmin
    ? 'text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-text2 mb-1.5 block'
    : 'text-[11px] font-semibold uppercase tracking-[0.06em] text-angler-text2 mb-1.5 block'
  const mutedCls = isAdmin ? 'text-admin-text3' : 'text-angler-text3'
  const accentCls = isAdmin ? 'text-admin-teal' : 'text-angler-teal'

  return (
    <div>
      <label className={labelCls}>🎣 Venue · optional</label>

      {/* Collapsed pill — shows selected venue or "Select a venue…" */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={pillCls}
        >
          {selected ? (
            <>
              <span className="flex-1 font-semibold truncate">{selected.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null, null)
                }}
                className={`text-base leading-none ${mutedCls} hover:opacity-70 ml-1 flex-shrink-0`}
                aria-label="Clear venue"
              >
                ✕
              </button>
            </>
          ) : (
            <span className={`flex-1 ${mutedCls}`}>Select a venue…</span>
          )}
        </button>
      )}

      {/* Expanded search + list */}
      {open && (
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => {
              // Small delay so click on list item registers first
              setTimeout(() => setOpen(false), 150)
            }}
            placeholder="Search venues…"
            className={inputCls}
          />
          <div className={dropdownCls}>
            {filtered.map((v) => {
              const active = v.id === value
              return (
                <button
                  key={v.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => {
                    onChange(v.id, v.name)
                    setQuery('')
                    setOpen(false)
                  }}
                  className={`${rowBaseCls} ${active ? rowActiveCls : rowHoverCls}`}
                >
                  <span className={`font-semibold leading-tight ${active ? '' : (isAdmin ? 'text-admin-text' : 'text-angler-text')}`}>
                    {v.name}
                  </span>
                  {v.location_text && (
                    <span className={`text-[11px] leading-tight ${active ? 'opacity-80' : mutedCls}`}>
                      {v.location_text}
                    </span>
                  )}
                </button>
              )
            })}
            {/* Other (not listed) */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(null, null)
                setQuery('')
                setOpen(false)
              }}
              className={`${rowBaseCls} ${rowHoverCls}`}
            >
              <span className={`font-semibold ${accentCls}`}>Other (not listed)</span>
              <span className={`text-[11px] ${mutedCls}`}>Leave venue unset</span>
            </button>
          </div>
        </div>
      )}

      {/* Fish types hint beneath selected venue */}
      {selected?.fish_types && !open && (
        <p className={`text-[11px] mt-1 ${mutedCls}`}>{selected.fish_types}</p>
      )}
    </div>
  )
}
