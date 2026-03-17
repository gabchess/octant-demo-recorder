import { readFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import yaml from 'js-yaml'

/**
 * Config reader and validator for dappsnap flow configs.
 * Supports both JSON (.json) and YAML (.yaml, .yml) formats.
 * Any dapp URL works — config is not tied to any specific protocol.
 */

// --- Action types ---

export interface ScrollAction {
  type: 'scroll'
  direction: 'up' | 'down'
  amount: number
  delay?: number
}

export interface ClickAction {
  type: 'click'
  selector: string
  delay?: number
}

export interface WaitAction {
  type: 'wait'
  duration: number
}

export interface NavigateAction {
  type: 'navigate'
  path: string
  waitForSelector?: string
  delay?: number
}

export interface TypeAction {
  type: 'type'
  selector: string
  text: string
  delay?: number
}

export interface ScreenshotAction {
  type: 'screenshot'
  name: string
}

export type FlowAction =
  | ScrollAction
  | ClickAction
  | WaitAction
  | NavigateAction
  | TypeAction
  | ScreenshotAction

// --- Config shape ---

export interface FlowConfig {
  name: string
  path: string
  description: string
  waitForSelector: string
  duration: number
  actions: FlowAction[]
}

export interface RecordingConfig {
  baseUrl: string
  viewport: {
    width: number
    height: number
  }
  walletAction: 'connect' | 'inject' | 'none'
  flows: FlowConfig[]
}

// --- Validation ---

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}

const VALID_ACTION_TYPES = ['scroll', 'click', 'wait', 'navigate', 'type', 'screenshot'] as const

function validateAction(action: unknown, flowIndex: number, actionIndex: number): FlowAction {
  if (typeof action !== 'object' || action === null) {
    throw new ConfigValidationError(
      `flows[${flowIndex}].actions[${actionIndex}] must be an object`
    )
  }

  const a = action as Record<string, unknown>
  const prefix = `flows[${flowIndex}].actions[${actionIndex}]`

  if (!VALID_ACTION_TYPES.includes(a.type as typeof VALID_ACTION_TYPES[number])) {
    throw new ConfigValidationError(
      `${prefix}.type must be one of: ${VALID_ACTION_TYPES.join(', ')} (got: "${String(a.type)}")`
    )
  }

  switch (a.type) {
    case 'scroll': {
      if (a.direction !== 'up' && a.direction !== 'down') {
        throw new ConfigValidationError(`${prefix}.direction must be 'up' or 'down'`)
      }
      if (typeof a.amount !== 'number' || a.amount <= 0) {
        throw new ConfigValidationError(`${prefix}.amount must be a positive number`)
      }
      if (a.delay !== undefined && (typeof a.delay !== 'number' || a.delay < 0)) {
        throw new ConfigValidationError(`${prefix}.delay must be a non-negative number`)
      }
      return { type: 'scroll', direction: a.direction, amount: a.amount, delay: a.delay as number | undefined }
    }
    case 'click': {
      if (typeof a.selector !== 'string' || a.selector.trim() === '') {
        throw new ConfigValidationError(`${prefix}.selector must be a non-empty string`)
      }
      if (a.delay !== undefined && (typeof a.delay !== 'number' || a.delay < 0)) {
        throw new ConfigValidationError(`${prefix}.delay must be a non-negative number`)
      }
      return { type: 'click', selector: a.selector.trim(), delay: a.delay as number | undefined }
    }
    case 'wait': {
      if (typeof a.duration !== 'number' || a.duration <= 0) {
        throw new ConfigValidationError(`${prefix}.duration must be a positive number`)
      }
      return { type: 'wait', duration: a.duration }
    }
    case 'navigate': {
      if (typeof a.path !== 'string' || !a.path.startsWith('/')) {
        throw new ConfigValidationError(`${prefix}.path must be a string starting with /`)
      }
      if (a.waitForSelector !== undefined && typeof a.waitForSelector !== 'string') {
        throw new ConfigValidationError(`${prefix}.waitForSelector must be a string`)
      }
      if (a.delay !== undefined && (typeof a.delay !== 'number' || a.delay < 0)) {
        throw new ConfigValidationError(`${prefix}.delay must be a non-negative number`)
      }
      return {
        type: 'navigate',
        path: a.path,
        waitForSelector: a.waitForSelector as string | undefined,
        delay: a.delay as number | undefined,
      }
    }
    case 'type': {
      if (typeof a.selector !== 'string' || a.selector.trim() === '') {
        throw new ConfigValidationError(`${prefix}.selector must be a non-empty string`)
      }
      if (typeof a.text !== 'string') {
        throw new ConfigValidationError(`${prefix}.text must be a string`)
      }
      if (a.delay !== undefined && (typeof a.delay !== 'number' || a.delay < 0)) {
        throw new ConfigValidationError(`${prefix}.delay must be a non-negative number`)
      }
      return { type: 'type', selector: a.selector.trim(), text: a.text, delay: a.delay as number | undefined }
    }
    case 'screenshot': {
      if (typeof a.name !== 'string' || a.name.trim() === '') {
        throw new ConfigValidationError(`${prefix}.name must be a non-empty string`)
      }
      return { type: 'screenshot', name: a.name.trim() }
    }
    default:
      throw new ConfigValidationError(`${prefix}: unknown action type "${String(a.type)}"`)
  }
}

