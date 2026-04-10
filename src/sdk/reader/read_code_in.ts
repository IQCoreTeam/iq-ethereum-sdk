// =============================================================================
//  readCodeIn — 단일 트랜잭션에서 코드인 데이터 읽기
// =============================================================================

// readCodeIn(txHash: string, onProgress?): Promise<{ metadata: string; data: string | null }>
//   input:  txHash — userInventoryCodeIn 트랜잭션의 hash
//           onProgress — 진행률 콜백 (linked list 읽기 시 사용)
//   output: { metadata, data }
//
//   작업:
//     1. provider = getProvider()
//     2. contract = getContract(provider)
//     3. tx = await provider.getTransaction(txHash)
//     4. parsed = contract.interface.parseTransaction({ data: tx.data })
//        → parsed.name === "userInventoryCodeIn"
//        → parsed.args: { handle: string, tailTx: string, typeField: string, offset: string }
//     5. tailTx = parsed.args.tailTx
//     6. if tailTx === "" || tailTx === "0x" (inline):
//        - metadata에서 data 필드 추출 (JSON.parse 후 data 분리)
//        - return { metadata: cleaned, data: extracted }
//     7. else (linked list):
//        - data = await readSendCodeChain(tailTx, onProgress)
//        - metadata = JSON.stringify({ handle, typeField, offset })
//        - return { metadata, data }
