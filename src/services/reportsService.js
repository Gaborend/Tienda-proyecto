// src/services/reportsService.js
import axios from 'axios';
import authService from './authService';

const API_BASE_URL = 'http://127.0.0.1:8000/reports'; // Asegúrate que este sea tu URL base correcta

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

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

const downloadServicesPerformedReport = async (params = {}) => {
    try {
        const token = authService.getToken();
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                if (typeof params[key] === 'boolean') {
                    queryParams.append(key, params[key].toString());
                } else {
                    queryParams.append(key, params[key]);
                }
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

const getFrequentCustomersReport = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/frequent-customers`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de clientes frecuentes:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const downloadFrequentCustomersReport = async (params = {}) => {
    try {
        const token = authService.getToken();
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        }
        const url = `${API_BASE_URL}/frequent-customers/export/excel?${queryParams.toString()}`;

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const contentDisposition = response.headers['content-disposition'];
        let filename = `frequent_customers_report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
        console.error("Error al descargar el reporte de clientes frecuentes:", error.response?.data || error.message);
        if (error.response && error.response.data instanceof Blob) {
            const errText = await error.response.data.text();
            try { const errJson = JSON.parse(errText); throw errJson; }
            catch (parseError) { throw { detail: errText }; }
        }
        throw error.response?.data || error;
    }
};
// --- FIN FUNCIONES EXISTENTES ---


// --- NUEVAS FUNCIONES AÑADIDAS ---
const getInventoryStatusReport = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory-status`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de estado de inventario:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const downloadInventoryStatusReport = async (params = {}) => {
  try {
    const token = authService.getToken();
    const queryParams = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
        queryParams.append(key, String(params[key])); // Asegurar que los booleanos se conviertan a string
      }
    }
    const url = `${API_BASE_URL}/inventory-status/export/excel?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob', 
    });

    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `inventory_status_report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    console.error("Error al descargar el reporte de estado de inventario:", error.response?.data || error.message);
    if (error.response && error.response.data instanceof Blob) {
      const errText = await error.response.data.text();
      try { const errJson = JSON.parse(errText); throw errJson; }
      catch (parseError) { throw { detail: errText }; }
    }
    throw error.response?.data || error; 
  }
};

const getFinancialSummaryReport = async (params = {}) => {
  if (!params.start_date || !params.end_date) {
      // Esta validación también está en la página, pero es bueno tenerla aquí por si se llama desde otro lugar.
      console.warn("getFinancialSummaryReport llamado sin start_date o end_date");
      throw { detail: "Fechas Desde y Hasta son obligatorias para el resumen financiero." };
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/financial-summary`, { 
      headers: getAuthHeaders(), 
      params 
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el reporte de resumen financiero:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

const downloadFinancialSummaryReport = async (params = {}) => {
  if (!params.start_date || !params.end_date) {
      throw { detail: "Fechas Desde y Hasta son obligatorias para exportar el resumen financiero." };
  }
  try {
    const token = authService.getToken();
    const queryParams = new URLSearchParams();
     for (const key in params) {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
          queryParams.append(key, String(params[key]));
        }
      }
    const url = `${API_BASE_URL}/financial-summary/export/excel?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `financial_summary_report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    console.error("Error al descargar el reporte de resumen financiero:", error.response?.data || error.message);
    if (error.response && error.response.data instanceof Blob) {
      const errText = await error.response.data.text();
      try { const errJson = JSON.parse(errText); throw errJson; }
      catch (parseError) { throw { detail: errText }; }
    }
    throw error.response?.data || error;
  }
};
// --- FIN NUEVAS FUNCIONES ---

export default {
  getSalesSummaryReport,
  downloadSalesSummaryReport,
  getInventoryMovementsReport,
  downloadInventoryMovementsReport,
  getServicesPerformedReport,
  downloadServicesPerformedReport,
  getFrequentCustomersReport,
  downloadFrequentCustomersReport,
  // --- AÑADIR NUEVAS FUNCIONES AL EXPORT ---
  getInventoryStatusReport,
  downloadInventoryStatusReport,
  getFinancialSummaryReport,
  downloadFinancialSummaryReport,
};