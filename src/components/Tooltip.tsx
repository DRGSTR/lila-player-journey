'use client'

import React from 'react'
import { HoverTooltipInfo } from '@/types/telemetry'

interface TooltipProps {
  info: HoverTooltipInfo | null
}

export const Tooltip: React.FC<TooltipProps> = ({ info }) => {
  if (!info) return null

  // Ensure tooltip stays within viewport
  const left = Math.min(window.innerWidth - 240, info.x + 14)
  const top = Math.max(10, Math.min(window.innerHeight - 120, info.y - 40))

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="pointer-events-none fixed z-50 min-w-[200px] rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span className="font-mono font-semibold text-slate-100">{info.title}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
          {info.timeStr}
        </span>
      </div>

      <div className="mt-1.5 space-y-1">
        {info.subtitle && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                info.isBot ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
            />
            <span className="font-medium">{info.subtitle}</span>
          </div>
        )}
        {info.details && <p className="text-slate-400">{info.details}</p>}
      </div>
    </div>
  )
}
