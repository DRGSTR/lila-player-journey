'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  MatchPayload,
  FilterState,
  HoverTooltipInfo,
} from '@/types/telemetry'
import { formatTime, formatShortId } from '@/utils/formatters'

interface TelemetryCanvasProps {
  mapId: string
  matchData: MatchPayload | null
  currentTime: number
  filterState: FilterState
  onSelectPlayer: (playerId: string | null) => void
  offscreenHeatmap: HTMLCanvasElement | null
  zoom: number
  onZoomChange: (newZoom: number) => void
  setHoverInfo: (info: HoverTooltipInfo | null) => void
}

export const TelemetryCanvas: React.FC<TelemetryCanvasProps> = ({
  mapId,
  matchData,
  currentTime,
  filterState,
  onSelectPlayer,
  offscreenHeatmap,
  zoom,
  onZoomChange,
  setHoverInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapImageRef = useRef<HTMLImageElement | null>(null)

  // Pan state (screen coordinates)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Load minimap WebP image whenever mapId changes
  useEffect(() => {
    const img = new Image()
    img.src = `/minimaps/${mapId}.webp`
    img.onload = () => {
      mapImageRef.current = img
    }
  }, [mapId])

  // Center & fit map on initial load or map change
  const fitMapToContainer = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const padding = 20
    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - padding * 2
    const fitScale = Math.min(availableWidth / 1024, availableHeight / 1024)

    const initialZoom = Math.max(0.4, Math.min(1.5, fitScale))
    const initialPanX = (rect.width - 1024 * initialZoom) / 2
    const initialPanY = (rect.height - 1024 * initialZoom) / 2

    onZoomChange(initialZoom)
    setPan({ x: initialPanX, y: initialPanY })
  }, [onZoomChange])

  useEffect(() => {
    fitMapToContainer()
  }, [mapId, fitMapToContainer])

  // Coordinate transforms: Canonical 0-1024 World Space <-> Canvas Screen Pixels
  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        sx: pan.x + wx * zoom,
        sy: pan.y + wy * zoom,
      }
    },
    [pan, zoom]
  )

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        wx: (sx - pan.x) / zoom,
        wy: (sy - pan.y) / zoom,
      }
    },
    [pan, zoom]
  )

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top

    // Calculate world coordinate under cursor before zoom
    const worldBefore = screenToWorld(cursorX, cursorY)

    // Determine new zoom factor
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
    const newZoom = Math.max(0.3, Math.min(5.0, zoom * zoomFactor))

    // Recalculate pan so cursor stays over same world point
    const newPanX = cursorX - worldBefore.wx * newZoom
    const newPanY = cursorY - worldBefore.wy * newZoom

    onZoomChange(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }

  // Pan Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDraggingRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      return
    }

    // Hover Hit Testing for tooltip
    const rect = canvas.getBoundingClientRect()
    const mouseSx = e.clientX - rect.left
    const mouseSy = e.clientY - rect.top
    const mouseWorld = screenToWorld(mouseSx, mouseSy)

    const hitRadiusWorld = 14 / zoom

    // Check visible players first
    if (matchData && matchData.players) {
      for (const player of matchData.players) {
        if (!filterState.showHumans && !player.is_bot) continue
        if (!filterState.showBots && player.is_bot) continue

        const interp = getInterpolatedPosition(player.path, currentTime)
        if (!interp) continue

        const distSq = (interp.x - mouseWorld.wx) ** 2 + (interp.y - mouseWorld.wy) ** 2
        if (distSq <= hitRadiusWorld ** 2) {
          setHoverInfo({
            x: e.clientX,
            y: e.clientY,
            type: 'player',
            title: `Player #${formatShortId(player.id)}`,
            subtitle: player.is_bot ? 'Bot Entity' : 'Human Player',
            isBot: player.is_bot,
            timeStr: formatTime(currentTime),
            details: `World: (${interp.x.toFixed(1)}, ${interp.y.toFixed(1)}) • Click to isolate`,
          })
          return
        }
      }
    }

    // Check visible non-movement events
    if (matchData && matchData.events) {
      for (const ev of matchData.events) {
        if (ev.t > currentTime) continue

        // Check filter visibility
        const isPvP = ev.type === 'Kill' || ev.type === 'Killed'
        const isBotCombat = ev.type === 'BotKill' || ev.type === 'BotKilled'
        const isStorm = ev.type === 'KilledByStorm'
        const isLoot = ev.type === 'Loot'

        if (isPvP && !filterState.showPvP) continue
        if (isBotCombat && !filterState.showBotCombat) continue
        if (isStorm && !filterState.showStorm) continue
        if (isLoot && !filterState.showLoot) continue

        const distSq = (ev.px - mouseWorld.wx) ** 2 + (ev.py - mouseWorld.wy) ** 2
        if (distSq <= hitRadiusWorld ** 2) {
          setHoverInfo({
            x: e.clientX,
            y: e.clientY,
            type: 'event',
            title: ev.type,
            subtitle: `By #${formatShortId(ev.user_id)} (${ev.is_bot ? 'Bot' : 'Human'})`,
            isBot: ev.is_bot,
            timeStr: formatTime(ev.t),
            details: `Map Coordinates: (${ev.px.toFixed(1)}, ${ev.py.toFixed(1)})`,
          })
          return
        }
      }
    }

    // No hit
    setHoverInfo(null)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  // Click to Isolate Player
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !matchData) return

    const rect = canvas.getBoundingClientRect()
    const mouseSx = e.clientX - rect.left
    const mouseSy = e.clientY - rect.top
    const mouseWorld = screenToWorld(mouseSx, mouseSy)
    const hitRadiusWorld = 16 / zoom

    for (const player of matchData.players) {
      if (!filterState.showHumans && !player.is_bot) continue
      if (!filterState.showBots && player.is_bot) continue

      const interp = getInterpolatedPosition(player.path, currentTime)
      if (!interp) continue

      const distSq = (interp.x - mouseWorld.wx) ** 2 + (interp.y - mouseWorld.wy) ** 2
      if (distSq <= hitRadiusWorld ** 2) {
        if (filterState.isolatedPlayerId === player.id) {
          onSelectPlayer(null) // deselect
        } else {
          onSelectPlayer(player.id) // isolate
        }
        return
      }
    }
  }

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Dark grid pattern background
    ctx.fillStyle = '#080c14'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 1. Draw Background Minimap in Canonical 0-1024 Space
    const { sx: mapSx, sy: mapSy } = worldToScreen(0, 0)
    const mapSizeScreen = 1024 * zoom

    if (mapImageRef.current && mapImageRef.current.complete) {
      ctx.drawImage(mapImageRef.current, mapSx, mapSy, mapSizeScreen, mapSizeScreen)
    } else {
      ctx.fillStyle = '#111827'
      ctx.fillRect(mapSx, mapSy, mapSizeScreen, mapSizeScreen)
    }

    // Minimap border
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.strokeRect(mapSx, mapSy, mapSizeScreen, mapSizeScreen)

    // 2. Draw Heatmap Overlay (if enabled)
    const isAnyHeatmapEnabled = Object.values(filterState.heatmapLayers).some(Boolean)
    if (isAnyHeatmapEnabled && offscreenHeatmap) {
      ctx.save()
      ctx.globalAlpha = filterState.heatmapOpacity
      ctx.drawImage(offscreenHeatmap, mapSx, mapSy, mapSizeScreen, mapSizeScreen)
      ctx.restore()
    }

    // 3. Draw Player Trajectories and Animated Markers
    if (matchData && matchData.players) {
      const isolatedId = filterState.isolatedPlayerId

      for (const player of matchData.players) {
        const isBot = player.is_bot
        if (!filterState.showHumans && !isBot) continue
        if (!filterState.showBots && isBot) continue

        const isIsolated = isolatedId === player.id
        const isDimmed = isolatedId !== null && !isIsolated

        ctx.save()
        if (isDimmed) {
          ctx.globalAlpha = 0.12
        }

        // Draw Player Path
        drawPlayerPath(ctx, player, currentTime, filterState.trailMode, worldToScreen, zoom, isIsolated)

        // Draw Player Head Dot (current interpolated position)
        const currentPos = getInterpolatedPosition(player.path, currentTime)
        if (currentPos) {
          const { sx, sy } = worldToScreen(currentPos.x, currentPos.y)
          drawPlayerMarker(ctx, sx, sy, isBot, isIsolated, zoom)
        }

        ctx.restore()
      }
    }

    // 4. Draw Event Markers up to currentTime
    if (matchData && matchData.events) {
      for (const ev of matchData.events) {
        if (ev.t > currentTime) continue

        const isPvP = ev.type === 'Kill' || ev.type === 'Killed'
        const isBotCombat = ev.type === 'BotKill' || ev.type === 'BotKilled'
        const isStorm = ev.type === 'KilledByStorm'
        const isLoot = ev.type === 'Loot'

        if (isPvP && !filterState.showPvP) continue
        if (isBotCombat && !filterState.showBotCombat) continue
        if (isStorm && !filterState.showStorm) continue
        if (isLoot && !filterState.showLoot) continue

        const { sx, sy } = worldToScreen(ev.px, ev.py)

        // Event Pulse Ring if occurred within the last 2.5 seconds
        const ageSec = currentTime - ev.t
        if (ageSec >= 0 && ageSec <= 2.5) {
          const pulseRatio = ageSec / 2.5
          const ringRadius = (8 + pulseRatio * 20) * Math.min(1.5, Math.max(0.7, zoom))
          const ringAlpha = (1 - pulseRatio) * 0.9

          ctx.save()
          ctx.beginPath()
          ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = getEventColor(ev.type, ringAlpha)
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.restore()
        }

        // Draw Event Icon
        drawEventMarker(ctx, sx, sy, ev.type, zoom)
      }
    }

    ctx.restore()
  }, [
    mapId,
    matchData,
    currentTime,
    filterState,
    zoom,
    pan,
    worldToScreen,
    offscreenHeatmap,
  ])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}

