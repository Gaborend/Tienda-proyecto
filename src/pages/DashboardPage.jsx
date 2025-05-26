// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import configService from '../services/configService';

function DashboardPage() {
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const basicUser = authService.getCurrentUser();

  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await configService.getMe();
        setCurrentUserDetails(data);
      } catch (err) {
        setError('No se pudieron cargar los detalles completos del usuario.');
        console.error("Error en DashboardPage:", err);
        if (!basicUser) {
            authService.logout();
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (basicUser && basicUser.userId) {
        fetchUserDetails();
    } else {
        console.log("No hay usuario básico en Dashboard, redirigiendo a login.");
        authService.logout();
        navigate('/login');
    }
    
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // <<< --- LÓGICA DE PERMISOS AJUSTADA --- >>>
  const canAccessAdminSettings = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessCustomersPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>¡Bienvenido a NoxSkin!</h2>
      
      {loading && <p>Cargando tu información...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {currentUserDetails ? (
        <div style={{ 
            border: '1px solid #555', 
            padding: '15px', 
            marginBottom: '20px', 
            borderRadius: '5px'
        }}>
          <h3>Tu Perfil:</h3>
          <p><strong>Usuario:</strong> {currentUserDetails.username}</p>
          <p><strong>Nombre Completo:</strong> {currentUserDetails.full_name}</p>
          <p><strong>Email:</strong> {currentUserDetails.email || 'No especificado'}</p>
          <p><strong>Rol:</strong> {currentUserDetails.role}</p>
          <p><strong>Estado:</strong> {currentUserDetails.is_active ? 'Activo' : 'Inactivo'}</p>
        </div>
      ) : basicUser && !loading && !error ? ( 
         <div style={{ border: '1px solid #555', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
            <h3>Tu Perfil (Básico):</h3>
            <p>Usuario: {basicUser.username}</p>
            <p>Rol: {basicUser.role}</p>
          </div>
      ) : !loading && !error ? (
         <p>No se pudo cargar la información del usuario.</p>
      ) : null }

      <hr style={{ borderColor: '#444' }}/>

      <h3>Accesos Rápidos:</h3>
      {/* Enlace a Configuración y Administración (solo admin/soporte) */}
      {canAccessAdminSettings && (
          <p>
            <Link 
                to="/admin-settings" 
                style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}
            >
                Ir a Configuración y Administración ⚙️
            </Link>
          </p>
      )}

      {/* Enlace a Gestionar Clientes (admin, soporte, caja) */}
      {canAccessCustomersPage && (
          <p>
            <Link 
                to="/customers" 
                style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}
            >
                Gestionar Clientes 👥
            </Link>
          </p>
      )}
      
      {/* Aquí podrías añadir más enlaces a otros módulos específicos para admin/soporte si es necesario */}
      {/*
      {canAccessAdminSettings && ( // Reutilizando la condición si los permisos son los mismos
          <>
            <p>
              <Link 
                  to="/inventory" 
                  style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}
              >
                  Gestionar Inventario 📦
              </Link>
            </p>
          </>
      )}
      */}
      
      {/* Enlaces para otros roles, como 'caja', podrían ir aquí si no están cubiertos arriba */}
      {/* Por ejemplo, si un 'caja' puede facturar pero no ver admin/clientes (ya cubierto arriba):
      {basicUser && basicUser.role === 'caja' && !canAccessCustomersPage && ( // Ejemplo de condición más específica si fuera necesario
        <p>
          <Link 
              to="/billing" 
              style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}
          >
              Crear Factura 🧾
          </Link>
        </p>
      )}
      */}

      <button 
          onClick={handleLogout} 
          style={{ 
              marginTop: '30px', 
              padding: '10px 20px', 
              cursor: 'pointer', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              fontSize: '16px'
          }}
      >
          Cerrar Sesión
      </button>

    </div>
  );
}

export default DashboardPage;