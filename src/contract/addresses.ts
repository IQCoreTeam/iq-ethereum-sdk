import { Contract, type Provider, type Signer } from "ethers";
import { CODEIN_ABI } from "./abi";

export const DEFAULT_CONTRACT_ADDRESS = "0x905dABC7348905AC0Ba94776a24661be5a8cB2e1";

export function getContract(signerOrProvider: Signer | Provider, address = DEFAULT_CONTRACT_ADDRESS) {
  return new Contract(address, CODEIN_ABI, signerOrProvider);
}
