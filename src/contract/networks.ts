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
    // This budget is the PAYLOAD (sum of chunk chars); ABI-encoding sendCode's
    // string[] inflates it by ~9% into the actual tx calldata, and the
    // Robinhood sequencer rejects a tx whose calldata is oversized. Measured
    // 2026-09-26 on mainnet: 95 KB payload -> ~103 KB calldata -> "oversized
    // data"; the calldata ceiling sits ~93 KB (100 chunks / 90.8 KB landed,
    // 105 / 95.3 KB rejected). 80 KB payload -> ~87 KB calldata clears it with
    // margin. An earlier note claimed 95 KB lands; that was payload, not the
    // encoded calldata the sequencer actually checks.
    maxBatchPayloadBytes: 80 * 1024,
  },
};

export const DEFAULT_NETWORK: NetworkMode = "sepolia";

export function networkFromChainId(chainId: number): NetworkMode | undefined {
  for (const [mode, cfg] of Object.entries(NETWORKS) as [NetworkMode, NetworkConfig][]) {
    if (cfg.chainId === chainId) return mode;
  }
  return undefined;
}
