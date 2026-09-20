#!/usr/bin/env python3
"""
DTNC Token Transfer Script for DATIN Platform
Token Mint: mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3
Mint Authority: BAG3RPknVCibKu2PPU4Nn1wq8AKpdGbnUxESpyTXAwNC
"""

import sys
import json
import os
from solana.rpc.api import Client
from solana.transaction import Transaction
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID

# ==================== CONFIGURATION ====================

# Your DTNC Token Details (from Solana Explorer)
DTNC_TOKEN_MINT = "mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3"
DTNC_DECIMALS = 9  # Standard for most tokens
MINT_AUTHORITY = "BAG3RPknVCibKu2PPU4Nn1wq8AKpdGbnUxESpyTXAwNC"

# Solana Configuration
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")

# Token Program IDs
TOKEN_2022_PROGRAM_ID = Pubkey.from_string("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

# Global variable to store detected token program
DETECTED_TOKEN_PROGRAM = None

# ==================== LOAD TREASURY KEYPAIR ====================

def get_treasury_keypair():
    """Load treasury keypair that holds DTNC tokens"""
    keypair_str = os.getenv("TREASURY_KEYPAIR")
    
    if keypair_str:
        try:
            keypair_array = json.loads(keypair_str)
            return Keypair.from_bytes(bytes(keypair_array))
        except Exception as e:
            print(f"⚠️  Warning: Failed to load treasury keypair: {e}", file=sys.stderr)
    
    # Demo keypair for testing (DO NOT USE IN PRODUCTION!)
    print("⚠️  WARNING: Using demo keypair - SET TREASURY_KEYPAIR in production!", file=sys.stderr)
    demo_keypair = [51,24,198,10,145,39,76,69,98,169,147,121,231,132,235,181,190,133,241,241,97,36,3,77,194,215,86,250,71,6,33,178,91,241,67,112,122,194,175,48,55,176,128,96,49,168,2,45,152,13,76,246,2,250,247,231,188,210,98,168,149,252,99,145]
    return Keypair.from_bytes(bytes(demo_keypair))

# ==================== TOKEN PROGRAM DETECTION ====================

def get_token_program_id(client: Client):
    """Check which token program the mint uses"""
    global DETECTED_TOKEN_PROGRAM
    
    if DETECTED_TOKEN_PROGRAM:
        return DETECTED_TOKEN_PROGRAM
    
    try:
        mint_pubkey = Pubkey.from_string(DTNC_TOKEN_MINT)
        account_info = client.get_account_info(mint_pubkey)
        
        if account_info.value:
            owner = str(account_info.value.owner)
            # Check if it's Token-2022
            if owner == str(TOKEN_2022_PROGRAM_ID):
                print(f"   ✅ Detected Token-2022 program", file=sys.stderr)
                DETECTED_TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID
                return TOKEN_2022_PROGRAM_ID
        
        print(f"   ✅ Using standard Token program", file=sys.stderr)
        DETECTED_TOKEN_PROGRAM = TOKEN_PROGRAM_ID
        return TOKEN_PROGRAM_ID
    except Exception as e:
        print(f"   ⚠️  Error detecting token program: {e}, using default", file=sys.stderr)
        DETECTED_TOKEN_PROGRAM = TOKEN_PROGRAM_ID
        return TOKEN_PROGRAM_ID

# ==================== HELPER FUNCTIONS ====================

def get_associated_token_address(owner: Pubkey, mint: Pubkey, token_program_id: Pubkey) -> Pubkey:
    """Calculate associated token account address"""
    seeds = [
        bytes(owner),
        bytes(token_program_id),
        bytes(mint),
    ]
    pda, _ = Pubkey.find_program_address(seeds, ASSOCIATED_TOKEN_PROGRAM_ID)
    return pda

def create_associated_token_account_instruction(
    payer: Pubkey,
    owner: Pubkey,
    mint: Pubkey,
    token_program_id: Pubkey
) -> Instruction:
    """Create instruction to create associated token account"""
    associated_token = get_associated_token_address(owner, mint, token_program_id)
    
    keys = [
        AccountMeta(pubkey=payer, is_signer=True, is_writable=True),
        AccountMeta(pubkey=associated_token, is_signer=False, is_writable=True),
        AccountMeta(pubkey=owner, is_signer=False, is_writable=False),
        AccountMeta(pubkey=mint, is_signer=False, is_writable=False),
        AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
        AccountMeta(pubkey=token_program_id, is_signer=False, is_writable=False),
    ]
    
    return Instruction(
        program_id=ASSOCIATED_TOKEN_PROGRAM_ID,
        accounts=keys,
        data=bytes([])
    )

def create_transfer_checked_instruction(
    source: Pubkey,
    mint: Pubkey,
    destination: Pubkey,
    owner: Pubkey,
    amount: int,
    decimals: int,
    token_program_id: Pubkey
) -> Instruction:
    """Create SPL token transfer instruction"""
    # TransferChecked instruction discriminator (12)
    data = bytes([12]) + amount.to_bytes(8, 'little') + bytes([decimals])
    
    keys = [
        AccountMeta(pubkey=source, is_signer=False, is_writable=True),
        AccountMeta(pubkey=mint, is_signer=False, is_writable=False),
        AccountMeta(pubkey=destination, is_signer=False, is_writable=True),
        AccountMeta(pubkey=owner, is_signer=True, is_writable=False),
    ]
    
    return Instruction(
        program_id=token_program_id,
        accounts=keys,
        data=data
    )

def check_token_account_exists(client: Client, token_account: Pubkey) -> bool:
    """Check if token account exists"""
    try:
        response = client.get_account_info(token_account)
        return response.value is not None
    except:
        return False

# ==================== MAIN TRANSFER FUNCTION ====================

def transfer_tokens(wallet_address: str, amount: str, transfer_type: str):
    """
    Transfer DTNC tokens to buyer's wallet
    
    Args:
        wallet_address: Buyer's Solana wallet address
        amount: Number of DTNC tokens to transfer
        transfer_type: Type of transfer (purchase, reward, etc.)
    """
    try:
        print(f"🔄 Starting DTNC transfer...", file=sys.stderr)
        print(f"   To: {wallet_address}", file=sys.stderr)
        print(f"   Amount: {amount} DTNC", file=sys.stderr)
        print(f"   Type: {transfer_type}", file=sys.stderr)
        
        # Initialize Solana client with retry logic
        max_retries = 3
        client = None
        for attempt in range(max_retries):
            try:
                client = Client(SOLANA_RPC_URL)
                # Test connection
                client.is_connected()
                print(f"   ✅ Connected to Solana RPC", file=sys.stderr)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"   ⚠️  Connection attempt {attempt + 1} failed, retrying...", file=sys.stderr)
                    continue
                else:
                    return {
                        "success": False,
                        "error": f"Failed to connect to Solana RPC after {max_retries} attempts: {str(e)}"
                    }
        
        treasury = get_treasury_keypair()
        print(f"   Treasury Wallet: {treasury.pubkey()}", file=sys.stderr)
        
        # Detect token program
        token_program_id = get_token_program_id(client)
        print(f"   Token Program: {token_program_id}", file=sys.stderr)
        
        # Check treasury SOL balance
        try:
            sol_balance_resp = client.get_balance(treasury.pubkey())
            sol_balance = sol_balance_resp.value / 1_000_000_000  # Convert lamports to SOL
            print(f"   Treasury SOL Balance: {sol_balance} SOL", file=sys.stderr)
            
            if sol_balance < 0.001:
                return {
                    "success": False,
                    "error": f"Insufficient SOL balance in treasury wallet. Current: {sol_balance} SOL, Required: at least 0.001 SOL",
                    "treasury_address": str(treasury.pubkey()),
                    "sol_balance": sol_balance
                }
        except Exception as e:
            print(f"   ⚠️  Could not check SOL balance: {e}", file=sys.stderr)
        
        # Validate wallet address
        try:
            recipient_pubkey = Pubkey.from_string(wallet_address)
        except Exception as e:
            return {
                "success": False,
                "error": f"Invalid wallet address: {str(e)}"
            }
        
        # Get token mint
        mint_pubkey = Pubkey.from_string(DTNC_TOKEN_MINT)
        
        # Calculate associated token accounts with correct token program
        treasury_token_account = get_associated_token_address(treasury.pubkey(), mint_pubkey, token_program_id)
        recipient_token_account = get_associated_token_address(recipient_pubkey, mint_pubkey, token_program_id)
        
        print(f"   Treasury Token Account: {treasury_token_account}", file=sys.stderr)
        print(f"   Recipient Token Account: {recipient_token_account}", file=sys.stderr)
        
        # Convert amount to base units (with decimals)
        amount_tokens = int(amount)
        amount_with_decimals = amount_tokens * (10 ** DTNC_DECIMALS)
        
        print(f"   Amount with decimals: {amount_with_decimals}", file=sys.stderr)
        
        # Get recent blockhash with retry
        recent_blockhash = None
        for attempt in range(max_retries):
            try:
                recent_blockhash_resp = client.get_latest_blockhash()
                recent_blockhash = recent_blockhash_resp.value.blockhash
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"   ⚠️  Blockhash fetch attempt {attempt + 1} failed, retrying...", file=sys.stderr)
                    continue
                else:
                    return {
                        "success": False,
                        "error": f"Failed to get recent blockhash: {str(e)}"
                    }
        
        # Create transaction
        transaction = Transaction(recent_blockhash=recent_blockhash, fee_payer=treasury.pubkey())
        
        # Check if recipient token account exists, if not create it
        recipient_account_exists = check_token_account_exists(client, recipient_token_account)
        
        if not recipient_account_exists:
            print(f"   ⚠️  Creating token account for recipient...", file=sys.stderr)
            create_ata_ix = create_associated_token_account_instruction(
                payer=treasury.pubkey(),
                owner=recipient_pubkey,
                mint=mint_pubkey,
                token_program_id=token_program_id
            )
            transaction.add(create_ata_ix)
        else:
            print(f"   ✅ Recipient token account exists", file=sys.stderr)
        
        # Add transfer instruction
        transfer_ix = create_transfer_checked_instruction(
            source=treasury_token_account,
            mint=mint_pubkey,
            destination=recipient_token_account,
            owner=treasury.pubkey(),
            amount=amount_with_decimals,
            decimals=DTNC_DECIMALS,
            token_program_id=token_program_id
        )
        transaction.add(transfer_ix)
        
        # Sign transaction
        transaction.sign(treasury)
        
        # Serialize and send transaction
        print("   📡 Sending transaction to Solana...", file=sys.stderr)
        
        serialized_tx = transaction.serialize()
        response = client.send_raw_transaction(serialized_tx)
        
        if response.value:
            signature = str(response.value)
            print(f"   ✅ Transaction sent: {signature}", file=sys.stderr)
            
            # Determine network for explorer URL
            network = "devnet" if "devnet" in SOLANA_RPC_URL else "mainnet-beta"
            explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster={network}"
            
            return {
                "success": True,
                "signature": signature,
                "explorer_url": explorer_url,
                "transfer_type": transfer_type,
                "amount": amount_tokens,
                "recipient": wallet_address,
                "message": f"Successfully transferred {amount_tokens} DTNC tokens"
            }
        else:
            return {
                "success": False,
                "error": "Transaction failed to send - no signature returned"
            }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Transfer error: {error_details}", file=sys.stderr)
        
        return {
            "success": False,
            "error": str(e),
            "details": error_details
        }

