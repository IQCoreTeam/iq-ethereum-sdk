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

export async function uploadLinkedList(
  signer: Signer,
  chunks: string[],
  onProgress?: (pct: number) => void,
): Promise<string> {
  const contract = getContract(signer);
  let beforeTx = "Genesis";
  for (let i = 0; i < chunks.length; i++) {
    const tx = await contract.sendCode([chunks[i]], beforeTx, 0, 0);
    const receipt = await tx.wait();
    beforeTx = receipt!.hash;
    onProgress?.(((i + 1) / chunks.length) * 100);
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
  const { onChainPath, metadata } = await prepareUpload(signer, dataStr, onProgress);
  const contract = getContract(signer);
  // handle = inline data or filename, tailTx = linked list tail or ""
  const handle = onChainPath === "" ? metadata : (filename || "data");
  const tailTx = onChainPath;
  const tx = await contract.userInventoryCodeIn(
    handle,
    tailTx,
    filetype || "text/plain",
    "0",
    { value: parseEther(BASIC_FEE) },
  );
  const txHash = (await tx.wait())!.hash;
  // update user chain pointer so walkEventChain can traverse
  const ptrTx = await contract.updateUserChainTx(txHash);
  await ptrTx.wait();
  return txHash;
}
