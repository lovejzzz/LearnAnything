import type { BrowserStorage } from "@learn-anything/project-store";

export class IndexedDbStorage implements BrowserStorage {
  private readonly database: Promise<IDBDatabase>;

  constructor(databaseName = "learn-anything", private readonly storeName = "projects") {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
    });
  }

  async get(key: string): Promise<string | undefined> {
    return this.request<string | undefined>("readonly", (store) => store.get(key));
  }

  async set(key: string, value: string): Promise<void> {
    await this.request("readwrite", (store) => store.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.request("readwrite", (store) => store.delete(key));
  }

  private async request<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const database = await this.database;
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, mode);
      const request = operation(transaction.objectStore(this.storeName));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB operation failed"));
    });
  }
}
