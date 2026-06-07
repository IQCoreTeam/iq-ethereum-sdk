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
    defaultRpc: "https://ethereum-sepolia-rpc.publicnode.com",
    contractAddress: "0x246A08D9fdD9b3990A88eD1f2DF1A87239839F07",
    currency: "ETH",
    explorer: "https://sepolia.etherscan.io",
  },
  monad: {
    chainId: 143,
    defaultRpc: "https://rpc.monad.xyz",
    contractAddress: "0x7ae06f87Cf93606DA2BD6A281afB28028cAE233D",
    currency: "MON",
    explorer: "https://monadvision.com",
  },
  monadTestnet: {
    chainId: 10143,
    defaultRpc: "https://testnet-rpc.monad.xyz",
    contractAddress: "0x3379883538C068978e199472b5D127055c734867",
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
