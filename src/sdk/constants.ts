export const CHUNK_SIZE = 850;
export const DIRECT_METADATA_MAX_BYTES = 700;

// NOTE: fees are no longer hardcoded here. They are read on-chain per network
// via sdk/utils/fees.ts (basicFee / linkedListFee getters), so the SDK always
// sends the correct amount on Sepolia (ETH) vs Monad (MON) and adapts if the
// contract owner changes fees.