function validateFlow(flow: unknown, index: number): FlowConfig {
  if (typeof flow !== 'object' || flow === null) {
    throw new ConfigValidationError(`flows[${index}] must be an object`)
  }

  const f = flow as Record<string, unknown>

  if (typeof f.name !== 'string' || f.name.trim() === '') {
    throw new ConfigValidationError(`flows[${index}].name must be a non-empty string`)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(f.name.trim())) {
    throw new ConfigValidationError(
      `flows[${index}].name must contain only alphanumeric characters, hyphens, and underscores (got: "${f.name}")`
    )
  }

  if (typeof f.path !== 'string' || !f.path.startsWith('/')) {
    throw new ConfigValidationError(`flows[${index}].path must be a string starting with /`)
  }

  if (typeof f.description !== 'string') {
    throw new ConfigValidationError(`flows[${index}].description must be a string`)
  }

  if (typeof f.waitForSelector !== 'string' || f.waitForSelector.trim() === '') {
    throw new ConfigValidationError(`flows[${index}].waitForSelector must be a non-empty string`)
  }

  if (typeof f.duration !== 'number' || f.duration <= 0) {
    throw new ConfigValidationError(`flows[${index}].duration must be a positive number`)
  }

  if (!Array.isArray(f.actions)) {
    throw new ConfigValidationError(`flows[${index}].actions must be an array`)
  }

  const actions = f.actions.map((action, actionIndex) =>
    validateAction(action, index, actionIndex)
  )

  return {
    name: f.name.trim(),
    path: f.path,
    description: f.description,
    waitForSelector: f.waitForSelector.trim(),
    duration: f.duration,
    actions,
  }
}

function parseFileContent(raw: string, filePath: string): unknown {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.yaml' || ext === '.yml') {
    try {
      return yaml.load(raw)
    } catch (err) {
      throw new ConfigValidationError(
        `Config file is not valid YAML: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new ConfigValidationError(
      `Config file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export function readConfig(configPath: string): RecordingConfig {
  const absolutePath = resolve(process.cwd(), configPath)

  let raw: string
  try {
    raw = readFileSync(absolutePath, 'utf-8')
  } catch (err) {
    throw new ConfigValidationError(
      `Cannot read config file at ${absolutePath}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const parsed = parseFileContent(raw, absolutePath)

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ConfigValidationError('Config file must be an object')
  }

  const config = parsed as Record<string, unknown>

  if (typeof config.baseUrl !== 'string' || !config.baseUrl.startsWith('http')) {
    throw new ConfigValidationError('baseUrl must be a string starting with http or https')
  }

  if (
    typeof config.viewport !== 'object' ||
    config.viewport === null ||
    typeof (config.viewport as Record<string, unknown>).width !== 'number' ||
    typeof (config.viewport as Record<string, unknown>).height !== 'number'
  ) {
    throw new ConfigValidationError('viewport must be an object with numeric width and height')
  }

  const viewport = config.viewport as Record<string, number>

  if (config.walletAction !== 'connect' && config.walletAction !== 'none' && config.walletAction !== 'inject') {
    throw new ConfigValidationError("walletAction must be 'connect', 'inject', or 'none'")
  }

  if (!Array.isArray(config.flows) || config.flows.length === 0) {
    throw new ConfigValidationError('flows must be a non-empty array')
  }

  const flows = config.flows.map((flow, index) => validateFlow(flow, index))

  return {
    baseUrl: config.baseUrl.replace(/\/$/, ''),
    viewport: { width: viewport.width, height: viewport.height },
    walletAction: config.walletAction,
    flows,
  }
}
