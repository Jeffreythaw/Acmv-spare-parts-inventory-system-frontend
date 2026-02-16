
import React, { useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import TransactionPage from './pages/TransactionPage';
import PurchasingPage from './pages/PurchasingPage';
import SuppliersPage from './pages/SuppliersPage';
import ManualPage from './pages/ManualPage';
import { AuthProvider } from './context/AuthContext';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'inventory': return <InventoryPage />;
      case 'movements': return <TransactionPage />;
      case 'purchasing': return <PurchasingPage />;
      case 'suppliers': return <SuppliersPage />;
      case 'manual': return <ManualPage />;
      case 'reports': return (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center animate-in fade-in duration-500">
          <h3 className="text-slate-400 font-bold text-lg">Audit & Reporting Engine</h3>
          <p className="text-slate-400">Custom exports for Inventory, Stock Movements, and PO history.</p>
        </div>
      );
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
