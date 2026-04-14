// =============================================================================
//  TxChain Reader — 연결리스트 순회 (SDK 핵심)
// =============================================================================
//
//  이더리움 컨트랙트의 구조:
//
//    userTxChainTail (mapping) ── 최신 userInventoryCodeIn tx hash
//           │
//           ▼
//    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
//    │ userInvCodeIn │ ── │ userInvCodeIn │ ── │ userInvCodeIn │
//    │ (tail)        │    │ (beforeUserTx)│    │ (Genesis)     │
//    │  tailTx───┐   │    │  tailTx───┐   │    │               │
//    └───────────┼───┘    └───────────┼───┘    └──────────────┘
//                ▼                    ▼
//           sendCode chain       sendCode chain
//           (calldata only)      (calldata only)
//
//  - "포인터 체인": userInventoryCodeIn tx들이 calldata의 beforeUserTx로 서로 연결
//  - "데이터 체인": 각 노드의 tailTx에서 시작하는 sendCode 순차 호출
//
//  Table, Connection도 동일 패턴 (txChainTail 필드 + dbCodeIn/walletConnectionCodeIn의 beforeDataTx).

import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";

export function isEnd(cursor: string) {
  return !cursor || cursor === "" || cursor === "Genesis";
}

// Reconstruct data from a sendCode linked list by walking calldata backwards.
export async function readSendCodeChain(
  tailTxHash: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const provider = getProvider();
  const contract = getContract(provider);
  const batches: string[][] = [];
  const visited = new Set<string>();
  let cursor = tailTxHash;
  let count = 0;

  while (!isEnd(cursor)) {
    if (visited.has(cursor)) throw new Error("Loop detected in sendCode chain");
    visited.add(cursor);

    const tx = await provider.getTransaction(cursor);
    if (!tx) throw new Error(`Transaction not found: ${cursor}`);

    const parsed = contract.interface.parseTransaction({ data: tx.data });
    if (!parsed || parsed.name !== "sendCode") throw new Error(`Unexpected function: ${parsed?.name}`);

    batches.push([...parsed.args[0]]); // codes[]
    cursor = parsed.args[1]; // beforeTx
    count++;
    onProgress?.((count / (count + 1)) * 100);
  }

  return batches.reverse().flat().join("");
}

// Walk a TxChain (Inscription/IQDB/Connection) backwards via calldata.
// beforeFieldName: "beforeUserTx" (Inscription) or "beforeDataTx" (IQDB/Connection)
// Returns each node's tx hash + parsed function args (caller maps fields to its own shape).
export async function walkCalldataChain(
  headTxHash: string,
  beforeFieldName: string,
  options?: { limit?: number },
): Promise<Array<{ txHash: string; args: any }>> {
  const provider = getProvider();
  const contract = getContract(provider);
  const results: Array<{ txHash: string; args: any }> = [];
  const visited = new Set<string>();
  let cursor = headTxHash;

  while (!isEnd(cursor)) {
    if (visited.has(cursor)) throw new Error("Loop detected in tx chain");
    visited.add(cursor);

    const tx = await provider.getTransaction(cursor);
    if (!tx) throw new Error(`Transaction not found: ${cursor}`);

    const parsed = contract.interface.parseTransaction({ data: tx.data });
    if (!parsed) throw new Error(`Failed to parse tx: ${cursor}`);

    results.push({ txHash: cursor, args: parsed.args });
    cursor = parsed.args[beforeFieldName] ?? "";
    if (options?.limit && results.length >= options.limit) break;
  }

  return results;
}
