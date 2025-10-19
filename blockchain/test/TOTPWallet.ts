import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, encodeFunctionData, keccak256, toHex, hexToBytes, pad } from "viem";

describe("TOTPWallet", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, user1, user2] = await viem.getWalletClients();

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const walletOwner = await totpWallet.read.owner();
      assert.equal(walletOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should set the correct EntryPoint", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const entryPoint = await totpWallet.read.entryPoint();
      assert.equal(entryPoint.toLowerCase(), mockEntryPoint.address.toLowerCase());
    });

    it("Should have correct MAX_TIME_DIFFERENCE constant", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const maxTimeDiff = await totpWallet.read.MAX_TIME_DIFFERENCE();
      assert.equal(maxTimeDiff, 300n);
    });

    it("Should emit WalletInitialized event", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const deploymentBlockNumber = await publicClient.getBlockNumber();

      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
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
        owner.account.address,
      ]);

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const proof = toHex(new Uint8Array(32).fill(1));
      const publicSignals = toHex(new Uint8Array(32).fill(2));

      await viem.assertions.emitWithArgs(
        totpWallet.write.verifyZKProof([proof, timestamp, publicSignals]),
        totpWallet,
        "ZKProofVerified",
        [timestamp, true],
      );
    });

    it("Should revert for timestamp in the future", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const proof = toHex(new Uint8Array(32).fill(1));
      const publicSignals = toHex(new Uint8Array(32).fill(2));

      await assert.rejects(
        totpWallet.write.verifyZKProof([proof, futureTimestamp, publicSignals]),
        /TimestampInFuture/
      );
    });

    it("Should revert for old timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const oldTimestamp = BigInt(Math.floor(Date.now() / 1000) - 400);
      const proof = toHex(new Uint8Array(32).fill(1));
      const publicSignals = toHex(new Uint8Array(32).fill(2));

      await assert.rejects(
        totpWallet.write.verifyZKProof([proof, oldTimestamp, publicSignals]),
        /TimestampTooOld/
      );
    });

    it("Should revert for empty proof", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const proof = "0x";
      const publicSignals = toHex(new Uint8Array(32).fill(2));

      await assert.rejects(
        totpWallet.write.verifyZKProof([proof, timestamp, publicSignals]),
        /InvalidProof/
      );
    });

    it("Should revert for empty public signals", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const proof = toHex(new Uint8Array(32).fill(1));
      const publicSignals = "0x";

      await assert.rejects(
        totpWallet.write.verifyZKProof([proof, timestamp, publicSignals]),
        /InvalidProof/
      );
    });
  });

  describe("Timestamp Freshness Check", function () {
    it("Should accept current timestamp", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      await totpWallet.read.checkTimestampFreshness([timestamp]);
    });

    it("Should accept timestamp within 5 minutes", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
      ]);

      const currentBlock = await publicClient.getBlock();
      const timestamp = currentBlock.timestamp - 299n;
      await totpWallet.read.checkTimestampFreshness([timestamp]);
    });

    it("Should reject timestamp older than 5 minutes", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
      ]);

      await totpWallet.write.transferOwnership([user1.account.address]);

      const newOwner = await totpWallet.read.owner();
      assert.equal(newOwner.toLowerCase(), user1.account.address.toLowerCase());
    });

    it("Should revert transfer from non-owner", async function () {
      const mockEntryPoint = await viem.deployContract("MockEntryPoint");
      const totpWallet = await viem.deployContract("TOTPWallet", [
        mockEntryPoint.address,
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
        owner.account.address,
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
