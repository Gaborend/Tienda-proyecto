// src/services/customerService.js
import axios from 'axios';
import authService from './authService';

const API_URL = 'http://127.0.0.1:8000/customers/'; // Mantenemos la barra al final para el listado y creación

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const getCustomers = async (params = {}) => {
  try {
    // Esta URL base (API_URL) funciona bien para GET /customers/ y POST /customers/
    const response = await axios.get(API_URL, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener clientes:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const getCustomer = async (customerId) => {
  try {
    // CORREGIDO: API_URL ya termina en '/', no añadir otra barra.
    const response = await axios.get(`${API_URL}${customerId}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const createCustomer = async (customerData) => {
  try {
    // Esta URL base (API_URL) funciona bien para POST /customers/
    const response = await axios.post(API_URL, customerData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear cliente:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const updateCustomer = async (customerId, customerData) => {
  try {
    // CORREGIDO: API_URL ya termina en '/', no añadir otra barra.
    const response = await axios.put(`${API_URL}${customerId}`, customerData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const inactivateCustomer = async (customerId) => {
  try {
    // CORREGIDO: API_URL ya termina en '/', no añadir otra barra.
    const response = await axios.patch(`${API_URL}${customerId}/inactivate`, {}, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al inactivar cliente ${customerId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const getCustomerHistory = async (customerId) => {
  try {
    // CORREGIDO: API_URL ya termina en '/', no añadir otra barra.
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
    // El backend espera GET /customers/by_document/?document_type=X&document_number=Y
    // API_URL es 'http://127.0.0.1:8000/customers/'
    // Por lo tanto, la ruta relativa es 'by_document/'
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