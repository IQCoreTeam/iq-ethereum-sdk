// =============================================================================
//  Code-In Writer — 데이터 업로드 핵심 로직
// =============================================================================

// ----- toChunks -----
//
// toChunks(data: string | string[]): string[]
//   input:  업로드할 데이터
//   output: CHUNK_SIZE 이하로 분할된 string 배열
//   - 이미 배열이면 그대로 반환
//   - string이면 CHUNK_SIZE(850 bytes) 기준 UTF-8 바이트 단위 분할

// ----- uploadLinkedList -----
//
// uploadLinkedList(signer: Signer, chunks: string[], onProgress?): Promise<string>
//   input:  signer — ethers Signer
//           chunks — sendCode로 보낼 데이터 청크 배열
//           onProgress — 진행률 콜백
//   output: 마지막 tx hash (= tailTx)
//
//   작업:
//     1. contract = getContract(signer)
//     2. beforeTx = "Genesis"
//     3. for each chunk:
//        - tx = await contract.sendCode([chunk], beforeTx, 0, 0)
//        - receipt = await tx.wait()
//        - beforeTx = receipt.hash
//        - onProgress 호출
//     4. return beforeTx
//
//   NOTE: method(규칙4)는 항상 0이므로 파라미터에서 제거. 하드코딩.

// ----- prepareUpload -----
//
// prepareUpload(signer: Signer, data: string, onProgress?): Promise<{ onChainPath: string; metadata: string }>
//   input:  signer, data — 업로드할 원본 데이터
//   output: { onChainPath, metadata } — 컨트랙트 호출에 필요한 두 값
//
//   이 함수는 writeRow, writeConnectionRow, codeIn 모두에서 재사용됨 (규칙2: 중복 제거)
//
//   작업:
//     1. chunks = toChunks(data)
//     2. inline 판단: chunks.length === 1 && byteLength <= DIRECT_METADATA_MAX_BYTES
//        - inline: return { onChainPath: "", metadata: data }
//        - 아니면:
//          tailTx = await uploadLinkedList(signer, chunks, onProgress)
//          return { onChainPath: tailTx, metadata: JSON.stringify({ total_chunks: chunks.length }) }

// ----- codeIn -----
//
// codeIn(signer: Signer, data: string | string[], filename?: string, filetype?: string, onProgress?): Promise<string>
//   input:  signer, data, optional filename/filetype, onProgress
//   output: userInventoryCodeIn tx hash
//
//   작업:
//     1. dataStr = Array.isArray(data) ? data.join("") : data
//     2. magic bytes로 filetype/filename 추론 (없는 경우)
//     3. { onChainPath, metadata } = await prepareUpload(signer, dataStr, onProgress)
//     4. tx = await contract.userInventoryCodeIn(filename, onChainPath, filetype, "0", { value: BASIC_FEE })
//     5. return (await tx.wait()).hash
