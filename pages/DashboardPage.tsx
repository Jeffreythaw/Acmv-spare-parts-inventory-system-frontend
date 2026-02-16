
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import { Criticality, Inventory, PartStatus, TxnType } from '../types';
import { 
  Package, AlertCircle, ShoppingCart, Clock, ArrowUpRight, ArrowDownRight, 
  RefreshCw, Activity, ShieldCheck, Timer, Truck, TrendingUp, Zap, PieChart,
  CircleDot, Building2, Target, Layers, Workflow, Gauge
} from 'lucide-react';
import { BUILDINGS } from '../constants';

const DonutChart = ({
  data,
  centerLabel,
  centerSubLabel
}: {
  data: { label: string, value: number, color: string }[];
  centerLabel?: string;
  centerSubLabel?: string;
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="relative w-48 h-48 lg:w-64 lg:h-64 mx-auto lg:mx-0">
      <svg viewBox="-1.1 -1.1 2.2 2.2" className="transform -rotate-90 w-full h-full">
        {total === 0 ? (
          <circle cx="0" cy="0" r="1" fill="transparent" stroke="#f1f5f9" strokeWidth="0.2" />
        ) : (
          data.map((slice, i) => {
            if (slice.value === 0) return null;
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            const slicePercent = slice.value / total;
            cumulativePercent += slicePercent;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(' ');

            return (
              <path
                key={i}
                d={pathData}
                fill={slice.color}
                className="transition-all duration-500 hover:opacity-80 cursor-pointer stroke-white stroke-[0.02]"
              />
            );
          })
        )}
        <circle cx="0" cy="0" r="0.75" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter">{centerLabel ?? total}</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{centerSubLabel ?? 'Live Assets'}</span>
      </div>
    </div>
  );
};

