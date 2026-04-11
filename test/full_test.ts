import "dotenv/config";
import { Wallet, parseEther } from "ethers";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import { getContract } from "../src/contract";
import { codeIn } from "../src/sdk/writer/code_in";
import { readCodeIn } from "../src/sdk/reader/read_code_in";
import { readUserState, fetchInventoryTransactions } from "../src/sdk/reader/reading_flow";
import {
  initializeDbRoot, createTable, writeRow, updateUserMetadata,
  requestConnection, manageConnection, writeConnectionRow,
} from "../src/sdk/writer/iqdb";
import { fetchTableMeta, readTableRows, readConnection, fetchUserConnections } from "../src/sdk/reader/iqdb";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const provider = getProvider();
const main_wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

// Create 2 sub-wallets for connection tests
const wallet2 = Wallet.createRandom().connect(provider);
const wallet3 = Wallet.createRandom().connect(provider);

function replacer(_: string, v: any) { return typeof v === "bigint" ? v.toString() : v; }
let passed = 0, failed = 0;

async function test(label: string, fn: () => Promise<any>) {
  console.log(`\n--- ${label} ---`);
  try {
    const result = await fn();
    console.log("✅", typeof result === "string" ? result : JSON.stringify(result, replacer, 2));
    passed++;
    return result;
  } catch (e: any) {
    console.log("❌", e.message?.slice(0, 300));
    failed++;
    return null;
  }
}

