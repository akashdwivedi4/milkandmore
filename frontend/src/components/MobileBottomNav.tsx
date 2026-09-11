import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  QrCode,
  Users,
  Menu,
  X,
  Package,
  Truck,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  TrendingDown,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const moreItems = [
    { to: '/products', label: 'Products', icon: Package },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/purchases', label: 'Purchases', icon: Truck, adminOnly: true },
    { to: '/suppliers', label: 'Suppliers', icon: Users, adminOnly: true },
    { to: '/expenses', label: 'Expenses', icon: TrendingDown, adminOnly: true },
    { to: '/payments', label: 'Payments', icon: Receipt },
    { to: '/bills', label: 'Bills & Statements', icon: FileText },
    { to: '/financials', label: 'P&L / Balance Sheet', icon: Scale, adminOnly: true },
    { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
    { to: '/exports', label: 'Data Export (CSV)', icon: FileSpreadsheet, adminOnly: true },
    { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <>
      {/* More Drawer Overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 inset-x-0 bg-white rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">More Features</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-2">
              {moreItems
                .filter((item) => !item.adminOnly || isOwnerOrAdmin)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-100 hover:border-sky-200 text-slate-700 hover:text-sky-700 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center text-sky-600">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </NavLink>
                  );
                })}
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-xs border border-red-200 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 lg:hidden px-3 py-1.5 flex items-center justify-around shadow-lg">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
              isActive ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* Deliveries */}
        <NavLink
          to="/today"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
              isActive ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Today</span>
        </NavLink>

        {/* Central Scan Button */}
        <NavLink
          to="/scan"
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all">
            <QrCode className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-sky-600 mt-0.5">Scan QR</span>
        </NavLink>

        {/* Customers */}
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
              isActive ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Customers</span>
        </NavLink>

        {/* More Menu */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            moreOpen ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </>
  );
};
