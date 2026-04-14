import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";

export const DEFAULT_CONTRACT_ADDRESS = "0x2BE88B62A0673868105219bF5D0182B50b516deE";

export function getContract(signerOrProvider: Signer | Provider, address = DEFAULT_CONTRACT_ADDRESS) {
  return new Contract(address, CODEIN_ABI, signerOrProvider);
}
