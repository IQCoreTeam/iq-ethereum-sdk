import "dotenv/config";
import { Wallet, parseEther } from "ethers";
import { setRpcUrl, getProvider } from "../src/sdk/utils/provider";
import {
  requestConnection,
  manageConnection,
  writeConnectionRow,
} from "../src/sdk/writer/iqdb";
import {
  readConnection,
  readConnectionRows,
  fetchUserConnections,
} from "../src/sdk/reader/iqdb";

setRpcUrl(process.env.SEPOLIA_RPC_URL!);
const provider = getProvider();
const main = new Wallet(process.env.PRIVATE_KEY!, provider);

// Create 3 ephemeral receivers (random each run)
const receivers = [
  Wallet.createRandom().connect(provider),
  Wallet.createRandom().connect(provider),
  Wallet.createRandom().connect(provider),
];

const FUND_AMOUNT = parseEther("0.002"); // enough for LINKED_LIST_FEE + gas a few times
const DB_ID = "connections-test-" + Date.now();

function replacer(_: string, v: any) { return typeof v === "bigint" ? v.toString() : v; }

async function log(label: string, fn: () => Promise<any>) {
  console.log(`\n--- ${label} ---`);
  try {
    const result = await fn();
    console.log("OK:", JSON.stringify(result, replacer, 2));
    return result;
  } catch (e: any) {
    console.log("FAIL:", e.message?.slice(0, 300));
    return null;
  }
}

async function fundReceiver(w: Wallet) {
  const tx = await main.sendTransaction({ to: w.address, value: FUND_AMOUNT });
  await tx.wait();
}

async function main_() {
  const mainAddr = await main.getAddress();
  console.log("Main signer:", mainAddr);
  console.log("Main balance:", (await provider.getBalance(mainAddr)).toString());
  console.log("Receivers:", receivers.map((r) => r.address));
  console.log("DB ID:", DB_ID);

  // 0. Fund receivers (each needs a bit of ETH to approve + write connection data)
  for (const r of receivers) {
    await log(`fund ${r.address.slice(0, 10)}...`, async () => {
      await fundReceiver(r);
      return (await provider.getBalance(r.address)).toString();
    });
  }

  // 1. Initialize a shared DB root from main (connections need a dbRootId)
  await log("initializeDbRoot", async () => {
    const { initializeDbRoot } = await import("../src/sdk/writer/iqdb");
    return await initializeDbRoot(main, DB_ID);
  });

  // 2. Send 3 friend requests (main → each receiver)
  const schema = {
    tableName: "dm",
    columns: ["id", "msg"],
    idCol: "id",
    extKeys: [] as string[],
  };
  for (const r of receivers) {
    await log(`requestConnection → ${r.address.slice(0, 10)}`, async () => {
      return await requestConnection(
        main, DB_ID, r.address,
        schema.tableName, schema.columns, schema.idCol, schema.extKeys,
      );
    });
  }

  // 3. Each receiver reads its own connection status (should be pending)
  for (const r of receivers) {
    await log(`readConnection ${r.address.slice(0, 10)} (pending)`, async () => {
      return await readConnection(DB_ID, mainAddr, r.address);
    });
  }

  // 4. Receivers 0 and 1 approve; receiver 2 blocks
  await log(`receiver[0] approves`, async () => {
    return await manageConnection(receivers[0], mainAddr, DB_ID, 1);
  });
  await log(`receiver[1] approves`, async () => {
    return await manageConnection(receivers[1], mainAddr, DB_ID, 1);
  });
  await log(`receiver[2] blocks`, async () => {
    return await manageConnection(receivers[2], mainAddr, DB_ID, 2);
  });

  // 5. Re-read statuses
  for (const r of receivers) {
    await log(`readConnection ${r.address.slice(0, 10)} (after manage)`, async () => {
      return await readConnection(DB_ID, mainAddr, r.address);
    });
  }

  // 6. On approved connections, both sides write rows (test TxChain on connection)
  for (let i = 0; i < 2; i++) {
    const r = receivers[i];
    await log(`main → receiver[${i}] writeConnectionRow (msg 1)`, async () => {
      return await writeConnectionRow(
        main, r.address, DB_ID,
        JSON.stringify({ id: "m1", msg: `hi ${i}` }),
      );
    });
    await log(`receiver[${i}] → main writeConnectionRow (msg 2)`, async () => {
      return await writeConnectionRow(
        r, mainAddr, DB_ID,
        JSON.stringify({ id: "r1", msg: `hello back ${i}` }),
      );
    });
    await log(`main → receiver[${i}] writeConnectionRow (msg 3)`, async () => {
      return await writeConnectionRow(
        main, r.address, DB_ID,
        JSON.stringify({ id: "m2", msg: `bye ${i}` }),
      );
    });
  }

  // 7. Read back each approved connection's rows (expect 3 per connection, newest first)
  for (let i = 0; i < 2; i++) {
    const r = receivers[i];
    await log(`readConnectionRows receiver[${i}]`, async () => {
      const rows = await readConnectionRows(DB_ID, mainAddr, r.address, { limit: 10 });
      console.log(`  count: ${rows.length}`);
      const msgs = rows.map((x: any) => x.data?.msg);
      console.log(`  order: ${JSON.stringify(msgs)}`);
      return { count: rows.length, msgs };
    });
  }

  // 8. Blocked connection: writeConnectionRow should fail
  await log(`writeConnectionRow on BLOCKED (expect fail)`, async () => {
    return await writeConnectionRow(
      main, receivers[2].address, DB_ID,
      JSON.stringify({ id: "x", msg: "should not write" }),
    );
  });

  // 9. fetchUserConnections — main should see 3 connections
  await log(`fetchUserConnections(main)`, async () => {
    const list = await fetchUserConnections(mainAddr);
    console.log(`  count: ${list.length}`);
    return list;
  });

  // 10. fetchUserConnections — each receiver should see 1 connection
  for (let i = 0; i < receivers.length; i++) {
    await log(`fetchUserConnections(receiver[${i}])`, async () => {
      return await fetchUserConnections(receivers[i].address);
    });
  }

  console.log("\n=== CONNECTIONS TEST DONE ===");
}

main_().catch(console.error);
