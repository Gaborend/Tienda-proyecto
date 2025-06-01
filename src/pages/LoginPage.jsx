// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';

// CORRECCIÓN AQUÍ: Usando el nombre de tu imagen "logo.jpeg"
import companyLogo from '../assets/logo.jpeg'; // <--- AJUSTADO AL NOMBRE DE TU IMAGEN

function LoginPage() {
  const { currentThemeColors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await authService.login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales o la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ESTILOS ADAPTADOS AL TEMA ---
  const loginPageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: currentThemeColors.pageBackground, 
    color: currentThemeColors.primaryText, 
    transition: 'background-color 0.3s ease, color 0.3s ease',
  };

  const loginBoxStyle = {
    backgroundColor: currentThemeColors.contentBackground, 
    padding: '45px 55px',
    borderRadius: '16px', 
    boxShadow: `0 12px 35px rgba(0,0,0,0.25)`, 
    width: '100%',
    maxWidth: '480px',
    textAlign: 'center',
    transition: 'background-color 0.3s ease',
  };

  const logoStyle = {
    width: '150px', 
    height: 'auto', 
    marginBottom: '30px', 
    borderRadius: '8px' 
  };

  const loginTitleStyle = {
    color: currentThemeColors.headingColor, 
    marginBottom: '45px',
    fontSize: '2.6em',
    fontWeight: 'bold',
  };

  const inputGroupStyle = {
    marginBottom: '30px',
    textAlign: 'left',
  };

  const labelStyle = {
    display: 'block',
    color: currentThemeColors.secondaryText, 
    marginBottom: '12px',
    fontSize: '1.05em',
    fontWeight: 'bold',
  };

  const inputStyle = {
    width: '100%',
    padding: '18px 22px',
    backgroundColor: currentThemeColors.inputBackground, 
    border: `2px solid ${currentThemeColors.inputBorder}`,
    borderRadius: '10px',
    color: currentThemeColors.inputText, 
    fontSize: '1.05em',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    outline: 'none',
  };

  const buttonStyle = {
    width: '100%',
    padding: '18px 22px',
    backgroundColor: currentThemeColors.buttonPrimaryBg, 
    color: currentThemeColors.buttonPrimaryText, 
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out, transform 0.1s ease, box-shadow 0.2s ease',
    marginTop: '25px',
    boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
    outline: 'none',
  };

  const errorStyle = {
    color: currentThemeColors.dangerText, 
    backgroundColor: currentThemeColors.dangerBg,
    padding: '12px 15px',
    borderRadius: '8px',
    marginTop: '30px',
    textAlign: 'center',
    fontSize: '1em',
    minHeight: '1.5em',
    fontWeight: '500',
  };

  return (
    <div style={loginPageStyle}>
      <div style={loginBoxStyle}>
        {/* Aquí se usa la imagen importada */}
        <img src={companyLogo} alt="Logo de la Empresa" style={logoStyle} /> 
        
        <h2 style={loginTitleStyle}>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label htmlFor="username" style={labelStyle}>Usuario:</label>
            <input
              type="text"
              id="username"
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Tu nombre de usuario"
              onFocus={e => e.target.style.borderColor = currentThemeColors.accent}
              onBlur={e => e.target.style.borderColor = currentThemeColors.inputBorder}
            />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="password" style={labelStyle}>Contraseña:</label>
            <input
              type="password"
              id="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tu contraseña"
              onFocus={e => e.target.style.borderColor = currentThemeColors.accent}
              onBlur={e => e.target.style.borderColor = currentThemeColors.inputBorder}
            />
          </div>
          <button 
            type="submit" 
            style={{
              ...buttonStyle,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            disabled={isLoading}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.backgroundColor = currentThemeColors.accentHover; }}
            onMouseLeave={e => { if (!isLoading) e.currentTarget.style.backgroundColor = currentThemeColors.buttonPrimaryBg; }}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;