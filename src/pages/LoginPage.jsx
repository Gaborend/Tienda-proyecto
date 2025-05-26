// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react'; // <<< 1. IMPORTAR useEffect
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // <<< 2. VERIFICAR SI YA ESTÁ LOGUEADO AL CARGAR LA PÁGINA >>>
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      // Si ya hay un token, redirigir al dashboard
      navigate('/dashboard', { replace: true }); 
    }
  }, [navigate]); // El efecto se ejecuta si 'navigate' cambia (solo una vez al montar, en este caso)

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

  return (
    // ... (el JSX del formulario no cambia, puedes mantenerlo como estaba)
    <div>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Usuario:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Ingresar</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;