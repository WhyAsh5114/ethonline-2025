"use client";

import { useCallback, useState } from "react";
import { generateTOTPSecret, type TOTPSecret } from "@/lib/totp";

export function useTOTPSetup() {
  const [totpSecret, setTotpSecret] = useState<TOTPSecret | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSecret = useCallback((accountAddress: string) => {
    setIsGenerating(true);
    try {
      const secret = generateTOTPSecret(accountAddress);
      setTotpSecret(secret);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("totp_secret", secret.secret);
        sessionStorage.setItem(
          "totp_secret_hash",
          secret.secretHash.toString(),
        );
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

  const loadStoredSecret = useCallback(() => {
    if (typeof window !== "undefined") {
      const storedSecret = sessionStorage.getItem("totp_secret");
      const storedHash = sessionStorage.getItem("totp_secret_hash");

      if (storedSecret && storedHash) {
        const secret = generateTOTPSecret("");
        setTotpSecret({
          secret: storedSecret,
          uri: secret.uri,
          secretHash: BigInt(storedHash),
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
