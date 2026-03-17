#!/usr/bin/env node
import 'dotenv/config'
import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { readConfig, ConfigValidationError } from './src/config.js'
import { FfmpegRecorder } from './src/recorder.js'
import { FlowRunner, type ManifestEntry } from './src/flow-runner.js'
import { convertWebmToMp4, findWebmInDir, polishMp4 } from './src/mp4-converter.js'

/**
 * Octant Demo Recorder — Main CLI Entry Point
 *
 * Usage:
 *   node dist/record.js --config octant-flows.json --output ./recordings/
 *   node dist/record.js --config octant-flows.json --output ./recordings/ --no-ffmpeg
 *   node dist/record.js --help
 *
 * Architecture ref: Section 5 — CLI Design.
 */

const HELP_TEXT = `
dappsnap
========
Headless MetaMask automation + video recording pipeline for Web3 dapps.

USAGE:
  node dist/record.js --config <path> --output <dir> [options]

OPTIONS:
  --config <path>         Path to JSON config file (default: ./octant-flows.json)
  --output <dir>          Output directory for recordings (default: ./recordings)
  --no-ffmpeg             Use Playwright video only, skip ffmpeg 4K capture
  --dry-run               Validate config and print flow plan without recording
  --display <index>       ffmpeg display index (default: "1", confirm with: ffmpeg -f avfoundation -list_devices true -i "")
  --help                  Show this help message

EXAMPLES:
  node dist/record.js --config demo-config.json --output ./recordings/ --no-ffmpeg
  node dist/record.js --config octant-flows.json --output ./recordings/
  node dist/record.js --help

SETUP:
  1. Copy .env.example to .env and fill in your TEST wallet credentials
  2. Run: npx synpress  (caches MetaMask wallet state)
  3. Confirm ffmpeg display index on Mac Mini:
       ffmpeg -f avfoundation -list_devices true -i ""
  4. Run a no-wallet test first:
       node dist/record.js --config demo-config.json --no-ffmpeg
  5. Full run with MetaMask:
       node dist/record.js --config octant-flows.json --output ./recordings/

SECURITY:
  - WALLET_SEED_PHRASE and WALLET_PASSWORD must be in .env (never in config files)
  - Test wallet must contain ZERO real funds
  - .env is gitignored — never commit it
`.trim()

interface CliArgs {
  config: string
  output: string
  noFfmpeg: boolean
  dryRun: boolean
  display: string
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    config: './octant-flows.json',
    output: './recordings',
    noFfmpeg: false,
    dryRun: false,
    display: '1',
    help: false,
  }

  const positional = argv.slice(2)
  let i = 0
  while (i < positional.length) {
    const arg = positional[i]
    switch (arg) {
      case '--help':
      case '-h':
        args.help = true
        break
      case '--no-ffmpeg':
        args.noFfmpeg = true
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--config': {
        const next = positional[++i]
        if (!next || next.startsWith('--')) {
          console.error('Error: --config requires a path argument')
          process.exit(1)
        }
        args.config = next
        break
      }
      case '--output': {
        const next = positional[++i]
        if (!next || next.startsWith('--')) {
          console.error('Error: --output requires a directory argument')
          process.exit(1)
        }
        args.output = next
        break
      }
      case '--display': {
        const next = positional[++i]
        if (!next || next.startsWith('--')) {
          console.error('Error: --display requires a display index argument')
          process.exit(1)
        }
        args.display = next
        break
      }
      default:
        console.error(`Error: Unknown argument: ${arg}`)
        console.error('Run with --help for usage.')
        process.exit(1)
    }
    i++
  }

  return args
}

function isoTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

/**
 * Resolve the Playwright video output directory for a given flow.
 * Playwright names the output dir "<flow-name>-<test-title>" (not just the flow name),
 * so we scan the playwright/ parent for the first subdir starting with flowName.
 * Falls back to the bare flowName dir if nothing is found (e.g. first run, no output yet).
 */
