// =============================================================================
//  IQDB + Connection Writer — fee charged on the code-in tx, tail update free
// =============================================================================
//
//  Naming convention: every SDK writer accepts the raw human-readable
//  `tableName` (or `dbRootId`). Conversion to bytes32 seeds happens in one
//  place, `toSeed`, which is just `keccak256(utf8(name))`. The contract
//  stores the raw name alongside the seed in DbRoot, so reads can surface
//  the full name without ever re-hashing.
//
//  Fee placement (post-0.2.0, matches solana):
//    - dbCodeIn / walletConnectionCodeIn / userInventoryCodeIn  -> payable
//      (basicFee for inline, linkedListFee when a sendCode chain is used)
//    - updateTableTxChainTail / updateConnectionTxChainTail / updateUserTxChainTail
//      -> free pointer bumps (no value, nonpayable in 0.2.0 contract)
//    - createTable / createPrivateTable -> payable tableCreationFee
//      (per-root override or global default), split 31% feeReceiver /
//      69% root.creator inside the contract
//    - dbInstructionCodeIn / requestConnection / manageConnection -> free

import { type Signer, toUtf8Bytes, ZeroAddress, id as keccak } from "ethers";
import { getContract } from "../../contract";
import { prepareUpload, toChunks } from "./code_in";
import { sendMined, UploadInterrupted, type UploadCheckpoint } from "./resilient";
import { deriveDmSeed } from "../utils/hash";
import {
  resolveCodeInFee,
  getEffectiveTableCreationFee,
} from "../utils/fees";

function toSeed(s: string) { return keccak(s); }
function toBytes(s: string) { return toUtf8Bytes(s); }

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
  const value = await getEffectiveTableCreationFee(signer, dbRootId);
  const tx = isPrivate
    ? await c.createPrivateTable(...args, { value })
    : await c.createTable(...args, { value });
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
  resume?: UploadCheckpoint,
) {
  const c = getContract(signer);
  const target = await c.getAddress();
  const rootIdBytes = toSeed(dbRootId);
  const tableSeed = toSeed(tableName);

  // A checkpoint with finalizedTx means the fee-paying dbCodeIn already
  // landed on a previous attempt; only the free pointer bump remains.
  let txHash = resume?.finalizedTx;
  let checkpoint: UploadCheckpoint = resume ?? { beforeTx: "Genesis", sentChunks: 0 };
  if (!txHash) {
    const { onChainPath, metadata } = await prepareUpload(signer, rowJson, onProgress, resume);
    checkpoint = onChainPath
      ? { beforeTx: onChainPath, sentChunks: toChunks(rowJson).length }
      : { beforeTx: "Genesis", sentChunks: 0 };

    const table = await c.getTable(rootIdBytes, tableSeed);
    const beforeDataTx: string = table.txChainTail;

    const value = await resolveCodeInFee(signer, onChainPath);
    try {
      txHash = await sendMined(signer, () => c.dbCodeIn(
        rootIdBytes, tableSeed, onChainPath, metadata, beforeDataTx, { value },
      ), target);
    } catch (err) {
      throw new UploadInterrupted("row write interrupted", checkpoint, err);
    }
  }

  const minedHash = txHash;
  try {
    await sendMined(signer, () => c.updateTableTxChainTail(rootIdBytes, tableSeed, minedHash), target);
  } catch (err) {
    throw new UploadInterrupted("table-tail bump interrupted", { ...checkpoint, finalizedTx: minedHash }, err);
  }
  return minedHash;
}

// Phase state for writeRowWithInventory, so a retry never re-uploads chunks or
// re-pays a fee that already landed. Carried on HybridInterrupted.checkpoint.
export interface HybridCheckpoint {
  upload?: UploadCheckpoint; // sendCode chunk-upload progress (phase 1)
  onChainPath?: string;      // set once the chunks are uploaded
  metadata?: string;         // dbCodeIn inline/header payload from prepareUpload
  boardTx?: string;          // set once the board dbCodeIn landed (phase 2)
  inventoryTx?: string;      // set once the user's userInventoryCodeIn landed (phase 3)
}

export class HybridInterrupted extends Error {
  constructor(message: string, readonly checkpoint: HybridCheckpoint, readonly cause?: unknown) {
    super(message);
    this.name = "HybridInterrupted";
  }
}

