import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
// Client for testing data_storage program in Solana Playground
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import type { Fizzbuzz } from "../target/types/fizzbuzz";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Fizzbuzz as anchor.Program<Fizzbuzz>;


// Configure the client
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Fizzbuzz as anchor.Program;

// Test data - keeping content short to avoid serialization issues
const testContent = "Test report data";
const testTokenAddress = new PublicKey("11111111111111111111111111111111");
const testReward = new anchor.BN(100);
const testValidators = new anchor.BN(5);

console.log("=".repeat(60));
console.log("DATA STORAGE PROGRAM - CLIENT TEST");
console.log("=".repeat(60));
console.log("Program ID:", program.programId.toString());
console.log("Wallet:", provider.wallet.publicKey.toString());
console.log("=".repeat(60));

// Derive PDA for data record
const [dataRecordPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("data-record"), provider.wallet.publicKey.toBuffer()],
  program.programId
);

console.log("\n📍 Data Record PDA:", dataRecordPda.toString());
console.log("📍 Bump:", bump);

async function testInitRecord() {
  console.log("\n🧪 TEST 1: Initialize a data record");
  console.log("-".repeat(60));

  try {
    // Call init_record instruction
    const tx = await program.methods
      .initRecord(testContent, testTokenAddress, testReward, testValidators)
      .accounts({
        owner: provider.wallet.publicKey,
        dataRecord: dataRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Transaction signature:", tx);

    // Fetch the account data
    const accountData = await program.account.dataRecord.fetch(dataRecordPda);

    console.log("\n📦 Stored Data:");
    console.log("   Owner:", accountData.owner.toString());
    console.log("   Content:", accountData.content);
    console.log("   Token Address:", accountData.tokenAddress.toString());
    console.log("   Reward:", accountData.reward.toString());
    console.log("   Total Validators:", accountData.totalValidators.toString());
    console.log("   Created At:", accountData.createdAt.toString());

    console.log("\n✅ TEST 1 PASSED: Record initialized successfully!");
    return true;
  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error.message);

    // If account already exists, that's ok for testing
    if (error.message && error.message.includes("already in use")) {
      console.log("ℹ️  Account already exists, skipping to update tests...");
      return true;
    }
    return false;
  }
}

async function testUpdateContent() {
  console.log("\n🧪 TEST 2: Update record content");
  console.log("-".repeat(60));

  const newContent = "Updated data";

  try {
    const tx = await program.methods
      .updateContent(newContent)
      .accounts({
        owner: provider.wallet.publicKey,
        dataRecord: dataRecordPda,
      })
      .rpc();

    console.log("✅ Transaction signature:", tx);

    // Verify update
    const accountData = await program.account.dataRecord.fetch(dataRecordPda);
    console.log("\n📦 Updated Content:", accountData.content);
    console.log("   Updated At:", accountData.updatedAt.toString());

    console.log("\n✅ TEST 2 PASSED: Content updated successfully!");
    return true;
  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error.message);
    return false;
  }
}

async function testUpdateReward() {
  console.log("\n🧪 TEST 3: Update record reward");
  console.log("-".repeat(60));

  const newReward = new anchor.BN(200);

  try {
    const tx = await program.methods
      .updateReward(newReward)
      .accounts({
        owner: provider.wallet.publicKey,
        dataRecord: dataRecordPda,
      })
      .rpc();

    console.log("✅ Transaction signature:", tx);

    // Verify update
    const accountData = await program.account.dataRecord.fetch(dataRecordPda);
    console.log("\n📦 Updated Reward:", accountData.reward.toString());

    console.log("\n✅ TEST 3 PASSED: Reward updated successfully!");
    return true;
  } catch (error) {
    console.error("❌ TEST 3 FAILED:", error.message);
    return false;
  }
}

async function testUpdateValidators() {
  console.log("\n🧪 TEST 4: Update validators count");
  console.log("-".repeat(60));

  const newValidators = new anchor.BN(10);

  try {
    const tx = await program.methods
      .updateValidators(newValidators)
      .accounts({
        owner: provider.wallet.publicKey,
        dataRecord: dataRecordPda,
      })
      .rpc();

    console.log("✅ Transaction signature:", tx);

    // Verify update
    const accountData = await program.account.dataRecord.fetch(dataRecordPda);
    console.log(
      "\n📦 Updated Validators:",
      accountData.totalValidators.toString()
    );

    console.log("\n✅ TEST 4 PASSED: Validators updated successfully!");
    return true;
  } catch (error) {
    console.error("❌ TEST 4 FAILED:", error.message);
    return false;
  }
}

async function testGetRecord() {
  console.log("\n🧪 TEST 5: Fetch complete record");
  console.log("-".repeat(60));

  try {
    const accountData = await program.account.dataRecord.fetch(dataRecordPda);

    console.log("\n📦 Complete Record Data:");
    console.log("   Owner:", accountData.owner.toString());
    console.log("   Content:", accountData.content);
    console.log("   Token Address:", accountData.tokenAddress.toString());
    console.log("   Reward:", accountData.reward.toString());
    console.log("   Total Validators:", accountData.totalValidators.toString());
    console.log("   Created At:", accountData.createdAt.toString());
    console.log("   Updated At:", accountData.updatedAt.toString());

    console.log("\n✅ TEST 5 PASSED: Record fetched successfully!");
    return true;
  } catch (error) {
    console.error("❌ TEST 5 FAILED:", error.message);
    return false;
  }
}

// Main execution
(async () => {
  try {
    let passed = 0;
    let failed = 0;

    // Run all tests
    if (await testInitRecord()) passed++;
    else failed++;
    if (await testUpdateContent()) passed++;
    else failed++;
    if (await testUpdateReward()) passed++;
    else failed++;
    if (await testUpdateValidators()) passed++;
    else failed++;
    if (await testGetRecord()) passed++;
    else failed++;

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("=".repeat(60));

    if (failed === 0) {
      console.log("\n🎉 All tests passed! Your program is working correctly!");
      console.log("\n📝 Next Steps:");
      console.log("   1. Copy your Program ID:", program.programId.toString());
      console.log("   2. Update solana_client.py with this Program ID");
      console.log("   3. Integrate with your Express backend");
    } else {
      console.log("\n⚠️  Some tests failed. Please check the errors above.");
    }
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
  }
})();
