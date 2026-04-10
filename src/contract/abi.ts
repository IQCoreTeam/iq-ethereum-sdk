// =============================================================================
//  ABI for the CodeIn contract (Inscription + IQDB + Connection combined)
//  Source: artifacts/contracts/Connection.sol/CodeIn.json
// =============================================================================
//
//  NOTE: Ethereum stores ALL function call data (calldata) permanently on-chain.
//  Unlike Solana where logs are stored separately and may be unreliable,
//  Ethereum calldata is as permanent as any other on-chain data.
//
//  This means we have TWO ways to read data from a transaction:
//    1. calldata decoding: contract.interface.parseTransaction(tx) → all function params
//    2. event log parsing: receipt.logs → emitted event data
//
//  Our SDK primarily uses CALLDATA DECODING for reading data during TxChain traversal,
//  because getTransaction() returns calldata in a single RPC call.
//  Events are available as a secondary/auxiliary data source.
// =============================================================================

// TODO: Extract ABI array from compiled artifact
//       /Users/sumin/RustroverProjects/code-in-for-eth/artifacts/contracts/Connection.sol/CodeIn.json
//       Only need the "abi" field, not the full artifact
export const CODEIN_ABI = [] as const; // placeholder
