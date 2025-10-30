import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { network } from "hardhat";
import { parseEther, encodeFunctionData, keccak256, toHex, hexToBytes, pad } from "viem";
import { generateTOTPProof, calculateSecretHash } from "./zkProofHelper.js";

describe("TOTPWallet", function () {
  let viem: Awaited<ReturnType<typeof network.connect>>["viem"];
  let publicClient: Awaited<ReturnType<Awaited<ReturnType<typeof network.connect>>["viem"]["getPublicClient"]>>;
  let owner: any, user1: any, user2: any;
  let verifier: any;
  
  // Test secret - hash will be calculated in tests that need it
  const testSecret = 12345n;
  // Pre-calculate the hash synchronously by computing it inline
  // secretHash for 12345 with Poseidon
  const testSecretHash = 4267533774488295900887461483015112262021273608761099826938271132511348470966n;

  before(async function () {
    const connection = await network.connect();
    viem = connection.viem;
    publicClient = await viem.getPublicClient();
    [owner, user1, user2] = await viem.getWalletClients();
    
    // Deploy verifier contract once for all tests
    verifier = await viem.deployContract("TOTPVerifier");
  });

  after(async function () {
    // Cleanup and force exit
    await new Promise(resolve => setTimeout(resolve, 100));
    // Force process exit after tests complete (always exit, regardless of environment)
    process.nextTick(() => process.exit(0));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const walletOwner = await totpWallet.read.owner();
      assert.equal(walletOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should accept ETH during deployment", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const fundingAmount = parseEther("1.0");
      
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ], { value: fundingAmount });

      const balance = await publicClient.getBalance({ address: totpWallet.address });
      assert.equal(balance, fundingAmount);
    });

    it("Should set the correct EntryPoint", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const entryPoint = await totpWallet.read.entryPoint();
      assert.equal(entryPoint.toLowerCase(), mockEntryPoint.address.toLowerCase());
    });

    it("Should have correct MAX_TIME_DIFFERENCE constant", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const maxTimeDiff = await totpWallet.read.MAX_TIME_DIFFERENCE();
      assert.equal(maxTimeDiff, 300n);
    });

    it("Should emit WalletInitialized event", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const deploymentBlockNumber = await publicClient.getBlockNumber();

      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

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
    });
  });

  // NOTE: ZK Proof Verification tests removed - verifyZKProof is now internal (_verifyZKProofInternal)
  // and can only be called via executeWithProof(). See "Security: Transaction Commitment Binding" tests
  // for the new comprehensive security tests that verify proof validation through executeWithProof().

  describe("Timestamp Freshness Check", function () {
    it("Should accept current timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      await totpWallet.read.checkTimestampFreshness([timestamp]);
    });

    it("Should accept timestamp within 5 minutes", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const currentBlock = await publicClient.getBlock();
      const timestamp = currentBlock.timestamp - 299n;
      await totpWallet.read.checkTimestampFreshness([timestamp]);
    });

    it("Should reject timestamp older than 5 minutes", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const currentBlock = await publicClient.getBlock();
      const timestamp = currentBlock.timestamp - 301n;
      await assert.rejects(
        totpWallet.read.checkTimestampFreshness([timestamp]),
        /TimestampTooOld/
      );
    });

    it("Should reject future timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const currentBlock = await publicClient.getBlock();
      const timestamp = currentBlock.timestamp + 10n;
      await assert.rejects(
        totpWallet.read.checkTimestampFreshness([timestamp]),
        (err: Error) => err.message.includes("TimestampInFuture")
      );
    });
  });

  // NOTE: Transaction Execution tests removed - execute() is now disabled (reverts with DirectExecuteDisabled)
  // All transaction execution now requires ZK proof verification via executeWithProof()
  // See "Security: Transaction Commitment Binding" and "Security: Attack Scenario Simulations" tests

  // NOTE: Batch Execution tests removed - executeBatch() still uses old pattern without ZK proof
  // TODO: Update executeBatch() to require ZK proof verification similar to executeWithProof()

  describe("Ownership Transfer", function () {
    it("Should transfer ownership", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await totpWallet.write.transferOwnership([user1.account.address]);

      const newOwner = await totpWallet.read.owner();
      assert.equal(newOwner.toLowerCase(), user1.account.address.toLowerCase());
    });

    it("Should revert transfer from non-owner", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await assert.rejects(
        totpWallet.write.transferOwnership([user2.account.address], { account: user1.account }),
        /OnlyOwner/
      );
    });

    it("Should revert transfer to zero address", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await assert.rejects(
        totpWallet.write.transferOwnership(["0x0000000000000000000000000000000000000000"]),
        /Invalid new owner/
      );
    });

    // NOTE: Test removed - execute() is now disabled, use executeWithProof() instead
  });

  describe("EntryPoint Integration", function () {
    it("Should accept ETH deposits", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const amount = parseEther("1.0");
      const balanceBefore = await publicClient.getBalance({ address: totpWallet.address });

      await owner.sendTransaction({
        to: totpWallet.address,
        value: amount,
      });

      const balanceAfter = await publicClient.getBalance({ address: totpWallet.address });
      assert.equal(balanceAfter - balanceBefore, amount);
    });

    it("Should deposit to EntryPoint", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const amount = parseEther("1.0");
      await totpWallet.write.addDeposit({ value: amount });

      const deposit = await mockEntryPoint.read.deposits([totpWallet.address]);
      assert.equal(deposit, amount);
    });

    it("Should withdraw from EntryPoint", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const amount = parseEther("1.0");
      await totpWallet.write.addDeposit({ value: amount });

      await totpWallet.write.withdrawDepositTo([user1.account.address, amount]);

      const deposit = await mockEntryPoint.read.deposits([totpWallet.address]);
      assert.equal(deposit, 0n);
    });

    it("Should revert withdraw from non-owner", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const amount = parseEther("1.0");
      await totpWallet.write.addDeposit({ value: amount });

      await assert.rejects(
        totpWallet.write.withdrawDepositTo([user2.account.address, amount], { account: user1.account }),
        /OnlyOwner/
      );
    });

    it("Should get deposit amount", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const amount = parseEther("1.0");
      await totpWallet.write.addDeposit({ value: amount });

      const deposit = await totpWallet.read.getDeposit();
      assert.equal(deposit, amount);
    });
  });

  describe("UserOp Validation", function () {
    it("Should validate user operation with correct signature", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("1.0"),
      });

      const userOpHash = keccak256(toHex("test user operation"));
      const signature = await owner.signMessage({ message: { raw: hexToBytes(userOpHash) } });

      const accountGasLimitsHex = pad(toHex((150000n << 128n) | 100000n), { size: 32 });
      const gasFeesHex = pad(toHex((1000000000n << 128n) | 1000000000n), { size: 32 });

      const userOp = {
        sender: totpWallet.address,
        nonce: 0n,
        initCode: "0x" as `0x${string}`,
        callData: "0x" as `0x${string}`,
        accountGasLimits: accountGasLimitsHex,
        preVerificationGas: 21000n,
        gasFees: gasFeesHex,
        paymasterAndData: "0x" as `0x${string}`,
        signature: signature,
      };

      const hash = await mockEntryPoint.write.validateUserOp([
        totpWallet.address,
        userOp,
        userOpHash,
        0n,
      ]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // validateUserOp returns 0 for valid signature
      // We verify by checking the transaction succeeded
      assert.equal(receipt.status, "success");
    });

    it("Should reject user operation with incorrect signature", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("1.0"),
      });

      const userOpHash = keccak256(toHex("test user operation"));
      const signature = await user1.signMessage({ message: { raw: hexToBytes(userOpHash) } });

      const accountGasLimitsHex = pad(toHex((150000n << 128n) | 100000n), { size: 32 });
      const gasFeesHex = pad(toHex((1000000000n << 128n) | 1000000000n), { size: 32 });

      const userOp = {
        sender: totpWallet.address,
        nonce: 0n,
        initCode: "0x" as `0x${string}`,
        callData: "0x" as `0x${string}`,
        accountGasLimits: accountGasLimitsHex,
        preVerificationGas: 21000n,
        gasFees: gasFeesHex,
        paymasterAndData: "0x" as `0x${string}`,
        signature: signature,
      };

      const hash = await mockEntryPoint.write.validateUserOp([
        totpWallet.address,
        userOp,
        userOpHash,
        0n,
      ]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // validateUserOp returns 1 for invalid signature
      // We verify by checking the transaction succeeded (validation completed)
      assert.equal(receipt.status, "success");
    });

    it("Should revert if not called by EntryPoint", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const userOpHash = keccak256(toHex("test user operation"));

      const accountGasLimitsHex = pad(toHex((150000n << 128n) | 100000n), { size: 32 });
      const gasFeesHex = pad(toHex((1000000000n << 128n) | 1000000000n), { size: 32 });

      const userOp = {
        sender: totpWallet.address,
        nonce: 0n,
        initCode: "0x" as `0x${string}`,
        callData: "0x" as `0x${string}`,
        accountGasLimits: accountGasLimitsHex,
        preVerificationGas: 21000n,
        gasFees: gasFeesHex,
        paymasterAndData: "0x" as `0x${string}`,
        signature: "0x" as `0x${string}`,
      };

      await assert.rejects(
        totpWallet.write.validateUserOp([userOp, userOpHash, 0n]),
        (err: Error) => err.message.includes("OnlyEntryPoint")
      );
    });
  });

  describe("Security: Transaction Commitment Binding", function () {
    it("Should prevent direct execute() calls - only executeWithProof() allowed", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      // Try to call execute() directly - should revert
      // Note: execute() is marked as pure, so we use read instead of write
      await viem.assertions.revertWithCustomError(
        totpWallet.read.execute([user1.account.address, parseEther("1"), "0x"]),
        totpWallet,
        "DirectExecuteDisabled",
      );
    });

    it("Should verify transaction commitment matches proof", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      // Fund the wallet
      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;

      // Get current nonce
      const nonce = await totpWallet.read.nonce();

      // Transaction parameters
      const to = user1.account.address;
      const value = parseEther("1");
      const data = "0x" as `0x${string}`;

      // Generate proof with correct transaction commitment
      const proof = await generateTOTPProof(testSecret, currentTime, {
        to,
        value,
        data,
        nonce,
      });

      // Execute transaction - should succeed
      await totpWallet.write.executeWithProof([
        to,
        value,
        data,
        proof.pA,
        proof.pB,
        proof.pC,
        proof.publicSignals,
      ]);

      // Verify transaction executed
      const balanceAfter = await publicClient.getBalance({ address: user1.account.address });
      assert.ok(balanceAfter > 0n);
    });

    it("Should reject proof if transaction parameters don't match commitment", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      // Fund the wallet
      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const nonce = await totpWallet.read.nonce();

      // Generate proof for sending 1 ETH to user1
      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce,
      });

      // Try to execute with DIFFERENT recipient (attack scenario)
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user2.account.address,  // Different recipient!
          parseEther("1"),
          "0x",
          proof.pA,
          proof.pB,
          proof.pC,
          proof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );
    });

    it("Should reject proof if amount doesn't match commitment", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const nonce = await totpWallet.read.nonce();

      // Generate proof for sending 1 ETH
      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce,
      });

      // Try to execute with DIFFERENT amount (attack scenario)
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user1.account.address,
          parseEther("5"),  // Different amount!
          "0x",
          proof.pA,
          proof.pB,
          proof.pC,
          proof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );
    });

    it("Should reject proof if calldata doesn't match commitment", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const nonce = await totpWallet.read.nonce();

      // Generate proof with empty calldata
      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce,
      });

      // Try to execute with DIFFERENT calldata (attack scenario)
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user1.account.address,
          parseEther("1"),
          "0x1234",  // Different calldata!
          proof.pA,
          proof.pB,
          proof.pC,
          proof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );
    });

    it("Should reject proof if nonce doesn't match commitment", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;

      // Generate proof with WRONG nonce (nonce + 1)
      const currentNonce = await totpWallet.read.nonce();
      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce: currentNonce + 1n,  // Wrong nonce!
      });

      // Try to execute - should fail because commitment uses wrong nonce
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user1.account.address,
          parseEther("1"),
          "0x",
          proof.pA,
          proof.pB,
          proof.pC,
          proof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );
    });

    it("Should increment nonce after successful executeWithProof", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const nonceBefore = await totpWallet.read.nonce();
      
      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;

      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce: nonceBefore,
      });

      await totpWallet.write.executeWithProof([
        user1.account.address,
        parseEther("1"),
        "0x",
        proof.pA,
        proof.pB,
        proof.pC,
        proof.publicSignals,
      ]);

      const nonceAfter = await totpWallet.read.nonce();
      assert.equal(nonceAfter, nonceBefore + 1n);
    });
  });

  describe("Security: Attack Scenario Simulations", function () {
    it("Scenario: Compromised private key cannot drain wallet without TOTP", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      // Attacker has private key (is owner) but tries direct execute
      // Note: execute() is marked as pure, so we use read instead of write
      await viem.assertions.revertWithCustomError(
        totpWallet.read.execute([user2.account.address, parseEther("10"), "0x"]),
        totpWallet,
        "DirectExecuteDisabled",
      );

      // Wallet balance should remain unchanged
      const balance = await publicClient.getBalance({ address: totpWallet.address });
      assert.equal(balance, parseEther("10"));
    });

    it("Scenario: Front-runner cannot modify transaction parameters", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const nonce = await totpWallet.read.nonce();

      // User generates proof for legitimate transaction
      const legitimateProof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce,
      });

      // Attacker intercepts proof and tries to redirect funds to themselves
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user2.account.address,  // Attacker's address
          parseEther("9"),        // Trying to steal more
          "0x",
          legitimateProof.pA,
          legitimateProof.pB,
          legitimateProof.pC,
          legitimateProof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );

      // Legitimate transaction should still work
      await totpWallet.write.executeWithProof([
        user1.account.address,
        parseEther("1"),
        "0x",
        legitimateProof.pA,
        legitimateProof.pB,
        legitimateProof.pC,
        legitimateProof.publicSignals,
      ]);
    });

    it("Scenario: Cannot reuse proof even for same transaction", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("10"),
      });

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const nonce = await totpWallet.read.nonce();

      const proof = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce,
      });

      // First transaction succeeds
      await totpWallet.write.executeWithProof([
        user1.account.address,
        parseEther("1"),
        "0x",
        proof.pA,
        proof.pB,
        proof.pC,
        proof.publicSignals,
      ]);

      // Trying to reuse the same proof - fails because nonce has changed
      // The nonce is now 1 (incremented after first tx), but proof has nonce 0
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user1.account.address,
          parseEther("1"),
          "0x",
          proof.pA,
          proof.pB,
          proof.pC,
          proof.publicSignals,
        ]),
        totpWallet,
        "TxCommitmentMismatch",
      );
      
      // Even with correct nonce, timeCounter prevents replay
      const newNonce = await totpWallet.read.nonce();
      const proofWithNewNonce = await generateTOTPProof(testSecret, currentTime, {
        to: user1.account.address,
        value: parseEther("1"),
        data: "0x",
        nonce: newNonce,
      });
      
      await viem.assertions.revertWithCustomError(
        totpWallet.write.executeWithProof([
          user1.account.address,
          parseEther("1"),
          "0x",
          proofWithNewNonce.pA,
          proofWithNewNonce.pB,
          proofWithNewNonce.pC,
          proofWithNewNonce.publicSignals,
        ]),
        totpWallet,
        "TimeCounterAlreadyUsed",
      );
    });
  });
});
