
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StockTxn, TxnType, Inventory } from '../types';
import { 
  Plus, Download, ArrowUpRight, ArrowDownRight, 
  RefreshCcw, Clock, User, Hash, Box, X,
  AlertCircle, ShieldCheck, ChevronDown, ChevronUp,
  Activity, ArrowRight, Pencil, Trash2
} from 'lucide-react';

const REASON_CODES = [
  'Scheduled Maintenance',
  'Corrective Maintenance',
  'Emergency Breakdown',
  'Stock Replenishment',
  'Stock Adjustment',
  'Return to Store',
];

const DOCUMENT_TYPES = ['Work Order', 'Delivery Order', 'Gate Pass', 'Service Report', 'Manual Entry'];

const TransactionPage: React.FC = () => {
  const { user, isAdmin, isTechnician } = useAuth();
  const [txns, setTxns] = useState<StockTxn[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(new Set());
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  
  const [type, setType] = useState<TxnType>(TxnType.ISSUE);
  const [reference, setReference] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [remark, setRemark] = useState('');
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]);
  const [sourceLocation, setSourceLocation] = useState('Main Store');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [documentNo, setDocumentNo] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [t, i] = await Promise.all([api.getTransactions(), api.getInventory()]);
    setTxns(t);
    setInventory(i);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setType(TxnType.ISSUE);
    setReference('');
    setCounterparty('');
    setRemark('');
    setReasonCode(REASON_CODES[0]);
    setSourceLocation('Main Store');
    setDestinationLocation('');
    setDocumentType(DOCUMENT_TYPES[0]);
    setDocumentNo('');
    setApprovedBy('');
    setSelectedItem('');
    setQty(1);
    setEditingTxnId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (txn: StockTxn) => {
    const firstLine = txn.lines[0];
    setEditingTxnId(txn.id);
    setType(txn.txnType);
    setReference(txn.reference || '');
    setCounterparty(txn.counterparty || '');
    setRemark(txn.remark || '');
    setReasonCode(txn.reasonCode || REASON_CODES[0]);
    setSourceLocation(txn.sourceLocation || 'Main Store');
    setDestinationLocation(txn.destinationLocation || '');
    setDocumentType(txn.documentType || DOCUMENT_TYPES[0]);
    setDocumentNo(txn.documentNo || '');
    setApprovedBy(txn.approvedBy || '');
    setSelectedItem(firstLine?.inventoryId || '');
    setQty(firstLine?.qty || 1);
    setShowModal(true);
  };

  const handleDeleteTxn = async (txnId: string) => {
    if (!isAdmin()) return;
    if (!window.confirm('Delete this movement record? Inventory balances will be reverted.')) return;
    await api.deleteTransaction(txnId);
    fetchData();
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedTxnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTxnIds(next);
  };

  const getPartName = (id: string) => {
    return inventory.find(i => i.id === id)?.partName || 'Unknown Asset';
  };

  const getInventoryItem = (id: string) => inventory.find(i => i.id === id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || qty <= 0) return;
    try {
      const payload = {
        txnType: type,
        performedBy: user.name,
        counterparty: counterparty || 'Internal',
        reference: reference || 'N/A',
        remark: remark || '',
        reasonCode,
        sourceLocation: sourceLocation || 'Main Store',
        destinationLocation: destinationLocation || 'N/A',
        documentType,
        documentNo: documentNo || 'N/A',
        approvedBy: approvedBy || 'N/A',
        lines: [{ inventoryId: selectedItem, qty, beforeQty: 0, afterQty: 0 }]
      };
      if (editingTxnId) {
        await api.updateTransaction(editingTxnId, payload);
      } else {
        await api.createTransaction(payload);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const getTxnIcon = (type: TxnType) => {
    switch(type) {
      case TxnType.ISSUE: return <ArrowUpRight size={18} />;
      case TxnType.RECEIVE: return <ArrowDownRight size={18} />;
      case TxnType.RETURN: return <ArrowDownRight size={18} />;
      case TxnType.ADJUSTMENT: return <RefreshCcw size={18} />;
    }
  };

  const getTxnColor = (type: TxnType) => {
    switch(type) {
      case TxnType.ISSUE: return 'bg-amber-50 text-amber-600 border-amber-100';
      case TxnType.RECEIVE: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case TxnType.RETURN: return 'bg-blue-50 text-blue-600 border-blue-100';
      case TxnType.ADJUSTMENT: return 'bg-purple-50 text-purple-600 border-purple-100';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">Movement Log</h1>
          <p className="text-slate-500 font-medium text-xs">Real-time audit trail of all stock transitions.</p>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
          {(!isTechnician() || isAdmin()) && (
            <button 
              onClick={openCreateModal}
              className="flex-1 lg:flex-none flex items-center justify-center space-x-3 bg-slate-900 text-white px-8 py-4 rounded-2xl transition-all shadow-xl font-black text-xs uppercase tracking-widest"
            >
              <Plus size={18} />
              <span>Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-10 py-6 w-16"></th>
              <th className="px-10 py-6">Timestamp</th>
              <th className="px-10 py-6">Type</th>
              <th className="px-10 py-6">Reference</th>
              <th className="px-10 py-6">Actor & Flow</th>
              <th className="px-10 py-6 text-right">Volume</th>
              {isAdmin() && <th className="px-10 py-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {txns.map((txn) => {
              const isExpanded = expandedTxnIds.has(txn.id);
              return (
                <React.Fragment key={txn.id}>
                  <tr className={`hover:bg-slate-50 transition-all cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => toggleExpand(txn.id)}>
                    <td className="px-10 py-6">
                      <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={18} className="text-slate-300" />
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-sm font-black text-slate-900">{new Date(txn.txnTime).toLocaleDateString()}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(txn.txnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`inline-flex items-center px-4 py-1.5 rounded-xl border ${getTxnColor(txn.txnType)} text-[9px] font-black uppercase tracking-widest`}>
                        <span className="mr-1.5">{getTxnIcon(txn.txnType)}</span> {txn.txnType}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-xs font-mono font-bold text-slate-600">{txn.reference}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {txn.documentType || 'Doc'}: {txn.documentNo || 'N/A'}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-xs font-black text-slate-900">{txn.counterparty}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {txn.sourceLocation || 'N/A'} → {txn.destinationLocation || 'N/A'}
                      </div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        By: {txn.performedBy.split(' ')[0]} • Approved: {(txn.approvedBy || 'N/A').split(' ')[0]}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-lg">{txn.lines.reduce((acc, l) => acc + l.qty, 0)}</td>
                    {isAdmin() && (
                      <td className="px-10 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(txn); }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTxn(txn.id); }}
                            className="p-2 bg-white border border-red-200 rounded-lg text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/50 animate-in slide-in-from-top-1 duration-300">
                      <td colSpan={isAdmin() ? 7 : 6} className="px-10 py-8">
                        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-black uppercase tracking-widest">
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-500">
                            Reason: <span className="text-slate-900">{txn.reasonCode || 'N/A'}</span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-500">
                            Doc: <span className="text-slate-900">{txn.documentType || 'N/A'} #{txn.documentNo || 'N/A'}</span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-500">
                            Note: <span className="text-slate-900">{txn.remark || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <tr>
                                <th className="px-8 py-4 italic">Movement Details</th>
                                <th className="px-8 py-4 text-center">Unit Volume</th>
                                <th className="px-8 py-4 text-center">Before Qty</th>
                                <th className="px-8 py-4 text-center">After Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                              {txn.lines.map((line, idx) => (
                                <tr key={idx}>
                                  <td className="px-8 py-4 font-black text-slate-800">{getPartName(line.inventoryId)}</td>
                                  <td className="px-8 py-4 text-center font-bold text-slate-600">{line.qty}</td>
                                  <td className="px-8 py-4 text-center font-bold text-slate-400">{line.beforeQty}</td>
                                  <td className="px-8 py-4 text-center font-black text-blue-600">{line.afterQty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-black text-xs uppercase animate-pulse">Hydrating Logs...</div>
        ) : txns.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-black text-xs uppercase">No Movements Recorded</div>
        ) : txns.map((txn) => {
          const isExpanded = expandedTxnIds.has(txn.id);
          return (
            <div key={txn.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden transition-all">
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${txn.txnType === 'ISSUE' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
               <div className="flex justify-between items-start mb-3">
                 <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${getTxnColor(txn.txnType)} text-[8px] font-black uppercase tracking-widest`}>
                    <span className="mr-1">{getTxnIcon(txn.txnType)}</span> {txn.txnType}
                 </div>
                 <div className="text-[10px] font-black text-slate-400">{new Date(txn.txnTime).toLocaleDateString()} • {new Date(txn.txnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
               </div>
               <div className="flex justify-between items-end mb-4">
                 <div>
                    <div className="text-xs font-black text-slate-900">{txn.counterparty}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref: {txn.reference}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{txn.sourceLocation || 'N/A'} → {txn.destinationLocation || 'N/A'}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{txn.reasonCode || 'N/A'}</div>
                 </div>
                 <div className="text-right">
                    <div className="text-xl font-black text-slate-900">{txn.lines.reduce((acc, l) => acc + l.qty, 0)}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Units Moved</div>
                 </div>
               </div>
               {isAdmin() && (
                 <div className="mb-3 flex gap-2">
                   <button
                     onClick={(e) => { e.stopPropagation(); openEditModal(txn); }}
                     className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600"
                   >
                     <Pencil size={12} />
                     Edit
                   </button>
                   <button
                     onClick={(e) => { e.stopPropagation(); handleDeleteTxn(txn.id); }}
                     className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-red-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-600"
                   >
                     <Trash2 size={12} />
                     Delete
                   </button>
                 </div>
               )}

               {/* Mobile Expansion Section */}
               <button 
                onClick={() => toggleExpand(txn.id)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all"
               >
                 <span>{isExpanded ? 'Hide Details' : 'Audit Trace Details'}</span>
                 <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                   <ChevronDown size={14} />
                 </div>
               </button>

               {isExpanded && (
                 <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                   {txn.lines.map((line, idx) => (
                     <div key={idx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                       <div className="font-black text-[11px] text-slate-900 border-b border-slate-100 pb-2">{getPartName(line.inventoryId)}</div>
                       <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Before</div>
                            <div className="bg-white px-4 py-1.5 rounded-lg border border-slate-100 font-bold text-xs text-center">{line.beforeQty}</div>
                         </div>
                         <ArrowRight size={14} className="text-slate-300 mx-2" />
                         <div className="space-y-1">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">After</div>
                            <div className="bg-blue-600 px-4 py-1.5 rounded-lg text-white font-black text-xs text-center">{line.afterQty}</div>
                         </div>
                         <div className="space-y-1 ml-4">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Moved</div>
                            <div className="bg-slate-900 px-4 py-1.5 rounded-lg text-white font-black text-xs text-center">{line.qty}</div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 lg:p-6 animate-in fade-in">
          <div className="bg-white w-full lg:max-w-2xl rounded-t-[2.5rem] lg:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-500">
             <div className="p-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center mb-2">
                   <div className="font-black text-slate-900 uppercase tracking-widest text-xs">{editingTxnId ? 'Edit Movement' : 'Record Movement'}</div>
                   <button onClick={() => { setShowModal(false); resetForm(); }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[TxnType.ISSUE, TxnType.RETURN, TxnType.ADJUSTMENT].map(t => (
                      <button key={t} type="button" onClick={() => setType(t)} className={`px-5 py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all whitespace-nowrap ${type === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" required value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                    <option value="">Select Asset...</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.partName} ({i.quantityOnHand})</option>)}
                  </select>
                  {selectedItem && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Available: <span className="text-slate-900">{getInventoryItem(selectedItem)?.quantityOnHand ?? 0}</span> {getInventoryItem(selectedItem)?.unit || 'unit'}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" min={1} className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-black text-xl" placeholder="Qty" required value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} />
                    <input className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Ref ID" value={reference} onChange={e => setReference(e.target.value)} />
                  </div>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Counterparty / Team / Vendor" value={counterparty} onChange={e => setCounterparty(e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <input className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Source Location" value={sourceLocation} onChange={e => setSourceLocation(e.target.value)} />
                    <input className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Destination Location" value={destinationLocation} onChange={e => setDestinationLocation(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" value={reasonCode} onChange={e => setReasonCode(e.target.value)}>
                      {REASON_CODES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" value={documentType} onChange={e => setDocumentType(e.target.value)}>
                      {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Document Number" value={documentNo} onChange={e => setDocumentNo(e.target.value)} />
                    <input className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold" placeholder="Approved By" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} />
                  </div>
                  <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold min-h-24" placeholder="Movement note / incident context" value={remark} onChange={e => setRemark(e.target.value)} />
                  <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest">
                    {editingTxnId ? 'Update Movement' : 'Commit Movement'}
                  </button>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionPage;
