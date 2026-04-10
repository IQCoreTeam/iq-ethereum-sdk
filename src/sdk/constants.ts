// =============================================================================
//  SDK Constants
// =============================================================================

// sendCode의 string[] 각 청크 최대 바이트 수
// Solana와 동일하게 850 bytes — Ethereum calldata 제한은 훨씬 크지만
// sendCode의 linked list 구조상 청크 단위를 맞추기 위해 유지
// export const CHUNK_SIZE = 850;

// 이 크기 이하면 metadata에 data를 inline으로 포함
// (별도 sendCode 호출 없이 userInventoryCodeIn 한 번으로 처리)
// export const DIRECT_METADATA_MAX_BYTES = 700;

// Fee constants (Constants.sol과 일치)
// export const BASIC_FEE = "0.0001";        // ETH — userInventoryCodeIn
// export const LINKED_LIST_FEE = "0.0003";  // ETH — createTable, dbCodeIn, requestConnection
