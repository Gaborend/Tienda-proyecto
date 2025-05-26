// src/services/configService.js
import axios from 'axios';
import authService from './authService'; // Para obtener el token

const API_URL = 'http://127.0.0.1:8000/config'; // Base URL para los endpoints de configuración

// Helper para obtener las cabeceras con el token
const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json', // Para POST/PUT con JSON
  };
};

// --- Gestión de Usuarios ---
const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al obtener usuarios:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const createUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/users`, userData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear usuario:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    const response = await axios.put(`${API_URL}/users/${userId}`, userData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar usuario ${userId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Obtener datos del usuario actual ---
const getMe = async () => {
  try {
    const response = await axios.get(`${API_URL}/users/me`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al obtener datos del usuario actual:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Configuración de la Tienda ---
const getStoreSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/store-settings`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al obtener configuración de la tienda:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const updateStoreSettings = async (settingsData) => {
  try {
    const response = await axios.put(`${API_URL}/store-settings`, settingsData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al actualizar configuración de la tienda:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Log de Auditoría de Configuración ---
const getConfigAuditLog = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/audit-log`, { 
      headers: getAuthHeaders(),
      params: params
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener log de auditoría:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export default {
  getUsers,
  createUser,
  updateUser,
  getMe, // <-- Asegúrate de que está aquí
  getStoreSettings,
  updateStoreSettings,
  getConfigAuditLog,
};