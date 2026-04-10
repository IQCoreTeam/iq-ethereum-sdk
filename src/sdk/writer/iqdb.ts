// =============================================================================
//  IQDB + Connection Writer — DB/테이블/커넥션 쓰기 작업
// =============================================================================
//
//  모든 함수는 첫 번째 인자로 signer: Signer를 받음

// ----- initializeDbRoot -----
//
// initializeDbRoot(signer: Signer, dbRootId: string): Promise<string>
//   input:  dbRootId — DB 루트 식별자
//   output: tx hash
//   작업: contract.initializeDbRoot(toSeedBytes(dbRootId))

// ----- manageTableCreators -----
//
// manageTableCreators(signer: Signer, dbRootId: string, tableCreators: string[], extCreators: string[]): Promise<string>
//   output: tx hash
//   작업: contract.manageTableCreators(rootIdBytes, tableCreators, extCreators)

// ----- createTable -----
//
// createTable(signer: Signer, dbRootId: string, tableSeed: string, tableName: string, columns: string[], idCol: string, extKeys: string[], gate?, writers?: string[], private?: boolean): Promise<string>
//   input:  private — true이면 createPrivateTable 호출 (규칙2: 동일 시그니처 함수 통합)
//   output: tx hash
//
//   작업:
//     1. string → bytes 변환
//     2. gate 기본값: { tokenAddress: ZeroAddress, amount: 0, gateType: 0 }
//     3. private ? contract.createPrivateTable(...) : contract.createTable(...)
//     4. { value: LINKED_LIST_FEE }

// ----- updateTable -----
//
// updateTable(signer: Signer, dbRootId: string, tableSeed: string, tableName: string, columns: string[], idCol: string, extKeys: string[], gate?, writers?: string[]): Promise<string>
//   output: tx hash
//   작업: contract.updateTable(...)
//   NOTE: fee 없음 (payable 아님)

// ----- writeRow -----
//
// writeRow(signer: Signer, dbRootId: string, tableSeed: string, rowJson: string, onProgress?): Promise<string>
//   output: tx hash
//
//   작업:
//     1. { onChainPath, metadata } = await prepareUpload(signer, rowJson, onProgress)
//        ← code_in.ts의 prepareUpload 재사용 (규칙2)
//     2. contract.dbCodeIn(rootIdBytes, seedBytes, onChainPath, metadata, { value: LINKED_LIST_FEE })

// ----- manageRowData -----
//
// manageRowData(signer: Signer, dbRootId: string, tableSeed: string, rowJson: string, targetTx: string): Promise<string>
//   input:  targetTx — 수정 대상 row의 tx hash (필수 — 규칙4: tableName은 컨트랙트가 이미 알므로 제거)
//   output: tx hash
//
//   작업:
//     1. { onChainPath, metadata } = await prepareUpload(signer, rowJson)
//     2. table = await fetchTableMeta(dbRootId, tableSeed)  ← tableName 자동 획득
//     3. contract.dbInstructionCodeIn(rootIdBytes, seedBytes, table.name, targetTx, onChainPath, metadata, { value: LINKED_LIST_FEE })

// ----- requestConnection -----
//
// requestConnection(signer: Signer, dbRootId: string, receiver: string, tableName: string, columns: string[], idCol: string, extKeys: string[]): Promise<string>
//   output: tx hash
//
//   작업:
//     1. connectionSeed = deriveDmSeed(await signer.getAddress(), receiver)
//     2. string → bytes 변환
//     3. contract.requestConnection(rootIdBytes, connectionSeed, receiver, ..., { value: LINKED_LIST_FEE })

// ----- manageConnection -----
//
// manageConnection(signer: Signer, otherParty: string, dbRootId: string, newStatus: number): Promise<string>
//   input:  otherParty, dbRootId, newStatus (규칙4: connectionSeed 제거 — 내부에서 deriveDmSeed로 계산)
//   output: tx hash
//
//   작업:
//     1. connectionSeed = deriveDmSeed(await signer.getAddress(), otherParty)
//     2. contract.manageConnection(otherParty, rootIdBytes, connectionSeed, newStatus)

// ----- writeConnectionRow -----
//
// writeConnectionRow(signer: Signer, otherParty: string, dbRootId: string, rowJson: string, onProgress?): Promise<string>
//   input:  (규칙4: connectionSeed 제거 — 내부에서 deriveDmSeed로 계산)
//   output: tx hash
//
//   작업:
//     1. connectionSeed = deriveDmSeed(await signer.getAddress(), otherParty)
//     2. { onChainPath, metadata } = await prepareUpload(signer, rowJson, onProgress)
//        ← code_in.ts의 prepareUpload 재사용 (규칙2)
//     3. contract.walletConnectionCodeIn(otherParty, rootIdBytes, connectionSeed, onChainPath, metadata)

// ----- updateUserMetadata -----
//
// updateUserMetadata(signer: Signer, metadata: string | Uint8Array): Promise<string>
//   output: tx hash
//   작업: contract.updateUserMetadata(typeof metadata === "string" ? toUtf8Bytes(metadata) : metadata)
