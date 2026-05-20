import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import MedicinesPage from '@/pages/Medicines';
import BillingPage from '@/pages/Billing';
import PurchasesPage from '@/pages/Purchases';
import SuppliersPage from '@/pages/Suppliers';
import CustomersPage from '@/pages/Customers';
import ReportsPage from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';
import AuditLogsPage from '@/pages/AuditLogs';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="medicines" element={<MedicinesPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
