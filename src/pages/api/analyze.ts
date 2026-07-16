import type {NextApiRequest, NextApiResponse} from 'next'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import {REGIONS, Region, resolveRegion} from '@/lib/regions'

const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})

const MODEL = 'claude-opus-4-8'

// Marker separating the raw streamed model text (used by the client for
// progressive status hints) from the server-validated final JSON payload.
export const FINAL_MARKER = '<<<TRIP_CURATOR_FINAL>>>'

export interface TripCuration {
  concept: string
  blurb: string
  persona: string
  stayId: string
  experienceIds: string[]
  serviceId: string
  reasoning: string
}

export interface AnalysisResult {
  vibe: string
  detail: string
  tags: string[]
  region: string
  regionMatch?: 'strong' | 'approximate'
  place: string | null
  trips: TripCuration[]
  rankedStayIds: string[]
  reasoning: string
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
  maxDuration: 60,
}

interface Summary {
  id: string
  name: string
  location: string
  description: string
}

interface RegionPools {
  region: Region
  stays: Summary[]
  experiences: Summary[]
  services: Summary[]
}

function loadRegionPools(region: Region): RegionPools {
  const filePath = path.join(process.cwd(), 'public', 'data', region.file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const summarize = (s: any): Summary => ({
    id: s.id,
    name: s.name,
    location: s.location,
    description: (s.description || '').substring(0, 220),
  })
  const inRegion = (s: any) => s.region === region.id
  return {
    region,
    stays: (data.stays || []).filter(inRegion).map(summarize),
    experiences: (data.experiences || []).filter(inRegion).map(summarize),
    services: (data.services || []).filter(inRegion).map(summarize),
  }
}

// Pools, prompt, and schema are static per deploy — build once per warm
// serverless instance so every request shares the same byte-identical
// (and therefore cacheable) prompt prefix.
let allPools: RegionPools[] | null = null
let systemPrompt: string | null = null
let outputSchema: Record<string, unknown> | null = null

function getPools(): RegionPools[] {
  if (!allPools) allPools = REGIONS.map(loadRegionPools)
  return allPools
}

function formatList(items: Summary[]): string {
  return items.map((s) => `- ${s.id} | ${s.name} | ${s.location}\n  ${s.description}`).join('\n\n')
}

function getSystemPrompt(): string {
  if (systemPrompt) return systemPrompt

  const regionMenu = REGIONS
    .map((r) => `- ${r.id}: ${r.name}, ${r.country} (${r.aliases.slice(0, 5).join(', ')})`)
    .join('\n')

  const poolBlocks = getPools()
    .map(
      (p) => `=== REGION: ${p.region.id} — ${p.region.name}, ${p.region.country} ===

CANDIDATE STAYS:
${formatList(p.stays)}

CANDIDATE EXPERIENCES:
${formatList(p.experiences)}

CANDIDATE SERVICES:
${formatList(p.services)}`,
    )
    .join('\n\n')

  systemPrompt = `You are a taste-driven travel curator for an app that turns AI-generated "dream travel" images into real, bookable trips.

You will receive one traveler-uploaded image. In a single pass:

1. IDENTIFY THE REGION. Choose the ONE region from this menu that the image most resembles in aesthetic, architecture, landscape, or visible text/place names:
${regionMenu}

Set "region" to that region's id. Set "regionMatch" to "strong" when the image clearly depicts that region, or "approximate" when nothing clearly matches and you are choosing the closest aesthetic cousin.

2. READ THE IMAGE closely — light, texture, architecture, mood, any visible text or place names.
- "vibe": short evocative phrase, anchored to the place if visible text reveals one.
- "detail": ONE short evocative line — a top-line invitation, not analysis. ~8 to 14 words. No commas. Inspires the trip. Avoid dryly listing aesthetic qualities.
- "tags": 3-5 lowercase tags like "sun-baked", "artisanal", "coastal", "village-center".
- "place": specific place name from text visible in the image, or null.

3. COMPOSE THREE DISTINCT TRIPS using ONLY candidates from the chosen region's lists below. Each trip is a coherent concept — a single idea the traveler would recognize as a shape of day(s). Choose one stay + THREE experiences (ranked, most-essential first) + one service that together express that concept. Trip length scales between 2 and 10 nights; the renderer surfaces 1, 2, or 3 of your experiences depending on duration, so put the strongest pick first.

Rules:
- Each trip's stayId, serviceId, and EVERY experienceId MUST be exact ids from the chosen region's candidate lists — never from another region.
- Exactly 3 trips; each trip's experienceIds is an ordered array of exactly THREE distinct ids, strongest first.
- Every element must be within ~150km of the trip's stay.
- No stay, experience, or service id may appear in more than one trip (across all three trips, every experience id must be unique).
- The three trips should explore different facets of the image — not three variations of the same idea.
- "concept": short evocative trip title. "blurb": 2-3 sentences on the shape of this trip. "persona": who it's for, 3-6 words (e.g. "The slow-morning aesthete"). Per-trip "reasoning": one sentence on why these elements belong together.
- Top-level "reasoning": one sentence on how the three trips differ from each other.
- Let the image drive the concepts.

${poolBlocks}`

  return systemPrompt
}

// Structured-output schema. Candidate ids are baked in as enums so the API
// itself rejects hallucinated listings — the model cannot return an id that
// doesn't exist in the data files.
function getOutputSchema(): Record<string, unknown> {
  if (outputSchema) return outputSchema

  const pools = getPools()
  const stayIds = pools.flatMap((p) => p.stays.map((s) => s.id))
  const expIds = pools.flatMap((p) => p.experiences.map((s) => s.id))
  const svcIds = pools.flatMap((p) => p.services.map((s) => s.id))

  // Property order matters for streaming UX: vibe/region arrive first so the
  // client can surface them while trips are still generating.
  outputSchema = {
    type: 'object',
    properties: {
      vibe: {type: 'string'},
      detail: {type: 'string'},
      tags: {type: 'array', items: {type: 'string'}},
      region: {type: 'string', enum: REGIONS.map((r) => r.id)},
      regionMatch: {type: 'string', enum: ['strong', 'approximate']},
      place: {type: ['string', 'null']},
      trips: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            concept: {type: 'string'},
            blurb: {type: 'string'},
            persona: {type: 'string'},
            stayId: {type: 'string', enum: stayIds},
            experienceIds: {type: 'array', items: {type: 'string', enum: expIds}},
            serviceId: {type: 'string', enum: svcIds},
            reasoning: {type: 'string'},
          },
          required: ['concept', 'blurb', 'persona', 'stayId', 'experienceIds', 'serviceId', 'reasoning'],
          additionalProperties: false,
        },
      },
      reasoning: {type: 'string'},
    },
    required: ['vibe', 'detail', 'tags', 'region', 'regionMatch', 'place', 'trips', 'reasoning'],
    additionalProperties: false,
  }

  return outputSchema
}

