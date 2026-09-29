import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  TrendingUp,
  FileSpreadsheet,
  Calculator,
  Scan,
  FolderTree,
  BookOpen,
  Building,
  Wallet,
  Calendar,
  History,
  Tag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarNavItem {
  to: string;
  label: string;
  icon: any;
  exact?: boolean;
  adminOnly?: boolean;
  highlight?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export const DesktopSidebar: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const isItemActive = (to: string, exact?: boolean) => {
    if (to.includes('?')) {
      return `${location.pathname}${location.search}` === to;
    }
    if (to === '/financials') {
      return location.pathname === '/financials' && !location.search;
    }
    if (exact) {
      return location.pathname === to && !location.search;
    }
    return location.pathname === to || (location.pathname.startsWith(to + '/') && to !== '/');
  };

  const sections: SidebarSection[] = [
    {
      title: 'Dairy Operations',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { to: '/customers', label: 'Customers Master', icon: Users },
        { to: '/today', label: 'Daily Delivery', icon: Clock },
        { to: '/accounts', label: 'Customer Accounts', icon: Calculator, highlight: true },
      ],
    },
    {
      title: 'Sales & Collections',
      items: [
        { to: '/payments', label: 'Payment Register', icon: Receipt },
        { to: '/bills', label: 'Bills & Statements', icon: FileText },
        { to: '/financials?tab=ageing', label: 'Receivables Ageing', icon: History, adminOnly: true },
      ],
    },
    {
      title: 'Purchases & Suppliers',
      items: [
        { to: '/purchases', label: 'Milk Purchases & Returns', icon: Truck, adminOnly: true },
        { to: '/suppliers', label: 'Suppliers & Vendors', icon: Users, adminOnly: true },
      ],
    },
    {
      title: 'Inventory & Rates',
      items: [
        { to: '/products', label: 'Products & Pricing', icon: Package },
        { to: '/inventory', label: 'Live Stock & Inventory', icon: Package },
        { to: '/customer-rates', label: 'Special Customer Rates', icon: Tag, adminOnly: true },
      ],
    },
    {
      title: 'Expenses',
      items: [
        { to: '/expenses', label: 'Dairy Expenses', icon: TrendingDown, adminOnly: true },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { to: '/financials?tab=chart', label: 'Chart of Accounts', icon: FolderTree, adminOnly: true },
        { to: '/financials?tab=journal', label: 'Journal Entries', icon: FileText, adminOnly: true },
        { to: '/financials?tab=ledger', label: 'General Ledger', icon: BookOpen, adminOnly: true },
        { to: '/financials?tab=trial_balance', label: 'Trial Balance', icon: Scale, adminOnly: true },
        { to: '/financials?tab=cash_bank', label: 'Cash & Bank Books', icon: Wallet, adminOnly: true },
        { to: '/financials?tab=day_book', label: 'Day Book', icon: Calendar, adminOnly: true },
      ],
    },
    {
      title: 'Financial Reports',
      items: [
        { to: '/financials?tab=pnl', label: 'Profit & Loss (P&L)', icon: TrendingUp, adminOnly: true },
        { to: '/financials?tab=balance_sheet', label: 'Balance Sheet', icon: Building, adminOnly: true },
        { to: '/reports', label: 'Operational Reports', icon: BarChart3, adminOnly: true },
      ],
    },
    {
      title: 'QR & Digital Tools',
      items: [
        { to: '/blank-qr', label: 'Blank QR Management', icon: QrCode },
        { to: '/scan', label: 'Door QR Scanner', icon: Scan },
      ],
    },
    {
      title: 'Reports & Admin',
      items: [
        { to: '/exports', label: 'Data Export (CSV)', icon: FileSpreadsheet, adminOnly: true },
        { to: '/settings', label: 'Settings & Dairy Info', icon: Settings, adminOnly: true },
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
                const active = isItemActive(item.to, item.exact);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#6B1724] text-white font-bold shadow-sm border-l-4 border-[#2E7D32]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    } ${item.highlight && !active ? 'text-amber-300 hover:text-amber-200' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-amber-400' : ''}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold uppercase tracking-wider">
                        Accounts
                      </span>
                    )}
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
            <span>Dairy Business Engine</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Real-time ledger & automated milk billing.</p>
          <NavLink
            to="/accounts"
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#6B1724] hover:bg-[#52121b] border border-maroon-700 text-white font-bold text-[11px] py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-300" />
            Customer Accounts & Ledger
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
