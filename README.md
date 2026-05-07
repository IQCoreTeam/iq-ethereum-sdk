# IQLabs Ethereum SDK

> **Draft**: This document is in progress and will be refined.

The Ethereum port of the IQLabs SDK. Same primitives — on-chain data storage, IQDB tables, friend connections, and end-to-end encryption — built on `ethers v6` and a single deployed contract.

```bash
npm install @iqlabs-official/ethereum-sdk
```

---

## Table of Contents

1. [Core Concepts](#core-concepts)
   - [Data Storage (Code In)](#data-storage-code-in)
   - [User State](#user-state)
   - [Connection State](#connection-state)
   - [Database Tables](#database-tables)
   - [Token & Collection Gating](#token--collection-gating)
   - [Encryption (Crypto)](#encryption-crypto)

2. [Function Details](#function-details)
   - [Data Storage and Retrieval](#data-storage-and-retrieval)
   - [Connection Management](#connection-management)
   - [Table Management](#table-management)
   - [Encryption](#encryption)
   - [Environment Settings](#environment-settings)

2.1. [Advanced Functions](#advanced-functions) (list only)

---

## Core Concepts

These are the key concepts to know before using the IQLabs Ethereum SDK.

---

### Data Storage (Code In)

This is how you store any data (files, text, JSON) on-chain. Data is inscribed into transaction calldata; nothing is written to contract storage. Reads reconstruct data by walking a linked list of transactions.

#### How is it stored?

Depending on data size, the SDK picks the optimal method:

- **Inline (small)**: data fits in a single transaction's metadata field — no chunking
- **Linked list (large)**: data is split into chunks (`CHUNK_SIZE`), uploaded via `sendCode()` calls in batches up to ~96 KB each, and the tail tx hash is recorded

#### Key related functions

- [`codeIn()`](#codein): upload data and get a transaction hash
- [`readCodeIn()`](#readcodein): read data back from a transaction hash

---

### User State

An on-chain record per user address — managed by the contract, not a separate account/PDA.

#### What gets stored?

- User-set metadata (name, profile, bio — anything you serialize and pass to `updateUserMetadata`)
- `userTxChainTail`: the most recent inventory write, used as the head of the user's tx-chain

#### When is it created?

There is no explicit "create user" step. The first `codeIn()` call writes both the inventory entry and advances the chain tail. Each tx-chain write costs a small `BASIC_FEE` for the pointer-update step (the second of the two transactions).

---

### Connection State

An on-chain relationship between two addresses (friends, DM channels, etc.).

#### What states can it have?

- **pending**: a request was sent but not accepted yet
- **approved**: the request was accepted and the users are connected
- **blocked**: one side blocked the other

> **Important**: A blocked connection can only be unblocked by the blocker.

#### Key related functions

- [`requestConnection()`](#requestconnection): send a friend request (creates pending)
- [`manageConnection()`](#manageconnection): approve/reject/block/unblock a request
- [`readConnection()`](#readconnection): check current relationship status
- [`writeConnectionRow()`](#writeconnectionrow): exchange messages/data with a connected friend
- [`fetchUserConnections()`](#fetchuserconnections): fetch all of a user's connections

---

### Database Tables

Store JSON data in tables like a database.

#### How are tables created?

Use [`createTable()`](#createtable) before writing rows. (Unlike the Solana SDK, tables must exist before `writeRow()` is called — the row write reads the table's `txChainTail` for staleness check.)

> **Note**: A table is uniquely identified by the combination of `dbRootId` and `tableName`. Both are hashed with `keccak256` internally to form mapping keys.

#### Key related functions

- [`initializeDbRoot()`](#initializedbroot): create the database root for a `dbRootId`
- [`createTable()`](#createtable) / [`updateTable()`](#updatetable): create or modify a table's schema/gate
- [`writeRow()`](#writerow): add a new row
- [`readTableRows()`](#readtablerows): read rows from a table
- [`getTablelistFromRoot()`](#gettablelistfromroot): list all tables in a database

---

### Token & Collection Gating

Tables can be gated so that only users holding a specific ERC-20 token or ERC-721 collection can write data.

#### Gate Types

| Type | `gateType` | Description |
|------|-----------|-------------|
| **Token** (ERC-20) | `0` | User must hold >= `amount` of the specified token contract |
| **Collection** (ERC-721) | `1` | User must hold any NFT from the specified collection contract |

#### How it works

- **Table creator** sets the gate when creating or updating a table
- **Writers** only need to hold the required asset — the contract checks balance on-chain when `writeRow()` is called
- If `tokenAddress` is `ZeroAddress`, the table is public (default behavior)

#### Gate parameter

```typescript
gate?: {
  tokenAddress: string;  // ERC-20 or ERC-721 contract address (ZeroAddress for public)
  amount: number;        // minimum balance (ignored for collection gate)
  gateType: 0 | 1;       // 0 = token, 1 = collection
}
```

#### Notes

- For **token gates**, `amount` is the minimum balance required (e.g., 100 means "must hold >= 100 tokens", in raw units — apply your own decimal scaling)
- For **collection gates**, the user can present any NFT from that collection. `amount` is ignored
- Omitting `gate` (or passing `{ tokenAddress: ZeroAddress, amount: 0, gateType: 0 }`) creates a public table

---

### Encryption (Crypto)

The SDK includes a built-in encryption module (`iqlabs.crypto`) for encrypting data before storing it on-chain. Identical primitives to the Solana SDK so the same plaintext can flow across chains.

#### Three encryption modes

- **DH Encryption** (single recipient): Ephemeral X25519 ECDH → HKDF-SHA256 → AES-256-GCM. Use when encrypting data for one specific recipient.
- **Password Encryption**: PBKDF2-SHA256 (250k iterations) → AES-256-GCM. Use for password-protected data that anyone with the password can decrypt.
- **Multi-recipient Encryption** (PGP-style hybrid): Generates a random content encryption key (CEK), encrypts data once, then wraps the CEK for each recipient via ECDH. Use when encrypting data for multiple recipients.

#### Key derivation

Users can derive a deterministic X25519 keypair from their wallet signature using [`deriveX25519Keypair()`](#derivex25519keypair). Their wallet *is* the key — no separate keystore.

#### Key related functions

- [`deriveX25519Keypair()`](#derivex25519keypair): derive encryption keypair from wallet
- [`dhEncrypt()`](#dhencrypt) / [`dhDecrypt()`](#dhdecrypt): single-recipient encryption
- [`passwordEncrypt()`](#passwordencrypt) / [`passwordDecrypt()`](#passworddecrypt): password-based encryption
- [`multiEncrypt()`](#multiencrypt) / [`multiDecrypt()`](#multidecrypt): multi-recipient encryption

---

## Function Details

### Data Storage and Retrieval

#### `codeIn()`

| **Parameters** | `signer`: `ethers.Signer`<br>`data`: data to upload (string or string[])<br>`filename`: optional filename (string, default: `""`)<br>`filetype`: file type hint (string, default: `""` → `"text/plain"`)<br>`onProgress`: optional progress callback `(percent: number) => void` |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';
import { Wallet, JsonRpcProvider } from 'ethers';

const signer = new Wallet(privateKey, new JsonRpcProvider(rpcUrl));

// Upload inline data
const txHash = await iqlabs.writer.codeIn(signer, 'Hello, blockchain!');

// Upload with filename + type (large data is chunked automatically)
const txHash2 = await iqlabs.writer.codeIn(
  signer,
  longString,
  'hello.txt',
  'text/plain',
  (pct) => console.log(`upload: ${pct.toFixed(1)}%`),
);
```

---

#### `readCodeIn()`

| **Parameters** | `txHash`: transaction hash (string)<br>`onProgress`: optional progress callback `(percent: number) => void` |
|----------|--------------------------|
| **Returns** | `{ metadata: { handle, typeField, offset, beforeUserTx }, data: string }` |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

const result = await iqlabs.reader.readCodeIn('0x5Xg7...');
console.log(result.data);              // 'Hello, blockchain!'
console.log(result.metadata.typeField); // 'text/plain'
```

---

### Connection Management

#### `requestConnection()`

| **Parameters** | `signer`: `ethers.Signer`<br>`dbRootId`: database ID (string)<br>`receiver`: counterparty address (string)<br>`tableName`: connection table name (string)<br>`columns`: column list (string[])<br>`idCol`: ID column (string)<br>`extKeys`: extension keys (string[], default: `[]`) |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

await iqlabs.writer.requestConnection(
  signer, 'my-db', friendAddress,
  'dm_table', ['message', 'timestamp'], 'message_id',
);
```

> The connection seed is derived deterministically from the two addresses via `deriveDmSeed(sender, receiver)`, so either party can recompute it.

---

#### `manageConnection()`

| **Parameters** | `signer`: `ethers.Signer`<br>`otherParty`: counterparty address (string)<br>`dbRootId`: database ID (string)<br>`newStatus`: new status (number — `0` pending, `1` approved, `2` blocked) |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

// Approve a friend request
await iqlabs.writer.manageConnection(signer, friendAddress, 'my-db', 1);

// Block a user
await iqlabs.writer.manageConnection(signer, friendAddress, 'my-db', 2);
```

---

#### `readConnection()`

| **Parameters** | `dbRootId`: database ID (string)<br>`partyA`: first wallet (string)<br>`partyB`: second wallet (string) |
|----------|--------------------------|
| **Returns** | `{ status: 'pending' \| 'approved' \| 'blocked' \| 'unknown', requester: 'a' \| 'b', blocker: 'a' \| 'b' \| 'none' }` |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

const { status, requester, blocker } = await iqlabs.reader.readConnection(
  'my-db', addressA, addressB,
);
console.log(status); // 'pending' | 'approved' | 'blocked'
```

---

#### `writeConnectionRow()`

| **Parameters** | `signer`: `ethers.Signer`<br>`otherParty`: counterparty address (string)<br>`dbRootId`: database ID (string)<br>`rowJson`: JSON data (string)<br>`onProgress`: optional progress callback `(percent: number) => void` |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

await iqlabs.writer.writeConnectionRow(
  signer, friendAddress, 'my-db',
  JSON.stringify({ message_id: '123', message: 'Hello friend!', timestamp: Date.now() }),
);
```

---

#### `readConnectionRows()`

Read all rows written between two parties on the connection's tx-chain.

| **Parameters** | `dbRootId`: database ID (string)<br>`partyA`: first wallet (string)<br>`partyB`: second wallet (string)<br>`options`: `{ limit?: number }` (optional) |
|----------|--------------------------|
| **Returns** | `Array<{ txHash: string, data: any }>` (most recent first) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

const messages = await iqlabs.reader.readConnectionRows('my-db', myAddr, friendAddr, { limit: 50 });
messages.forEach(m => console.log(m.data));
```

---

#### `fetchUserConnections()`

Fetch all connection records for a user. Unlike the Solana SDK (which scans tx history), the Ethereum contract maintains an indexed list of connection keys per address, so this is a direct on-chain read.

| **Parameters** | `userAddress`: user address (string) |
|----------|--------------------------|
| **Returns** | `Array<{ connectionKey, partyA, partyB, status }>` |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';

const connections = await iqlabs.reader.fetchUserConnections(myAddress);

const pending  = connections.filter(c => c.status === 'pending');
const friends  = connections.filter(c => c.status === 'approved');
const blocked  = connections.filter(c => c.status === 'blocked');
```

---

### Table Management

#### `initializeDbRoot()`

Initialize a database root before any tables are created under it. Required once per `dbRootId`.

| **Parameters** | `signer`: `ethers.Signer`<br>`dbRootId`: database ID (string) |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
await iqlabs.writer.initializeDbRoot(signer, 'my-db');
```

---

#### `createTable()`

| **Parameters** | `signer`: `ethers.Signer`<br>`dbRootId`: database ID (string)<br>`tableName`: table name (string)<br>`columns`: column names (string[])<br>`idCol`: ID column (string)<br>`extKeys`: extension keys (string[], default: `[]`)<br>`gate`: optional access gate, see [Token & Collection Gating](#token--collection-gating)<br>`writers`: optional writer whitelist (`string[]`, default: `[]`)<br>`isPrivate`: create private table (boolean, default: `false`) |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';
import { ZeroAddress } from 'ethers';

// Public table
await iqlabs.writer.createTable(
  signer, 'my-db', 'users', ['name', 'email'], 'user_id',
);

// Token-gated table (ERC-20, must hold >= 100)
await iqlabs.writer.createTable(
  signer, 'my-db', 'vip', ['name'], 'user_id', [],
  { tokenAddress: erc20Address, amount: 100, gateType: 0 },
);

// NFT-collection-gated table (ERC-721)
await iqlabs.writer.createTable(
  signer, 'my-db', 'holders', ['name'], 'user_id', [],
  { tokenAddress: nftAddress, amount: 0, gateType: 1 },
);
```

---

#### `updateTable()`

Modify an existing table's schema/gate/writers. Same parameters as `createTable()` minus `isPrivate`.

| **Parameters** | `signer`, `dbRootId`, `tableName`, `columns`, `idCol`, `extKeys`, `gate`, `writers` |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

---

#### `writeRow()`

| **Parameters** | `signer`: `ethers.Signer`<br>`dbRootId`: database ID (string)<br>`tableName`: table name (string)<br>`rowJson`: JSON row data (string)<br>`onProgress`: optional progress callback `(percent: number) => void` |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
await iqlabs.writer.writeRow(signer, 'my-db', 'users', JSON.stringify({
  id: 1, name: 'Alice', email: 'alice@example.com',
}));
```

> Each `writeRow` call is a 2-tx flow: the data write (`dbCodeIn`) and a pointer-update (`updateTableTxChainTail`) which charges `LINKED_LIST_FEE`. The SDK awaits both before returning.

---

#### `readTableRows()`

Walk the table's tx-chain backwards from the tail and reconstruct each row.

| **Parameters** | `dbRootId`: database ID (string)<br>`tableName`: table name (string)<br>`options`: `{ limit?: number }` (optional) |
|----------|--------------------------|
| **Returns** | `Array<{ txHash: string, data: any }>` (most recent first; `data` is parsed JSON when possible) |

**Example:**
```typescript
const rows = await iqlabs.reader.readTableRows('my-db', 'users', { limit: 50 });
rows.forEach(r => console.log(r.data));
```

---

#### `getTablelistFromRoot()`

| **Parameters** | `dbRootId`: database ID (string) |
|----------|--------------------------|
| **Returns** | `{ creator: string, tables: TableEntry[], globalTables: TableEntry[] }` where `TableEntry = { name, seedHex }` |

**Example:**
```typescript
const result = await iqlabs.reader.getTablelistFromRoot('my-db');
console.log('Creator:', result.creator);
result.tables.forEach(t => console.log(t.name, t.seedHex));
```

---

#### `fetchInventoryTransactions()`

Walk a user's inventory tx-chain (everything they've uploaded via `codeIn`).

| **Parameters** | `userAddress`: user address (string)<br>`options`: `{ limit?: number }` (optional) |
|----------|--------------------------|
| **Returns** | `Array<{ txHash, handle, tailTx, typeField, offset }>` |

**Example:**
```typescript
const myFiles = await iqlabs.reader.fetchInventoryTransactions(myAddress, { limit: 20 });
myFiles.forEach(tx => {
  console.log(`${tx.txHash}: ${tx.handle} (${tx.typeField})`);
});
```

---

### Encryption

#### `deriveX25519Keypair()`

Derive a deterministic X25519 keypair from a wallet signature. The same wallet always produces the same keypair.

| **Parameters** | `signMessage`: function `(msg: Uint8Array) => Promise<Uint8Array>` |
|----------|--------------------------|
| **Returns** | `{ privKey: Uint8Array, pubKey: Uint8Array }` |

**Example:**
```typescript
import iqlabs from '@iqlabs-official/ethereum-sdk';
import { getBytes } from 'ethers';

// Adapter: ethers signMessage returns a hex string; convert to bytes.
const sign = async (msg: Uint8Array) => getBytes(await signer.signMessage(msg));

const { privKey, pubKey } = await iqlabs.crypto.deriveX25519Keypair(sign);
```

---

#### `dhEncrypt()`

| **Parameters** | `recipientPubHex`: recipient X25519 pubkey (hex)<br>`plaintext`: data to encrypt (Uint8Array) |
|----------|--------------------------|
| **Returns** | `{ senderPub, iv, ciphertext }` (all hex) |

#### `dhDecrypt()`

| **Parameters** | `privKey`: recipient private key (Uint8Array)<br>`senderPubHex`: sender pubkey (hex)<br>`ivHex`, `ciphertextHex` (hex) |
|----------|--------------------------|
| **Returns** | `Uint8Array` (decrypted plaintext) |

**Example:**
```typescript
const enc = await iqlabs.crypto.dhEncrypt(recipientPubHex, new TextEncoder().encode('secret'));
const dec = await iqlabs.crypto.dhDecrypt(myPrivKey, enc.senderPub, enc.iv, enc.ciphertext);
```

---

#### `passwordEncrypt()` / `passwordDecrypt()`

| **Parameters (encrypt)** | `password`: string<br>`plaintext`: Uint8Array |
|----------|--------------------------|
| **Returns (encrypt)** | `{ salt, iv, ciphertext }` (all hex) |
| **Parameters (decrypt)** | `password`, `saltHex`, `ivHex`, `ciphertextHex` |
| **Returns (decrypt)** | `Uint8Array` |

**Example:**
```typescript
const enc = await iqlabs.crypto.passwordEncrypt('my-password', new TextEncoder().encode('secret'));
const dec = await iqlabs.crypto.passwordDecrypt('my-password', enc.salt, enc.iv, enc.ciphertext);
```

---

#### `multiEncrypt()` / `multiDecrypt()`

| **Parameters (encrypt)** | `recipientPubHexes`: string[]<br>`plaintext`: Uint8Array |
|----------|--------------------------|
| **Returns (encrypt)** | `{ recipients: RecipientEntry[], iv, ciphertext }` |
| **Parameters (decrypt)** | `privKey`: Uint8Array<br>`pubKeyHex`: your pubkey (hex)<br>`encrypted`: the `MultiEncryptResult` |
| **Returns (decrypt)** | `Uint8Array` |

**Example:**
```typescript
const enc = await iqlabs.crypto.multiEncrypt(
  [alicePubHex, bobPubHex, carolPubHex],
  new TextEncoder().encode('group secret'),
);

// Each recipient decrypts with their own key
const plaintext = await iqlabs.crypto.multiDecrypt(alicePrivKey, alicePubHex, enc);
```

---

### Environment Settings

#### `setRpcUrl()`

Override the RPC URL used by all reader functions. Default: `https://rpc.sepolia.org`. Falls back to env vars `IQLABS_RPC_ENDPOINT`, `ETHEREUM_RPC_URL`, or `RPC_URL` if unset.

| **Parameters** | `url`: Ethereum RPC URL (string) |
|----------|--------------------------|
| **Returns** | void |

**Example:**
```typescript
iqlabs.setRpcUrl('https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY');
```

> **Note**: Writers (`signer`-based functions) use the provider attached to the `Signer`, not this URL. `setRpcUrl` only affects readers.

#### `getRpcUrl()`

| **Returns** | `string` — the currently configured RPC URL |

```typescript
console.log(iqlabs.getRpcUrl());
```

---

### User Metadata

#### `updateUserMetadata()`

| **Parameters** | `signer`: `ethers.Signer`<br>`metadata`: `string \| Uint8Array` |
|----------|--------------------------|
| **Returns** | Transaction hash (string) |

**Example:**
```typescript
await iqlabs.writer.updateUserMetadata(signer, JSON.stringify({ name: 'Alice', bio: 'gm' }));
```

---

## Advanced Functions

These are advanced/internal helpers; this doc lists them only. See API docs (in progress) for details.

- `prepareUpload()` / `uploadLinkedList()` / `toChunks()` (`writer`)
- `manageRowData()` (`writer`) — overwrite a specific row by `targetTx`
- `manageTableCreators()` (`writer`)
- `readUserState()` (`reader`)
- `fetchTableMeta()` (`reader`)
- `readSendCodeChain()` / `walkCalldataChain()` / `isEnd()` (`reader`)
- `deriveDmSeed()` (`utils`)
- `hexToBytes()` / `bytesToHex()` / `validatePubKey()` (`crypto`)

---

## Contract

Default deployed address (Sepolia): [`0xa580a977a3103565993531d19536220A54783397`](https://sepolia.etherscan.io/address/0xa580a977a3103565993531d19536220A54783397)

To use a different deployment, pass the address to `getContract()`:

```typescript
import { getContract } from '@iqlabs-official/ethereum-sdk/dist/contract';
const c = getContract(signer, '0xYourDeployment');
```

---

## Additional Resources

- [IQLabs Official X](https://x.com/IQLabsOfficial)
- [IQLabs Official Website](https://iqlabs.dev)
