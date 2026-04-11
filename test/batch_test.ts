import "dotenv/config";
import { Wallet, parseEther } from "ethers";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import { getContract } from "../src/contract";
import { toChunks } from "../src/sdk/writer/code_in";
import { readSendCodeChain } from "../src/sdk/reader/txchain";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const signer = new Wallet(process.env.PRIVATE_KEY!, getProvider());

async function main() {
  const contract = getContract(signer);

  // 3000 bytes = 4 chunks of 850 bytes
  const data = "BATCH".repeat(600); // 3000 bytes
  const chunks = toChunks(data);
  console.log(`Data: ${data.length} bytes, ${chunks.length} chunks`);

  // Test 1: send all chunks in ONE tx (full batch)
  console.log("\n--- Test 1: All chunks in 1 tx ---");
  const tx1 = await contract.sendCode(chunks, "Genesis", 0, 0);
  const r1 = await tx1.wait();
  console.log("Sent:", r1!.hash);
  const restored1 = await readSendCodeChain(r1!.hash);
  console.log(`Restored: ${restored1.length} bytes, match: ${restored1 === data}`);

  // Test 2: batch 2 chunks per tx (linked list of batches)
  console.log("\n--- Test 2: 2 chunks per tx, linked ---");
  const bigData = "Z".repeat(4250); // 5 chunks
  const bigChunks = toChunks(bigData);
  console.log(`Data: ${bigData.length} bytes, ${bigChunks.length} chunks`);

  let beforeTx = "Genesis";
  for (let i = 0; i < bigChunks.length; i += 2) {
    const batch = bigChunks.slice(i, i + 2);
    const tx = await contract.sendCode(batch, beforeTx, 0, 0);
    const receipt = await tx.wait();
    beforeTx = receipt!.hash;
    console.log(`  Sent batch [${i}..${i + batch.length - 1}]: ${receipt!.hash}`);
  }
  const restored2 = await readSendCodeChain(beforeTx);
  console.log(`Restored: ${restored2.length} bytes, match: ${restored2 === bigData}`);

  console.log("\n=== BATCH TEST DONE ===");
}

main().catch(console.error);