// Board row + native inventory in one flow, split across two signers. The
// `chunkSigner` (a browser burner) uploads the content chunks AND writes the
// shared board row (dbCodeIn) — these are the big-calldata sendCode txs that a
// wallet flags as "unsimulatable / risky", so keeping them off the wallet
// removes the warning and the per-batch popups. The `finalizeSigner` (the real
// wallet) signs only the user's native inventory entry (userInventoryCodeIn +
// tail bump), which is small-calldata and simulates cleanly. Both the board row
// and the inventory entry reference the SAME uploaded chunks (onChainPath), so
// the content is stored once. This mirrors solana's single writeRow that
// touches the feed table and the inventory PDA together; on EVM the inventory
// is keyed by msg.sender, so its write must be signed by the user, not the
// burner. `who` (the author) lives inside rowJson, so the board attributes to
// the user regardless of which key signed dbCodeIn.
export async function writeRowWithInventory(
  chunkSigner: Signer,
  finalizeSigner: Signer,
  dbRootId: string,
  tableName: string,
  rowJson: string,
  opts: {
    filename?: string;
    filetype?: string;
    onProgress?: (pct: number) => void;
    resume?: HybridCheckpoint;
  } = {},
): Promise<{ boardTx: string; inventoryTx: string; onChainPath: string }> {
  const cp: HybridCheckpoint = { ...(opts.resume ?? {}) };
  const cChunk = getContract(chunkSigner);
  const chunkTarget = await cChunk.getAddress();
  const rootIdBytes = toSeed(dbRootId);
  const tableSeed = toSeed(tableName);

  // Phase 1 — burner uploads the content chunks once (shared by board + inventory).
  if (cp.onChainPath === undefined) {
    try {
      const up = await prepareUpload(chunkSigner, rowJson, opts.onProgress, cp.upload);
      cp.onChainPath = up.onChainPath;
      cp.metadata = up.metadata;
    } catch (err) {
      if (err instanceof UploadInterrupted) cp.upload = err.checkpoint;
      throw new HybridInterrupted("chunk upload interrupted", cp, err);
    }
  }
  const onChainPath = cp.onChainPath;

  // Phase 2 — burner writes the shared board row (dbCodeIn -> table tail).
  if (!cp.boardTx) {
    try {
      const table = await cChunk.getTable(rootIdBytes, tableSeed);
      const beforeDataTx: string = table.txChainTail;
      const boardFee = await resolveCodeInFee(chunkSigner, onChainPath);
      const boardTx = await sendMined(chunkSigner, () => cChunk.dbCodeIn(
        rootIdBytes, tableSeed, onChainPath, cp.metadata, beforeDataTx, { value: boardFee },
      ), chunkTarget);
      await sendMined(chunkSigner, () => cChunk.updateTableTxChainTail(rootIdBytes, tableSeed, boardTx), chunkTarget);
      cp.boardTx = boardTx;
    } catch (err) {
      throw new HybridInterrupted("board write interrupted", cp, err);
    }
  }

  // Phase 3 — user writes the native inventory entry, pointing at the SAME chunks.
  const cFin = getContract(finalizeSigner);
  const finTarget = await cFin.getAddress();
  if (!cp.inventoryTx) {
    try {
      const userAddress = await finalizeSigner.getAddress();
      const beforeUserTx: string = await cFin.userTxChainTail(userAddress);
      const handle = onChainPath === "" ? rowJson : (opts.filename || "data");
      const invFee = await resolveCodeInFee(finalizeSigner, onChainPath);
      cp.inventoryTx = await sendMined(finalizeSigner, () => cFin.userInventoryCodeIn(
        handle, onChainPath, opts.filetype || "text/plain", "0", beforeUserTx, { value: invFee },
      ), finTarget);
    } catch (err) {
      throw new HybridInterrupted("inventory finalize interrupted", cp, err);
    }
  }

  // Free pointer bump for the user's inventory tail.
  try {
    await sendMined(finalizeSigner, () => cFin.updateUserTxChainTail(cp.inventoryTx!), finTarget);
  } catch (err) {
    throw new HybridInterrupted("inventory-tail bump interrupted", cp, err);
  }

  return { boardTx: cp.boardTx!, inventoryTx: cp.inventoryTx!, onChainPath };
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

  // dbInstructionCodeIn is free (mirrors solana db_instruction_code_in).
  const tx = await c.dbInstructionCodeIn(
    rootIdBytes, tableSeed, targetTx, onChainPath, metadata, beforeDataTx,
  );
  const txHash = (await tx.wait())!.hash;

  const ptrTx = await c.updateTableTxChainTail(rootIdBytes, tableSeed, txHash);
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
    tableName, columns.map(toBytes), toBytes(idCol), extKeys.map(toBytes),
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

  const value = await resolveCodeInFee(signer, onChainPath);
  const tx = await c.walletConnectionCodeIn(
    otherParty, rootIdBytes, connectionSeed, onChainPath, metadata, beforeDataTx,
    { value },
  );
  const txHash = (await tx.wait())!.hash;

  const ptrTx = await c.updateConnectionTxChainTail(
    otherParty, rootIdBytes, connectionSeed, txHash,
  );
  await ptrTx.wait();
  return txHash;
}

export async function updateUserMetadata(signer: Signer, metadata: string | Uint8Array) {
  const c = getContract(signer);
  const tx = await c.updateUserMetadata(typeof metadata === "string" ? toUtf8Bytes(metadata) : metadata);
  return (await tx.wait())!.hash;
}

// ---- Owner / root-owner administrative ops (added in 0.2.0) ----

// IQ-protocol owner only. Updates the contract-wide default tableCreationFee.
export async function setTableCreationFee(signer: Signer, newFee: bigint) {
  const c = getContract(signer);
  const tx = await c.setTableCreationFee(newFee);
  return (await tx.wait())!.hash;
}

// Root creator only. Pins this root's tableCreationFee (including 0 =
// "permanently free under this root"), making it ignore future changes to
// the global default until clearRootTableCreationFee is called.
export async function setRootTableCreationFee(
  signer: Signer, dbRootId: string, newFee: bigint,
) {
  const c = getContract(signer);
  const tx = await c.setRootTableCreationFee(toSeed(dbRootId), newFee);
  return (await tx.wait())!.hash;
}

// Root creator only. Drops the override, letting the global default apply
// again.
export async function clearRootTableCreationFee(signer: Signer, dbRootId: string) {
  const c = getContract(signer);
  const tx = await c.clearRootTableCreationFee(toSeed(dbRootId));
  return (await tx.wait())!.hash;
}

// Current root creator only. Hands ownership of this dbRoot (and its 69%
// share of future tableCreationFee collections) to `newCreator`.
export async function transferDbRootCreator(
  signer: Signer, dbRootId: string, newCreator: string,
) {
  const c = getContract(signer);
  const tx = await c.transferDbRootCreator(toSeed(dbRootId), newCreator);
  return (await tx.wait())!.hash;
}
