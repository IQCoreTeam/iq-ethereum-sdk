import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { readSendCodeChain, isEnd } from "./txchain";

// Read a single userInventoryCodeIn tx and reconstruct its data.
// userInventoryCodeIn args: (handle, tailTx, typeField, offset, beforeUserTx)
export async function readCodeIn(
  txHash: string,
  onProgress?: (pct: number) => void,
): Promise<{ metadata: Record<string, string>; data: string }> {
  const provider = getProvider();
  const contract = getContract(provider);

  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error(`Transaction not found: ${txHash}`);

  const parsed = contract.interface.parseTransaction({ data: tx.data });
  if (!parsed || parsed.name !== "userInventoryCodeIn")
    throw new Error(`Unexpected function: ${parsed?.name}`);

  const [handle, tailTx, typeField, offset, beforeUserTx] = parsed.args;
  const meta = { handle, typeField, offset, beforeUserTx };

  // inline: tailTx empty → data is embedded in handle
  if (isEnd(tailTx)) {
    return { metadata: meta, data: handle };
  }

  const data = await readSendCodeChain(tailTx, onProgress);
  return { metadata: meta, data };
}
