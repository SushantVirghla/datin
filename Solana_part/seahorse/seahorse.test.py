i  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Fizzbuzz as anchor.Program<Fizzbuzz>;
  
mport * as anchor from "@coral-xyz/anchor";
i  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Fizzbuzz as anchor.Program<Fizzbuzz>;
  
mport * as anchor from "@coral-xyz/anchor";
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.system_program import ID as SYS_PROGRAM_ID
import base58

# Configuration
SOLANA_RPC_URL = "https://api.devnet.solana.com"
import type { Fizzbuzz } from "../target/types/fizzbuzz";
import type { Fizzbuzz } from "../target/types/fizzbuzz";
PROGRAM_ID = "FLLDjA6yPuePhB71JyBme2iugv5jvhu6F33HQzLSkae4"  # Replace after building in playground

def test_connection():
    """Test connection to Solana devnet"""
    print("Testing connection to Solana devnet...")
    client = Client(SOLANA_RPC_URL)
    
    try:
        version = client.get_version()
        print(f"✅ Connected to Solana! Version: {version.value}")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def derive_pda(owner_pubkey, program_id):
    """Derive Program Derived Address for data record"""
    seeds = [
        b"data-record",
        bytes(owner_pubkey)
    ]
    
    pda, bump = Pubkey.find_program_address(seeds, program_id)
    return pda, bump

def test_derive_pda():
    """Test PDA derivation"""
    print("\nTesting PDA derivation...")
    
    # Generate a test keypair
    test_keypair = Keypair()
    program_pubkey = Pubkey.from_string(PROGRAM_ID)
    
    pda, bump = derive_pda(test_keypair.pubkey(), program_pubkey)
    
    print(f"Test Owner: {test_keypair.pubkey()}")
    print(f"Derived PDA: {pda}")
    print(f"Bump seed: {bump}")
    print("✅ PDA derivation successful!")

def get_account_info(client, pubkey):
    """Get account information from Solana"""
    try:
        account_info = client.get_account_info(pubkey)
        return account_info
    except Exception as e:
        print(f"Error getting account info: {e}")
        return None

def test_program_exists():
    """Check if program exists on-chain"""
    print(f"\nChecking if program exists on devnet...")
    client = Client(SOLANA_RPC_URL)
    
    try:
        program_pubkey = Pubkey.from_string(PROGRAM_ID)
        account_info = get_account_info(client, program_pubkey)
        
        if account_info and account_info.value:
            print(f"✅ Program found on-chain!")
            print(f"   Owner: {account_info.value.owner}")
            print(f"   Executable: {account_info.value.executable}")
            return True
        else:
            print("❌ Program not found. Make sure you've deployed it!")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("DATA STORAGE PROGRAM - TEST SUITE")
    print("=" * 60)
    
    # Test 1: Connection
    if not test_connection():
        print("\n❌ Cannot proceed without connection")
        return
    
    # Test 2: Program exists
    if PROGRAM_ID == "YOUR_PROGRAM_ID_HERE":
        print("\n68iijH9zSBsV8iB8yYXxicyn13MMEkTnUVMhQEa6BHNj")
        print("   Build your program in Solana Playground to get the ID")
        return
    
    if not test_program_exists():
        print("\n❌ Program not found on devnet")
        print("   Make sure you've deployed your program in Solana Playground")
        return
    
    # Test 3: PDA derivation
    test_derive_pda()
    
    print("\n" + "=" * 60)
    print("✅ All basic tests passed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Use client.ts in Solana Playground to test transactions")
    print("2. Or use the full solana_client.py for backend integration")

if __name__ == "__main__":
    main()