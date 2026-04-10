// =============================================================================
//  Seed Derivation
// =============================================================================
//
//  Solana SDK에서는 PDA seed + mapping key 둘 다 사용했지만,
//  Ethereum에서는 PDA가 없으므로 Connection seed 생성용으로만 사용.
//
//  deriveDmSeed만 Solana SDK에서 가져옴 (iqlabs-solana-sdk/src/sdk/utils/seed.ts)
//  나머지 (toSeedBytes, deriveSeedBytes)는 ethers.id() / keccak256()으로 대체 가능
//
//  deriveDmSeed(userA: string, userB: string): Buffer
//    - 두 주소를 정렬 → "addr1:addr2" 형태로 concat → keccak256 해시
//    - Connection seed(bytes32) 생성에 사용
//    - 양쪽 누가 호출하든 같은 seed 도출 (주소 정렬)
