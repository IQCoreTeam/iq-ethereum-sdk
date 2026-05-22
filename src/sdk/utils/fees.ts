// On-chain fee resolution.
//
// Fees are NOT hardcoded — each deployment (and each network) can set its own
// basicFee / linkedListFee via the contract's owner. The SDK reads them from
// the contract so it always sends the correct amount regardless of chain or
// later fee changes. (A stale hardcoded fee caused the Monad "InsufficientFee"
// revert: the SDK sent 0.0001 while Monad's basicFee was 6.5.)
//
// Values are cached per contract address with a TTL so we don't pay an RPC
// round-trip on every write, while still picking up owner fee changes within
// the TTL window. Cache key is the contract address, so switching networks
// (different address) naturally uses a separate entry. Call clearFeeCache()
// to force an immediate re-read.
import { type Signer, type Provider, Contract } from "ethers";
import { CODEIN_ABI } from "../../contract/abi";
import { getContractAddress } from "../../contract/addresses";

interface Fees {
  basicFee: bigint;
  linkedListFee: bigint;
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
  const [basicFee, linkedListFee] = await Promise.all([
    c.basicFee() as Promise<bigint>,
    c.linkedListFee() as Promise<bigint>,
  ]);
  const fees: Fees = { basicFee, linkedListFee };
  cache.set(address, { fees, expiresAt: Date.now() + FEE_CACHE_TTL_MS });
  return fees;
}

export async function getBasicFee(signerOrProvider: Signer | Provider): Promise<bigint> {
  return (await loadFees(signerOrProvider)).basicFee;
}

export async function getLinkedListFee(signerOrProvider: Signer | Provider): Promise<bigint> {
  return (await loadFees(signerOrProvider)).linkedListFee;
}

// Invalidate cached fees (e.g. after the owner calls setFees on-chain, or after
// switching networks if you want to force a re-read for the new address).
export function clearFeeCache(): void {
  cache.clear();
}
