import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  QrCode,
  Users,
  Package,
  Truck,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Scale,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarNavItem {
  to: string;
  label: string;
  icon: any;
  exact?: boolean;
  adminOnly?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export const DesktopSidebar: React.FC = () => {
  const { role } = useAuth();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const sections: SidebarSection[] = [
    {
      title: 'Operations',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { to: '/today', label: "Today's Delivery", icon: Clock },
        { to: '/scan', label: 'Door QR Scanner', icon: QrCode },
        { to: '/blank-qr', label: 'Blank QR Tags', icon: QrCode },
      ],
    },
    {
      title: 'Parties & CRM',
      items: [
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/suppliers', label: 'Suppliers & Vendors', icon: Users, adminOnly: true },
      ],
    },
    {
      title: 'Sales & Billing',
      items: [
        { to: '/bills', label: 'Invoices & Statements', icon: FileText },
        { to: '/payments', label: 'Customer Payments', icon: Receipt },
      ],
    },
    {
      title: 'Purchases & Expenses',
      items: [
        { to: '/purchases', label: 'Purchases', icon: Truck, adminOnly: true },
        { to: '/expenses', label: 'Expenses', icon: TrendingDown, adminOnly: true },
      ],
    },
    {
      title: 'Inventory & Items',
      items: [
        { to: '/products', label: 'Products & Pricing', icon: Package },
        { to: '/inventory', label: 'Live Stock & Logs', icon: Package },
      ],
    },
    {
      title: 'Accounting & Reports',
      items: [
        { to: '/financials', label: 'Books & Financials', icon: Scale, adminOnly: true },
        { to: '/reports', label: 'Reports & Ageing', icon: BarChart3, adminOnly: true },
      ],
    },
    {
      title: 'Administration',
      items: [
        { to: '/exports', label: 'Data Export (CSV)', icon: FileSpreadsheet, adminOnly: true },
        { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 min-h-[calc(100vh-65px)] p-3 shrink-0 shadow-lg select-none">
      <div className="space-y-4 overflow-y-auto pr-1">
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isOwnerOrAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                {section.title}
              </p>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-3 border-t border-slate-800 px-2">
        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Milk & More Books Active</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Automated dairy accounts & real-time Atlas sync.</p>
          <NavLink
            to="/financials"
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <Scale className="w-3.5 h-3.5" />
            Open Day & Cash Books
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
