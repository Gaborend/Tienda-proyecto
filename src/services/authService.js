// src/services/authService.js
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000'; // La URL de tu backend FastAPI

const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/token`, 
      new URLSearchParams({
        grant_type: 'password',
        username: username,
        password: password,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.access_token) {
      console.log("Token y datos recibidos del backend:", response.data);
      // Guardar el token y los datos del usuario en localStorage
      localStorage.setItem('userToken', response.data.access_token);
      localStorage.setItem('userData', JSON.stringify({
        username: response.data.username,
        role: response.data.role,
        userId: response.data.user_id 
        // Asegúrate que 'user_id' es el nombre correcto que devuelve tu backend en el objeto token
        // En tu backend, el endpoint /token devuelve:
        // return {"access_token": access_token, "token_type": "bearer", "role": user["role"], "username": user["username"], "user_id": user["id"]}
        // Así que "user_id" es correcto.
      }));
      console.log("Token y datos de usuario guardados en localStorage.");
      return response.data; 
    }
  } catch (error) {
    console.error("Error en authService.login:", error.response ? error.response.data : error.message);
    // Limpiar cualquier token antiguo si el login falla (opcional pero buena práctica)
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    throw error; 
  }
};

const logout = () => {
  // Eliminar el token y los datos del usuario de localStorage
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  console.log("Usuario deslogueado y datos borrados de localStorage.");
  // Aquí podrías redirigir a la página de login, usualmente se maneja en el componente/contexto
};

const getCurrentUser = () => {
  // Obtener los datos del usuario de localStorage
  const userDataString = localStorage.getItem('userData');
  if (userDataString) {
    try {
      return JSON.parse(userDataString);
    } catch (error) {
      console.error("Error al parsear userData de localStorage:", error);
      return null;
    }
  }
  return null;
};

const getToken = () => {
  // Obtener el token de localStorage
  return localStorage.getItem('userToken');
};

export default {
  login,
  logout,
  getCurrentUser,
  getToken,
};