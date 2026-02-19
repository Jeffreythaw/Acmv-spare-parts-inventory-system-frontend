
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { Inventory, PartStatus, Supplier, Criticality, StockTxn } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Edit2, 
  X, Package, Layers, 
  SlidersHorizontal, Download, Cpu, Wind, Thermometer, Fan, Activity, Droplets, CircleDot,
  Check, MapPin, Tag, Hash, Settings2, Info, History, Truck, 
  Binary, Wrench, ShieldCheck, Bookmark, AlertTriangle,
  CheckCircle2, Camera, Zap, ShieldAlert, Clock, Eye, FileText
} from 'lucide-react';
import { BUILDINGS, CATEGORIES, STATUS_COLORS } from '../constants';

const DEFAULT_UNITS = ['pcs', 'set', 'box', 'roll', 'kg', 'litre'];
const DEFAULT_SYSTEM_TYPES = ['Chilled Water System', 'Ventilation System', 'Refrigeration System', 'Control System'];

const DROPDOWN_STORAGE_KEYS = {
  buildings: 'acmv_dropdown_buildings',
  categories: 'acmv_dropdown_categories',
  units: 'acmv_dropdown_units',
  systemTypes: 'acmv_dropdown_system_types',
};

const normalizeOption = (value: string) => value.trim().replace(/\s+/g, ' ');

const mergeUniqueOptions = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeOption(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
};

const readStoredOptions = (key: string, defaults: string[]) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return mergeUniqueOptions(defaults);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return mergeUniqueOptions(defaults);
    return mergeUniqueOptions([...defaults, ...parsed.map((v) => String(v))]);
  } catch {
    return mergeUniqueOptions(defaults);
  }
};

const saveStoredOptions = (key: string, options: string[]) => {
  localStorage.setItem(key, JSON.stringify(mergeUniqueOptions(options)));
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Compressors': <Cpu size={14} />,
  'Filters': <Wind size={14} />,
  'Thermostats': <Thermometer size={14} />,
  'Fans': <Fan size={14} />,
  'Belts': <Activity size={14} />,
  'Refrigerants': <Droplets size={14} />,
  'Valves': <CircleDot size={14} />,
};

