// Precomputed 256-entry thermal color ramp LUT (Look-Up Table)
// Transparent -> Blue -> Cyan -> Green -> Yellow -> Orange -> Red
const thermalRamp: Uint8ClampedArray = new Uint8ClampedArray(256 * 4)

function initThermalRamp() {
  for (let i = 0; i < 256; i++) {
    const idx = i * 4
    const ratio = i / 255

    let r = 0
    let g = 0
    let b = 0

    if (ratio <= 0.2) {
      // 0.0 to 0.2: Transparent to Dark Blue / Indigo
      const t = ratio / 0.2
      r = 0
      g = Math.round(t * 80)
      b = Math.round(100 + t * 155)
    } else if (ratio <= 0.4) {
      // 0.2 to 0.4: Indigo to Cyan
      const t = (ratio - 0.2) / 0.2
      r = 0
      g = Math.round(80 + t * 175)
      b = 255
    } else if (ratio <= 0.6) {
      // 0.4 to 0.6: Cyan to Lime Green
      const t = (ratio - 0.4) / 0.2
      r = Math.round(t * 120)
      g = 255
      b = Math.round(255 * (1 - t))
    } else if (ratio <= 0.8) {
      // 0.6 to 0.8: Lime Green to Amber / Yellow
      const t = (ratio - 0.6) / 0.2
      r = Math.round(120 + t * 135)
      g = Math.round(255 - t * 50)
      b = 0
    } else {
      // 0.8 to 1.0: Yellow to Deep Red
      const t = (ratio - 0.8) / 0.2
      r = 255
      g = Math.round(205 * (1 - t))
      b = Math.round(40 * (1 - t))
    }

    thermalRamp[idx] = r
    thermalRamp[idx + 1] = g
    thermalRamp[idx + 2] = b
    thermalRamp[idx + 3] = i === 0 ? 0 : Math.min(255, Math.round(i * 1.5))
  }
}

initThermalRamp()

export interface HeatmapPoint {
  x: number
  y: number
  weight?: number
}

export function renderOffscreenHeatmap(
  points: [number, number][],
  radius: number = 22,
  intensity: number = 0.2
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || points.length === 0) return null

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Step 1: Draw radial falloffs using additive blending
  ctx.globalCompositeOperation = 'lighter'
  const r = Math.max(8, radius)

  // Create a cached template stamp for the radial gradient
  const stampCanvas = document.createElement('canvas')
  stampCanvas.width = r * 2
  stampCanvas.height = r * 2
  const stampCtx = stampCanvas.getContext('2d')
  if (stampCtx) {
    const grad = stampCtx.createRadialGradient(r, r, 0, r, r, r)
    grad.addColorStop(0, `rgba(0,0,0,${Math.min(1, intensity)})`)
    grad.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.4})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    stampCtx.fillStyle = grad
    stampCtx.beginPath()
    stampCtx.arc(r, r, r, 0, Math.PI * 2)
    stampCtx.fill()
  }

  // Draw each point with the precomputed stamp
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    ctx.drawImage(stampCanvas, pt[0] - r, pt[1] - r)
  }

  // Step 2: Colorize grayscale alpha map with thermal ramp
  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha > 0) {
      const lutIdx = alpha * 4
      data[i] = thermalRamp[lutIdx]
      data[i + 1] = thermalRamp[lutIdx + 1]
      data[i + 2] = thermalRamp[lutIdx + 2]
      data[i + 3] = Math.round(alpha * 0.85)
    }
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.putImageData(imgData, 0, 0)
  return canvas
}
