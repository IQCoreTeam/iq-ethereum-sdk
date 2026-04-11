import "dotenv/config";
import { Wallet } from "ethers";
import { setRpcUrl } from "../src/sdk/utils/provider";
import { getProvider } from "../src/sdk/utils/provider";
import { getContract } from "../src/contract";
import { codeIn } from "../src/sdk/writer/code_in";
import { readCodeIn } from "../src/sdk/reader/read_code_in";
import { readUserState, fetchInventoryTransactions } from "../src/sdk/reader/reading_flow";
import { initializeDbRoot, createTable, writeRow, updateUserMetadata } from "../src/sdk/writer/iqdb";
import { getTablelistFromRoot, fetchTableMeta, readTableRows } from "../src/sdk/reader/iqdb";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const signer = new Wallet(process.env.PRIVATE_KEY!, getProvider());

function replacer(_: string, v: any) { return typeof v === "bigint" ? v.toString() : v; }

async function log(label: string, fn: () => Promise<any>) {
  console.log(`\n--- ${label} ---`);
  try {
    const result = await fn();
    console.log("OK:", JSON.stringify(result, replacer, 2));
    return result;
  } catch (e: any) {
    console.log("FAIL:", e.message?.slice(0, 200));
    return null;
  }
}

async function main() {
  const addr = await signer.getAddress();
  console.log("Signer:", addr);
  console.log("Balance:", (await getProvider().getBalance(addr)).toString());

  // 1. userInitialize
  await log("userInitialize", async () => {
    const c = getContract(signer);
    const tx = await c.userInitialize();
    return (await tx.wait())!.hash;
  });

  // 2. sendCode (single chunk, inline)
  const codeTx = await log("codeIn (small data)", async () => {
    return await codeIn(signer, "Hello from IQ Ethereum SDK!", "test.txt", "text/plain");
  });

  // 3. readCodeIn
  if (codeTx) {
    await log("readCodeIn", async () => {
      return await readCodeIn(codeTx);
    });
  }

  // 4. readUserState
  await log("readUserState", async () => {
    return await readUserState(addr);
  });

  // 5. fetchInventoryTransactions
  await log("fetchInventoryTransactions", async () => {
    return await fetchInventoryTransactions(addr, { limit: 3 });
  });

  // 6. updateUserMetadata
  await log("updateUserMetadata", async () => {
    return await updateUserMetadata(signer, '{"name":"test user"}');
  });

  // 7. readUserState again (check metadata)
  await log("readUserState (after metadata)", async () => {
    return await readUserState(addr);
  });

  // 8. initializeDbRoot
  const dbId = "test-db-" + Date.now();
  await log(`initializeDbRoot (${dbId})`, async () => {
    return await initializeDbRoot(signer, dbId);
  });

  // 9. createTable
  const tableId = "users";
  await log("createTable", async () => {
    return await createTable(signer, dbId, tableId, "Users Table", ["id", "name", "email"], "id");
  });

  // 10. writeRow
  const rowTx = await log("writeRow", async () => {
    return await writeRow(signer, dbId, tableId, JSON.stringify({ id: "1", name: "Alice", email: "alice@test.com" }));
  });

  // 11. fetchTableMeta
  await log("fetchTableMeta", async () => {
    return await fetchTableMeta(dbId, tableId);
  });

  // 12. readTableRows
  await log("readTableRows", async () => {
    return await readTableRows(dbId, tableId, { limit: 5 });
  });

  // 13. sendCode (multi chunk, linked list)
  const bigData = "X".repeat(2000);
  const bigTx = await log("codeIn (big data, linked list)", async () => {
    return await codeIn(signer, bigData, "big.txt", "text/plain", (pct) => console.log(`  progress: ${pct.toFixed(0)}%`));
  });

  // 14. readCodeIn (big data)
  if (bigTx) {
    await log("readCodeIn (big data)", async () => {
      const result = await readCodeIn(bigTx);
      console.log(`  data length: ${result.data.length}, expected: ${bigData.length}`);
      console.log(`  match: ${result.data === bigData}`);
      return { dataLength: result.data.length, match: result.data === bigData };
    });
  }

  console.log("\n=== ALL TESTS DONE ===");
}

main().catch(console.error);
