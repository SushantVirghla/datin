from seahorse.prelude import *

declare_id('FLLDjA6yPuePhB71JyBme2iugv5jvhu6F33HQzLSkae4')

class DataRecord(Account):
    owner: Pubkey
    content: str
    token_address: str
    reward: u64
    total_validators: u64
    created_at: i64
    updated_at: i64

@instruction
def init_record(
    owner: Signer,
    data_record: Empty[DataRecord],
    content: str,
    token_address: str,
    reward: u64,
    total_validators: u64,
    clock: Clock
):
    """
    Initialize a new data record on-chain
    """
    data_record = data_record.init(
        payer=owner,
        seeds=['data-record', owner]
    )
    data_record.owner = owner.key()
    data_record.content = content
    data_record.token_address = token_address
    data_record.reward = reward
    data_record.total_validators = total_validators
    data_record.created_at = clock.unix_timestamp()
    data_record.updated_at = clock.unix_timestamp()

@instruction
def update_record(
    owner: Signer,
    data_record: DataRecord,
    content: str,
    token_address: str,
    reward: u64,
    total_validators: u64,
    clock: Clock
):
    """
    Update an existing data record
    """
    assert data_record.owner == owner.key(), "Unauthorized"
    data_record.content = content
    data_record.token_address = token_address
    data_record.reward = reward
    data_record.total_validators = total_validators
    data_record.updated_at = clock.unix_timestamp()

@instruction
def update_content(
    owner: Signer,
    data_record: DataRecord,
    content: str,
    clock: Clock
):
    """
    Update only the content field
    """
    assert data_record.owner == owner.key(), "Unauthorized"
    data_record.content = content
    data_record.updated_at = clock.unix_timestamp()

@instruction
def update_reward(
    owner: Signer,
    data_record: DataRecord,
    reward: u64,
    clock: Clock
):
    """
    Update only the reward field
    """
    assert data_record.owner == owner.key(), "Unauthorized"
    data_record.reward = reward
    data_record.updated_at = clock.unix_timestamp()

@instruction
def update_validators(
    owner: Signer,
    data_record: DataRecord,
    total_validators: u64,
    clock: Clock
):
    """
    Update only the total_validators field
    """
    assert data_record.owner == owner.key(), "Unauthorized"
    data_record.total_validators = total_validators
    data_record.updated_at = clock.unix_timestamp()

@instruction
def delete_record(
    owner: Signer,
    data_record: DataRecord
):
    """
    Delete a data record and reclaim rent
    """
    assert data_record.owner == owner.key(), "Unauthorized"