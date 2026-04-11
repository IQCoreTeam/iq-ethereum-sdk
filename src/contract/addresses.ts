import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";

export const DEFAULT_CONTRACT_ADDRESS = "0xb190FC39B100Bce7a3119Fb5b5836C5d02190C67";

export function getContract(signerOrProvider: Signer | Provider, address = DEFAULT_CONTRACT_ADDRESS) {
  return new Contract(address, CODEIN_ABI, signerOrProvider);
}
