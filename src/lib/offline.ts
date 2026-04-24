import { get, set, del, keys } from 'idb-keyval'
import type { Catch, OfflineCatch, Profile } from '@/types'

const KEY_PROFILE = 'castlog:profile'
const KEY_CATCHES = 'castlog:catches'
const OFFLINE_QUEUE_PREFIX = 'castlog:offline:'

export async function cacheProfile(profile: Profile): Promise<void> {
  await set(KEY_PROFILE, profile)
}

export async function getCachedProfile(): Promise<Profile | undefined> {
  return get<Profile>(KEY_PROFILE)
}

export async function cacheCatches(catches: Catch[]): Promise<void> {
  await set(KEY_CATCHES, catches)
}

export async function getCachedCatches(): Promise<Catch[]> {
  return (await get<Catch[]>(KEY_CATCHES)) ?? []
}

export async function queueOfflineCatch(item: OfflineCatch): Promise<void> {
  await set(`${OFFLINE_QUEUE_PREFIX}${item.id}`, item)
}

export async function getOfflineQueue(): Promise<OfflineCatch[]> {
  const allKeys = await keys()
  const queueKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(OFFLINE_QUEUE_PREFIX)
  )
  const items = await Promise.all(queueKeys.map((k) => get<OfflineCatch>(k)))
  return items.filter(Boolean) as OfflineCatch[]
}

export async function removeOfflineItem(id: string): Promise<void> {
  await del(`${OFFLINE_QUEUE_PREFIX}${id}`)
}

export async function clearOfflineQueue(): Promise<void> {
  const allKeys = await keys()
  const queueKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(OFFLINE_QUEUE_PREFIX)
  )
  await Promise.all(queueKeys.map((k) => del(k)))
}
