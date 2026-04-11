import { id as keccak } from "ethers";
import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { deriveDmSeed } from "../utils/hash";
import { walkEventChain, readSendCodeChain } from "./txchain";

function toSeed(s: string) { return keccak(s); }

const STATUS_MAP = ["pending", "approved", "blocked"] as const;

export async function getTablelistFromRoot(dbRootId: string) {
  const c = getContract(getProvider());
  const root = await c.dbRoots(toSeed(dbRootId));
  if (!root.exists) throw new Error("DbRoot not found");
  return { creator: root.creator, tableSeeds: root.tableSeeds, globalTableSeeds: root.globalTableSeeds };
}

export async function fetchTableMeta(dbRootId: string, tableSeed: string) {
  const c = getContract(getProvider());
  const table = await c.getTable(toSeed(dbRootId), toSeed(tableSeed));
  if (!table.exists) throw new Error("Table not found");
  return table;
}

export async function readTableRows(
  dbRootId: string,
  tableSeed: string,
  options?: { limit?: number },
) {
  const table = await fetchTableMeta(dbRootId, tableSeed);
  const nowTx = table.dataChain.nowTx;
  if (!nowTx || nowTx === "") return [];

  const entries = await walkEventChain(nowTx, "DbCodeInEvent", options);
  const rows: Array<{ txHash: string; data: any }> = [];

  for (const entry of entries) {
    const onChainPath = entry.args.onChainPath as string;
    let data: string;
    if (!onChainPath || onChainPath === "") {
      // inline — data is in dbCodeIn calldata's metadata field (args[3])
      const tx = await getProvider().getTransaction(entry.txHash);
      const parsed = getContract(getProvider()).interface.parseTransaction({ data: tx!.data });
      data = parsed!.args[3]; // dbCodeIn(dbRootId, tableSeed, onChainPath, metadata)
    } else {
      // linked list — follow sendCode chain
      data = await readSendCodeChain(onChainPath);
    }

    try { rows.push({ txHash: entry.txHash, data: JSON.parse(data) }); }
    catch { rows.push({ txHash: entry.txHash, data }); }
  }

  return rows;
}

export async function readConnection(dbRootId: string, partyA: string, partyB: string) {
  const c = getContract(getProvider());
  const connectionSeed = deriveDmSeed(partyA, partyB);
  const connKey = await c.getConnectionKey(partyA, partyB, toSeed(dbRootId), connectionSeed);
  const info = await c.getConnection(connKey);

  if (!info.exists) return { status: "unknown" as const, requester: "a" as const, blocker: "none" as const };

  return {
    status: STATUS_MAP[info.status] ?? "unknown",
    requester: info.requester === 0 ? "a" as const : "b" as const,
    blocker: info.blocker === 255 ? "none" as const : info.blocker === 0 ? "a" as const : "b" as const,
  };
}

export async function fetchUserConnections(userAddress: string) {
  const c = getContract(getProvider());
  const connKeys: string[] = await c.getUserConnectionKeys(userAddress);
  const results: Array<{ connectionKey: string; partyA: string; partyB: string; status: string }> = [];

  for (const connKey of connKeys) {
    const info = await c.getConnection(connKey);
    if (!info.exists) continue;
    results.push({
      connectionKey: connKey,
      partyA: info.partyA,
      partyB: info.partyB,
      status: STATUS_MAP[info.status] ?? "unknown",
    });
  }

  return results;
}
