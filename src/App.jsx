// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CustomersPage from './pages/CustomersPage';
import InventoryPage from './pages/InventoryPage';
import ServicesPage from './pages/ServicesPage';
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
            <ProtectedRoute> {/* Requiere solo estar logueado */}
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
        {/* --- RUTAS ACTUALIZADAS --- */}
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}> {/* AÑADIDO 'caja' */}
              <InventoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/services" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}> {/* AÑADIDO 'caja' */}
              <ServicesPage />
            </ProtectedRoute>
          } 
        />
        {/* --- FIN RUTAS ACTUALIZADAS --- */}
      </Routes>
    </div>
  );
}

export default App;