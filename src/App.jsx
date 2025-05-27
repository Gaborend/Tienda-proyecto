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
import SalesHistoryPage from './pages/SalesHistoryPage'; // <-- IMPORTAR NUEVA PÁGINA
import './App.css';

function App() {
  return (
    <div className="App">
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
        {/* --- NUEVA RUTA PARA HISTORIAL DE VENTAS --- */}
        <Route 
          path="/sales-history" 
          element={
            // Permitir a admin, soporte y caja ver el historial
            <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}>
              <SalesHistoryPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;