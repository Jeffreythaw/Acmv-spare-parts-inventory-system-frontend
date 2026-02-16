
import React, { useState } from 'react';
import { NAVIGATION } from '../constants';
import { Menu, X, ChevronDown, Shield, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const { user, switchRole } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Define restricted tabs based on role
  const getVisibleNav = () => {
    if (user.role === UserRole.TECHNICIAN) {
      return NAVIGATION.filter(item => ['Dashboard', 'Inventory', 'Movements'].includes(item.name));
    }
    if (user.role === UserRole.VIEWER) {
      return NAVIGATION.filter(item => ['Dashboard', 'Inventory', 'Audit Reports'].includes(item.name));
    }
    return NAVIGATION;
  };

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">A</div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none tracking-tight">ACMV Sys</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Inventory Pro</p>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 space-y-1">
        {getVisibleNav().map((item) => (
          <button
            key={item.path}
            onClick={() => {
              setActiveTab(item.path);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-6 py-3 transition-all duration-200 group ${
              activeTab === item.path 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className={`${activeTab === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50 relative">
        <button 
          onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
          className="w-full flex items-center justify-between group p-1 rounded-xl transition-all"
        >
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold border border-slate-500/30">{user.avatar}</div>
            <div className="min-w-0 text-left">
              <p className="text-white font-semibold truncate leading-none">{user.name}</p>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-wider mt-1">{user.role}</p>
            </div>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isRoleMenuOpen && (
          <div className="absolute bottom-20 left-6 right-6 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-2 z-50 animate-in slide-in-from-bottom-2">
            <div className="px-4 py-2 border-b border-slate-700">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Switch Identity</span>
            </div>
            {Object.values(UserRole).map((role) => (
              <button
                key={role}
                onClick={() => {
                  switchRole(role);
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-xs font-bold transition-all ${
                  user.role === role ? 'text-blue-400 bg-blue-400/5' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 z-50 shadow-2xl">
        <NavContent />
      </aside>

      {/* Sidebar - Mobile */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-50 transition-transform duration-300 transform lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute right-4 top-6 lg:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-30">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="p-2 mr-4 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              <Shield size={14} className="mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">{user.role} Access</span>
            </div>
            <div className="hidden md:block px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider">v1.1.0-AUTH</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
