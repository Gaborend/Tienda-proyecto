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
    const token = authService.getToken(); // Verificar token primero
    if (token && basicUser && basicUser.userId) {
        const fetchUserDetails = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await configService.getMe();
                setCurrentUserDetails(data);
            } catch (err) {
                setError('No se pudieron cargar los detalles completos del usuario.');
                console.error("Error en DashboardPage al cargar detalles:", err);
                // Si falla la carga de detalles pero hay token, podríamos quedarnos o redirigir
                // Por ahora, solo mostramos el error.
            } finally {
                setLoading(false);
            }
        };
        fetchUserDetails();
    } else if (token) {
        // Hay token pero basicUser es problemático o no está.
        // Esto podría indicar que localStorage está corrupto o 'userData' no se guardó bien.
        console.warn("Token presente pero datos de usuario básicos no disponibles en localStorage. Redirigiendo a login para re-autenticar.");
        authService.logout(); // Limpiar estado inconsistente
        navigate('/login');
        setLoading(false); // Detener carga
    }
    else {
        console.log("No hay token en Dashboard, redirigiendo a login.");
        authService.logout(); 
        navigate('/login');
        setLoading(false); // Detener carga
    }
  }, [navigate]); // basicUser no es una buena dependencia aquí porque su referencia podría cambiar causando re-ejecuciones.
                  // La lógica ahora se basa más en el token y la carga inicial.

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Permisos para enlaces
  const canAccessAdminSettings = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessCustomersPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  // --- PERMISOS ACTUALIZADOS ---
  const canAccessInventoryPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessServicesPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  // --- FIN PERMISOS ACTUALIZADOS ---

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>¡Bienvenido a NoxSkin!</h2>
      
      {loading && !currentUserDetails && <p>Cargando tu información...</p>} {/* Mostrar solo si realmente está cargando detalles */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {currentUserDetails ? (
        <div style={{ border: '1px solid #555', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
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
         <p>No se pudo cargar la información del usuario. Intenta recargar o volver a iniciar sesión.</p>
      ) : null }

      <hr style={{ borderColor: '#444' }}/>

      <h3>Accesos Rápidos:</h3>
      {canAccessAdminSettings && (
          <p>
            <Link to="/admin-settings" style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                Ir a Configuración y Administración ⚙️
            </Link>
          </p>
      )}
      {canAccessCustomersPage && (
          <p>
            <Link to="/customers" style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                Gestionar Clientes 👥
            </Link>
          </p>
      )}
      {/* --- ENLACES ACTUALIZADOS --- */}
      {canAccessInventoryPage && ( 
          <p>
            <Link to="/inventory" style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                Gestionar Inventario 📦
            </Link>
          </p>
      )}
      {canAccessServicesPage && ( 
          <p>
            <Link to="/services" style={{ textDecoration: 'none', color: '#61dafb', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                Gestionar Servicios 💄
            </Link>
          </p>
      )}
      {/* --- FIN ENLACES ACTUALIZADOS --- */}
      
      <button 
          onClick={handleLogout} 
          style={{ marginTop: '30px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px' }}
      >
          Cerrar Sesión
      </button>
    </div>
  );
}

export default DashboardPage;