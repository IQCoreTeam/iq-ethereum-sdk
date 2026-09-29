// =============================================================================
//  Code-In Writer — TxChainTail 2-tx pattern
// =============================================================================
//
//  Write flow (post-0.2.0, matches solana):
//    1. sendCode × N (chunk inscription, data lives in calldata only)
//    2. userInventoryCodeIn(handle, tailTx, ..., beforeUserTx)
//         [payable] basicFee for inline (empty tailTx), linkedListFee for
//         linked uploads. Fee is collected here — once per write.
//    3. updateUserTxChainTail(myTxHash) [free pointer bump]
//         No value, no fee. Just advances the user's chain tail.

import {type Signer} from "ethers";
import {getContract, NETWORKS} from "../../contract";
import {CHUNK_SIZE, DIRECT_METADATA_MAX_BYTES} from "../constants";
import {resolveCodeInFee} from "../utils/fees";
import {getNetwork} from "../utils/provider";
import {sendMined, UploadInterrupted, type UploadCheckpoint} from "./resilient";

export function toChunks(data: string | string[]): string[] {
    if (Array.isArray(data)) return data;
    const chunks: string[] = [];
    const buf = Buffer.from(data, "utf8");
    for (let i = 0; i < buf.length; i += CHUNK_SIZE) {
        chunks.push(buf.subarray(i, i + CHUNK_SIZE).toString("utf8"));
    }
    return chunks.length ? chunks : [""];
}

// Split `chunks` into batches such that each batch's total UTF-8 byte size
// stays under the active network's maxBatchPayloadBytes (chains reject
// oversized transactions; per-chain budgets live in NETWORKS). A single
// chunk that exceeds the budget is still accepted as its own batch —
// CHUNK_SIZE should already be well below the limit, but this keeps the
// function total.
const batchChunks = (chunks: string[], maxBatchPayloadBytes: number): string[][] => {
    const batches: string[][] = [];
    let current: string[] = [];
    let size = 0;
    for (const chunk of chunks) {
        const chunkBytes = Buffer.byteLength(chunk, "utf8");
        if (current.length > 0 && size + chunkBytes > maxBatchPayloadBytes) {
            batches.push(current);
            current = [];
            size = 0;
        }
        current.push(chunk);
        size += chunkBytes;
    }
    if (current.length > 0) batches.push(current);
    return batches;
};

export async function uploadLinkedList(
    signer: Signer,
    chunks: string[],
    onProgress?: (pct: number) => void,
    resume?: UploadCheckpoint,
): Promise<string> {
    const contract = getContract(signer);
    const target = await contract.getAddress();
    let beforeTx = resume?.beforeTx || "Genesis";
    let sentChunks = Math.min(resume?.sentChunks ?? 0, chunks.length);
    const batches = batchChunks(chunks.slice(sentChunks), NETWORKS[getNetwork()].maxBatchPayloadBytes);
    for (const batch of batches) {
        const prev = beforeTx;
        try {
            beforeTx = await sendMined(signer, () => contract.sendCode(batch, prev, 0, 0), target);
        } catch (err) {
            throw new UploadInterrupted("chunk upload interrupted", {beforeTx: prev, sentChunks}, err);
        }
        sentChunks += batch.length;
        onProgress?.((sentChunks / chunks.length) * 100);
    }
    return beforeTx;
}

export async function prepareUpload(
    signer: Signer,
    data: string,
    onProgress?: (pct: number) => void,
    resume?: UploadCheckpoint,
): Promise<{ onChainPath: string; metadata: string }> {
    const chunks = toChunks(data);
    const isInline = chunks.length === 1 && Buffer.byteLength(chunks[0], "utf8") <= DIRECT_METADATA_MAX_BYTES;
    if (isInline) {
        return {onChainPath: "", metadata: data};
    }
    const tailTx = await uploadLinkedList(signer, chunks, onProgress, resume);
    return {onChainPath: tailTx, metadata: JSON.stringify({total_chunks: chunks.length})};
}

export async function codeIn(
    signer: Signer,
    data: string | string[],
    filename = "",
    filetype = "",
    onProgress?: (pct: number) => void,
    resume?: UploadCheckpoint,
): Promise<string> {
    const dataStr = Array.isArray(data) ? data.join("") : data;
    const contract = getContract(signer);
    const target = await contract.getAddress();

    // A checkpoint with finalizedTx means the fee-paying tx already landed on
    // a previous attempt; skipping straight to the pointer bump keeps the fee
    // from ever being charged twice.
    let txHash = resume?.finalizedTx;
    let checkpoint: UploadCheckpoint = resume ?? {beforeTx: "Genesis", sentChunks: 0};
    if (!txHash) {
        const {onChainPath} = await prepareUpload(signer, dataStr, onProgress, resume); // uppad the data here

        // handle = inline data or filename, tailTx = linked list tail or ""
        const handle = onChainPath === "" ? dataStr : (filename || "data");
        const tailTx = onChainPath;
        checkpoint = {beforeTx: tailTx || "Genesis", sentChunks: toChunks(dataStr).length};

        // Read current chain tail to pass as beforeUserTx (staleness check)
        const userAddress = await signer.getAddress();
        const beforeUserTx = await contract.userTxChainTail(userAddress); // zo last github tx

        // Fee paid here: basicFee for inline payloads (tailTx === ""),
        // linkedListFee when a sendCode chain was used. Mirrors solana's
        // user_inventory_code_in branch.
        const value = await resolveCodeInFee(signer, tailTx);
        try {
            txHash = await sendMined(signer, () => contract.userInventoryCodeIn(
                handle,
                tailTx,
                filetype || "text/plain",
                "0",
                beforeUserTx,
                {value},
            ), target);
        } catch (err) {
            // Inline uploads keep sentChunks 0 so a retry re-runs the (unpaid)
            // finalize; linked uploads keep the whole chain.
            if (!tailTx) checkpoint = {beforeTx: "Genesis", sentChunks: 0};
            throw new UploadInterrupted("code-in finalize interrupted", checkpoint, err);
        }
    }

    // Free pointer bump.
    const minedHash = txHash;
    try {
        await sendMined(signer, () => contract.updateUserTxChainTail(minedHash), target);
    } catch (err) {
        throw new UploadInterrupted("chain-tail bump interrupted", {...checkpoint, finalizedTx: minedHash}, err);
    }
    return minedHash;
}
