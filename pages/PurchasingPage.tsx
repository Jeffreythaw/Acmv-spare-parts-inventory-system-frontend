import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Inventory, OrderSchedule, PO, POStatus, ScheduleStatus, Supplier } from '../types';
import { AlertTriangle, CalendarDays, CalendarPlus2, PackageCheck, Trash2, X } from 'lucide-react';

type ReceiveRow = {
  inventoryId: string;
  qtyReceived: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const formatDate = (value?: string) => {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString();
};

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toIsoDateFromInput = (dateInput: string) => {
  const d = new Date(`${dateInput}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addCalendarDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const startOfCalendarGrid = (date: Date) => {
  const first = startOfMonth(date);
  const day = first.getDay();
  return addCalendarDays(first, -day);
};

const PurchasingPage: React.FC = () => {
  const { user } = useAuth();

  const [pos, setPos] = useState<PO[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [schedules, setSchedules] = useState<OrderSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [receivingPO, setReceivingPO] = useState<PO | null>(null);
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);
  const [receivingSchedule, setReceivingSchedule] = useState<OrderSchedule | null>(null);
  const [scheduleReceiveRows, setScheduleReceiveRows] = useState<ReceiveRow[]>([]);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleSupplierId, setScheduleSupplierId] = useState('');
  const [scheduleRemark, setScheduleRemark] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [draftEquipmentModel, setDraftEquipmentModel] = useState('');
  const [draftPartId, setDraftPartId] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [scheduleLines, setScheduleLines] = useState<Array<{ inventoryId: string; qty: number }>>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [o, inv, supp, sched] = await Promise.all([
        api.getPOs(),
        api.getInventory(),
        api.getSuppliers(),
        api.getOrderSchedules(),
      ]);
      setPos(o);
      setInventory(inv);
      setSuppliers(supp);
      setSchedules(sched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const equipmentModelOptions = useMemo(
    () =>
      Array.from(new Set(inventory.map((i) => (i.equipmentModel || '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [inventory]
  );

  const draftPartOptions = useMemo(
    () => inventory.filter((item) => (item.equipmentModel || '').trim() === draftEquipmentModel),
    [draftEquipmentModel, inventory]
  );

  const getPartName = (inventoryId: string) => inventory.find((i) => i.id === inventoryId)?.partName || inventoryId;
  const getPartLabel = (inventoryId: string) => {
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return inventoryId;
    const model = item.equipmentModel ? ` | ${item.equipmentModel}` : '';
    const tag = item.tagNo ? ` | ${item.tagNo}` : '';
    return `${item.partName}${model}${tag}`;
  };
  const getSupplierName = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.name || supplierId || '-';

  const poScheduleRows = useMemo(() => {
    const today = startOfToday();
    const dueSoonDate = addDays(today, 3);

    return pos.flatMap((po) =>
      po.lines.map((line) => {
        const outstanding = Math.max(line.orderedQty - line.receivedQty, 0);
        const eta = line.eta || addDays(new Date(po.createdAt), 7).toISOString();
        const etaDate = new Date(eta);
        const validEta = !Number.isNaN(etaDate.getTime());

        const delayed = outstanding > 0 && validEta && etaDate < today;
        const dueSoon = outstanding > 0 && validEta && etaDate >= today && etaDate <= dueSoonDate;
        const partial = line.receivedQty > 0 && outstanding > 0;
        const completed = outstanding === 0 || po.status === POStatus.CLOSED;

        let state: 'Delayed' | 'Partial Receive' | 'Due Soon' | 'Scheduled' | 'Completed' = 'Scheduled';
        if (completed) state = 'Completed';
        else if (delayed) state = 'Delayed';
        else if (partial) state = 'Partial Receive';
        else if (dueSoon) state = 'Due Soon';

        return {
          poId: po.id,
          poNo: po.poNo,
          supplierName: getSupplierName(po.supplierId),
          inventoryId: line.inventoryId,
          partName: getPartName(line.inventoryId),
          eta,
          orderedQty: line.orderedQty,
          receivedQty: line.receivedQty,
          outstanding,
          state,
        };
      })
    );
  }, [pos, inventory, suppliers]);

  const scheduleCalendarRows = useMemo(() => {
    const today = startOfToday();
    const dueSoonDate = addDays(today, 3);

    return schedules.map((s) => {
      const date = new Date(s.scheduledDate);
      const isPast = date < today;
      const isSoon = date >= today && date <= dueSoonDate;
      const totalQty = s.lines.reduce((sum, line) => sum + line.qty, 0);
      const receivedQty = s.lines.reduce((sum, line) => sum + (line.receivedQty || 0), 0);
      const outstandingQty = Math.max(totalQty - receivedQty, 0);
      const partial = receivedQty > 0 && outstandingQty > 0;

      return {
        ...s,
        partsCount: s.lines.length,
        totalQty,
        receivedQty,
        outstandingQty,
        state:
          s.status === ScheduleStatus.CANCELLED
            ? 'Cancelled'
            : s.status === ScheduleStatus.COMPLETED || outstandingQty === 0
            ? 'Completed'
            : partial
              ? 'Partial Receive'
              : isPast
                ? 'Delayed'
                : isSoon
                  ? 'Due Soon'
                  : 'Scheduled',
      };
    });
  }, [schedules]);

  const poPartialCount = useMemo(
    () => poScheduleRows.filter((r) => r.state === 'Partial Receive').length,
    [poScheduleRows]
  );

  const schedulePartialCount = useMemo(
    () => scheduleCalendarRows.filter((s) => s.state === 'Partial Receive').length,
    [scheduleCalendarRows]
  );

  const monthScheduleMap = useMemo(() => {
    const map = new Map<string, number>();
    schedules.forEach((s) => {
      if (s.status === ScheduleStatus.CANCELLED) return;
      const key = toDateInputValue(new Date(s.scheduledDate));
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [schedules]);

  const calendarDays = useMemo(() => {
    const firstGridDay = startOfCalendarGrid(calendarMonth);
    return Array.from({ length: 42 }, (_, idx) => addCalendarDays(firstGridDay, idx));
  }, [calendarMonth]);

  const monthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [calendarMonth]
  );

  const notifications = useMemo(() => {
    const delayedPO = poScheduleRows.filter((r) => r.state === 'Delayed').length;
    const partial = poPartialCount + schedulePartialCount;
    const dueSoonSchedule = scheduleCalendarRows.filter((s) => s.state === 'Due Soon').length;
    const delayedSchedule = scheduleCalendarRows.filter((s) => s.state === 'Delayed').length;

    const items: Array<{ type: 'danger' | 'warning' | 'info'; title: string; detail: string }> = [];

    scheduleCalendarRows
      .filter((s) => s.state === 'Due Soon' || s.state === 'Delayed' || s.state === 'Partial Receive')
      .slice(0, 6)
      .forEach((s) => {
        items.push({
          type: s.state === 'Delayed' ? 'danger' : s.state === 'Partial Receive' ? 'warning' : 'info',
          title:
            s.state === 'Partial Receive'
              ? `Schedule Partial: ${formatDate(s.scheduledDate)}`
              : `Schedule ${s.state}: ${formatDate(s.scheduledDate)}`,
          detail: `${s.partsCount} part(s) • Ordered ${s.totalQty} • Received ${s.receivedQty} • ${getSupplierName(s.supplierId)}`,
        });
      });

    if (partial > 0) {
      items.push({
        type: 'warning',
        title: `${partial} partial receive record(s)`,
        detail: 'Follow up with supplier for pending quantities.',
      });
    }

    return {
      delayedCount: delayedPO + delayedSchedule,
      partialCount: partial,
      dueSoonCount: dueSoonSchedule,
      items,
    };
  }, [poPartialCount, poScheduleRows, scheduleCalendarRows, schedulePartialCount, suppliers]);

  const addScheduleLine = () => {
    if (!draftEquipmentModel) {
      alert('Please select equipment model first.');
      return;
    }
    if (!draftPartId || draftQty <= 0) return;
    setScheduleLines((prev) => {
      const idx = prev.findIndex((line) => line.inventoryId === draftPartId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + draftQty };
        return next;
      }
      return [...prev, { inventoryId: draftPartId, qty: draftQty }];
    });
    setDraftPartId('');
    setDraftQty(1);
  };

  const removeScheduleLine = (inventoryId: string) => {
    setScheduleLines((prev) => prev.filter((line) => line.inventoryId !== inventoryId));
  };

  const createScheduleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) {
      alert('Please select schedule date.');
      return;
    }
    if (scheduleLines.length === 0) {
      alert('Please add at least one part detail.');
      return;
    }

    try {
      await api.createOrderSchedule({
        scheduledDate: new Date(scheduleDate).toISOString(),
        createdBy: user?.name || 'Storekeeper',
        supplierId: scheduleSupplierId || '',
        remark: scheduleRemark || '',
        status: ScheduleStatus.SCHEDULED,
        lines: scheduleLines.map((line) => ({ ...line, receivedQty: 0 })),
      });

      setScheduleDate('');
      setScheduleSupplierId('');
      setScheduleRemark('');
      setScheduleLines([]);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Create schedule failed');
    }
  };

  const openReceiveModal = (poId: string) => {
    const po = pos.find((p) => p.id === poId);
    if (!po) return;
    setReceivingPO(po);
    setReceiveRows(
      po.lines.map((line) => ({
        inventoryId: line.inventoryId,
        qtyReceived: Math.max(line.orderedQty - line.receivedQty, 0),
      }))
    );
  };

  const openReceiveScheduleModal = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    setReceivingSchedule(schedule);
    setScheduleReceiveRows(
      schedule.lines.map((line) => ({
        inventoryId: line.inventoryId,
        qtyReceived: Math.max(line.qty - (line.receivedQty || 0), 0),
      }))
    );
  };

  const submitReceive = async () => {
    if (!receivingPO) return;
    const payload = receiveRows
      .filter((r) => r.qtyReceived > 0)
      .map((r) => ({ inventoryId: r.inventoryId, qtyReceived: r.qtyReceived }));

    if (payload.length === 0) {
      alert('Please input at least one received quantity.');
      return;
    }

    try {
      await api.receivePO(receivingPO.id, payload);
      setReceivingPO(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Receive failed');
    }
  };

  const submitScheduleReceive = async () => {
    if (!receivingSchedule) return;
    const payload = scheduleReceiveRows
      .filter((r) => r.qtyReceived > 0)
      .map((r) => ({ inventoryId: r.inventoryId, qtyReceived: r.qtyReceived }));

    if (payload.length === 0) {
      alert('Please input at least one received quantity.');
      return;
    }

    try {
      await api.receiveOrderSchedule(receivingSchedule.id, payload);
      setReceivingSchedule(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Schedule receive failed');
    }
  };

  const quickReceiveOne = async (poId: string, inventoryId: string, outstanding: number) => {
    if (outstanding <= 0) return;
    try {
      await api.receivePO(poId, [{ inventoryId, qtyReceived: 1 }]);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Quick receive failed');
    }
  };

  const updateScheduleStatus = async (id: string, status: ScheduleStatus) => {
    try {
      await api.updateOrderScheduleStatus(id, status);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Update schedule status failed');
    }
  };

  const postponeSchedule = async (id: string, currentDate: string) => {
    const current = toDateInputValue(new Date(currentDate));
    const picked = window.prompt('Enter new schedule date (YYYY-MM-DD):', current);
    if (!picked) return;
    const iso = toIsoDateFromInput(picked.trim());
    if (!iso) {
      alert('Invalid date format. Use YYYY-MM-DD.');
      return;
    }
    try {
      await api.rescheduleOrderSchedule(id, iso);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Postpone schedule failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Order Schedule & Receiving</h1>
          <p className="text-sm text-slate-500">Calendar-based order scheduling, partial receive tracking, delayed arrivals, and notifications.</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
        >
          Refresh
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Current Calendar Sheet</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalendarMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() - 1, 1)))}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
            >
              Prev
            </button>
            <span className="min-w-[120px] text-center text-xs font-semibold text-slate-700">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setCalendarMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1)))}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
          {calendarDays.map((day) => {
            const key = toDateInputValue(day);
            const scheduleCount = monthScheduleMap.get(key) || 0;
            const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
            const isToday = key === toDateInputValue(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => setScheduleDate(key)}
                className={`min-h-[70px] rounded-md border p-1.5 text-left transition ${
                  isCurrentMonth ? 'border-slate-200 bg-white hover:border-blue-300' : 'border-slate-100 bg-slate-50 text-slate-400'
                } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                title={scheduleCount > 0 ? `${scheduleCount} schedule(s)` : 'No schedule'}
              >
                <div className={`text-[11px] font-semibold ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>{day.getDate()}</div>
                {scheduleCount > 0 && (
                  <div className="mt-1 inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {scheduleCount} order
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Click a date to auto-fill the schedule date in the form below.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarPlus2 size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Create Schedule Order</h2>
        </div>
        <form onSubmit={createScheduleOrder} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Schedule Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Supplier (optional)</label>
              <select
                value={scheduleSupplierId}
                onChange={(e) => setScheduleSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Remark</label>
              <input
                value={scheduleRemark}
                onChange={(e) => setScheduleRemark(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional note"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={draftEquipmentModel}
              onChange={(e) => {
                setDraftEquipmentModel(e.target.value);
                setDraftPartId('');
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select equipment model</option>
              {equipmentModelOptions.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <select
              value={draftPartId}
              onChange={(e) => setDraftPartId(e.target.value)}
              disabled={!draftEquipmentModel}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">{draftEquipmentModel ? 'Select part' : 'Select equipment model first'}</option>
              {draftPartOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.partName} ({item.tagNo || item.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {draftPartId ? getPartLabel(draftPartId) : 'Choose equipment model and part first'}
            </div>
            <input
              type="number"
              min={1}
              value={draftQty}
              onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Qty"
            />
            <button
              type="button"
              onClick={addScheduleLine}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
            >
              Add Part
            </button>
          </div>

          {scheduleLines.length > 0 && (
            <div className="rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Part</th>
                    <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Qty</th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleLines.map((line) => (
                    <tr key={line.inventoryId}>
                      <td className="border-b border-r border-slate-200 px-3 py-2">{getPartLabel(line.inventoryId)}</td>
                      <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold">{line.qty}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right">
                        <button type="button" onClick={() => removeScheduleLine(line.inventoryId)} className="text-rose-600 hover:text-rose-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="submit"
            disabled={!scheduleDate || scheduleLines.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Schedule Order
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={<AlertTriangle size={16} />} title="Delayed Goods" value={notifications.delayedCount} tone="danger" />
        <SummaryCard icon={<PackageCheck size={16} />} title="Partial Receive" value={notifications.partialCount} tone="warning" />
        <SummaryCard icon={<CalendarDays size={16} />} title="Due Soon (3 days)" value={notifications.dueSoonCount} tone="info" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Notifications</h2>
        {notifications.items.length === 0 ? (
          <p className="text-xs text-slate-500">No schedule alerts.</p>
        ) : (
          <div className="space-y-2">
            {notifications.items.map((n, idx) => (
              <div
                key={`${n.title}-${idx}`}
                className={`rounded-lg border px-3 py-2 ${
                  n.type === 'danger'
                    ? 'border-rose-200 bg-rose-50'
                    : n.type === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                <div className="text-[11px] text-slate-600">{n.detail}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800">Process:</span> Create schedule, monitor due date, use <span className="font-semibold">Postpone</span> or <span className="font-semibold">Cancel</span> when needed, then post actual goods using <span className="font-semibold">Receive</span> in Calendar Order Schedule (supports partial receive).
        </div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">Calendar Order Schedule</h2>
        {scheduleCalendarRows.length === 0 ? (
          <p className="text-xs text-slate-500">No schedule order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Date</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Supplier</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Parts</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Ordered Qty</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Received Qty</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Outstanding</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-center">Status</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Remark</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduleCalendarRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-800">{formatDate(row.scheduledDate)}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700">{getSupplierName(row.supplierId)}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right">{row.partsCount}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold">{row.totalQty}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right">{row.receivedQty}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold">{row.outstandingQty}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-center">
                      <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${stateBadgeClass(row.state)}`}>{row.state}</span>
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600">{row.remark || '-'}</td>
                    <td className="border-b border-slate-200 px-3 py-2 text-right">
                      {row.status === ScheduleStatus.SCHEDULED ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openReceiveScheduleModal(row.id)}
                            disabled={row.outstandingQty <= 0}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Receive
                          </button>
                          <button
                            onClick={() => postponeSchedule(row.id, row.scheduledDate)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                          >
                            Postpone
                          </button>
                          <button
                            onClick={() => updateScheduleStatus(row.id, ScheduleStatus.CANCELLED)}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:border-rose-300"
                          >
                            Cancel
                          </button>
                          {row.outstandingQty === 0 && (
                            <button
                              onClick={() => updateScheduleStatus(row.id, ScheduleStatus.COMPLETED)}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:border-emerald-300"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Goods Receive Schedule (PO)</h2>
        {loading ? (
          <p className="text-xs text-slate-500">Loading schedule...</p>
        ) : poScheduleRows.length === 0 ? (
          <p className="text-xs text-slate-500">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">PO</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Part</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Supplier</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-left">ETA</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Ordered</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Received</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-right">Outstanding</th>
                  <th className="border-b border-r border-slate-200 px-3 py-2 text-center">State</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {poScheduleRows.map((row, idx) => (
                  <tr key={`${row.poId}-${row.inventoryId}-${idx}`} className="hover:bg-slate-50 text-xs">
                    <td className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-800">{row.poNo}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-800">{row.partName}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700">{row.supplierName}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-700">{formatDate(row.eta)}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-800">{row.orderedQty}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right text-slate-700">{row.receivedQty}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-800">{row.outstanding}</td>
                    <td className="border-b border-r border-slate-200 px-3 py-2 text-center">
                      <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${stateBadgeClass(row.state)}`}>{row.state}</span>
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2 text-right">
                      {row.outstanding > 0 ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => quickReceiveOne(row.poId, row.inventoryId, row.outstanding)}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:border-emerald-300"
                            title="Quick receive 1 qty"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => openReceiveModal(row.poId)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
                          >
                            Receive
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {receivingPO && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-6">
          <div className="w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Receive Goods</h3>
                <p className="text-xs text-slate-500">{receivingPO.poNo} • {getSupplierName(receivingPO.supplierId)}</p>
              </div>
              <button onClick={() => setReceivingPO(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-6 py-5 space-y-3">
              {receivingPO.lines.map((line) => {
                const pending = Math.max(line.orderedQty - line.receivedQty, 0);
                const row = receiveRows.find((r) => r.inventoryId === line.inventoryId);
                return (
                  <div key={line.inventoryId} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_170px] sm:items-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{getPartName(line.inventoryId)}</div>
                      <div className="text-[11px] text-slate-500">Received {line.receivedQty} / {line.orderedQty} • Pending {pending}</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={pending}
                      value={row?.qtyReceived ?? 0}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, pending));
                        setReceiveRows((prev) =>
                          prev.map((r) => (r.inventoryId === line.inventoryId ? { ...r, qtyReceived: value } : r))
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-semibold text-slate-900"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setReceivingPO(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={submitReceive} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Confirm Receive
              </button>
            </div>
          </div>
        </div>
      )}

      {receivingSchedule && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-6">
          <div className="w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Receive Schedule Goods</h3>
                <p className="text-xs text-slate-500">{formatDate(receivingSchedule.scheduledDate)} • {getSupplierName(receivingSchedule.supplierId)}</p>
              </div>
              <button onClick={() => setReceivingSchedule(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-6 py-5 space-y-3">
              {receivingSchedule.lines.map((line) => {
                const currentReceived = line.receivedQty || 0;
                const pending = Math.max(line.qty - currentReceived, 0);
                const row = scheduleReceiveRows.find((r) => r.inventoryId === line.inventoryId);
                return (
                  <div key={line.inventoryId} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_170px] sm:items-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{getPartName(line.inventoryId)}</div>
                      <div className="text-[11px] text-slate-500">Received {currentReceived} / {line.qty} • Pending {pending}</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={pending}
                      value={row?.qtyReceived ?? 0}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, pending));
                        setScheduleReceiveRows((prev) =>
                          prev.map((r) => (r.inventoryId === line.inventoryId ? { ...r, qtyReceived: value } : r))
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-semibold text-slate-900"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setReceivingSchedule(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={submitScheduleReceive} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Confirm Receive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const stateBadgeClass = (state: string) => {
  if (state === 'Delayed') return 'bg-rose-100 text-rose-700';
  if (state === 'Partial Receive') return 'bg-amber-100 text-amber-700';
  if (state === 'Due Soon') return 'bg-blue-100 text-blue-700';
  if (state === 'Completed') return 'bg-emerald-100 text-emerald-700';
  if (state === 'Cancelled') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

const SummaryCard = ({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  tone: 'danger' | 'warning' | 'info';
}) => {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-2 inline-flex rounded-lg bg-white/80 p-2">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide">{title}</div>
    </div>
  );
};

export default PurchasingPage;
