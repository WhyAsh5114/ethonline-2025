"use client";

import TOTPWalletArtifact from "blockchain/artifacts/contracts/TOTPWallet.sol/TOTPWallet.json";
import { totpWalletAbi } from "blockchain/generated";
import { useCallback, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useDeployContract,
  usePublicClient,
  useWriteContract,
} from "wagmi";

export interface DeployWalletParams {
  entryPointAddress: Address;
  verifierAddress: Address;
  ownerAddress: Address;
  initialSecretHash: bigint;
}

export interface ExecuteTransactionParams {
  walletAddress: Address;
  to: Address;
  value: bigint;
  data: `0x${string}`;
  totpCode: string;
  secret: string;
}

export interface ExecuteWithProofParams {
  walletAddress: Address;
  to: Address;
  value: bigint;
  data: `0x${string}`;
  proof: {
    pA: readonly [bigint, bigint];
    pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
    pC: readonly [bigint, bigint];
    publicSignals: readonly [bigint, bigint, bigint, bigint];
  };
}

export interface UseTOTPWalletResult {
  walletAddress: Address | null;
  isDeploying: boolean;
  isExecuting: boolean;
  error: Error | null;
  deployWallet: (params: DeployWalletParams) => Promise<Address | undefined>;
  executeTransaction: (params: ExecuteTransactionParams) => Promise<void>;
  executeWithProof: (params: ExecuteWithProofParams) => Promise<void>;
  updateSecretHash: (
    walletAddress: Address,
    newSecretHash: bigint,
  ) => Promise<void>;
  getWalletInfo: (walletAddress: Address) => Promise<{
    owner: Address;
    nonce: bigint;
    secretHash: bigint;
    deposit: bigint;
  }>;
  addDeposit: (walletAddress: Address, amount: bigint) => Promise<void>;
}

export function useTOTPWallet(): UseTOTPWalletResult {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const { deployContractAsync } = useDeployContract();
  const { writeContractAsync } = useWriteContract();

  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deployWallet = useCallback(
    async (params: DeployWalletParams): Promise<Address | undefined> => {
      if (!userAddress) {
        throw new Error("Please connect your wallet first");
      }

      if (!chain) {
        throw new Error("Please ensure your wallet is connected to a network");
      }

      if (!publicClient) {
        throw new Error(
          "Public client not available. Please check your network connection.",
        );
      }

      setIsDeploying(true);
      setError(null);

      try {
        // Deploy the TOTPWallet contract using useDeployContract
        const hash = await deployContractAsync({
          abi: totpWalletAbi,
          bytecode: TOTPWalletArtifact.bytecode as `0x${string}`,
          args: [
            params.entryPointAddress,
            params.verifierAddress,
            params.ownerAddress,
            params.initialSecretHash,
          ],
          gas: BigInt(5000000), // Set a reasonable gas limit for contract deployment
        });

        // Wait for transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.contractAddress) {
          setWalletAddress(receipt.contractAddress);
          return receipt.contractAddress;
        }

        throw new Error("Failed to get contract address");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsDeploying(false);
      }
    },
    [deployContractAsync, publicClient, userAddress, chain],
  );

  const executeTransaction = useCallback(
    async (params: ExecuteTransactionParams): Promise<void> => {
      setIsExecuting(true);
      setError(null);

      try {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Get current nonce from wallet
        const nonce = await publicClient.readContract({
          address: params.walletAddress,
          abi: totpWalletAbi,
          functionName: "nonce",
        });

        // Import ZK proof generation
        const { generateZKProof, formatProofForSolidity } = await import(
          "@/lib/zk-proof"
        );

        type TxParams = {
          to: string;
          value: bigint;
          data: string;
          nonce: bigint;
        };

        // Prepare transaction parameters for commitment
        const txParams: TxParams = {
          to: params.to,
          value: params.value,
          data: params.data,
          nonce: nonce,
        };

        // Generate ZK proof with transaction binding
        const timestamp = Math.floor(Date.now() / 1000);
        const zkProof = await generateZKProof(
          params.secret,
          params.totpCode,
          timestamp,
          txParams,
        );

        if (!zkProof) {
          throw new Error("Failed to generate ZK proof");
        }

        // Convert proof to Solidity format
        const solidityProof = formatProofForSolidity(zkProof);

        // Execute transaction with proof
        const hash = await writeContractAsync({
          address: params.walletAddress,
          abi: totpWalletAbi,
          functionName: "executeWithProof",
          args: [
            params.to,
            params.value,
            params.data,
            solidityProof.pA,
            solidityProof.pB,
            solidityProof.pC,
            solidityProof.publicSignals,
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [writeContractAsync, publicClient],
  );

  const updateSecretHash = useCallback(
    async (walletAddress: Address, newSecretHash: bigint): Promise<void> => {
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: walletAddress,
          abi: totpWalletAbi,
          functionName: "updateSecretHash",
          args: [newSecretHash],
        });

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [writeContractAsync, publicClient],
  );

  const getWalletInfo = useCallback(
    async (
      walletAddress: Address,
    ): Promise<{
      owner: Address;
      nonce: bigint;
      secretHash: bigint;
      deposit: bigint;
    }> => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const [owner, nonce, secretHash, deposit] = await Promise.all([
          publicClient.readContract({
            address: walletAddress,
            abi: totpWalletAbi,
            functionName: "owner",
          }),
          publicClient.readContract({
            address: walletAddress,
            abi: totpWalletAbi,
            functionName: "nonce",
          }),
          publicClient.readContract({
            address: walletAddress,
            abi: totpWalletAbi,
            functionName: "ownerSecretHash",
          }),
          publicClient.readContract({
            address: walletAddress,
            abi: totpWalletAbi,
            functionName: "getDeposit",
          }),
        ]);

        return { owner, nonce, secretHash, deposit };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [publicClient],
  );

  const executeWithProof = useCallback(
    async (params: ExecuteWithProofParams): Promise<void> => {
      setIsExecuting(true);
      setError(null);

      try {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Execute transaction with the provided proof
        const hash = await writeContractAsync({
          address: params.walletAddress,
          abi: totpWalletAbi,
          functionName: "executeWithProof",
          args: [
            params.to,
            params.value,
            params.data,
            params.proof.pA,
            params.proof.pB,
            params.proof.pC,
            params.proof.publicSignals,
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [writeContractAsync, publicClient],
  );

  const addDeposit = useCallback(
    async (walletAddress: Address, amount: bigint): Promise<void> => {
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: walletAddress,
          abi: totpWalletAbi,
          functionName: "addDeposit",
          value: amount,
        });

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [writeContractAsync, publicClient],
  );

  return {
    walletAddress,
    isDeploying,
    isExecuting,
    error,
    deployWallet,
    executeTransaction,
    executeWithProof,
    updateSecretHash,
    getWalletInfo,
    addDeposit,
  };
}
