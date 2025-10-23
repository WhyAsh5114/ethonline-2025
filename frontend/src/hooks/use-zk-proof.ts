"use client";

import { useCallback, useState } from "react";
import type { SolidityProof, ZKProof } from "@/lib/zk-proof";
import {
  calculateSecretHash,
  calculateTOTPCode,
  formatProofForSolidity,
  generateZKProof,
  verifyZKProof,
} from "@/lib/zk-proof";

export interface UseZKProofResult {
  proof: ZKProof | null;
  solidityProof: SolidityProof | null;
  isGenerating: boolean;
  isVerifying: boolean;
  error: Error | null;
  generateProof: (
    secret: string,
    totpCode: string,
    timestamp?: number,
  ) => Promise<void>;
  verifyProof: () => Promise<boolean>;
  clearProof: () => void;
  getSecretHash: (secret: string) => Promise<bigint>;
  getTOTPCode: (secret: string, timestamp?: number) => Promise<bigint>;
}

export function useZKProof(): UseZKProofResult {
  const [proof, setProof] = useState<ZKProof | null>(null);
  const [solidityProof, setSolidityProof] = useState<SolidityProof | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateProof = useCallback(
    async (secret: string, totpCode: string, timestamp?: number) => {
      setIsGenerating(true);
      setError(null);

      try {
        const ts = timestamp ?? Math.floor(Date.now() / 1000);

        const zkProof = await generateZKProof(secret, totpCode, ts);

        const formattedProof = formatProofForSolidity(zkProof);

        setProof(zkProof);
        setSolidityProof(formattedProof);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const verifyProof = useCallback(async (): Promise<boolean> => {
    if (!proof) {
      throw new Error("No proof to verify");
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyZKProof(proof.proof, proof.publicSignals);
      return isValid;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  }, [proof]);

  const clearProof = useCallback(() => {
    setProof(null);
    setSolidityProof(null);
    setError(null);
  }, []);

  const getSecretHash = useCallback(async (secret: string): Promise<bigint> => {
    try {
      return await calculateSecretHash(secret);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const getTOTPCode = useCallback(
    async (secret: string, timestamp?: number): Promise<bigint> => {
      try {
        const ts = timestamp ?? Math.floor(Date.now() / 1000);
        return await calculateTOTPCode(secret, ts);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [],
  );

  return {
    proof,
    solidityProof,
    isGenerating,
    isVerifying,
    error,
    generateProof,
    verifyProof,
    clearProof,
    getSecretHash,
    getTOTPCode,
  };
}
