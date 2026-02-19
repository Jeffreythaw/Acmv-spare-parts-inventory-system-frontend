import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Inventory, OrderSchedule, ScheduleStatus, Supplier, TxnType } from '../types';
import { AlertTriangle, Boxes, MapPin, Package, RefreshCw } from 'lucide-react';

type ChartSlice = {
  label: string;
  value: number;
  color: string;
};

const CHART_COLORS = ['#2563eb', '#059669', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4', '#84cc16', '#f97316'];

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [orderSchedules, setOrderSchedules] = useState<OrderSchedule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [s, t, i, sched, supp] = await Promise.allSettled([
        api.getSummary(),
        api.getTransactions(),
        api.getInventory(),
        api.getOrderSchedules(),
        api.getSuppliers(),
      ]);

      if (s.status === 'fulfilled') setSummary(s.value);
      else {
        setSummary({ lowStockCount: 0 });
        setLoadError('Some dashboard sources failed to load. Showing available data.');
      }

      if (t.status === 'fulfilled') setTransactions(t.value);
      else {
        setTransactions([]);
        setLoadError('Some dashboard sources failed to load. Showing available data.');
      }

      if (i.status === 'fulfilled') setInventory(i.value);
      else {
        setInventory([]);
        setLoadError('Some dashboard sources failed to load. Showing available data.');
      }

      if (sched.status === 'fulfilled') setOrderSchedules(sched.value);
      else {
        setOrderSchedules([]);
        setLoadError('Some dashboard sources failed to load. Showing available data.');
      }

      if (supp.status === 'fulfilled') setSuppliers(supp.value);
      else {
        setSuppliers([]);
        setLoadError('Some dashboard sources failed to load. Showing available data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const lowStockItems = useMemo(
    () =>
      inventory
        .filter((item) => item.quantityOnHand <= (item.reorderPoint || item.minStock))
        .sort((a, b) => a.quantityOnHand - b.quantityOnHand),
    [inventory]
  );
  const lowStockByPart = useMemo(() => {
    const grouped = new Map<
      string,
      { partName: string; count: number; onHand: number; target: number; actionQty: number; zeroCount: number }
    >();

    lowStockItems.forEach((item) => {
      const key = item.partName || 'Unknown Part';
      const target = item.reorderPoint || item.minStock;
      const actionQty = item.reorderQty || Math.max(target - item.quantityOnHand, 1);
      const row = grouped.get(key) || {
        partName: key,
        count: 0,
        onHand: 0,
        target: 0,
        actionQty: 0,
        zeroCount: 0,
      };
      row.count += 1;
      row.onHand += item.quantityOnHand;
      row.target += target;
      row.actionQty += actionQty;
      if (item.quantityOnHand === 0) row.zeroCount += 1;
      grouped.set(key, row);
    });

    return Array.from(grouped.values()).sort((a, b) => b.actionQty - a.actionQty);
  }, [lowStockItems]);

  const upcomingSchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return orderSchedules
      .filter((s) => s.status === ScheduleStatus.SCHEDULED)
      .filter((s) => {
        const d = new Date(s.scheduledDate);
        return d >= today && d <= next7;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 6);
  }, [orderSchedules]);

  const recentMovements = useMemo(() => transactions.slice(0, 8), [transactions]);
  const totalStockQty = useMemo(() => inventory.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0), [inventory]);
  const totalStockItems = inventory.length;
  const zeroStockItems = useMemo(() => inventory.filter((item) => (item.quantityOnHand || 0) === 0).length, [inventory]);
  const lowStockCount = summary?.lowStockCount ?? lowStockItems.length;
  const getSupplierName = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.name || supplierId || '-';

  const partDistribution = useMemo(() => {
    const partMap = new Map<string, number>();
    inventory.forEach((item) => {
      const key = item.partName || 'Unknown';
      partMap.set(key, (partMap.get(key) || 0) + 1);
    });
    return Array.from(partMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], idx) => ({ label, value, color: CHART_COLORS[idx % CHART_COLORS.length] }));
  }, [inventory]);

  const locationDistribution = useMemo(() => {
    const locationMap = new Map<string, number>();
    inventory.forEach((item) => {
      const key = item.building || 'Unknown';
      locationMap.set(key, (locationMap.get(key) || 0) + 1);
    });
    return Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], idx) => ({ label, value, color: CHART_COLORS[idx % CHART_COLORS.length] }));
  }, [inventory]);

  if (isLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm font-semibold">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {loadError}
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Stock summary from SQL: quantity, item count, out-of-stock count, and part/location distribution.</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Stock Qty" value={totalStockQty} hint="Sum of quantity on hand" icon={<Boxes size={18} />} />
        <KpiCard title="Total Stock Items" value={totalStockItems} hint="Inventory records in SQL" icon={<Package size={18} />} />
        <KpiCard
          title="Total 0 Stock Items"
          value={zeroStockItems}
          hint={zeroStockItems > 0 ? 'Need replenishment' : 'No zero-stock item'}
          icon={<AlertTriangle size={18} />}
          danger={zeroStockItems > 0}
        />
        <KpiCard title="Low Stock Alerts" value={lowStockCount} hint="Below reorder point/min stock" icon={<AlertTriangle size={18} />} danger={lowStockCount > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">Donut Chart: Parts Name (Top 8)</h2>
          <DonutChart data={partDistribution} emptyText="No parts data" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Donut Chart: Location</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <MapPin size={14} />
              Building
            </span>
          </div>
          <DonutChart data={locationDistribution} emptyText="No location data" />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-slate-900">Low Stock Action List</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                Part Groups: {lowStockByPart.length}
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                Zero Qty: {lowStockItems.filter((x) => x.quantityOnHand === 0).length}
              </span>
              <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                Critical Gap: {lowStockItems.filter((x) => x.quantityOnHand < (x.reorderPoint || x.minStock)).length}
              </span>
            </div>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">All items are above reorder threshold.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Part</th>
                    <th className="py-2 pr-3 text-center">Items</th>
                    <th className="py-2 pr-3 text-right">On Hand</th>
                    <th className="py-2 pr-3 text-right">Target</th>
                    <th className="py-2 text-right">Action Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockByPart.slice(0, 10).map((row) => {
                    const isCritical = row.zeroCount > 0;
                    return (
                      <tr key={row.partName} className="text-xs">
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-slate-900">{row.partName}</div>
                          <div className="text-[10px] text-slate-500">{row.zeroCount > 0 ? `${row.zeroCount} zero-stock item(s)` : 'low stock'}</div>
                        </td>
                        <td className="py-2.5 pr-3 text-center text-slate-700">{row.count}</td>
                        <td className={`py-2.5 pr-3 text-right font-bold ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>{row.onHand}</td>
                        <td className="py-2.5 pr-3 text-right text-slate-700">{row.target}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">{row.actionQty}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lowStockByPart.length > 10 && (
                <p className="mt-2 text-[11px] font-medium text-slate-500">Showing top 10 part groups. Total part groups: {lowStockByPart.length}.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Upcoming Order Schedule (Next 7 Days)</h2>
          <span className="text-xs font-semibold text-slate-500">{upcomingSchedules.length} schedule(s)</span>
        </div>
        {upcomingSchedules.length === 0 ? (
          <p className="text-xs text-slate-500">No scheduled orders in next 7 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3 text-right">Parts</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {upcomingSchedules.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{new Date(s.scheduledDate).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 text-slate-700">{getSupplierName(s.supplierId)}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{s.lines.length}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-slate-800">{s.lines.reduce((sum, l) => sum + l.qty, 0)}</td>
                    <td className="py-2 text-slate-600">{s.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Movements</h2>
          <span className="text-xs font-semibold text-slate-500">Latest {recentMovements.length} records</span>
        </div>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-slate-500">No movement records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Reference</th>
                  <th className="py-3 pr-4">By</th>
                  <th className="py-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMovements.map((txn) => (
                  <tr key={txn.id} className="text-sm">
                    <td className="py-3 pr-4 text-slate-700">{new Date(txn.txnTime).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTxnBadgeClass(txn.txnType)}`}>
                        {txn.txnType}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700">{txn.reference || '-'}</td>
                    <td className="py-3 pr-4 text-slate-700">{txn.performedBy || '-'}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {txn.lines?.reduce((sum: number, line: any) => sum + (line.qty || 0), 0) || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  hint,
  icon,
  danger = false,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  danger?: boolean;
}) => (
  <div className={`rounded-2xl border bg-white p-5 ${danger ? 'border-rose-200' : 'border-slate-200'}`}>
    <div className="mb-4 flex items-center justify-between">
      <span className={`rounded-xl p-2 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'}`}>{icon}</span>
      {danger && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">Attention</span>}
    </div>
    <div className="text-3xl font-black text-slate-900">{value}</div>
    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
    <p className="mt-3 text-xs text-slate-500">{hint}</p>
  </div>
);

const DonutChart = ({ data, emptyText }: { data: ChartSlice[]; emptyText: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const background = useMemo(() => {
    if (total === 0 || data.length === 0) return '#e2e8f0';
    let current = 0;
    const stops = data.map((slice) => {
      const start = current;
      const pct = (slice.value / total) * 100;
      current += pct;
      return `${slice.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [data, total]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-center">
      <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full" style={{ background }}>
        <div className="flex h-[130px] w-[130px] flex-col items-center justify-center rounded-full bg-white text-center">
          <div className="text-3xl font-black text-slate-900">{total}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</div>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-semibold text-slate-900">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getTxnBadgeClass = (type: TxnType | string) => {
  switch (type) {
    case TxnType.ISSUE:
      return 'bg-amber-100 text-amber-800';
    case TxnType.RECEIVE:
      return 'bg-emerald-100 text-emerald-800';
    case TxnType.RETURN:
      return 'bg-blue-100 text-blue-800';
    case TxnType.ADJUSTMENT:
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export default DashboardPage;
