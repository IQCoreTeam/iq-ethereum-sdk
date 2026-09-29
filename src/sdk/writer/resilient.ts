// =============================================================================
//  Resilient sending — trust the chain, not the wallet transport
// =============================================================================
//
//  Measured 2026-09 on Robinhood Chain: Phantom's node-proxy re-submits a raw
//  tx internally, and when the duplicate comes back "nonce too low" (the first
//  copy already sequenced) the proxy returns THAT error to the caller. The tx
//  succeeded on chain while the wallet reported failure. Multi-tx flows like
//  the chunk upload abort on the first such phantom error unless the sender
//  verifies against the chain itself.
//
//  sendMined() therefore snapshots the signer's nonce before sending, and on
//  a send/wait error polls an independent read RPC (the SDK's configured
//  provider, not the wallet's) for the nonce to advance; if the tx landed it
//  recovers the hash and the flow continues as if the transport had told the
//  truth.

import { JsonRpcProvider, Signer, TransactionResponse } from "ethers";
import { getProvider } from "../utils/provider";

// Phantom's proxy surfaces the spurious error ~2s after the tx is already
// sequenced, so most rescues succeed on the first poll. The tail rounds cover
// genuinely slow inclusion before we declare the tx dead.
const RESCUE_POLL_MS = 2000;
const RESCUE_POLL_ROUNDS = 8;

export interface UploadCheckpoint {
    /** Tail of the chunk chain uploaded so far ("Genesis" when none). */
    beforeTx: string;
    /** Number of chunks already on chain; resume slices these off. */
    sentChunks: number;
    /** Set when the fee-paying finalize tx landed but the pointer bump did not. */
    finalizedTx?: string;
}

// Thrown when a write stops with work already on chain. The checkpoint feeds
// the next attempt's `resume` so nothing landed is ever paid for twice.
export class UploadInterrupted extends Error {
    checkpoint: UploadCheckpoint;
    cause: unknown;

    constructor(message: string, checkpoint: UploadCheckpoint, cause: unknown) {
        super(message);
        this.name = "UploadInterrupted";
        this.checkpoint = checkpoint;
        this.cause = cause;
    }
}

// Send one contract tx and return its mined hash. `expectTo` guards the
// rescue: only a landed tx addressed to our contract counts, so an unrelated
// wallet action at the same nonce can never be mistaken for the write.
export async function sendMined(
    signer: Signer,
    send: () => Promise<TransactionResponse>,
    expectTo: string,
): Promise<string> {
    const reader = getProvider();
    const addr = await signer.getAddress();
    const nonce = await reader.getTransactionCount(addr, "latest");
    const fromBlock = await reader.getBlockNumber();
    try {
        const tx = await send();
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
            throw new Error(`transaction reverted: ${receipt?.hash ?? "unknown"}`);
        }
        return receipt.hash;
    } catch (err) {
        const landed = await findLanded(reader, addr, nonce, fromBlock, expectTo);
        if (landed) return landed;
        throw err;
    }
}

// Did the tx with `nonce` land despite the error? Poll the nonce, then
// binary-search the block where the account's tx count crossed it (blocks on
// Robinhood come ~4/s, so a linear scan of the window would be hundreds of
// getBlock calls; the search needs ~10 getTransactionCount calls).
async function findLanded(
    reader: JsonRpcProvider,
    addr: string,
    nonce: number,
    fromBlock: number,
    expectTo: string,
): Promise<string | null> {
    for (let round = 0; round < RESCUE_POLL_ROUNDS; round++) {
        await new Promise((r) => setTimeout(r, RESCUE_POLL_MS));
        let now: number;
        try {
            now = await reader.getTransactionCount(addr, "latest");
        } catch {
            continue; // transient read failure; keep polling
        }
        if (now <= nonce) continue;
        try {
            let lo = fromBlock;
            let hi = await reader.getBlockNumber();
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                const count = await reader.getTransactionCount(addr, mid);
                if (count > nonce) hi = mid;
                else lo = mid + 1;
            }
            const block = await reader.getBlock(lo, true);
            if (!block) return null;
            for (const tx of block.prefetchedTransactions) {
                if (
                    tx.from.toLowerCase() === addr.toLowerCase() &&
                    tx.nonce === nonce &&
                    (tx.to ?? "").toLowerCase() === expectTo.toLowerCase()
                ) {
                    const receipt = await reader.getTransactionReceipt(tx.hash);
                    return receipt && receipt.status === 1 ? tx.hash : null;
                }
            }
            return null; // nonce consumed by something that was not our write
        } catch {
            continue; // node hiccup mid-search; retry the whole round
        }
    }
    return null;
}
