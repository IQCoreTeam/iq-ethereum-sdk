// On-chain fee resolution.
//
// Fees are NOT hardcoded — each deployment (and each network) can set its own
// basicFee / linkedListFee / tableCreationFee via the contract's owner. The
// SDK reads them from the contract so it always sends the correct amount
// regardless of chain or later fee changes. (A stale hardcoded fee caused
// the Monad "InsufficientFee" revert in 0.1.x: the SDK sent 0.0001 while
// Monad's basicFee was 6.5.)
//
// Values are cached per contract address with a TTL so we don't pay an RPC
// round-trip on every write, while still picking up owner fee changes within
// the TTL window. Cache key is the contract address, so switching networks
// (different address) naturally uses a separate entry. Call clearFeeCache()
// to force an immediate re-read.
import { type Signer, type Provider, Contract, id as keccakId } from "ethers";
import { CODEIN_ABI } from "../../contract/abi";
import { getContractAddress } from "../../contract/addresses";

interface Fees {
  basicFee: bigint;
  linkedListFee: bigint;
  tableCreationFee: bigint;
}

interface CacheEntry {
  fees: Fees;
  expiresAt: number;
}

// Fees change rarely (only via an owner setFees tx), so a generous TTL is fine.
const FEE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map<string, CacheEntry>();

function runner(signerOrProvider: Signer | Provider): Provider {
  const maybe = signerOrProvider as Signer;
  return (maybe.provider as Provider) ?? (signerOrProvider as Provider);
}

async function loadFees(signerOrProvider: Signer | Provider): Promise<Fees> {
  const address = getContractAddress();
  const entry = cache.get(address);
  if (entry && entry.expiresAt > Date.now()) return entry.fees;

  const c = new Contract(address, CODEIN_ABI, runner(signerOrProvider));
  const [basicFee, linkedListFee, tableCreationFee] = await Promise.all([
    c.basicFee() as Promise<bigint>,
    c.linkedListFee() as Promise<bigint>,
    c.tableCreationFee() as Promise<bigint>,
  ]);
  const fees: Fees = { basicFee, linkedListFee, tableCreationFee };
  cache.set(address, { fees, expiresAt: Date.now() + FEE_CACHE_TTL_MS });
  return fees;
}

export async function getBasicFee(signerOrProvider: Signer | Provider): Promise<bigint> {
  return (await loadFees(signerOrProvider)).basicFee;
}

export async function getLinkedListFee(signerOrProvider: Signer | Provider): Promise<bigint> {
  return (await loadFees(signerOrProvider)).linkedListFee;
}

export async function getTableCreationFee(signerOrProvider: Signer | Provider): Promise<bigint> {
  return (await loadFees(signerOrProvider)).tableCreationFee;
}

// Resolve the fee a *code-in* call (dbCodeIn / userInventoryCodeIn /
// walletConnectionCodeIn) will charge, mirroring the contract's
// _resolveCodeInFee branching. Empty path = basicFee (caller can pass a
// signer's IQ-holder discount in via discountFee getter if they want, but
// the contract handles that itself), non-empty path = linkedListFee.
export async function resolveCodeInFee(
  signerOrProvider: Signer | Provider,
  onChainPath: string,
): Promise<bigint> {
  return onChainPath.length === 0
    ? getBasicFee(signerOrProvider)
    : getLinkedListFee(signerOrProvider);
}

// Resolve the effective tableCreationFee for a specific dbRoot, mirroring
// the contract's getter logic: per-root override if isSet, otherwise the
// global default.
export async function getEffectiveTableCreationFee(
  signerOrProvider: Signer | Provider,
  dbRootId: string,
): Promise<bigint> {
  const address = getContractAddress();
  const c = new Contract(address, CODEIN_ABI, runner(signerOrProvider));
  const root = await c.getDbRoot(keccakId(dbRootId));
  if (root.tableCreationFeeIsSet) {
    return root.tableCreationFeeOverride as bigint;
  }
  return getTableCreationFee(signerOrProvider);
}

// Invalidate cached fees (e.g. after the owner calls setFees on-chain, or after
// switching networks if you want to force a re-read for the new address).
export function clearFeeCache(): void {
  cache.clear();
}
