import { JsonRpcProvider, Provider, Signer } from "ethers";
import { NETWORKS, DEFAULT_NETWORK, NetworkMode } from "../../contract/networks";

let runtimeNetwork: NetworkMode = DEFAULT_NETWORK;
let runtimeRpcUrl: string | undefined;

// Cache one provider per resolved RPC URL so callers don't open a new
// HTTP keepalive pool on every reader call.
const providerCache = new Map<string, JsonRpcProvider>();

export function setNetwork(mode: NetworkMode, rpcUrl?: string) {
  if (!NETWORKS[mode]) {
    throw new Error(`Unknown network mode: ${mode}`);
  }
  runtimeNetwork = mode;
  runtimeRpcUrl = rpcUrl;
}

export function getNetwork(): NetworkMode {
  return runtimeNetwork;
}

// Back-compat: existing consumers call setRpcUrl(...) directly.
// Treat it as an override that sticks until setNetwork() is called again.
export function setRpcUrl(url: string) {
  runtimeRpcUrl = url;
}

export function getRpcUrl(): string {
  return (
    runtimeRpcUrl ||
    process.env.IQLABS_RPC_ENDPOINT ||
    process.env.ETHEREUM_RPC_URL ||
    process.env.RPC_URL ||
    NETWORKS[runtimeNetwork].defaultRpc
  );
}

export function getProvider(): JsonRpcProvider {
  const url = getRpcUrl();
  let cached = providerCache.get(url);
  if (!cached) {
    cached = new JsonRpcProvider(url);
    providerCache.set(url, cached);
  }
  return cached;
}

// Verifies the RPC endpoint actually serves the chain that the current
// network mode expects. Throws on mismatch — important when the user
// flips setNetwork() but forgets to swap their RPC URL.
export async function assertChainMatches(provider?: Provider | Signer): Promise<void> {
  const expected = NETWORKS[runtimeNetwork].chainId;
  const p: Provider =
    (provider as Signer)?.provider ?? (provider as Provider) ?? getProvider();
  const net = await p.getNetwork();
  const actual = Number(net.chainId);
  if (actual !== expected) {
    throw new Error(
      `Network mode "${runtimeNetwork}" expects chainId ${expected} but RPC reports ${actual}. ` +
      `Call setNetwork(...) and/or pass a matching signer/provider.`
    );
  }
}