# ==================== DISTRIBUTE REWARDS ====================

def distribute_rewards(validator_wallets_json: str, amount_per_validator: str):
    """Distribute rewards to multiple validators"""
    try:
        wallet_list = json.loads(validator_wallets_json)
        results = []
        
        print(f"💰 Distributing {amount_per_validator} DTNC to {len(wallet_list)} validators", file=sys.stderr)
        
        for i, wallet in enumerate(wallet_list, 1):
            print(f"   Transfer {i}/{len(wallet_list)}: {wallet}", file=sys.stderr)
            result = transfer_tokens(wallet, amount_per_validator, "validation_reward")
            results.append({
                "wallet": wallet,
                "result": result
            })
            
            if not result["success"]:
                print(f"   ⚠️  Failed: {result.get('error')}", file=sys.stderr)
        
        # Check results
        successful = sum(1 for r in results if r["result"]["success"])
        failed = len(results) - successful
        
        return {
            "success": failed == 0,
            "results": results,
            "total_distributed": successful * int(amount_per_validator),
            "successful_transfers": successful,
            "failed_transfers": failed,
            "message": f"Distributed to {successful}/{len(wallet_list)} validators"
        }
        
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "details": traceback.format_exc()
        }

# ==================== GET TOKEN INFO ====================

def get_token_info():
    """Get DTNC token information"""
    try:
        client = Client(SOLANA_RPC_URL)
        treasury = get_treasury_keypair()
        mint_pubkey = Pubkey.from_string(DTNC_TOKEN_MINT)
        
        # Detect token program
        token_program_id = get_token_program_id(client)
        
        treasury_token_account = get_associated_token_address(treasury.pubkey(), mint_pubkey, token_program_id)
        
        # Check if treasury token account exists
        treasury_account_exists = check_token_account_exists(client, treasury_token_account)
        
        # Try to get token balance
        balance = None
        balance_error = None
        if treasury_account_exists:
            try:
                balance_response = client.get_token_account_balance(treasury_token_account)
                balance = balance_response.value.ui_amount if balance_response.value else 0
            except Exception as e:
                balance_error = str(e)
        
        # Get SOL balance
        try:
            sol_balance_resp = client.get_balance(treasury.pubkey())
            sol_balance = sol_balance_resp.value / 1_000_000_000
        except:
            sol_balance = "Unknown"
        
        network = "devnet" if "devnet" in SOLANA_RPC_URL else "mainnet-beta"
        
        result = {
            "success": True,
            "token_name": "DATIN Coin (DTNC)",
            "mint_address": DTNC_TOKEN_MINT,
            "mint_authority": MINT_AUTHORITY,
            "decimals": DTNC_DECIMALS,
            "token_program": str(token_program_id),
            "treasury_address": str(treasury.pubkey()),
            "treasury_sol_balance": sol_balance,
            "treasury_token_account": str(treasury_token_account),
            "treasury_token_account_exists": treasury_account_exists,
            "treasury_balance": balance,
            "rpc_url": SOLANA_RPC_URL,
            "network": network,
            "explorer_url": f"https://explorer.solana.com/address/{DTNC_TOKEN_MINT}?cluster={network}",
            "treasury_explorer_url": f"https://explorer.solana.com/address/{treasury.pubkey()}?cluster={network}"
        }
        
        if balance_error:
            result["balance_error"] = balance_error
            
        # Add warnings
        warnings = []
        if not treasury_account_exists:
            warnings.append("Treasury token account does not exist. You need to create it and fund it with DTNC tokens.")
        if balance == 0:
            warnings.append("Treasury has 0 DTNC tokens. You need to transfer tokens to the treasury.")
        if sol_balance != "Unknown" and sol_balance < 0.01:
            warnings.append(f"Low SOL balance ({sol_balance} SOL). You need at least 0.01 SOL for transactions.")
            
        if warnings:
            result["warnings"] = warnings
            
        return result
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "details": traceback.format_exc()
        }

