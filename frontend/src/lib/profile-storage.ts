import type { Address } from "viem";

/**
 * Profile data stored in localStorage
 * NOTE: Only stores PUBLIC data - no secrets!
 */
export interface ProfileData {
  walletAddress: Address | null;
  secretHash: string | null; // Stored as hex string
  ownerAddress: Address | null;
  lastUpdated: number;
}

const STORAGE_KEY = "chronovault_profile";

/**
 * Get profile data from localStorage
 */
export function getProfile(): ProfileData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const profile = JSON.parse(stored) as ProfileData;
    return profile;
  } catch (error) {
    console.error("Failed to load profile from localStorage:", error);
    return null;
  }
}

/**
 * Save profile data to localStorage
 */
export function saveProfile(profile: Partial<ProfileData>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getProfile() || {
      walletAddress: null,
      secretHash: null,
      ownerAddress: null,
      lastUpdated: Date.now(),
    };

    const updated: ProfileData = {
      ...current,
      ...profile,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save profile to localStorage:", error);
  }
}

/**
 * Clear profile data from localStorage
 */
export function clearProfile(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear profile from localStorage:", error);
  }
}

/**
 * Update specific profile fields
 */
export function updateProfile(updates: Partial<ProfileData>): void {
  saveProfile(updates);
}
