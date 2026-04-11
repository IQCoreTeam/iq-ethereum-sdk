import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";

function isEnd(cursor: string) {
  return !cursor || cursor === "" || cursor === "Genesis";
}

export async function readSendCodeChain(
  tailTxHash: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const provider = getProvider();
  const contract = getContract(provider);
  const chunks: string[] = [];
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

    chunks.push(...parsed.args[0]); // codes[]
    cursor = parsed.args[1]; // beforeTx
    count++;
    onProgress?.((count / (count + 1)) * 100);
  }

  return chunks.reverse().join("");
}

export async function walkEventChain(
  headTxHash: string,
  eventName: string,
  options?: { limit?: number },
): Promise<Array<{ txHash: string; args: Record<string, unknown> }>> {
  const provider = getProvider();
  const contract = getContract(provider);
  const results: Array<{ txHash: string; args: Record<string, unknown> }> = [];
  const visited = new Set<string>();
  let cursor = headTxHash;

  while (!isEnd(cursor)) {
    if (visited.has(cursor)) throw new Error("Loop detected in event chain");
    visited.add(cursor);

    const receipt = await provider.getTransactionReceipt(cursor);
    if (!receipt) throw new Error(`Receipt not found: ${cursor}`);

    let parsedEvent: any = null;
    for (const log of receipt.logs) {
      try {
        const p = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (p && p.name === eventName) { parsedEvent = p; break; }
      } catch { /* skip non-matching logs */ }
    }
    if (!parsedEvent) throw new Error(`Event ${eventName} not found in tx ${cursor}`);

    results.push({ txHash: cursor, args: Object.fromEntries(Object.entries(parsedEvent.args)) });
    cursor = parsedEvent.args.beforeTx ?? "";
    if (options?.limit && results.length >= options.limit) break;
  }

  return results;
}
