// =============================================================================
//  Provider Management (replaces Solana's connection_helper.ts)
// =============================================================================
//
//  Solana SDK: Connection 객체를 관리 (getConnection, setRpcUrl)
//  Ethereum SDK: ethers Provider를 관리
//
//  Signer는 여기서 관리하지 않음 — 호출자가 직접 전달
//  (ethers.Wallet, BrowserProvider.getSigner() 등)

// let runtimeRpcUrl: string | undefined;

// setRpcUrl(url: string): void
//   input:  RPC endpoint URL
//   output: void
//   - 런타임에 RPC URL 설정 (환경변수보다 우선)

// getRpcUrl(): string
//   input:  없음
//   output: RPC URL string
//   - 우선순위: runtime > IQLABS_RPC_ENDPOINT > ETHEREUM_RPC_URL > RPC_URL > 기본값

// getProvider(): JsonRpcProvider
//   input:  없음
//   output: ethers.JsonRpcProvider 인스턴스
//   - getRpcUrl()로 URL 가져와서 Provider 생성
//   - 매 호출마다 새 인스턴스 (캐싱은 나중에 필요하면 추가)
