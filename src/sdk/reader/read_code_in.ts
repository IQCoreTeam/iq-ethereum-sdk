import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { readSendCodeChain } from "./txchain";

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

  const [handle, tailTx, typeField, offset] = parsed.args;
  const meta = { handle, typeField, offset };

  // inline: tailTx empty means data is embedded in the metadata fields
  if (!tailTx || tailTx === "") {
    return { metadata: meta, data: handle };
  }

  // linked list: follow the chain
  const data = await readSendCodeChain(tailTx, onProgress);
  return { metadata: meta, data };
}
