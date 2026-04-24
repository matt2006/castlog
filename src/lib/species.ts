import type { Species } from '@/types'

export const SPECIES: Species[] = [
  // COARSE
  { name: 'Common Carp', emoji: '🐟', category: 'coarse', avgWeight: '4–8 kg', britishRecord: '30.1 kg', habitat: 'Lakes & Rivers', description: 'The most popular UK coarse fish. Powerful fighters found in still and slow-moving waters.' },
  { name: 'Mirror Carp', emoji: '🐟', category: 'coarse', avgWeight: '4–10 kg', britishRecord: '30.1 kg', habitat: 'Lakes', description: 'Variant of common carp with irregular, scattered scales. Grow very large.' },
  { name: 'Grass Carp', emoji: '🐟', category: 'coarse', avgWeight: '5–10 kg', britishRecord: '22.7 kg', habitat: 'Lakes', description: 'Herbivorous carp introduced to control aquatic vegetation. Excellent fighters.' },
  { name: 'Pike', emoji: '🦈', category: 'coarse', avgWeight: '3–8 kg', britishRecord: '21.2 kg', habitat: 'Lakes & Rivers', description: 'Apex predator with ferocious strikes. Found in most lowland waters.' },
  { name: 'Perch', emoji: '🐠', category: 'coarse', avgWeight: '0.3–1 kg', britishRecord: '2.8 kg', habitat: 'Lakes & Rivers', description: 'Striped ambush predator. Prized by lure anglers and beginners alike.' },
  { name: 'Bream', emoji: '🐟', category: 'coarse', avgWeight: '1–3 kg', britishRecord: '9.1 kg', habitat: 'Lakes & Slow Rivers', description: 'Deep-bodied bronze fish that feeds on the bottom in shoals.' },
  { name: 'Tench', emoji: '🐟', category: 'coarse', avgWeight: '1–3 kg', britishRecord: '6.4 kg', habitat: 'Lakes & Ponds', description: 'The "doctor fish" — dark olive-green with tiny scales. Superb summer quarry.' },
  { name: 'Roach', emoji: '🐟', category: 'coarse', avgWeight: '0.1–0.5 kg', britishRecord: '1.9 kg', habitat: 'Rivers & Lakes', description: 'Silver fish with red fins. Probably the most widespread UK coarse species.' },
  { name: 'Rudd', emoji: '🐟', category: 'coarse', avgWeight: '0.1–0.4 kg', britishRecord: '2.1 kg', habitat: 'Lakes & Ponds', description: 'Similar to roach but prefers surface feeding. Vivid red-orange fins.' },
  { name: 'Chub', emoji: '🐟', category: 'coarse', avgWeight: '0.5–2 kg', britishRecord: '4.1 kg', habitat: 'Rivers', description: 'Wary river fish with a large mouth and thick lips. Will take almost any bait.' },
  { name: 'Barbel', emoji: '🐟', category: 'coarse', avgWeight: '1–4 kg', britishRecord: '8.5 kg', habitat: 'Fast Rivers', description: 'Muscular river fish with sensitive barbules. Named after the barbs around its mouth.' },
  { name: 'Dace', emoji: '🐟', category: 'coarse', avgWeight: '0.05–0.2 kg', britishRecord: '0.57 kg', habitat: 'Fast Rivers', description: 'Small, slender silver fish that thrives in fast-flowing, well-oxygenated rivers.' },
  { name: 'Crucian Carp', emoji: '🐟', category: 'coarse', avgWeight: '0.2–0.7 kg', britishRecord: '2.3 kg', habitat: 'Ponds', description: 'Deep-bodied golden carp without barbules. Pure specimens increasingly rare.' },
  { name: 'Zander', emoji: '🦈', category: 'coarse', avgWeight: '0.5–3 kg', britishRecord: '8.9 kg', habitat: 'Rivers & Lakes', description: 'European pikeperch with large glassy eyes adapted for low light.' },
  { name: 'Eel', emoji: '🐍', category: 'coarse', avgWeight: '0.3–1 kg', britishRecord: '5.05 kg', habitat: 'All waters', description: 'Nocturnal serpentine fish. Critically endangered — handle with care.' },
  { name: 'Gudgeon', emoji: '🐟', category: 'coarse', avgWeight: '0.02–0.05 kg', britishRecord: '0.14 kg', habitat: 'Rivers', description: 'Tiny bottom-feeder with two barbules. Fun on the float, great for beginners.' },
  { name: 'Bleak', emoji: '🐟', category: 'coarse', avgWeight: '0.01–0.03 kg', britishRecord: '0.1 kg', habitat: 'Rivers', description: 'Tiny silver fish that swims near the surface in large shoals.' },
  { name: 'Silver Bream', emoji: '🐟', category: 'coarse', avgWeight: '0.1–0.4 kg', britishRecord: '0.9 kg', habitat: 'Lakes & Slow Rivers', description: 'Slim cousin of common bream with larger eyes and a more silvery sheen.' },
  // GAME
  { name: 'Atlantic Salmon', emoji: '🐡', category: 'game', avgWeight: '3–8 kg', britishRecord: '29.0 kg', habitat: 'Rivers', description: 'The king of fish. Migratory, powerful, and elusive. The ultimate UK angling challenge.' },
  { name: 'Brown Trout', emoji: '🐡', category: 'game', avgWeight: '0.3–1.5 kg', britishRecord: '14.3 kg', habitat: 'Rivers & Lakes', description: 'Native UK trout with golden flanks and red spots. Wild fish are magnificent.' },
  { name: 'Sea Trout', emoji: '🐡', category: 'game', avgWeight: '0.5–3 kg', britishRecord: '12.9 kg', habitat: 'Rivers & Sea', description: 'Migratory brown trout that enters the sea. Chrome-silver and acrobatic.' },
  { name: 'Rainbow Trout', emoji: '🐡', category: 'game', avgWeight: '0.5–2 kg', britishRecord: '13.5 kg', habitat: 'Stocked Lakes', description: 'Introduced American species. Brightly coloured and popular in stillwater fisheries.' },
  { name: 'Grayling', emoji: '🐡', category: 'game', avgWeight: '0.2–0.6 kg', britishRecord: '1.9 kg', habitat: 'Clear Rivers', description: 'Lady of the stream — distinctive sail-like dorsal fin and violet sheen.' },
  { name: 'Arctic Char', emoji: '🐡', category: 'game', avgWeight: '0.3–1 kg', britishRecord: '3.6 kg', habitat: 'Deep Cold Lakes', description: 'Relict ice-age species found in deep cold lakes of Wales, Scotland and Ireland.' },
  // SEA
  { name: 'European Bass', emoji: '🐬', category: 'sea', avgWeight: '1–3 kg', britishRecord: '9.1 kg', habitat: 'Surf & Estuaries', description: 'The most prized UK sea fish. Powerful, intelligent, and superb eating.' },
  { name: 'Cod', emoji: '🐬', category: 'sea', avgWeight: '1–5 kg', britishRecord: '26.8 kg', habitat: 'Open Sea & Shore', description: 'Classic winter beach fishing target. A big cod is a genuine achievement.' },
  { name: 'Pollock', emoji: '🐬', category: 'sea', avgWeight: '1–3 kg', britishRecord: '7.5 kg', habitat: 'Reefs & Wrecks', description: 'Hard-fighting, powerful diver. A favourite of lure and wreck anglers.' },
  { name: 'Coalfish', emoji: '🐬', category: 'sea', avgWeight: '1–3 kg', britishRecord: '12.3 kg', habitat: 'Wrecks & Deep Water', description: 'Dark-backed close relative of pollock. Fast and aggressive on lures.' },
  { name: 'Mackerel', emoji: '🐟', category: 'sea', avgWeight: '0.2–0.5 kg', britishRecord: '0.97 kg', habitat: 'Open Sea', description: 'Summer shoal species with iridescent stripes. Electric sport on light tackle.' },
  { name: 'Flounder', emoji: '🫓', category: 'sea', avgWeight: '0.2–0.6 kg', britishRecord: '2.6 kg', habitat: 'Estuaries & Mudflats', description: 'Flat fish that moves far up estuaries. Great target from shore in winter.' },
  { name: 'Plaice', emoji: '🫓', category: 'sea', avgWeight: '0.4–1.5 kg', britishRecord: '5.9 kg', habitat: 'Sandy Seabed', description: 'Orange-spotted flatfish. Popular boat fishing target over sandy ground.' },
  { name: 'Dab', emoji: '🫓', category: 'sea', avgWeight: '0.1–0.3 kg', britishRecord: '0.68 kg', habitat: 'Sandy Shore', description: 'Small flatfish common from beaches. Fun sport on light tackle.' },
  { name: 'Dover Sole', emoji: '🫓', category: 'sea', avgWeight: '0.2–0.5 kg', britishRecord: '2.8 kg', habitat: 'Sandy Seabed', description: 'Prized flatfish with superb culinary reputation. Mostly nocturnal feeder.' },
  { name: 'Grey Mullet', emoji: '🐬', category: 'sea', avgWeight: '0.5–2 kg', britishRecord: '6.6 kg', habitat: 'Harbours & Estuaries', description: 'Notoriously difficult to hook. Requires finesse and patience — a real test.' },
  { name: 'Ballan Wrasse', emoji: '🐠', category: 'sea', avgWeight: '0.5–2 kg', britishRecord: '4.7 kg', habitat: 'Rocky Reefs', description: 'Colourful reef species. Great fun on lures around kelp and boulders.' },
  { name: 'Conger Eel', emoji: '🐍', category: 'sea', avgWeight: '5–20 kg', britishRecord: '59.5 kg', habitat: 'Wrecks & Reefs', description: 'Massive marine eel. Legendary boat fishing quarry capable of breaking tackle.' },
  { name: 'Lesser-spotted Dogfish', emoji: '🦈', category: 'sea', avgWeight: '0.5–1 kg', britishRecord: '2.0 kg', habitat: 'Sandy Seabed', description: 'Common small shark. Great for beginners targeting their first sea fish.' },
  { name: 'Thornback Ray', emoji: '🛸', category: 'sea', avgWeight: '2–5 kg', britishRecord: '9.0 kg', habitat: 'Sandy/Muddy Seabed', description: 'Broad-winged ray with dorsal spines. Popular boat and shore target.' },
  { name: 'Smooth-hound', emoji: '🦈', category: 'sea', avgWeight: '2–5 kg', britishRecord: '10.1 kg', habitat: 'Sandy Shallow Seas', description: 'Elegant small shark that fights well above its weight.' },
  { name: 'Whiting', emoji: '🐬', category: 'sea', avgWeight: '0.2–0.5 kg', britishRecord: '1.2 kg', habitat: 'Inshore Sandy Ground', description: 'Classic winter beach species. Often arrives in large shoals after dark.' },
  { name: 'Turbot', emoji: '🫓', category: 'sea', avgWeight: '1–5 kg', britishRecord: '14.4 kg', habitat: 'Sandy/Gravelly Seabed', description: 'Premium flatfish with a robust diamond shape. Superb on the table.' },
  { name: 'Brill', emoji: '🫓', category: 'sea', avgWeight: '0.5–3 kg', britishRecord: '8.0 kg', habitat: 'Sandy Seabed', description: 'Turbot\'s smaller cousin — oval, elegant, and a fine sporting fish.' },
  { name: 'Red Mullet', emoji: '🐠', category: 'sea', avgWeight: '0.2–0.5 kg', britishRecord: '1.0 kg', habitat: 'Warm Southern Waters', description: 'Striking red-pink colouring with two chin barbels. A prized southern catch.' },
  { name: 'Garfish', emoji: '🐍', category: 'sea', avgWeight: '0.2–0.4 kg', britishRecord: '1.2 kg', habitat: 'Open Sea Surface', description: 'Needle-nosed surface feeder with vivid green bones. Acrobatic fighter.' },
  { name: 'Pouting', emoji: '🐬', category: 'sea', avgWeight: '0.1–0.4 kg', britishRecord: '1.1 kg', habitat: 'Inshore Wrecks', description: 'Hardy member of the cod family common around wrecks and rough ground.' },
]

export function getSpeciesByCategory(category: Species['category']): Species[] {
  return SPECIES.filter((s) => s.category === category)
}

export function searchSpecies(query: string): Species[] {
  const q = query.toLowerCase().trim()
  if (!q) return SPECIES
  return SPECIES.filter((s) => s.name.toLowerCase().includes(q))
}

export const SPECIES_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  SPECIES.map((s) => [s.name, s.emoji])
)

export function getSpeciesEmoji(name: string): string {
  return SPECIES_EMOJI_MAP[name] ?? '🎣'
}
