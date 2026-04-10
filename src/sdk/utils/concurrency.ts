// =============================================================================
//  Concurrency Helper (Solana SDK에서 복사 — 체인 무관)
// =============================================================================
//
//  TODO: iqlabs-solana-sdk/src/sdk/utils/concurrency.ts 에서 복사
//
//  runWithConcurrency(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void>
//    - items 배열을 최대 limit개 동시 실행으로 worker 함수 처리
//    - 풀 방식: limit개의 worker가 큐에서 다음 아이템을 가져감
