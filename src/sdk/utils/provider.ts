import { JsonRpcProvider } from "ethers";

const DEFAULT_RPC = "https://rpc.sepolia.org";
let runtimeRpcUrl: string | undefined;

export function setRpcUrl(url: string) {
  runtimeRpcUrl = url;
}

export function getRpcUrl(): string {
  return (
    runtimeRpcUrl ||
    process.env.IQLABS_RPC_ENDPOINT ||
    process.env.ETHEREUM_RPC_URL ||
    process.env.RPC_URL ||
    DEFAULT_RPC
  );
}

export function getProvider() {
  return new JsonRpcProvider(getRpcUrl());
}
