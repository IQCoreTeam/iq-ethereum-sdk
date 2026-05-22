import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";
import { NETWORKS, DEFAULT_NETWORK } from "./networks";
import { getNetwork } from "../sdk/utils/provider";

// Back-compat default — points at Sepolia. Most consumers should let
// getContract() resolve the address from the active network mode instead.
export const DEFAULT_CONTRACT_ADDRESS = NETWORKS[DEFAULT_NETWORK].contractAddress;

// Resolve the deployed CodeIn address for the currently selected network mode.
// Use setNetwork("monad") (etc.) before calling SDK functions to switch.
export function getContractAddress(): string {
  return NETWORKS[getNetwork()].contractAddress;
}

export function getContract(signerOrProvider: Signer | Provider, address?: string) {
  const addr = address ?? getContractAddress();
  return new Contract(addr, CODEIN_ABI, signerOrProvider);
}
