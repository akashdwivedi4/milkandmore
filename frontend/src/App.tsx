import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Dashboard } from './pages/Dashboard';
import { TodaysDelivery } from './pages/TodaysDelivery';
import { ScanQR } from './pages/ScanQR';
import { BlankQR } from './pages/BlankQR';
import { Customers } from './pages/Customers';
import { CustomerProfile } from './pages/CustomerProfile';
import { Products } from './pages/Products';
import { CustomerRates } from './pages/CustomerRates';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { SupplierDetails } from './pages/SupplierDetails';
import { Expenses } from './pages/Expenses';
import { Inventory } from './pages/Inventory';
import { Financials } from './pages/Financials';
import { DataExport } from './pages/DataExport';
import { Payments } from './pages/Payments';
import { Bills } from './pages/Bills';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CustomerPortal } from './pages/CustomerPortal';
import { CustomerAccounts } from './pages/CustomerAccounts';
import { CustomerHisaab } from './pages/CustomerHisaab';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes & Customer Portal */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/customer/portal/:token" element={<CustomerPortal />} />

            {/* Authenticated Application Shell with Route Protection */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="today" element={<TodaysDelivery />} />
              <Route path="scan" element={<ScanQR />} />
              <Route path="blank-qr" element={<BlankQR />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerProfile />} />
              <Route path="accounts" element={<CustomerAccounts />} />
              <Route path="hisaab" element={<CustomerAccounts />} />
              <Route path="products" element={<Products />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customer-rates" element={<CustomerRates />} />
              <Route
                path="purchases"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Purchases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="suppliers"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Suppliers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="suppliers/:id"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <SupplierDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route path="payments" element={<Payments />} />
              <Route path="bills" element={<Bills />} />
              <Route
                path="financials"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Financials />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exports"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <DataExport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
