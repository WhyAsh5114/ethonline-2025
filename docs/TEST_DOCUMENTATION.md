# Test Suite Documentation 🧪

Overview of the ChronoVault test suite.

---

## Blockchain Tests (35 tests)

Located in `blockchain/test/TOTPWallet.ts`

### Running Tests
```bash
cd blockchain
pnpm test
```

**Expected:** ✓ 35 passing (~5-7 seconds)

---

## Test Categories

### 1. Deployment (4 tests)
- ✓ Sets correct owner
- ✓ Sets correct EntryPoint
- ✓ Sets correct MAX_TIME_DIFFERENCE (5 minutes)
- ✓ Sets correct ownerSecretHash

### 2. ZK Proof Verification (7 tests)
- ✓ Verifies valid proof successfully
- ✓ Rejects wrong secret hash
- ✓ Rejects invalid proof data
- ✓ Rejects old timestamp (>5 min)
- ✓ Rejects future timestamp
- ✓ Prevents time counter reuse
- ✓ Emits ZKProofVerified event

### 3. Transaction Commitment (5 tests)
- ✓ Executes with valid commitment
- ✓ Rejects commitment mismatch (wrong destination)
- ✓ Rejects commitment mismatch (wrong value)
- ✓ Rejects commitment mismatch (wrong data)
- ✓ Increments nonce after execution

### 4. Transaction Execution (4 tests)
- ✓ Executes with valid proof
- ✓ Requires onlyOwner
- ✓ Emits TransactionExecuted event
- ✓ Reverts on failed transaction

### 5. Batch Execution (4 tests)
- ✓ Executes multiple calls atomically
- ✓ Requires valid proof
- ✓ Reverts all on single failure
- ✓ Updates nonce correctly

### 6. Ownership Transfer (4 tests)
- ✓ Transfers with proof
- ✓ Requires current owner
- ✓ Emits OwnershipTransferred
- ✓ New owner can execute transactions

### 7. EntryPoint Integration (5 tests)
- ✓ Validates UserOp with valid proof
- ✓ Rejects from non-EntryPoint
- ✓ Returns validation data
- ✓ Handles signature validation
- ✓ Supports ERC-4337 interface

### 8. Replay Attack Prevention (2 tests)
- ✓ Prevents same timeCounter reuse
- ✓ Allows strictly increasing timeCounters

---

## Test Helper: zkProofHelper.ts

Generates ZK proofs for testing without snarkjs dependency.

**Note:** Uses pre-computed proof for test secret `12345n` to avoid circuit dependency in tests.

---

## Frontend E2E Tests

Located in `frontend/e2e/`

See: [frontend/e2e/E2E_TESTING_GUIDE.md](../frontend/e2e/E2E_TESTING_GUIDE.md)

**Running:**
```bash
cd frontend
pnpm test:e2e
```

### Tests Include:
- Basic UI flow (wallet connection, TOTP setup)
- Wallet creation and deployment
- Transaction preparation and QR generation
- Multi-part QR proof scanning
- End-to-end transaction execution

---

## Security Test Scenarios

Tests verify protection against:

### ✓ Compromised Private Key
- Cannot execute without valid TOTP proof
- Tests: "Should require proof for execution"

### ✓ Proof Reuse (Replay Attacks)
- Each timeCounter can only be used once
- Tests: "Should prevent time counter reuse"

### ✓ Parameter Tampering
- Changing destination, value, or data invalidates proof
- Tests: "Commitment mismatch" test suite (3 tests)

### ✓ Old Proof Attempts
- Proofs >5 minutes old rejected
- Tests: "Should reject old timestamp"

### ✓ Front-Running
- Transaction commitment binding prevents parameter changes
- Tests: All "Commitment mismatch" tests

---

## Coverage

```
Statements: High coverage on critical paths
Branches: All security checks covered
Functions: All public/external functions tested
Lines: Core logic fully tested
```

---

## Adding New Tests

### 1. Blockchain Tests

Add to `blockchain/test/TOTPWallet.ts`:

```typescript
it("Should test new feature", async function () {
  const { viem } = await network.connect();
  const contract = await viem.deployContract("TOTPWallet", [...]);
  
  // Your test logic
  const result = await contract.read.someFunction();
  assert.equal(result, expectedValue);
});
```

### 2. E2E Tests

Add to `frontend/e2e/`:

```typescript
test("should do something", async ({ page }) => {
  await page.goto("/");
  // Your test steps
  await expect(page.locator("#element")).toBeVisible();
});
```

---

## CI Integration

Tests run automatically on:
- Every push to any branch
- Every pull request
- Manual workflow dispatch

See: [CI_QUICK_REFERENCE.md](./CI_QUICK_REFERENCE.md)

---

## Related Documentation

- [../blockchain/README.md](../blockchain/README.md) - Smart contract docs
- [../frontend/e2e/E2E_TESTING_GUIDE.md](../frontend/e2e/E2E_TESTING_GUIDE.md) - E2E testing
- [SECURITY.md](./SECURITY.md) - Security model and attack scenarios
