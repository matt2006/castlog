import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export async function compressImageToBlob(file: File | Blob, maxPx = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

export async function uploadPhotoBlob(
  blob: Blob,
  anglerIdPrefix: string,
  ext = 'jpg'
): Promise<string | null> {
  const path = `${anglerIdPrefix}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('catch-photos')
    .upload(path, blob, { upsert: false })
  if (error) {
    console.error('[uploadPhotoBlob] storage upload failed:', error.message, { path })
    return null
  }
  const { data } = supabase.storage.from('catch-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadCatchPhoto(
  file: File,
  anglerIdPrefix: string
): Promise<string | null> {
  const compressed = await compressImageToBlob(file, 800)
  const ext = file.name.split('.').pop() ?? 'jpg'
  return uploadPhotoBlob(compressed, anglerIdPrefix, ext)
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<{ temperature: number; windspeed: number; weathercode: number; description: string } | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code`
    )
    if (!res.ok) return null
    const json = await res.json()
    const c = json.current
    return {
      temperature: c.temperature_2m,
      windspeed: c.wind_speed_10m,
      weathercode: c.weather_code,
      description: wmoDescription(c.weather_code),
    }
  } catch {
    return null
  }
}

function wmoDescription(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 9) return 'Foggy'
  if (code <= 19) return 'Drizzle'
  if (code <= 29) return 'Rain'
  if (code <= 39) return 'Sleet'
  if (code <= 49) return 'Snow'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Stormy'
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
