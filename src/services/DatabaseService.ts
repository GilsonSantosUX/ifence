import { openDB } from 'idb';

// --- Entidades Organizacionais ---

export interface Company {
  id: number;
  name: string;
  cnpj?: string;
  address?: string;
  contact?: string;
  createdAt: string;
}

export interface Branch {
  id: number;
  companyId: number;
  name: string;
  address?: string;
  createdAt: string;
}

export interface Department {
  id: number;
  branchId: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Person {
  id: number;
  departmentId: number;
  name: string;
  email?: string;
  role: string; // 'admin', 'manager', 'viewer', etc.
  createdAt: string;
}

// --- Entidades de Geofencing ---

export interface Geofence {
  id: number;
  departmentId?: number; // Opcional, se não usar hierarquia completa ainda
  companyId?: number; // Adicionado para vincular à organização
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  // Perímetros são buscados separadamente ou podem ser incluídos na UI
}

export interface Perimeter {
  id: number;
  fenceId: number;
  type: 'polygon' | 'circle';
  coordinates?: number[][]; // Para polígonos: [[lat, lng], ...]
  center?: [number, number]; // Para círculos: [lat, lng]
  radius?: number; // Em metros, para círculos
  createdAt: string;
}

export interface GeofencePin {
  id: number;
  fenceId: number;
  responsibleId?: number; // Person ID
  name: string;
  coordinates: [number, number];
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  dueDate?: string;
  actionType?: string;
  createdAt: string;
}

// Interface antiga mantida para compatibilidade durante migração, se necessário, 
// mas o ideal é atualizar o código para usar Geofence + Perimeter.
// Vamos redefinir Rule para apontar para Geofence
export interface Rule {
  id: number;
  fenceId: number;
  name: string;
  condition: 'enter' | 'exit' | 'inside' | 'outside';
  action: 'notify' | 'alert' | 'block' | 'custom';
  actionConfig?: any; // Configuração extra da ação
  isDefault?: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: string; // 'mapbox' | 'general' etc.
  value: any;
}

class DatabaseService {
  private dbPromise: Promise<any>;

