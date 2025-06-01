// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CustomersPage from './pages/CustomersPage';
import InventoryPage from './pages/InventoryPage';
import ServicesPage from './pages/ServicesPage';
import BillingPage from './pages/BillingPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import CashBalancePage from './pages/CashBalancePage';
import CashBalanceHistoryPage from './pages/CashBalanceHistoryPage';
import ReportsPage from './pages/ReportsPage';
import { ThemeProvider } from './contexts/ThemeContext'; // Importado y listo para usar
import FinancialReportsPage from './pages/FinancialReportsPage';

import './App.css';

function App() {
  return (
    // Envuelve el contenido principal de tu aplicación con ThemeProvider
    // para que todas las rutas y componentes descendientes puedan acceder al contexto del tema.
    <ThemeProvider>
      <div className="App"> {/* Puedes mantener esta div si tienes estilos globales en App.css */}
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LoginPage />} /> 
          
          {/* Rutas Protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-settings" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte']}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <CustomersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <InventoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/services" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <ServicesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/billing" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <BillingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sales-history" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <SalesHistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cash-balance" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
                <CashBalancePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cash-balance-history" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte']}> 
                <CashBalanceHistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte']}>
                <ReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/financial-reports" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'soporte']}>
                <FinancialReportsPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;