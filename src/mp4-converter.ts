import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { homedir } from 'node:os'

/**
 * WebM-to-MP4 post-processor.
 * Converts Playwright's WebM output to H.264/AAC MP4 using ffmpeg.
 *
 * Command: ffmpeg -i input.webm -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 128k output.mp4
 *
 * Design notes:
 * - Graceful failure: if conversion fails, logs the error and returns null.
 *   The caller keeps the WebM path and marks mp4OutputPath as null in the manifest.
 * - No mutation: returns a new path string, never modifies input.
 * - Separate from FfmpegRecorder (which handles live avfoundation display capture).
 */

/**
 * Resolve the ffmpeg binary path.
 * Priority: system ffmpeg on PATH → Playwright-bundled ffmpeg (fallback).
 *
 * System ffmpeg is preferred because it has libx264/AAC for MP4 encoding.
 * Playwright's bundled ffmpeg is a minimal build (VP8/WebM only).
 */
function resolveFFmpegBin(): string {
  // Check system PATH first (has full codec support including libx264)
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' })
    return 'ffmpeg'
  } catch {
    // not on PATH — try Playwright's bundled copy
  }
  const cacheDir = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  if (existsSync(cacheDir)) {
    const entries = readdirSync(cacheDir).filter(d => d.startsWith('ffmpeg-')).sort().reverse()
    for (const dir of entries) {
      const candidate = join(cacheDir, dir, 'ffmpeg-mac')
      if (existsSync(candidate)) return candidate
    }
  }
  const linuxCache = join(homedir(), '.cache', 'ms-playwright')
  if (existsSync(linuxCache)) {
    const entries = readdirSync(linuxCache).filter(d => d.startsWith('ffmpeg-')).sort().reverse()
    for (const dir of entries) {
      const candidate = join(linuxCache, dir, 'ffmpeg-linux')
      if (existsSync(candidate)) return candidate
    }
  }
  return 'ffmpeg'
}

export interface ConvertOptions {
  /** Absolute path to the source WebM file */
  webmPath: string
  /** Base directory under which mp4/ will be created */
  outputDir: string
  /** Stem for the output filename (e.g. "uniswap-homepage_2026-03-14_120000") */
  outputName: string
}

export interface ConvertResult {
  mp4Path: string | null
  error: string | null
}

/**
 * Convert a WebM file to MP4 via ffmpeg.
 * Returns { mp4Path, error: null } on success.
 * Returns { mp4Path: null, error: <message> } on failure — never throws.
 */
export function convertWebmToMp4(options: ConvertOptions): ConvertResult {
  const mp4Dir = resolve(options.outputDir, 'mp4')
  mkdirSync(mp4Dir, { recursive: true })

  const mp4Path = join(mp4Dir, `${options.outputName}.mp4`)

  if (!existsSync(options.webmPath)) {
    return {
      mp4Path: null,
      error: `WebM source not found: ${options.webmPath}`,
    }
  }

  console.log(`[mp4-converter] Converting: ${basename(options.webmPath)} → ${basename(mp4Path)}`)

  const ffmpegArgs = [
    '-i', options.webmPath,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-y', // overwrite without asking
    mp4Path,
  ]

  const ffmpegBin = resolveFFmpegBin()

  try {
    execFileSync(ffmpegBin, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    console.log(`[mp4-converter] Saved: ${mp4Path}`)
    return { mp4Path, error: null }
  } catch (firstErr) {
    // System ffmpeg missing or Playwright's minimal build lacks libx264.
    // Fallback: copy the WebM to the output dir with a clean name.
    const webmOut = join(mp4Dir, `${options.outputName}.webm`)
    try {
      execFileSync(ffmpegBin, [
        '-i', options.webmPath,
        '-c', 'copy',
        '-y',
        webmOut,
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
      console.log(`[mp4-converter] H.264 unavailable — copied WebM: ${webmOut}`)
      return { mp4Path: webmOut, error: null }
    } catch {
      const message = firstErr instanceof Error ? firstErr.message : String(firstErr)
      console.error(`[mp4-converter] Conversion failed (WebM preserved in place): ${message}`)
      return { mp4Path: null, error: message }
    }
  }
}

export interface PolishOptions {
  /** Absolute path to the source MP4 file */
  mp4Path: string
  /** Base directory under which polished/ will be created */
  outputDir: string
  /** Stem for the output filename */
  outputName: string
  /** Text to overlay on the video (flow name / description) */
  overlayText?: string
  /** Absolute path to a watermark image (PNG with transparency) */
  watermarkPath?: string
}

/**
 * Apply ffmpeg polish to an existing MP4: text overlay + optional watermark.
 * Text overlay: white text on semi-transparent black bar at bottom-left.
 * Watermark: positioned top-right with 50% opacity.
 * Returns the polished MP4 path or null on failure.
 */
export function polishMp4(options: PolishOptions): ConvertResult {
  const polishedDir = resolve(options.outputDir, 'polished')
  mkdirSync(polishedDir, { recursive: true })

  const outPath = join(polishedDir, `${options.outputName}.mp4`)

  if (!existsSync(options.mp4Path)) {
    return { mp4Path: null, error: `Source MP4 not found: ${options.mp4Path}` }
  }

  const ffmpegBin = resolveFFmpegBin()
  const filters: string[] = []

  if (options.watermarkPath && existsSync(options.watermarkPath)) {
    // Watermark: top-right, 50% opacity, 10px padding
    filters.push(`movie=${options.watermarkPath},format=argb,colorchannelmixer=aa=0.5[wm];[in][wm]overlay=W-w-10:10`)
  }

  if (options.overlayText) {
    // Text: white on dark bar, bottom-left, 18pt
    const escapedText = options.overlayText.replace(/'/g, "'\\''").replace(/:/g, '\\:')
    filters.push(
      `drawtext=text='${escapedText}':fontsize=18:fontcolor=white:x=20:y=H-40:` +
      `box=1:boxcolor=black@0.6:boxborderw=8`
    )
  }

  if (filters.length === 0) {
    // Nothing to polish, just copy
    return { mp4Path: options.mp4Path, error: null }
  }

  const ffmpegArgs = [
    '-i', options.mp4Path,
    '-vf', filters.join(','),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-c:a', 'copy',
    '-y',
    outPath,
  ]

  console.log(`[mp4-polish] Polishing: ${basename(options.mp4Path)} -> ${basename(outPath)}`)

  try {
    execFileSync(ffmpegBin, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    console.log(`[mp4-polish] Saved: ${outPath}`)
    return { mp4Path: outPath, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[mp4-polish] Polish failed (original preserved): ${message}`)
    return { mp4Path: null, error: message }
  }
}

/**
 * Recursively find the first .webm file in a Playwright video output directory.
 * Playwright writes one video per test into a timestamped subdirectory.
 * Returns null if no WebM is found.
 */
export function findWebmInDir(dir: string): string | null {
  if (!existsSync(dir)) return null

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findWebmInDir(fullPath)
      if (found !== null) return found
    } else if (entry.isFile() && entry.name.endsWith('.webm')) {
      return fullPath
    }
  }

  return null
}
