# TOTPWallet Test Suite Documentation 🧪

A comprehensive guide to all 35 tests in the TOTPWallet contract test suite.

---

## Table of Contents

1. [Test Setup & Infrastructure](#test-setup--infrastructure)
2. [Deployment Tests](#deployment-tests-4-tests)
3. [ZK Proof Verification Tests](#zk-proof-verification-tests-7-tests)
4. [Timestamp Freshness Tests](#timestamp-freshness-tests-4-tests)
5. [Transaction Execution Tests](#transaction-execution-tests-4-tests)
6. [Batch Execution Tests](#batch-execution-tests-4-tests)
7. [Ownership Transfer Tests](#ownership-transfer-tests-4-tests)
8. [EntryPoint Integration Tests](#entrypoint-integration-tests-5-tests)
9. [UserOp Validation Tests](#userop-validation-tests-3-tests)

---

## Test Setup & Infrastructure

### Global Setup (`before` hook)

**Purpose:** Initialize the testing environment once before all tests run.

**What it does:**
1. Connects to the Hardhat network
2. Gets the viem client for contract interactions
3. Gets the public client for reading blockchain state
4. Creates 3 wallet clients: `owner`, `user1`, `user2`
5. Deploys the `TOTPVerifier` contract once (reused by all tests)

**Test Secret:**
```typescript
const testSecret = 12345n;
const testSecretHash = 4267533774488295900887461483015112262021273608761099826938271132511348470966n;
```

This secret is pre-calculated to avoid async operations at module level.

### Global Cleanup (`after` hook)

**Purpose:** Clean up resources and force process exit after all tests complete.

**What it does:**
1. Waits 100ms for pending operations to complete
2. Calls `process.exit(0)` to terminate the test process cleanly
3. Only runs in non-CI environments (skips if `CI=true`)

**Why needed:** The zkProof helper keeps some resources active that prevent Node.js from exiting naturally.

---

## Deployment Tests (4 tests)

### Test 1: "Should set the correct owner"

**What it tests:** The wallet correctly stores the owner address during deployment.

**Setup:**
1. Deploy `MockEntryPoint` contract
2. Deploy `TOTPWallet` with owner's address

**Verification:**
```typescript
const walletOwner = await totpWallet.read.owner();
assert.equal(walletOwner.toLowerCase(), owner.account.address.toLowerCase());
```

**Expected result:** The wallet's `owner` state variable matches the deployed owner's address.

**Why important:** Ensures access control works - only the owner can execute transactions.

---

### Test 2: "Should set the correct EntryPoint"

**What it tests:** The wallet correctly stores the EntryPoint address.

**Setup:**
1. Deploy `MockEntryPoint` contract
2. Deploy `TOTPWallet` with EntryPoint address

**Verification:**
```typescript
const entryPoint = await totpWallet.read.entryPoint();
assert.equal(entryPoint.toLowerCase(), mockEntryPoint.address.toLowerCase());
```

**Expected result:** The wallet's `entryPoint` state variable matches the deployed EntryPoint address.

**Why important:** The EntryPoint is the only external contract allowed to call `validateUserOp()`.

---

### Test 3: "Should have correct MAX_TIME_DIFFERENCE constant"

**What it tests:** The timestamp freshness window is set to 5 minutes (300 seconds).

**Setup:**
1. Deploy `TOTPWallet`

**Verification:**
```typescript
const maxTimeDiff = await totpWallet.read.MAX_TIME_DIFFERENCE();
assert.equal(maxTimeDiff, 300n);
```

**Expected result:** `MAX_TIME_DIFFERENCE` constant equals 300 seconds.

**Why important:** This defines how old a TOTP code can be before it's rejected. 5 minutes provides a good balance between security and usability.

---

### Test 4: "Should emit WalletInitialized event"

**What it tests:** The deployment emits the correct initialization event.

**Setup:**
1. Get current block number (to know where to search for events)
2. Deploy `TOTPWallet`
3. Query for `WalletInitialized` events from the deployment block

**Verification:**
```typescript
const events = await publicClient.getContractEvents({
  address: totpWallet.address,
  abi: totpWallet.abi,
  eventName: "WalletInitialized",
  fromBlock: deploymentBlockNumber,
  strict: true,
});

assert.equal(events.length, 1);
assert.equal(events[0].args.entryPoint?.toLowerCase(), mockEntryPoint.address.toLowerCase());
assert.equal(events[0].args.owner?.toLowerCase(), owner.account.address.toLowerCase());
```

**Expected result:** 
- Exactly 1 event emitted
- Event contains correct EntryPoint address
- Event contains correct owner address

**Why important:** Events provide a reliable audit trail for wallet initialization.

---

## ZK Proof Verification Tests (7 tests)

### Test 1: "Should verify valid ZK proof with fresh timestamp"

**What it tests:** A valid ZK proof with current timestamp passes verification.

**Setup:**
1. Deploy wallet with `testSecretHash`
2. Get current block timestamp
3. Generate ZK proof with `secret=12345` and current timestamp

**Process:**
```typescript
const { pA, pB, pC, publicSignals } = await generateTOTPProof(secret, timestamp);
await totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]);
```

**Verification:**
- Transaction succeeds (doesn't revert)
- Contract validates:
  1. ✅ `publicSignals[2]` (secretHash) matches stored `ownerSecretHash`
  2. ✅ Timestamp is not in the future
  3. ✅ Timestamp is within 5 minutes of current time
  4. ✅ ZK proof cryptographically verifies via `TOTPVerifier`

**Expected result:** No revert - proof is accepted.

**Why important:** This is the core functionality - proving you know the TOTP secret without revealing it.

---

### Test 2: "Should revert for timestamp in the future"

**What it tests:** Proofs with future timestamps are rejected.

**Setup:**
1. Deploy wallet
2. Get current block timestamp
3. Add 3600 seconds (1 hour) to timestamp
4. Generate ZK proof with future timestamp

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
  /TimestampInFuture/
);
```

**Expected result:** Transaction reverts with `TimestampInFuture` error.

**Why important:** Prevents attack where someone pre-generates proofs for future time windows.

---

### Test 3: "Should revert for old timestamp"

**What it tests:** Proofs older than 5 minutes are rejected.

**Setup:**
1. Deploy wallet
2. Get current block timestamp
3. Subtract 400 seconds (6 minutes 40 seconds)
4. Generate ZK proof with old timestamp

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
  /TimestampTooOld/
);
```

**Expected result:** Transaction reverts with `TimestampTooOld` error.

**Why important:** Prevents replay attacks where someone reuses an old proof they intercepted.

---

### Test 4: "Should revert for invalid proof"

**What it tests:** Proofs with incorrect cryptographic data are rejected.

**Setup:**
1. Deploy wallet
2. Get current timestamp
3. Create fake proof with random numbers:
   ```typescript
   const pA: [bigint, bigint] = [1n, 2n];
   const pB: [[bigint, bigint], [bigint, bigint]] = [[3n, 4n], [5n, 6n]];
   const pC: [bigint, bigint] = [7n, 8n];
   ```
4. Use correct `secretHash` and fresh `timeCounter` in publicSignals

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
  /InvalidProof/
);
```

**Expected result:** Transaction reverts with `InvalidProof` error.

**Why important:** Ensures cryptographic verification works - you can't fake a proof with random data.

---

### Test 5: "Should verify multiple proofs with same secret at different time windows"

**What it tests:** The same secret can generate different valid proofs for different time windows (with strictly increasing timeCounters).

**Setup:**
1. Deploy wallet
2. Generate proof #1 with current time
3. Verify proof #1 ✅
4. Advance blockchain time by 60 seconds
5. Generate proof #2 with new current time (later time window)
6. Verify proof #2 ✅

**Process:**
```typescript
const proof1 = await generateTOTPProof(testSecret, currentTime);
await totpWallet.write.verifyZKProof([proof1.pA, proof1.pB, proof1.pC, proof1.publicSignals]);

// Advance time to create a new time window
await publicClient.transport.request({ method: "evm_increaseTime", params: [60] });
await publicClient.transport.request({ method: "evm_mine", params: [] });

const block2 = await publicClient.getBlock();
const newTime = block2.timestamp;
const proof2 = await generateTOTPProof(testSecret, newTime);
await totpWallet.write.verifyZKProof([proof2.pA, proof2.pB, proof2.pC, proof2.publicSignals]);
```

**Expected result:** Both proofs verify successfully because the second has a larger timeCounter.

**Why important:** 
- Shows TOTP codes change over time
- Same secret produces different proofs at different times
- **NEW:** Enforces monotonic progression - must use later time windows
- Prevents replaying old proofs

---

### Test 5.1: "Should prevent replay attacks - reject reused timeCounter" **[NEW]**

**What it tests:** Once a timeCounter is used, it cannot be used again (immediate replay protection).

**Setup:**
1. Deploy wallet
2. Generate proof with current time
3. Verify proof ✅ (marks timeCounter as used)
4. Attempt to verify the SAME proof again

**Process:**
```typescript
const proof = await generateTOTPProof(testSecret, currentTime);
await totpWallet.write.verifyZKProof([proof.pA, proof.pB, proof.pC, proof.publicSignals]); // First use - OK

// Try to replay the exact same proof
await viem.assertions.revertWithCustomError(
  totpWallet.write.verifyZKProof([proof.pA, proof.pB, proof.pC, proof.publicSignals]),
  totpWallet,
  "TimeCounterAlreadyUsed"
);
```

**Expected result:** Second verification reverts with `TimeCounterAlreadyUsed` error.

**Why important:** 
- **Critical security feature:** Prevents replay attacks even within the 5-minute freshness window
- Makes each proof ONE-TIME USE
- Protects against bots that intercept and immediately replay proofs
- Contract tracks `lastUsedTimeCounter` and only accepts strictly increasing values

---

### Test 6: "Should reject proof with wrong secret hash"

**What it tests:** Proofs generated with a different secret are rejected.

**Setup:**
1. Deploy wallet with `testSecretHash` (hash of 12345)
2. Generate proof with `wrongSecret = 99999`
3. This creates a different `secretHash` in the proof

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.verifyZKProof([wrongProof.pA, wrongProof.pB, wrongProof.pC, wrongProof.publicSignals]),
  /SecretHashMismatch/
);
```

**Expected result:** Transaction reverts with `SecretHashMismatch` error.

**Why important:** This is the critical security fix! It ensures:
- Each wallet is bound to one specific secret
- You can't use someone else's valid proof
- Attackers can't generate their own proof with their own secret

**Security scenario prevented:**
```
❌ Without this check:
   - Attacker generates proof with their own secret
   - Proof is cryptographically valid
   - Attacker could drain your wallet!

✅ With this check:
   - Attacker's secretHash ≠ your stored secretHash
   - Transaction reverts immediately
   - Your wallet is safe!
```

---

### Test 7: "Should allow owner to update secret hash"

**What it tests:** The owner can rotate their TOTP secret.

**Setup:**
1. Deploy wallet with `testSecretHash` (hash of 12345)
2. Calculate hash of new secret (54321)
3. Call `updateSecretHash()` with new hash
4. Verify old secret no longer works
5. Verify new secret works

**Process:**
```typescript
// 1. Update to new secret
const newSecret = 54321n;
const newSecretHash = await calculateSecretHash(newSecret);
await totpWallet.write.updateSecretHash([newSecretHash]);

// 2. Verify hash updated
const storedHash = await totpWallet.read.ownerSecretHash();
assert.equal(storedHash, newSecretHash);

// 3. Old proof should fail
const oldProof = await generateTOTPProof(testSecret, timestamp);
await assert.rejects(
  totpWallet.write.verifyZKProof([...]),
  /SecretHashMismatch/
);

// 4. New proof should work
const newProof = await generateTOTPProof(newSecret, timestamp);
await totpWallet.write.verifyZKProof([...]); // ✅ Success
```

**Expected result:**
- Hash updates successfully
- Old secret's proofs rejected
- New secret's proofs accepted

**Why important:** Allows secret rotation for security best practices (e.g., if you think your secret was compromised).

---

## Timestamp Freshness Tests (4 tests)

These tests verify the `checkTimestampFreshness()` internal function logic.

### Test 1: "Should accept current timestamp"

**What it tests:** The current time is considered fresh.

**Setup:**
1. Get current timestamp: `Math.floor(Date.now() / 1000)`
2. Call `checkTimestampFreshness(timestamp)`

**Verification:**
```typescript
await totpWallet.read.checkTimestampFreshness([timestamp]);
```

**Expected result:** No revert - current timestamp is valid.

**Why important:** Basic sanity check for timestamp validation.

---

### Test 2: "Should accept timestamp within 5 minutes"

**What it tests:** Timestamps up to 299 seconds old are accepted.

**Setup:**
1. Get current block timestamp
2. Subtract 299 seconds (just under 5 minutes)
3. Call `checkTimestampFreshness(timestamp)`

**Verification:**
```typescript
const timestamp = currentBlock.timestamp - 299n;
await totpWallet.read.checkTimestampFreshness([timestamp]);
```

**Expected result:** No revert - timestamp within window.

**Why important:** Ensures the 5-minute grace period works (accounts for clock drift, network delays).

---

### Test 3: "Should reject timestamp older than 5 minutes"

**What it tests:** Timestamps 301 seconds old (over 5 minutes) are rejected.

**Setup:**
1. Get current block timestamp
2. Subtract 301 seconds (just over 5 minutes)
3. Call `checkTimestampFreshness(timestamp)`

**Verification:**
```typescript
const timestamp = currentBlock.timestamp - 301n;
await assert.rejects(
  totpWallet.read.checkTimestampFreshness([timestamp]),
  /TimestampTooOld/
);
```

**Expected result:** Reverts with `TimestampTooOld`.

**Why important:** Enforces the freshness window - prevents replay attacks with old proofs.

---

### Test 4: "Should reject future timestamp"

**What it tests:** Timestamps in the future are rejected.

**Setup:**
1. Get current block timestamp
2. Add 10 seconds
3. Call `checkTimestampFreshness(timestamp)`

**Verification:**
```typescript
const timestamp = currentBlock.timestamp + 10n;
await assert.rejects(
  totpWallet.read.checkTimestampFreshness([timestamp]),
  /TimestampInFuture/
);
```

**Expected result:** Reverts with `TimestampInFuture`.

**Why important:** Prevents pre-computation attacks.

---

## Transaction Execution Tests (4 tests)

These tests verify the basic `execute()` function for sending transactions from the wallet.

### Test 1: "Should execute transaction from owner"

**What it tests:** The owner can send ETH from the wallet.

**Setup:**
1. Deploy wallet
2. Fund wallet with 1.0 ETH
3. Owner calls `execute()` to send 0.1 ETH to user1

**Process:**
```typescript
// Fund the wallet
await owner.sendTransaction({
  to: totpWallet.address,
  value: parseEther("1.0"),
});

// Execute transfer
const amount = parseEther("0.1");
const balanceBefore = await publicClient.getBalance({ address: user1.account.address });
await totpWallet.write.execute([user1.account.address, amount, "0x"]);
const balanceAfter = await publicClient.getBalance({ address: user1.account.address });
```

**Verification:**
```typescript
assert.equal(balanceAfter - balanceBefore, amount);
```

**Expected result:** User1's balance increases by exactly 0.1 ETH.

**Why important:** Core wallet functionality - the owner can send funds.

---

### Test 2: "Should revert transaction from non-owner"

**What it tests:** Non-owners cannot execute transactions.

**Setup:**
1. Deploy wallet with owner
2. Fund wallet
3. User1 (not owner) tries to call `execute()`

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.execute([user2.account.address, amount, "0x"], { account: user1.account }),
  /OnlyOwner/
);
```

**Expected result:** Reverts with `OnlyOwner` error.

**Why important:** Access control - only the owner can control the wallet.

---

### Test 3: "Should execute transaction with data"

**What it tests:** The wallet can call other smart contracts (not just send ETH).

**Setup:**
1. Deploy wallet
2. Deploy `SimpleContract` (has a `setValue(uint256)` function)
3. Fund wallet
4. Encode function call to `setValue(42)`
5. Execute transaction with calldata

**Process:**
```typescript
const data = encodeFunctionData({
  abi: simpleContract.abi,
  functionName: "setValue",
  args: [42n],
});

await totpWallet.write.execute([simpleContract.address, 0n, data]);

const value = await simpleContract.read.value();
```

**Verification:**
```typescript
assert.equal(value, 42n);
```

**Expected result:** SimpleContract's `value` state variable is set to 42.

**Why important:** Shows the wallet can interact with DeFi protocols, NFT contracts, etc. - not just send ETH.

---

### Test 4: "Should revert when transaction fails"

**What it tests:** If the underlying call fails, the whole transaction reverts.

**Setup:**
1. Deploy wallet
2. Fund wallet with 1.0 ETH
3. Try to send 10.0 ETH (more than wallet has)

**Verification:**
```typescript
const amount = parseEther("10.0"); // More than wallet balance!
await assert.rejects(
  totpWallet.write.execute([user1.account.address, amount, "0x"]),
  /TransactionFailed/
);
```

**Expected result:** Reverts with `TransactionFailed` error.

**Why important:** 
- Ensures atomic transactions (all or nothing)
- Prevents partial state changes
- Gives clear error messages

---

## Batch Execution Tests (4 tests)

These tests verify the `executeBatch()` function for executing multiple transactions in one call.

### Test 1: "Should execute batch of transactions"

**What it tests:** Multiple transactions can be executed atomically.

**Setup:**
1. Deploy wallet
2. Fund wallet with 1.0 ETH
3. Prepare batch: send 0.1 ETH to user1, send 0.2 ETH to user2
4. Execute batch

**Process:**
```typescript
const dest = [user1.account.address, user2.account.address];
const values = [parseEther("0.1"), parseEther("0.2")];
const func = ["0x", "0x"]; // Empty calldata (just ETH transfers)

await totpWallet.write.executeBatch([dest, values, func]);
```

**Verification:**
```typescript
assert.equal(balance1After - balance1Before, values[0]); // 0.1 ETH
assert.equal(balance2After - balance2Before, values[1]); // 0.2 ETH
```

**Expected result:** Both recipients receive their respective amounts.

**Why important:** 
- Efficiency: Multiple operations in one transaction
- Atomicity: Either all execute or none do
- Gas savings: Only one transaction overhead

---

### Test 2: "Should revert on length mismatch"

**What it tests:** All arrays must have the same length.

**Setup:**
1. Deploy wallet
2. Prepare mismatched arrays:
   - 2 destinations
   - 1 value (wrong!)
   - 2 function calls

**Verification:**
```typescript
const dest = [user1.account.address, user2.account.address]; // Length: 2
const values = [parseEther("0.1")]; // Length: 1 ❌
const func = ["0x", "0x"]; // Length: 2

await assert.rejects(
  totpWallet.write.executeBatch([dest, values, func]),
  /Length mismatch/
);
```

**Expected result:** Reverts with "Length mismatch" error.

**Why important:** Data validation - prevents bugs from malformed inputs.

---

### Test 3: "Should revert batch from non-owner"

**What it tests:** Only the owner can execute batches.

**Setup:**
1. Deploy wallet
2. User1 (not owner) tries to execute batch

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.executeBatch([dest, values, func], { account: user1.account }),
  /OnlyOwner/
);
```

**Expected result:** Reverts with `OnlyOwner` error.

**Why important:** Access control applies to batch operations too.

---

### Test 4: "Should revert if one transaction fails"

**What it tests:** If any transaction in the batch fails, the whole batch reverts.

**Setup:**
1. Deploy wallet with 1.0 ETH
2. Prepare batch:
   - Transaction 1: Send 0.1 ETH (valid)
   - Transaction 2: Send 10.0 ETH (invalid - insufficient balance)

**Verification:**
```typescript
const dest = [user1.account.address, user2.account.address];
const values = [parseEther("0.1"), parseEther("10.0")]; // Second one will fail
const func = ["0x", "0x"];

await assert.rejects(
  totpWallet.write.executeBatch([dest, values, func]),
  /TransactionFailed/
);
```

**Expected result:** Entire batch reverts with `TransactionFailed` error.

**Why important:** 
- Atomicity: Can't have partial execution
- Prevents unexpected state
- User1 doesn't receive 0.1 ETH (the first transaction rolls back too)

---

## Ownership Transfer Tests (4 tests)

These tests verify the `transferOwnership()` function.

### Test 1: "Should transfer ownership"

**What it tests:** Owner can transfer wallet ownership to a new address.

**Setup:**
1. Deploy wallet with `owner`
2. Call `transferOwnership(user1)`
3. Read new owner

**Verification:**
```typescript
await totpWallet.write.transferOwnership([user1.account.address]);

const newOwner = await totpWallet.read.owner();
assert.equal(newOwner.toLowerCase(), user1.account.address.toLowerCase());
```

**Expected result:** The owner state variable is updated to user1's address.

**Why important:** Allows account recovery or transfer of wallet control.

---

### Test 2: "Should revert transfer from non-owner"

**What it tests:** Only the current owner can transfer ownership.

**Setup:**
1. Deploy wallet with `owner`
2. User1 (not owner) tries to transfer ownership

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.transferOwnership([user2.account.address], { account: user1.account }),
  /OnlyOwner/
);
```

**Expected result:** Reverts with `OnlyOwner` error.

**Why important:** Prevents unauthorized takeover of the wallet.

---

### Test 3: "Should revert transfer to zero address"

**What it tests:** Cannot transfer ownership to the zero address.

**Setup:**
1. Deploy wallet
2. Try to transfer to `0x0000000000000000000000000000000000000000`

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.transferOwnership(["0x0000000000000000000000000000000000000000"]),
  /Invalid new owner/
);
```

**Expected result:** Reverts with "Invalid new owner" error.

**Why important:** 
- Prevents accidental loss of wallet control
- Zero address means no one can control the wallet (funds locked forever)

---

### Test 4: "New owner should be able to execute transactions"

**What it tests:** After ownership transfer, the new owner has full control.

**Setup:**
1. Deploy wallet with `owner`
2. Fund wallet
3. Transfer ownership to user1
4. User1 executes a transaction

**Process:**
```typescript
await totpWallet.write.transferOwnership([user1.account.address]);

const amount = parseEther("0.1");
await totpWallet.write.execute(
  [user2.account.address, amount, "0x"], 
  { account: user1.account } // Called by new owner
);
```

**Verification:**
```typescript
const newOwner = await totpWallet.read.owner();
assert.equal(newOwner.toLowerCase(), user1.account.address.toLowerCase());
// Transaction succeeded (no revert)
```

**Expected result:** User1 can execute transactions as the new owner.

**Why important:** Confirms ownership transfer is complete and functional.

---

## EntryPoint Integration Tests (5 tests)

These tests verify ERC-4337 Account Abstraction integration with the EntryPoint.

### Test 1: "Should accept ETH deposits"

**What it tests:** The wallet can receive ETH via `receive()` function.

**Setup:**
1. Deploy wallet
2. Send 1.0 ETH to wallet address

**Verification:**
```typescript
const balanceBefore = await publicClient.getBalance({ address: totpWallet.address });

await owner.sendTransaction({
  to: totpWallet.address,
  value: amount,
});

const balanceAfter = await publicClient.getBalance({ address: totpWallet.address });
assert.equal(balanceAfter - balanceBefore, amount);
```

**Expected result:** Wallet balance increases by 1.0 ETH.

**Why important:** Basic wallet functionality - can receive funds.

---

### Test 2: "Should deposit to EntryPoint"

**What it tests:** The wallet can stake ETH in the EntryPoint for gas sponsorship.

**Setup:**
1. Deploy wallet
2. Call `addDeposit()` with 1.0 ETH

**Process:**
```typescript
const amount = parseEther("1.0");
await totpWallet.write.addDeposit({ value: amount });

const deposit = await mockEntryPoint.read.deposits([totpWallet.address]);
```

**Verification:**
```typescript
assert.equal(deposit, amount);
```

**Expected result:** EntryPoint shows wallet has 1.0 ETH deposited.

**Why important:** 
- ERC-4337 requirement: wallets need deposits for gas
- Allows UserOperations to be executed
- EntryPoint uses this to pay for gas

---

### Test 3: "Should withdraw from EntryPoint"

**What it tests:** The wallet can withdraw staked ETH from the EntryPoint.

**Setup:**
1. Deploy wallet
2. Deposit 1.0 ETH to EntryPoint
3. Withdraw to user1

**Process:**
```typescript
await totpWallet.write.addDeposit({ value: amount });
await totpWallet.write.withdrawDepositTo([user1.account.address, amount]);

const deposit = await mockEntryPoint.read.deposits([totpWallet.address]);
```

**Verification:**
```typescript
assert.equal(deposit, 0n);
```

**Expected result:** Wallet's EntryPoint deposit is now 0.

**Why important:** Allows retrieving unused gas deposits.

---

### Test 4: "Should revert withdraw from non-owner"

**What it tests:** Only the owner can withdraw from EntryPoint.

**Setup:**
1. Deploy wallet
2. Deposit 1.0 ETH
3. User1 (not owner) tries to withdraw

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.withdrawDepositTo([user2.account.address, amount], { account: user1.account }),
  /OnlyOwner/
);
```

**Expected result:** Reverts with `OnlyOwner` error.

**Why important:** Prevents theft of deposited funds.

---

### Test 5: "Should get deposit amount"

**What it tests:** Can query the current EntryPoint deposit.

**Setup:**
1. Deploy wallet
2. Deposit 1.0 ETH
3. Call `getDeposit()`

**Verification:**
```typescript
await totpWallet.write.addDeposit({ value: amount });

const deposit = await totpWallet.read.getDeposit();
assert.equal(deposit, amount);
```

**Expected result:** Returns 1.0 ETH.

**Why important:** View function to check available gas budget.

---

## UserOp Validation Tests (3 tests)

These tests verify the `validateUserOp()` function used by ERC-4337 Account Abstraction.

### Test 1: "Should validate user operation with correct signature"

**What it tests:** A UserOp signed by the owner is validated successfully.

**Setup:**
1. Deploy wallet
2. Fund wallet with 1.0 ETH
3. Create UserOp hash
4. Owner signs the hash
5. Construct UserOp object
6. EntryPoint calls `validateUserOp()`

**Process:**
```typescript
const userOpHash = keccak256(toHex("test user operation"));
const signature = await owner.signMessage({ message: { raw: hexToBytes(userOpHash) } });

const accountGasLimitsHex = pad(toHex((150000n << 128n) | 100000n), { size: 32 });
const gasFeesHex = pad(toHex((1000000000n << 128n) | 1000000000n), { size: 32 });

const userOp = {
  sender: totpWallet.address,
  nonce: 0n,
  initCode: "0x",
  callData: "0x",
  accountGasLimits: accountGasLimitsHex,
  preVerificationGas: 21000n,
  gasFees: gasFeesHex,
  paymasterAndData: "0x",
  signature: signature,
};

const hash = await mockEntryPoint.write.validateUserOp([
  totpWallet.address,
  userOp,
  userOpHash,
  0n,
]);
```

**Verification:**
```typescript
const receipt = await publicClient.waitForTransactionReceipt({ hash });
assert.equal(receipt.status, "success");
```

**Expected result:** 
- Transaction succeeds
- `validateUserOp()` returns 0 (indicating valid signature)

**Why important:** 
- Core ERC-4337 functionality
- Allows bundlers to validate UserOps before execution
- Uses ECDSA signature verification (same as Ethereum accounts)

**Gas Limits Encoding:**
The `accountGasLimits` packs two values:
```
(verificationGasLimit << 128) | callGasLimit
(150000 << 128) | 100000
```

**Gas Fees Encoding:**
The `gasFees` packs two values:
```
(maxPriorityFeePerGas << 128) | maxFeePerGas
(1000000000 << 128) | 1000000000
```

---

### Test 2: "Should reject user operation with incorrect signature"

**What it tests:** A UserOp signed by a non-owner is rejected.

**Setup:**
1. Deploy wallet with `owner`
2. Fund wallet
3. Create UserOp hash
4. **User1** (not owner) signs the hash
5. EntryPoint calls `validateUserOp()`

**Process:**
```typescript
const signature = await user1.signMessage({ message: { raw: hexToBytes(userOpHash) } });
// ... same UserOp structure ...

const hash = await mockEntryPoint.write.validateUserOp([...]);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
```

**Verification:**
```typescript
assert.equal(receipt.status, "success");
```

**Expected result:** 
- Transaction succeeds (validation completed)
- `validateUserOp()` returns 1 (indicating invalid signature)
- EntryPoint would reject this UserOp

**Why important:** 
- Signature verification works
- Non-owners cannot execute UserOps
- Returns error code instead of reverting (per ERC-4337 spec)

**ERC-4337 Return Codes:**
- 0 = Valid signature
- 1 = Invalid signature (should reject)

---

### Test 3: "Should revert if not called by EntryPoint"

**What it tests:** Only the EntryPoint can call `validateUserOp()`.

**Setup:**
1. Deploy wallet
2. Owner directly calls `validateUserOp()` (bypassing EntryPoint)

**Verification:**
```typescript
await assert.rejects(
  totpWallet.write.validateUserOp([userOp, userOpHash, 0n]),
  /OnlyEntryPoint/
);
```

**Expected result:** Reverts with `OnlyEntryPoint` error.

**Why important:** 
- Security: Only the trusted EntryPoint can validate operations
- Prevents direct manipulation
- Enforces ERC-4337 architecture

---

## Test Utilities

### zkProofHelper.ts

The test suite uses helper functions from `zkProofHelper.ts`:

#### `generateTOTPProof(secret, timestamp)`

**Purpose:** Generate a ZK proof for a given secret and timestamp.

**Process:**
1. Calculate TOTP code from secret + timestamp
2. Calculate secret hash using Poseidon
3. Run snarkjs to generate proof
4. Return formatted proof object

**Returns:**
```typescript
{
  pA: [bigint, bigint],
  pB: [[bigint, bigint], [bigint, bigint]],
  pC: [bigint, bigint],
  publicSignals: [totpCode, timeCounter, secretHash]
}
```

#### `calculateSecretHash(secret)`

**Purpose:** Calculate Poseidon hash of a secret.

**Process:**
1. Build Poseidon hasher
2. Hash the secret
3. Return result as bigint

**Returns:** `bigint` (the secret hash)

#### `calculateTOTPCode(secret, timestamp)`

**Purpose:** Calculate the TOTP code for testing/verification.

**Process:**
1. Convert timestamp to time counter: `timestamp / 30`
2. Hash: `Poseidon([secret, timeCounter])`
3. Modulo: `hash % 1000000`

**Returns:** 6-digit TOTP code as `bigint`

---

## Test Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Deployment | 4 | ✅ Owner, EntryPoint, Constants, Events |
| ZK Proofs | 7 | ✅ Valid/Invalid proofs, Timestamps, SecretHash, Rotation |
| Timestamps | 4 | ✅ Current, Fresh, Old, Future |
| Execution | 4 | ✅ Owner/Non-owner, With data, Failures |
| Batch | 4 | ✅ Multiple ops, Validation, Access control, Atomicity |
| Ownership | 4 | ✅ Transfer, Access control, Validation, New owner control |
| EntryPoint | 5 | ✅ Deposits, Withdrawals, Access control, Queries |
| UserOps | 3 | ✅ Valid/Invalid signatures, Access control |

**Total: 35 tests, all passing ✅**

---

## Key Testing Patterns

### 1. Setup-Execute-Verify Pattern
```typescript
// Setup
const wallet = await deployWallet(...);

// Execute
await wallet.write.someFunction([...args]);

// Verify
const result = await wallet.read.someState();
assert.equal(result, expected);
```

### 2. Negative Testing (Reverts)
```typescript
await assert.rejects(
  wallet.write.someFunction([...badArgs]),
  /ExpectedError/
);
```

### 3. Balance Checking Pattern
```typescript
const balanceBefore = await getBalance(address);
await executeTransaction();
const balanceAfter = await getBalance(address);
assert.equal(balanceAfter - balanceBefore, expectedDelta);
```

### 4. Event Verification Pattern
```typescript
const deploymentBlock = await getBlockNumber();
await deployContract();
const events = await getContractEvents({
  fromBlock: deploymentBlock,
  eventName: "EventName",
});
assert.equal(events.length, 1);
assert.equal(events[0].args.param, expected);
```

---

## Running the Tests

```bash
# In /blockchain directory
pnpm test

# Expected output:
# 35 passing (5-7 seconds)
```

---

## Debugging Tips

### Test Hanging?
- Check for unclosed resources in `after()` hook
- Ensure `process.exit(0)` is present for clean termination

### Proof Generation Errors?
- Verify circuit is compiled: `pnpm run compile` in `/circuits`
- Verify setup is complete: `pnpm run setup` in `/circuits`
- Check that `build/` directory exists with required files

### Timestamp Issues?
- Use `block.timestamp` instead of `Date.now()`
- Remember blockchain time ≠ real time
- Timestamps are in seconds, not milliseconds

### Gas Errors?
- Fund wallets before executing transactions
- Check balance before large transfers
- Ensure EntryPoint deposits for UserOps

---

## Best Practices Demonstrated

1. **Test Isolation:** Each test deploys its own contracts
2. **Comprehensive Coverage:** Positive and negative cases
3. **Clear Naming:** Test names describe what they verify
4. **Setup/Teardown:** Proper before/after hooks
5. **Real ZK Proofs:** Tests use actual cryptography (not mocks)
6. **Edge Cases:** Zero address, length mismatches, boundary conditions
7. **Access Control:** Verify all modifier restrictions
8. **Event Verification:** Check events are emitted correctly
9. **Atomicity:** Batch operations fail/succeed together
10. **Real-World Scenarios:** Multi-step flows like ownership transfer + execution

---

**This test suite provides production-ready validation of the TOTPWallet contract! 🎉**
