import "dotenv/config";
import { Wallet } from "ethers";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import { codeIn } from "../src/sdk/writer/code_in";
import { readCodeIn } from "../src/sdk/reader/read_code_in";
import { readUserState, fetchInventoryTransactions } from "../src/sdk/reader/reading_flow";
import { initializeDbRoot, createTable, writeRow, updateUserMetadata } from "../src/sdk/writer/iqdb";
import { fetchTableMeta, readTableRows } from "../src/sdk/reader/iqdb";

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

  // 1. sendCode (single chunk, inline)
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

  // 10. writeRow × 3 (verify TxChain reverse traversal)
  const rows = [
    { id: "1", name: "Alice", email: "alice@test.com" },
    { id: "2", name: "Bob", email: "bob@test.com" },
    { id: "3", name: "Charlie", email: "charlie@test.com" },
  ];
  for (const row of rows) {
    await log(`writeRow (${row.name})`, async () => {
      return await writeRow(signer, dbId, tableId, JSON.stringify(row));
    });
  }

  // 11. fetchTableMeta
  await log("fetchTableMeta", async () => {
    return await fetchTableMeta(dbId, tableId);
  });

  // 12. readTableRows — confirm all 3 are traversed in reverse
  await log("readTableRows (expect 3, newest first)", async () => {
    const result = await readTableRows(dbId, tableId, { limit: 10 });
    console.log(`  count: ${result.length}`);
    const names = result.map((r: any) => r.data?.name);
    console.log(`  order: ${JSON.stringify(names)}`);
    const expected = ["Charlie", "Bob", "Alice"];
    const match = JSON.stringify(names) === JSON.stringify(expected);
    console.log(`  match newest→oldest: ${match}`);
    return { count: result.length, names, match };
  });

  // 13. codeIn × 3 (verify user TxChain reverse traversal)
  const inventories = ["first.txt", "second.txt", "third.txt"];
  for (const name of inventories) {
    await log(`codeIn (${name})`, async () => {
      return await codeIn(signer, `content of ${name}`, name, "text/plain");
    });
  }

  // 14. fetchInventoryTransactions — verify reverse traversal output
  await log("fetchInventoryTransactions (expect ≥4 newest first)", async () => {
    const result = await fetchInventoryTransactions(addr, { limit: 10 });
    console.log(`  count: ${result.length}`);
    const handles = result.map((r) => r.handle);
    console.log(`  handles: ${JSON.stringify(handles)}`);
    return { count: result.length, handles };
  });

  // 15. codeIn (multi chunk, linked list)
  const bigData = "X".repeat(2000);
  const bigTx = await log("codeIn (big data, linked list)", async () => {
    return await codeIn(signer, bigData, "big.txt", "text/plain", (pct) => console.log(`  progress: ${pct.toFixed(0)}%`));
  });

  // 16. readCodeIn (big data)
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