# ==================== MAIN ENTRY POINT ====================

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No command provided",
            "usage": "python dtnc_transfer.py <command> [args]",
            "commands": {
                "transfer": "transfer <wallet> <amount> <type>",
                "distribute_rewards": "distribute_rewards <wallets_json> <amount>",
                "get_info": "get_info (no args)",
                "get_decimals": "get_decimals (no args)"
            }
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "transfer":
            if len(sys.argv) < 5:
                raise ValueError("Usage: transfer <wallet_address> <amount> <transfer_type>")
            
            wallet_address = sys.argv[2]
            amount = sys.argv[3]
            transfer_type = sys.argv[4]
            
            result = transfer_tokens(wallet_address, amount, transfer_type)
            
        elif command == "distribute_rewards":
            if len(sys.argv) < 4:
                raise ValueError("Usage: distribute_rewards <validator_wallets_json> <amount_per_validator>")
            
            validator_wallets = sys.argv[2]
            amount_per_validator = sys.argv[3]
            
            result = distribute_rewards(validator_wallets, amount_per_validator)
            
        elif command in ["get_decimals", "get_info"]:
            result = get_token_info()
            
        else:
            result = {
                "success": False,
                "error": f"Unknown command: {command}",
                "available_commands": ["transfer", "distribute_rewards", "get_info", "get_decimals"]
            }
        
        # Output result as JSON (last line for parsing)
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()