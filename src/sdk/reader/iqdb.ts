import { id as keccak } from "ethers";
import { getContract } from "../../contract";
import { getProvider } from "../utils/provider";
import { deriveDmSeed } from "../utils/hash";
import { walkCalldataChain, readSendCodeChain, isEnd } from "./txchain";

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

// Reconstruct the data payload for one TxChain node.
// dbCodeIn args: (dbRootId, tableSeed, onChainPath, metadata, beforeDataTx)
// walletConnectionCodeIn args: (otherParty, dbRootId, connectionSeed, onChainPath, metadata, beforeDataTx)
async function resolveRowData(args: any): Promise<string> {
  const onChainPath = args.onChainPath as string;
  const metadata = args.metadata as string;
  if (isEnd(onChainPath)) return metadata; // inline
  return await readSendCodeChain(onChainPath);
}

function tryParse(data: string): any {
  try { return JSON.parse(data); } catch { return data; }
}

export async function readTableRows(
  dbRootId: string,
  tableSeed: string,
  options?: { limit?: number },
) {
  const table = await fetchTableMeta(dbRootId, tableSeed);
  if (isEnd(table.txChainTail)) return [];

  const entries = await walkCalldataChain(table.txChainTail, "beforeDataTx", options);
  const rows: Array<{ txHash: string; data: any }> = [];
  for (const entry of entries) {
    const data = await resolveRowData(entry.args);
    rows.push({ txHash: entry.txHash, data: tryParse(data) });
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

export async function readConnectionRows(
  dbRootId: string,
  partyA: string,
  partyB: string,
  options?: { limit?: number },
) {
  const c = getContract(getProvider());
  const connectionSeed = deriveDmSeed(partyA, partyB);
  const connKey = await c.getConnectionKey(partyA, partyB, toSeed(dbRootId), connectionSeed);
  const info = await c.getConnection(connKey);
  if (!info.exists || isEnd(info.txChainTail)) return [];

  const entries = await walkCalldataChain(info.txChainTail, "beforeDataTx", options);
  const rows: Array<{ txHash: string; data: any }> = [];
  for (const entry of entries) {
    const data = await resolveRowData(entry.args);
    rows.push({ txHash: entry.txHash, data: tryParse(data) });
  }
  return rows;
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
