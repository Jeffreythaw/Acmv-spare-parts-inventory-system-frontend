
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { aiService } from '../services/ai';
import { useAuth } from '../context/AuthContext';
import { ReorderSuggestion, PR, PO, PRStatus, POStatus, Inventory, Supplier, UserRole } from '../types';
import { 
  ShoppingCart, Plus, FileCheck, Truck, Package, 
  ChevronRight, Check, X, Printer, Sparkles, 
  Loader2, AlertCircle, ShieldCheck, User, Clock,
  ArrowRightCircle, Eye, ChevronLeft, Calendar,
  DollarSign, Building2, Tag
} from 'lucide-react';
import { PR_STATUS_COLORS } from '../constants';

const PurchasingPage: React.FC = () => {
  const { user, isAdmin, isStorekeeper } = useAuth();
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'suggestions' | 'requests' | 'orders'>('suggestions');
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  
  // Detail View State
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  
  // Receive Modal State
  const [receivingPO, setReceivingPO] = useState<PO | null>(null);
  const [receiveData, setReceiveData] = useState<{inventoryId: string, qty: number, remark: string}[]>([]);
  
  // AI State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchData = async () => {
    const s = await api.getReorderSuggestions();
    const p = await api.getPRs();
    const o = await api.getPOs();
    const inv = await api.getInventory();
    const supps = await api.getSuppliers();
    setSuggestions(s);
    setPrs(p);
    setPos(o);
    setInventory(inv);
    setSuppliers(supps);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePRFromSuggestions = async () => {
    if (selectedSuggestions.length === 0) return;
    const items = suggestions.filter(s => selectedSuggestions.includes(s.inventoryId));
    
    await api.createPR({
      createdBy: user.name,
      lines: items.map(i => ({
        inventoryId: i.inventoryId,
        requestedQty: i.suggestedQty,
        suggestedSupplierId: i.preferredSupplierId
      }))
    });

    setSelectedSuggestions([]);
    fetchData();
    setActiveSubTab('requests');
  };

  const getAiAdvice = async () => {
    if (suggestions.length === 0) return;
    setIsAiLoading(true);
    const advice = await aiService.getReplenishmentAdvice(suggestions);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const approvePR = async (id: string) => {
    if (!isAdmin()) {
      alert("Only Admins can approve purchase requests.");
      return;
    }
    await api.updatePRStatus(id, PRStatus.APPROVED);
    fetchData();
  };

  const convertToPO = async (id: string) => {
    await api.createPOFromPR(id);
    fetchData();
    setActiveSubTab('orders');
  };

  const openReceiveModal = (po: PO) => {
    setReceivingPO(po);
    setReceiveData(po.lines.map(l => ({
      inventoryId: l.inventoryId,
      qty: l.orderedQty - l.receivedQty,
      remark: ''
    })));
  };

  const handleReceiveConfirm = async () => {
    if (!receivingPO) return;
    
    const lines = receiveData.filter(d => d.qty > 0).map(d => ({
      inventoryId: d.inventoryId,
      qtyReceived: d.qty,
      remark: d.remark
    }));

    if (lines.length === 0) {
      alert("Please specify at least one item to receive.");
      return;
    }

    try {
      await api.receivePO(receivingPO.id, lines);
      setReceivingPO(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getPartName = (id: string) => inventory.find(i => i.id === id)?.partName || id;
  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id;

  const selectedPO = pos.find(p => p.id === selectedPOId);

  // If viewing a PO detail, render that instead of the tab lists
  if (selectedPOId && selectedPO) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-12">
        <button 
          onClick={() => setSelectedPOId(null)}
          className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Direct Orders</span>
        </button>

        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{selectedPO.poNo}</h1>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-blue-50 text-blue-700 border-2 border-blue-100 shadow-sm`}>
                {selectedPO.status}
              </span>
            </div>
            <div className="flex items-center space-x-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="flex items-center"><User size={12} className="mr-2" /> {selectedPO.createdBy}</div>
              <div className="flex items-center"><Calendar size={12} className="mr-2" /> {new Date(selectedPO.createdAt).toLocaleDateString()}</div>
              <div className="flex items-center"><Truck size={12} className="mr-2" /> {getSupplierName(selectedPO.supplierId)}</div>
            </div>
          </div>
          <div className="flex gap-4">
            {selectedPO.status !== POStatus.CLOSED && (
              <button 
                onClick={() => openReceiveModal(selectedPO)}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                Verify Shipment
              </button>
            )}
            <button className="bg-white border-2 border-slate-100 text-slate-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center">
              <Printer size={16} className="mr-3" /> Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/20 overflow-hidden">
              <div className="px-10 py-7 border-b border-slate-100 flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">Ordered Items Manifest</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="px-10 py-6">Asset Specification</th>
                      <th className="px-6 py-6 text-center">Unit Cost</th>
                      <th className="px-6 py-6 text-center">Target Qty</th>
                      <th className="px-6 py-6 text-center">Progress</th>
                      <th className="px-10 py-6 text-right">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedPO.lines.map((line, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/60 transition-all">
                        <td className="px-10 py-6">
                          <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                            {getPartName(line.inventoryId)}
                          </div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            SKU: {line.inventoryId.substring(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-600 font-bold">
                            <DollarSign size={10} />
                            <span>{line.unitCost || '0.00'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-slate-900">
                          {line.orderedQty}
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="inline-flex items-center px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 uppercase">
                            {line.receivedQty} / {line.orderedQty}
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="text-xs font-bold text-slate-500">{line.eta || 'TBD'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200/60 space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Metadata</h4>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplier</div>
                    <div className="text-sm font-black text-slate-900">{getSupplierName(selectedPO.supplierId)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Tag size={20} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Category</div>
                    <div className="text-sm font-black text-slate-900">ACMV Componentry</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Order Value</div>
                    <div className="text-sm font-black text-blue-600">
                      ${selectedPO.lines.reduce((acc, curr) => acc + ((curr.unitCost || 0) * curr.orderedQty), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-200 space-y-4">
                <div className="bg-blue-600/5 p-6 rounded-2xl border border-blue-100 flex items-start space-x-3">
                  <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                    This PO is bound by existing vendor agreements. Any discrepancies must be logged via the "Verify Shipment" portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Re-use the Receive Modal if needed inside Detail view */}
        {receivingPO && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full sm:max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Process Manifest</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">ID: {receivingPO.poNo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReceivingPO(null)} 
                  className="w-12 h-12 flex items-center justify-center rounded-[1rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="px-10 py-10 overflow-y-auto space-y-8 scrollbar-hide">
                <div className="space-y-6">
                  {receivingPO.lines.map((line, idx) => {
                    const currentRec = receiveData.find(d => d.inventoryId === line.inventoryId);
                    const remaining = line.orderedQty - line.receivedQty;
                    
                    return (
                      <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 group hover:border-blue-200 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-lg font-black text-slate-900 leading-tight">{getPartName(line.inventoryId)}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center">
                              <ArrowRightCircle size={10} className="mr-1.5" /> Manifest Progress: {line.receivedQty} / {line.orderedQty}
                            </div>
                          </div>
                          <div className="bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black text-white shadow-lg shadow-blue-600/20 uppercase tracking-widest">
                            {remaining} Outstanding
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Receipt Volume</label>
                            <input 
                              type="number"
                              max={remaining}
                              className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-blue-500 focus:outline-none font-black text-xl text-slate-900 shadow-sm transition-all"
                              value={currentRec?.qty ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceiveData(prev => prev.map(d => d.inventoryId === line.inventoryId ? { ...d, qty: val } : d));
                              }}
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Discrepancy Note</label>
                            <input 
                              className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-blue-500 focus:outline-none font-bold text-sm text-slate-700 shadow-sm transition-all"
                              placeholder="e.g. Broken seal, overage..."
                              value={currentRec?.remark ?? ''}
                              onChange={(e) => {
                                setReceiveData(prev => prev.map(d => d.inventoryId === line.inventoryId ? { ...d, remark: e.target.value } : d));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setReceivingPO(null)}
                    className="px-10 py-5 rounded-2xl text-slate-500 hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] transition-all order-2 sm:order-1 active:scale-95"
                  >
                    Postpone
                  </button>
                  <button 
                    onClick={handleReceiveConfirm}
                    className="px-14 py-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-2xl shadow-slate-900/30 active:scale-95 font-black text-xs uppercase tracking-[0.2em] order-1 sm:order-2 flex items-center justify-center"
                  >
                    <Check size={20} className="mr-3" />
                    Finalize Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Dynamic Sub-Navigation */}
      <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm max-w-fit overflow-x-auto scrollbar-hide">
        {(['suggestions', 'requests', 'orders'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-8 py-3.5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeSubTab === tab 
              ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'suggestions' ? 'Procurement Pulse' : tab === 'requests' ? 'Purchase Requests' : 'Direct Orders'}
          </button>
        ))}
      </div>

      {activeSubTab === 'suggestions' && (
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                  <h3 className="text-2xl font-black tracking-tight flex items-center">
                    AI Replenishment Insight
                  </h3>
                </div>
                <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
                  Real-time inventory analysis against building safety levels. AI detects potential shortages before they impact site operations.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={getAiAdvice}
                  disabled={isAiLoading || suggestions.length === 0}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="animate-spin mr-3" size={16} /> : <Sparkles size={16} className="mr-3 text-blue-400" />}
                  Generate Strategy
                </button>
                <button 
                  disabled={selectedSuggestions.length === 0 || (!isAdmin() && !isStorekeeper())}
                  onClick={handleCreatePRFromSuggestions}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  Initiate PR ({selectedSuggestions.length})
                </button>
              </div>
            </div>
            
            {aiAdvice && (
              <div className="mt-8 p-6 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 rounded-xl p-2.5 flex-shrink-0 shadow-lg shadow-blue-600/30">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-blue-50/90 italic">
                    "{aiAdvice}"
                  </p>
                </div>
              </div>
            )}
            
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-10"></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/20">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-10 py-6 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg accent-blue-600"
                        onChange={(e) => setSelectedSuggestions(e.target.checked ? suggestions.map(s => s.inventoryId) : [])}
                        checked={selectedSuggestions.length === suggestions.length && suggestions.length > 0}
                      />
                    </th>
                    <th className="px-10 py-6">Target Asset & Location</th>
                    <th className="px-10 py-6 text-center">Health Metric</th>
                    <th className="px-10 py-6 text-center">Procure Target</th>
                    <th className="px-10 py-6">Primary Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {suggestions.length === 0 ? (
                    <tr><td colSpan={5} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center space-y-4">
                         <div className="p-6 bg-slate-50 rounded-full text-slate-200">
                           <ShieldCheck size={48} />
                         </div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">All stock levels optimal</span>
                      </div>
                    </td></tr>
                  ) : suggestions.map((s) => (
                    <tr key={s.inventoryId} className="hover:bg-slate-50/60 transition-all group">
                      <td className="px-10 py-6 text-center">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded-lg accent-blue-600"
                          checked={selectedSuggestions.includes(s.inventoryId)}
                          onChange={() => setSelectedSuggestions(prev => 
                            prev.includes(s.inventoryId) ? prev.filter(id => id !== s.inventoryId) : [...prev, s.inventoryId]
                          )}
                        />
                      </td>
                      <td className="px-10 py-6">
                        <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{s.partName}</div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 flex items-center">
                           <Package size={10} className="mr-1.5" />
                           {s.building}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <div className="inline-flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                          <span className="text-sm font-black text-rose-600">{s.quantityOnHand}</span>
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] text-slate-400 font-black">Min: {s.reorderPoint}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <div className="inline-flex items-center space-x-3">
                           <input 
                            type="number" 
                            defaultValue={s.suggestedQty}
                            className="w-20 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-center font-black text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                          />
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full inline-block">
                          {getSupplierName(s.preferredSupplierId || '') || 'Pending Choice'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-6 duration-700">
          {prs.length === 0 ? (
            <div className="bg-white border-4 border-dashed border-slate-100 p-24 rounded-[3rem] text-center">
              <FileCheck size={64} className="mx-auto text-slate-100 mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No active purchase requests in registry</p>
            </div>
          ) : prs.map((pr) => (
            <div key={pr.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/20 group hover:shadow-2xl transition-all relative overflow-hidden">
               {pr.status === PRStatus.APPROVED && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>}
               <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
                <div className="flex-1 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      <div className="bg-blue-50 text-blue-600 p-4 rounded-3xl border border-blue-100 shadow-sm">
                        <FileCheck size={28} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{pr.prNo}</span>
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-2 shadow-sm ${PR_STATUS_COLORS[pr.status]}`}>
                            {pr.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center">
                          <User size={12} className="mr-2" /> {pr.createdBy} <span className="mx-3 text-slate-200">|</span> <Clock size={12} className="mr-2" /> {new Date(pr.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {pr.lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:border-blue-100 transition-all">
                        <div>
                          <div className="text-sm font-black text-slate-900">{getPartName(line.inventoryId)}</div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Catalog ID: {line.inventoryId}</div>
                        </div>
                        <div className="text-xl font-black text-slate-900 px-5 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                          {line.requestedQty}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:w-72 flex flex-col justify-end gap-4 lg:pl-12 lg:border-l lg:border-slate-100">
                  {pr.status === PRStatus.DRAFT && (
                    <button 
                      onClick={() => approvePR(pr.id)}
                      disabled={!isAdmin()}
                      className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={20} className="mr-3" />
                      Approve Request
                    </button>
                  )}
                  {pr.status === PRStatus.APPROVED && (
                    <button 
                      onClick={() => convertToPO(pr.id)}
                      className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 flex items-center justify-center transition-all active:scale-95"
                    >
                      <ShoppingCart size={20} className="mr-3" />
                      Generate PO
                    </button>
                  )}
                  {!isAdmin() && pr.status === PRStatus.DRAFT && (
                    <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                       <ShieldCheck size={16} />
                       <span className="text-[9px] font-black uppercase leading-tight">Awaiting Administrative Approval</span>
                    </div>
                  )}
                  <button className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center">
                    <X size={16} className="mr-2" /> Void Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'orders' && (
        <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-6 duration-700">
          {pos.length === 0 ? (
            <div className="bg-white border-4 border-dashed border-slate-100 p-24 rounded-[3rem] text-center">
              <Truck size={64} className="mx-auto text-slate-100 mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No active orders in shipping pipe</p>
            </div>
          ) : pos.map((po) => (
            <div key={po.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-3 h-full bg-blue-600"></div>
              <div className="flex flex-col lg:flex-row justify-between gap-12">
                <div className="flex-1 space-y-8">
                  <div className="flex items-center space-x-5">
                    <div className="bg-indigo-50 text-indigo-600 p-4 rounded-3xl border border-indigo-100 shadow-sm">
                      <Truck size={28} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{po.poNo}</span>
                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-blue-50 text-blue-700 border-2 border-blue-100 shadow-sm">
                          {po.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center">
                        <User size={12} className="mr-2" /> Supplier: <span className="text-slate-600 px-1 font-black">{getSupplierName(po.supplierId)}</span> <span className="mx-3 text-slate-200">|</span> <Clock size={12} className="mr-2" /> Launched: {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/50 border-b border-slate-100">
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <th className="px-6 py-4">Sourcing Asset</th>
                          <th className="px-6 py-4 text-right">Target</th>
                          <th className="px-6 py-4 text-right">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {po.lines.slice(0, 3).map((l, i) => (
                          <tr key={i} className="text-slate-700 hover:bg-white transition-colors">
                            <td className="px-6 py-4">{getPartName(l.inventoryId)}</td>
                            <td className="px-6 py-4 text-right font-black">{l.orderedQty}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${l.receivedQty >= l.orderedQty ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {l.receivedQty} RECEIVED
                              </span>
                            </td>
                          </tr>
                        ))}
                        {po.lines.length > 3 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase text-center">
                              + {po.lines.length - 3} more items...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:w-72 flex flex-col justify-end gap-4 lg:pl-12 lg:border-l lg:border-slate-100">
                  <button 
                    onClick={() => setSelectedPOId(po.id)}
                    className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
                  >
                    <Eye size={18} className="mr-3 text-blue-600" /> View Detailed PO
                  </button>
                  {po.status !== POStatus.CLOSED && (
                    <button 
                      onClick={() => openReceiveModal(po)}
                      className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-2xl shadow-slate-900/30 flex items-center justify-center transition-all active:scale-95"
                    >
                      <Package size={20} className="mr-3" />
                      Verify Shipment
                    </button>
                  )}
                  <button className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center">
                    <Printer size={18} className="mr-3" /> Generate Manifest
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receive Items Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Process Manifest</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">ID: {receivingPO.poNo}</p>
                </div>
              </div>
              <button 
                onClick={() => setReceivingPO(null)} 
                className="w-12 h-12 flex items-center justify-center rounded-[1rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-90"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="px-10 py-10 overflow-y-auto space-y-8 scrollbar-hide">
              <div className="space-y-6">
                {receivingPO.lines.map((line, idx) => {
                  const currentRec = receiveData.find(d => d.inventoryId === line.inventoryId);
                  const remaining = line.orderedQty - line.receivedQty;
                  
                  return (
                    <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 group hover:border-blue-200 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-black text-slate-900 leading-tight">{getPartName(line.inventoryId)}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center">
                            <ArrowRightCircle size={10} className="mr-1.5" /> Manifest Progress: {line.receivedQty} / {line.orderedQty}
                          </div>
                        </div>
                        <div className="bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black text-white shadow-lg shadow-blue-600/20 uppercase tracking-widest">
                          {remaining} Outstanding
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Receipt Volume</label>
                          <input 
                            type="number"
                            max={remaining}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-blue-500 focus:outline-none font-black text-xl text-slate-900 shadow-sm transition-all"
                            value={currentRec?.qty ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setReceiveData(prev => prev.map(d => d.inventoryId === line.inventoryId ? { ...d, qty: val } : d));
                            }}
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Discrepancy Note</label>
                          <input 
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-blue-500 focus:outline-none font-bold text-sm text-slate-700 shadow-sm transition-all"
                            placeholder="e.g. Broken seal, overage..."
                            value={currentRec?.remark ?? ''}
                            onChange={(e) => {
                              setReceiveData(prev => prev.map(d => d.inventoryId === line.inventoryId ? { ...d, remark: e.target.value } : d));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  className="px-10 py-5 rounded-2xl text-slate-500 hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] transition-all order-2 sm:order-1 active:scale-95"
                >
                  Postpone
                </button>
                <button 
                  onClick={handleReceiveConfirm}
                  className="px-14 py-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-2xl shadow-slate-900/30 active:scale-95 font-black text-xs uppercase tracking-[0.2em] order-1 sm:order-2 flex items-center justify-center"
                >
                  <Check size={20} className="mr-3" />
                  Finalize Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasingPage;
