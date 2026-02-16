
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  ShoppingCart, 
  Users, 
  FileText, 
  AlertTriangle,
  ClipboardList,
  BookOpen
} from 'lucide-react';

export const NAVIGATION = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: 'dashboard' },
  { name: 'Inventory', icon: <Package size={20} />, path: 'inventory' },
  { name: 'Movements', icon: <ArrowLeftRight size={20} />, path: 'movements' },
  { name: 'Purchasing', icon: <ShoppingCart size={20} />, path: 'purchasing' },
  { name: 'Suppliers', icon: <Users size={20} />, path: 'suppliers' },
  { name: 'Audit Reports', icon: <FileText size={20} />, path: 'reports' },
  { name: 'User Manual', icon: <BookOpen size={20} />, path: 'manual' },
];

export const BUILDINGS = ['Tower A', 'Tower B', 'Medical Centre', 'Annex Wing', 'Central Plant'];
export const CATEGORIES = ['Compressors', 'Filters', 'Thermostats', 'Fans', 'Belts', 'Refrigerants', 'Valves'];

export const STATUS_COLORS = {
  Spare: 'bg-green-100 text-green-800 border-green-200',
  Installed: 'bg-blue-100 text-blue-800 border-blue-200',
  Faulty: 'bg-red-100 text-red-800 border-red-200',
  Obsolete: 'bg-gray-100 text-gray-800 border-gray-200'
};

export const PR_STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-orange-100 text-orange-800'
};
