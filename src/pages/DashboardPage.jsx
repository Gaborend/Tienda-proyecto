// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import configService from '../services/configService';
import { useTheme } from '../contexts/ThemeContext';
import {
  FaCog, FaUsers, FaBoxOpen, FaConciergeBell, FaFileInvoiceDollar,
  FaHistory, FaCashRegister, FaChartBar, FaFileContract, FaBalanceScaleLeft
} from 'react-icons/fa';

// --- COMPONENTE SELECTOR DE TEMA ---
function ThemeSelector() {
  const { themeName, changeTheme, availableThemes, currentThemeColors } = useTheme();
  // ... (estilos del ThemeSelector como en la versión anterior)
  const selectorStyle = { marginBottom: '0', padding: '6px 8px', borderRadius: '5px', border: `1px solid ${currentThemeColors.borderColor}`, backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.primaryText, fontFamily: 'inherit', fontSize: '0.8em', cursor: 'pointer', minWidth: '200px', outline: 'none' };
  const labelStyle = { marginRight: '8px', fontSize: '0.9em', color: currentThemeColors.secondaryText, fontWeight: '500' };
  const containerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 15px', borderTop: `1px solid ${currentThemeColors.borderColor}`, borderBottom: `1px solid ${currentThemeColors.borderColor}`, marginBottom: '25px', backgroundColor: currentThemeColors.contentBackground, borderRadius: '8px', marginTop: '15px', boxShadow: `0 2px 6px rgba(0,0,0,0.07)` };

  return (
    <div style={containerStyle}>
      <label htmlFor="theme-select" style={labelStyle}>Tema:</label>
      <select id="theme-select" value={themeName} onChange={(e) => changeTheme(e.target.value)} style={selectorStyle}>
        {Object.keys(availableThemes).map(key => (
          <option key={key} value={key} style={{backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.primaryText}}>
            {availableThemes[key].name}
          </option>
        ))}
      </select>
    </div>
  );
}

