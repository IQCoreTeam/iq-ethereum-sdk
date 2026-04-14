import { toUtf8String } from "ethers";
import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { walkCalldataChain, isEnd } from "./txchain";

export async function readUserState(userAddress: string) {
  const c = getContract(getProvider());
  const rawMeta = await c.userMetadata(userAddress);
  const metadata = rawMeta && rawMeta !== "0x" ? toUtf8String(rawMeta) : null;
  const txChainTail = await c.userTxChainTail(userAddress);
  return { metadata, txChainTail };
}

export async function fetchInventoryTransactions(
  userAddress: string,
  options?: { limit?: number },
) {
  const c = getContract(getProvider());
  const tail = await c.userTxChainTail(userAddress);
  if (isEnd(tail)) return [];

  // userInventoryCodeIn args: (handle, tailTx, typeField, offset, beforeUserTx)
  const entries = await walkCalldataChain(tail, "beforeUserTx", options);
  return entries.map((e) => ({
    txHash: e.txHash,
    handle: e.args.handle as string,
    tailTx: e.args.tailTx as string,
    typeField: e.args.typeField as string,
    offset: e.args.offset as string,
  }));
}
