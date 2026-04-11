import "dotenv/config";
import { Wallet, formatEther } from "ethers";
import { readFileSync } from "fs";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import { codeIn } from "../src/sdk/writer/code_in";
import { readCodeIn } from "../src/sdk/reader/read_code_in";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const provider = getProvider();
const signer = new Wallet(process.env.PRIVATE_KEY!, provider);

async function main() {
  const file = readFileSync("/Users/sumin/Downloads/iqwojak.jpeg");
  const base64 = file.toString("base64");
  console.log(`File: ${file.length} bytes → base64: ${base64.length} bytes`);
  console.log(`Chunks: ${Math.ceil(base64.length / 850)}`);

  const balanceBefore = await provider.getBalance(await signer.getAddress());

  console.log("\nUploading (batched)...");
  const start = Date.now();
  const txHash = await codeIn(signer, base64, "iqwojak.jpeg", "image/jpeg", (pct) => {
    process.stdout.write(`\r  ${pct.toFixed(0)}%`);
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s! tx: ${txHash}`);

  const balanceAfter = await provider.getBalance(await signer.getAddress());
  const spent = balanceBefore - balanceAfter;
  console.log(`Gas spent: ${formatEther(spent)} ETH`);

  console.log("\nReading back...");
  const result = await readCodeIn(txHash);
  console.log(`Restored: ${result.data.length} bytes, match: ${result.data === base64}`);
}

main().catch(console.error);