const BuildingBarChart = ({ inventory }: { inventory: Inventory[] }) => {
  const buildingData = useMemo(() => {
    const counts: Record<string, number> = {};
    BUILDINGS.forEach(b => counts[b] = 0);
    inventory.forEach(i => {
      if (counts[i.building] !== undefined) counts[i.building]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count, percent: (count / max) * 100 }));
  }, [inventory]);

  return (
    <div className="space-y-4">
      {buildingData.map((item, idx) => (
        <div key={idx} className="space-y-2 group">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>{item.name}</span>
            <span className="text-slate-900">{item.count} SKU</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-blue-600 shadow-lg transition-all duration-1000 ease-out group-hover:bg-blue-500" 
              style={{ width: `${item.percent}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const [s, t, i] = await Promise.all([
      api.getSummary(), 
      api.getTransactions(), 
      api.getInventory()
    ]);
    setSummary(s);
    setRecentTxns(t.slice(0, 6));
    setAllTxns(t);
    setInventory(i);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statusDistribution = useMemo(() => {
    const counts = {
      [PartStatus.Spare]: 0,
      [PartStatus.Installed]: 0,
      [PartStatus.Faulty]: 0,
      [PartStatus.Obsolete]: 0,
    };
    inventory.forEach(item => {
      counts[item.status]++;
    });

    return [
      { label: 'Inventory', value: counts[PartStatus.Spare], color: '#10b981' }, 
      { label: 'Active Use', value: counts[PartStatus.Installed], color: '#3b82f6' }, 
      { label: 'Faulty', value: counts[PartStatus.Faulty], color: '#f43f5e' }, 
      { label: 'Obsolete', value: counts[PartStatus.Obsolete], color: '#94a3b8' }, 
    ];
  }, [inventory]);

  const criticalityDistribution = useMemo(() => {
    const counts: Record<Criticality, number> = {
      [Criticality.HIGH]: 0,
      [Criticality.MEDIUM]: 0,
      [Criticality.LOW]: 0,
    };

    inventory.forEach(item => {
      const level = item.criticality ?? Criticality.MEDIUM;
      counts[level]++;
    });

    return [
      { label: 'High', value: counts[Criticality.HIGH], color: '#ef4444' },
      { label: 'Medium', value: counts[Criticality.MEDIUM], color: '#f59e0b' },
      { label: 'Low', value: counts[Criticality.LOW], color: '#22c55e' },
    ];
  }, [inventory]);

  const txnTypeDistribution = useMemo(() => {
    const counts: Record<TxnType, number> = {
      [TxnType.ISSUE]: 0,
      [TxnType.RETURN]: 0,
      [TxnType.RECEIVE]: 0,
      [TxnType.ADJUSTMENT]: 0,
    };

    allTxns.forEach(txn => {
      const txnType = txn.txnType as TxnType;
      if (counts[txnType] !== undefined) counts[txnType]++;
    });

    return [
      { label: 'Issue', value: counts[TxnType.ISSUE], color: '#f97316' },
      { label: 'Receive', value: counts[TxnType.RECEIVE], color: '#14b8a6' },
      { label: 'Return', value: counts[TxnType.RETURN], color: '#6366f1' },
      { label: 'Adjust', value: counts[TxnType.ADJUSTMENT], color: '#a855f7' },
    ];
  }, [allTxns]);

  const supplementalKpis = useMemo(() => {
    const serviceable = inventory.filter(item => item.status === PartStatus.Spare || item.status === PartStatus.Installed).length;
    const highCritical = criticalityDistribution.find(item => item.label === 'High')?.value ?? 0;
    const activeBuildings = new Set(inventory.map(item => item.building)).size;
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const movement7d = allTxns.filter(txn => new Date(txn.txnTime).getTime() >= weekAgo).length;
    const totalItems = summary?.totalItems ?? 0;

    return [
      {
        label: 'Serviceable Assets',
        value: serviceable,
        helper: `${totalItems ? Math.round((serviceable / totalItems) * 100) : 0}% of registry`,
        icon: <Gauge size={18} />,
        style: 'text-sky-600 bg-sky-50 border-sky-100'
      },
      {
        label: 'High Critical Risk',
        value: highCritical,
        helper: 'Needs buffer validation',
        icon: <Target size={18} />,
        style: 'text-rose-600 bg-rose-50 border-rose-100'
      },
      {
        label: 'Active Buildings',
        value: activeBuildings,
        helper: `${BUILDINGS.length} monitored zones`,
        icon: <Building2 size={18} />,
        style: 'text-indigo-600 bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Movements (7d)',
        value: movement7d,
        helper: 'Operational throughput',
        icon: <Workflow size={18} />,
        style: 'text-emerald-600 bg-emerald-50 border-emerald-100'
      },
    ];
  }, [inventory, allTxns, criticalityDistribution, summary]);

  if (isLoading || !summary) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Aggregating Ops Telemetry...</p>
    </div>
  );

  const stats = [
    { label: 'Total Registry', value: summary.totalItems, icon: <Package size={20} />, color: 'blue', border: 'border-blue-100', text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Stock Alerts', value: summary.lowStockCount, icon: <AlertCircle size={20} />, color: 'rose', border: 'border-rose-100', text: 'text-rose-600', bg: 'bg-rose-50', alert: summary.lowStockCount > 0 },
    { label: 'PR Pipeline', value: summary.openPRs, icon: <Clock size={20} />, color: 'amber', border: 'border-amber-100', text: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Vendor Supply', value: summary.pendingPOs, icon: <ShoppingCart size={20} />, color: 'emerald', border: 'border-emerald-100', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
             <div className="h-10 w-2 bg-blue-600 rounded-full"></div>
             <h1 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase italic">Control Panel</h1>
          </div>
          <p className="text-slate-500 font-bold text-xs lg:text-sm tracking-[0.2em] uppercase mt-1 pl-5">Precision ACMV Logistics Telemetry v3.0</p>
        </div>
        <button 
          onClick={fetchData} 
          className="w-full md:w-auto flex items-center justify-center space-x-3 bg-white px-8 py-5 rounded-[2rem] border-2 border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-xl shadow-slate-200/20 active:scale-95 group"
        >
          <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-[11px] font-black uppercase tracking-widest">Resync Core</span>
        </button>
      </div>

      {/* Telemetry Matrix Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-8 lg:p-12 rounded-[3rem] border-2 ${stat.border} shadow-2xl shadow-slate-200/20 group relative overflow-hidden transition-all hover:-translate-y-2`}>
             <div className="flex justify-between items-start mb-12 relative z-10">
                <div className={`p-5 ${stat.bg} ${stat.text} rounded-[1.5rem] shadow-inner`}>
                  {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 24 })}
                </div>
                {stat.alert && (
                   <div className="flex items-center space-x-2 bg-rose-600 px-3 py-1.5 rounded-xl shadow-lg shadow-rose-600/30 animate-pulse">
                     <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                     <span className="text-[9px] font-black text-white uppercase tracking-widest">Danger</span>
                   </div>
                )}
             </div>
             <div className="relative z-10">
                <div className="text-5xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</div>
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-5">{stat.label}</div>
             </div>
             <div className="absolute -right-8 -bottom-8 text-slate-50 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 200 })}
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {supplementalKpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-[1.75rem] border p-6 ${kpi.style} bg-white shadow-lg shadow-slate-200/30`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{kpi.label}</span>
              <span className="p-2 rounded-xl border border-current/20">{kpi.icon}</span>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight">{kpi.value}</div>
            <p className="mt-2 text-[11px] font-bold text-slate-500">{kpi.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="text-blue-600" size={18} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Status Mix</h3>
          </div>
          <DonutChart data={statusDistribution} centerSubLabel="Status" />
          <div className="mt-4 space-y-2">
            {statusDistribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}
                </span>
                <span className="font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-rose-600" size={18} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Criticality Mix</h3>
          </div>
          <DonutChart data={criticalityDistribution} centerSubLabel="Criticality" />
          <div className="mt-4 space-y-2">
            {criticalityDistribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}
                </span>
                <span className="font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-emerald-600" size={18} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Txn Mix</h3>
          </div>
          <DonutChart data={txnTypeDistribution} centerSubLabel="Transactions" />
          <div className="mt-4 space-y-2">
            {txnTypeDistribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}
                </span>
                <span className="font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Asset Distribution Card with Graphic Charts */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[3.5rem] p-10 lg:p-16 shadow-2xl shadow-slate-200/30 relative overflow-hidden">
           <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
              <div className="flex-shrink-0 space-y-10 w-full lg:w-auto text-center lg:text-left">
                 <div className="space-y-2">
                    <div className="inline-flex items-center space-x-3 text-blue-600 mb-2">
                      <PieChart size={20} />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Lifecycle Distribution</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Registry Status Ratios</p>
                 </div>
                 <DonutChart data={statusDistribution} />
              </div>
              
              <div className="flex-1 w-full space-y-10">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {statusDistribution.map((item, idx) => (
                      <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between hover:bg-white hover:border-blue-200 transition-all group cursor-pointer">
                         <div className="flex items-center space-x-5">
                            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color }}></div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</div>
                              <div className="text-2xl font-black text-slate-900 mt-1">{item.value} <span className="text-[10px] text-slate-300 font-bold ml-1 uppercase">Units</span></div>
                            </div>
                         </div>
                         <ArrowUpRight size={18} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                      </div>
                    ))}
                 </div>
                 
                 <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl shadow-blue-600/40 relative overflow-hidden group">
                    <div className="relative z-10">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Grid Reliability</h4>
                       <p className="text-2xl font-black tracking-tight mt-1 italic uppercase">99.4% Operational Up-time</p>
                    </div>
                    <Activity size={32} className="opacity-40 animate-pulse relative z-10" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                 </div>
              </div>
           </div>
        </div>

        {/* Building Density & AI Insight */}
        <div className="lg:col-span-4 space-y-10">
           {/* Building Bar Chart */}
           <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/20 space-y-8">
              <div className="flex items-center space-x-4">
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Building2 size={24} /></div>
                 <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Building Density</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Asset Distribution per zone</p>
                 </div>
              </div>
              <BuildingBarChart inventory={inventory} />
           </div>

           {/* AI Prediction Module */}
           <div className="bg-slate-900 rounded-[3.5rem] p-12 text-center relative overflow-hidden shadow-2xl group min-h-[420px] flex flex-col justify-center border-4 border-slate-800">
             <div className="relative z-10">
                <div className="inline-flex p-6 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-[2rem] mb-10 shadow-3xl shadow-blue-600/50 group-hover:scale-110 transition-transform duration-500">
                   <Zap size={40} className="text-white fill-white/20" />
                </div>
                <h3 className="text-3xl font-black text-white mb-5 tracking-tighter uppercase italic">AI Intelligence</h3>
                <p className="text-slate-400 text-[11px] mb-12 leading-relaxed font-bold px-6 tracking-wide">
                  Neural analysis identifies <span className="text-blue-400 underline decoration-blue-400/40">{summary.lowStockCount} critical depletion vectors</span> affecting HVAC efficiency in Tower B.
                </p>
                <button className="w-full bg-white text-slate-900 py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-50 transition-all active:scale-95 shadow-2xl">
                  Run Diagnostics
                </button>
             </div>
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600 rounded-full blur-[80px] opacity-10 -ml-24 -mb-24"></div>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-start">
        {/* Recent Transaction Feed */}
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center space-x-4">
                 <HistoryIcon size={20} className="text-blue-600" />
                 <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Transaction Registry</h3>
              </div>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-5 py-2 rounded-xl transition-all">Audit Archive</button>
           </div>
           
           <div className="bg-white border-2 border-slate-100 rounded-[3.5rem] shadow-2xl shadow-slate-200/10 overflow-hidden">
             <div className="divide-y divide-slate-100">
               {recentTxns.length === 0 ? (
                 <div className="p-24 text-center">
                   <CircleDot className="mx-auto text-slate-100 mb-6" size={56} />
                   <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">No Movements Recorded</p>
                 </div>
               ) : recentTxns.map((txn) => (
                 <div key={txn.id} className="px-12 py-8 flex items-center justify-between hover:bg-slate-50/80 transition-all cursor-pointer group">
                   <div className="flex items-center space-x-8">
                     <div className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] border-2 ${getTxnColor(txn.txnType)} shadow-xl shadow-slate-200/10 group-hover:scale-110 transition-transform`}>
                       {txn.txnType === 'ISSUE' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                     </div>
                     <div>
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{new Date(txn.txnTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                       <div className="text-lg font-black text-slate-900 uppercase tracking-tight">{txn.txnType} • <span className="text-slate-400 font-bold">#{txn.reference}</span></div>
                     </div>
                   </div>
                   <div className="text-right space-y-2">
                     <div className="text-2xl font-black text-slate-900">{txn.lines[0].qty} <span className="text-[11px] text-slate-400 uppercase tracking-widest ml-1">Items</span></div>
                     <div className="inline-block text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">Verified System Log</div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Efficiency Analytics Grid */}
        <div className="lg:col-span-4 space-y-8">
           <div className="flex items-center space-x-4 px-4">
              <TrendingUp className="text-emerald-600" size={20} />
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">SLA Analytics</h3>
           </div>

           <div className="grid grid-cols-1 gap-8">
              <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/10 space-y-8 hover:border-blue-100 transition-colors">
                 <div className="flex justify-between items-center">
                    <div className="p-5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><Truck size={28} /></div>
                    <div className="text-right">
                       <div className="text-4xl font-black text-slate-900 tracking-tighter">{summary.onTimeDeliveryRate}%</div>
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Vendor Compliance</div>
                    </div>
                 </div>
                 <div className="w-full h-4 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                    <div className="h-full bg-indigo-600 shadow-xl shadow-indigo-600/20" style={{ width: `${summary.onTimeDeliveryRate}%` }}></div>
                 </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/10 space-y-8 hover:border-emerald-100 transition-colors">
                 <div className="flex justify-between items-center">
                    <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><ShieldCheck size={28} /></div>
                    <div className="text-right">
                       <div className="text-4xl font-black text-slate-900 tracking-tighter">98.1%</div>
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Inventory Integrity</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                       <div key={i} className={`h-3 flex-1 rounded-full transition-all duration-700 ${i <= 9 ? 'bg-emerald-500 shadow-md' : 'bg-slate-100'}`}></div>
                    ))}
                 </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-10 rounded-[3rem] text-white shadow-3xl shadow-indigo-900/30 flex items-center justify-between border-4 border-indigo-800/50 group">
                 <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-70">Audit Cycle Time</div>
                    <div className="text-4xl font-black tracking-tight group-hover:scale-105 transition-transform">{summary.avgStockoutDuration}</div>
                 </div>
                 <Timer size={40} className="opacity-30 group-hover:opacity-100 transition-opacity" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const getTxnColor = (type: string) => {
  switch(type) {
    case 'ISSUE': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'RECEIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    default: return 'bg-blue-50 text-blue-600 border-blue-100';
  }
};

const HistoryIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
  </svg>
);

export default DashboardPage;
