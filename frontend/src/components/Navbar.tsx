import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Milk, Shield, ChevronDown, LogOut, BookOpen, Clock, Users, Receipt, FileText, QrCode } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { business, user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const quickTabs = [
    { to: '/', label: 'Dashboard' },
    { to: '/today', label: "Today's Delivery" },
    { to: '/customers', label: 'Customers' },
    { to: '/accounts', label: 'Customer Accounts' },
    { to: '/payments', label: 'Payments' },
    { to: '/bills', label: 'Statements' },
  ];

  const currentPath = location.pathname;

  return (
    <header className="sticky top-0 z-30 bg-[#6B1724] text-white border-b border-[#54121c] px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
      {/* Brand & Business */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/20 transition-colors">
            <Milk className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-sm sm:text-base leading-tight tracking-tight">
                {business?.name || 'Milk & More Dairy'}
              </h1>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Dairy
              </span>
            </div>
            <p className="text-[11px] text-maroon-200/80 hidden sm:block">Dairy Business Management & Accounts</p>
          </div>
        </Link>

        {/* Active Open Tabs Pill Navigation on medium+ screens */}
        <div className="hidden xl:flex items-center gap-1 ml-6 pl-6 border-l border-maroon-700/60">
          {quickTabs.map((tab) => {
            const isActive = tab.to === '/' ? currentPath === '/' : currentPath.startsWith(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2E7D32] text-white shadow-xs font-bold'
                    : 'text-maroon-100/80 hover:bg-maroon-700/60 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Selector dropdown */}
        <div className="relative flex items-center bg-black/20 hover:bg-black/30 border border-white/10 rounded-lg p-1 transition-colors">
          <Shield className="w-3.5 h-3.5 text-amber-200 ml-1.5" />
          <select
            value={role}
            onChange={(e) => switchRole(e.target.value as UserRole)}
            className="bg-transparent text-xs font-semibold text-white pl-1.5 pr-6 py-0.5 focus:outline-none cursor-pointer appearance-none"
          >
            <option value="OWNER" className="bg-slate-900 text-white">Role: Owner</option>
            <option value="ADMIN" className="bg-slate-900 text-white">Role: Admin</option>
            <option value="STAFF" className="bg-slate-900 text-white">Role: Staff</option>
            <option value="MILKMAN" className="bg-slate-900 text-white">Role: Milkman</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-maroon-200 absolute right-2 pointer-events-none" />
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-maroon-700/60">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs border border-white/30">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-medium text-white/90 hidden md:block">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign Out"
          className="flex items-center gap-1.5 text-xs font-medium text-maroon-100 hover:text-white hover:bg-red-900/60 px-2.5 py-1 rounded-lg border border-maroon-700 hover:border-red-500 transition-colors ml-1 disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