  constructor() {
    this.dbPromise = openDB('ifence-db', 3, { // Versão 3
      upgrade(db, oldVersion) {
        // --- Versão 1 (Legado) ---
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('fences')) {
            const fenceStore = db.createObjectStore('fences', { keyPath: 'id' });
            fenceStore.createIndex('name', 'name', { unique: false });
            fenceStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('rules')) {
            const ruleStore = db.createObjectStore('rules', { keyPath: 'id' });
            ruleStore.createIndex('fenceId', 'fenceId', { unique: false });
          }
        }

        // --- Versão 2 (PRD Completo) ---
        if (oldVersion < 2) {
            // Organizacional
            if (!db.objectStoreNames.contains('companies')) {
                db.createObjectStore('companies', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('branches')) {
                const store = db.createObjectStore('branches', { keyPath: 'id' });
                store.createIndex('companyId', 'companyId');
            }
            if (!db.objectStoreNames.contains('departments')) {
                const store = db.createObjectStore('departments', { keyPath: 'id' });
                store.createIndex('branchId', 'branchId');
            }
            if (!db.objectStoreNames.contains('people')) {
                const store = db.createObjectStore('people', { keyPath: 'id' });
                store.createIndex('departmentId', 'departmentId');
            }

            // Geofencing (Novas estruturas)
            if (!db.objectStoreNames.contains('perimeters')) {
                const store = db.createObjectStore('perimeters', { keyPath: 'id' });
                store.createIndex('fenceId', 'fenceId');
            }
            if (!db.objectStoreNames.contains('geofence_pins')) {
                const store = db.createObjectStore('geofence_pins', { keyPath: 'id' });
                store.createIndex('fenceId', 'fenceId');
            }
        }
        
        // --- Versão 3 (Settings) ---
        if (oldVersion < 3) {
             if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'id' });
             }
        }
      },
    });
  }

  // --- Métodos Genéricos Auxiliares ---
  private async getAll<T>(storeName: string): Promise<T[]> {
      const db = await this.dbPromise;
      return db.getAll(storeName);
  }

  private async add<T>(storeName: string, item: T): Promise<number> {
      const db = await this.dbPromise;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      await db.add(storeName, { ...item, id });
      return id;
  }

  private async put<T>(storeName: string, item: T): Promise<void> {
      const db = await this.dbPromise;
      await db.put(storeName, item);
  }

  public async delete(storeName: string, id: number): Promise<void> {
      const db = await this.dbPromise;
      await db.delete(storeName, id);
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
      const db = await this.dbPromise;
      return db.getAllFromIndex(storeName, indexName, value);
  }

  // --- Settings ---
  async getSettings(id: string): Promise<AppSettings | undefined> {
    const db = await this.dbPromise;
    return db.get('settings', id);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.dbPromise;
    await db.put('settings', settings);
  }

  // --- Companies ---
  async getCompanies() { return this.getAll<Company>('companies'); }
  async addCompany(item: Omit<Company, 'id'>) { return this.add('companies', item); }

  // --- Branches ---
  async getBranches() { return this.getAll<Branch>('branches'); }
  async getBranchesByCompany(companyId: number) { return this.getByIndex<Branch>('branches', 'companyId', companyId); }
  async addBranch(item: Omit<Branch, 'id'>) { return this.add('branches', item); }

  // --- Geofences (Updated) ---
  // Mantemos compatibilidade com o nome 'Fence' se o resto do app usa, 
  // mas internamente tratamos como Geofence.
  async getFences(): Promise<Geofence[]> {
      // Nota: O app antigo espera 'coordinates' na Fence. 
      // Se formos refatorar o app, devemos mudar a interface lá.
      // Por enquanto retornamos Geofence puro.
      return this.getAll<Geofence>('fences');
  }
  
  async addFence(fence: Omit<Geofence, 'id'>): Promise<number> {
      return this.add('fences', fence);
  }
  
  async updateFence(fence: Geofence): Promise<void> {
      return this.put('fences', fence);
  }
  
  async deleteFence(id: number): Promise<void> {
      // Cascade delete perimeters/rules/pins?
      // Por simplicidade, deletamos apenas a cerca.
      return this.delete('fences', id);
  }

  // --- Perimeters ---
  async getAllPerimeters(): Promise<Perimeter[]> {
      return this.getAll<Perimeter>('perimeters');
  }

  async getPerimetersByFence(fenceId: number): Promise<Perimeter[]> {
      return this.getByIndex<Perimeter>('perimeters', 'fenceId', fenceId);
  }
  
  async addPerimeter(perimeter: Omit<Perimeter, 'id'>): Promise<number> {
      return this.add('perimeters', perimeter);
  }

  async updatePerimeter(perimeter: Perimeter): Promise<void> {
      return this.put('perimeters', perimeter);
  }
  
  async deletePerimeter(id: number): Promise<void> {
      return this.delete('perimeters', id);
  }

  // --- Rules ---
  async getRules() { return this.getAll<Rule>('rules'); }
  async getRulesByFence(fenceId: number) { return this.getByIndex<Rule>('rules', 'fenceId', fenceId); }
  async addRule(rule: Omit<Rule, 'id'>) { return this.add('rules', rule); }
  async updateRule(rule: Rule) { return this.put('rules', rule); }
  async deleteRule(id: number) { return this.delete('rules', id); }

  // --- Pins ---
  async getAllPins(): Promise<GeofencePin[]> {
      return this.getAll<GeofencePin>('geofence_pins');
  }

  async getPinsByFence(fenceId: number): Promise<GeofencePin[]> {
      return this.getByIndex<GeofencePin>('geofence_pins', 'fenceId', fenceId);
  }
  async addPin(pin: Omit<GeofencePin, 'id'>) { return this.add('geofence_pins', pin); }
  async deletePin(id: number) { return this.delete('geofence_pins', id); }
}

export const dbService = new DatabaseService();
export { DatabaseService };
