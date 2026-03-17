import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * ffmpeg display capture manager.
 * Architecture ref: Section 3 — Layer 2: ffmpeg display capture (production quality).
 *
 * Command: ffmpeg -f avfoundation -i "<display_index>" -vcodec libx264 -preset slow -crf 18 -r 30 -s 3840x2160 output.mp4
 *
 * IMPORTANT: Before running on Mac Mini, identify the display index:
 *   ffmpeg -f avfoundation -list_devices true -i ""
 * The HDMI dummy plug display index must be confirmed manually.
 */

export interface RecorderOptions {
  outputDir: string
  displayIndex: string
  noFfmpeg: boolean
}

export interface RecordingSession {
  flowName: string
  tempPath: string
  process: ChildProcess | null
  startedAt: Date
}

export class FfmpegRecorder {
  private readonly outputDir: string
  private readonly displayIndex: string
  private readonly noFfmpeg: boolean
  private activeSession: RecordingSession | null = null

  constructor(options: RecorderOptions) {
    this.outputDir = resolve(options.outputDir, 'production')
    this.displayIndex = options.displayIndex
    this.noFfmpeg = options.noFfmpeg

    if (!this.noFfmpeg) {
      mkdirSync(this.outputDir, { recursive: true })
    }
  }

  start(flowName: string): void {
    if (this.noFfmpeg) {
      console.log(`[recorder] --no-ffmpeg set — skipping ffmpeg for flow: ${flowName}`)
      this.activeSession = {
        flowName,
        tempPath: '',
        process: null,
        startedAt: new Date(),
      }
      return
    }

    if (this.activeSession !== null) {
      throw new Error(`Recording already active for flow: ${this.activeSession.flowName}. Call stop() first.`)
    }

    const tempPath = join(this.outputDir, `_recording_${flowName}_temp.mp4`)

    console.log(`[recorder] Starting ffmpeg capture for flow: ${flowName}`)
    console.log(`[recorder] Display index: ${this.displayIndex}`)
    console.log(`[recorder] Output: ${tempPath}`)

    const ffmpegArgs = [
      '-f', 'avfoundation',
      '-i', this.displayIndex,
      '-vcodec', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-r', '30',
      '-s', '3840x2160',
      '-y', // overwrite output without asking
      tempPath,
    ]

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      // ffmpeg writes progress to stderr — log at debug level only
      const line = data.toString().trim()
      if (line.includes('Error') || line.includes('error')) {
        console.error(`[ffmpeg] ${line}`)
      }
    })

    ffmpegProcess.on('error', (err) => {
      console.error(`[recorder] ffmpeg process error: ${err.message}`)
    })

    this.activeSession = {
      flowName,
      tempPath,
      process: ffmpegProcess,
      startedAt: new Date(),
    }

    // Brief pause to let ffmpeg initialize before the test runs
    // Synpress flows are async — caller awaits start before running the test
  }

  async stop(finalName: string): Promise<string | null> {
    if (this.activeSession === null) {
      console.warn('[recorder] stop() called with no active session')
      return null
    }

    const session = this.activeSession
    this.activeSession = null

    if (this.noFfmpeg || session.process === null) {
      console.log(`[recorder] --no-ffmpeg mode — no file to rename for flow: ${session.flowName}`)
      return null
    }

    return new Promise<string | null>((resolve, reject) => {
      session.process!.kill('SIGINT')

      session.process!.on('close', (code) => {
        const expectedExit = code === 0 || code === 255 || code === null
        if (!expectedExit) {
          reject(new Error(`ffmpeg exited with code ${code} for flow: ${session.flowName}`))
          return
        }

        if (!existsSync(session.tempPath)) {
          reject(new Error(`ffmpeg output file not found at: ${session.tempPath}`))
          return
        }

        const finalPath = join(this.outputDir, `${finalName}.mp4`)
        renameSync(session.tempPath, finalPath)
        console.log(`[recorder] Recording saved: ${finalPath}`)
        resolve(finalPath)
      })

      session.process!.on('error', (err) => {
        reject(new Error(`ffmpeg process error during stop: ${err.message}`))
      })
    })
  }

  isRecording(): boolean {
    return this.activeSession !== null
  }
}
