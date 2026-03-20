/**
 * Mode selector — thin routing layer.
 * Determines whether to use Playwright (wallet-free) or CDP (wallet-required) mode.
 */

export type RecordingMode = "playwright" | "cdp";

export interface CliArgs {
  url: string;
  wallet: boolean;
  steps?: string[];
  duration?: number;
  outputDir?: string;
}

/**
 * Select the recording mode based on CLI args.
 * CDP mode is only used when --wallet flag is present.
 */
export function selectMode(args: CliArgs): RecordingMode {
  return args.wallet ? "cdp" : "playwright";
}
