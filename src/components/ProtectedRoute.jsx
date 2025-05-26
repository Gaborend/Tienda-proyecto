// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

// El componente ahora acepta una prop 'allowedRoles' que es un array de strings
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = authService.getToken();
  const currentUser = authService.getCurrentUser(); // Obtenemos el usuario actual

  if (!token) {
    // 1. Si no hay token, el usuario no está autenticado. Redirigir a /login.
    console.log("ProtectedRoute: No hay token, redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  // 2. Si se especificaron 'allowedRoles' Y el usuario actual no tiene uno de esos roles:
  if (allowedRoles && (!currentUser || !allowedRoles.includes(currentUser.role))) {
    // El usuario está logueado, pero su rol no está en la lista de roles permitidos.
    // Redirigimos al dashboard (o podrías crear una página específica de "No Autorizado").
    console.warn(`ProtectedRoute: Acceso no autorizado. Usuario: ${currentUser?.username}, Rol: ${currentUser?.role}. Roles permitidos: ${allowedRoles.join(', ')}. Redirigiendo a /dashboard.`);
    return <Navigate to="/dashboard" replace />; 
  }

  // 3. Si hay token Y (no se especificaron allowedRoles O el rol del usuario es permitido):
  // Renderizar el componente hijo (la página protegida).
  return children;
};

export default ProtectedRoute;