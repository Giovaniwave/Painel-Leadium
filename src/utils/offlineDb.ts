/**
 * Offline IndexedDB Database Manager for Leadium CRM
 * Handles storage of transactions, budget goals, settings, and clients
 * to enable a completely offline mode with automatic background synchronization.
 */

const DB_NAME = 'leadiumfy_offline_db';
const DB_VERSION = 1;

export interface SyncItem {
  id: string;
  store: 'transactions' | 'budgetGoals' | 'revenueGoal' | 'clients';
  action: 'update';
  data: any;
  timestamp: number;
}

export class OfflineDb {
  private static db: IDBDatabase | null = null;

  static async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Store for transactions
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }
        
        // Store for budget goals
        if (!db.objectStoreNames.contains('budgetGoals')) {
          db.createObjectStore('budgetGoals', { keyPath: 'id' });
        }
        
        // Store for clients
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        
        // Store for metadata / config settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Store for synchronization queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB opening error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- Transactions ---
  static async saveTransactions(txs: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      
      // Clear current store to avoid stale deleted entries
      store.clear();
      
      txs.forEach(item => {
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getTransactions(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Budget Goals ---
  static async saveBudgetGoals(goals: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('budgetGoals', 'readwrite');
      const store = tx.objectStore('budgetGoals');
      
      store.clear();
      goals.forEach(item => {
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getBudgetGoals(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('budgetGoals', 'readonly');
      const store = tx.objectStore('budgetGoals');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Clients ---
  static async saveClients(clients: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('clients', 'readwrite');
      const store = tx.objectStore('clients');
      
      store.clear();
      clients.forEach(item => {
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getClients(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('clients', 'readonly');
      const store = tx.objectStore('clients');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Revenue Goal Setting ---
  static async saveRevenueGoal(val: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'revenueGoal', value: val });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getRevenueGoal(): Promise<number | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('revenueGoal');

      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sync Queue Operations ---
  static async queueSync(storeName: 'transactions' | 'budgetGoals' | 'revenueGoal' | 'clients', data: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      
      const syncItem: SyncItem = {
        id: storeName, // Overwrite same store sync queue items to send the latest state
        store: storeName,
        action: 'update',
        data: data,
        timestamp: Date.now()
      };

      store.put(syncItem);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getSyncQueue(): Promise<SyncItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  static async removeSyncItem(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
