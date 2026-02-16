
import React, { useState } from 'react';
import { 
  BookOpen, ChevronRight, Shield, Zap, Package, 
  ArrowLeftRight, ShoppingCart, HelpCircle, Star, 
  ArrowRight, CheckCircle2, ShieldAlert, Cpu,
  PlusCircle, Settings2, FileCheck, ClipboardList,
  Search, Truck, ShieldCheck
} from 'lucide-react';

const ManualPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  const sections = [
    { id: 'intro', title: 'System Introduction', icon: <HelpCircle size={18} /> },
    { id: 'roles', title: 'RBAC & Permissions', icon: <Shield size={18} /> },
    { id: 'inventory-guide', title: 'Inventory Management', icon: <Package size={18} /> },
    { id: 'movements-guide', title: 'Stock Movements', icon: <ArrowLeftRight size={18} /> },
    { id: 'purchasing-guide', title: 'Procurement Cycle', icon: <ShoppingCart size={18} /> },
    { id: 'ai-advisor', title: 'AI Logistics Advisor', icon: <Cpu size={18} /> },
  ];

  const Step = ({ number, title, desc }: { number: number, title: string, desc: string }) => (
    <div className="flex items-start space-x-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md group-hover:scale-110 transition-transform">
        {number}
      </div>
      <div>
        <h5 className="font-black text-slate-900 text-sm mb-1">{title}</h5>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'intro':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">The ACMV Inventory Ecosystem</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Welcome to the production-grade ACMV Spare Parts Inventory System. This platform is engineered to streamline 
                facility maintenance logistics by bridging the gap between field technical requirements and warehouse procurement.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                  <Star size={20} />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-2">Core Objective</h4>
                <p className="text-sm font-bold text-slate-600">Zero-downtime facility management through predictive stock replenishment and rigorous audit trails.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-2">Key Value</h4>
                <p className="text-sm font-bold text-slate-600">Real-time telemetry on asset health, stockout risks, and delivery performance metrics (KPIs).</p>
              </div>
            </div>
          </div>
        );
      case 'roles':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Role-Based Access (RBAC)</h2>
            <div className="space-y-4">
              {[
                { role: 'Admin', desc: 'Full system oversight. Permission to void PRs, approve PRs into POs, manage suppliers, and perform stock adjustments.', icon: <Shield className="text-blue-600" /> },
                { role: 'Storekeeper', desc: 'Operational lead. Can create inventory, log receipts, initiate PRs, and manage the vendor directory.', icon: <Package className="text-emerald-600" /> },
                { role: 'Technician', desc: 'Field users. Limited to viewing stock, issuing parts for jobs, and returning unused items. No adjustment rights.', icon: <Zap className="text-amber-600" /> },
                { role: 'Viewer', desc: 'Auditors. Read-only access to Dashboards, Inventory lists, and specialized Audit Reports.', icon: <ShieldAlert className="text-slate-400" /> },
              ].map((r, i) => (
                <div key={i} className="flex items-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                  <div className="mr-6 p-4 bg-slate-50 rounded-2xl">{r.icon}</div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{r.role}</h4>
                    <p className="text-sm text-slate-500 font-medium mt-1">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'inventory-guide':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h2>
            
            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600">
                <PlusCircle size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Process: Registering New Assets</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Step number={1} title="Initiation" desc="Click the 'New Asset' button on the Inventory Toolbar." />
                <Step number={2} title="Identification" desc="Enter Part Name, Brand, and Model. Assign a Building and specific Room." />
                <Step number={3} title="Configuration" desc="Define 'Safety Min' (Alert level) and 'Reorder Point' (Procurement trigger)." />
                <Step number={4} title="Commitment" desc="Save the record. The system assigns a unique Catalog ID and row version." />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-amber-600">
                <Settings2 size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Process: Bulk Updating Catalog</h4>
              </div>
              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 border-dashed space-y-4">
                <p className="text-xs font-bold text-amber-800 italic">Efficiently update multiple items in a single operational step.</p>
                <div className="space-y-2">
                  <Step number={1} title="Selection" desc="Use the table checkboxes to select the target items." />
                  <Step number={2} title="Action Trigger" desc="Click 'Bulk Update' in the floating black toolbar." />
                  <Step number={3} title="Field Activation" desc="Toggle checkboxes for fields you wish to change (e.g. Status)." />
                  <Step number={4} title="Execution" desc="Verify the impact count and click 'Execute Bulk Patch'." />
                </div>
              </div>
            </section>
          </div>
        );
      case 'movements-guide':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Stock Movements</h2>

            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600">
                <ClipboardList size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Process: Issuing Spares to Field</h4>
              </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
                <div className="p-8 space-y-4">
                  <Step number={1} title="Navigate" desc="Go to the 'Movements' tab and click 'Record Movement'." />
                  <Step number={2} title="Identify Job" desc="Select 'ISSUE' type. Enter the Work Order or Job ID in the Reference field." />
                  <Step number={3} title="Allocate" desc="Select the spare part from the catalog and enter the quantity required." />
                  <Step number={4} title="Verify" desc="Confirm current stock levels allow the deduction. Click 'Commit Entry'." />
                </div>
                {/* Fixed missing ShieldCheck import below */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instant inventory sync enabled</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
               <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Movement Types Reference</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-2xl">
                    <div className="font-black text-xs mb-1">ISSUE</div>
                    <p className="text-[10px] text-slate-500 font-medium">Consumption for repairs. Reduces stock level.</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl">
                    <div className="font-black text-xs mb-1">RETURN</div>
                    <p className="text-[10px] text-slate-500 font-medium">Unused parts from field. Increases stock level.</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl">
                    <div className="font-black text-xs mb-1">ADJUSTMENT</div>
                    <p className="text-[10px] text-slate-500 font-medium">Admin-only correction for physical audit sync.</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl">
                    <div className="font-black text-xs mb-1">RECEIVE</div>
                    <p className="text-[10px] text-slate-500 font-medium">Automated trigger from Purchasing module receipts.</p>
                  </div>
               </div>
            </section>
          </div>
        );
      case 'purchasing-guide':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Procurement Loop</h2>
            
            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600">
                <Search size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Phase 1: Need Detection</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium px-4 border-l-2 border-slate-100">
                The 'Procurement Pulse' dashboard automatically aggregates all items where <strong>QtyOnHand &le; Reorder Point</strong>.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-indigo-600">
                <FileCheck size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Phase 2: Approval Flow</h4>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Workflow: PR to PO</span>
                    <div className="h-px bg-indigo-200 flex-1 mx-6"></div>
                  </div>
                  <div className="space-y-4">
                    <Step number={1} title="Submit Request" desc="Storekeeper selects items from the Pulse and clicks 'Initiate PR'." />
                    <Step number={2} title="Review" desc="Admin reviews the 'Purchase Requests' list for DRAFT entries." />
                    <Step number={3} title="Authorization" desc="Admin clicks 'Approve Request'. Status moves to APPROVED." />
                    <Step number={4} title="Conversion" desc="Anyone with edit rights clicks 'Generate PO' to commit the order to the vendor pipe." />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-emerald-600">
                <Truck size={20} />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Phase 3: Goods Receipt</h4>
              </div>
              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2 space-y-4">
                  <h5 className="font-black text-emerald-900 text-sm">Verifying Shipments</h5>
                  <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                    Once physical goods arrive at the loading bay, navigate to 'Direct Orders' and click 'Verify Shipment'.
                  </p>
                </div>
                <div className="md:w-1/2 space-y-3">
                   <div className="flex items-center space-x-3 text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                     <CheckCircle2 size={14} /> <span>Atomic Stock Update</span>
                   </div>
                   <div className="flex items-center space-x-3 text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                     <CheckCircle2 size={14} /> <span>PO Status Update</span>
                   </div>
                   <div className="flex items-center space-x-3 text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                     <CheckCircle2 size={14} /> <span>Audit Log Generation</span>
                   </div>
                </div>
              </div>
            </section>
          </div>
        );
      case 'ai-advisor':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white overflow-hidden relative group">
              <div className="relative z-10 space-y-6">
                <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4">
                  <Cpu size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white">Strategic AI Logistics Advisor</h2>
                <p className="text-slate-400 font-medium leading-relaxed max-w-xl">
                  Leveraging Google Gemini, our system interprets complex logistics patterns into human-readable strategic advice.
                </p>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Process: Generating Insights</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 text-sm text-slate-300">
                      <ArrowRight size={14} className="text-blue-500" />
                      <span>Go to <strong>Purchasing</strong> {" > "} <strong>Procurement Pulse</strong>.</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-slate-300">
                      <ArrowRight size={14} className="text-blue-500" />
                      <span>Click <strong>'Generate Strategy'</strong>.</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-slate-300">
                      <ArrowRight size={14} className="text-blue-500" />
                      <span>The AI analyzes safety levels and suggests prioritization based on operational risk.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Capabilities</h4>
                  <p className="text-sm italic font-bold text-slate-300">
                    The advisor identifies "Silent Risks"—parts that aren't quite at zero but are trending towards failure during high-demand cooling cycles.
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">System Manual</h1>
          <p className="text-slate-500 font-medium">Standard Operating Procedures & Workflow Documentation.</p>
        </div>
        <div className="flex items-center space-x-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <BookOpen className="text-blue-600" size={18} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Version 1.2.0-LTS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] transition-all duration-300 group ${
                activeSection === s.id 
                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/30 -translate-y-1' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className={`${activeSection === s.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}`}>{s.icon}</span>
                <span className="font-black text-[10px] uppercase tracking-widest">{s.title}</span>
              </div>
              <ChevronRight size={16} className={`${activeSection === s.id ? 'text-blue-400' : 'text-slate-300 group-hover:translate-x-1 transition-all'}`} />
            </button>
          ))}
          
          <div className="mt-12 p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] space-y-4">
            <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Support Desk</h4>
            <p className="text-xs font-bold text-blue-800 leading-relaxed">
              If you encounter data discrepancies or technical failures, contact the site administrator at support@acmvsys.local.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 bg-white border border-slate-200/60 rounded-[3rem] p-10 lg:p-16 shadow-xl shadow-slate-200/20 overflow-hidden min-h-[600px]">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
};

export default ManualPage;
