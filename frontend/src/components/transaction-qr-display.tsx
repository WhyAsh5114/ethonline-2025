"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Address } from "viem";

interface TransactionQRDisplayProps {
  txRequest: {
    walletAddress: Address;
    to: Address;
    value: bigint;
    data: `0x${string}`;
    nonce: bigint;
    commitment: bigint;
    transferId?: string;
  };
}

export function TransactionQRDisplay({ txRequest }: TransactionQRDisplayProps) {
  const qrData = JSON.stringify({
    walletAddress: txRequest.walletAddress,
    to: txRequest.to,
    value: txRequest.value.toString(),
    data: txRequest.data,
    nonce: txRequest.nonce.toString(),
    commitment: txRequest.commitment.toString(),
    transferId: txRequest.transferId, // Include transfer ID if present
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-lg border border-border bg-white p-6">
        <QRCodeSVG value={qrData} size={280} level="M" includeMargin />
      </div>

      <div className="w-full space-y-2 rounded-lg border border-border bg-muted/50 p-4 text-sm">
        <p className="font-semibold">Transaction Details:</p>
        <div className="space-y-1 font-mono text-xs">
          <p>
            <span className="text-muted-foreground">Wallet:</span>{" "}
            {txRequest.walletAddress.slice(0, 10)}...
            {txRequest.walletAddress.slice(-8)}
          </p>
          <p>
            <span className="text-muted-foreground">To:</span>{" "}
            {txRequest.to.slice(0, 10)}...{txRequest.to.slice(-8)}
          </p>
          <p>
            <span className="text-muted-foreground">Value:</span>{" "}
            {txRequest.value.toString()} wei
          </p>
          <p>
            <span className="text-muted-foreground">Nonce:</span>{" "}
            {txRequest.nonce.toString()}
          </p>
          <p>
            <span className="text-muted-foreground">Commitment:</span>{" "}
            {txRequest.commitment.toString().slice(0, 20)}...
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Scan this with your authenticator device to generate a proof
      </p>
    </div>
  );
}
