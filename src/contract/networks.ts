// Network mode registry. Adding a new EVM chain = adding one entry here.
// Default mode is "sepolia" so existing consumers keep working unchanged.

export type NetworkMode = "sepolia" | "monad" | "monadTestnet";

export interface NetworkConfig {
  chainId: number;
  defaultRpc: string;
  contractAddress: string;
  currency: string;
  explorer: string;
}

export const NETWORKS: Record<NetworkMode, NetworkConfig> = {
  sepolia: {
    chainId: 11155111,
    defaultRpc: "https://rpc.sepolia.org",
    contractAddress: "0xB1C16271954c7238672c3666FD22Ee14C6d065Db",
    currency: "ETH",
    explorer: "https://sepolia.etherscan.io",
  },
  monad: {
    chainId: 143,
    defaultRpc: "https://rpc.monad.xyz",
    contractAddress: "0xeFd9376835076Bf8d83826F6A2277BB5362Cd893",
    currency: "MON",
    explorer: "https://monadvision.com",
  },
  monadTestnet: {
    chainId: 10143,
    defaultRpc: "https://testnet-rpc.monad.xyz",
    contractAddress: "0x88af59e58C7E5DcbE7cc12972B90cff3fEEF7223",
    currency: "MON",
    explorer: "https://testnet.monadexplorer.com",
  },
};

export const DEFAULT_NETWORK: NetworkMode = "sepolia";

export function networkFromChainId(chainId: number): NetworkMode | undefined {
  for (const [mode, cfg] of Object.entries(NETWORKS) as [NetworkMode, NetworkConfig][]) {
    if (cfg.chainId === chainId) return mode;
  }
  return undefined;
}
