// =============================================================================
//  Code-In Writer — TxChainTail 2-tx pattern
// =============================================================================
//
//  Write flow:
//    1. sendCode × N (chunk inscription, data lives in calldata only)
//    2. userInventoryCodeIn(handle, tailTx, ..., beforeUserTx)
//       - SDK reads userTxChainTail and passes it as beforeUserTx
//       - Contract does a staleness check
//    3. updateUserTxChainTail(myTxHash) [payable, BASIC_FEE]
//       - SDK passes the tx hash from step 2; fee is charged here

import { type Signer } from "ethers";
import { getContract } from "../../contract";
import { CHUNK_SIZE, DIRECT_METADATA_MAX_BYTES } from "../constants";
import { getBasicFee } from "../utils/fees";

export function toChunks(data: string | string[]): string[] {
  if (Array.isArray(data)) return data;
  const chunks: string[] = [];
  const buf = Buffer.from(data, "utf8");
  for (let i = 0; i < buf.length; i += CHUNK_SIZE) {
    chunks.push(buf.subarray(i, i + CHUNK_SIZE).toString("utf8"));
  }
  return chunks.length ? chunks : [""];
}

// Ethereum limits a transaction's total size to 128 KB (131072 bytes) —
// anything larger is rejected by most RPC providers (including Alchemy /
// Infura) with `oversized data`. We budget a conservative 96 KB of payload
// per sendCode batch to leave room for ABI encoding overhead (each dynamic
// string costs 32 bytes of length prefix + padding), the beforeTx field, the
// function selector, and signature.
const MAX_BATCH_PAYLOAD_BYTES = 96 * 1024;

// Split `chunks` into batches such that each batch's total UTF-8 byte size
// stays under MAX_BATCH_PAYLOAD_BYTES. A single chunk that exceeds the budget
// is still accepted as its own batch — CHUNK_SIZE should already be well
// below the limit, but this keeps the function total.
const batchChunks = (chunks: string[]): string[][] => {
  const batches: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const chunk of chunks) {
    const chunkBytes = Buffer.byteLength(chunk, "utf8");
    if (current.length > 0 && size + chunkBytes > MAX_BATCH_PAYLOAD_BYTES) {
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
): Promise<string> {
  const contract = getContract(signer);
  const batches = batchChunks(chunks);
  let beforeTx = "Genesis";
  let sentChunks = 0;
  for (const batch of batches) {
    const tx = await contract.sendCode(batch, beforeTx, 0, 0);
    const receipt = await tx.wait();
    beforeTx = receipt!.hash;
    sentChunks += batch.length;
    onProgress?.((sentChunks / chunks.length) * 100);
  }
  return beforeTx;
}

export async function prepareUpload(
  signer: Signer,
  data: string,
  onProgress?: (pct: number) => void,
): Promise<{ onChainPath: string; metadata: string }> {
  const chunks = toChunks(data);
  const isInline = chunks.length === 1 && Buffer.byteLength(chunks[0], "utf8") <= DIRECT_METADATA_MAX_BYTES;
  if (isInline) {
    return { onChainPath: "", metadata: data };
  }
  const tailTx = await uploadLinkedList(signer, chunks, onProgress);
  return { onChainPath: tailTx, metadata: JSON.stringify({ total_chunks: chunks.length }) };
}

export async function codeIn(
  signer: Signer,
  data: string | string[],
  filename = "",
  filetype = "",
  onProgress?: (pct: number) => void,
): Promise<string> {
  const dataStr = Array.isArray(data) ? data.join("") : data;
  const { onChainPath } = await prepareUpload(signer, dataStr, onProgress);
  const contract = getContract(signer);

  // handle = inline data or filename, tailTx = linked list tail or ""
  const handle = onChainPath === "" ? dataStr : (filename || "data");
  const tailTx = onChainPath;

  // Read current chain tail to pass as beforeUserTx (staleness check)
  const userAddress = await signer.getAddress();
  const beforeUserTx = await contract.userTxChainTail(userAddress);

  const tx = await contract.userInventoryCodeIn(
    handle,
    tailTx,
    filetype || "text/plain",
    "0",
    beforeUserTx,
  );
  const txHash = (await tx.wait())!.hash;

  // Advance chain tail (fee charged here). Fee is read from the contract so
  // it matches the active network (e.g. 0.0001 ETH on Sepolia, 6.5 MON on Monad).
  const value = await getBasicFee(signer);
  const ptrTx = await contract.updateUserTxChainTail(txHash, { value });
  await ptrTx.wait();
  return txHash;
}
