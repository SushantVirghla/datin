/**
 * DATIN - Sovereign Token-2022 Mint Creation & 10,000,000 DTNC Minting Script
 *
 * This script creates a fresh Token-2022 mint on Solana Devnet where:
 * - Mint Authority: 7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc (Account 1 / Treasury)
 * - Decimals: 9
 * - Initial Mint: 10,000,000 DTNC minted directly into 7BuUZ's Associated Token Account
 * - Saves keypair backup to storage/dtnc_mint_keypair.json
 */

const fs = require('fs');
const path = require('path');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_2022_PROGRAM_ID = splToken.TOKEN_2022_PROGRAM_ID;

// Treasury Account 1 Keypair (7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc)
const TREASURY_SECRET = [
  51, 24, 198, 10, 145, 39, 76, 69, 98, 169, 147, 121, 231, 132, 235, 181, 190, 133, 241, 241, 97,
  36, 3, 77, 194, 215, 86, 250, 71, 6, 33, 178, 91, 241, 67, 112, 122, 194, 175, 48, 55, 176,
  128, 96, 49, 168, 2, 45, 152, 13, 76, 246, 2, 250, 247, 231, 188, 210, 98, 168, 149, 252, 99, 145,
];

async function main() {
  console.log('====================================================');
  console.log('🚀 DATIN TOKEN-2022 SOVEREIGN MINT INITIALIZER');
  console.log('====================================================');

  const connection = new web3.Connection(RPC_URL, 'confirmed');
  const treasuryKeypair = web3.Keypair.fromSecretKey(Uint8Array.from(TREASURY_SECRET));
  const treasuryPubkey = treasuryKeypair.publicKey;

  console.log(`📍 Treasury / Mint Authority: ${treasuryPubkey.toBase58()}`);

  const solBalance = await connection.getBalance(treasuryPubkey);
  console.log(`💰 Current SOL Balance: ${(solBalance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (solBalance < 0.01 * web3.LAMPORTS_PER_SOL) {
    throw new Error('Insufficient SOL in treasury to pay for mint creation rent.');
  }

  // Generate new Mint Keypair
  const mintKeypair = web3.Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;
  console.log(`\n💎 New DTNC Mint Address: ${mintPubkey.toBase58()}`);

  // Calculate rent exemption for Token-2022 Mint Account
  const mintRent = await connection.getMinimumBalanceForRentExemption(splToken.MINT_SIZE);

  // Derive Associated Token Account (ATA) for Treasury
  const treasuryAta = splToken.getAssociatedTokenAddressSync(
    mintPubkey,
    treasuryPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`📦 Treasury DTNC Token Account (ATA): ${treasuryAta.toBase58()}`);

  const MINT_AMOUNT_TOKENS = 10_000_000n; // 10 Million DTNC
  const rawAmount = MINT_AMOUNT_TOKENS * 1_000_000_000n; // 9 decimals

  // Build atomic transaction
  const tx = new web3.Transaction();

  // 1. Create account for mint
  tx.add(
    web3.SystemProgram.createAccount({
      fromPubkey: treasuryPubkey,
      newAccountPubkey: mintPubkey,
      space: splToken.MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize mint with 7BuUZ as Mint Authority
  tx.add(
    splToken.createInitializeMint2Instruction(
      mintPubkey,
      9,
      treasuryPubkey,
      treasuryPubkey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Create Associated Token Account for Treasury
  tx.add(
    splToken.createAssociatedTokenAccountInstruction(
      treasuryPubkey,
      treasuryAta,
      treasuryPubkey,
      mintPubkey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Mint 10,000,000 DTNC tokens directly to Treasury ATA
  tx.add(
    splToken.createMintToInstruction(
      mintPubkey,
      treasuryAta,
      treasuryPubkey,
      rawAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  console.log('\n📡 Broadcasting atomic transaction to Solana Devnet...');
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasuryPubkey;

  // Sign with both Treasury (payer + mint authority) and Mint Keypair (new account)
  tx.sign(treasuryKeypair, mintKeypair);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log(`⏳ Waiting for on-chain confirmation: ${sig}`);
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  console.log('\n🎉 SUCCESS! Fresh Token-2022 Mint Created & Funded:');
  console.log(`   Mint Address:   ${mintPubkey.toBase58()}`);
  console.log(`   Mint Authority: ${treasuryPubkey.toBase58()} (YOU)`);
  console.log(`   Supply Minted:  10,000,000 DTNC`);
  console.log(`   Transaction:    https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  console.log(`   Token Explorer: https://explorer.solana.com/address/${mintPubkey.toBase58()}?cluster=devnet`);

  // Save Mint Keypair Backup
  const storageDir = path.join(__dirname, 'storage');
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  const keypairBackupPath = path.join(storageDir, 'dtnc_mint_keypair.json');
  fs.writeFileSync(keypairBackupPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
  console.log(`\n💾 Mint keypair backed up to: ${keypairBackupPath}`);

  return {
    mintAddress: mintPubkey.toBase58(),
    signature: sig,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Mint Creation Error:', err);
      process.exit(1);
    });
}

module.exports = { main };
