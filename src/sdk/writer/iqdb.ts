// =============================================================================
//  IQDB + Connection Writer — TxChainTail 2-tx pattern
// =============================================================================
//
//  Naming convention: every SDK writer accepts the raw human-readable
//  `tableName` (or `dbRootId`). Conversion to bytes32 seeds happens in one
//  place, `toSeed`, which is just `keccak256(utf8(name))`. The contract
//  stores the raw name alongside the seed in DbRoot, so reads can surface
//  the full name without ever re-hashing.
//
//  writeRow / manageRowData / writeConnectionRow follow the two-tx pattern:
//    1. prepareUpload (inline or sendCode chain)
//    2. dbCodeIn / dbInstructionCodeIn / walletConnectionCodeIn
//       (passes the current txChainTail as beforeDataTx for staleness check)
//    3. updateXxxTxChainTail(myTxHash) [payable, LINKED_LIST_FEE]

import { type Signer, parseEther, toUtf8Bytes, ZeroAddress, id as keccak } from "ethers";
import { getContract } from "../../contract";
import { LINKED_LIST_FEE } from "../constants";
import { prepareUpload } from "./code_in";
import { deriveDmSeed } from "../utils/hash";

function toSeed(s: string) { return keccak(s); }
function toBytes(s: string) { return toUtf8Bytes(s); }
const fee = { value: parseEther(LINKED_LIST_FEE) };

export async function initializeDbRoot(signer: Signer, dbRootId: string) {
  const c = getContract(signer);
  const tx = await c.initializeDbRoot(toSeed(dbRootId));
  return (await tx.wait())!.hash;
}

export async function manageTableCreators(
  signer: Signer, dbRootId: string, tableCreators: string[], extCreators: string[],
) {
  const c = getContract(signer);
  const tx = await c.manageTableCreators(toSeed(dbRootId), tableCreators, extCreators);
  return (await tx.wait())!.hash;
}

export async function createTable(
  signer: Signer,
  dbRootId: string,
  tableName: string,
  columns: string[],
  idCol: string,
  extKeys: string[] = [],
  gate = { tokenAddress: ZeroAddress, amount: 0, gateType: 0 },
  writers: string[] = [],
  isPrivate = false,
) {
  const c = getContract(signer);
  const args = [
    toSeed(dbRootId), tableName,
    columns.map(toBytes), toBytes(idCol), extKeys.map(toBytes), gate, writers,
  ] as const;
  const tx = isPrivate
    ? await c.createPrivateTable(...args, fee)
    : await c.createTable(...args, fee);
  return (await tx.wait())!.hash;
}

export async function updateTable(
  signer: Signer,
  dbRootId: string,
  tableName: string,
  columns: string[],
  idCol: string,
  extKeys: string[] = [],
  gate = { tokenAddress: ZeroAddress, amount: 0, gateType: 0 },
  writers: string[] = [],
) {
  const c = getContract(signer);
  const tx = await c.updateTable(
    toSeed(dbRootId), tableName,
    columns.map(toBytes), toBytes(idCol), extKeys.map(toBytes), gate, writers,
  );
  return (await tx.wait())!.hash;
}

export async function writeRow(
  signer: Signer,
  dbRootId: string,
  tableName: string,
  rowJson: string,
  onProgress?: (pct: number) => void,
) {
  const { onChainPath, metadata } = await prepareUpload(signer, rowJson, onProgress);
  const c = getContract(signer);
  const rootIdBytes = toSeed(dbRootId);
  const tableSeed = toSeed(tableName);

  const table = await c.getTable(rootIdBytes, tableSeed);
  const beforeDataTx: string = table.txChainTail;

  const tx = await c.dbCodeIn(rootIdBytes, tableSeed, onChainPath, metadata, beforeDataTx);
  const txHash = (await tx.wait())!.hash;

  const ptrTx = await c.updateTableTxChainTail(rootIdBytes, tableSeed, txHash, fee);
  await ptrTx.wait();
  return txHash;
}

export async function manageRowData(
  signer: Signer,
  dbRootId: string,
  tableName: string,
  rowJson: string,
  targetTx: string,
) {
  const { onChainPath, metadata } = await prepareUpload(signer, rowJson);
  const c = getContract(signer);
  const rootIdBytes = toSeed(dbRootId);
  const tableSeed = toSeed(tableName);

  const table = await c.getTable(rootIdBytes, tableSeed);
  const beforeDataTx: string = table.txChainTail;

  const tx = await c.dbInstructionCodeIn(
    rootIdBytes, tableSeed, targetTx, onChainPath, metadata, beforeDataTx,
  );
  const txHash = (await tx.wait())!.hash;

  const ptrTx = await c.updateTableTxChainTail(rootIdBytes, tableSeed, txHash, fee);
  await ptrTx.wait();
  return txHash;
}

export async function requestConnection(
  signer: Signer,
  dbRootId: string,
  receiver: string,
  tableName: string,
  columns: string[],
  idCol: string,
  extKeys: string[] = [],
) {
  const sender = await signer.getAddress();
  const connectionSeed = deriveDmSeed(sender, receiver);
  const c = getContract(signer);
  const tx = await c.requestConnection(
    toSeed(dbRootId), connectionSeed, receiver,
    tableName, columns.map(toBytes), toBytes(idCol), extKeys.map(toBytes), fee,
  );
  return (await tx.wait())!.hash;
}

export async function manageConnection(
  signer: Signer, otherParty: string, dbRootId: string, newStatus: number,
) {
  const sender = await signer.getAddress();
  const connectionSeed = deriveDmSeed(sender, otherParty);
  const c = getContract(signer);
  const tx = await c.manageConnection(otherParty, toSeed(dbRootId), connectionSeed, newStatus);
  return (await tx.wait())!.hash;
}

export async function writeConnectionRow(
  signer: Signer,
  otherParty: string,
  dbRootId: string,
  rowJson: string,
  onProgress?: (pct: number) => void,
) {
  const sender = await signer.getAddress();
  const connectionSeed = deriveDmSeed(sender, otherParty);
  const { onChainPath, metadata } = await prepareUpload(signer, rowJson, onProgress);
  const c = getContract(signer);
  const rootIdBytes = toSeed(dbRootId);

  const connKey = await c.getConnectionKey(sender, otherParty, rootIdBytes, connectionSeed);
  const conn = await c.getConnection(connKey);
  const beforeDataTx: string = conn.txChainTail;

  const tx = await c.walletConnectionCodeIn(
    otherParty, rootIdBytes, connectionSeed, onChainPath, metadata, beforeDataTx,
  );
  const txHash = (await tx.wait())!.hash;

  const ptrTx = await c.updateConnectionTxChainTail(
    otherParty, rootIdBytes, connectionSeed, txHash, fee,
  );
  await ptrTx.wait();
  return txHash;
}

export async function updateUserMetadata(signer: Signer, metadata: string | Uint8Array) {
  const c = getContract(signer);
  const tx = await c.updateUserMetadata(typeof metadata === "string" ? toUtf8Bytes(metadata) : metadata);
  return (await tx.wait())!.hash;
}
