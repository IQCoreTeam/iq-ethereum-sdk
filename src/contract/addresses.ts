import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";

export const DEFAULT_CONTRACT_ADDRESS = "0xa580a977a3103565993531d19536220A54783397";

export function getContract(signerOrProvider: Signer | Provider, address = DEFAULT_CONTRACT_ADDRESS) {
  return new Contract(address, CODEIN_ABI, signerOrProvider);
}
