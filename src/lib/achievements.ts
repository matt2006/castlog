import type { Achievement, Catch } from '@/types'

const uniqueSpecies = (catches: Catch[]): Set<string> =>
  new Set(catches.map((c) => c.species))

const uniqueCategories = (catches: Catch[]): Set<string> => {
  const coarse = ['Common Carp', 'Mirror Carp', 'Grass Carp', 'Pike', 'Perch', 'Bream', 'Tench', 'Roach', 'Rudd', 'Chub', 'Barbel', 'Dace', 'Crucian Carp', 'Zander', 'Eel', 'Gudgeon', 'Bleak', 'Silver Bream']
  const game = ['Atlantic Salmon', 'Brown Trout', 'Sea Trout', 'Rainbow Trout', 'Grayling', 'Arctic Char']
  const cats = new Set<string>()
  for (const c of catches) {
    if (coarse.includes(c.species)) cats.add('coarse')
    else if (game.includes(c.species)) cats.add('game')
    else cats.add('sea')
  }
  return cats
}

const hasHourCatch = (catches: Catch[], hourStart: number, hourEnd: number): boolean =>
  catches.some((c) => {
    const h = new Date(c.timestamp).getHours()
    return h >= hourStart && h < hourEnd
  })

export const ACHIEVEMENTS: Achievement[] = [
  // ── COMMON ──────────────────────────────────────────────────────────
  {
    id: 'first_cast',
    name: 'First Cast',
    description: 'Log your very first catch',
    icon: '🎣',
    rarity: 'common',
    check: (catches) => catches.length >= 1,
  },
  {
    id: 'species_hunter',
    name: 'Species Hunter',
    description: 'Catch 3 different species',
    icon: '🔍',
    rarity: 'common',
    check: (catches) => uniqueSpecies(catches).size >= 3,
    progress: (catches) => ({ current: Math.min(uniqueSpecies(catches).size, 3), max: 3 }),
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Log a catch before 7am',
    icon: '🌅',
    rarity: 'common',
    check: (catches) => hasHourCatch(catches, 0, 7),
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Log 3 catches on a single weekend',
    icon: '📅',
    rarity: 'common',
    check: (catches) => {
      const map = new Map<string, number>()
      for (const c of catches) {
        const d = new Date(c.timestamp)
        const day = d.getDay()
        if (day === 0 || day === 6) {
          const weekKey = `${d.getFullYear()}-W${Math.floor(d.getDate() / 7)}-${day === 0 ? 'sun' : 'sat'}`
          const base = day === 6 ? new Date(d) : new Date(d)
          const sat = new Date(d)
          sat.setDate(d.getDate() - (day === 0 ? 1 : 0))
          const wk = `${sat.getFullYear()}-${sat.getMonth()}-${sat.getDate()}`
          map.set(wk, (map.get(wk) ?? 0) + 1)
        }
      }
      return [...map.values()].some((v) => v >= 3)
    },
  },

  // ── RARE ────────────────────────────────────────────────────────────
  {
    id: 'big_ten',
    name: 'Big Ten',
    description: 'Land a single catch over 10 kg',
    icon: '💪',
    rarity: 'rare',
    check: (catches) => catches.some((c) => c.weight_kg >= 10),
  },
  {
    id: 'the_collector',
    name: 'The Collector',
    description: 'Catch 10 different species',
    icon: '📚',
    rarity: 'rare',
    check: (catches) => uniqueSpecies(catches).size >= 10,
    progress: (catches) => ({ current: Math.min(uniqueSpecies(catches).size, 10), max: 10 }),
  },
  {
    id: 'night_fisher',
    name: 'Night Fisher',
    description: 'Log a catch after midnight',
    icon: '🌙',
    rarity: 'rare',
    check: (catches) => hasHourCatch(catches, 0, 4),
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Log 100 total catches',
    icon: '💯',
    rarity: 'rare',
    check: (catches) => catches.length >= 100,
    progress: (catches) => ({ current: Math.min(catches.length, 100), max: 100 }),
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: 'Log 3 catches over 5 kg each',
    icon: '🎩',
    rarity: 'rare',
    check: (catches) => catches.filter((c) => c.weight_kg >= 5).length >= 3,
    progress: (catches) => ({ current: Math.min(catches.filter((c) => c.weight_kg >= 5).length, 3), max: 3 }),
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    description: 'Log catches in 5 different named locations',
    icon: '🗺️',
    rarity: 'rare',
    check: (catches) => new Set(catches.map((c) => c.location_name).filter(Boolean)).size >= 5,
    progress: (catches) => ({ current: Math.min(new Set(catches.map((c) => c.location_name).filter(Boolean)).size, 5), max: 5 }),
  },

  // ── EPIC ────────────────────────────────────────────────────────────
  {
    id: 'species_master',
    name: 'Species Master',
    description: 'Catch 20 different species',
    icon: '🏆',
    rarity: 'epic',
    check: (catches) => uniqueSpecies(catches).size >= 20,
    progress: (catches) => ({ current: Math.min(uniqueSpecies(catches).size, 20), max: 20 }),
  },
  {
    id: 'iron_angler',
    name: 'Iron Angler',
    description: 'Log 50 total catches',
    icon: '⚙️',
    rarity: 'epic',
    check: (catches) => catches.length >= 50,
    progress: (catches) => ({ current: Math.min(catches.length, 50), max: 50 }),
  },
  {
    id: 'competition_champion',
    name: 'Competition Champion',
    description: 'Win 1st place in a competition',
    icon: '🥇',
    rarity: 'epic',
    check: (_catches, earnedIds) => earnedIds.includes('competition_champion'),
  },
  {
    id: 'marathon_fisher',
    name: 'Marathon Fisher',
    description: 'Log catches in 5 different calendar months',
    icon: '📆',
    rarity: 'epic',
    check: (catches) =>
      new Set(catches.map((c) => new Date(c.timestamp).getMonth())).size >= 5,
    progress: (catches) => ({
      current: Math.min(new Set(catches.map((c) => new Date(c.timestamp).getMonth())).size, 5),
      max: 5,
    }),
  },
  {
    id: 'photo_hound',
    name: 'Photo Hound',
    description: 'Upload photos with 10 catches',
    icon: '📸',
    rarity: 'epic',
    check: (catches) => catches.filter((c) => c.photo_url).length >= 10,
    progress: (catches) => ({ current: Math.min(catches.filter((c) => c.photo_url).length, 10), max: 10 }),
  },

  // ── LEGENDARY ───────────────────────────────────────────────────────
  {
    id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Catch coarse, game, AND sea fish',
    icon: '🌊',
    rarity: 'legendary',
    check: (catches) => uniqueCategories(catches).size >= 3,
    progress: (catches) => ({ current: Math.min(uniqueCategories(catches).size, 3), max: 3 }),
  },
  {
    id: 'the_legend',
    name: 'The Legend',
    description: 'Log a total of 100 kg across all catches',
    icon: '👑',
    rarity: 'legendary',
    check: (catches) => catches.reduce((acc, c) => acc + c.weight_kg, 0) >= 100,
    progress: (catches) => ({
      current: Math.min(Math.round(catches.reduce((acc, c) => acc + c.weight_kg, 0)), 100),
      max: 100,
    }),
  },
  {
    id: 'ultimate_angler',
    name: 'Ultimate Angler',
    description: 'Unlock all other achievements',
    icon: '🎖️',
    rarity: 'legendary',
    check: (_catches, earnedIds) => {
      const allOthers = ACHIEVEMENTS.filter((a) => a.id !== 'ultimate_angler').map((a) => a.id)
      return allOthers.every((id) => earnedIds.includes(id))
    },
  },
]

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
)

export function checkNewAchievements(
  catches: Catch[],
  earnedIds: string[]
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !earnedIds.includes(a.id) && a.check(catches, earnedIds)
  )
}

export const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3,
}
