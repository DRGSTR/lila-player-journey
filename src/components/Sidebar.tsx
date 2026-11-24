'use client'

import React, { useState } from 'react'
import {
  Map,
  Calendar,
  Layers,
  Flame,
  Users,
  Target,
  Crosshair,
  CloudLightning,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react'
import { ManifestMatch, FilterState } from '@/types/telemetry'
import { formatTime, formatShortId } from '@/utils/formatters'

interface SidebarProps {
  maps: string[]
  matches: ManifestMatch[]
  dates: string[]
  filterState: FilterState
  onFilterChange: (updates: Partial<FilterState>) => void
  currentMatch: ManifestMatch | null
  onSelectMatch: (matchId: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  maps,
  matches,
  dates,
  filterState,
  onFilterChange,
  currentMatch,
  onSelectMatch,
}) => {
  const [matchSearch, setMatchSearch] = useState('')
  const [isMatchListOpen, setIsMatchListOpen] = useState(false)

  // Filter matches based on selected map and date
  const filteredMatches = matches.filter((m) => {
    if (m.map_id !== filterState.selectedMap) return false
    if (filterState.selectedDate !== 'all' && m.date !== filterState.selectedDate) return false
    if (matchSearch) {
      return m.match_id.toLowerCase().includes(matchSearch.toLowerCase())
    }
    return true
  })

  // Quick "Humans Only" toggle handler
  const isHumansOnly = filterState.showHumans && !filterState.showBots
  const handleToggleHumansOnly = () => {
    if (isHumansOnly) {
      // Revert to showing both
      onFilterChange({ showHumans: true, showBots: true })
    } else {
      // Activate Humans Only
      onFilterChange({ showHumans: true, showBots: false })
    }
  }

  // Map Change handler: auto-picks the busiest match for that map
  const handleMapChange = (mapId: string) => {
    // Find busiest match for the new map
    const candidates = matches.filter((m) => m.map_id === mapId)
    const busiest = candidates.length > 0 ? candidates[0] : null
    onFilterChange({
      selectedMap: mapId,
      selectedMatchId: busiest ? busiest.match_id : filterState.selectedMatchId,
      isolatedPlayerId: null,
    })
  }

  return (
    <aside className="flex h-full w-[310px] flex-col border-r border-slate-800 bg-slate-950/95 text-slate-200">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/80 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-sm">
            L
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              LILA BLACK
            </h1>
            <p className="text-[10px] font-medium text-cyan-400/90">Level Design Telemetry</p>
          </div>
        </div>
        <div className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
          v1.0
        </div>
      </div>

      {/* Scrollable Configuration Sections */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Map & Date Selectors */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Map className="h-3.5 w-3.5 text-cyan-400" />
            Active Map
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {maps.map((mapId) => (
              <button
                key={mapId}
                onClick={() => handleMapChange(mapId)}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                  filterState.selectedMap === mapId
                    ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {mapId === 'AmbroseValley' ? 'Ambrose' : mapId === 'GrandRift' ? 'Grand Rift' : 'Lockdown'}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              Date Filter
            </label>
            <select
              value={filterState.selectedDate}
              onChange={(e) => onFilterChange({ selectedDate: e.target.value })}
              className="w-full rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Dates (Feb 10 - 14, 2026)</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Match Selector Dropdown/List */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Selected Match
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {filteredMatches.length} available
            </span>
          </div>

          {currentMatch ? (
            <div
              onClick={() => setIsMatchListOpen(!isMatchListOpen)}
              className="flex cursor-pointer items-center justify-between rounded-md border border-slate-700/60 bg-slate-950/80 px-2.5 py-2 hover:border-slate-600 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    #{formatShortId(currentMatch.match_id)}
                  </span>
                  <span className="text-[10px] text-slate-400">{currentMatch.date}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>⏱ {formatTime(currentMatch.duration_sec)}</span>
                  <span>•</span>
                  <span className="text-cyan-300">{currentMatch.human_count}H</span>
                  <span>/</span>
                  <span className="text-amber-300">{currentMatch.bot_count}B</span>
                  <span>•</span>
                  <span className="text-red-400">{currentMatch.kill_count} Kills</span>
                </div>
              </div>
              {isMatchListOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-1">No matches for current filter</div>
          )}

          {/* Collapsible Match Search & List */}
          {isMatchListOpen && (
            <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search match ID..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  className="w-full rounded bg-slate-950 pl-8 pr-2 py-1 text-xs text-slate-200 border border-slate-800 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredMatches.slice(0, 50).map((m) => (
                  <button
                    key={m.match_id}
                    onClick={() => {
                      onSelectMatch(m.match_id)
                      setIsMatchListOpen(false)
                    }}
                    className={`w-full text-left rounded p-1.5 text-xs transition-colors flex items-center justify-between ${
                      filterState.selectedMatchId === m.match_id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-medium">#{formatShortId(m.match_id)}</div>
                      <div className="text-[10px] text-slate-400">
                        {m.human_count}H · {m.bot_count}B · {m.kill_count}K
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatTime(m.duration_sec)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Visibility Controls & Quick Humans-Only Button */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              Entities & Paths
            </label>
            <button
              onClick={handleToggleHumansOnly}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${
                isHumansOnly
                  ? 'border border-cyan-400 bg-cyan-400 text-slate-950 shadow-sm'
                  : 'border border-slate-700 bg-slate-900 text-cyan-400 hover:border-cyan-500'
              }`}
            >
              {isHumansOnly ? '✓ Humans Only' : 'Humans Only'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/40 p-2 text-xs hover:bg-slate-900/70">
              <input
                type="checkbox"
                checked={filterState.showHumans}
                onChange={(e) => onFilterChange({ showHumans: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300 font-medium">Humans</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/40 p-2 text-xs hover:bg-slate-900/70">
              <input
                type="checkbox"
                checked={filterState.showBots}
                onChange={(e) => onFilterChange({ showBots: e.target.checked })}
                className="rounded accent-amber-500"
              />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-slate-300 font-medium">Bots</span>
            </label>
          </div>
        </div>

        {/* 4. Event Markers Toggles */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Target className="h-3.5 w-3.5 text-cyan-400" />
            Event Markers
          </label>

          <div className="space-y-1">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/30 px-2.5 py-1.5 text-xs hover:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-slate-300">PvP Kills & Deaths</span>
              </div>
              <input
                type="checkbox"
                checked={filterState.showPvP}
                onChange={(e) => onFilterChange({ showPvP: e.target.checked })}
                className="rounded accent-red-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/30 px-2.5 py-1.5 text-xs hover:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-300">Bot Kills & Deaths</span>
              </div>
              <input
                type="checkbox"
                checked={filterState.showBotCombat}
                onChange={(e) => onFilterChange({ showBotCombat: e.target.checked })}
                className="rounded accent-orange-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/30 px-2.5 py-1.5 text-xs hover:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-300">Storm Deaths</span>
              </div>
              <input
                type="checkbox"
                checked={filterState.showStorm}
                onChange={(e) => onFilterChange({ showStorm: e.target.checked })}
                className="rounded accent-purple-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/30 px-2.5 py-1.5 text-xs hover:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="text-slate-300">Loot Pickups</span>
              </div>
              <input
                type="checkbox"
                checked={filterState.showLoot}
                onChange={(e) => onFilterChange({ showLoot: e.target.checked })}
                className="rounded accent-yellow-400"
              />
            </label>
          </div>
        </div>

        {/* 5. Heatmap Overlays (Map-Wide, respects Date Filter) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              Spatial Heatmaps
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Additive</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.humanTraffic}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, humanTraffic: e.target.checked },
                  })
                }
                className="accent-cyan-500 rounded"
              />
              <span className="text-slate-300 truncate">Human Traffic</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.botTraffic}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, botTraffic: e.target.checked },
                  })
                }
                className="accent-amber-500 rounded"
              />
              <span className="text-slate-300 truncate">Bot Traffic</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.killZones}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, killZones: e.target.checked },
                  })
                }
                className="accent-red-500 rounded"
              />
              <span className="text-slate-300 truncate">Kill Zones</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.deathZones}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, deathZones: e.target.checked },
                  })
                }
                className="accent-red-500 rounded"
              />
              <span className="text-slate-300 truncate">Death Zones</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.stormDeaths}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, stormDeaths: e.target.checked },
                  })
                }
                className="accent-purple-500 rounded"
              />
              <span className="text-slate-300 truncate">Storm Deaths</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-800/60 bg-slate-950/60 p-1.5">
              <input
                type="checkbox"
                checked={filterState.heatmapLayers.lootHotspots}
                onChange={(e) =>
                  onFilterChange({
                    heatmapLayers: { ...filterState.heatmapLayers, lootHotspots: e.target.checked },
                  })
                }
                className="accent-yellow-500 rounded"
              />
              <span className="text-slate-300 truncate">Loot Spots</span>
            </label>
          </div>

          {/* Sliders: Opacity & Radius */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(filterState.heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={filterState.heatmapOpacity}
                onChange={(e) => onFilterChange({ heatmapOpacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded accent-orange-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Radius / Falloff</span>
                <span className="font-mono">{filterState.heatmapRadius}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={filterState.heatmapRadius}
                onChange={(e) => onFilterChange({ heatmapRadius: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded accent-orange-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
