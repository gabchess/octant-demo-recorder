import type { Page } from '@playwright/test'
import { injectHeadlessWeb3Provider } from 'headless-web3-provider'
import type { Web3ProviderBackend } from 'headless-web3-provider'

/**
 * Headless wallet injection for DAPPSNAP.
 * Injects an EIP-1193 compatible provider into the Playwright page context
 * via headless-web3-provider. No MetaMask extension, no display required.
 *
 * The injected provider:
 * - Responds to eth_requestAccounts, eth_accounts, personal_sign, etc.
 * - Connects to a real RPC endpoint for chain state
 * - Uses the test wallet's private key for signing
 * - Auto-permits all standard wallet requests
 */

export interface WalletConfig {
  privateKey: string
  chainId: number
  rpcUrl: string
}

/**
 * Read wallet config from environment variables.
 * Throws if WALLET_PRIVATE_KEY is not set.
 */
export function readWalletConfig(): WalletConfig {
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error(
      'WALLET_PRIVATE_KEY env var required for walletAction: inject. ' +
      'Export from MetaMask: Account Details > Show Private Key. ' +
      'Test wallet only. Zero real funds.'
    )
  }

  return {
    privateKey,
    chainId: parseInt(process.env.CHAIN_ID ?? '1', 10),
    rpcUrl: process.env.RPC_URL ?? 'https://eth.llamarpc.com',
  }
}

/**
 * Inject the headless wallet provider into a Playwright page.
 * Must be called BEFORE any page.goto() -- the provider must be available
 * when the dapp's JavaScript loads.
 *
 * Returns the Web3ProviderBackend for authorizing pending requests.
 */
export async function injectWallet(
  page: Page,
  config: WalletConfig
): Promise<Web3ProviderBackend> {
  return injectHeadlessWeb3Provider(
    page,
    [config.privateKey],
    config.chainId,
    config.rpcUrl,
    {
      permitted: [
        'eth_requestAccounts',
        'eth_accounts',
        'personal_sign',
        'eth_signTypedData_v4',
        'wallet_switchEthereumChain',
        'wallet_addEthereumChain',
        'wallet_requestPermissions',
      ],
    }
  )
}

/**
 * Click the wallet connect button on a dapp page.
 * Uses Octant's data-testid selectors by default, with fallback for generic dapps.
 * Auto-authorizes all pending wallet requests after clicking.
 */
export async function connectWalletOnPage(
  page: Page,
  wallet: Web3ProviderBackend
): Promise<void> {
  // Try Octant-specific connect button first
  try {
    const connectBtn = page.locator("[data-testid='LayoutTopBar__Button']").first()
    await connectBtn.click({ timeout: 10_000 })
    await page.waitForTimeout(1000)

    // If a connect modal appears, click the browser wallet option
    const browserWalletBtn = page.locator("[data-testid='ConnectWallet__BoxRounded--browserWallet']").first()
    const modalVisible = await browserWalletBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (modalVisible) {
      console.log('[wallet] Connect modal visible, clicking browser wallet')
      await browserWalletBtn.click()
      await page.waitForTimeout(2000)
    }
  } catch {
    // Fallback: try generic connect button patterns
    try {
      const genericBtn = page.locator('button:has-text("Connect"), button:has-text("Connect Wallet")').first()
      await genericBtn.click({ timeout: 5_000 })
      await page.waitForTimeout(2000)
    } catch {
      console.log('[wallet] No connect button found, dapp may auto-connect or not require wallet')
    }
  }

  // Auto-authorize any pending wallet requests
  wallet.authorizeAll()
  await page.waitForTimeout(2000)
  console.log('[wallet] Wallet connected via headless provider')
}