function DashboardPage() {
  const { currentThemeColors } = useTheme();
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [mainHeadingAnimated, setMainHeadingAnimated] = useState(false);
  const [quickLinksSectionAnimated, setQuickLinksSectionAnimated] = useState(false);
  const basicUser = useMemo(() => authService.getCurrentUser(), []);

  useEffect(() => {
    const token = authService.getToken();
    if (token && basicUser && basicUser.userId) {
        const fetchUserDetails = async () => {
            setLoading(true); setError('');
            try {
                const data = await configService.getMe(); setCurrentUserDetails(data);
            } catch (err) { setError('No se pudieron cargar los detalles completos del usuario.');
            } finally { setLoading(false); }
        };
        fetchUserDetails();
    } else if (token) {
        authService.logout(); navigate('/login'); setLoading(false); 
    } else {
        navigate('/login'); setLoading(false); 
    }
  }, [navigate, basicUser]);

  useEffect(() => {
    if (!loading && (currentUserDetails || basicUser)) {
      const mainTimer = setTimeout(() => setMainHeadingAnimated(true), 100); 
      const quickLinksTimer = setTimeout(() => setQuickLinksSectionAnimated(true), 200);
      return () => { clearTimeout(mainTimer); clearTimeout(quickLinksTimer); };
    }
  }, [loading, currentUserDetails, basicUser]);

  const handleLogout = () => { authService.logout(); navigate('/login'); };

  const canAccessAdminSettings = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessCustomersPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessInventoryPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessServicesPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessBillingPage = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessSalesHistory = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessCashBalance = basicUser && ['admin', 'soporte', 'caja'].includes(basicUser.role);
  const canAccessCashBalanceHistory = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessReportsPage = basicUser && ['admin', 'soporte'].includes(basicUser.role);
  const canAccessFinancialReportsPage = basicUser && ['admin', 'soporte'].includes(basicUser.role);

  const pageStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '10px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', backgroundColor: currentThemeColors.pageBackground, color: currentThemeColors.primaryText, transition: 'background-color 0.3s ease, color 0.3s ease' };
  const contentWrapperStyle = { width: '100%', maxWidth: '760px', textAlign: 'left', padding: '0 10px', boxSizing: 'border-box' };
  const mainHeadingStyle = { textAlign: 'center', color: currentThemeColors.headingColor, marginBottom: '25px', fontSize: '2.0em', fontWeight: 'bold', letterSpacing: '0.2px', opacity: mainHeadingAnimated ? 1 : 0, transform: mainHeadingAnimated ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)', transition: 'opacity 0.9s ease-out, transform 0.9s cubic-bezier(0.165, 0.84, 0.44, 1)' };
  const profileBoxStyle = { border: `1px solid ${currentThemeColors.borderColor}`, backgroundColor: currentThemeColors.contentBackground, padding: '15px 20px', marginBottom: '25px', borderRadius: '10px', boxShadow: `0 4px 15px rgba(0,0,0,0.10)`, transition: 'background-color 0.3s ease, border-color 0.3s ease' };
  const profileSectionTitleStyle = { color: currentThemeColors.primaryText, marginTop: '0', marginBottom: '15px', fontSize: '1.3em', textAlign: 'left', borderBottom: `2px solid ${currentThemeColors.accent}`, paddingBottom: '8px' };
  const profileHeaderStyle = { display: 'flex', alignItems: 'center', marginBottom: '15px' };
  const avatarPlaceholderStyle = { width: '50px', height: '50px', borderRadius: '50%', backgroundColor: currentThemeColors.avatarBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', color: currentThemeColors.avatarColor, fontSize: '20px', fontWeight: 'bold', flexShrink: 0, border: `2px solid ${currentThemeColors.accent}` };
  const profileInfoContainerStyle = { display: 'flex', flexDirection: 'column' };
  const profileFullNameStyle = { fontSize: '1.2em', color: currentThemeColors.primaryText, fontWeight: '600', margin: '0 0 4px 0' };
  const profileUsernameStyle = { fontSize: '0.85em', color: currentThemeColors.secondaryText, margin: '0 0 5px 0' };
  const profileRoleStyle = { fontSize: '0.8em', color: currentThemeColors.accent, fontWeight: '500', fontStyle: 'italic' };
  const profileDetailsListStyle = { marginTop: '12px' };
  const profileDetailItemStyle = { display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.9em' };
  const profileDetailLabelStyle = { fontWeight: 'bold', color: currentThemeColors.secondaryText, minWidth: '70px', flexShrink: 0, marginRight: '8px' };
  const profileDetailValueStyle = { color: currentThemeColors.primaryText, wordBreak: 'break-word' };
  const statusBadgeStyle = (isActive) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold', color: isActive ? currentThemeColors.successText : currentThemeColors.dangerText, backgroundColor: isActive ? currentThemeColors.successBg : currentThemeColors.dangerBg, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.4px' });
  const mainSectionsSeparatorStyle = { borderColor: currentThemeColors.borderColor, margin: '30px 0', borderStyle: 'solid', borderWidth: '1px 0 0 0' };
  const quickLinksSectionHeadingStyle = { color: currentThemeColors.headingColor, marginTop: '0', marginBottom: '20px', fontSize: '1.6em', textAlign: 'center', fontWeight: '600', opacity: quickLinksSectionAnimated ? 1 : 0, transform: quickLinksSectionAnimated ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)', transition: 'opacity 0.9s ease-out 0.1s, transform 0.9s cubic-bezier(0.165, 0.84, 0.44, 1) 0.1s' };
  
  // Ajuste en quickLinksContainerStyle: se mantiene igual, el centrado se hace en el item.
  const quickLinksContainerStyle = { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', // minmax ajustado para que 3 columnas sea lo más probable
    gap: '15px', 
    marginBottom: '30px' 
  };

  const baseQuickLinkTransitions = 'background-color 0.15s ease-out, transform 0.1s ease-out, box-shadow 0.15s ease-out';
  const quickLinkBaseStyleStatic = { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
    textDecoration: 'none', color: currentThemeColors.quickLinkText, fontWeight: '500', 
    padding: '15px 10px', borderRadius: '8px', 
    backgroundColor: currentThemeColors.quickLinkBackground, 
    textAlign: 'center', border: `1px solid ${currentThemeColors.quickLinkBorder}`, 
    boxShadow: `0 3px 10px rgba(0,0,0,0.08)`, cursor: 'pointer',
    minHeight: '90px', fontSize: '0.9em',
  };
  
  const iconStyle = { fontSize: '1.6em', marginBottom: '8px', color: currentThemeColors.accent };
  const logoutButtonStyle = { display: 'block', margin: '40px auto 25px auto', padding: '12px 30px', cursor: 'pointer', backgroundColor: currentThemeColors.dangerBg, color: currentThemeColors.dangerText, border: 'none', borderRadius: '8px', fontSize: '0.95em', fontWeight: 'bold', transition: 'background-color 0.2s ease-in-out, transform 0.15s ease, box-shadow 0.2s ease', boxShadow: `0 3px 10px rgba(0,0,0,0.12)`, textAlign: 'center', minWidth: '160px' };
  const getInitials = (name) => { return name ? name.trim().split(/\s+/).reduce((acc, word, idx, arr) => acc + (idx === 0 || idx === arr.length - 1 ? word.substring(0,1).toUpperCase() : ''), '') || 'U' : 'U'; };
  
  const handleQuickLinkMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = currentThemeColors.quickLinkHoverBackground;
    e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)'; 
    e.currentTarget.style.boxShadow = `0 8px 18px rgba(0,0,0,0.15)`; 
  };

  const handleQuickLinkMouseLeave = (e) => {
    const isAnimatedIn = e.currentTarget.style.opacity === '1' || e.currentTarget.style.opacity === '';
    e.currentTarget.style.backgroundColor = currentThemeColors.quickLinkBackground;
    // Mantenemos el scale(1) y translateY(0) si ya está animado, o el estado pre-animación.
    // El transform de hover es temporal, al salir se vuelve al transform de la animación de entrada (o pre-entrada).
    const baseTransform = isAnimatedIn ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)';
    // Si el item es el último y está solo, su 'gridColumn' podría afectar cómo se resetea el transform.
    // Sin embargo, el 'transform' de hover es aplicado y quitado, el de la animación de entrada es más persistente.
    // Por ahora, resetear al transform base de la animación debería ser suficiente.
    e.currentTarget.style.transform = baseTransform; 
    e.currentTarget.style.boxShadow = quickLinkBaseStyleStatic.boxShadow;
  };
  
  const loadingMessageStyle = { textAlign: 'center', fontSize: '1.1em', margin: '30px 0', color: currentThemeColors.secondaryText, fontWeight: '500' };

  const quickLinkItems = [
    ...(canAccessAdminSettings ? [{ to: "/admin-settings", text: "Configuración", icon: <FaCog style={iconStyle} /> }] : []),
    ...(canAccessCustomersPage ? [{ to: "/customers", text: "Clientes", icon: <FaUsers style={iconStyle} /> }] : []),
    ...(canAccessInventoryPage ? [{ to: "/inventory", text: "Inventario", icon: <FaBoxOpen style={iconStyle} /> }] : []),
    ...(canAccessServicesPage ? [{ to: "/services", text: "Servicios", icon: <FaConciergeBell style={iconStyle} /> }] : []),
    ...(canAccessBillingPage ? [{ to: "/billing", text: "Facturación", icon: <FaFileInvoiceDollar style={iconStyle} /> }] : []),
    ...(canAccessSalesHistory ? [{ to: "/sales-history", text: "Historial Ventas", icon: <FaHistory style={iconStyle} /> }] : []),
    ...(canAccessCashBalance ? [{ to: "/cash-balance", text: "Cuadre Caja", icon: <FaCashRegister style={iconStyle} /> }] : []),
    ...(canAccessCashBalanceHistory ? [{ to: "/cash-balance-history", text: "Historial Cuadres", icon: <FaBalanceScaleLeft style={iconStyle} /> }] : []),
    ...(canAccessReportsPage ? [{ to: "/reports", text: "Reportes Generales", icon: <FaChartBar style={iconStyle} /> }] : []),
    ...(canAccessFinancialReportsPage ? [{ to: "/financial-reports", text: "Reportes Finales", icon: <FaFileContract style={iconStyle} /> }] : []),
  ];

  const assumedColumns = 3; // Basado en el diseño actual que tiende a 3 columnas

  return (
    <div style={pageStyle}>
      <div style={contentWrapperStyle}>
        <h2 style={mainHeadingStyle}>¡Bienvenid@ a NoxSkin!</h2>
        <ThemeSelector />
        {loading && !currentUserDetails && <p style={loadingMessageStyle}>Cargando tu información...</p>}
        {error && <p style={{ color: currentThemeColors.dangerText, backgroundColor: currentThemeColors.dangerBg, padding: '10px 12px', borderRadius: '6px', textAlign: 'center', fontSize: '0.9em', margin: '20px 0' }}>{error}</p>}

        {currentUserDetails ? (
          <div style={profileBoxStyle}>
            <h3 style={profileSectionTitleStyle}>Tu Perfil</h3>
            <div style={profileHeaderStyle}>
              <div style={avatarPlaceholderStyle}>{getInitials(currentUserDetails.full_name)}</div>
              <div style={profileInfoContainerStyle}>
                <p style={profileFullNameStyle}>{currentUserDetails.full_name || 'Nombre no disponible'}</p>
                <p style={profileUsernameStyle}>@{currentUserDetails.username || 'usuario'}</p>
                <p style={profileRoleStyle}>{currentUserDetails.role}</p>
              </div>
            </div>
            <div style={profileDetailsListStyle}>
              <div style={profileDetailItemStyle}><span style={profileDetailLabelStyle}>Email:</span><span style={profileDetailValueStyle}>{currentUserDetails.email || 'No especificado'}</span></div>
              <div style={profileDetailItemStyle}><span style={profileDetailLabelStyle}>Estado:</span><span style={statusBadgeStyle(currentUserDetails.is_active)}>{currentUserDetails.is_active ? 'Activo' : 'Inactivo'}</span></div>
            </div>
          </div>
        ) : basicUser && !loading && !error ? ( 
            <div style={profileBoxStyle}>
              <h3 style={profileSectionTitleStyle}>Tu Perfil (Básico)</h3>
              <div style={profileHeaderStyle}>
                <div style={avatarPlaceholderStyle}>{basicUser.username ? getInitials(basicUser.username) : 'U'}</div>
                <div style={profileInfoContainerStyle}>
                    <p style={profileFullNameStyle}>@{basicUser.username || 'usuario'}</p>
                    <p style={profileRoleStyle}>{basicUser.role}</p>
                </div>
              </div>
              <p style={{color: currentThemeColors.secondaryText, textAlign: 'center', marginTop: '12px', fontSize: '0.85em'}}>Información detallada no disponible.</p>
            </div>
        ) : !loading && !error ? (
            <p style={{ textAlign: 'center', margin: '20px 0', color: currentThemeColors.secondaryText, fontSize: '1em' }}>No se pudo cargar la información del usuario.</p>
        ) : null }

        <hr style={mainSectionsSeparatorStyle}/>

        <div>
          <h3 style={quickLinksSectionHeadingStyle}>Accesos Rápidos</h3> 
          <div style={quickLinksContainerStyle}>
            {quickLinkItems.map((item, index) => {
              const isLastItem = index === quickLinkItems.length - 1;
              // Asumimos 3 columnas para este cálculo.
              // Si el número de items es 10, el 10mo item (índice 9) está solo (10 % 3 = 1).
              // Si el número de items es 7, el 7mo item (índice 6) está solo (7 % 3 = 1).
              const isAloneInLastRow = isLastItem && (quickLinkItems.length % assumedColumns === 1);
              
              let itemSpecificStyle = {};
              if (isAloneInLastRow) {
                itemSpecificStyle.gridColumn = `1 / span ${assumedColumns}`; 
                // O para centrarlo si el contenido no llena el espacio y el span es muy ancho:
                // itemSpecificStyle.justifySelf = 'center'; // Centra el item en la celda de la grid
                // Y podrías darle un maxWidth al item mismo si es necesario
                // itemSpecificStyle.maxWidth = quickLinkBaseStyleStatic.minHeight; // Ejemplo para hacerlo más cuadrado
              }

              return (
                <Link 
                  key={item.to}
                  to={item.to} 
                  style={{
                    ...quickLinkBaseStyleStatic,
                    opacity: quickLinksSectionAnimated ? 1 : 0,
                    transform: quickLinksSectionAnimated ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)',
                    transition: `opacity 0.3s ease-out ${index * 0.04 + 0.05}s, transform 0.3s cubic-bezier(0.215, 0.610, 0.355, 1) ${index * 0.04 + 0.05}s, ${baseQuickLinkTransitions}`,
                    ...itemSpecificStyle, // Aplicar estilo especial para el último item si está solo
                  }}
                  onMouseEnter={handleQuickLinkMouseEnter} 
                  onMouseLeave={handleQuickLinkMouseLeave}
                > 
                  {item.icon}
                  {item.text}
                </Link>
              );
            })}
          </div>
        </div>
        
        <button 
            onClick={handleLogout} 
            style={logoutButtonStyle}
            onMouseEnter={e => { 
                e.currentTarget.style.backgroundColor = currentThemeColors.accentHover;
                e.currentTarget.style.color = currentThemeColors.primaryText;
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; 
                e.currentTarget.style.boxShadow = `0 5px 12px rgba(0,0,0,0.22)`;
            }}
            onMouseLeave={e => { 
                e.currentTarget.style.backgroundColor = currentThemeColors.dangerBg; 
                e.currentTarget.style.color = currentThemeColors.dangerText; 
                e.currentTarget.style.transform = 'translateY(0px) scale(1)'; 
                e.currentTarget.style.boxShadow = logoutButtonStyle.boxShadow;
            }}
        > 
          Cerrar Sesión 
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;