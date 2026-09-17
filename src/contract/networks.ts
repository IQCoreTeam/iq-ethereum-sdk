// Network mode registry. Adding a new EVM chain = adding one entry here.
// Default mode is "sepolia" so existing consumers keep working unchanged.

export type NetworkMode = "sepolia" | "monad" | "monadTestnet" | "robinhood";

export interface NetworkConfig {
  chainId: number;
  defaultRpc: string;
  contractAddress: string;
  currency: string;
  explorer: string;
  // Payload budget per sendCode batch. Chains cap total transaction size
  // (geth default 128 KB rejects larger with "oversized data"), and ABI
  // encoding adds overhead on top of the raw chunk bytes, so each chain
  // carries its measured safe budget here.
  maxBatchPayloadBytes: number;
}

export const NETWORKS: Record<NetworkMode, NetworkConfig> = {
  sepolia: {
    chainId: 11155111,
    defaultRpc: "https://ethereum-sepolia-rpc.publicnode.com",
    contractAddress: "0x246A08D9fdD9b3990A88eD1f2DF1A87239839F07",
    currency: "ETH",
    explorer: "https://sepolia.etherscan.io",
    maxBatchPayloadBytes: 96 * 1024,
  },
  monad: {
    chainId: 143,
    defaultRpc: "https://rpc.monad.xyz",
    contractAddress: "0x7ae06f87Cf93606DA2BD6A281afB28028cAE233D",
    currency: "MON",
    explorer: "https://monadvision.com",
    // Partner-verified (2026-09): MON accepts 128 KB batches.
    maxBatchPayloadBytes: 128 * 1024,
  },
  monadTestnet: {
    chainId: 10143,
    defaultRpc: "https://testnet-rpc.monad.xyz",
    contractAddress: "0x3379883538C068978e199472b5D127055c734867",
    currency: "MON",
    explorer: "https://testnet.monadexplorer.com",
    maxBatchPayloadBytes: 128 * 1024,
  },
  robinhood: {
    chainId: 4663,
    defaultRpc: "https://rpc.mainnet.chain.robinhood.com",
    contractAddress: "0x88af59e58C7E5DcbE7cc12972B90cff3fEEF7223",
    currency: "ETH",
    explorer: "https://robinhoodchain.blockscout.com",
    // Partner-measured on ~2 MB uploads (2026-09): 96 KB batches are
    // rejected as "oversized data", 95 KB lands.
    maxBatchPayloadBytes: 95 * 1024,
  },
};

export const DEFAULT_NETWORK: NetworkMode = "sepolia";

export function networkFromChainId(chainId: number): NetworkMode | undefined {
  for (const [mode, cfg] of Object.entries(NETWORKS) as [NetworkMode, NetworkConfig][]) {
    if (cfg.chainId === chainId) return mode;
  }
  return undefined;
}
