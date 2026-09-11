import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Milk, Shield, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { business, user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Brand & Business */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Milk className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
              {business?.name || 'Milk & More Dairy'}
            </h1>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              Live Dairy
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">Home-Delivery Management System</p>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Selector dropdown */}
        <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-lg p-1 transition-colors">
          <Shield className="w-4 h-4 text-slate-500 ml-2" />
          <select
            value={role}
            onChange={(e) => switchRole(e.target.value as UserRole)}
            className="bg-transparent text-xs font-semibold text-slate-700 pl-1.5 pr-6 py-1 focus:outline-none cursor-pointer appearance-none"
          >
            <option value="OWNER">Role: Owner</option>
            <option value="ADMIN">Role: Admin</option>
            <option value="STAFF">Role: Staff</option>
            <option value="MILKMAN">Role: Milkman</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs border border-slate-300">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-medium text-slate-700 hidden md:block">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign Out"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-colors ml-1 disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
