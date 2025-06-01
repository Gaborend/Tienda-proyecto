// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useTheme } from '../contexts/ThemeContext'; // Importa el hook useTheme

function LoginPage() {
  const { currentThemeColors } = useTheme(); // Accede a los colores del tema
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Estado para la carga del botón
  const navigate = useNavigate();

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      // Podrías añadir un pequeño delay o un estado de carga aquí si la redirección no es inmediata
      // y quieres mostrar algo al usuario.
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true); // Iniciar carga
    try {
      const data = await authService.login(username, password);
      // No es necesario el console.log en producción
      // console.log("Login exitoso desde LoginPage, redirigiendo...", data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales o la conexión.');
    } finally {
      setIsLoading(false); // Finalizar carga
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
    transition: 'background-color 0.3s ease, color 0.3s ease', // Transición suave
  };

  const loginBoxStyle = {
    backgroundColor: currentThemeColors.contentBackground, 
    padding: '45px 55px', // Padding actual: 45px vertical, 55px horizontal
    borderRadius: '16px', 
    boxShadow: `0 12px 35px rgba(0,0,0,0.25)`, 
    width: '100%',
    maxWidth: '480px', // Ancho máximo actual
    textAlign: 'center',
    transition: 'background-color 0.3s ease',
  };

  const loginTitleStyle = {
    color: currentThemeColors.headingColor, 
    marginBottom: '45px', // Más espacio
    fontSize: '2.6em', // Más grande
    fontWeight: 'bold',
  };

  const inputGroupStyle = {
    marginBottom: '30px', // Más espacio
    textAlign: 'left',
  };

  const labelStyle = {
    display: 'block',
    color: currentThemeColors.secondaryText, 
    marginBottom: '12px', // Más espacio
    fontSize: '1.05em', // Más grande
    fontWeight: 'bold',
  };

  const inputStyle = {
    width: '100%',
    padding: '18px 22px', // Inputs más grandes y cómodos
    backgroundColor: currentThemeColors.inputBackground, 
    border: `2px solid ${currentThemeColors.inputBorder}`, // Borde más grueso
    borderRadius: '10px', // Más redondeado
    color: currentThemeColors.inputText, 
    fontSize: '1.05em', // Texto del input más grande
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    outline: 'none', // Quitar outline por defecto
  };
  // Para el efecto de foco, se puede añadir en el propio input con onFocus y onBlur
  // o con CSS si usas clases. Aquí un ejemplo simple en el JSX.

  const buttonStyle = {
    width: '100%',
    padding: '18px 22px', // Botón más grande
    backgroundColor: currentThemeColors.buttonPrimaryBg, 
    color: currentThemeColors.buttonPrimaryText, 
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.2em', // Más grande
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out, transform 0.1s ease, box-shadow 0.2s ease',
    marginTop: '25px', // Más espacio
    boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
    outline: 'none',
  };

  const errorStyle = {
    color: currentThemeColors.dangerText, 
    backgroundColor: currentThemeColors.dangerBg,
    padding: '12px 15px',
    borderRadius: '8px',
    marginTop: '30px', // Más espacio
    textAlign: 'center',
    fontSize: '1em',
    minHeight: '1.5em',
    fontWeight: '500',
  };

  return (
    <div style={loginPageStyle}>
      <div style={loginBoxStyle}>
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
              opacity: isLoading ? 0.7 : 1, // Atenuar si está cargando
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