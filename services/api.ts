import { Inventory, InventoryFilterOptions, PO, PR, PRStatus, Supplier, TxnType, StockTxn, OrderSchedule, ScheduleStatus } from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
if (!BASE_URL) {
  throw new Error('Missing VITE_API_BASE_URL. Configure frontend .env.local to use backend API.');
}

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

const normalizeText = (value: any, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toFrontendInventory = (item: any): Inventory => ({
  id: item.id,
  building: normalizeText(item.building),
  room: normalizeText(item.room),
  tagNo: normalizeText(item.tagNo),
  installationType: normalizeText(item.installationType),
  systemType: normalizeText(item.systemType),
  brand: normalizeText(item.brand),
  equipmentModel: normalizeText(item.equipmentModel),
  partCategory: normalizeText(item.partCategory),
  partName: normalizeText(item.partName),
  partModel: normalizeText(item.partModel),
  unit: normalizeText(item.unit, 'pcs'),
  status: item.status,
  criticality: item.criticality,
  image: normalizeText(item.imageBase64),
  specs: normalizeText(item.specs),
  warrantyExpiry: item.warrantyExpiry,
  remark: normalizeText(item.remark),
  minStock: item.minStock ?? 1,
  reorderPoint: item.reorderPoint,
  reorderQty: item.reorderQty,
  preferredSupplierId: normalizeText(item.preferredSupplierId),
  locationBin: normalizeText(item.locationBin),
  quantityOnHand: item.quantityOnHand ?? 0,
  lastUpdated: item.lastUpdated || new Date().toISOString(),
  rowVersion: typeof item.rowVersion === 'string' ? item.rowVersion : '',
});

const toBackendInventory = (item: Partial<Inventory>) => ({
  id: item.id,
  building: normalizeText(item.building),
  room: normalizeText(item.room),
  tagNo: normalizeText(item.tagNo),
  installationType: normalizeText(item.installationType),
  systemType: normalizeText(item.systemType),
  brand: normalizeText(item.brand),
  equipmentModel: normalizeText(item.equipmentModel),
  partCategory: normalizeText(item.partCategory),
  partName: normalizeText(item.partName),
  partModel: normalizeText(item.partModel),
  unit: normalizeText(item.unit, 'pcs'),
  status: item.status,
  criticality: item.criticality,
  imageBase64: normalizeText(item.image),
  specs: normalizeText(item.specs),
  warrantyExpiry: item.warrantyExpiry || null,
  remark: normalizeText(item.remark),
  minStock: item.minStock ?? 1,
  reorderPoint: item.reorderPoint,
  reorderQty: item.reorderQty,
  preferredSupplierId: normalizeText(item.preferredSupplierId),
  locationBin: normalizeText(item.locationBin),
  quantityOnHand: item.quantityOnHand ?? 0,
  rowVersion: item.rowVersion || undefined,
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
  name: normalizeText(s.name),
  email: normalizeText(s.email),
  phone: normalizeText(s.phone),
  address: normalizeText(s.address),
  remark: normalizeText(s.remark),
  isActive: s.active,
});

export const api = {
  getInventory: async (options: InventoryFilterOptions = {}) => {
    const query = new URLSearchParams();
    if (options.search) query.set('search', options.search);
    if (options.building) query.set('building', options.building);
    if (options.category) query.set('category', options.category);
    const path = query.toString() ? `/api/inventory?${query.toString()}` : '/api/inventory';
    const res = await request<ApiResponse<any[]>>(path);
    return (res.data || []).map(toFrontendInventory);
  },

  getLowStock: async () => {
    const items = await api.getInventory();
    return items.filter(i => i.quantityOnHand <= (i.reorderPoint || i.minStock)).length;
  },

  saveInventory: async (item: Partial<Inventory>) => {
    const payload = toBackendInventory(item);
    if (item.id) {
      await request(`/api/inventory/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(`/api/inventory`, { method: 'POST', body: JSON.stringify(payload) });
    }
    return item;
  },

  bulkUpdateInventory: async (ids: string[], updates: Partial<Inventory>) => {
    const current = await api.getInventory();
    await Promise.all(ids.map(async (id) => {
      const existing = current.find(i => i.id === id);
      if (!existing) return;
      await api.saveInventory({ ...existing, ...updates, id });
    }));
    return true;
  },

  deleteInventory: async (id: string) => {
    await request(`/api/inventory/${id}`, { method: 'DELETE' });
    return true;
  },

  bulkDeleteInventory: async (ids: string[]) => {
    await Promise.all(ids.map(id => api.deleteInventory(id)));
    return true;
  },

  createTransaction: async (txn: any) => {
    return request(`/api/transactions`, { method: 'POST', body: JSON.stringify(txn) });
  },

  updateTransaction: async (txnId: string, updates: Partial<StockTxn>) => {
    return request(`/api/transactions/${txnId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: txnId }),
    });
  },

  deleteTransaction: async (txnId: string) => {
    await request(`/api/transactions/${txnId}`, { method: 'DELETE' });
    return true;
  },

  getTransactions: async () => {
    return request<StockTxn[]>(`/api/transactions`);
  },

  getPRs: async () => {
    return request<PR[]>(`/api/purchasing/pr`);
  },

  createPR: async (pr: any) => {
    return request<PR>(`/api/purchasing/pr`, { method: 'POST', body: JSON.stringify(pr) });
  },

  updatePRStatus: async (id: string, status: PRStatus) => {
    if (status === PRStatus.APPROVED) {
      await request(`/api/purchasing/pr/${id}/approve`, { method: 'POST' });
      return true;
    }
    // For non-approve flows not yet supported on backend, fallback to no-op success.
    return true;
  },

  createPOFromPR: async (prId: string) => {
    return request<PO>(`/api/purchasing/pr/${prId}/convert-to-po`, { method: 'POST' });
  },

  getPOs: async () => {
    return request<PO[]>(`/api/purchasing/po`);
  },

  receivePO: async (poId: string, lines: any[]) => {
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
    const data = await request<any[]>(`/api/suppliers`);
    return data.map(toFrontendSupplier);
  },

  saveSupplier: async (supp: Partial<Supplier>) => {
    const payload = toBackendSupplier(supp);
    if (supp.id) {
      await request(`/api/suppliers/${supp.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(`/api/suppliers`, { method: 'POST', body: JSON.stringify(payload) });
    }
    return supp;
  },

  bulkUpdateSuppliers: async (ids: string[], updates: Partial<Supplier>) => {
    const current = await api.getSuppliers();
    await Promise.all(ids.map(async (id) => {
      const existing = current.find(s => s.id === id);
      if (!existing) return;
      await api.saveSupplier({ ...existing, ...updates, id });
    }));
    return true;
  },

  getSummary: async () => {
    return request(`/api/dashboard/summary`);
  },

  getReorderSuggestions: async () => {
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

  getOrderSchedules: async () => {
    return request<OrderSchedule[]>(`/api/orderschedules`);
  },

  createOrderSchedule: async (schedule: Partial<OrderSchedule>) => {
    return request<OrderSchedule>(`/api/orderschedules`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  },

  updateOrderScheduleStatus: async (id: string, status: ScheduleStatus) => {
    await request(`/api/orderschedules/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
    return true;
  },

  deleteOrderSchedule: async (id: string) => {
    await request(`/api/orderschedules/${id}`, { method: 'DELETE' });
    return true;
  },
};
