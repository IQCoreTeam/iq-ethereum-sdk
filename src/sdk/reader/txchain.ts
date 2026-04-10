// =============================================================================
//  TxChain Reader — 연결리스트 순회 (이 SDK의 핵심)
// =============================================================================
//
//  Ethereum 컨트랙트의 데이터 구조:
//
//    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
//    │ Data Connect │ ←── │ Data Connect │ ←── │ Data Connect │  (mapping: nowTx → beforeTx → Genesis)
//    │  nowTx       │     │  nowTx       │     │  nowTx       │
//    │  beforeTx    │     │  beforeTx    │     │  beforeTx    │
//    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
//           │                    │                    │
//           ▼                    ▼                    ▼
//    ┌────────────┐       ┌────────────┐       ┌────────────┐
//    │ Send Code  │ ←──   │ Send Code  │ ←──   │ Send Code  │    (linked list: tailTx → beforeTx → Genesis)
//    │ code data  │   │   │ code data  │   │   │ code data  │
//    │ beforeTx   │   │   │ beforeTx   │   │   │ beforeTx   │
//    └────────────┘   │   └────────────┘   │   └────────────┘
//                     │                    │
//              ┌────────────┐       ┌────────────┐
//              │ Send Code  │       │ Send Code  │
//              │ code data  │       │ Genesis    │
//              │ Genesis    │       └────────────┘
//              └────────────┘
//
//  읽기 방식:
//    - sendCode 체인: calldata 디코딩 (beforeTx가 calldata에 있음)
//    - Data Connect 체인: event 디코딩 (beforeTx가 event에 있음)
//
//  Solana에서는 getSignaturesForAddress(PDA)로 목록을 가져왔지만,
//  Ethereum에는 그런 API가 없으므로 TxChain 자체가 목록 역할을 함.

// ----- readSendCodeChain -----
//
// readSendCodeChain(tailTxHash: string, onProgress?): Promise<string>
//   input:  tailTxHash — sendCode linked list의 마지막 tx hash
//           onProgress — 진행률 콜백
//   output: 복원된 전체 데이터 (chunks를 역순으로 조합)
//
//   작업:
//     1. provider = getProvider()
//     2. contract = getContract(provider)  ← parseTransaction용 interface만 필요
//     3. chunks: string[] = []
//     4. visited = new Set<string>()  ← 무한루프 방지
//     5. cursor = tailTxHash
//     6. while (cursor && cursor !== "Genesis" && cursor !== ""):
//        a. if visited.has(cursor) → throw "loop detected"
//        b. visited.add(cursor)
//        c. tx = await provider.getTransaction(cursor)
//        d. parsed = contract.interface.parseTransaction({ data: tx.data })
//           → parsed.name === "sendCode"
//           → parsed.args: { codes: string[], beforeTx: string, method: uint8, decodeBreak: uint8 }
//        e. chunks.push(...parsed.args.codes)
//        f. cursor = parsed.args.beforeTx  ← calldata에 beforeTx가 있으므로 바로 역추적
//        g. onProgress 호출
//     7. return chunks.reverse().join("")

// ----- walkEventChain -----
//
// walkEventChain(headTxHash: string, eventName: string, options?): Promise<Array<{ txHash: string; args: Record<string, unknown> }>>
//   input:  headTxHash — 체인의 최신 tx hash (mapping.nowTx에서 가져옴)
//           eventName — 파싱할 event 이름 ("DbCodeInEvent" | "UserInventoryCodeInEvent" | "ConnectionCodeIn")
//           options — { limit?: number }
//   output: tx hash + event args 배열 (최신 → 오래된 순)
//
//   이 함수는 Data Connect 체인의 범용 순회기.
//   event에서 beforeTx를 읽어서 다음 노드로 이동.
//   args 해석은 호출자(iqdb.ts, reading_flow.ts)의 책임.
//
//   작업:
//     1. provider = getProvider()
//     2. contract = getContract(provider)
//     3. results = []
//     4. visited = new Set<string>()
//     5. cursor = headTxHash
//     6. while (cursor && cursor !== "" && cursor !== "Genesis"):
//        a. if visited.has(cursor) → throw "loop detected"
//        b. visited.add(cursor)
//        c. receipt = await provider.getTransactionReceipt(cursor)
//        d. event log에서 eventName에 해당하는 log 찾기:
//           log = receipt.logs.find(l => contract.interface.parseLog(l)?.name === eventName)
//           parsed = contract.interface.parseLog(log)
//        e. results.push({ txHash: cursor, args: parsed.args })
//        f. cursor = parsed.args.beforeTx  ← event에 emit된 이전 포인터
//        g. if options.limit && results.length >= options.limit → break
//     7. return results
