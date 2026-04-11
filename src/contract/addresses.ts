import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";

export const DEFAULT_CONTRACT_ADDRESS = "0xFdC1Fc3014f35d5504BA09e35095301D84fd9C8c";

export function getContract(signerOrProvider: Signer | Provider, address = DEFAULT_CONTRACT_ADDRESS) {
  return new Contract(address, CODEIN_ABI, signerOrProvider);
}
