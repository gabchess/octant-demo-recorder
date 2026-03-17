import 'dotenv/config'
import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress-metamask/playwright'
import type { BrowserContext, Page } from 'playwright-core'

/**
 * Synpress wallet setup for Octant demo recording.
 *
 * Architecture ref: Section 4 — Wallet Strategy.
 * SECURITY: Credentials come ONLY from environment variables.
 * NEVER add seed phrase or password to this file or any config file.
 * This wallet must contain ZERO real funds.
 *
 * Required env vars (set in .env on Mac Mini, never committed):
 *   WALLET_SEED_PHRASE — test-only BIP39 mnemonic
 *   WALLET_PASSWORD    — MetaMask unlock password
 */

const walletPassword = process.env.WALLET_PASSWORD
const walletSeedPhrase = process.env.WALLET_SEED_PHRASE

if (!walletPassword) {
  throw new Error('WALLET_PASSWORD environment variable is required. See .env.example')
}

if (!walletSeedPhrase) {
  throw new Error('WALLET_SEED_PHRASE environment variable is required. See .env.example')
}

export default defineWalletSetup(walletPassword, async (context: BrowserContext, walletPage: Page) => {
  const metamask = new MetaMask(context, walletPage, walletPassword!)
  await metamask.importWallet(walletSeedPhrase!)
})
