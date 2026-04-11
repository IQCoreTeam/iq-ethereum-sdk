import "dotenv/config";
import { Wallet } from "ethers";
import { readFileSync } from "fs";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import { getContract } from "../src/contract";
import { toChunks, uploadLinkedList, prepareUpload, codeIn } from "../src/sdk/writer/code_in";
import { readCodeIn } from "../src/sdk/reader/read_code_in";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const signer = new Wallet(process.env.PRIVATE_KEY!, getProvider());

async function main() {
  const file = readFileSync("/Users/sumin/Downloads/iqwojak.jpeg");
  const base64 = file.toString("base64");
  console.log(`File: ${file.length} bytes → base64: ${base64.length} bytes`);

  const chunks = toChunks(base64);
  console.log(`Chunks: ${chunks.length}`);

  // Estimate gas
  const contract = getContract(signer);
  const gas = await contract.sendCode.estimateGas(chunks, "Genesis", 0, 0);
  console.log(`Estimated gas (1 tx, all chunks): ${gas}`);
  console.log(`Cost at 5 gwei: $${(Number(gas) * 5 * 1e-9 * 2100).toFixed(2)}`);
  console.log(`Cost at 30 gwei: $${(Number(gas) * 30 * 1e-9 * 2100).toFixed(2)}`);

  // Actually upload
  console.log("\nUploading...");
  const txHash = await codeIn(signer, base64, "iqwojak.jpeg", "image/jpeg", (pct) => {
    process.stdout.write(`\r  ${pct.toFixed(0)}%`);
  });
  console.log(`\nDone! tx: ${txHash}`);

  // Read back and verify
  console.log("\nReading back...");
  const result = await readCodeIn(txHash);
  const restored = result.data;
  console.log(`Restored: ${restored.length} bytes, match: ${restored === base64}`);
}

main().catch(console.error);
