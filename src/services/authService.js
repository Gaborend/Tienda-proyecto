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
      // console.log("Token y datos recibidos del backend:", response.data);
      localStorage.setItem('userToken', response.data.access_token);
      localStorage.setItem('userData', JSON.stringify({
        username: response.data.username,
        role: response.data.role,
        userId: response.data.user_id 
      }));
      // console.log("Token y datos de usuario guardados en localStorage.");
      return response.data; 
    }
  } catch (error) {
    console.error("Error en authService.login:", error.response ? error.response.data : error.message);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    throw error; 
  }
};

const logout = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  // console.log("Usuario deslogueado y datos borrados de localStorage.");
};

const getCurrentUser = () => {
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
  return localStorage.getItem('userToken');
};

const getUserDetailsById = async (userId) => {
  if (!userId) {
    console.warn("getUserDetailsById llamado sin userId");
    return null;
  }
  try {
    const token = getToken(); 
    // La URL ahora incluye el prefijo '/config' que tu backend utiliza para este router
    const response = await axios.get(`${API_URL}/config/users/${userId}`, { 
      headers: {
        Authorization: `Bearer ${token}` // Si el endpoint está protegido
      }
    });
    return response.data; // Asume que response.data es el objeto usuario
  } catch (error) {
    console.error(`Error al obtener detalles del usuario ${userId} desde /config/users/${userId}:`, error.response ? error.response.data : error.message);
    return null; // Devolver null para que el componente que llama pueda manejarlo
  }
};

export default {
  login,
  logout,
  getCurrentUser,
  getToken,
  getUserDetailsById,
};