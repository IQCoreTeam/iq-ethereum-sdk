// =============================================================================
//  High-Level Reading Flows
// =============================================================================

// ----- readUserState -----
//
// readUserState(userAddress: string): Promise<{ metadata: string | null; txChain: { nowTx: string; beforeTx: string } }>
//   input:  userAddress — 사용자 지갑 주소
//   output: 사용자 메타데이터 + txChain 상태
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. metadata = await contract.userMetadata(userAddress)
//        → bytes 반환 → "0x" 이면 null, 아니면 toUtf8String
//     3. txChain = await contract.userTxChains(userAddress)
//        → { nowTx: string, beforeTx: string }
//     4. return { metadata, txChain }

// ----- fetchInventoryTransactions -----
//
// fetchInventoryTransactions(userAddress: string, options?): Promise<Array<{ txHash: string; handle: string; tailTx: string; typeField: string; offset: string }>>
//   input:  userAddress — 사용자 지갑 주소
//           options — { limit?: number }
//   output: 사용자 인벤토리 목록
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. txChain = await contract.userTxChains(userAddress)
//     3. if txChain.nowTx === "" → return []
//     4. entries = await walkEventChain(txChain.nowTx, "UserInventoryCodeInEvent", options)
//        ← txchain.ts의 범용 순회기 사용 (규칙2: 중복 방지)
//     5. return entries.map(e => ({
//          txHash: e.txHash,
//          handle: e.args.handle,
//          tailTx: e.args.tailTx,
//          typeField: ???  ← event에 typeField/offset이 없음, calldata에서 추가 파싱 필요
//        }))
//
//   NOTE: UserInventoryCodeInEvent(user, handle, tailTx, beforeTx)에는
//         typeField와 offset이 포함되어 있지 않음.
//         이 값들이 필요하면 추가로 getTransaction → calldata 파싱 필요.
//         또는 event에 typeField/offset을 추가하도록 컨트랙트 수정 고려.
//         → 구현 시 결정: 필요한 경우에만 calldata 파싱 추가 (lazy loading)
