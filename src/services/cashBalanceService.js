// src/services/cashBalanceService.js
import axios from 'axios';
import authService from './authService';

const API_BASE_URL = 'http://127.0.0.1:8000/cash-balance';

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Obtiene el registro de cuadre de caja para el día actual (si existe).
 * @returns {Promise<object|null>} Datos del registro de caja o null.
 */
const getTodaysCashRecord = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/today`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
        return null;
    }
    console.error("Error al obtener el registro de caja de hoy:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Abre un nuevo cuadre de caja.
 * @param {object} openData - Datos para abrir la caja. E.g., { initial_balance_override? }
 * @returns {Promise<object>} Datos del registro de caja abierto.
 */
const openCashBalance = async (openData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/open`, openData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al abrir la caja:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Cierra el cuadre de caja actual.
 * @param {object} closeData - Datos para cerrar la caja.
 * E.g., { expenses_details, counted_cash_physical, notes? }
 * @returns {Promise<object>} Datos del registro de caja cerrado.
 */
const closeCashBalance = async (closeData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/close`, closeData, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al cerrar la caja:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Obtiene una lista de registros de cuadre de caja (historial).
 * @param {object} params - Parámetros de consulta (ej: { skip, limit, start_date, end_date, status })
 * @returns {Promise<Array>} Lista de registros de caja.
 */
const getCashRecordsHistory = async (params = {}) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/`, { headers: getAuthHeaders(), params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de cuadres de caja:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Reabre el último cuadre de caja cerrado del día actual.
 * Este endpoint debe ser implementado en el backend como PATCH o POST.
 * Asumimos PATCH /cash-balance/reopen-latest-today
 * @returns {Promise<object>} Datos del registro de caja reabierto.
 */
const reopenLatestToday = async () => {
  try {
    // Asegúrate que el método y la URL coincidan con tu implementación en el backend
    const response = await axios.patch(`${API_BASE_URL}/reopen-latest-today`, {}, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error al reabrir el cuadre de caja:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};


export default {
  getTodaysCashRecord,
  openCashBalance,
  closeCashBalance,
  getCashRecordsHistory,
  reopenLatestToday, 
};