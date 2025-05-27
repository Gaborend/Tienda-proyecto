// src/services/serviceService.js
import axios from 'axios';
import authService from './authService'; // Para obtener el token

const API_BASE_URL = 'http://127.0.0.1:8000/services'; // URL base para servicios

// Helper para obtener las cabeceras de autenticación
const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Crea un nuevo servicio.
 * @param {object} serviceData - Datos del servicio. Ej: { code, description, value }
 * @returns {Promise<object>} Datos del servicio creado.
 */
const createService = async (serviceData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, serviceData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear servicio:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene una lista de servicios.
 * @param {object} params - Parámetros de consulta (ej: { active_only: true, search: 'texto' })
 * @returns {Promise<Array>} Lista de servicios.
 */
const getServices = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener servicios:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los detalles de un servicio específico por su ID.
 * @param {number|string} serviceId - El ID del servicio.
 * @returns {Promise<object>} Datos del servicio.
 */
const getServiceById = async (serviceId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${serviceId}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener servicio ${serviceId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los detalles de un servicio específico por su código.
 * @param {string} serviceCode - El código del servicio.
 * @returns {Promise<object>} Datos del servicio.
 */
const getServiceByCode = async (serviceCode) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/by_code/${serviceCode}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener servicio por código ${serviceCode}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Actualiza los detalles de un servicio existente.
 * @param {number|string} serviceId - El ID del servicio a actualizar.
 * @param {object} serviceData - Datos del servicio a modificar. Ej: { description, value, is_active }
 * @returns {Promise<object>} Datos del servicio actualizado.
 */
const updateService = async (serviceId, serviceData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${serviceId}`, serviceData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar servicio ${serviceId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Inactiva un servicio.
 * @param {number|string} serviceId - El ID del servicio a inactivar.
 * @returns {Promise<object>} Mensaje de confirmación.
 */
const inactivateService = async (serviceId) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/${serviceId}/inactivate`, {}, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al inactivar servicio ${serviceId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene el historial de cambios de precio de un servicio.
 * @param {number|string} serviceId - El ID del servicio.
 * @returns {Promise<Array>} Lista del historial de precios.
 */
const getServicePriceHistory = async (serviceId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${serviceId}/price-history`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial de precios del servicio ${serviceId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};


export default {
  createService,
  getServices,
  getServiceById,
  getServiceByCode,
  updateService,
  inactivateService,
  getServicePriceHistory,
};