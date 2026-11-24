'use client'

import React from 'react'
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react'
import { formatTime } from '@/utils/formatters'

interface PlaybackBarProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onResetTime: () => void
  currentTime: number
  durationSec: number
  onSeek: (time: number) => void
  playbackSpeed: number
  onSpeedChange: (speed: number) => void
  trailMode: 'full' | 'tail'
  onToggleTrailMode: (mode: 'full' | 'tail') => void
  matchStats?: {
    humanCount: number
    botCount: number
    killCount: number
    eventCount: number
  }
}

const SPEED_OPTIONS = [1, 2, 5, 10, 20]

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  isPlaying,
  onTogglePlay,
  onResetTime,
  currentTime,
  durationSec,
  onSeek,
  playbackSpeed,
  onSpeedChange,
  trailMode,
  onToggleTrailMode,
  matchStats,
}) => {
  const progressPercent = durationSec > 0 ? (currentTime / durationSec) * 100 : 0

  return (
    <div className="flex h-16 w-full items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 shadow-2xl backdrop-blur-md">
      {/* Play/Pause & Reset Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetTime}
          title="Restart match playback (00:00)"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-transform active:scale-95 hover:bg-cyan-400"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>

        {/* Speed multiplier picker */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`rounded px-2 py-1 text-[11px] font-mono font-medium transition-colors ${
                playbackSpeed === speed
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrubber Slider */}
      <div className="flex flex-1 items-center gap-3 px-6">
        <span className="w-12 text-right font-mono text-xs font-semibold text-cyan-400">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex flex-1 items-center">
          <input
            type="range"
            min={0}
            max={Math.max(1, durationSec)}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #06b6d4 ${progressPercent}%, #1e293b ${progressPercent}%)`,
            }}
          />
        </div>

        <span className="w-12 font-mono text-xs text-slate-500">
          {formatTime(durationSec)}
        </span>
      </div>

      {/* Right controls: Trail Mode & Stats */}
      <div className="flex items-center gap-4">
        {/* Trail Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-0.5 text-xs">
          <button
            onClick={() => onToggleTrailMode('full')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              trailMode === 'full'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Full Path
          </button>
          <button
            onClick={() => onToggleTrailMode('tail')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              trailMode === 'tail'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            30s Tail
          </button>
        </div>

        {/* Quick Match Telemetry Pill */}
        {matchStats && (
          <div className="hidden items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-1 font-mono text-xs lg:flex">
            <span className="text-cyan-400">{matchStats.humanCount} Humans</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400">{matchStats.botCount} Bots</span>
            <span className="text-slate-600">/</span>
            <span className="text-red-400">{matchStats.killCount} Kills</span>
          </div>
        )}
      </div>
    </div>
  )
}
