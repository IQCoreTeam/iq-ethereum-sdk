// =============================================================================
//  Crypto Module (Solana SDK에서 100% 복사 — 체인 무관)
// =============================================================================
//
//  TODO: iqlabs-solana-sdk/src/sdk/crypto/ 에서 전체 복사
//
//  이 모듈의 모든 함수는 Web Crypto API + @noble/curves만 사용.
//  Solana/Ethereum 어느 체인에도 의존하지 않음.
//
//  파일 목록:
//    primitives.ts — getRandomBytes, hkdfDerive, aesEncrypt, aesDecrypt, pbkdf2Derive
//    encoding.ts   — hexToBytes, bytesToHex, validatePubKey
//    dh.ts         — deriveX25519Keypair, dhEncrypt, dhDecrypt
//    password.ts   — passwordEncrypt, passwordDecrypt
//    multi.ts      — multiEncrypt, multiDecrypt
//
//  deriveX25519Keypair의 signMessage 인자는 ethers Signer.signMessage()과 호환됨:
//    const signer = new ethers.Wallet(privateKey);
//    const keypair = await deriveX25519Keypair((msg) => signer.signMessage(msg));

// export { deriveX25519Keypair, dhEncrypt, dhDecrypt } from "./dh";
// export { passwordEncrypt, passwordDecrypt } from "./password";
// export { multiEncrypt, multiDecrypt } from "./multi";
// export { hexToBytes, bytesToHex, validatePubKey } from "./encoding";
