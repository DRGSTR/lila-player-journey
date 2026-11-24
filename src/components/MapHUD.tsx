'use client'

import React, { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, HelpCircle, X, UserX } from 'lucide-react'

interface MapHUDProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  isolatedPlayerId: string | null
  onClearIsolation: () => void
}

export const MapHUD: React.FC<MapHUDProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isolatedPlayerId,
  onClearIsolation,
}) => {
  const [showLegend, setShowLegend] = useState(false)

  return (
    <div className="absolute right-4 top-4 z-30 flex flex-col items-end gap-2">
      {/* Isolated Player Pill */}
      {isolatedPlayerId && (
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/50 bg-slate-900/90 py-1 pl-3 pr-1.5 shadow-lg backdrop-blur-md">
          <span className="text-xs text-slate-300">
            Isolating: <strong className="font-mono text-cyan-400">{isolatedPlayerId.slice(0, 8)}</strong>
          </span>
          <button
            onClick={onClearIsolation}
            className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/30"
          >
            <UserX className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      {/* Main HUD Toolbar */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/90 p-1 shadow-xl backdrop-blur-md">
        <span className="px-2 font-mono text-[11px] font-semibold text-slate-400">
          {(zoom * 100).toFixed(0)}%
        </span>
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={onResetZoom}
          title="Reset View (1:1)"
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-4 w-[1px] bg-slate-700" />
        <button
          onClick={() => setShowLegend(!showLegend)}
          title="Toggle Legend"
          className={`rounded p-1.5 transition-colors ${
            showLegend ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Legend Popover */}
      {showLegend && (
        <div className="w-64 rounded-lg border border-slate-700/80 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-200">Map & Marker Legend</span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Trajectories
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-4 rounded bg-cyan-400" />
                  <span className="text-slate-300">Human (Solid Cyan)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-4 border-b-2 border-dashed border-amber-400" />
                  <span className="text-slate-300">Bot (Dashed Amber)</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Event Markers
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <span className="text-slate-300">PvP Kill</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                  <span className="text-slate-300">Bot Kill</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                  <span className="text-slate-300">Storm Death</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50" />
                  <span className="text-slate-300">Loot Pick</span>
                </div>
              </div>
            </div>

            <div className="rounded bg-slate-800/60 p-1.5 text-[10px] text-slate-400">
              💡 <strong>Tip:</strong> Click any player marker or path to isolate their journey. Scroll to zoom, drag to pan.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
