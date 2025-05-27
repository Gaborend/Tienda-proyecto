// src/services/billingService.js
import axios from 'axios';
import authService from './authService'; // Para obtener el token

const API_BASE_URL = 'http://127.0.0.1:8000/billing'; // URL base para facturación

// Helper para obtener las cabeceras de autenticación
const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Crea una nueva venta/factura.
 * @param {object} saleData - Datos de la venta.
 * Estructura esperada por el backend:
 * {
 * customer_id: int,
 * items: [ { id: int, item_type: 'product'|'service'|'temporary_service', quantity: int, description?: str, unit_price?: float } ],
 * payment_method: str,
 * discount_percentage?: float,
 * discount_value?: float,
 * apply_iva?: bool
 * }
 * @returns {Promise<object>} Datos de la venta creada.
 */
const createSale = async (saleData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, saleData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al crear la venta/factura:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene una lista de ventas/facturas.
 * @param {object} params - Parámetros de consulta (ej: { skip, limit, invoice_number, customer_id, product_id, service_id, start_date, end_date, payment_method, status })
 * @returns {Promise<Array>} Lista de ventas.
 */
const getSales = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, { headers: getAuthHeaders(), params });
    return response.data;
  } catch (error) {
    console.error("Error al obtener ventas:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene los detalles de una venta/factura específica por su ID.
 * @param {number|string} saleId - El ID de la venta.
 * @returns {Promise<object>} Datos de la venta.
 */
const getSaleById = async (saleId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${saleId}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener la venta ${saleId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Cancela una venta/factura.
 * @param {number|string} saleId - El ID de la venta a cancelar.
 * @param {string} reason - El motivo de la cancelación.
 * @returns {Promise<object>} Datos de la venta cancelada.
 */
const cancelSale = async (saleId, reason) => {
  try {
    // El backend espera el motivo como un query parameter
    const response = await axios.patch(`${API_BASE_URL}/${saleId}/cancel`, {}, { 
      headers: getAuthHeaders(),
      params: { reason } 
    });
    return response.data;
  } catch (error) {
    console.error(`Error al cancelar la venta ${saleId}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export default {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
};