import { api as mockApi } from './mockApi';
import { Inventory, InventoryFilterOptions, PO, PR, PRStatus, Supplier, TxnType, StockTxn } from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const USE_REMOTE = Boolean(BASE_URL);

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      msg = body?.message || body?.Message || msg;
    } catch {
      // no-op
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
};

const toFrontendInventory = (item: any): Inventory => ({
  id: item.id,
  building: item.building,
  room: item.room,
  tagNo: item.tagNo,
  installationType: item.installationType,
  systemType: item.systemType,
  brand: item.brand,
  equipmentModel: item.equipmentModel,
  partCategory: item.partCategory,
  partName: item.partName,
  partModel: item.partModel,
  unit: item.unit || 'pcs',
  status: item.status,
  criticality: item.criticality,
  image: item.imageBase64,
  specs: item.specs,
  warrantyExpiry: item.warrantyExpiry,
  remark: item.remark,
  minStock: item.minStock ?? 1,
  reorderPoint: item.reorderPoint,
  reorderQty: item.reorderQty,
  preferredSupplierId: item.preferredSupplierId,
  locationBin: item.locationBin,
  quantityOnHand: item.quantityOnHand ?? 0,
  lastUpdated: item.lastUpdated || new Date().toISOString(),
  rowVersion: String(item.rowVersion || '1'),
});

const toBackendInventory = (item: Partial<Inventory>) => ({
  id: item.id,
  building: item.building,
  room: item.room,
  tagNo: item.tagNo,
  installationType: item.installationType,
  systemType: item.systemType,
  brand: item.brand,
  equipmentModel: item.equipmentModel,
  partCategory: item.partCategory,
  partName: item.partName,
  partModel: item.partModel,
  unit: item.unit,
  status: item.status,
  criticality: item.criticality,
  imageBase64: item.image,
  specs: item.specs,
  warrantyExpiry: item.warrantyExpiry || null,
  remark: item.remark,
  minStock: item.minStock,
  reorderPoint: item.reorderPoint,
  reorderQty: item.reorderQty,
  preferredSupplierId: item.preferredSupplierId,
  locationBin: item.locationBin,
  quantityOnHand: item.quantityOnHand,
});

const toFrontendSupplier = (s: any): Supplier => ({
  id: s.id,
  name: s.name,
  email: s.email || '',
  phone: s.phone || '',
  address: s.address || '',
  remark: s.remark || '',
  active: s.isActive ?? true,
});

const toBackendSupplier = (s: Partial<Supplier>) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  address: s.address,
  remark: s.remark,
  isActive: s.active,
});

