// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CustomersPage from './pages/CustomersPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LoginPage />} /> 
        
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

        {/* <<<--- RUTA MODIFICADA PARA CLIENTES --- >>> */}
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'soporte', 'caja']}> {/* AÑADIDO 'caja' */}
              <CustomersPage />
            </ProtectedRoute>
          } 
        />
        {/* <<<--- FIN RUTA MODIFICADA --- >>> */}

      </Routes>
    </div>
  );
}

export default App;