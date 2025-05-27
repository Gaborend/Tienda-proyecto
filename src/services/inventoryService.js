// src/services/inventoryService.js
import axios from 'axios';
import authService from './authService'; // Para obtener el token

const API_BASE_URL = 'http://127.0.0.1:8000/inventory'; // URL base para inventario

// Helper para obtener las cabeceras de autenticación
const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Crea un nuevo producto en el inventario.
 * @param {object} productData - Datos del producto.
 * E.g., { code, description, brand, category, cost_value, sale_value, quantity }
 * @returns {Promise<object>} Datos del producto creado.
 */
const createProduct = async (productData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, productData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear producto:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene una lista de productos del inventario.
 * @param {object} params - Parámetros de consulta (ej: { active_only: true, search: 'texto', category: 'cat', low_stock: true })
 * @returns {Promise<Array>} Lista de productos.
 */
const getProducts = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener productos:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los detalles de un producto específico por su ID.
 * @param {number|string} productId - El ID del producto.
 * @returns {Promise<object>} Datos del producto.
 */
const getProductById = async (productId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${productId}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener producto ${productId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los detalles de un producto específico por su código.
 * @param {string} productCode - El código del producto.
 * @returns {Promise<object>} Datos del producto.
 */
const getProductByCode = async (productCode) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/by_code/${productCode}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener producto por código ${productCode}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Actualiza los detalles de un producto existente (no el stock).
 * @param {number|string} productId - El ID del producto a actualizar.
 * @param {object} productData - Datos del producto a modificar.
 * E.g., { description, brand, category, cost_value, sale_value }
 * @returns {Promise<object>} Datos del producto actualizado.
 */
const updateProductDetails = async (productId, productData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${productId}`, productData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar detalles del producto ${productId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Ajusta el stock de un producto.
 * @param {number|string} productId - El ID del producto.
 * @param {object} adjustmentData - Datos del ajuste de stock.
 * E.g., { quantity_to_add, reason, notes }
 * @returns {Promise<object>} Datos del producto con el stock actualizado.
 */
const adjustProductStock = async (productId, adjustmentData) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/${productId}/adjust-stock`, adjustmentData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error)
 {
    console.error(`Error al ajustar stock del producto ${productId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Inactiva un producto.
 * @param {number|string} productId - El ID del producto a inactivar.
 * @returns {Promise<object>} Mensaje de confirmación.
 */
const inactivateProduct = async (productId) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/${productId}/inactivate`, {}, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al inactivar producto ${productId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene el historial de movimientos de inventario.
 * @param {object} params - Parámetros de consulta (ej: { product_id, product_code, movement_type, user_id, start_date, end_date, skip, limit })
 * @returns {Promise<Array>} Lista de movimientos de inventario.
 */
const getInventoryHistory = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/history/`, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener historial de inventario:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export default {
  createProduct,
  getProducts,
  getProductById,
  getProductByCode,
  updateProductDetails,
  adjustProductStock,
  inactivateProduct,
  getInventoryHistory,
};