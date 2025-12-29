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
  departmentId?: number;
  companyId?: number;
  name: string;
  description?: string;
  color: string;
  status: 'active' | 'inactive';
  createdAt: string;
  perimeters?: Perimeter[];
}

export interface Perimeter {
  id: number;
  fenceId: number;
  name?: string;
  type: 'polygon' | 'circle';
  coordinates?: number[][]; // Para polígonos: [[lat, lng], ...]
  center?: [number, number]; // Para círculos: [lat, lng]
  radius?: number; // Em metros, para círculos
  createdAt: string;
}

export interface GeofencePin {
  id: number;
  fenceId: number;
  responsibleId?: number;
  name: string;
  coordinates: [number, number];
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  dueDate?: string;
  actionType?: string;
  createdAt: string;
}

export interface Rule {
  id: number;
  fenceId: number;
  name: string;
  condition: 'enter' | 'exit' | 'inside' | 'outside';
  action: 'notify' | 'alert' | 'block' | 'custom';
  actionConfig?: any;
  isDefault?: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  value: any;
}

const API_URL = 'http://localhost:3000/api';

class DatabaseService {
  
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    // Handle 204 No Content
    if (response.status === 204) return {} as T;
    return response.json();
  }

  // --- Settings ---
  async getSettings(id: string): Promise<AppSettings | undefined> {
    try {
      return await this.fetch<AppSettings>(`/settings/${id}`);
    } catch (e) {
      return undefined;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    // Check if exists, update or create
    try {
        await this.fetch(`/settings/${settings.id}`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    } catch {
        await this.fetch(`/settings`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    }
  }

  // --- Companies ---
  async getCompanies() { return this.fetch<Company[]>('/companies'); }
  async addCompany(item: Omit<Company, 'id'>) { 
      const res = await this.fetch<Company>('/companies', { method: 'POST', body: JSON.stringify(item) });
      return res.id;
  }
  async deleteCompany(id: number) { await this.fetch(`/companies/${id}`, { method: 'DELETE' }); }

  // --- Branches ---
  async getBranches() { return this.fetch<Branch[]>('/branches'); }
  async getBranchesByCompany(companyId: number) { return this.fetch<Branch[]>(`/branches?companyId=${companyId}`); }
  async addBranch(item: Omit<Branch, 'id'>) { 
      const res = await this.fetch<Branch>('/branches', { method: 'POST', body: JSON.stringify(item) });
      return res.id;
  }

  // --- Departments ---
  async getDepartmentsByBranch(branchId: number) { return this.fetch<Department[]>(`/departments?branchId=${branchId}`); }
  async addDepartment(item: Omit<Department, 'id'>) {
      const res = await this.fetch<Department>('/departments', { method: 'POST', body: JSON.stringify(item) });
      return res.id;
  }

  // --- People ---
  async getPeopleByDepartment(departmentId: number) { return this.fetch<Person[]>(`/people?departmentId=${departmentId}`); }
  async addPerson(item: Omit<Person, 'id'>) {
      const res = await this.fetch<Person>('/people', { method: 'POST', body: JSON.stringify(item) });
      return res.id;
  }

  // --- Geofences ---
  async getFences(): Promise<Geofence[]> {
      return this.fetch<Geofence[]>('/geofences');
  }
  
  async addFence(fence: Omit<Geofence, 'id'>): Promise<number> {
      const res = await this.fetch<Geofence>('/geofences', { method: 'POST', body: JSON.stringify(fence) });
      return res.id;
  }
  
  async updateFence(fence: Geofence): Promise<void> {
      await this.fetch(`/geofences/${fence.id}`, { method: 'PUT', body: JSON.stringify(fence) });
  }
  
  async deleteFence(id: number): Promise<void> {
      await this.fetch(`/geofences/${id}`, { method: 'DELETE' });
  }

  // --- Perimeters ---
  async getAllPerimeters(): Promise<Perimeter[]> {
      return this.fetch<Perimeter[]>('/perimeters');
  }

  async getPerimetersByFence(fenceId: number): Promise<Perimeter[]> {
      return this.fetch<Perimeter[]>(`/perimeters?fenceId=${fenceId}`);
  }
  
  async addPerimeter(perimeter: Omit<Perimeter, 'id'>): Promise<number> {
      // Use the specific endpoint if we want, or generic
      const res = await this.fetch<Perimeter>('/perimeters', { method: 'POST', body: JSON.stringify(perimeter) });
      return res.id;
  }

  async updatePerimeter(perimeter: Perimeter): Promise<void> {
      await this.fetch(`/perimeters/${perimeter.id}`, { method: 'PUT', body: JSON.stringify(perimeter) });
  }
  
  async deletePerimeter(id: number): Promise<void> {
      await this.fetch(`/perimeters/${id}`, { method: 'DELETE' });
  }

  // --- Rules ---
  async getRules() { return this.fetch<Rule[]>('/rules'); }
  async getRulesByFence(fenceId: number) { return this.fetch<Rule[]>(`/rules?fenceId=${fenceId}`); }
  async addRule(rule: Omit<Rule, 'id'>) { 
      const res = await this.fetch<Rule>('/rules', { method: 'POST', body: JSON.stringify(rule) });
      return res.id;
  }
  async updateRule(rule: Rule) { await this.fetch(`/rules/${rule.id}`, { method: 'PUT', body: JSON.stringify(rule) }); }
  async deleteRule(id: number) { await this.fetch(`/rules/${id}`, { method: 'DELETE' }); }

  // --- Pins ---
  async getAllPins(): Promise<GeofencePin[]> {
      return this.fetch<GeofencePin[]>('/geofence_pins');
  }

  async getPinsByFence(fenceId: number): Promise<GeofencePin[]> {
      return this.fetch<GeofencePin[]>(`/geofence_pins?fenceId=${fenceId}`);
  }
  async addPin(pin: Omit<GeofencePin, 'id'>) { 
      const res = await this.fetch<GeofencePin>('/geofence_pins', { method: 'POST', body: JSON.stringify(pin) });
      return res.id;
  }
  async deletePin(id: number) { await this.fetch(`/geofence_pins/${id}`, { method: 'DELETE' }); }

  // --- Data Management (Not supported via API in this version) ---
  async clearDatabase(): Promise<void> {
    console.warn('clearDatabase not supported in API mode');
  }

  async exportDatabase(): Promise<any> {
    console.warn('exportDatabase not supported in API mode');
    return {};
  }

  async importDatabase(data: any): Promise<void> {
    console.warn('importDatabase not supported in API mode');
  }
}

export const dbService = new DatabaseService();
export { DatabaseService };
