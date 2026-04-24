import type { Session } from '@supabase/supabase-js'

export type { Session }

export interface Profile {
  id: string
  username: string
  avatar_emoji: string
  avatar_color: string
  role: 'angler' | 'admin'
  force_password_change: boolean
  created_at: string
}

export interface WeatherSnapshot {
  temperature: number
  windspeed: number
  weathercode: number
  description: string
}

export interface Catch {
  id: string
  angler_id: string
  species: string
  weight_kg: number
  length_cm: number | null
  method: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  weather_snapshot: WeatherSnapshot | null
  competition_id: string | null
  timestamp: string
  profiles?: {
    username: string
    avatar_emoji: string
    avatar_color: string
  }
}

export interface Competition {
  id: string
  name: string
  description: string | null
  created_by: string | null
  join_code: string
  start_time: string
  end_time: string | null
  status: 'upcoming' | 'live' | 'ended'
  created_at: string
}

export interface CompetitionMember {
  competition_id: string
  angler_id: string
  joined_at: string
  profiles?: Profile
}

export interface AchievementEarned {
  id: string
  angler_id: string
  achievement_id: string
  earned_at: string
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: Rarity
  check: (catches: Catch[], earnedIds: string[]) => boolean
  progress?: (catches: Catch[]) => { current: number; max: number }
}

export interface Species {
  name: string
  emoji: string
  category: 'coarse' | 'game' | 'sea'
  avgWeight: string
  britishRecord: string
  habitat: string
  description: string
}

export interface OfflineCatch {
  id: string
  data: {
    angler_id: string
    species: string
    weight_kg: number
    length_cm: number | null
    method: string | null
    location_name: string | null
    latitude: number | null
    longitude: number | null
    photo_url: string | null
    weather_snapshot: WeatherSnapshot | null
    competition_id: string | null
  }
  // Base64 data URL of the (already compressed) photo, stashed when the user is
  // offline so that replayOfflineQueue can upload it on reconnect.
  photo_base64?: string | null
  timestamp: string
}

export interface LeaderboardEntry {
  angler_id: string
  username: string
  avatar_emoji: string
  avatar_color: string
  total_weight: number
  catch_count: number
  biggest_catch: number
  rank: number
}
