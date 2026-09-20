#!/usr/bin/env python3
"""
Solana Client - Enhanced with social features, validation, and reevaluation
"""

import sys
import json
import hashlib
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.sysvar import CLOCK
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from solana.rpc.types import TxOpts
import struct

# Configuration
SOLANA_RPC_URL = "https://api.devnet.solana.com"
PROGRAM_ID = "59GXJhbbP1AcoGAv9889WhEc5Lz63sfnYaRGsBbQVa8v"

# Data limits
MAX_CONTENT_LENGTH = 30
MAX_TOKEN_LENGTH = 10
MAX_EMAIL_LENGTH = 50
MAX_WALLET_LENGTH = 44

# Solana Sysvar addresses
RENT_PUBKEY = Pubkey.from_string("SysvarRent111111111111111111111111111111111")

def get_instruction_discriminator(instruction_name):
    """Generate 8-byte discriminator for Anchor instruction"""
    preimage = f"global:{instruction_name}"
    hash_result = hashlib.sha256(preimage.encode()).digest()
    return hash_result[:8]

class SolanaDataStorage:
    def __init__(self, rpc_url=SOLANA_RPC_URL):
        self.client = Client(rpc_url, timeout=30)
        self.program_id = Pubkey.from_string(PROGRAM_ID)
        
    def derive_data_record_pda(self, owner_pubkey):
        """Derive PDA for data record account"""
        seeds = [b"data-record", bytes(owner_pubkey)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump
    
    def derive_comment_pda(self, report_id, commenter_pubkey):
        """Derive PDA for comment account"""
        seeds = [b"comment", report_id.encode('utf-8'), bytes(commenter_pubkey)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump
    
    def derive_validation_pda(self, report_id, validator_pubkey):
        """Derive PDA for validation account"""
        seeds = [b"validation", report_id.encode('utf-8'), bytes(validator_pubkey)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump
    
    def derive_reevaluation_pda(self, report_id, reevaluator_pubkey):
        """Derive PDA for reevaluation account"""
        seeds = [b"reevaluation", report_id.encode('utf-8'), bytes(reevaluator_pubkey)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump
    
    def derive_version_pda(self, report_id, changer_pubkey):
        """Derive PDA for content version account"""
        seeds = [b"version", report_id.encode('utf-8'), bytes(changer_pubkey)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump
    
    def validate_and_sanitize(self, content, token_address_str, reward, total_validators):
        """Validate and sanitize all inputs"""
        
        if len(content) > MAX_CONTENT_LENGTH:
            original_length = len(content)
            content = content[:MAX_CONTENT_LENGTH]
            print(f"⚠️  Content truncated from {original_length} to {MAX_CONTENT_LENGTH} chars")
        
        if len(token_address_str) > MAX_TOKEN_LENGTH:
            original_length = len(token_address_str)
            token_address_str = token_address_str[:MAX_TOKEN_LENGTH]
            print(f"⚠️  Token address truncated from {original_length} to {MAX_TOKEN_LENGTH} chars")
        
        try:
            reward = int(reward)
            if reward <= 0:
                print(f"⚠️  Invalid reward: {reward}, setting to 10")
                reward = 10
        except (ValueError, TypeError):
            print(f"⚠️  Invalid reward value, setting to 10")
            reward = 10
        
        try:
            total_validators = int(total_validators)
            if total_validators <= 0:
                print(f"⚠️  Invalid validators: {total_validators}, setting to 5")
                total_validators = 5
        except (ValueError, TypeError):
            print(f"⚠️  Invalid validators value, setting to 5")
            total_validators = 5
        
        return content, token_address_str, reward, total_validators
    
    def store_data(self, owner_keypair_bytes, content, token_address_str, reward, total_validators, owner_email):
        """Store or update data on Solana blockchain"""
        try:
            print(f"\n{'='*60}")
            print(f"🚀 STARTING BLOCKCHAIN STORAGE")
            print(f"{'='*60}")
            
            owner_keypair = Keypair.from_bytes(bytes(owner_keypair_bytes))
            print(f"👤 Owner Pubkey: {owner_keypair.pubkey()}")
            
            data_record_pda, bump = self.derive_data_record_pda(owner_keypair.pubkey())
            print(f"📦 Data Record PDA: {data_record_pda}")
            
            account_info = self.client.get_account_info(data_record_pda, commitment=Confirmed)
            account_exists = account_info.value is not None
            
            content, token_address_str, reward, total_validators = self.validate_and_sanitize(
                content, token_address_str, reward, total_validators
            )
            
            discriminator = get_instruction_discriminator("init_record" if not account_exists else "update_record")
            
            content_bytes = content.encode('utf-8')
            token_bytes = token_address_str.encode('utf-8')
            email_bytes = owner_email[:MAX_EMAIL_LENGTH].encode('utf-8')
            
            instruction_data = bytearray()
            instruction_data.extend(discriminator)
            instruction_data.extend(struct.pack('<I', len(content_bytes)))
            instruction_data.extend(content_bytes)
            instruction_data.extend(struct.pack('<I', len(token_bytes)))
            instruction_data.extend(token_bytes)
            instruction_data.extend(struct.pack('<Q', reward))
            instruction_data.extend(struct.pack('<Q', total_validators))
            instruction_data.extend(struct.pack('<I', len(email_bytes)))
            instruction_data.extend(email_bytes)
            
            if not account_exists:
                accounts = [
                    AccountMeta(pubkey=owner_keypair.pubkey(), is_signer=True, is_writable=True),
                    AccountMeta(pubkey=data_record_pda, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=CLOCK, is_signer=False, is_writable=False),
                    AccountMeta(pubkey=RENT_PUBKEY, is_signer=False, is_writable=False),
                    AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
                ]
            else:
                accounts = [
                    AccountMeta(pubkey=owner_keypair.pubkey(), is_signer=True, is_writable=True),
                    AccountMeta(pubkey=data_record_pda, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=CLOCK, is_signer=False, is_writable=False),
                ]
            
            instruction = Instruction(program_id=self.program_id, accounts=accounts, data=bytes(instruction_data))
            
            recent_blockhash_resp = self.client.get_latest_blockhash()
            recent_blockhash = recent_blockhash_resp.value.blockhash
            
            message = Message.new_with_blockhash([instruction], owner_keypair.pubkey(), recent_blockhash)
            transaction = Transaction([owner_keypair], message, recent_blockhash)
            
            opts = TxOpts(skip_preflight=False, preflight_commitment=Confirmed)
            response = self.client.send_transaction(transaction, opts=opts)
            
            signature = str(response.value)
            print(f"\n✅ SUCCESS! Signature: {signature}")
            
            return {
                "success": True,
                "signature": signature,
                "pda": str(data_record_pda),
                "owner": str(owner_keypair.pubkey()),
                "action": "initialized" if not account_exists else "updated",
                "accountExists": account_exists,
                "explorerUrl": f"https://explorer.solana.com/tx/{signature}?cluster=devnet",
                "message": f"Data {'initialized' if not account_exists else 'updated'} on Solana blockchain successfully"
            }
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"\n❌ ERROR: {str(e)}")
            print(f"\nFull traceback:\n{error_details}")
            
            return {
                "success": False,
                "error": str(e),
                "details": error_details,
                "message": "Failed to store data on blockchain"
            }
    
    def toggle_like(self, user_keypair_bytes, report_owner_pubkey_str):
        """Toggle like on a report"""
        try:
            user_keypair = Keypair.from_bytes(bytes(user_keypair_bytes))
            report_owner_pubkey = Pubkey.from_string(report_owner_pubkey_str)
            
            data_record_pda, _ = self.derive_data_record_pda(report_owner_pubkey)
            
            discriminator = get_instruction_discriminator("toggle_like")
            user_pubkey_str = str(user_keypair.pubkey())
            user_str_bytes = user_pubkey_str.encode('utf-8')
            
            instruction_data = bytearray()
            instruction_data.extend(discriminator)
            instruction_data.extend(struct.pack('<I', len(user_str_bytes)))
            instruction_data.extend(user_str_bytes)
            
            accounts = [
                AccountMeta(pubkey=user_keypair.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=data_record_pda, is_signer=False, is_writable=True),
            ]
            
            instruction = Instruction(program_id=self.program_id, accounts=accounts, data=bytes(instruction_data))
            
            recent_blockhash_resp = self.client.get_latest_blockhash()
            recent_blockhash = recent_blockhash_resp.value.blockhash
            
            message = Message.new_with_blockhash([instruction], user_keypair.pubkey(), recent_blockhash)
            transaction = Transaction([user_keypair], message, recent_blockhash)
            
            opts = TxOpts(skip_preflight=False, preflight_commitment=Confirmed)
            response = self.client.send_transaction(transaction, opts=opts)
            
            return {
                "success": True,
                "signature": str(response.value),
                "message": "Like toggled successfully"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def add_comment(self, commenter_keypair_bytes, report_id, commenter_email, comment_content, report_owner_pubkey_str):
        """Add comment to a report"""
        try:
            commenter_keypair = Keypair.from_bytes(bytes(commenter_keypair_bytes))
            report_owner_pubkey = Pubkey.from_string(report_owner_pubkey_str)
            
            data_record_pda, _ = self.derive_data_record_pda(report_owner_pubkey)
            comment_pda, _ = self.derive_comment_pda(report_id, commenter_keypair.pubkey())
            
            discriminator = get_instruction_discriminator("add_comment")
            
            report_id_bytes = report_id[:30].encode('utf-8')
            email_bytes = commenter_email[:MAX_EMAIL_LENGTH].encode('utf-8')
            content_bytes = comment_content[:200].encode('utf-8')
            
            instruction_data = bytearray()
            instruction_data.extend(discriminator)
            instruction_data.extend(struct.pack('<I', len(report_id_bytes)))
            instruction_data.extend(report_id_bytes)
            instruction_data.extend(struct.pack('<I', len(email_bytes)))
            instruction_data.extend(email_bytes)
            instruction_data.extend(struct.pack('<I', len(content_bytes)))
            instruction_data.extend(content_bytes)
            
            accounts = [
                AccountMeta(pubkey=commenter_keypair.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=comment_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=data_record_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=CLOCK, is_signer=False, is_writable=False),
                AccountMeta(pubkey=RENT_PUBKEY, is_signer=False, is_writable=False),
                AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            instruction = Instruction(program_id=self.program_id, accounts=accounts, data=bytes(instruction_data))
            
            recent_blockhash_resp = self.client.get_latest_blockhash()
            recent_blockhash = recent_blockhash_resp.value.blockhash
            
            message = Message.new_with_blockhash([instruction], commenter_keypair.pubkey(), recent_blockhash)
            transaction = Transaction([commenter_keypair], message, recent_blockhash)
            
            opts = TxOpts(skip_preflight=False, preflight_commitment=Confirmed)
            response = self.client.send_transaction(transaction, opts=opts)
            
            return {
                "success": True,
                "signature": str(response.value),
                "message": "Comment added successfully"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def add_validation(self, validator_keypair_bytes, report_id, validator_wallet, validator_email, report_owner_pubkey_str):
        """Add validation to a report"""
        try:
            validator_keypair = Keypair.from_bytes(bytes(validator_keypair_bytes))
            report_owner_pubkey = Pubkey.from_string(report_owner_pubkey_str)
            
            data_record_pda, _ = self.derive_data_record_pda(report_owner_pubkey)
            validation_pda, _ = self.derive_validation_pda(report_id, validator_keypair.pubkey())
            
            discriminator = get_instruction_discriminator("add_validation")
            
            report_id_bytes = report_id[:30].encode('utf-8')
            wallet_bytes = validator_wallet[:MAX_WALLET_LENGTH].encode('utf-8')
            email_bytes = validator_email[:MAX_EMAIL_LENGTH].encode('utf-8')
            
            instruction_data = bytearray()
            instruction_data.extend(discriminator)
            instruction_data.extend(struct.pack('<I', len(report_id_bytes)))
            instruction_data.extend(report_id_bytes)
            instruction_data.extend(struct.pack('<I', len(wallet_bytes)))
            instruction_data.extend(wallet_bytes)
            instruction_data.extend(struct.pack('<I', len(email_bytes)))
            instruction_data.extend(email_bytes)
            
            accounts = [
                AccountMeta(pubkey=validator_keypair.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=validation_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=data_record_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=CLOCK, is_signer=False, is_writable=False),
                AccountMeta(pubkey=RENT_PUBKEY, is_signer=False, is_writable=False),
                AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            instruction = Instruction(program_id=self.program_id, accounts=accounts, data=bytes(instruction_data))
            
            recent_blockhash_resp = self.client.get_latest_blockhash()
            recent_blockhash = recent_blockhash_resp.value.blockhash
            
            message = Message.new_with_blockhash([instruction], validator_keypair.pubkey(), recent_blockhash)
            transaction = Transaction([validator_keypair], message, recent_blockhash)
            
            opts = TxOpts(skip_preflight=False, preflight_commitment=Confirmed)
            response = self.client.send_transaction(transaction, opts=opts)
            
            return {
                "success": True,
                "signature": str(response.value),
                "message": "Validation added successfully"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    client = SolanaDataStorage()
    
    if command == "store":
        if len(sys.argv) != 8:
            print(json.dumps({"success": False, "error": "Invalid arguments"}))
            sys.exit(1)
        
        try:
            keypair_bytes = json.loads(sys.argv[2])
            content = sys.argv[3]
            token_address = sys.argv[4]
            reward = int(sys.argv[5])
            total_validators = int(sys.argv[6])
            owner_email = sys.argv[7]
            
            result = client.store_data(
                keypair_bytes,
                content,
                token_address,
                reward,
                total_validators,
                owner_email
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed: {str(e)}"}))
            sys.exit(1)
    
    elif command == "toggle_like":
        if len(sys.argv) != 4:
            print(json.dumps({"success": False, "error": "Invalid arguments"}))
            sys.exit(1)
        
        try:
            keypair_bytes = json.loads(sys.argv[2])
            report_owner_pubkey = sys.argv[3]
            
            result = client.toggle_like(keypair_bytes, report_owner_pubkey)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed: {str(e)}"}))
            sys.exit(1)
    
    elif command == "add_comment":
        if len(sys.argv) != 7:
            print(json.dumps({"success": False, "error": "Invalid arguments"}))
            sys.exit(1)
        
        try:
            keypair_bytes = json.loads(sys.argv[2])
            report_id = sys.argv[3]
            commenter_email = sys.argv[4]
            comment_content = sys.argv[5]
            report_owner_pubkey = sys.argv[6]
            
            result = client.add_comment(
                keypair_bytes,
                report_id,
                commenter_email,
                comment_content,
                report_owner_pubkey
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed: {str(e)}"}))
            sys.exit(1)
    
    elif command == "add_validation":
        if len(sys.argv) != 7:
            print(json.dumps({"success": False, "error": "Invalid arguments"}))
            sys.exit(1)
        
        try:
            keypair_bytes = json.loads(sys.argv[2])
            report_id = sys.argv[3]
            validator_wallet = sys.argv[4]
            validator_email = sys.argv[5]
            report_owner_pubkey = sys.argv[6]
            
            result = client.add_validation(
                keypair_bytes,
                report_id,
                validator_wallet,
                validator_email,
                report_owner_pubkey
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed: {str(e)}"}))
            sys.exit(1)
    
    else:
        print(json.dumps({"success": False, "error": f"Unknown command: {command}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()