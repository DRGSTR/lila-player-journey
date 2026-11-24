export interface ManifestMatch {
  match_id: string
  map_id: string
  date: string
  human_count: number
  bot_count: number
  event_count: number
  duration_sec: number
  kill_count: number
  death_count: number
  storm_deaths: number
}

export interface Manifest {
  maps: string[]
  matches: ManifestMatch[]
}

export interface PlayerTrajectory {
  id: string
  is_bot: boolean
  path: [number, number, number][] // [t_sec, px, py]
}

export interface NonMovementEvent {
  t: number
  px: number
  py: number
  type: 'Kill' | 'Killed' | 'BotKill' | 'BotKilled' | 'KilledByStorm' | 'Loot' | string
  user_id: string
  is_bot: boolean
}

export interface MatchPayload {
  match_id: string
  map_id: string
  date: string
  duration_sec: number
  players: PlayerTrajectory[]
  events: NonMovementEvent[]
}

export interface HeatmapDayData {
  human_traffic: [number, number][]
  bot_traffic: [number, number][]
  kills: [number, number][]
  deaths: [number, number][]
  storm: [number, number][]
  loot: [number, number][]
}

export type HeatmapPayload = Record<string, HeatmapDayData>

export interface FilterState {
  selectedMap: string
  selectedDate: string // 'all' or '2026-02-10' .. '2026-02-14'
  selectedMatchId: string
  showHumans: boolean
  showBots: boolean
  showPvP: boolean
  showBotCombat: boolean
  showStorm: boolean
  showLoot: boolean
  trailMode: 'full' | 'tail'
  isolatedPlayerId: string | null
  heatmapLayers: {
    humanTraffic: boolean
    botTraffic: boolean
    killZones: boolean
    deathZones: boolean
    stormDeaths: boolean
    lootHotspots: boolean
  }
  heatmapOpacity: number
  heatmapRadius: number
}

export interface HoverTooltipInfo {
  x: number // screen clientX
  y: number // screen clientY
  title: string
  type: 'player' | 'event'
  subtitle?: string
  timeStr: string
  details?: string
  isBot?: boolean
}
