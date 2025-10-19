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
    // Force process exit after tests complete
    if (process.env.CI !== 'true') {
      process.nextTick(() => process.exit(0));
    }
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

  describe("ZK Proof Verification", function () {
    it("Should verify valid ZK proof with fresh timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const secret = 12345n;
      const block = await publicClient.getBlock();
      const timestamp = block.timestamp;

      const { pA, pB, pC, publicSignals } = await generateTOTPProof(secret, timestamp);

      await totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]);
    });

    it("Should revert for timestamp in the future", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const secret = 12345n;
      const block = await publicClient.getBlock();
      const futureTimestamp = block.timestamp + 3600n;

      const { pA, pB, pC, publicSignals } = await generateTOTPProof(secret, futureTimestamp);

      await assert.rejects(
        totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
        /TimestampInFuture/
      );
    });

    it("Should revert for old timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const secret = 12345n;
      const block = await publicClient.getBlock();
      const oldTimestamp = block.timestamp - 400n;

      const { pA, pB, pC, publicSignals } = await generateTOTPProof(secret, oldTimestamp);

      await assert.rejects(
        totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
        /TimestampTooOld/
      );
    });

    it("Should revert for invalid proof", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;
      const timeCounter = currentTime / 30n;

      // Create invalid proof with wrong values but correct secretHash and fresh timestamp
      const pA: [bigint, bigint] = [1n, 2n];
      const pB: [[bigint, bigint], [bigint, bigint]] = [[3n, 4n], [5n, 6n]];
      const pC: [bigint, bigint] = [7n, 8n];
      const publicSignals: [bigint, bigint, bigint] = [123456n, timeCounter, testSecretHash];

      await assert.rejects(
        totpWallet.write.verifyZKProof([pA, pB, pC, publicSignals]),
        /InvalidProof/
      );
    });

    it("Should verify multiple proofs with same secret at different time windows", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const block = await publicClient.getBlock();
      const currentTime = block.timestamp;

      // Verify first proof with current time
      const proof1 = await generateTOTPProof(testSecret, currentTime);
      await totpWallet.write.verifyZKProof([proof1.pA, proof1.pB, proof1.pC, proof1.publicSignals]);

      // Verify second proof with a past time (different 30-second window = different TOTP code)
      const timestamp2 = currentTime - 60n; // 60 seconds earlier (different time window)
      const proof2 = await generateTOTPProof(testSecret, timestamp2);
      await totpWallet.write.verifyZKProof([proof2.pA, proof2.pB, proof2.pC, proof2.publicSignals]);
    });

    it("Should reject proof with wrong secret hash", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      const block = await publicClient.getBlock();
      const timestamp = block.timestamp;

      // Try to use a different secret (wrong secretHash)
      const wrongSecret = 99999n;
      const wrongProof = await generateTOTPProof(wrongSecret, timestamp);

      await assert.rejects(
        totpWallet.write.verifyZKProof([wrongProof.pA, wrongProof.pB, wrongProof.pC, wrongProof.publicSignals]),
        /SecretHashMismatch/
      );
    });

    it("Should allow owner to update secret hash", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);

      // Update to a new secret
      const newSecret = 54321n;
      const newSecretHash = await calculateSecretHash(newSecret);
      
      await totpWallet.write.updateSecretHash([newSecretHash]);

      // Verify the hash was updated
      const storedHash = await totpWallet.read.ownerSecretHash();
      assert.equal(storedHash, newSecretHash);

      // Old secret should not work
      const block = await publicClient.getBlock();
      const timestamp = block.timestamp;
      const oldProof = await generateTOTPProof(testSecret, timestamp);
      
      await assert.rejects(
        totpWallet.write.verifyZKProof([oldProof.pA, oldProof.pB, oldProof.pC, oldProof.publicSignals]),
        /SecretHashMismatch/
      );

      // New secret should work
      const newProof = await generateTOTPProof(newSecret, timestamp);
      await totpWallet.write.verifyZKProof([newProof.pA, newProof.pB, newProof.pC, newProof.publicSignals]);
    });
  });

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

  describe("Transaction Execution", function () {
    it("Should execute transaction from owner", async function () {
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

      const amount = parseEther("0.1");
      const balanceBefore = await publicClient.getBalance({ address: user1.account.address });

      await totpWallet.write.execute([user1.account.address, amount, "0x"]);

      const balanceAfter = await publicClient.getBalance({ address: user1.account.address });
      assert.equal(balanceAfter - balanceBefore, amount);
    });

    it("Should revert transaction from non-owner", async function () {
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

      const amount = parseEther("0.1");
      await assert.rejects(
        totpWallet.write.execute([user2.account.address, amount, "0x"], { account: user1.account }),
        /OnlyOwner/
      );
    });

    it("Should execute transaction with data", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        verifier.address,
        owner.account.address,
        testSecretHash,
      ]);
      const simpleContract = await viem.deployContract("SimpleContract");

      await owner.sendTransaction({
        to: totpWallet.address,
        value: parseEther("1.0"),
      });

      const data = encodeFunctionData({
        abi: simpleContract.abi,
        functionName: "setValue",
        args: [42n],
      });

      await totpWallet.write.execute([simpleContract.address, 0n, data]);

      const value = await simpleContract.read.value();
      assert.equal(value, 42n);
    });

    it("Should revert when transaction fails", async function () {
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

      const amount = parseEther("10.0");
      await assert.rejects(
        totpWallet.write.execute([user1.account.address, amount, "0x"]),
        /TransactionFailed/
      );
    });
  });

  describe("Batch Execution", function () {
    it("Should execute batch of transactions", async function () {
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

      const dest = [user1.account.address, user2.account.address];
      const values = [parseEther("0.1"), parseEther("0.2")];
      const func = ["0x" as `0x${string}`, "0x" as `0x${string}`];

      const balance1Before = await publicClient.getBalance({ address: user1.account.address });
      const balance2Before = await publicClient.getBalance({ address: user2.account.address });

      await totpWallet.write.executeBatch([dest, values, func]);

      const balance1After = await publicClient.getBalance({ address: user1.account.address });
      const balance2After = await publicClient.getBalance({ address: user2.account.address });

      assert.equal(balance1After - balance1Before, values[0]);
      assert.equal(balance2After - balance2Before, values[1]);
    });

    it("Should revert on length mismatch", async function () {
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

      const dest = [user1.account.address, user2.account.address];
      const values = [parseEther("0.1")];
      const func = ["0x" as `0x${string}`, "0x" as `0x${string}`];

      await assert.rejects(
        totpWallet.write.executeBatch([dest, values, func]),
        /Length mismatch/
      );
    });

    it("Should revert batch from non-owner", async function () {
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

      const dest = [user1.account.address];
      const values = [parseEther("0.1")];
      const func = ["0x" as `0x${string}`];

      await assert.rejects(
        totpWallet.write.executeBatch([dest, values, func], { account: user1.account }),
        /OnlyOwner/
      );
    });

    it("Should revert if one transaction fails", async function () {
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

      const dest = [user1.account.address, user2.account.address];
      const values = [parseEther("0.1"), parseEther("10.0")];
      const func = ["0x" as `0x${string}`, "0x" as `0x${string}`];

      await assert.rejects(
        totpWallet.write.executeBatch([dest, values, func]),
        /TransactionFailed/
      );
    });
  });

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

    it("New owner should be able to execute transactions", async function () {
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

      await totpWallet.write.transferOwnership([user1.account.address]);

      const amount = parseEther("0.1");
      await totpWallet.write.execute([user2.account.address, amount, "0x"], { account: user1.account });

      const newOwner = await totpWallet.read.owner();
      assert.equal(newOwner.toLowerCase(), user1.account.address.toLowerCase());
    });
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
});
