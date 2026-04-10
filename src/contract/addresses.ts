// =============================================================================
//  Contract address + factory
// =============================================================================

// import { Contract, type Provider, type Signer } from "ethers";
// import { CODEIN_ABI } from "./abi";

// Sepolia deployment (event beforeTx 추가 버전)
// export const DEFAULT_CONTRACT_ADDRESS = "0xeFd9376835076Bf8d83826F6A2277BB5362Cd893";

// getContract(signerOrProvider, address?)
//   input:  ethers Signer or Provider, optional contract address override
//   output: ethers.Contract instance with full ABI (Inscription + IQDB + Connection)
//
//   - Signer 전달 시: read + write 가능
//   - Provider 전달 시: read only (view/pure 함수만)
//   - 하나의 Contract 인스턴스로 모든 함수 호출 가능 (상속 체인이 하나의 주소에 배포됨)
//
//   사용 예:
//     const contract = getContract(signer);
//     await contract.sendCode(["data"], "Genesis", 0, 0);
//     const table = await contract.getTable(dbRootId, tableSeed);
