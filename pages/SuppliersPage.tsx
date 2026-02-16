
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Supplier } from '../types';
import { 
  Plus, Search, Edit2, Mail, Phone, MapPin, 
  CheckCircle, XCircle, ChevronUp, ChevronDown, Filter, X,
  Settings2, CheckCircle2, AlertTriangle
} from 'lucide-react';

type SortField = 'name' | 'email' | 'active';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier> | null>(null);

  // Sorting & Filtering State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkUpdates, setBulkUpdates] = useState<{ active?: boolean; remark?: string }>({});
  const [bulkFieldsEnabled, setBulkFieldsEnabled] = useState({ active: false, remark: false });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSupplier || !currentSupplier.name) return;
    try {
      await api.saveSupplier(currentSupplier);
      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatesToApply: Partial<Supplier> = {};
    if (bulkFieldsEnabled.active) updatesToApply.active = bulkUpdates.active;
    if (bulkFieldsEnabled.remark) updatesToApply.remark = bulkUpdates.remark;

    if (Object.keys(updatesToApply).length === 0) {
      alert("Please select at least one field to update.");
      return;
    }

    try {
      await api.bulkUpdateSuppliers(selectedIds, updatesToApply);
      setShowBulkModal(false);
      setSelectedIds([]);
      setBulkFieldsEnabled({ active: false, remark: false });
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const processedSuppliers = useMemo(() => {
    let result = [...suppliers];

    // 1. Filter by search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(sup => 
        sup.name.toLowerCase().includes(s) || 
        sup.email.toLowerCase().includes(s) ||
        sup.remark?.toLowerCase().includes(s)
      );
    }

    // 2. Filter by status
    if (statusFilter === 'active') {
      result = result.filter(sup => sup.active);
    } else if (statusFilter === 'inactive') {
      result = result.filter(sup => !sup.active);
    }

    // 3. Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle string case-insensitivity
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [suppliers, search, statusFilter, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedIds.length === processedSuppliers.length && processedSuppliers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedSuppliers.map(s => s.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search vendors..."
              className="block w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-white border-2 border-slate-100 rounded-2xl p-1.5 shadow-sm">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === f 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => {
            setCurrentSupplier({ name: '', email: '', phone: '', address: '', active: true });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-black text-xs uppercase tracking-widest"
        >
          <Plus size={20} />
          <span>Add New Vendor</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/20 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6 w-16 text-center">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer"
                    checked={processedSuppliers.length > 0 && selectedIds.length === processedSuppliers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th 
                  className="px-8 py-6 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center">
                    Vendor Identity
                    <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="px-8 py-6 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort('email')}
                >
                  <div className="flex items-center">
                    Contact Channel
                    <SortIcon field="email" />
                  </div>
                </th>
                <th className="px-8 py-6">Physical Location</th>
                <th 
                  className="px-8 py-6 text-center cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort('active')}
                >
                  <div className="flex items-center justify-center">
                    Operational Status
                    <SortIcon field="active" />
                  </div>
                </th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Vendor Registry...</span>
                    </div>
                  </td>
                </tr>
              ) : processedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 max-w-xs mx-auto">
                      <div className="p-5 bg-slate-50 rounded-full text-slate-200">
                        <Filter size={40} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest block">No vendors matched</span>
                        <p className="text-xs text-slate-400 font-bold leading-relaxed">Try adjusting your filters or search query to find the supplier.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : processedSuppliers.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/60 transition-all group border-l-8 ${isSelected ? 'border-l-blue-600 bg-blue-50/20' : 'border-l-transparent'}`}>
                    <td className="px-8 py-6 text-center">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(s.id)}
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{s.remark || 'Standard Vendor'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 space-y-1.5">
                      <div className="flex items-center text-xs text-slate-600 font-bold">
                        <Mail size={14} className="mr-3 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        {s.email}
                      </div>
                      <div className="flex items-center text-xs text-slate-600 font-bold">
                        <Phone size={14} className="mr-3 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        {s.phone}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-start text-[11px] text-slate-500 max-w-[240px] leading-relaxed">
                        <MapPin size={14} className="mr-3 mt-0.5 text-slate-300 flex-shrink-0" />
                        <span className="font-semibold line-clamp-2">{s.address}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border-2 ${
                        s.active 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {s.active ? <CheckCircle size={10} className="mr-1.5"/> : <XCircle size={10} className="mr-1.5"/>}
                        {s.active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => { setCurrentSupplier(s); setShowModal(true); }}
                        className="w-10 h-10 inline-flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-2 border-transparent hover:border-blue-100 rounded-2xl transition-all active:scale-90"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12 duration-500">
          <div className="bg-slate-900 text-white rounded-[2rem] px-8 py-5 flex items-center space-x-8 shadow-2xl shadow-slate-900/40 border border-slate-800">
            <div className="flex items-center space-x-4 border-r border-slate-700 pr-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                {selectedIds.length}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendors Selected</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowBulkModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-lg shadow-white/5"
              >
                <Settings2 size={16} />
                <span>Bulk Update</span>
              </button>
              
              <button 
                onClick={() => setSelectedIds([])}
                className="flex items-center space-x-2 px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white hover:bg-slate-700 transition-all active:scale-95"
              >
                <XUI size={16} />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full sm:max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-slate-900/30">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Bulk Vendor Registry Update</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Updating {selectedIds.length} Supplier Entries</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkModal(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-[1rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-90"
              >
                <XUI size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBulkUpdate} className="px-10 py-10 overflow-y-auto space-y-8 scrollbar-hide">
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-[1.5rem] flex items-start space-x-4">
                 <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                 <p className="text-xs font-bold text-blue-700 leading-relaxed">
                   Changes will be applied to all <span className="font-black underline">{selectedIds.length} selected vendors</span>. Only fields explicitly enabled below will be modified.
                 </p>
              </div>

              {/* Status Update Field */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-blue-600 rounded"
                      checked={bulkFieldsEnabled.active}
                      onChange={(e) => setBulkFieldsEnabled({...bulkFieldsEnabled, active: e.target.checked})}
                    />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Update Operational Status</span>
                  </label>
                </div>
                <div className={`transition-all duration-300 ${bulkFieldsEnabled.active ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none -translate-y-2'}`}>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-black text-slate-700 shadow-sm"
                    value={bulkUpdates.active === false ? 'inactive' : 'active'}
                    onChange={(e) => setBulkUpdates({...bulkUpdates, active: e.target.value === 'active'})}
                  >
                    <option value="active">Active (Available for PR/PO)</option>
                    <option value="inactive">Inactive (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Remark Update Field */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-blue-600 rounded"
                      checked={bulkFieldsEnabled.remark}
                      onChange={(e) => setBulkFieldsEnabled({...bulkFieldsEnabled, remark: e.target.checked})}
                    />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Update Strategic Remarks</span>
                  </label>
                </div>
                <div className={`transition-all duration-300 ${bulkFieldsEnabled.remark ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none -translate-y-2'}`}>
                  <textarea 
                    rows={3}
                    placeholder="New vendor classification or performance note..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-700 shadow-sm transition-all resize-none"
                    value={bulkUpdates.remark || ''}
                    onChange={(e) => setBulkUpdates({...bulkUpdates, remark: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-10 py-5 rounded-2xl text-slate-500 hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] transition-all order-2 sm:order-1 active:scale-95"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="px-14 py-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-600/30 active:scale-95 font-black text-xs uppercase tracking-[0.2em] order-1 sm:order-2 flex items-center justify-center space-x-3"
                >
                  <CheckCircle2 size={18} />
                  <span>Execute Bulk Patch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showModal && currentSupplier && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentSupplier.id ? 'Modify Profile' : 'Vendor Onboarding'}
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Sourcing Directory</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-90"
              >
                <XUI size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="px-10 py-10 overflow-y-auto space-y-8 scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Entity Registered Name *</label>
                <input 
                  placeholder="e.g. Precision HVAC Parts Ltd"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 focus:border-blue-500 focus:bg-white focus:outline-none font-black text-xl text-slate-900 shadow-sm transition-all" 
                  required
                  value={currentSupplier.name || ''}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Contact Email</label>
                  <input 
                    type="email"
                    placeholder="sales@precision.com"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-bold text-slate-700 shadow-sm transition-all" 
                    value={currentSupplier.email || ''}
                    onChange={(e) => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Direct Phone Line</label>
                  <input 
                    placeholder="+65 8888 1234"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-bold text-slate-700 shadow-sm transition-all" 
                    value={currentSupplier.phone || ''}
                    onChange={(e) => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Registered Address</label>
                <textarea 
                  rows={2}
                  placeholder="Street, Building, Unit Number..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-700 shadow-sm transition-all resize-none" 
                  value={currentSupplier.address || ''}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Strategic Remarks</label>
                <input 
                  placeholder="Primary vendor for Carrier compressors..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-700 shadow-sm transition-all" 
                  value={currentSupplier.remark || ''}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, remark: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 group">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    (currentSupplier.active ?? true) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {(currentSupplier.active ?? true) ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <label htmlFor="active-toggle" className="text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer">Account Status</label>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Active vendors appear in procurement flows</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  id="active-toggle"
                  className="w-6 h-6 accent-blue-600 rounded-lg cursor-pointer transition-transform active:scale-90"
                  checked={currentSupplier.active ?? true}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, active: e.target.checked})}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-10 py-5 rounded-2xl text-slate-500 hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] transition-all order-2 sm:order-1 active:scale-95"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="px-14 py-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-2xl shadow-slate-900/30 active:scale-95 font-black text-xs uppercase tracking-[0.2em] order-1 sm:order-2"
                >
                  Commit Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Re-using the X icon for UI consistency
const XUI = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default SuppliersPage;