const InventoryPage: React.FC = () => {
  const { canEdit, isAdmin } = useAuth();
  const [items, setItems] = useState<Inventory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemHistory, setItemHistory] = useState<StockTxn[]>([]);
  const [search, setSearch] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('All Buildings');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterStock, setFilterStock] = useState<'All Stock' | 'In Stock' | 'Low Stock' | 'Zero Stock'>('All Stock');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'specs' | 'history' | 'logistics'>('specs');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<Inventory> | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buildingOptions, setBuildingOptions] = useState<string[]>(BUILDINGS);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(CATEGORIES);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [systemTypeOptions, setSystemTypeOptions] = useState<string[]>(DEFAULT_SYSTEM_TYPES);
  const [optionDrafts, setOptionDrafts] = useState({ building: '', category: '', unit: '', systemType: '' });
  
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [bulkUpdates, setBulkUpdates] = useState<{status?: PartStatus; minStock?: number; reorderPoint?: number; preferredSupplierId?: string; criticality?: Criticality}>({});
  const [bulkFieldsEnabled, setBulkFieldsEnabled] = useState({status: false, minStock: false, reorderPoint: false, preferredSupplierId: false, criticality: false});

  const addDropdownOption = (type: 'building' | 'category' | 'unit' | 'systemType') => {
    if (!canEdit()) return;
    const draft = normalizeOption(optionDrafts[type]);
    if (!draft) return;

    const applyUpdate = (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      storageKey: string
    ) => {
      setter((prev) => {
        const next = mergeUniqueOptions([...prev, draft]);
        saveStoredOptions(storageKey, next);
        return next;
      });
    };

    if (type === 'building') {
      applyUpdate(setBuildingOptions, DROPDOWN_STORAGE_KEYS.buildings);
      setCurrentItem(prev => prev ? { ...prev, building: draft } : prev);
    }
    if (type === 'category') {
      applyUpdate(setCategoryOptions, DROPDOWN_STORAGE_KEYS.categories);
      setCurrentItem(prev => prev ? { ...prev, partCategory: draft } : prev);
    }
    if (type === 'unit') {
      applyUpdate(setUnitOptions, DROPDOWN_STORAGE_KEYS.units);
      setCurrentItem(prev => prev ? { ...prev, unit: draft } : prev);
    }
    if (type === 'systemType') {
      applyUpdate(setSystemTypeOptions, DROPDOWN_STORAGE_KEYS.systemTypes);
      setCurrentItem(prev => prev ? { ...prev, systemType: draft } : prev);
    }

    setOptionDrafts((prev) => ({ ...prev, [type]: '' }));
  };

  const fetchItems = async () => {
    setLoading(true);
    const data = await api.getInventory({ search, building: filterBuilding, category: filterCategory, status: filterStatus });
    setItems(data);
    setLoading(false);
  };

  const fetchItemAudit = async (inventoryId: string) => {
    const txns = await api.getTransactions();
    const filtered = txns.filter(t => t.lines.some(l => l.inventoryId === inventoryId));
    setItemHistory(filtered);
  };

  useEffect(() => {
    setBuildingOptions(readStoredOptions(DROPDOWN_STORAGE_KEYS.buildings, BUILDINGS));
    setCategoryOptions(readStoredOptions(DROPDOWN_STORAGE_KEYS.categories, CATEGORIES));
    setUnitOptions(readStoredOptions(DROPDOWN_STORAGE_KEYS.units, DEFAULT_UNITS));
    setSystemTypeOptions(readStoredOptions(DROPDOWN_STORAGE_KEYS.systemTypes, DEFAULT_SYSTEM_TYPES));
  }, []);

  useEffect(() => {
    const dynamicBuildings = items.map(i => i.building).filter(Boolean) as string[];
    const dynamicCategories = items.map(i => i.partCategory).filter(Boolean) as string[];
    const dynamicUnits = items.map(i => i.unit).filter(Boolean) as string[];
    const dynamicSystemTypes = items.map(i => i.systemType).filter(Boolean) as string[];

    if (dynamicBuildings.length) {
      setBuildingOptions(prev => mergeUniqueOptions([...prev, ...dynamicBuildings]));
    }
    if (dynamicCategories.length) {
      setCategoryOptions(prev => mergeUniqueOptions([...prev, ...dynamicCategories]));
    }
    if (dynamicUnits.length) {
      setUnitOptions(prev => mergeUniqueOptions([...prev, ...dynamicUnits]));
    }
    if (dynamicSystemTypes.length) {
      setSystemTypeOptions(prev => mergeUniqueOptions([...prev, ...dynamicSystemTypes]));
    }
  }, [items]);

  useEffect(() => { fetchItems(); api.getSuppliers().then(setSuppliers); }, [search, filterBuilding, filterCategory, filterStatus]);

  const displayedItems = useMemo(() => {
    if (filterStock === 'All Stock') return items;
    if (filterStock === 'Zero Stock') return items.filter(i => i.quantityOnHand === 0);
    if (filterStock === 'Low Stock') return items.filter(i => i.quantityOnHand > 0 && i.quantityOnHand <= (i.reorderPoint || i.minStock));
    return items.filter(i => i.quantityOnHand > (i.reorderPoint || i.minStock));
  }, [items, filterStock]);

  const resetFilters = () => {
    setSearch('');
    setFilterBuilding('All Buildings');
    setFilterCategory('All Categories');
    setFilterStatus('All Statuses');
    setFilterStock('All Stock');
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please check permissions.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCurrentItem(prev => ({ ...prev, image: dataUrl }));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['Asset ID', 'Name', 'Building', 'Category', 'Status', 'Qty'];
    const rows = items.map(i => [i.id, i.partName, i.building, i.partCategory, i.status, i.quantityOnHand]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${Date.now()}.csv`;
    link.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    const minStock = Math.max(0, currentItem.minStock ?? 1);
    const reorderPoint =
      currentItem.reorderPoint === undefined || currentItem.reorderPoint === null || currentItem.reorderPoint <= 0
        ? minStock
        : Math.max(0, currentItem.reorderPoint);
    const quantityOnHand = Math.max(0, currentItem.quantityOnHand ?? 0);

    await api.saveInventory({
      ...currentItem,
      building: currentItem.building || buildingOptions[0] || BUILDINGS[0],
      room: currentItem.room || '',
      tagNo: currentItem.tagNo || '',
      installationType: currentItem.installationType || '',
      systemType: currentItem.systemType || systemTypeOptions[0] || '',
      brand: currentItem.brand || '',
      equipmentModel: currentItem.equipmentModel || '',
      partCategory: currentItem.partCategory || categoryOptions[0] || CATEGORIES[0],
      partName: currentItem.partName || '',
      partModel: currentItem.partModel || '',
      unit: currentItem.unit || unitOptions[0] || 'pcs',
      specs: currentItem.specs || '',
      remark: currentItem.remark || '',
      minStock,
      reorderPoint,
      quantityOnHand,
      preferredSupplierId: currentItem.preferredSupplierId || '',
      locationBin: currentItem.locationBin || '',
    });
    setShowModal(false);
    fetchItems();
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<Inventory> = {};
    if (bulkFieldsEnabled.status) updates.status = bulkUpdates.status;
    if (bulkFieldsEnabled.minStock) updates.minStock = Math.max(0, bulkUpdates.minStock ?? 0);
    if (bulkFieldsEnabled.reorderPoint) updates.reorderPoint = bulkUpdates.reorderPoint;
    if (bulkFieldsEnabled.preferredSupplierId) updates.preferredSupplierId = bulkUpdates.preferredSupplierId;
    if (bulkFieldsEnabled.criticality) updates.criticality = bulkUpdates.criticality;
    await api.bulkUpdateInventory(selectedIds, updates);
    setShowBulkModal(false);
    setSelectedIds([]);
    fetchItems();
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin()) return;
    if (!window.confirm('Delete this inventory item? This action cannot be undone.')) return;
    await api.deleteInventory(id);
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    if (currentItem?.id === id) {
      setCurrentItem(null);
      setShowDetail(false);
      setShowModal(false);
    }
    fetchItems();
  };

  const handleBulkDelete = async () => {
    if (!isAdmin() || selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected inventory items? This action cannot be undone.`)) return;
    await api.bulkDeleteInventory(selectedIds);
    setSelectedIds([]);
    setShowBulkModal(false);
    fetchItems();
  };

  const toggleSelectItem = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const getHealthStatus = (item: Inventory) => {
    if (item.quantityOnHand === 0) return { label: 'CRITICAL', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (item.quantityOnHand <= (item.reorderPoint || item.minStock)) return { label: 'LOW STOCK', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'OPTIMAL', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 relative pb-32 lg:pb-24">
      {/* Toolbar */}
      <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
        <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search catalog by name, model, tag or building..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-semibold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide px-1">
              <button 
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                className={`flex items-center space-x-2 border-2 px-5 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ${isFilterVisible || (filterBuilding !== 'All Buildings' || filterCategory !== 'All Categories' || filterStatus !== 'All Statuses' || filterStock !== 'All Stock') ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-600'}`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
              </button>
              <button onClick={handleExportCSV} className="p-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl"><Download size={16} /></button>
              {isAdmin() && selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2 bg-red-600 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  <span>Delete Selected ({selectedIds.length})</span>
                </button>
              )}
              {canEdit() && (
                <button 
                  onClick={() => {
                    setCurrentItem({
                      partName: '',
                      building: buildingOptions[0] || BUILDINGS[0],
                      room: '',
                      tagNo: '',
                      installationType: '',
                      brand: '',
                      equipmentModel: '',
                      partCategory: categoryOptions[0] || CATEGORIES[0],
                      partModel: '',
                      minStock: 1,
                      quantityOnHand: 0,
                      unit: unitOptions[0] || 'pcs',
                      status: PartStatus.Spare,
                      criticality: Criticality.MEDIUM,
                      systemType: systemTypeOptions[0] || '',
                      specs: '',
                      remark: '',
                      reorderPoint: 1,
                      preferredSupplierId: suppliers[0]?.id || '',
                      locationBin: '',
                    });
                    setShowModal(true);
                  }}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  <Plus size={16} />
                  <span>Add Asset</span>
                </button>
              )}
            </div>
          </div>

          {isFilterVisible && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-black" value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
                <option>All Buildings</option>{buildingOptions.map(b => <option key={b}>{b}</option>)}
              </select>
              <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-black" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option>All Categories</option>{categoryOptions.map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-black" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option>All Statuses</option>{Object.values(PartStatus).map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-black" value={filterStock} onChange={e => setFilterStock(e.target.value as any)}>
                <option>All Stock</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Zero Stock</option>
              </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-500">
                  Showing <span className="text-slate-800">{displayedItems.length}</span> of <span className="text-slate-800">{items.length}</span> record(s)
                </div>
                <button
                  onClick={resetFilters}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Inventory List (Grid-Line Table View) */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-32 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Catalog Registry...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="py-32 text-center bg-white">
            <Package className="mx-auto text-slate-100 mb-4" size={48} />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">No Results For Current Filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-center w-14"></th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-left">Part</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-left">Tag / Model</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-left">Location</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-center">Status</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-center">Criticality</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-right">Qty</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-right">Min / Reorder</th>
                  <th className="border-b border-r border-slate-200 px-4 py-3 text-left">Supplier</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const supplierName = suppliers.find(s => s.id === item.preferredSupplierId)?.name || '--';
                  return (
                    <tr
                      key={item.id}
                      className={`${isSelected ? 'bg-blue-50/40' : 'bg-white'} hover:bg-slate-50 transition-colors cursor-pointer`}
                      onClick={() => { setCurrentItem(item); fetchItemAudit(item.id); setShowDetail(true); }}
                    >
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200'}`}
                        >
                          <Check size={13} />
                        </button>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3">
                        <div className="font-black text-sm text-slate-900">{item.partName}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">{item.partCategory || '--'}</div>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3">
                        <div className="text-xs font-bold text-slate-700">{item.tagNo || '--'}</div>
                        <div className="text-[10px] text-slate-500">{item.partModel || item.equipmentModel || '--'}</div>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700">
                        {item.building} / {item.room || '--'} / {item.locationBin || '--'}
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${item.criticality === Criticality.HIGH ? 'bg-red-100 text-red-700' : item.criticality === Criticality.LOW ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.criticality || 'Medium'}
                        </span>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-right">
                        <div className="font-black text-slate-900">{item.quantityOnHand}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{item.unit}</div>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-right text-xs font-semibold text-slate-700">
                        {item.minStock} / {item.reorderPoint || item.minStock}
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700">{supplierName}</td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setCurrentItem(item); fetchItemAudit(item.id); setShowDetail(true); }} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600">
                            <Info size={13} />
                          </button>
                          {canEdit() && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setCurrentItem(item); setShowModal(true); }}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin() && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                              className="p-2 bg-white border border-red-200 rounded-lg text-red-500 hover:text-red-600"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Detail Overlay (Bottom Sheet / Drawer) */}
      {showDetail && currentItem && (
        <div className="fixed inset-0 z-[120] flex items-end lg:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 lg:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full lg:max-w-5xl rounded-t-[3rem] lg:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
             <div className="p-8 pb-4 border-b border-slate-100 flex justify-between items-start">
                <div className="space-y-2">
                   <div className="flex items-center space-x-3">
                      <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                        <Package size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{currentItem.partName}</h2>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Registry Ref: {currentItem.id}</p>
                          {currentItem.criticality === Criticality.HIGH && (
                            <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-widest animate-pulse">CRITICAL ASSET</span>
                          )}
                        </div>
                      </div>
                   </div>
                </div>
                <button onClick={() => setShowDetail(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all"><X size={24} /></button>
             </div>

             {/* Detail Tabs */}
             <div className="px-8 flex border-b border-slate-50">
                {[
                  { id: 'specs', label: 'Blueprints', icon: <Wrench size={14} /> },
                  { id: 'history', label: 'Movement History', icon: <History size={14} /> },
                  { id: 'logistics', label: 'Sourcing & Location', icon: <Truck size={14} /> }
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setDetailTab(t.id as any)}
                    className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 border-b-2 transition-all ${detailTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:bg-slate-50'}`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-hide">
                {detailTab === 'specs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-8">
                       {currentItem.image ? (
                         <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200">
                           <img src={currentItem.image} alt="Nameplate" className="w-full aspect-square object-cover" />
                         </div>
                       ) : (
                         <div className="bg-slate-50 rounded-[2rem] aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-300">
                            <Camera size={48} className="mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">No Visual Record</span>
                         </div>
                       )}

                       <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 relative overflow-hidden">
                         <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-center">
                               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Inventory</span>
                               <ShieldCheck size={20} className="text-blue-400" />
                            </div>
                            <div className="space-y-1">
                               <div className="text-6xl font-black tracking-tighter">{currentItem.quantityOnHand}</div>
                               <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentItem.unit} ON HAND</div>
                            </div>
                         </div>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                       </div>
                    </div>

                    <div className="lg:col-span-2 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 relative">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                          <div className="space-y-1">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Technical Specifications</div>
                             <div className="text-sm font-black text-slate-900 whitespace-pre-wrap">{currentItem.specs || 'N/A'}</div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Warranty Expiry</div>
                             <div className="text-sm font-black text-blue-600">{currentItem.warrantyExpiry || '--'}</div>
                          </div>
                          <div className="space-y-1 border-t border-slate-200 pt-6">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipment Model</div>
                             <div className="text-sm font-black text-slate-900">{currentItem.equipmentModel || '--'}</div>
                          </div>
                          <div className="space-y-1 border-t border-slate-200 pt-6">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tag / Reference No.</div>
                             <div className="text-sm font-black text-blue-600 font-mono">{currentItem.tagNo || 'NOT_TAGGED'}</div>
                          </div>
                       </div>
                       <div className="mt-12 p-6 bg-white border border-slate-100 rounded-3xl">
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Maintenance Remark</h5>
                          <p className="text-sm font-bold text-slate-700 italic">"{currentItem.remark || "No active maintenance notes."}"</p>
                       </div>
                    </div>
                  </div>
                )}

                {detailTab === 'history' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                    {itemHistory.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No transactions recorded for this asset</span>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="px-8 py-4">Timestamp</th>
                              <th className="px-8 py-4">Operation</th>
                              <th className="px-8 py-4 text-center">Movement</th>
                              <th className="px-8 py-4 text-right">Auth Person</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {itemHistory.map(txn => {
                              const line = txn.lines.find(l => l.inventoryId === currentItem.id);
                              return (
                                <tr key={txn.id} className="text-xs hover:bg-slate-50 transition-colors">
                                  <td className="px-8 py-4">
                                    <div className="font-black">{new Date(txn.txnTime).toLocaleDateString()}</div>
                                    <div className="text-[8px] text-slate-400">{new Date(txn.txnTime).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="px-8 py-4">
                                    <div className="font-black text-slate-900">{txn.txnType}</div>
                                    <div className="text-[8px] text-slate-400 uppercase">Ref: {txn.reference}</div>
                                  </td>
                                  <td className="px-8 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-lg font-black ${txn.txnType === 'ISSUE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {txn.txnType === 'ISSUE' ? '-' : '+'}{line?.qty}
                                    </span>
                                  </td>
                                  <td className="px-8 py-4 text-right font-black text-slate-500">{txn.performedBy}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'logistics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-4">
                         <MapPin className="text-blue-600" size={24} />
                         <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Building Site</div>
                           <div className="text-sm font-black text-slate-900">{currentItem.building}</div>
                         </div>
                      </div>
                      <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-4">
                         <Layers className="text-blue-600" size={24} />
                         <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage Bin</div>
                           <div className="text-sm font-black text-slate-900 font-mono">{currentItem.locationBin || 'UNSET'}</div>
                         </div>
                      </div>
                      <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-4">
                         <Truck className="text-blue-600" size={24} />
                         <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preferred Vendor</div>
                           <div className="text-sm font-black text-slate-900 truncate">
                              {suppliers.find(s => s.id === currentItem.preferredSupplierId)?.name || 'Direct Procurement'}
                           </div>
                         </div>
                      </div>
                      <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-4">
                         <Clock className="text-blue-600" size={24} />
                         <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Update</div>
                           <div className="text-sm font-black text-slate-900">{new Date(currentItem.lastUpdated).toLocaleDateString()}</div>
                         </div>
                      </div>
                  </div>
                )}
             </div>

             <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center space-x-3">
                   <ShieldCheck size={16} className="text-slate-400" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ACMV Registry Authenticated v2.0</span>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                   {isAdmin() && currentItem?.id && (
                      <button
                        onClick={() => handleDeleteItem(currentItem.id as string)}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-3 bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                      >
                        <span>Delete Asset</span>
                      </button>
                   )}
                   {canEdit() && (
                      <button 
                        onClick={() => { setShowDetail(false); setShowModal(true); }}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-3 bg-white border-2 border-slate-200 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Edit2 size={16} />
                        <span>Update Asset</span>
                      </button>
                   )}
                   <button className="flex-1 sm:flex-none flex items-center justify-center space-x-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                      <Download size={16} />
                      <span>Export Tech-Doc</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Asset Editor Modal */}
      {showModal && currentItem && (
        <div className="fixed inset-0 z-[130] flex items-end lg:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 lg:p-6 animate-in fade-in">
          <div className="bg-white w-full lg:max-w-5xl rounded-t-[3rem] lg:rounded-[3.5rem] shadow-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden animate-in slide-in-from-bottom duration-500 scrollbar-hide">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 lg:px-10 py-6 lg:py-8 border-b border-slate-100 flex justify-between items-center z-30">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">{currentItem.id ? 'Asset Configuration' : 'New Asset Entry'}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Registry Patch v2.0</p>
                </div>
              </div>
              <button onClick={() => { stopCamera(); setShowModal(false); }} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 active:scale-90 transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 lg:p-10 space-y-8 pb-24">
              
              {/* Asset Identity & Photo Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-4 space-y-6">
                   <div className="relative group">
                      {isCameraActive ? (
                        <div className="w-full aspect-square rounded-[2rem] overflow-hidden border-4 border-blue-600 bg-black">
                           <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                           <button type="button" onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-900 shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
                              <div className="w-10 h-10 bg-blue-600 rounded-full" />
                           </button>
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-[3rem] overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 group-hover:border-blue-300 transition-all flex flex-col items-center justify-center relative">
                           {currentItem.image ? (
                             <>
                               <img src={currentItem.image} alt="Preview" className="w-full h-full object-cover" />
                               <button type="button" onClick={() => setCurrentItem(prev => ({ ...prev, image: undefined }))} className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-xl shadow-lg"><X size={16} /></button>
                               <button type="button" onClick={startCamera} className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                  <Camera size={16} /> <span>Retake</span>
                               </button>
                             </>
                           ) : (
                             <button type="button" onClick={startCamera} className="flex flex-col items-center">
                               <Camera size={48} className="text-slate-200 mb-4 group-hover:text-blue-400 transition-colors" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capture Asset Photo</span>
                             </button>
                           )}
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                   </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Name *</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-lg text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm" placeholder="e.g. Axial Fan Bearing Set" required value={currentItem.partName || ''} onChange={e => setCurrentItem({...currentItem, partName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Criticality</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black" value={currentItem.criticality} onChange={e => setCurrentItem({...currentItem, criticality: e.target.value as Criticality})}>
                        {Object.values(Criticality).map(c => <option key={c} value={c}>{c} Priority</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Tag No / Serial</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono font-bold text-slate-700" placeholder="TAG-XXXX" value={currentItem.tagNo || ''} onChange={e => setCurrentItem({...currentItem, tagNo: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Part Status</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black" value={currentItem.status || PartStatus.Spare} onChange={e => setCurrentItem({...currentItem, status: e.target.value as PartStatus})}>
                        {Object.values(PartStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Quantity On Hand</label>
                      <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-700" value={currentItem.quantityOnHand ?? 0} onChange={e => setCurrentItem({...currentItem, quantityOnHand: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Workflow Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-slate-400">
                   <Wrench size={16} />
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Engineering Specification Sheet</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Detailed Technical Specs (Manual Copy)</label>
                    <textarea rows={5} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-mono text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none shadow-sm" placeholder="e.g. Voltage: 415V, Frequency: 50Hz, Phase: 3, Refrigerant: R134a..." value={currentItem.specs || ''} onChange={e => setCurrentItem({...currentItem, specs: e.target.value})} />
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Installation Type</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700" value={currentItem.installationType || ''} onChange={e => setCurrentItem({...currentItem, installationType: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Brand</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700" value={currentItem.brand || ''} onChange={e => setCurrentItem({...currentItem, brand: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Equipment Model</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700" value={currentItem.equipmentModel || ''} onChange={e => setCurrentItem({...currentItem, equipmentModel: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Part Model</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700" value={currentItem.partModel || ''} onChange={e => setCurrentItem({...currentItem, partModel: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">System Classification</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black shadow-sm" value={currentItem.systemType || ''} onChange={e => setCurrentItem({...currentItem, systemType: e.target.value})}>
                        {systemTypeOptions.map(s => <option key={s}>{s}</option>)}
                      </select>
                      {canEdit() && (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <input
                            className="min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                            placeholder="Add system type"
                            value={optionDrafts.systemType}
                            onChange={e => setOptionDrafts({ ...optionDrafts, systemType: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addDropdownOption('systemType');
                              }
                            }}
                          />
                          <button type="button" onClick={() => addDropdownOption('systemType')} className="shrink-0 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Warranty Expiry / Shelf Life</label>
                      <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold shadow-sm" value={currentItem.warrantyExpiry || ''} onChange={e => setCurrentItem({...currentItem, warrantyExpiry: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Maintenance Remark</label>
                      <textarea rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 shadow-sm resize-none" value={currentItem.remark || ''} onChange={e => setCurrentItem({...currentItem, remark: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics & Inventory Thresholds */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-slate-400">
                   <MapPin size={16} />
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Logistics & Control Parameters</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Building</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black shadow-sm" value={currentItem.building} onChange={e => setCurrentItem({...currentItem, building: e.target.value})}>
                      {buildingOptions.map(b => <option key={b}>{b}</option>)}
                    </select>
                    {canEdit() && (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <input
                          className="min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                          placeholder="Add building"
                          value={optionDrafts.building}
                          onChange={e => setOptionDrafts({ ...optionDrafts, building: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addDropdownOption('building');
                            }
                          }}
                        />
                        <button type="button" onClick={() => addDropdownOption('building')} className="shrink-0 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Room</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold shadow-sm" value={currentItem.room || ''} onChange={e => setCurrentItem({...currentItem, room: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black shadow-sm" value={currentItem.partCategory} onChange={e => setCurrentItem({...currentItem, partCategory: e.target.value})}>
                      {categoryOptions.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {canEdit() && (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <input
                          className="min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                          placeholder="Add category"
                          value={optionDrafts.category}
                          onChange={e => setOptionDrafts({ ...optionDrafts, category: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addDropdownOption('category');
                            }
                          }}
                        />
                        <button type="button" onClick={() => addDropdownOption('category')} className="shrink-0 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black shadow-sm" value={currentItem.unit || ''} onChange={e => setCurrentItem({...currentItem, unit: e.target.value})}>
                      {unitOptions.map(unit => <option key={unit}>{unit}</option>)}
                    </select>
                    {canEdit() && (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <input
                          className="min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                          placeholder="Add unit"
                          value={optionDrafts.unit}
                          onChange={e => setOptionDrafts({ ...optionDrafts, unit: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addDropdownOption('unit');
                            }
                          }}
                        />
                        <button type="button" onClick={() => addDropdownOption('unit')} className="shrink-0 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Min Stock</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-black"
                      value={currentItem.minStock ?? 0}
                      onChange={e => {
                        const nextMin = Math.max(0, parseInt(e.target.value) || 0);
                        const existingReorder = currentItem.reorderPoint ?? 0;
                        setCurrentItem({
                          ...currentItem,
                          minStock: nextMin,
                          reorderPoint: existingReorder <= 0 ? nextMin : existingReorder,
                        });
                      }}
                    />
                    <p className="text-[10px] font-semibold text-slate-500">When stock is below this level, item is flagged as low stock.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reorder Point</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-black"
                      value={currentItem.reorderPoint ?? currentItem.minStock ?? 0}
                      onChange={e => setCurrentItem({...currentItem, reorderPoint: Math.max(0, parseInt(e.target.value) || 0)})}
                    />
                    <p className="text-[10px] font-semibold text-slate-500">Default follows Min Stock if left as 0.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Location Bin</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold shadow-sm" value={currentItem.locationBin || ''} onChange={e => setCurrentItem({...currentItem, locationBin: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Preferred Supplier</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black shadow-sm" value={currentItem.preferredSupplierId || ''} onChange={e => setCurrentItem({...currentItem, preferredSupplierId: e.target.value})}>
                      <option value="">None</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm pt-3">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[1.75rem] font-black uppercase tracking-[0.16em] shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-4">
                <CheckCircle2 size={24} />
                <span>Synchronize Asset to Registry</span>
              </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Update Modal Mobile Optimization */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full sm:max-w-xl rounded-t-[3.5rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-slate-900/30">
                  <Settings2 size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Bulk Batch Patch</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Scoped: {selectedIds.length} Assets</p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleBulkUpdate} className="p-12 space-y-10 overflow-y-auto scrollbar-hide pb-16">
              <div className="p-6 bg-blue-50 border-2 border-blue-100 border-dashed rounded-3xl space-y-3">
                <div className="flex items-center space-x-2 text-blue-600">
                   <AlertTriangle size={18} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Pre-Execution Confirmation</p>
                </div>
                <p className="text-xs font-bold text-blue-700 leading-relaxed">
                  You are about to modify parameters for <span className="font-black underline">{selectedIds.length} unique records</span>. This operation is non-reversible.
                </p>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <input type="checkbox" className="w-6 h-6 accent-blue-600 rounded" checked={bulkFieldsEnabled.status} onChange={e => setBulkFieldsEnabled({...bulkFieldsEnabled, status: e.target.checked})} />
                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Inventory Status</span>
                      </div>
                      <select 
                        disabled={!bulkFieldsEnabled.status}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-black focus:border-blue-500 outline-none disabled:opacity-30 transition-all"
                        value={bulkUpdates.status}
                        onChange={e => setBulkUpdates({...bulkUpdates, status: e.target.value as PartStatus})}
                      >
                        {Object.values(PartStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <input type="checkbox" className="w-6 h-6 accent-blue-600 rounded" checked={bulkFieldsEnabled.criticality} onChange={e => setBulkFieldsEnabled({...bulkFieldsEnabled, criticality: e.target.checked})} />
                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Criticality Rating</span>
                      </div>
                      <select 
                        disabled={!bulkFieldsEnabled.criticality}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-black focus:border-blue-500 outline-none disabled:opacity-30 transition-all"
                        value={bulkUpdates.criticality}
                        onChange={e => setBulkUpdates({...bulkUpdates, criticality: e.target.value as Criticality})}
                      >
                        {Object.values(Criticality).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <input type="checkbox" className="w-6 h-6 accent-blue-600 rounded" checked={bulkFieldsEnabled.minStock} onChange={e => setBulkFieldsEnabled({...bulkFieldsEnabled, minStock: e.target.checked})} />
                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Min Stock</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        disabled={!bulkFieldsEnabled.minStock}
                        className="w-24 bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-center font-black focus:border-blue-500 outline-none disabled:opacity-30 transition-all"
                        value={bulkUpdates.minStock ?? 0}
                        onChange={e => setBulkUpdates({...bulkUpdates, minStock: Math.max(0, parseInt(e.target.value) || 0)})}
                      />
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <input type="checkbox" className="w-6 h-6 accent-blue-600 rounded" checked={bulkFieldsEnabled.reorderPoint} onChange={e => setBulkFieldsEnabled({...bulkFieldsEnabled, reorderPoint: e.target.checked})} />
                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Reorder Threshold</span>
                      </div>
                      <input 
                        type="number"
                        disabled={!bulkFieldsEnabled.reorderPoint}
                        className="w-24 bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-center font-black focus:border-blue-500 outline-none disabled:opacity-30 transition-all"
                        min={0}
                        value={bulkUpdates.reorderPoint ?? 0}
                        onChange={e => setBulkUpdates({...bulkUpdates, reorderPoint: Math.max(0, parseInt(e.target.value) || 0)})}
                      />
                   </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center space-x-4">
                 <ShieldCheck size={20} className="text-blue-500" />
                 <span>Apply Batch Patch</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