function resolvePlaywrightVideoDir(outputDir: string, flowName: string): string {
  const playwrightDir = join(outputDir, 'playwright')

  if (!existsSync(playwrightDir)) {
    return join(playwrightDir, flowName)
  }

  const entries = readdirSync(playwrightDir, { withFileTypes: true })
  const match = entries.find(
    (e) => e.isDirectory() && e.name.startsWith(flowName)
  )

  return match
    ? join(playwrightDir, match.name)
    : join(playwrightDir, flowName)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  console.log('=== dappsnap ===')
  console.log(`Config:    ${args.config}`)
  console.log(`Output:    ${args.output}`)
  console.log(`ffmpeg:    ${args.noFfmpeg ? 'disabled (--no-ffmpeg)' : `enabled (display: ${args.display})`}`)
  console.log('')

  if (!args.noFfmpeg) {
    console.log('[main] avfoundation display capture mode: ensure display index is correct')
    console.log('[main] NOTE: most setups should use --no-ffmpeg (Playwright WebM + MP4 conversion)')
  }

  let config
  try {
    config = readConfig(args.config)
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      console.error(`[main] Config error: ${err.message}`)
      process.exit(1)
    }
    throw err
  }

  console.log(`[main] Loaded ${config.flows.length} flow(s) from ${args.config}`)
  console.log(`[main] Base URL: ${config.baseUrl}`)
  console.log(`[main] Wallet: ${config.walletAction}`)
  console.log(`[main] Viewport: ${config.viewport.width}x${config.viewport.height}`)
  console.log('')

  if (args.dryRun) {
    console.log('=== DRY RUN — config validated, no recordings will be made ===\n')
    for (const flow of config.flows) {
      console.log(`  [${flow.name}]`)
      console.log(`    Path: ${config.baseUrl}${flow.path}`)
      console.log(`    Wait for: ${flow.waitForSelector}`)
      console.log(`    Duration: ${flow.duration}s`)
      console.log(`    Actions: ${flow.actions.length} (${flow.actions.map(a => a.type).join(', ')})`)
      console.log(`    ${flow.description}`)
      console.log('')
    }
    console.log(`Total: ${config.flows.length} flow(s), estimated ${config.flows.reduce((sum, f) => sum + f.duration, 0)}s recording time`)
    process.exit(0)
  }

  mkdirSync(resolve(args.output), { recursive: true })

  const recorder = new FfmpegRecorder({
    outputDir: resolve(args.output),
    displayIndex: args.display,
    noFfmpeg: args.noFfmpeg,
  })

  const runner = new FlowRunner(config, args.output)
  const manifest: ManifestEntry[] = []

  for (const flow of config.flows) {
    console.log(`\n--- Flow: ${flow.name} ---`)
    console.log(`Description: ${flow.description}`)
    console.log(`Path: ${config.baseUrl}${flow.path}`)
    console.log(`Duration: ${flow.duration}s`)

    const timestamp = isoTimestamp()
    const finalName = `${flow.name}_${timestamp}`

    // Step 1: Start avfoundation display capture (only if --display mode, not --no-ffmpeg)
    // Default path is Playwright WebM + post-process MP4. avfoundation is opt-in only.
    let ffmpegOutputPath: string | null = null
    if (!args.noFfmpeg) {
      recorder.start(flow.name)
      // Brief pause for ffmpeg to initialize before Playwright begins
      await new Promise<void>((r) => setTimeout(r, 1500))
    }

    // Step 2: Run the Playwright/Synpress test (records WebM via built-in video)
    let playwrightVideoDir: string
    try {
      await runner.runFlow(flow)
      playwrightVideoDir = resolvePlaywrightVideoDir(resolve(args.output), flow.name)
    } catch (err) {
      console.error(`[main] Flow failed: ${err instanceof Error ? err.message : String(err)}`)
      if (!args.noFfmpeg) {
        try { await recorder.stop(finalName) } catch { /* best-effort cleanup */ }
      }
      continue
    }

    // Step 3: Stop avfoundation capture (if running)
    if (!args.noFfmpeg) {
      try {
        ffmpegOutputPath = await recorder.stop(finalName)
      } catch (err) {
        console.error(`[main] ffmpeg stop error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Step 4: Convert Playwright WebM to MP4 (primary output path)
    // Playwright records WebM to recordings/playwright/<flow-test-name>/video.webm
    // We convert to H.264 MP4 in recordings/mp4/<flow>_<timestamp>.mp4
    let mp4OutputPath: string | null = null
    const webmPath = findWebmInDir(playwrightVideoDir)
    if (webmPath !== null) {
      const { mp4Path, error } = convertWebmToMp4({
        webmPath,
        outputDir: resolve(args.output),
        outputName: finalName,
      })
      mp4OutputPath = mp4Path
      if (error !== null) {
        console.warn(`[main] MP4 conversion failed for ${flow.name} -- WebM preserved at ${webmPath}`)
      }
    } else {
      console.warn(`[main] No WebM found in ${playwrightVideoDir} -- skipping MP4 conversion`)
    }

    // Step 5: Polish MP4 with text overlay (flow name + description)
    let polishedPath: string | null = null
    if (mp4OutputPath !== null && mp4OutputPath.endsWith('.mp4')) {
      const { mp4Path: polished, error: polishError } = polishMp4({
        mp4Path: mp4OutputPath,
        outputDir: resolve(args.output),
        outputName: finalName,
        overlayText: `${flow.name} -- ${flow.description}`,
      })
      polishedPath = polished
      if (polishError !== null) {
        console.warn(`[main] Polish failed for ${flow.name} -- unpolished MP4 preserved`)
      }
    }

    manifest.push({
      flowName: flow.name,
      description: flow.description,
      path: flow.path,
      recordedAt: new Date().toISOString(),
      durationSeconds: flow.duration,
      playwrightVideoDir,
      ffmpegOutputPath,
      mp4OutputPath,
      polishedPath,
    })

    console.log(`[main] Flow complete: ${flow.name}`)
  }

  // Write manifest.json
  const manifestPath = join(resolve(args.output), 'manifest.json')
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        config: args.config,
        totalFlows: config.flows.length,
        completedFlows: manifest.length,
        recordings: manifest,
      },
      null,
      2
    ),
    'utf-8'
  )

  console.log(`\n=== Recording Complete ===`)
  console.log(`Flows completed: ${manifest.length} / ${config.flows.length}`)
  console.log(`Manifest: ${manifestPath}`)

  if (manifest.length < config.flows.length) {
    console.warn('\nWarning: Some flows failed. Check output above for details.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[main] Unhandled error:', err)
  process.exit(1)
})
