// =============================================================================
//  IQDB + Connection Reader — DB/테이블/커넥션 읽기
// =============================================================================

// ----- getTablelistFromRoot -----
//
// getTablelistFromRoot(dbRootId: Uint8Array | string): Promise<{ creator: string; tableSeeds: string[]; globalTableSeeds: string[] }>
//   input:  dbRootId — DB 루트 식별자
//   output: creator 주소 + 테이블 seed 목록들
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. root = await contract.dbRoots(toSeedBytes(dbRootId))
//     3. if !root.exists → throw NotFound
//     4. return { creator, tableSeeds, globalTableSeeds }

// ----- fetchTableMeta -----
//
// fetchTableMeta(dbRootId, tableSeed): Promise<Table struct (ethers 반환값 그대로)>
//   input:  dbRootId, tableSeed — 테이블 식별
//   output: ethers가 디코딩한 Table struct 그대로 반환 (규칙3: 별도 타입 만들지 않음)
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. table = await contract.getTable(toSeedBytes(dbRootId), toSeedBytes(tableSeed))
//     3. if !table.exists → throw NotFound
//     4. return table

// ----- readTableRows -----
//
// readTableRows(dbRootId, tableSeed, options?): Promise<Array<Record<string, unknown>>>
//   input:  dbRootId, tableSeed — 테이블 식별
//           options — { limit?: number }
//   output: 파싱된 row 객체 배열
//
//   작업:
//     1. table = await fetchTableMeta(dbRootId, tableSeed)
//     2. nowTx = table.dataChain.nowTx
//     3. if nowTx === "" → return []
//     4. entries = await walkEventChain(nowTx, "DbCodeInEvent", options)
//        ← txchain.ts의 범용 순회기 사용
//     5. 각 entry의 args.onChainPath로 데이터 복원:
//        - onChainPath === "" → inline (calldata의 metadata에서 추출)
//        - onChainPath !== "" → await readSendCodeChain(onChainPath)
//     6. 복원된 data를 JSON.parse → row 객체
//     7. return rows

// ----- readConnection -----
//
// readConnection(dbRootId, partyA: string, partyB: string): Promise<{ status, requester, blocker }>
//   input:  dbRootId — DB 루트 식별자
//           partyA, partyB — 양쪽 지갑 주소
//   output: { status: "pending"|"approved"|"blocked"|"unknown", requester: "a"|"b", blocker: "a"|"b"|"none" }
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. connectionSeed = deriveDmSeed(partyA, partyB)
//     3. connKey = await contract.getConnectionKey(partyA, partyB, toSeedBytes(dbRootId), connectionSeed)
//     4. info = await contract.getConnection(connKey)
//     5. if !info.exists → return { status: "unknown", requester: "a", blocker: "none" }
//     6. return { status: 0→pending/1→approved/2→blocked, requester: 0→a/1→b, blocker: 255→none/0→a/1→b }

// ----- fetchUserConnections -----
//
// fetchUserConnections(userAddress: string, options?): Promise<Array<{ connectionKey, partyA, partyB, status, requester, blocker }>>
//   input:  userAddress — 사용자 주소
//           options — { limit?: number }
//   output: 사용자의 커넥션 목록
//
//   NOTE: 커넥션 목록은 TxChain 기반이 아님.
//         ConnectionRequested event의 indexed 필드(requester, receiver)로 필터링.
//         이건 event queryFilter가 적합한 유일한 케이스.
//
//   작업:
//     1. contract = getContract(getProvider())
//     2. filterAsRequester = contract.filters.ConnectionRequested(null, userAddress, null)
//     3. filterAsReceiver = contract.filters.ConnectionRequested(null, null, userAddress)
//     4. events = [...queryFilter(filterAsRequester), ...queryFilter(filterAsReceiver)]
//     5. 각 event의 connectionKey로 contract.getConnection() → 최신 상태 확인
//     6. return 결과 배열
