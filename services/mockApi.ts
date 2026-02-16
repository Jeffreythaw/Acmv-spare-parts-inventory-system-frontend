
import { 
  Inventory, Supplier, StockTxn, PR, PO, 
  PRStatus, POStatus, InventoryFilterOptions, TxnType 
} from '../types';
import initialInventorySeed from '../data/initialInventory.json';

// Storage Keys
const KEYS = {
  INVENTORY: 'acmv_inventory',
  INVENTORY_SEED_VERSION: 'acmv_inventory_seed_version',
  SUPPLIERS: 'acmv_suppliers',
  TRANSACTIONS: 'acmv_transactions',
  PR: 'acmv_purchase_requests',
  PO: 'acmv_purchase_orders'
};

const INVENTORY_SEED_VERSION = 'xlsx-import-v1-2026-02-15';

// Seed Data
const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'supp-1', name: 'Cooling Systems Inc.', email: 'sales@coolingsys.com', phone: '+65 6777 1234', address: '12 Tech Park, Singapore', remark: 'Primary compressor vendor', active: true },
  { id: 'supp-2', name: 'Global HVAC Parts', email: 'orders@globalhvac.com', phone: '+65 6888 5678', address: '45 Industry Way, Singapore', remark: 'Specialist in thermostats', active: true }
];

const INITIAL_INVENTORY: Inventory[] = initialInventorySeed as Inventory[];

// Helper to get data from localStorage with seed fallback
const getData = <T>(key: string, initialData: T[] = []): T[] => {
  if (key === KEYS.INVENTORY) {
    const currentSeedVersion = localStorage.getItem(KEYS.INVENTORY_SEED_VERSION);
    if (currentSeedVersion !== INVENTORY_SEED_VERSION) {
      localStorage.setItem(KEYS.INVENTORY, JSON.stringify(initialData));
      localStorage.setItem(KEYS.INVENTORY_SEED_VERSION, INVENTORY_SEED_VERSION);
      return initialData;
    }
  }

  const saved = localStorage.getItem(key);
  if (!saved) {
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  }
  return JSON.parse(saved);
};

const saveData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Simulated Network Delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));
const getTxnDirection = (txnType: TxnType) => (txnType === TxnType.ISSUE ? -1 : 1);

