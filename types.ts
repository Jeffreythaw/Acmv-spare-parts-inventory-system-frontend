
export enum UserRole {
  ADMIN = 'Admin',
  STOREKEEPER = 'Storekeeper',
  TECHNICIAN = 'Technician',
  VIEWER = 'Viewer'
}

export enum PartStatus {
  Spare = 'Spare',
  Installed = 'Installed',
  Faulty = 'Faulty',
  Obsolete = 'Obsolete'
}

export enum Criticality {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TxnType {
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  RECEIVE = 'RECEIVE',
  ADJUSTMENT = 'ADJUSTMENT'
}

export enum PRStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum POStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Inventory {
  id: string;
  building: string;
  room?: string;
  tagNo?: string;
  installationType?: string;
  systemType?: string;
  brand?: string;
  equipmentModel?: string;
  partCategory?: string;
  partName: string;
  partModel?: string;
  unit: string;
  status: PartStatus;
  criticality?: Criticality;
  image?: string;
  specs?: string;
  warrantyExpiry?: string;
  remark?: string;
  minStock: number;
  reorderPoint?: number;
  reorderQty?: number;
  preferredSupplierId?: string;
  locationBin?: string;
  quantityOnHand: number;
  lastUpdated: string;
  rowVersion: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  remark: string;
  active: boolean;
}

export interface StockTxn {
  id: string;
  txnType: TxnType;
  txnTime: string;
  performedBy: string;
  counterparty: string;
  reference: string;
  remark: string;
  reasonCode?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  documentType?: string;
  documentNo?: string;
  approvedBy?: string;
  lines: StockTxnLine[];
}

export interface StockTxnLine {
  inventoryId: string;
  qty: number;
  unitCost?: number;
  beforeQty: number;
  afterQty: number;
  partName?: string; // Hydrated for UI
}

export interface PR {
  id: string;
  prNo: string;
  createdAt: string;
  createdBy: string;
  status: PRStatus;
  lines: PRLine[];
}

export interface PRLine {
  inventoryId: string;
  requestedQty: number;
  notes?: string;
  suggestedSupplierId?: string;
  partName?: string; // Hydrated
}

export interface PO {
  id: string;
  poNo: string;
  supplierId: string;
  createdAt: string;
  createdBy: string;
  status: POStatus;
  lines: POLine[];
  supplierName?: string; // Hydrated
}

export interface POLine {
  inventoryId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost?: number;
  eta?: string;
  partName?: string; // Hydrated
}

export interface ReorderSuggestion {
  inventoryId: string;
  partName: string;
  building: string;
  quantityOnHand: number;
  reorderPoint: number;
  suggestedQty: number;
  preferredSupplierId?: string;
}

export interface OrderScheduleLine {
  inventoryId: string;
  qty: number;
}

export interface OrderSchedule {
  id: string;
  scheduledDate: string;
  createdBy: string;
  supplierId: string;
  remark: string;
  status: ScheduleStatus;
  lines: OrderScheduleLine[];
  createdAt: string;
  lastUpdated: string;
}

// Added missing InventoryFilterOptions interface
export interface InventoryFilterOptions {
  search?: string;
  building?: string;
  category?: string;
  status?: string;
}
