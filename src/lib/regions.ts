export interface Region {
  id: string
  name: string
  country: string
  file: string
  aliases: string[]
}

export const REGIONS: Region[] = [
  {
    id: 'provence',
    name: 'Provence',
    country: 'France',
    file: 'airbnb-mock-data.json',
    aliases: ["provence-alpes-côte d'azur", 'french riviera', "côte d'azur", 'luberon', 'aix-en-provence', 'arles', 'avignon', 'cannes', 'nice', 'marseille', 'menton'],
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    file: 'kyoto.json',
    aliases: ['京都', 'gion', 'higashiyama', 'arashiyama', 'fushimi', 'uji', 'kitayama', 'pontocho', 'nishiki'],
  },
]

export const DEFAULT_REGION = 'provence'

export function regionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id)
}

export function regionFromListingId(listingId: string): string | undefined {
  const match = listingId.match(/^(?:stay|exp|svc)-([a-z]+)-\d+$/)
  return match ? match[1] : undefined
}

export function resolveRegion(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_REGION
  const lower = raw.toLowerCase().trim()
  const direct = REGIONS.find((r) => r.id === lower)
  if (direct) return direct.id
  const byAlias = REGIONS.find((r) => r.aliases.some((a) => lower.includes(a.toLowerCase())))
  if (byAlias) return byAlias.id
  const byName = REGIONS.find((r) => lower.includes(r.name.toLowerCase()))
  if (byName) return byName.id
  return DEFAULT_REGION
}

export async function fetchRegionData(regionId: string): Promise<any> {
  const region = regionById(regionId) || regionById(DEFAULT_REGION)!
  const res = await fetch(`/data/${region.file}`)
  return res.json()
}
