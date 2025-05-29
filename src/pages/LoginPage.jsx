import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

    try {
      const data = await authService.login(username, password);
      console.log("Login exitoso desde LoginPage, redirigiendo...", data);
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales o la conexión.');
    }
  };

  // --- ESTILOS PARA LOGINPAGE ---
  const loginPageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Centra la caja del login verticalmente
    minHeight: '100vh',
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif', // Consistente con Dashboard
    backgroundColor: '#121212', // Mismo fondo que Dashboard
    color: 'white',
  };

  const loginBoxStyle = {
    backgroundColor: '#1e1e1e', // Similar al profileBoxStyle
    padding: '35px 45px', // Espaciado interno generoso
    borderRadius: '12px', // Bordes redondeados
    boxShadow: '0 8px 25px rgba(0,0,0,0.35)', // Sombra pronunciada
    width: '100%',
    maxWidth: '420px', // Ancho óptimo para un formulario de login
    textAlign: 'center', // Centrar título y elementos internos por defecto
  };

  const loginTitleStyle = {
    color: '#79cdf0', // Color de acento del Dashboard
    marginBottom: '35px', // Espacio debajo del título
    fontSize: '2.2em', // Tamaño del título
    fontWeight: 'bold',
  };

  const inputGroupStyle = {
    marginBottom: '25px', // Espacio entre campos
    textAlign: 'left', // Alinear etiquetas e inputs a la izquierda
  };

  const labelStyle = {
    display: 'block',
    color: '#b0b0b0', // Color para etiquetas
    marginBottom: '8px',
    fontSize: '0.9em',
    fontWeight: 'bold',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px', // Inputs un poco más grandes
    backgroundColor: '#2c3038', // Fondo oscuro para inputs
    border: '1px solid #4a4e54', // Borde sutil
    borderRadius: '8px', // Bordes redondeados para inputs
    color: '#e0e0e0', // Color del texto del input
    fontSize: '1em',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  };
  // Para el efecto de foco, usualmente se haría con CSS :focus,
  // pero para simularlo un poco en JS (o como recordatorio para CSS):
  // inputStyleOnFocus = { ...inputStyle, borderColor: '#79cdf0', boxShadow: '0 0 0 3px rgba(121, 205, 240, 0.2)' };

  const buttonStyle = {
    width: '100%',
    padding: '14px 18px',
    backgroundColor: '#79cdf0', // Color de acento primario
    color: '#121212', // Texto oscuro para contraste con el botón claro
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out, transform 0.1s ease',
    marginTop: '15px', // Espacio sobre el botón
  };
  // buttonStyleOnHover = { ...buttonStyle, backgroundColor: '#5cb9d7', transform: 'translateY(-1px)' };

  const errorStyle = {
    color: '#e74c3c', // Color rojo para errores
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '0.9em',
    minHeight: '1.2em', // Para evitar saltos de layout si no hay error
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
              placeholder="Tu nombre de usuario" // Placeholder añadido
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
              placeholder="Tu contraseña" // Placeholder añadido
            />
          </div>
          <button type="submit" style={buttonStyle}>
            Ingresar
          </button>
        </form>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;