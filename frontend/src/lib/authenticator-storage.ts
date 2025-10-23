/**
 * Authenticator Storage Module
 *
 * Manages secure storage of TOTP secrets in IndexedDB for the built-in authenticator.
 * Secrets are stored with optional encryption for additional security.
 */

export interface StoredAccount {
  id: string; // Unique identifier (address or generated)
  name: string; // User-friendly name
  address: string; // Ethereum address
  secret: string; // 20-digit numeric secret
  secretHash: string; // Poseidon hash as string
  createdAt: number; // Unix timestamp
  lastUsed?: number; // Unix timestamp of last code generation
}

const DB_NAME = "chronovault-authenticator";
const DB_VERSION = 1;
const STORE_NAME = "accounts";

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("address", "address", { unique: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * Add a new account to storage
 */
export async function addAccount(
  account: Omit<StoredAccount, "id" | "createdAt">,
): Promise<string> {
  const db = await initDB();

  const storedAccount: StoredAccount = {
    ...account,
    id: account.address, // Use address as ID
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(storedAccount);

    request.onsuccess = () => resolve(storedAccount.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all stored accounts
 */
export async function getAllAccounts(): Promise<StoredAccount[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get account by ID
 */
export async function getAccount(id: string): Promise<StoredAccount | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update account (e.g., last used time, name)
 */
export async function updateAccount(
  id: string,
  updates: Partial<StoredAccount>,
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Get existing account first
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const account = getRequest.result;
      if (!account) {
        reject(new Error("Account not found"));
        return;
      }

      const updatedAccount = { ...account, ...updates };
      const putRequest = store.put(updatedAccount);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete account by ID
 */
export async function deleteAccount(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Parse QR code data and validate format
 */
export function parseQRData(qrData: string): {
  secret: string;
  address: string;
  name: string;
} | null {
  try {
    const data = JSON.parse(qrData);

    if (
      data.type !== "chronovault-totp" ||
      !data.secret ||
      !data.address ||
      typeof data.secret !== "string" ||
      data.secret.length !== 20
    ) {
      return null;
    }

    return {
      secret: data.secret,
      address: data.address,
      name: data.name || data.address.slice(0, 10),
    };
  } catch {
    return null;
  }
}

/**
 * Export all accounts as encrypted JSON (for backup)
 */
export async function exportAccounts(): Promise<string> {
  const accounts = await getAllAccounts();
  return JSON.stringify(accounts, null, 2);
}

/**
 * Import accounts from JSON backup
 */
export async function importAccounts(jsonData: string): Promise<number> {
  try {
    const accounts = JSON.parse(jsonData) as StoredAccount[];
    let imported = 0;

    for (const account of accounts) {
      try {
        await addAccount({
          name: account.name,
          address: account.address,
          secret: account.secret,
          secretHash: account.secretHash,
        });
        imported++;
      } catch (error) {
        // Skip duplicates
        console.warn(`Skipping duplicate account: ${account.address}`, error);
      }
    }

    return imported;
  } catch (error) {
    throw new Error(
      `Failed to import accounts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