export const api = {
  getInventory: async (options: InventoryFilterOptions = {}) => {
    if (!USE_REMOTE) return mockApi.getInventory(options);
    const query = new URLSearchParams();
    if (options.search) query.set('search', options.search);
    if (options.building) query.set('building', options.building);
    if (options.category) query.set('category', options.category);
    const res = await request<ApiResponse<any[]>>(`/api/inventory?${query.toString()}`);
    return (res.data || []).map(toFrontendInventory);
  },

  getLowStock: async () => {
    const items = await api.getInventory();
    return items.filter(i => i.quantityOnHand <= (i.reorderPoint || i.minStock)).length;
  },

  saveInventory: async (item: Partial<Inventory>) => {
    if (!USE_REMOTE) return mockApi.saveInventory(item);
    const payload = toBackendInventory(item);
    if (item.id) {
      await request(`/api/inventory/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(`/api/inventory`, { method: 'POST', body: JSON.stringify(payload) });
    }
    return item;
  },

  bulkUpdateInventory: async (ids: string[], updates: Partial<Inventory>) => {
    if (!USE_REMOTE) return mockApi.bulkUpdateInventory(ids, updates);
    const current = await api.getInventory();
    await Promise.all(ids.map(async (id) => {
      const existing = current.find(i => i.id === id);
      if (!existing) return;
      await api.saveInventory({ ...existing, ...updates, id });
    }));
    return true;
  },

  deleteInventory: async (id: string) => {
    if (!USE_REMOTE) return mockApi.deleteInventory(id);
    await request(`/api/inventory/${id}`, { method: 'DELETE' });
    return true;
  },

  bulkDeleteInventory: async (ids: string[]) => {
    if (!USE_REMOTE) return mockApi.bulkDeleteInventory(ids);
    await Promise.all(ids.map(id => api.deleteInventory(id)));
    return true;
  },

  createTransaction: async (txn: any) => {
    if (!USE_REMOTE) return mockApi.createTransaction(txn);
    return request(`/api/transactions`, { method: 'POST', body: JSON.stringify(txn) });
  },

  updateTransaction: async (txnId: string, updates: Partial<StockTxn>) => {
    if (!USE_REMOTE) return mockApi.updateTransaction(txnId, updates);
    return request(`/api/transactions/${txnId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: txnId }),
    });
  },

  deleteTransaction: async (txnId: string) => {
    if (!USE_REMOTE) return mockApi.deleteTransaction(txnId);
    await request(`/api/transactions/${txnId}`, { method: 'DELETE' });
    return true;
  },

  getTransactions: async () => {
    if (!USE_REMOTE) return mockApi.getTransactions();
    return request<StockTxn[]>(`/api/transactions`);
  },

  getPRs: async () => {
    if (!USE_REMOTE) return mockApi.getPRs();
    return request<PR[]>(`/api/purchasing/pr`);
  },

  createPR: async (pr: any) => {
    if (!USE_REMOTE) return mockApi.createPR(pr);
    return request<PR>(`/api/purchasing/pr`, { method: 'POST', body: JSON.stringify(pr) });
  },

  updatePRStatus: async (id: string, status: PRStatus) => {
    if (!USE_REMOTE) return mockApi.updatePRStatus(id, status);
    if (status === PRStatus.APPROVED) {
      await request(`/api/purchasing/pr/${id}/approve`, { method: 'POST' });
      return true;
    }
    // For non-approve flows not yet supported on backend, fallback to no-op success.
    return true;
  },

  createPOFromPR: async (prId: string) => {
    if (!USE_REMOTE) return mockApi.createPOFromPR(prId);
    return request<PO>(`/api/purchasing/pr/${prId}/convert-to-po`, { method: 'POST' });
  },

  getPOs: async () => {
    if (!USE_REMOTE) return mockApi.getPOs();
    return request<PO[]>(`/api/purchasing/po`);
  },

  receivePO: async (poId: string, lines: any[]) => {
    if (!USE_REMOTE) return mockApi.receivePO(poId, lines);
    const payload = lines.map(l => ({
      inventoryId: l.inventoryId,
      qtyReceived: l.qtyReceived || l.qty || 0,
      unitCost: l.unitCost ?? null,
    }));
    await request(`/api/purchasing/po/${poId}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return true;
  },

  getSuppliers: async () => {
    if (!USE_REMOTE) return mockApi.getSuppliers();
    const data = await request<any[]>(`/api/suppliers`);
    return data.map(toFrontendSupplier);
  },

  saveSupplier: async (supp: Partial<Supplier>) => {
    if (!USE_REMOTE) return mockApi.saveSupplier(supp);
    const payload = toBackendSupplier(supp);
    if (supp.id) {
      await request(`/api/suppliers/${supp.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(`/api/suppliers`, { method: 'POST', body: JSON.stringify(payload) });
    }
    return supp;
  },

  bulkUpdateSuppliers: async (ids: string[], updates: Partial<Supplier>) => {
    if (!USE_REMOTE) return mockApi.bulkUpdateSuppliers(ids, updates);
    const current = await api.getSuppliers();
    await Promise.all(ids.map(async (id) => {
      const existing = current.find(s => s.id === id);
      if (!existing) return;
      await api.saveSupplier({ ...existing, ...updates, id });
    }));
    return true;
  },

  getSummary: async () => {
    if (!USE_REMOTE) return mockApi.getSummary();
    return request(`/api/dashboard/summary`);
  },

  getReorderSuggestions: async () => {
    if (!USE_REMOTE) return mockApi.getReorderSuggestions();
    const inventory = await api.getInventory();
    return inventory
      .filter(i => i.quantityOnHand <= (i.reorderPoint || i.minStock))
      .map(i => ({
        inventoryId: i.id,
        partName: i.partName,
        building: i.building,
        quantityOnHand: i.quantityOnHand,
        reorderPoint: i.reorderPoint || i.minStock,
        suggestedQty: i.reorderQty || ((i.reorderPoint || i.minStock) - i.quantityOnHand + 5),
        preferredSupplierId: i.preferredSupplierId,
      }));
  },
};
