import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  HelpCircle,
  LayoutDashboard,
  Package,
  Shield,
  ShoppingCart,
  Users,
} from 'lucide-react';

const Step = ({
  number,
  title,
  detail,
}: {
  number: number;
  title: string;
  detail: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{number}</div>
    <div className="min-w-0">
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="text-xs font-medium leading-relaxed text-slate-500">{detail}</div>
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="space-y-1">
    <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
    <p className="text-sm font-medium text-slate-500">{subtitle}</p>
  </div>
);

const ManualPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview & Quick Start', icon: <HelpCircle size={17} /> },
    { id: 'roles', title: 'Roles & Permissions', icon: <Shield size={17} /> },
    { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { id: 'inventory', title: 'Inventory', icon: <Package size={17} /> },
    { id: 'movements', title: 'Movements', icon: <ArrowLeftRight size={17} /> },
    { id: 'order-schedule', title: 'Order Schedule & Receiving', icon: <ShoppingCart size={17} /> },
    { id: 'suppliers', title: 'Suppliers', icon: <Users size={17} /> },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: <AlertTriangle size={17} /> },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="System Overview"
              subtitle="Current flow: Dashboard -> Inventory -> Movements -> Order Schedule -> Suppliers."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Open Dashboard" detail="Review total stock quantity, total items, zero-stock items, low stock alerts, part/location donut charts, and upcoming schedules." />
              <Step number={2} title="Maintain Inventory" detail="Create or edit part records, configure Min Stock and Reorder Point, and keep locations/suppliers updated." />
              <Step number={3} title="Record Movements" detail="Use ISSUE, RETURN, RECEIVE, and ADJUSTMENT to keep on-hand quantities accurate and fully auditable." />
              <Step number={4} title="Plan Orders" detail="Use Order Schedule calendar to assign date, part lines, and supplier. Track delayed, due-soon, and partial-receive status." />
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-blue-700">
                <FileCheck size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Data Source</span>
              </div>
              <p className="text-sm font-semibold text-blue-900">
                All pages read from backend API and SQL tables with <code>TKS_</code> naming.
              </p>
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Roles & Permissions"
              subtitle="Actions available depend on logged-in role."
            />
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">Admin</div>
                <div className="mt-1 text-sm text-slate-600">Full access: manage master data, stock changes, approvals, and all operational views.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">Storekeeper</div>
                <div className="mt-1 text-sm text-slate-600">Daily operations: inventory update, movements, order schedule creation, receiving process.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">Technician</div>
                <div className="mt-1 text-sm text-slate-600">Operational usage: issue/return support and stock visibility as configured by system policy.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">Viewer</div>
                <div className="mt-1 text-sm text-slate-600">Read-only access for reporting, checks, and monitoring.</div>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Dashboard Usage"
              subtitle="Use dashboard for immediate stock risk and schedule visibility."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Read KPI cards" detail="Total Stock Qty, Total Stock Items, Total 0 Stock Items, and Low Stock Alerts." />
              <Step number={2} title="Analyze distributions" detail="Use donut charts for top part names and location/building mix." />
              <Step number={3} title="Review low stock action list" detail="Compact grouped-by-part list with action quantity and zero-stock counts." />
              <Step number={4} title="Check upcoming order schedules" detail="Next 7-day schedule preview including supplier, parts count, quantity, and remarks." />
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Inventory Flow"
              subtitle="Grid-line inventory view with detailed add/edit modal."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Add item" detail="Click Add Asset, fill part identity, location, system type, and supplier." />
              <Step number={2} title="Set stock controls" detail="Set Min Stock and Reorder Point. If Reorder Point is 0, it follows Min Stock." />
              <Step number={3} title="Save record" detail="Synchronize Asset to Registry to persist item to SQL via backend API." />
              <Step number={4} title="Bulk edit" detail="Select records and use bulk patch to update status, criticality, min stock, and reorder threshold." />
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Low-stock logic: item is flagged when <code>quantityOnHand &lt;= reorderPoint</code> (or <code>minStock</code> if reorder point is not set).
            </div>
          </div>
        );

      case 'movements':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Movements Flow"
              subtitle="Every transaction updates stock and creates audit trail."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Create movement" detail="Go to Movements and start a new transaction." />
              <Step number={2} title="Choose type" detail="ISSUE, RETURN, RECEIVE, or ADJUSTMENT." />
              <Step number={3} title="Fill metadata" detail="Use reference/document fields and line quantities for traceability." />
              <Step number={4} title="Submit" detail="Backend validates and posts movement; inventory balance changes immediately." />
            </div>
          </div>
        );

      case 'order-schedule':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Order Schedule & Receiving Flow"
              subtitle="Replaces old Purchasing flow with calendar-based planning and receiving operations."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Pick date from calendar" detail="Use Current Calendar Sheet and click a day to prefill schedule date." />
              <Step number={2} title="Create order schedule" detail="Set supplier, add part lines with quantities, and save schedule order." />
              <Step number={3} title="Monitor notifications" detail="Track delayed goods, partial receive, and due-soon schedule alerts." />
              <Step number={4} title="Receive PO goods" detail="Use Goods Receive Schedule to post full or partial receive and update stock." />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Status Notes</span>
              </div>
              <p className="text-sm font-semibold text-emerald-900">
                Schedule states include <code>Scheduled</code>, <code>Due Soon</code>, <code>Delayed</code>, <code>Partial Receive</code>, <code>Completed</code>, and <code>Cancelled</code>.
              </p>
            </div>
          </div>
        );

      case 'suppliers':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Suppliers Flow"
              subtitle="Supplier master data is used by inventory and order schedule."
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Step number={1} title="Maintain supplier profile" detail="Create/update supplier name, contact, address, and active state." />
              <Step number={2} title="Assign preferred supplier" detail="Set preferred supplier in inventory item for faster planning." />
              <Step number={3} title="Use in schedule" detail="Select supplier during order schedule creation for each planned order batch." />
              <Step number={4} title="Track performance" detail="Use delivery/receiving status and movement history for supplier follow-up." />
            </div>
          </div>
        );

      case 'troubleshooting':
        return (
          <div className="space-y-6">
            <SectionTitle
              title="Troubleshooting"
              subtitle="Common issues and fast checks."
            />
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-900">Dashboard stuck on loading or warning banner</div>
                <div className="mt-1 text-xs text-slate-600">Check backend is running and frontend API base URL points to the correct port.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-900">API connection refused</div>
                <div className="mt-1 text-xs text-slate-600">Start backend service, verify open port, then restart frontend dev server.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-900">Order schedule endpoint 404</div>
                <div className="mt-1 text-xs text-slate-600">Run latest backend with migrations applied so <code>/api/orderschedules</code> is available.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-900">Unexpected 500 from summary/suppliers/transactions</div>
                <div className="mt-1 text-xs text-slate-600">Confirm database migration success and table rename to <code>TKS_*</code> completed.</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">User Manual</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Detailed operational guide based on current system flow.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <BookOpen size={16} className="text-blue-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Version 2.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="space-y-2 lg:col-span-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                activeSection === section.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={activeSection === section.id ? 'text-blue-300' : 'text-slate-400'}>{section.icon}</span>
                <span className="text-[11px] font-black uppercase tracking-wider">{section.title}</span>
              </span>
              <ChevronRight size={15} className={activeSection === section.id ? 'text-blue-300' : 'text-slate-300'} />
            </button>
          ))}
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-8 lg:p-7">
          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default ManualPage;