// Linear Interpolation helper between path points
function getInterpolatedPosition(
  path: [number, number, number][],
  currentTime: number
): { x: number; y: number } | null {
  if (!path || path.length === 0) return null

  // If match time is before player first point
  if (currentTime <= path[0][0]) {
    return { x: path[0][1], y: path[0][2] }
  }

  // If match time is after player last point
  const lastPoint = path[path.length - 1]
  if (currentTime >= lastPoint[0]) {
    return { x: lastPoint[1], y: lastPoint[2] }
  }

  // Binary search for surrounding points
  let low = 0
  let high = path.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (path[mid][0] === currentTime) {
      return { x: path[mid][1], y: path[mid][2] }
    } else if (path[mid][0] < currentTime) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const p1 = path[high]
  const p2 = path[low]
  if (!p1 || !p2) return null

  const tSpan = p2[0] - p1[0]
  if (tSpan <= 0) return { x: p1[1], y: p1[2] }

  const ratio = (currentTime - p1[0]) / tSpan
  return {
    x: p1[1] + (p2[1] - p1[1]) * ratio,
    y: p1[2] + (p2[2] - p1[2]) * ratio,
  }
}

// Draw Trajectory Polylines with Trail Mode & Gradient Fading
function drawPlayerPath(
  ctx: CanvasRenderingContext2D,
  player: { is_bot: boolean; path: [number, number, number][] },
  currentTime: number,
  trailMode: 'full' | 'tail',
  worldToScreen: (wx: number, wy: number) => { sx: number; sy: number },
  zoom: number,
  isIsolated: boolean
) {
  const path = player.path
  if (!path || path.length === 0) return

  const startTime = trailMode === 'tail' ? Math.max(0, currentTime - 30) : 0
  const visiblePoints: { sx: number; sy: number; t: number }[] = []

  for (let i = 0; i < path.length; i++) {
    const pt = path[i]
    if (pt[0] > currentTime) {
      // Add interpolated tip point
      const interp = getInterpolatedPosition(path, currentTime)
      if (interp) {
        const { sx, sy } = worldToScreen(interp.x, interp.y)
        visiblePoints.push({ sx, sy, t: currentTime })
      }
      break
    }
    if (pt[0] >= startTime) {
      const { sx, sy } = worldToScreen(pt[1], pt[2])
      visiblePoints.push({ sx, sy, t: pt[0] })
    }
  }

  if (visiblePoints.length < 2) return

  ctx.beginPath()
  ctx.moveTo(visiblePoints[0].sx, visiblePoints[0].sy)
  for (let i = 1; i < visiblePoints.length; i++) {
    ctx.lineTo(visiblePoints[i].sx, visiblePoints[i].sy)
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (player.is_bot) {
    // Bot: Muted amber/slate dashed line
    ctx.strokeStyle = isIsolated ? '#fbbf24' : '#d97706'
    ctx.lineWidth = Math.max(1.2, (isIsolated ? 2.5 : 1.6) * Math.min(1.4, zoom))
    ctx.setLineDash([4 * zoom, 4 * zoom])
  } else {
    // Human: Bright cyan solid line
    ctx.strokeStyle = isIsolated ? '#22d3ee' : '#06b6d4'
    ctx.lineWidth = Math.max(1.5, (isIsolated ? 3.2 : 2.2) * Math.min(1.4, zoom))
    ctx.setLineDash([])
  }

  ctx.stroke()
  ctx.setLineDash([])
}

// Draw Player Current Position Marker
function drawPlayerMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  isBot: boolean,
  isIsolated: boolean,
  zoom: number
) {
  const baseRadius = isIsolated ? 7.5 : 5.5
  const r = baseRadius * Math.min(1.5, Math.max(0.7, zoom))

  ctx.save()
  if (isBot) {
    // Bot: Amber diamond marker
    ctx.beginPath()
    ctx.moveTo(sx, sy - r)
    ctx.lineTo(sx + r, sy)
    ctx.lineTo(sx, sy + r)
    ctx.lineTo(sx - r, sy)
    ctx.closePath()
    ctx.fillStyle = isIsolated ? '#fbbf24' : '#f59e0b'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 1.5
    ctx.stroke()
  } else {
    // Human: Cyan circle with crisp white outline
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = isIsolated ? '#38bdf8' : '#06b6d4'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.8
    ctx.stroke()
  }
  ctx.restore()
}

