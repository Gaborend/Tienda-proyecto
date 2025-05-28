// src/services/reportsService.js
import axios from 'axios';
import authService from './authService';

const API_BASE_URL = 'http://127.0.0.1:8000/reports';

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Obtiene el reporte de resumen de ventas.
 * @param {object} params - Parámetros de filtro (start_date, end_date, customer_id, etc.)
 * @returns {Promise<Array>} Lista de items del reporte de ventas.
 */
const getSalesSummaryReport = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sales-summary`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de resumen de ventas:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Descarga el reporte de resumen de ventas en formato Excel.
 * @param {object} params - Parámetros de filtro.
 * @returns {Promise<boolean>} True si la descarga se inició, o lanza error.
 */
const downloadSalesSummaryReport = async (params = {}) => {
    try {
        const token = authService.getToken();
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        }
        const url = `${API_BASE_URL}/sales-summary/export/excel?${queryParams.toString()}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob', 
        });

        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const contentDisposition = response.headers['content-disposition'];
        let filename = `sales_summary_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1];
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return true;

    } catch (error) {
        console.error("Error al descargar el reporte de ventas:", error.response?.data || error.message);
        if (error.response && error.response.data instanceof Blob) {
            const errText = await error.response.data.text();
            try { const errJson = JSON.parse(errText); throw errJson; }
            catch (parseError) { throw { detail: errText }; }
        }
        throw error.response?.data || error; 
    }
};

/**
 * Obtiene el reporte de movimientos de inventario.
 * @param {object} params - Parámetros de filtro (start_date, end_date, product_id, etc.)
 * @returns {Promise<Array>} Lista de items del reporte de movimientos de inventario.
 */
const getInventoryMovementsReport = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory-movements`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de movimientos de inventario:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Descarga el reporte de movimientos de inventario en formato Excel.
 * @param {object} params - Parámetros de filtro.
 * @returns {Promise<boolean>} True si la descarga se inició, o lanza error.
 */
const downloadInventoryMovementsReport = async (params = {}) => {
    try {
        const token = authService.getToken();
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        }
        const url = `${API_BASE_URL}/inventory-movements/export/excel?${queryParams.toString()}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const contentDisposition = response.headers['content-disposition'];
        let filename = `inventory_movements_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1];
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return true;

    } catch (error) {
        console.error("Error al descargar el reporte de movimientos de inventario:", error.response?.data || error.message);
        if (error.response && error.response.data instanceof Blob) {
            const errText = await error.response.data.text();
            try { const errJson = JSON.parse(errText); throw errJson; }
            catch (parseError) { throw { detail: errText }; }
        }
        throw error.response?.data || error;
    }
};

/**
 * Obtiene el reporte de servicios realizados.
 * @param {object} params - Parámetros de filtro (start_date, end_date, service_id, customer_id)
 * @returns {Promise<Array>} Lista de items del reporte de servicios realizados.
 */
const getServicesPerformedReport = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/services-performed`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de servicios realizados:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Descarga el reporte de servicios realizados en formato Excel.
 * @param {object} params - Parámetros de filtro.
 * @returns {Promise<boolean>} True si la descarga se inició, o lanza error.
 */
const downloadServicesPerformedReport = async (params = {}) => {
    try {
        const token = authService.getToken();
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        }
        const url = `${API_BASE_URL}/services-performed/export/excel?${queryParams.toString()}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const contentDisposition = response.headers['content-disposition'];
        let filename = `services_performed_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1];
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return true;

    } catch (error) {
        console.error("Error al descargar el reporte de servicios realizados:", error.response?.data || error.message);
        if (error.response && error.response.data instanceof Blob) {
            const errText = await error.response.data.text();
            try { const errJson = JSON.parse(errText); throw errJson; }
            catch (parseError) { throw { detail: errText }; }
        }
        throw error.response?.data || error;
    }
};

export default {
  getSalesSummaryReport,
  downloadSalesSummaryReport,
  getInventoryMovementsReport,
  downloadInventoryMovementsReport,
  getServicesPerformedReport,
  downloadServicesPerformedReport,
};