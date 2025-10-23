"use client";

import { useCallback, useState } from "react";
import { generateTOTPSecret, type TOTPSecret } from "@/lib/totp";

export function useTOTPSetup() {
  const [totpSecret, setTotpSecret] = useState<TOTPSecret | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSecret = useCallback(async (accountAddress: string) => {
    setIsGenerating(true);
    try {
      const secret = await generateTOTPSecret(accountAddress);
      setTotpSecret(secret);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("totp_secret", secret.secret);
        sessionStorage.setItem(
          "totp_secret_hash",
          secret.secretHash.toString(),
        );
        sessionStorage.setItem("totp_qr_data", secret.qrData);
      }
      return secret;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearSecret = useCallback(() => {
    setTotpSecret(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("totp_secret");
      sessionStorage.removeItem("totp_secret_hash");
    }
  }, []);

  const loadStoredSecret = useCallback(async () => {
    if (typeof window !== "undefined") {
      const storedSecret = sessionStorage.getItem("totp_secret");
      const storedHash = sessionStorage.getItem("totp_secret_hash");
      const storedQrData = sessionStorage.getItem("totp_qr_data");

      if (storedSecret && storedHash && storedQrData) {
        setTotpSecret({
          secret: storedSecret,
          secretHash: BigInt(storedHash),
          qrData: storedQrData,
        });
      }
    }
  }, []);

  return {
    totpSecret,
    isGenerating,
    generateSecret,
    clearSecret,
    loadStoredSecret,
  };
}
