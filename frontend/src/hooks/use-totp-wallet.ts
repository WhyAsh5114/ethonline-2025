"use client";

import type { SolidityProof } from "@/lib/zk-proof";
import { totpWalletAbi } from "blockchain/generated";
import { useCallback, useState } from "react";
import { type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
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
}

export interface UseTOTPWalletResult {
  walletAddress: Address | null;
  isDeploying: boolean;
  isExecuting: boolean;
  isVerifying: boolean;
  error: Error | null;
  deployWallet: (params: DeployWalletParams) => Promise<Address | undefined>;
  verifyProof: (
    walletAddress: Address,
    proof: SolidityProof
  ) => Promise<boolean>;
  executeTransaction: (params: ExecuteTransactionParams) => Promise<void>;
  updateSecretHash: (
    walletAddress: Address,
    newSecretHash: bigint
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
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deployWallet = useCallback(
    async (params: DeployWalletParams): Promise<Address | undefined> => {
      if (!walletClient || !publicClient) {
        throw new Error("Wallet client not available");
      }

      setIsDeploying(true);
      setError(null);

      try {
        // Deploy the TOTPWallet contract
        const hash = await walletClient.deployContract({
          abi: totpWalletAbi,
          bytecode: "0x" as `0x${string}`, // This needs to be set with actual bytecode
          args: [
            params.entryPointAddress,
            params.verifierAddress,
            params.ownerAddress,
            params.initialSecretHash,
          ],
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
    [walletClient, publicClient]
  );

  const verifyProof = useCallback(
    async (walletAddress: Address, proof: SolidityProof): Promise<boolean> => {
      setIsVerifying(true);
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: walletAddress,
          abi: totpWalletAbi,
          functionName: "verifyZKProof",
          args: [proof.pA, proof.pB, proof.pC, proof.publicSignals],
        });

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Wait for transaction
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        return receipt.status === "success";
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsVerifying(false);
      }
    },
    [writeContractAsync, publicClient]
  );

  const executeTransaction = useCallback(
    async (params: ExecuteTransactionParams): Promise<void> => {
      setIsExecuting(true);
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: params.walletAddress,
          abi: totpWalletAbi,
          functionName: "execute",
          args: [params.to, params.value, params.data],
        });

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [writeContractAsync, publicClient]
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
    [writeContractAsync, publicClient]
  );

  const getWalletInfo = useCallback(
    async (
      walletAddress: Address
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
    [publicClient]
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
    [writeContractAsync, publicClient]
  );

  return {
    walletAddress,
    isDeploying,
    isExecuting,
    isVerifying,
    error,
    deployWallet,
    verifyProof,
    executeTransaction,
    updateSecretHash,
    getWalletInfo,
    addDeposit,
  };
}
