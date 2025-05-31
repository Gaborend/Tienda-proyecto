// src/services/customerService.js
import axios from 'axios';
import authService from './authService';

const API_URL = 'http://127.0.0.1:8000/customers/'; // La barra al final es correcta para las rutas base

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Obtiene una lista de clientes, opcionalmente filtrada por parámetros.
 * @param {object} params - Objeto con parámetros de query (ej: { search: 'nombre', active_only: true }).
 * @returns {Promise<Array>} Lista de clientes.
 */
const getCustomers = async (params = {}) => {
  try {
    const response = await axios.get(API_URL, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener clientes:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene un cliente específico por su ID.
 * @param {number|string} customerId - El ID del cliente.
 * @returns {Promise<object>} Datos del cliente.
 */
const getCustomer = async (customerId) => {
  try {
    const response = await axios.get(`${API_URL}${customerId}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Crea un nuevo cliente.
 * @param {object} customerData - Datos del cliente a crear.
 * @returns {Promise<object>} Datos del cliente creado.
 */
const createCustomer = async (customerData) => {
  try {
    const response = await axios.post(API_URL, customerData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear cliente:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Actualiza un cliente existente.
 * @param {number|string} customerId - ID del cliente a actualizar.
 * @param {object} customerData - Datos del cliente para actualizar.
 * @returns {Promise<object>} Datos del cliente actualizado.
 */
const updateCustomer = async (customerId, customerData) => {
  try {
    const response = await axios.put(`${API_URL}${customerId}`, customerData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Inactiva un cliente.
 * @param {number|string} customerId - ID del cliente a inactivar.
 * @returns {Promise<object>} Respuesta del servidor.
 */
const inactivateCustomer = async (customerId) => {
  try {
    const response = await axios.patch(`${API_URL}${customerId}/inactivate`, {}, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al inactivar cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene el historial de un cliente específico.
 * @param {number|string} customerId - ID del cliente.
 * @returns {Promise<Array>} Lista de entradas del historial del cliente.
 */
const getCustomerHistory = async (customerId) => {
  try {
    const response = await axios.get(`${API_URL}${customerId}/history`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial del cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene un cliente por su tipo y número de documento.
 * @param {string} documentType - Tipo de documento.
 * @param {string} documentNumber - Número de documento.
 * @returns {Promise<object>} Datos del cliente encontrado.
 */
const getCustomerByDocument = async (documentType, documentNumber) => {
  try {
    // La URL correcta es /customers/by_document/?document_type=X&document_number=Y
    const response = await axios.get(`${API_URL}by_document/`, {
      headers: getAuthHeaders(),
      params: {
        document_type: documentType,
        document_number: documentNumber
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener cliente por documento ${documentType} ${documentNumber}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export default {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  inactivateCustomer,
  getCustomerHistory,
  getCustomerByDocument
};