// Draw Event Marker Icons
function drawEventMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  type: string,
  zoom: number
) {
  const r = 5.5 * Math.min(1.5, Math.max(0.7, zoom))
  ctx.save()

  switch (type) {
    case 'Kill':
    case 'Killed':
      // Red Crosshair
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.2
      ctx.stroke()
      // Cross lines
      ctx.beginPath()
      ctx.moveTo(sx - r - 2, sy)
      ctx.lineTo(sx + r + 2, sy)
      ctx.moveTo(sx, sy - r - 2)
      ctx.lineTo(sx, sy + r + 2)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.2
      ctx.stroke()
      break

    case 'BotKill':
    case 'BotKilled':
      // Orange Circle
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = '#f97316'
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.2
      ctx.stroke()
      break

    case 'KilledByStorm':
      // Magenta / Purple Hexagon
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const hx = sx + (r + 1) * Math.cos(angle)
        const hy = sy + (r + 1) * Math.sin(angle)
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fillStyle = '#a855f7'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.2
      ctx.stroke()
      break

    case 'Loot':
      // Gold Diamond
      ctx.beginPath()
      ctx.moveTo(sx, sy - r)
      ctx.lineTo(sx + r, sy)
      ctx.lineTo(sx, sy + r)
      ctx.lineTo(sx - r, sy)
      ctx.closePath()
      ctx.fillStyle = '#eab308'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.2
      ctx.stroke()
      break

    default:
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = '#94a3b8'
      ctx.fill()
      break
  }

  ctx.restore()
}

function getEventColor(type: string, alpha: number): string {
  switch (type) {
    case 'Kill':
    case 'Killed':
      return `rgba(239, 68, 68, ${alpha})`
    case 'BotKill':
    case 'BotKilled':
      return `rgba(249, 115, 22, ${alpha})`
    case 'KilledByStorm':
      return `rgba(168, 85, 247, ${alpha})`
    case 'Loot':
      return `rgba(234, 179, 8, ${alpha})`
    default:
      return `rgba(148, 163, 184, ${alpha})`
  }
}