export const api = {
  // Inventory
  getInventory: async (options: InventoryFilterOptions = {}) => {
    await delay();
    let items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    
    if (options.search) {
      const s = options.search.toLowerCase();
      items = items.filter(i => i.partName.toLowerCase().includes(s) || i.tagNo?.toLowerCase().includes(s));
    }
    if (options.building && options.building !== 'All Buildings') {
      items = items.filter(i => i.building === options.building);
    }
    if (options.category && options.category !== 'All Categories') {
      items = items.filter(i => i.partCategory === options.category);
    }
    if (options.status && options.status !== 'All Statuses') {
      items = items.filter(i => i.status === options.status);
    }
    
    return items;
  },

  getLowStock: async () => {
    const items = await api.getInventory();
    return items.filter(i => i.quantityOnHand <= (i.reorderPoint || i.minStock)).length;
  },

  saveInventory: async (item: Partial<Inventory>) => {
    await delay();
    const items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    if (item.id) {
      const idx = items.findIndex(i => i.id === item.id);
      if (idx > -1) {
        items[idx] = { ...items[idx], ...item, lastUpdated: new Date().toISOString() };
      }
    } else {
      const newItem = {
        ...item,
        id: `inv-${Date.now()}`,
        lastUpdated: new Date().toISOString(),
        rowVersion: '1'
      } as Inventory;
      items.push(newItem);
    }
    saveData(KEYS.INVENTORY, items);
    return item;
  },

  bulkUpdateInventory: async (ids: string[], updates: Partial<Inventory>) => {
    await delay();
    const items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const updated = items.map(item => ids.includes(item.id) ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item);
    saveData(KEYS.INVENTORY, updated);
    return true;
  },

  deleteInventory: async (id: string) => {
    await delay();
    const items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const filtered = items.filter(item => item.id !== id);
    saveData(KEYS.INVENTORY, filtered);
    return true;
  },

  bulkDeleteInventory: async (ids: string[]) => {
    await delay();
    const idSet = new Set(ids);
    const items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const filtered = items.filter(item => !idSet.has(item.id));
    saveData(KEYS.INVENTORY, filtered);
    return true;
  },

  // Stock Movements
  createTransaction: async (txn: any) => {
    await delay();
    const txns = getData<StockTxn>(KEYS.TRANSACTIONS);
    const inventory = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    
    const newTxn = {
      ...txn,
      id: `txn-${Date.now()}`,
      txnTime: new Date().toISOString(),
      reference: txn.reference || 'N/A',
      counterparty: txn.counterparty || 'Internal',
      remark: txn.remark || '',
    };
    
    // Process stock changes
    txn.lines.forEach((line: any) => {
      const invIdx = inventory.findIndex(i => i.id === line.inventoryId);
      if (invIdx > -1) {
        line.beforeQty = inventory[invIdx].quantityOnHand;
        const delta = getTxnDirection(txn.txnType) * line.qty;
        if (delta < 0 && Math.abs(delta) > inventory[invIdx].quantityOnHand) {
          throw new Error(`Insufficient stock for ${inventory[invIdx].partName}. Available: ${inventory[invIdx].quantityOnHand}`);
        }
        inventory[invIdx].quantityOnHand += delta;
        line.afterQty = inventory[invIdx].quantityOnHand;
        inventory[invIdx].lastUpdated = new Date().toISOString();
      }
    });

    txns.push(newTxn);
    saveData(KEYS.TRANSACTIONS, txns);
    saveData(KEYS.INVENTORY, inventory);
    return newTxn;
  },

  updateTransaction: async (txnId: string, updates: Partial<StockTxn>) => {
    await delay();
    const txns = getData<StockTxn>(KEYS.TRANSACTIONS);
    const inventory = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const txnIdx = txns.findIndex(t => t.id === txnId);
    if (txnIdx < 0) throw new Error('Transaction not found');

    const existing = txns[txnIdx];

    // Revert old transaction effect.
    existing.lines.forEach((line) => {
      const inv = inventory.find(i => i.id === line.inventoryId);
      if (!inv) return;
      const revertDelta = -1 * getTxnDirection(existing.txnType) * line.qty;
      inv.quantityOnHand += revertDelta;
      inv.lastUpdated = new Date().toISOString();
    });

    const nextTxn: StockTxn = {
      ...existing,
      ...updates,
      id: existing.id,
      txnTime: existing.txnTime,
      lines: (updates.lines as any) || existing.lines,
    };

    // Apply new transaction effect.
    nextTxn.lines.forEach((line: any) => {
      const inv = inventory.find(i => i.id === line.inventoryId);
      if (!inv) return;
      line.beforeQty = inv.quantityOnHand;
      const delta = getTxnDirection(nextTxn.txnType) * line.qty;
      if (delta < 0 && Math.abs(delta) > inv.quantityOnHand) {
        throw new Error(`Insufficient stock for ${inv.partName}. Available: ${inv.quantityOnHand}`);
      }
      inv.quantityOnHand += delta;
      line.afterQty = inv.quantityOnHand;
      inv.lastUpdated = new Date().toISOString();
    });

    txns[txnIdx] = nextTxn;
    saveData(KEYS.TRANSACTIONS, txns);
    saveData(KEYS.INVENTORY, inventory);
    return nextTxn;
  },

  deleteTransaction: async (txnId: string) => {
    await delay();
    const txns = getData<StockTxn>(KEYS.TRANSACTIONS);
    const inventory = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const txn = txns.find(t => t.id === txnId);
    if (!txn) throw new Error('Transaction not found');

    // Revert transaction effect before deleting.
    txn.lines.forEach((line) => {
      const inv = inventory.find(i => i.id === line.inventoryId);
      if (!inv) return;
      const revertDelta = -1 * getTxnDirection(txn.txnType) * line.qty;
      inv.quantityOnHand += revertDelta;
      inv.lastUpdated = new Date().toISOString();
    });

    saveData(KEYS.TRANSACTIONS, txns.filter(t => t.id !== txnId));
    saveData(KEYS.INVENTORY, inventory);
    return true;
  },

  getTransactions: async () => {
    await delay();
    return getData<StockTxn>(KEYS.TRANSACTIONS);
  },

  // Purchasing
  getPRs: async () => {
    await delay();
    return getData<PR>(KEYS.PR);
  },

  createPR: async (pr: any) => {
    await delay();
    const prs = getData<PR>(KEYS.PR);
    const newPR = { 
      ...pr, 
      id: `pr-${Date.now()}`, 
      prNo: `PR-${Date.now().toString().slice(-6)}`, 
      createdAt: new Date().toISOString(),
      status: PRStatus.DRAFT 
    };
    prs.push(newPR);
    saveData(KEYS.PR, prs);
    return newPR;
  },

  updatePRStatus: async (id: string, status: PRStatus) => {
    await delay();
    const prs = getData<PR>(KEYS.PR);
    const idx = prs.findIndex(p => p.id === id);
    if (idx > -1) {
      prs[idx].status = status;
      saveData(KEYS.PR, prs);
    }
    return true;
  },

  createPOFromPR: async (prId: string) => {
    await delay();
    const prs = getData<PR>(KEYS.PR);
    const pos = getData<PO>(KEYS.PO);
    const pr = prs.find(p => p.id === prId);
    
    if (pr) {
      const newPO: PO = {
        id: `po-${Date.now()}`,
        poNo: `PO-${Date.now().toString().slice(-6)}`,
        supplierId: pr.lines[0]?.suggestedSupplierId || 'supp-1',
        createdAt: new Date().toISOString(),
        createdBy: pr.createdBy,
        status: POStatus.DRAFT,
        lines: pr.lines.map(l => ({
          inventoryId: l.inventoryId,
          orderedQty: l.requestedQty,
          receivedQty: 0,
          unitCost: 0
        }))
      };
      pos.push(newPO);
      pr.status = PRStatus.APPROVED;
      saveData(KEYS.PO, pos);
      saveData(KEYS.PR, prs);
      return newPO;
    }
    throw new Error('PR not found');
  },

  getPOs: async () => {
    await delay();
    return getData<PO>(KEYS.PO);
  },

  receivePO: async (poId: string, lines: any[]) => {
    await delay();
    const pos = getData<PO>(KEYS.PO);
    const inventory = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const po = pos.find(p => p.id === poId);
    
    if (po) {
      lines.forEach(receipt => {
        const poLine = po.lines.find(l => l.inventoryId === receipt.inventoryId);
        const invItem = inventory.find(i => i.id === receipt.inventoryId);
        
        if (poLine && invItem) {
          poLine.receivedQty += receipt.qtyReceived;
          invItem.quantityOnHand += receipt.qtyReceived;
          invItem.lastUpdated = new Date().toISOString();
        }
      });
      
      const allReceived = po.lines.every(l => l.receivedQty >= l.orderedQty);
      po.status = allReceived ? POStatus.CLOSED : POStatus.PARTIALLY_RECEIVED;
      
      saveData(KEYS.PO, pos);
      saveData(KEYS.INVENTORY, inventory);
      
      // Also record as a transaction
      const txns = getData<StockTxn>(KEYS.TRANSACTIONS);
      txns.push({
        id: `txn-rec-${Date.now()}`,
        txnType: TxnType.RECEIVE,
        txnTime: new Date().toISOString(),
        performedBy: 'System',
        counterparty: 'Supplier',
        reference: po.poNo,
        remark: 'Auto-recorded from PO receipt',
        lines: lines.map(l => ({
          inventoryId: l.inventoryId,
          qty: l.qtyReceived,
          beforeQty: 0, // Simplified
          afterQty: 0
        }))
      });
      saveData(KEYS.TRANSACTIONS, txns);
      
      return true;
    }
    throw new Error('PO not found');
  },

  // Suppliers
  getSuppliers: async () => {
    await delay();
    return getData<Supplier>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  },

  saveSupplier: async (supp: Partial<Supplier>) => {
    await delay();
    const suppliers = getData<Supplier>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    if (supp.id) {
      const idx = suppliers.findIndex(s => s.id === supp.id);
      if (idx > -1) suppliers[idx] = { ...suppliers[idx], ...supp };
    } else {
      const newSupp = { ...supp, id: `supp-${Date.now()}` } as Supplier;
      suppliers.push(newSupp);
    }
    saveData(KEYS.SUPPLIERS, suppliers);
    return supp;
  },

  bulkUpdateSuppliers: async (ids: string[], updates: Partial<Supplier>) => {
    await delay();
    const suppliers = getData<Supplier>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    const updated = suppliers.map(s => ids.includes(s.id) ? { ...s, ...updates } : s);
    saveData(KEYS.SUPPLIERS, updated);
    return true;
  },

  // Dashboard
  getSummary: async () => {
    await delay();
    const items = getData<Inventory>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const prs = getData<PR>(KEYS.PR);
    const pos = getData<PO>(KEYS.PO);

    return {
      totalItems: items.length,
      lowStockCount: items.filter(i => i.quantityOnHand <= (i.reorderPoint || i.minStock)).length,
      openPRs: prs.filter(p => p.status === PRStatus.DRAFT || p.status === PRStatus.SUBMITTED).length,
      pendingPOs: pos.filter(p => p.status !== POStatus.CLOSED && p.status !== POStatus.CANCELLED).length,
      avgStockoutDuration: "2.4 Days",
      onTimeDeliveryRate: 92
    };
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
        preferredSupplierId: i.preferredSupplierId
      }));
  }
};
