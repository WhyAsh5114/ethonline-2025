"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type SolidityProof = {
  pA: readonly [bigint, bigint];
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  pC: readonly [bigint, bigint];
  publicSignals: readonly [bigint, bigint, bigint, bigint];
};

/**
 * Create a new proof transfer entry with a UUID
 * Called by the transaction initiator
 */
export async function createProofTransfer(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.proofTransfer.create({
      data: {
        id,
        proof: Prisma.DbNull,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to create proof transfer:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create proof transfer",
    };
  }
}

/**
 * Upload a proof to an existing transfer entry
 * Called by the authenticator device
 */
export async function uploadProof(
  id: string,
  proof: SolidityProof,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert BigInt values to strings for JSON storage
    const proofData = {
      pA: [proof.pA[0].toString(), proof.pA[1].toString()],
      pB: [
        [proof.pB[0][0].toString(), proof.pB[0][1].toString()],
        [proof.pB[1][0].toString(), proof.pB[1][1].toString()],
      ],
      pC: [proof.pC[0].toString(), proof.pC[1].toString()],
      publicSignals: [
        proof.publicSignals[0].toString(),
        proof.publicSignals[1].toString(),
        proof.publicSignals[2].toString(),
        proof.publicSignals[3].toString(),
      ],
    };

    await prisma.proofTransfer.update({
      where: { id },
      data: { proof: proofData },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to upload proof:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload proof",
    };
  }
}

/**
 * Fetch a proof by UUID
 * Called by the transaction device (polling)
 */
export async function fetchProof(id: string): Promise<{
  success: boolean;
  proof?: SolidityProof;
  error?: string;
}> {
  try {
    const transfer = await prisma.proofTransfer.findUnique({
      where: { id },
      select: { proof: true },
    });

    if (!transfer) {
      return { success: false, error: "Proof transfer not found" };
    }

    if (!transfer.proof) {
      return { success: false, error: "Proof not yet uploaded" };
    }

    // Convert string values back to BigInt
    const proofData = transfer.proof as {
      pA: [string, string];
      pB: [[string, string], [string, string]];
      pC: [string, string];
      publicSignals: [string, string, string, string];
    };

    const proof: SolidityProof = {
      pA: [BigInt(proofData.pA[0]), BigInt(proofData.pA[1])],
      pB: [
        [BigInt(proofData.pB[0][0]), BigInt(proofData.pB[0][1])],
        [BigInt(proofData.pB[1][0]), BigInt(proofData.pB[1][1])],
      ],
      pC: [BigInt(proofData.pC[0]), BigInt(proofData.pC[1])],
      publicSignals: [
        BigInt(proofData.publicSignals[0]),
        BigInt(proofData.publicSignals[1]),
        BigInt(proofData.publicSignals[2]),
        BigInt(proofData.publicSignals[3]),
      ],
    };

    return { success: true, proof };
  } catch (error) {
    console.error("Failed to fetch proof:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch proof",
    };
  }
}
