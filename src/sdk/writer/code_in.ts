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

import { type Signer, parseEther } from "ethers";
import { getContract } from "../../contract";
import { CHUNK_SIZE, DIRECT_METADATA_MAX_BYTES, BASIC_FEE } from "../constants";

export function toChunks(data: string | string[]): string[] {
  if (Array.isArray(data)) return data;
  const chunks: string[] = [];
  const buf = Buffer.from(data, "utf8");
  for (let i = 0; i < buf.length; i += CHUNK_SIZE) {
    chunks.push(buf.subarray(i, i + CHUNK_SIZE).toString("utf8"));
  }
  return chunks.length ? chunks : [""];
}

const MAX_CHUNKS_PER_TX = 400;

export async function uploadLinkedList(
  signer: Signer,
  chunks: string[],
  onProgress?: (pct: number) => void,
): Promise<string> {
  const contract = getContract(signer);
  let beforeTx = "Genesis";
  for (let i = 0; i < chunks.length; i += MAX_CHUNKS_PER_TX) {
    const batch = chunks.slice(i, i + MAX_CHUNKS_PER_TX);
    const tx = await contract.sendCode(batch, beforeTx, 0, 0);
    const receipt = await tx.wait();
    beforeTx = receipt!.hash;
    onProgress?.(Math.min(i + batch.length, chunks.length) / chunks.length * 100);
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

  // Advance chain tail (fee charged here)
  const ptrTx = await contract.updateUserTxChainTail(txHash, { value: parseEther(BASIC_FEE) });
  await ptrTx.wait();
  return txHash;
}
