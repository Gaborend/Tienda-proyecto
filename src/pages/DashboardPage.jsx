import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import configService from '../services/configService';

function DashboardPage() {
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const basicUser = useMemo(() => authService.getCurrentUser(), []);

  useEffect(() => {
    const token = authService.getToken();
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
            } finally {
                setLoading(false);
            }
        };
        fetchUserDetails();
    } else if (token) {
        console.warn("Token presente pero datos de usuario básicos no disponibles en localStorage. Redirigiendo a login para re-autenticar.");
        authService.logout(); 
        navigate('/login');
        setLoading(false); 
    }
    else {
        console.log("No hay token en Dashboard, redirigiendo a login.");
        navigate('/login');
        setLoading(false); 
    }
  }, [navigate, basicUser]); 

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Permisos
  const canAccessAdminSettings = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessCustomersPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessInventoryPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessServicesPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessBillingPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessSalesHistory = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessCashBalance = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessCashBalanceHistory = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessReportsPage = basicUser && ['admin', 'soporte'].includes(basicUser.role); // Permiso para /reports (ReportsPage)
  const canAccessFinancialReportsPage = basicUser && ['admin', 'soporte'].includes(basicUser.role); // Permiso para /financial-reports (FinancialReportsPage)

  // --- ESTILOS ---
  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', 
    minHeight: '100vh',
    width: '100%',       
    padding: '20px',
    boxSizing: 'border-box', 
    fontFamily: 'Arial, sans-serif', 
    backgroundColor: '#121212', 
    color: 'white', 
  };

  const contentWrapperStyle = {
    width: '100%',
    maxWidth: '750px', 
    textAlign: 'left', 
  };

  const headingStyle = { 
    textAlign: 'center', 
    color: 'rgb(255, 119, 0)',
    marginBottom: '30px', 
    fontSize: '2em',      
  };
  
  const profileBoxStyle = { 
    border: '1px solid #383838', 
    backgroundColor: '#1e1e1e', 
    padding: '25px', 
    marginBottom: '30px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0,0,0,0.25)', 
  };

  const profileBoxStyleBasic = { ...profileBoxStyle }; 

  const profileSectionTitleStyle = { 
    color: '#e0e0e0',
    marginTop: '0',
    marginBottom: '25px', 
    fontSize: '1.6em',
    textAlign: 'left',
    borderBottom: '1px solid #333', 
    paddingBottom: '10px',
  };
  
  const profileHeaderStyle = { 
    display: 'flex',
    alignItems: 'center',
    marginBottom: '25px',
  };

  const avatarPlaceholderStyle = {
    width: '70px', 
    height: '70px',
    borderRadius: '50%',
    backgroundColor: '#3a3f4b', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '20px',
    color: '#79cdf0', 
    fontSize: '28px', 
    fontWeight: 'bold',
    flexShrink: 0,
  };

  const profileInfoContainerStyle = { 
    display: 'flex',
    flexDirection: 'column',
  };

  const profileFullNameStyle = {
    fontSize: '1.5em', 
    color: '#ffffff',
    fontWeight: '600', 
    margin: '0 0 5px 0',
  };

  const profileUsernameStyle = {
    fontSize: '1em',
    color: '#b0b0b0', 
    margin: '0 0 8px 0',
  };

  const profileRoleStyle = {
    fontSize: '0.95em',
    color: '#79cdf0', 
    fontWeight: '500',
    fontStyle: 'italic',
  };

  const profileDetailsListStyle = { 
    marginTop: '20px',
  };

  const profileDetailItemStyle = { 
    display: 'flex',
    alignItems: 'center', 
    marginBottom: '12px',
    fontSize: '1em',
  };

  const profileDetailLabelStyle = { 
    fontWeight: 'bold',
    color: '#b0b0b0',
    minWidth: '100px', 
    flexShrink: 0,
    marginRight: '10px',
  };

  const profileDetailValueStyle = { 
    color: '#ffffff',
    wordBreak: 'break-word',
  };

  const statusBadgeStyle = (isActive) => ({
    padding: '5px 12px',
    borderRadius: '16px', 
    fontSize: '0.9em',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: isActive ? '#28a745' : '#e74c3c', 
    textAlign: 'center',
  });

  const sectionHeadingStyle = { 
    color: '#e0e0e0',
    marginTop: '0',
    marginBottom: '25px', 
    fontSize: '1.6em',    
  };

  const quickLinkStyle = {
    display: 'block', textDecoration: 'none', color: '#79cdf0', fontWeight: 'bold',
    padding: '15px', margin: '12px auto', borderRadius: '6px', backgroundColor: '#2a2f3b', 
    textAlign: 'center', maxWidth: '400px', 
    transition: 'background-color 0.2s ease-in-out, transform 0.1s ease',
    border: '1px solid #3a3f4b', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', 
  };
  
  const logoutButtonStyle = {
    display: 'block', margin: '50px auto 30px auto', padding: '15px 30px', cursor: 'pointer',
    backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px',
    fontSize: '1em', fontWeight: 'bold', transition: 'background-color 0.2s ease-in-out',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
  };

  const getInitials = (name) => {
    if (!name) return 'U'; 
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0].substring(0,1).toUpperCase() + parts[parts.length - 1].substring(0,1).toUpperCase();
    }
    return name.substring(0,1).toUpperCase();
  };

  return (
    <div style={pageStyle}>
      <div style={contentWrapperStyle}>
        <h2 style={headingStyle}>¡Bienvenid@ a NoxSkin!</h2> 
        
        {loading && !currentUserDetails && <p style={{ textAlign: 'center', fontSize: '1.1em', margin: '20px 0' }}>Cargando tu información...</p>}
        {error && <p style={{ color: '#e74c3c', textAlign: 'center', fontSize: '1.1em', margin: '20px 0' }}>{error}</p>}

        {currentUserDetails ? (
          <div style={profileBoxStyle}>
            <h3 style={profileSectionTitleStyle}>Tu Perfil:</h3>
            <div style={profileHeaderStyle}>
              <div style={avatarPlaceholderStyle}>
                {getInitials(currentUserDetails.full_name)}
              </div>
              <div style={profileInfoContainerStyle}>
                <p style={profileFullNameStyle}>{currentUserDetails.full_name || 'Nombre no disponible'}</p>
                <p style={profileUsernameStyle}>@{currentUserDetails.username || 'usuario'}</p>
                <p style={profileRoleStyle}>{currentUserDetails.role}</p>
              </div>
            </div>
            <div style={profileDetailsListStyle}>
              <div style={profileDetailItemStyle}>
                <span style={profileDetailLabelStyle}>Email:</span>
                <span style={profileDetailValueStyle}>{currentUserDetails.email || 'No especificado'}</span>
              </div>
              <div style={profileDetailItemStyle}>
                <span style={profileDetailLabelStyle}>Estado:</span>
                <span style={statusBadgeStyle(currentUserDetails.is_active)}>
                  {currentUserDetails.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        ) : basicUser && !loading && !error ? ( 
            <div style={profileBoxStyleBasic}>
              <h3 style={profileSectionTitleStyle}>Tu Perfil (Básico):</h3>
              <div style={profileHeaderStyle}>
                <div style={avatarPlaceholderStyle}>
                  {basicUser.username ? basicUser.username.substring(0,1).toUpperCase() : 'U'}
                </div>
                <div style={profileInfoContainerStyle}>
                  <p style={profileFullNameStyle}>@{basicUser.username || 'usuario'}</p>
                  <p style={profileRoleStyle}>{basicUser.role}</p>
                </div>
              </div>
            </div>
        ) : !loading && !error ? (
            <p style={{ textAlign: 'center', margin: '20px 0' }}>No se pudo cargar la información del usuario. Intenta recargar o volver a iniciar sesión.</p>
        ) : null }

        <hr style={{ borderColor: '#333', margin: '40px 0', borderStyle: 'solid', borderWidth: '0.5px 0 0 0' }}/>

        <div>
          <h3 style={{...sectionHeadingStyle, textAlign: 'center' }}>Accesos Rápidos:</h3>
          {canAccessAdminSettings && ( <Link to="/admin-settings" style={quickLinkStyle}> Ir a Configuración y Administración ⚙️ </Link> )}
          {canAccessCustomersPage && ( <Link to="/customers" style={quickLinkStyle}> Gestionar Clientes 👥 </Link> )}
          {canAccessInventoryPage && ( <Link to="/inventory" style={quickLinkStyle}> Gestionar Inventario 📦 </Link> )}
          {canAccessServicesPage && ( <Link to="/services" style={quickLinkStyle}> Gestionar Servicios 💄 </Link> )}
          {canAccessBillingPage && ( <Link to="/billing" style={quickLinkStyle}> Nueva Factura / Ventas 🧾 </Link> )}
          {canAccessSalesHistory && ( <Link to="/sales-history" style={quickLinkStyle}> Historial de Ventas 📜 </Link> )}
          {canAccessCashBalance && ( <Link to="/cash-balance" style={quickLinkStyle}> Cuadre de Caja 💵 </Link> )}
          {canAccessCashBalanceHistory && ( <Link to="/cash-balance-history" style={quickLinkStyle}> Historial de Cuadres de Caja 📊 </Link> )}
          
          {/* ENLACE A REPORTES GENERALES (ReportsPage) */}
          {canAccessReportsPage && ( 
            <Link to="/reports" style={quickLinkStyle}> 
              Reportes Generales 📈 
            </Link> 
          )}
          
          {/* ENLACE A REPORTES FINANCIEROS/INVENTARIO (FinancialReportsPage) */}
          {canAccessFinancialReportsPage && ( 
            <Link to="/financial-reports" style={quickLinkStyle}> 
              Reportes Financieros/Inventario 💸
            </Link> 
          )}

        </div>
        
        <button onClick={handleLogout} style={logoutButtonStyle}> Cerrar Sesión </button>
      </div>
    </div>
  );
}

export default DashboardPage;