'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Manifest,
  ManifestMatch,
  MatchPayload,
  HeatmapPayload,
  FilterState,
  HoverTooltipInfo,
} from '@/types/telemetry'
import { Sidebar } from '@/components/Sidebar'
import { TelemetryCanvas } from '@/components/TelemetryCanvas'
import { PlaybackBar } from '@/components/PlaybackBar'
import { MapHUD } from '@/components/MapHUD'
import { Tooltip } from '@/components/Tooltip'
import { renderOffscreenHeatmap } from '@/utils/heatmapRenderer'

export default function TelemetryDashboard() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [matchData, setMatchData] = useState<MatchPayload | null>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapPayload | null>(null)
  const [isLoadingMatch, setIsLoadingMatch] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filter & UI State
  const [filterState, setFilterState] = useState<FilterState>({
    selectedMap: 'AmbroseValley',
    selectedDate: 'all',
    selectedMatchId: '',
    showHumans: true,
    showBots: true,
    showPvP: true,
    showBotCombat: true,
    showStorm: true,
    showLoot: true,
    trailMode: 'full',
    isolatedPlayerId: null,
    heatmapLayers: {
      humanTraffic: false,
      botTraffic: false,
      killZones: false,
      deathZones: false,
      stormDeaths: false,
      lootHotspots: false,
    },
    heatmapOpacity: 0.65,
    heatmapRadius: 22,
  })

  // Playback State
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(2)
  const [zoom, setZoom] = useState(1.0)
  const [hoverInfo, setHoverInfo] = useState<HoverTooltipInfo | null>(null)

  // 1. Fetch Manifest on Mount
  useEffect(() => {
    fetch('/data/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading manifest.json`)
        return res.json()
      })
      .then((data: Manifest) => {
        setManifest(data)
        // Auto-select first map and its busiest match
        if (data.matches.length > 0) {
          const firstMap = data.maps[0] || 'AmbroseValley'
          const busiestMatch = data.matches.find((m) => m.map_id === firstMap) || data.matches[0]
          setFilterState((prev) => ({
            ...prev,
            selectedMap: firstMap,
            selectedMatchId: busiestMatch.match_id,
          }))
        }
      })
      .catch((err) => {
        console.error('Failed to load manifest:', err)
        setErrorMsg('Failed to load match manifest from /data/manifest.json')
      })
  }, [])

  // 2. Fetch Selected Match JSON
  useEffect(() => {
    if (!filterState.selectedMatchId) return
    setIsLoadingMatch(true)
    setErrorMsg(null)

    fetch(`/data/matches/${filterState.selectedMatchId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading match ${filterState.selectedMatchId}`)
        return res.json()
      })
      .then((data: MatchPayload) => {
        setMatchData(data)
        setCurrentTime(0)
        setIsPlaying(false)
        setIsLoadingMatch(false)
      })
      .catch((err) => {
        console.error('Failed to load match JSON:', err)
        setErrorMsg(`Failed to load match data for ${filterState.selectedMatchId}`)
        setIsLoadingMatch(false)
      })
  }, [filterState.selectedMatchId])

  // 3. Fetch Heatmap JSON for Selected Map
  useEffect(() => {
    if (!filterState.selectedMap) return

    fetch(`/data/heatmaps/${filterState.selectedMap}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading heatmaps for ${filterState.selectedMap}`)
        return res.json()
      })
      .then((data: HeatmapPayload) => {
        setHeatmapData(data)
      })
      .catch((err) => {
        console.error('Failed to load heatmap JSON:', err)
      })
  }, [filterState.selectedMap])

  // 4. Playback Animation Loop via requestAnimationFrame with delta-time
  const durationSec = matchData?.duration_sec || 0

  useEffect(() => {
    if (!isPlaying) return
    let animId: number
    let lastTime = performance.now()

    const loop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000
      lastTime = now

      setCurrentTime((prev) => {
        const next = prev + deltaSec * playbackSpeed
        if (next >= durationSec) {
          setIsPlaying(false)
          return durationSec
        }
        return next
      })

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, playbackSpeed, durationSec])

  // Spacebar hotkey to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 5. Precompute Offscreen Heatmap Canvas when layer toggles, radius, or date change
  const offscreenHeatmap = useMemo(() => {
    if (!heatmapData) return null

    const layers = filterState.heatmapLayers
    const isAnyActive = Object.values(layers).some(Boolean)
    if (!isAnyActive) return null

    const targetDates =
      filterState.selectedDate === 'all'
        ? Object.keys(heatmapData)
        : [filterState.selectedDate]

    const aggregatedPoints: [number, number][] = []

    for (const d of targetDates) {
      const dayData = heatmapData[d]
      if (!dayData) continue

      if (layers.humanTraffic && dayData.human_traffic) {
        aggregatedPoints.push(...dayData.human_traffic)
      }
      if (layers.botTraffic && dayData.bot_traffic) {
        aggregatedPoints.push(...dayData.bot_traffic)
      }
      if (layers.killZones && dayData.kills) {
        aggregatedPoints.push(...dayData.kills)
      }
      if (layers.deathZones && dayData.deaths) {
        aggregatedPoints.push(...dayData.deaths)
      }
      if (layers.stormDeaths && dayData.storm) {
        aggregatedPoints.push(...dayData.storm)
      }
      if (layers.lootHotspots && dayData.loot) {
        aggregatedPoints.push(...dayData.loot)
      }
    }

    if (aggregatedPoints.length === 0) return null

    return renderOffscreenHeatmap(aggregatedPoints, filterState.heatmapRadius, 0.22)
  }, [heatmapData, filterState.heatmapLayers, filterState.selectedDate, filterState.heatmapRadius])

  // Current active match metadata
  const currentMatchMeta = useMemo(() => {
    if (!manifest) return null
    return manifest.matches.find((m) => m.match_id === filterState.selectedMatchId) || null
  }, [manifest, filterState.selectedMatchId])

  // Unique dates from manifest
  const availableDates = useMemo(() => {
    if (!manifest) return []
    const set = new Set(manifest.matches.map((m) => m.date))
    return Array.from(set).sort()
  }, [manifest])

  // Filter change helper
  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }))
  }

  // Zoom helpers
  const handleZoomIn = () => setZoom((prev) => Math.min(5.0, prev * 1.25))
  const handleZoomOut = () => setZoom((prev) => Math.max(0.3, prev * 0.8))
  const handleResetZoom = () => setZoom(1.0)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* 1. Left Sidebar Panel */}
      <Sidebar
        maps={manifest?.maps || ['AmbroseValley', 'GrandRift', 'Lockdown']}
        matches={manifest?.matches || []}
        dates={availableDates}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        currentMatch={currentMatchMeta}
        onSelectMatch={(mid) => handleFilterChange({ selectedMatchId: mid, isolatedPlayerId: null })}
      />

      {/* 2. Main Viewport & Playback Bar */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Canvas Area */}
        <div className="relative flex-1">
          <TelemetryCanvas
            mapId={filterState.selectedMap}
            matchData={matchData}
            currentTime={currentTime}
            filterState={filterState}
            onSelectPlayer={(pid) => handleFilterChange({ isolatedPlayerId: pid })}
            offscreenHeatmap={offscreenHeatmap}
            zoom={zoom}
            onZoomChange={setZoom}
            setHoverInfo={setHoverInfo}
          />

          {/* Floating Top-Right Map HUD */}
          <MapHUD
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            isolatedPlayerId={filterState.isolatedPlayerId}
            onClearIsolation={() => handleFilterChange({ isolatedPlayerId: null })}
          />

          {/* Loading / Error Banners */}
          {isLoadingMatch && (
            <div className="pointer-events-none absolute left-6 top-6 z-30 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-900/90 px-3.5 py-2 shadow-xl backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              <span className="font-mono text-xs text-cyan-300">Loading match telemetry...</span>
            </div>
          )}

          {errorMsg && (
            <div className="absolute left-6 top-6 z-30 rounded-lg border border-red-500/50 bg-red-950/90 px-4 py-2 text-xs text-red-200 shadow-xl backdrop-blur-md">
              {errorMsg}
            </div>
          )}

          {/* Floating Hit Tooltip */}
          <Tooltip info={hoverInfo} />
        </div>

        {/* Bottom Playback Bar */}
        <PlaybackBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onResetTime={() => {
            setCurrentTime(0)
            setIsPlaying(false)
          }}
          currentTime={currentTime}
          durationSec={durationSec}
          onSeek={(t) => setCurrentTime(t)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          trailMode={filterState.trailMode}
          onToggleTrailMode={(mode) => handleFilterChange({ trailMode: mode })}
          matchStats={
            currentMatchMeta
              ? {
                  humanCount: currentMatchMeta.human_count,
                  botCount: currentMatchMeta.bot_count,
                  killCount: currentMatchMeta.kill_count,
                  eventCount: currentMatchMeta.event_count,
                }
              : undefined
          }
        />
      </main>
    </div>
  )
}
