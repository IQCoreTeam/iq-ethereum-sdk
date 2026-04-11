import { toUtf8String } from "ethers";
import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { walkEventChain } from "./txchain";

export async function readUserState(userAddress: string) {
  const c = getContract(getProvider());
  const rawMeta = await c.userMetadata(userAddress);
  const metadata = rawMeta && rawMeta !== "0x" ? toUtf8String(rawMeta) : null;
  const txChain = await c.userTxChains(userAddress);
  return { metadata, txChain: { nowTx: txChain.nowTx, beforeTx: txChain.beforeTx } };
}

export async function fetchInventoryTransactions(
  userAddress: string,
  options?: { limit?: number },
) {
  const c = getContract(getProvider());
  const txChain = await c.userTxChains(userAddress);
  if (!txChain.nowTx || txChain.nowTx === "") return [];

  const entries = await walkEventChain(txChain.nowTx, "UserInventoryCodeInEvent", options);
  return entries.map((e) => ({
    txHash: e.txHash,
    handle: e.args.handle as string,
    tailTx: e.args.tailTx as string,
  }));
}
