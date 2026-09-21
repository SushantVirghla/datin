const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

// ==================== CONFIGURATION ====================
const DTNC_TOKEN_MINT = new web3.PublicKey(
  process.env.DTNC_TOKEN_MINT || 'GTtYpb1bkEPFik2q9ecGBrMTs1TtzCC47DZvez5ahqus'
);
const DTNC_DECIMALS = 9;
const TOKEN_2022_PROGRAM_ID = splToken.TOKEN_2022_PROGRAM_ID; // TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb

const DEFAULT_DEMO_KEYPAIR = [
  51, 24, 198, 10, 145, 39, 76, 69, 98, 169, 147, 121, 231, 132, 235, 181, 190, 133, 241, 241, 97,
  36, 3, 77, 194, 215, 86, 250, 71, 6, 33, 178, 91, 241, 67, 112, 122, 194, 175, 48, 55, 176,
  128, 96, 49, 168, 2, 45, 152, 13, 76, 246, 2, 250, 247, 231, 188, 210, 98, 168, 149, 252, 99, 145,
];

function getSolanaConnection() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new web3.Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30000,
  });
}

function getTreasuryKeypair() {
  const keypairStr = process.env.TREASURY_KEYPAIR;
  if (keypairStr) {
    try {
      const arr = JSON.parse(keypairStr);
      return web3.Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch (err) {
      console.warn('⚠️ Failed to parse TREASURY_KEYPAIR env variable, falling back to default:', err.message);
    }
  }
  return web3.Keypair.fromSecretKey(Uint8Array.from(DEFAULT_DEMO_KEYPAIR));
}

/**
 * Transfer DTNC tokens to buyer's Solana Devnet wallet
 */
async function transferDTNCTokens(walletAddress, amount, transferType = 'purchase') {
  console.log(`\n🪙 === [SOLANA DTNC TRANSFER INITIATED] ===`);
  console.log(`   Recipient: ${walletAddress}`);
  console.log(`   Amount: ${amount} DTNC`);
  console.log(`   Type: ${transferType}`);

  try {
    const connection = getSolanaConnection();
    const treasuryKeypair = getTreasuryKeypair();
    const treasuryPubkey = treasuryKeypair.publicKey;
    console.log(`   Treasury Pubkey: ${treasuryPubkey.toBase58()}`);

    // 1. Validate Recipient Address
    let recipientPubkey;
    try {
      recipientPubkey = new web3.PublicKey(walletAddress.trim());
    } catch (err) {
      return {
        success: false,
        error: `Invalid Solana wallet address: ${err.message}`,
      };
    }

    // 2. Check Treasury SOL Balance for Gas
    const solBalanceLamports = await connection.getBalance(treasuryPubkey);
    const solBalance = solBalanceLamports / web3.LAMPORTS_PER_SOL;
    console.log(`   Treasury SOL Balance: ${solBalance} SOL`);

    if (solBalance < 0.001) {
      return {
        success: false,
        error: `Treasury wallet has insufficient SOL (${solBalance} SOL). Needs at least 0.001 SOL for gas.`,
      };
    }

    // 3. Derive Associated Token Accounts (ATA) under Token-2022
    const treasuryAta = splToken.getAssociatedTokenAddressSync(
      DTNC_TOKEN_MINT,
      treasuryPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const recipientAta = splToken.getAssociatedTokenAddressSync(
      DTNC_TOKEN_MINT,
      recipientPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log(`   Treasury ATA: ${treasuryAta.toBase58()}`);
    console.log(`   Recipient ATA: ${recipientAta.toBase58()}`);

    // 4. Check Treasury DTNC Token Balance
    let treasuryTokenBalance = 0;
    try {
      const bal = await connection.getTokenAccountBalance(treasuryAta);
      treasuryTokenBalance = bal.value.uiAmount || 0;
      console.log(`   Treasury DTNC Balance: ${treasuryTokenBalance} DTNC`);
    } catch (err) {
      console.warn('   ⚠️ Could not fetch treasury token balance:', err.message);
    }

    const amountTokens = parseInt(amount, 10);
    if (isNaN(amountTokens) || amountTokens <= 0) {
      return {
        success: false,
        error: `Invalid transfer amount: ${amount}`,
      };
    }

    // 5. Build Transaction
    const tx = new web3.Transaction();

    // Check if recipient ATA exists; if not, add instruction to create it
    const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
    if (!recipientAtaInfo) {
      console.log('   ℹ️ Recipient ATA does not exist yet. Adding ATA creation instruction...');
      tx.add(
        splToken.createAssociatedTokenAccountInstruction(
          treasuryPubkey, // payer
          recipientAta,   // associatedToken
          recipientPubkey,// owner
          DTNC_TOKEN_MINT,// mint
          TOKEN_2022_PROGRAM_ID
        )
      );
    } else {
      console.log('   ✅ Recipient ATA already exists on Devnet.');
    }

    // Add TransferChecked instruction (Token-2022 requires TransferChecked)
    const amountInBaseUnits = BigInt(amountTokens) * BigInt(10 ** DTNC_DECIMALS);
    tx.add(
      splToken.createTransferCheckedInstruction(
        treasuryAta,
        DTNC_TOKEN_MINT,
        recipientAta,
        treasuryPubkey,
        amountInBaseUnits,
        DTNC_DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    // 6. Fetch Recent Blockhash and Send
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = treasuryPubkey;
    tx.sign(treasuryKeypair);

    console.log('   📡 Broadcasting transaction to Solana Devnet...');
    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`   ⏳ Transaction sent! Signature: ${signature}`);
    console.log(`   ⏳ Confirming transaction on Devnet...`);

    // Await confirmation (with 20s timeout)
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      console.error('   ❌ Transaction confirmed with error:', confirmation.value.err);
      return {
        success: false,
        error: `Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        signature,
      };
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    console.log(`   ✅ Transaction SUCCESS!`);
    console.log(`   🔗 Explorer: ${explorerUrl}\n`);

    return {
      success: true,
      signature,
      explorer_url: explorerUrl,
      transfer_type: transferType,
      amount: amountTokens,
      recipient: walletAddress.trim(),
      message: `Successfully transferred ${amountTokens} DTNC tokens to ${walletAddress.trim()}`,
    };
  } catch (err) {
    console.error('   ❌ Solana DTNC Transfer Exception:', err);
    return {
      success: false,
      error: err.message || 'Token transfer encountered an unexpected error',
      details: err.stack,
    };
  }
}

/**
 * Fetch token and treasury metadata
 */
async function getDTNCTokenInfo() {
  try {
    const connection = getSolanaConnection();
    const treasuryKeypair = getTreasuryKeypair();
    const treasuryPubkey = treasuryKeypair.publicKey;

    let treasurySolBalance = 0;
    try {
      const lamports = await connection.getBalance(treasuryPubkey);
      treasurySolBalance = lamports / web3.LAMPORTS_PER_SOL;
    } catch {
      treasurySolBalance = 'Unknown';
    }

    const treasuryAta = splToken.getAssociatedTokenAddressSync(
      DTNC_TOKEN_MINT,
      treasuryPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    let tokenBalance = 0;
    let ataExists = false;
    try {
      const ataInfo = await connection.getAccountInfo(treasuryAta);
      ataExists = !!ataInfo;
      if (ataExists) {
        const bal = await connection.getTokenAccountBalance(treasuryAta);
        tokenBalance = bal.value.uiAmount || 0;
      }
    } catch (err) {
      console.warn('Failed to get token balance:', err.message);
    }

    return {
      success: true,
      token_name: 'DATIN Coin (DTNC)',
      mint_address: DTNC_TOKEN_MINT.toBase58(),
      decimals: DTNC_DECIMALS,
      token_program: TOKEN_2022_PROGRAM_ID.toBase58(),
      treasury_address: treasuryPubkey.toBase58(),
      treasury_sol_balance: treasurySolBalance,
      treasury_token_account: treasuryAta.toBase58(),
      treasury_token_account_exists: ataExists,
      treasury_balance: tokenBalance,
      network: 'devnet',
      explorer_url: `https://explorer.solana.com/address/${DTNC_TOKEN_MINT.toBase58()}?cluster=devnet`,
      treasury_explorer_url: `https://explorer.solana.com/address/${treasuryPubkey.toBase58()}?cluster=devnet`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Distribute rewards to multiple validator wallets
 */
async function distributeDTNCRewards(validatorWallets, amountPerValidator) {
  const results = [];
  const amount = parseInt(amountPerValidator, 10);

  for (const wallet of validatorWallets) {
    const res = await transferDTNCTokens(wallet, amount, 'validation_reward');
    results.push({ wallet, result: res });
  }

  const successful = results.filter((r) => r.result.success).length;
  const failed = results.length - successful;

  return {
    success: failed === 0,
    results,
    total_distributed: successful * amount,
    successful_transfers: successful,
    failed_transfers: failed,
    message: `Distributed to ${successful}/${validatorWallets.length} validators`,
  };
}

// In-memory set of used payment signatures for replay prevention
const usedPaymentSignatures = new Set();

/**
 * Cryptographically verify that buyer paid required SOL to Treasury on Solana Devnet
 */
async function verifySolPayment(signature, expectedAmountSol, buyerAddress) {
  if (!signature) {
    return { valid: false, error: 'No SOL payment transaction signature provided.' };
  }

  if (usedPaymentSignatures.has(signature)) {
    return { valid: false, error: 'This payment transaction has already been claimed (replay attack prevented).' };
  }

  try {
    const connection = getSolanaConnection();
    const treasuryPubkeyStr = getTreasuryKeypair().publicKey.toBase58();

    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      return { valid: false, error: 'Payment transaction was not found or has not confirmed yet on Solana Devnet.' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: `Payment transaction failed on-chain: ${JSON.stringify(tx.meta.err)}` };
    }

    // Minimum acceptable lamports (allow 0.001 SOL buffer for fee rounding)
    const expectedNum = parseFloat(expectedAmountSol);
    const minLamports = Math.round((expectedNum - 0.001) * web3.LAMPORTS_PER_SOL);
    let paidLamports = 0;
    let foundTransfer = false;

    for (const ix of tx.transaction.message.instructions) {
      if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info;
        if (info.destination === treasuryPubkeyStr) {
          paidLamports += info.lamports;
          foundTransfer = true;
        }
      }
    }

    if (!foundTransfer || paidLamports < minLamports) {
      return {
        valid: false,
        error: `Insufficient SOL received. Expected ${expectedNum} SOL to treasury ${treasuryPubkeyStr}, but received ${paidLamports / web3.LAMPORTS_PER_SOL} SOL.`,
      };
    }

    // Mark signature as used
    usedPaymentSignatures.add(signature);
    return {
      valid: true,
      paidLamports,
      paidSol: paidLamports / web3.LAMPORTS_PER_SOL,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Error verifying SOL payment on blockchain: ${err.message}`,
    };
  }
}

module.exports = {
  transferDTNCTokens,
  getDTNCTokenInfo,
  distributeDTNCRewards,
  verifySolPayment,
  DTNC_TOKEN_MINT,
  DTNC_DECIMALS,
  TOKEN_2022_PROGRAM_ID,
  getTreasuryKeypair,
};