// The schema guarantees ids exist somewhere in the data; this pass guarantees
// coherence — every id belongs to the chosen region and appears at most once
// across trips. Anything dropped here is backfilled client-side by
// assembleTrips' nearest-neighbor repair.
function validateAndRepair(parsed: any): AnalysisResult {
  const regionId = resolveRegion(parsed.region)
  const pool = getPools().find((p) => p.region.id === regionId)!
  const stayIds = new Set(pool.stays.map((s) => s.id))
  const expIds = new Set(pool.experiences.map((s) => s.id))
  const svcIds = new Set(pool.services.map((s) => s.id))

  const usedStays = new Set<string>()
  const usedExps = new Set<string>()
  const usedSvcs = new Set<string>()

  const trips: TripCuration[] = (parsed.trips || [])
    .map((t: any): TripCuration | null => {
      const stayOk = stayIds.has(t.stayId) && !usedStays.has(t.stayId)
      if (!stayOk) return null
      usedStays.add(t.stayId)

      const experienceIds = (t.experienceIds || []).filter((id: string) => {
        if (!expIds.has(id) || usedExps.has(id)) return false
        usedExps.add(id)
        return true
      })

      let serviceId = t.serviceId
      if (!svcIds.has(serviceId) || usedSvcs.has(serviceId)) serviceId = ''
      if (serviceId) usedSvcs.add(serviceId)

      return {
        concept: t.concept || '',
        blurb: t.blurb || '',
        persona: t.persona || '',
        stayId: t.stayId,
        experienceIds,
        serviceId,
        reasoning: t.reasoning || '',
      }
    })
    .filter(Boolean) as TripCuration[]

  return {
    vibe: parsed.vibe || '',
    detail: parsed.detail || '',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    region: regionId,
    regionMatch: parsed.regionMatch === 'approximate' ? 'approximate' : 'strong',
    place: parsed.place ?? null,
    trips,
    rankedStayIds: trips.map((t) => t.stayId),
    reasoning: parsed.reasoning || '',
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const {imageBase64, mediaType} = req.body as {imageBase64: string; mediaType: string}

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({error: 'imageBase64 and mediaType required'})
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  })

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      system: [
        {
          type: 'text',
          text: getSystemPrompt(),
          // Static prefix (instructions + every region's candidate pools) —
          // cached across requests; only the image below varies.
          cache_control: {type: 'ephemeral', ttl: '1h'},
        },
      ],
      output_config: {
        format: {type: 'json_schema', schema: getOutputSchema()},
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: "Here is the traveler's inspiration image. Identify the region and compose the three trips.",
            },
          ],
        },
      ],
    } as any)

    stream.on('text', (delta) => {
      res.write(delta)
    })

    const message = await stream.finalMessage()

    const u = message.usage as any
    console.log(
      `analyze usage — input: ${u.input_tokens}, cache write: ${u.cache_creation_input_tokens}, cache read: ${u.cache_read_input_tokens}, output: ${u.output_tokens}`,
    )

    if (message.stop_reason === 'refusal') {
      throw new Error('Model declined the request')
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const analysis = validateAndRepair(JSON.parse(text))
    res.write(`\n${FINAL_MARKER}\n${JSON.stringify(analysis)}`)
  } catch (err) {
    console.error('analyze failed:', err)
    res.write(`\n${FINAL_MARKER}\n${JSON.stringify({error: 'analysis_failed'})}`)
  }

  res.end()
}
