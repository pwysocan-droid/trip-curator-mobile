import type {NextApiRequest, NextApiResponse} from 'next'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import {REGIONS, DEFAULT_REGION, regionById, resolveRegion} from '@/lib/regions'

const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})

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
  },
  maxDuration: 60,
}

interface Summary {
  id: string
  name: string
  location: string
  description: string
}

function loadPools(regionId: string) {
  const region = regionById(regionId) || regionById(DEFAULT_REGION)!
  const filePath = path.join(process.cwd(), 'public', 'data', region.file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const summarize = (s: any): Summary => ({
    id: s.id,
    name: s.name,
    location: s.location,
    description: (s.description || '').substring(0, 220),
  })
  return {
    stays: (data.stays || []).filter((s: any) => s.region === regionId).map(summarize),
    experiences: (data.experiences || []).filter((s: any) => s.region === regionId).map(summarize),
    services: (data.services || []).filter((s: any) => s.region === regionId).map(summarize),
  }
}

function formatList(items: Summary[]): string {
  return items.map((s) => `- ${s.id} | ${s.name} | ${s.location}\n  ${s.description}`).join('\n\n')
}

async function detectRegion(imageBase64: string, mediaType: string): Promise<string> {
  const choices = REGIONS.map((r) => `- ${r.id}: ${r.name}, ${r.country} (${r.aliases.slice(0, 4).join(', ')})`).join('\n')
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64},
          },
          {
            type: 'text',
            text: `Look at this travel image. Which of these regions does it most resemble in aesthetic, architecture, landscape, or visible place names?

${choices}

Reply with ONLY the region id (one word, lowercase). If none clearly match, reply "${DEFAULT_REGION}".`,
          },
        ],
      },
    ],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return resolveRegion(text.trim())
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const {imageBase64, mediaType} = req.body as {imageBase64: string; mediaType: string}

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({error: 'imageBase64 and mediaType required'})
  }

  const regionId = await detectRegion(imageBase64, mediaType)
  const region = regionById(regionId) || regionById(DEFAULT_REGION)!
  const {stays, experiences, services} = loadPools(regionId)

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64},
          },
          {
            type: 'text',
            text: `You are a taste-driven travel curator. Look carefully at this image — light, texture, architecture, mood, any visible text or place names.

Then compose THREE distinct trip ideas for ${region.name}, ${region.country}. Each trip is a coherent concept — a single idea the traveler would recognize as a shape of day(s). Choose one stay + THREE experiences (ranked, most-essential first) + one service that together express that concept. Trip length scales between 2 and 10 nights; the renderer surfaces 1, 2, or 3 of your experiences depending on duration, so put the strongest pick first. Every element must be within ~150km of the stay. No stay, experience, or service may appear in more than one trip.

CANDIDATE STAYS:
${formatList(stays)}

CANDIDATE EXPERIENCES:
${formatList(experiences)}

CANDIDATE SERVICES:
${formatList(services)}

Return ONLY valid JSON — no explanation, no markdown, no code fences:

{
  "vibe": "<short evocative phrase, anchored to the place if visible text reveals one>",
  "detail": "<2-3 sentences on aesthetic qualities: light, texture, architecture, mood>",
  "tags": ["<3-5 lowercase tags like 'sun-baked', 'artisanal', 'coastal', 'village-center'>"],
  "region": "${region.id}",
  "place": "<specific place name from text in image, or null>",
  "trips": [
    {
      "concept": "<short evocative trip title — the idea of the day/week>",
      "blurb": "<2-3 sentences on the shape of this trip — what the traveler is doing, what they're feeling>",
      "persona": "<who this trip is for, 3-6 words — e.g. 'The slow-morning aesthete'>",
      "stayId": "<id from candidate stays>",
      "experienceIds": ["<strongest experience id>", "<second-best>", "<third>"],
      "serviceId": "<id from candidate services>",
      "reasoning": "<one sentence on why these elements belong together>"
    },
    { ...second trip... },
    { ...third trip... }
  ],
  "reasoning": "<one sentence on how the three trips differ from each other>"
}

Rules:
- Each trip's stayId, serviceId, and EVERY experienceId MUST be exact ids from the candidate lists.
- experienceIds is an ordered array of THREE distinct ids — strongest first.
- No stay, experience, or service id may appear in more than one trip (across all three trips, every experience id must be unique).
- The three trips should explore different facets of the image — not three variations of the same idea.
- Let the image drive the concept.`,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return res.status(500).json({error: 'Could not parse analysis', raw: text})

  const parsed = JSON.parse(jsonMatch[0])
  const analysis: AnalysisResult = {
    ...parsed,
    region: region.id,
    rankedStayIds: (parsed.trips || []).map((t: TripCuration) => t.stayId),
  }
  return res.status(200).json(analysis)
}
