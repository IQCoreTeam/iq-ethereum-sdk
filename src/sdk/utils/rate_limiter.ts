// =============================================================================
//  Rate Limiter (Solana SDK에서 복사 — 체인 무관)
// =============================================================================
//
//  TODO: iqlabs-solana-sdk/src/sdk/utils/rate_limiter.ts 에서 복사
//
//  createRateLimiter(maxRps: number): { wait: () => Promise<void> } | null
//    - maxRps <= 0 이면 null 반환 (제한 없음)
//    - 호출 간 최소 간격을 1000/maxRps ms로 강제
//    - RPC 호출 과부하 방지용