async function main() {
  const addr1 = await main_wallet.getAddress();
  const addr2 = await wallet2.getAddress();
  const addr3 = await wallet3.getAddress();
  console.log("Main wallet:", addr1);
  console.log("Wallet 2:", addr2);
  console.log("Wallet 3:", addr3);

  // Fund sub-wallets
  console.log("\n=== FUNDING SUB-WALLETS ===");
  for (const w of [wallet2, wallet3]) {
    const tx = await main_wallet.sendTransaction({ to: await w.getAddress(), value: parseEther("0.05") });
    await tx.wait();
    console.log(`Sent 0.05 ETH to ${await w.getAddress()}`);
  }

  // =========================================================================
  //  1. INSCRIPTION — basic inline
  // =========================================================================
  console.log("\n========== 1. INSCRIPTION (inline) ==========");

  await test("userInitialize", async () => {
    const c = getContract(main_wallet);
    return (await (await c.userInitialize()).wait())!.hash;
  });

  const inlineTx = await test("codeIn inline (small data)", async () => {
    return await codeIn(main_wallet, "Hello IQ!", "hello.txt", "text/plain");
  });

  if (inlineTx) {
    await test("readCodeIn (inline)", async () => {
      return await readCodeIn(inlineTx);
    });
  }

  // =========================================================================
  //  2. INSCRIPTION — multiple + inventory list
  // =========================================================================
  console.log("\n========== 2. MULTIPLE INSCRIPTIONS + INVENTORY ==========");

  const tx2 = await test("codeIn #2", async () => {
    return await codeIn(main_wallet, "Second inscription data", "second.txt", "text/plain");
  });

  const tx3 = await test("codeIn #3", async () => {
    return await codeIn(main_wallet, "Third inscription", "third.txt", "text/plain");
  });

  await test("readUserState (check txChain)", async () => {
    return await readUserState(addr1);
  });

  await test("fetchInventoryTransactions (should see 3)", async () => {
    return await fetchInventoryTransactions(addr1, { limit: 10 });
  });

  // =========================================================================
  //  3. BATCH + LINKED LIST inscriptions
  // =========================================================================
  console.log("\n========== 3. BATCH + LINKED LIST ==========");

  const bigData = "ABCDEFGH".repeat(200); // 1600 bytes → 2 chunks
  const bigTx = await test("codeIn (linked list, 1600 bytes)", async () => {
    return await codeIn(main_wallet, bigData, "big.txt", "text/plain", (pct) => process.stdout.write(`  ${pct.toFixed(0)}% `));
  });

  if (bigTx) {
    await test("readCodeIn (linked list) — verify data integrity", async () => {
      const result = await readCodeIn(bigTx);
      const match = result.data === bigData;
      return { dataLength: result.data.length, expected: bigData.length, match };
    });
  }

  const hugeData = "Z".repeat(4000); // ~5 chunks
  const hugeTx = await test("codeIn (linked list, 4000 bytes, ~5 chunks)", async () => {
    return await codeIn(main_wallet, hugeData, "huge.txt", "text/plain", (pct) => process.stdout.write(`  ${pct.toFixed(0)}% `));
  });

  if (hugeTx) {
    await test("readCodeIn (huge) — verify", async () => {
      const result = await readCodeIn(hugeTx);
      return { dataLength: result.data.length, match: result.data === hugeData };
    });
  }

  await test("fetchInventoryTransactions (should see 5 total)", async () => {
    return await fetchInventoryTransactions(addr1, { limit: 10 });
  });

  // =========================================================================
  //  4. CONNECTION — friend request, approve, block, DM
  // =========================================================================
  console.log("\n========== 4. CONNECTION + DM ==========");

  const dbIdConn = "conn-test-" + Date.now();

  await test("initializeDbRoot (for connection)", async () => {
    return await initializeDbRoot(main_wallet, dbIdConn);
  });

  await test("requestConnection (wallet1 → wallet2)", async () => {
    return await requestConnection(main_wallet, dbIdConn, addr2, "dm", ["msg", "timestamp"], "timestamp");
  });

  await test("readConnection (should be pending)", async () => {
    return await readConnection(dbIdConn, addr1, addr2);
  });

  await test("manageConnection — wallet2 approves", async () => {
    return await manageConnection(wallet2, addr1, dbIdConn, 1); // 1 = APPROVED
  });

  await test("readConnection (should be approved)", async () => {
    return await readConnection(dbIdConn, addr1, addr2);
  });

  // DM messages
  await test("writeConnectionRow — wallet1 sends DM", async () => {
    return await writeConnectionRow(main_wallet, addr2, dbIdConn, JSON.stringify({ msg: "Hey!", timestamp: Date.now() }));
  });

  await test("writeConnectionRow — wallet2 replies", async () => {
    return await writeConnectionRow(wallet2, addr1, dbIdConn, JSON.stringify({ msg: "Hi back!", timestamp: Date.now() }));
  });

  // Block test
  await test("manageConnection — wallet1 blocks", async () => {
    return await manageConnection(main_wallet, addr2, dbIdConn, 2); // 2 = BLOCKED
  });

  await test("readConnection (should be blocked)", async () => {
    return await readConnection(dbIdConn, addr1, addr2);
  });

  await test("writeConnectionRow while blocked — should fail", async () => {
    return await writeConnectionRow(wallet2, addr1, dbIdConn, JSON.stringify({ msg: "blocked?" }));
  });

  // Unblock
  await test("manageConnection — wallet1 unblocks", async () => {
    return await manageConnection(main_wallet, addr2, dbIdConn, 1); // back to APPROVED
  });

  await test("readConnection (should be approved again)", async () => {
    return await readConnection(dbIdConn, addr1, addr2);
  });

  // Second connection wallet1 → wallet3
  await test("requestConnection (wallet1 → wallet3)", async () => {
    return await requestConnection(main_wallet, dbIdConn, addr3, "dm", ["msg", "timestamp"], "timestamp");
  });

  await test("fetchUserConnections (wallet1 should have 2)", async () => {
    return await fetchUserConnections(addr1);
  });

  // =========================================================================
  //  5. DATABASE — table + rows
  // =========================================================================
  console.log("\n========== 5. DATABASE TABLE + ROWS ==========");

  const dbId = "test-db-" + Date.now();

  await test("initializeDbRoot", async () => {
    return await initializeDbRoot(main_wallet, dbId);
  });

  await test("createTable (users)", async () => {
    return await createTable(main_wallet, dbId, "users", "Users", ["id", "name", "email"], "id");
  });

  await test("writeRow #1", async () => {
    return await writeRow(main_wallet, dbId, "users", JSON.stringify({ id: "1", name: "Alice", email: "alice@test.com" }));
  });

  await test("writeRow #2", async () => {
    return await writeRow(main_wallet, dbId, "users", JSON.stringify({ id: "2", name: "Bob", email: "bob@test.com" }));
  });

  await test("writeRow #3", async () => {
    return await writeRow(main_wallet, dbId, "users", JSON.stringify({ id: "3", name: "Charlie", email: "charlie@test.com" }));
  });

  await test("readTableRows (should see 3 rows)", async () => {
    return await readTableRows(dbId, "users", { limit: 10 });
  });

  // =========================================================================
  //  6. DATABASE — list structure check
  // =========================================================================
  console.log("\n========== 6. DB STRUCTURE CHECK ==========");

  await test("fetchTableMeta (users)", async () => {
    const t = await fetchTableMeta(dbId, "users");
    return {
      name: Buffer.from(t.name.slice(2), "hex").toString(),
      columnCount: t.columnNames.length,
      dataChain: { nowTx: t.dataChain.nowTx, beforeTx: t.dataChain.beforeTx },
      exists: t.exists,
    };
  });

  // Create a second table
  await test("createTable (posts)", async () => {
    return await createTable(main_wallet, dbId, "posts", "Posts", ["id", "title", "body"], "id");
  });

  await test("writeRow to posts", async () => {
    return await writeRow(main_wallet, dbId, "posts", JSON.stringify({ id: "1", title: "Hello", body: "First post!" }));
  });

  await test("updateUserMetadata", async () => {
    return await updateUserMetadata(main_wallet, JSON.stringify({ name: "Test User", version: 2 }));
  });

  await test("readUserState (final)", async () => {
    return await readUserState(addr1);
  });

  // =========================================================================
  //  SUMMARY
  // =========================================================================
  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("==========================================");
}

main().catch(console.error);
