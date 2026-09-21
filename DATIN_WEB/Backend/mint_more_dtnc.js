/**
 * Mint additional DTNC tokens on the official DATIN Coin mint (mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3)
 * Usage: node mint_more_dtnc.js [amount] [recipient_wallet]
 * Example: node mint_more_dtnc.js 5000000 7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc
 */

const fs = require('fs');
const path = require('path');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_MINT = new web3.PublicKey('mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3');
const TOKEN_2022_PROGRAM_ID = splToken.TOKEN_2022_PROGRAM_ID;

// Mint Authority Keypair: BAG3RPknVCibKu2PPU4Nn1wq8AKpdGbnUxESpyTXAwNC
const MINT_AUTH_SECRET = [
  23,83,1,72,142,108,202,75,146,186,104,46,249,49,250,160,179,86,250,133,46,231,169,61,144,45,238,13,189,209,115,169,150,244,26,178,154,108,46,249,76,141,93,111,100,213,202,71,243,76,75,158,91,70,88,97,47,54,166,218,178,254,42,109
];

// Payer (Treasury): 7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc
const TREASURY_SECRET = [
  51, 24, 198, 10, 145, 39, 76, 69, 98, 169, 147, 121, 231, 132, 235, 181, 190, 133, 241, 241, 97,
  36, 3, 77, 194, 215, 86, 250, 71, 6, 33, 178, 91, 241, 67, 112, 122, 194, 175, 48, 55, 176,
  128, 96, 49, 168, 2, 45, 152, 13, 76, 246, 2, 250, 247, 231, 188, 210, 98, 168, 149, 252, 99, 145
];

async function mintTokens(amount = 10_000_000, recipient = '7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc') {
  const connection = new web3.Connection(RPC_URL, 'confirmed');
  const mintAuthKeypair = web3.Keypair.fromSecretKey(Uint8Array.from(MINT_AUTH_SECRET));
  const payerKeypair = web3.Keypair.fromSecretKey(Uint8Array.from(TREASURY_SECRET));
  const recipientPubkey = new web3.PublicKey(recipient);

  console.log(`🪙 Minting ${amount} DTNC on official mint: ${TOKEN_MINT.toBase58()}`);
  console.log(`   Recipient: ${recipientPubkey.toBase58()}`);
  console.log(`   Mint Authority: ${mintAuthKeypair.publicKey.toBase58()}`);

  const recipientAta = splToken.getAssociatedTokenAddressSync(
    TOKEN_MINT,
    recipientPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new web3.Transaction();

  // Ensure ATA exists
  const ataInfo = await connection.getAccountInfo(recipientAta);
  if (!ataInfo) {
    console.log(`   Creating ATA: ${recipientAta.toBase58()}`);
    tx.add(
      splToken.createAssociatedTokenAccountInstruction(
        payerKeypair.publicKey,
        recipientAta,
        recipientPubkey,
        TOKEN_MINT,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Mint instruction
  const rawAmount = BigInt(amount) * 1_000_000_000n;
  tx.add(
    splToken.createMintToInstruction(
      TOKEN_MINT,
      recipientAta,
      mintAuthKeypair.publicKey,
      rawAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  tx.feePayer = payerKeypair.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(payerKeypair, mintAuthKeypair);

  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log(`⏳ Confirming transaction: ${sig}`);
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

  const bal = await connection.getTokenAccountBalance(recipientAta);
  console.log(`✅ Success! Updated DTNC Balance: ${bal.value.uiAmountString}`);
  console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);

  return { success: true, signature: sig, balance: bal.value.uiAmountString };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const amount = args[0] ? parseInt(args[0], 10) : 10_000_000;
  const recipient = args[1] || '7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc';
  mintTokens(amount, recipient)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error minting:', err);
      process.exit(1);
    });
}

module.exports = { mintTokens };
