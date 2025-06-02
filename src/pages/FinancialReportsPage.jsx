// src/pages/FinancialReportsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import reportsService from '../services/reportsService';

// --- ESTILOS (Como los proporcionaste, con un pequeño añadido/ajuste) ---
const pageStyle = { padding: '20px', fontFamily: 'Arial, sans-serif' };
const sectionStyle = { marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff', color: '#333' };
const filterSectionStyle = { marginBottom: '25px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: '#f8f9fa'};
const inputStyle = { padding: '10px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ced4da', fontSize: '0.95em', width: '100%' };
const filterItemStyle = { display: 'flex', flexDirection: 'column', minWidth: '160px', flexGrow: 1};
const labelStyle = { marginBottom: '5px', fontSize: '0.9em', fontWeight: '600', display: 'block', color: '#343a40' };
const buttonStyle = { padding: '10px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.95em', marginRight:'10px' };

const tableHeaderBaseStyle = { borderBottom: '2px solid #333', padding: '10px', backgroundColor: '#e9ecef', color: '#212529', fontWeight: 'bold' }; // Base para cabeceras
const tableHeaderLeftStyle = { ...tableHeaderBaseStyle, textAlign: 'left' }; // Para cabeceras alineadas a la izquierda
const tableHeaderRightStyle = { ...tableHeaderBaseStyle, textAlign: 'right' }; // NUEVO: Para cabeceras alineadas a la derecha

const tableCellStyle = { borderBottom: '1px solid #ddd', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle' };
const errorStyle = { color: 'red', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0' };
const h2ReportStyle = {marginTop:0, borderBottom: '1px solid #eee', paddingBottom:'10px', color: '#333'};
const summaryTextStyle = { fontSize: '1.1em', margin: '10px 0', padding: '8px', borderBottom: '1px dotted #eee' };
// --- FIN ESTILOS ---

const parseLocalDateFromString = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  console.warn("Formato de fecha inesperado:", dateString);
  return new Date(dateString); 
};

function FinancialReportsPage() {
  // ... (toda tu lógica de estados y funciones se mantiene exactamente igual que antes) ...
  // Estados para Reporte de Estado de Inventario
  const [inventoryStatusData, setInventoryStatusData] = useState([]);
  const [rawInventoryStatusData, setRawInventoryStatusData] = useState([]); 
  const [inventoryStatusFilters, setInventoryStatusFilters] = useState({
    active_only: true,
    low_stock_only: 'all', 
    product_code_filter: '' 
  });
  const [loadingInventoryStatus, setLoadingInventoryStatus] = useState(false);
  const [inventoryStatusError, setInventoryStatusError] = useState('');
  const [loadingInventoryStatusExport, setLoadingInventoryStatusExport] = useState(false);
  const [submittedInventoryStatusFilters, setSubmittedInventoryStatusFilters] = useState(null);

  // Estados para Reporte de Desempeño Financiero
  const [financialSummaryData, setFinancialSummaryData] = useState(null);
  const [financialSummaryFilters, setFinancialSummaryFilters] = useState({
    start_date: '',
    end_date: '',
  });
  const [loadingFinancialSummary, setLoadingFinancialSummary] = useState(false);
  const [financialSummaryError, setFinancialSummaryError] = useState('');
  const [loadingFinancialSummaryExport, setLoadingFinancialSummaryExport] = useState(false);
  const [submittedFinancialSummaryFilters, setSubmittedFinancialSummaryFilters] = useState(null);

  const [error, setError] = useState('');

  // --- LÓGICA REPORTE DE ESTADO DE INVENTARIO ---
  const handleInventoryStatusFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInventoryStatusFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const fetchRawInventoryStatusReport = useCallback(async () => {
    if (!submittedInventoryStatusFilters) {
      setRawInventoryStatusData([]); 
      return;
    }
    setLoadingInventoryStatus(true);
    setInventoryStatusError('');
    const paramsForBackend = {
      active_only: submittedInventoryStatusFilters.active_only,
    };
    if (submittedInventoryStatusFilters.low_stock_only === 'low') {
      paramsForBackend.low_stock_only = true;
    } else if (submittedInventoryStatusFilters.low_stock_only === 'not_low') {
      paramsForBackend.low_stock_only = false;
    }

    try {
      const data = await reportsService.getInventoryStatusReport(paramsForBackend);
      setRawInventoryStatusData(data || []);
    } catch (err) {
      console.error("Error al generar reporte de estado de inventario (raw):", err);
      setInventoryStatusError("Error al generar reporte: " + (err.detail || err.message));
      setRawInventoryStatusData([]);
    } finally {
      setLoadingInventoryStatus(false);
    }
  }, [submittedInventoryStatusFilters]);

  useEffect(() => {
    if (submittedInventoryStatusFilters) {
      fetchRawInventoryStatusReport();
    }
  }, [submittedInventoryStatusFilters, fetchRawInventoryStatusReport]); 

  useEffect(() => { 
    if (!submittedInventoryStatusFilters) {
        setInventoryStatusData([]);
        return;
    }
    let filtered = [...rawInventoryStatusData];
    const codeFilter = submittedInventoryStatusFilters.product_code_filter?.toLowerCase().trim();
    if (codeFilter) {
        filtered = filtered.filter(item => item.product_code?.toLowerCase().includes(codeFilter));
    }
    setInventoryStatusData(filtered);
    if (submittedInventoryStatusFilters && filtered.length === 0 && rawInventoryStatusData.length > 0 && !loadingInventoryStatus) {
        setInventoryStatusError("Ningún producto coincide con el filtro de código aplicado.");
    } else if (submittedInventoryStatusFilters && filtered.length === 0 && rawInventoryStatusData.length === 0 && !loadingInventoryStatus && !inventoryStatusError) { 
        setInventoryStatusError("No se encontró inventario con los filtros de estado/bajo stock.");
    } else if (filtered.length > 0) {
        setInventoryStatusError(""); 
    }
  }, [rawInventoryStatusData, submittedInventoryStatusFilters, loadingInventoryStatus, inventoryStatusError]);


  const handleGenerateInventoryStatusReport = (e) => {
    e.preventDefault();
    setError(''); 
    setInventoryStatusError(''); 
    setSubmittedInventoryStatusFilters(inventoryStatusFilters);
  };

  const handleExportInventoryStatusReport = async () => {
    if (!submittedInventoryStatusFilters || inventoryStatusData.length === 0) {
        alert("Genere y filtre un reporte con datos primero."); return;
    }
    setLoadingInventoryStatusExport(true);
    setInventoryStatusError('');
    const paramsToExport = {
      active_only: submittedInventoryStatusFilters.active_only,
    };
    if (submittedInventoryStatusFilters.low_stock_only === 'low') paramsToExport.low_stock_only = true;
    else if (submittedInventoryStatusFilters.low_stock_only === 'not_low') paramsToExport.low_stock_only = false;

    try {
      await reportsService.downloadInventoryStatusReport(paramsToExport);
    } catch (err) {
      setInventoryStatusError("Error al exportar: " + (err.detail || err.message));
    } finally {
      setLoadingInventoryStatusExport(false);
    }
  };

  // --- LÓGICA REPORTE DE DESEMPEÑO FINANCIERO ---
  const handleFinancialSummaryFilterChange = (e) => {
    const { name, value } = e.target;
    setFinancialSummaryFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchFinancialSummaryReport = useCallback(async () => {
    if (!submittedFinancialSummaryFilters || !submittedFinancialSummaryFilters.start_date || !submittedFinancialSummaryFilters.end_date) {
      setFinancialSummaryData(null);
      // Error de fechas faltantes se maneja en handleGenerate
      return;
    }
    setLoadingFinancialSummary(true);
    setFinancialSummaryError('');
    try {
      const data = await reportsService.getFinancialSummaryReport(submittedFinancialSummaryFilters);
      setFinancialSummaryData(data);
      if (!data && submittedFinancialSummaryFilters) { 
        setFinancialSummaryError("No se pudo generar el resumen financiero con los filtros aplicados.");
      }
    } catch (err) {
      console.error("Error al generar reporte financiero:", err);
      setFinancialSummaryError("Error al generar reporte: " + (err.detail || err.message));
      setFinancialSummaryData(null);
    } finally {
      setLoadingFinancialSummary(false);
    }
  }, [submittedFinancialSummaryFilters]);

  useEffect(() => {
    if (submittedFinancialSummaryFilters && submittedFinancialSummaryFilters.start_date && submittedFinancialSummaryFilters.end_date) {
      fetchFinancialSummaryReport();
    }
  }, [submittedFinancialSummaryFilters, fetchFinancialSummaryReport]); 

  const handleGenerateFinancialSummaryReport = (e) => {
    e.preventDefault();
    setError(''); 
    if (!financialSummaryFilters.start_date || !financialSummaryFilters.end_date) {
      setFinancialSummaryError("Por favor, seleccione un rango de fechas (Desde y Hasta).");
      return;
    }
    setFinancialSummaryError(''); 
    setSubmittedFinancialSummaryFilters(financialSummaryFilters);
  };

  const handleExportFinancialSummaryReport = async () => {
    if (!submittedFinancialSummaryFilters || !financialSummaryData) {
        alert("Por favor, genere un reporte con datos primero antes de exportar.");
        return;
    }
    setLoadingFinancialSummaryExport(true);
    setFinancialSummaryError(''); 
    const params = { ...submittedFinancialSummaryFilters };
    try {
        await reportsService.downloadFinancialSummaryReport(params);
    } catch (err) {
        setFinancialSummaryError("Error al exportar: " + (err.detail || err.message));
    } finally {
        setLoadingFinancialSummaryExport(false);
    }
  };

  return (
    <div style={pageStyle}>
      <Link to="/dashboard">
        <button style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginBottom: '20px' }}>
          ← Volver al Inicio
        </button>
      </Link>
      <h1>Reportes Adicionales (Financiero e Inventario)</h1>
      {error && <p style={errorStyle}>{error}</p>}

      {/* === SECCIÓN REPORTE DE ESTADO DE INVENTARIO === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Estado de Inventario</h2>
        {/* ... (formulario de filtros se mantiene igual) ... */}
        <form onSubmit={handleGenerateInventoryStatusReport} style={filterSectionStyle}>
            <div style={{...filterItemStyle, minWidth:'150px', justifyContent:'center', alignItems:'flex-start', flexDirection:'row'}}>
                <input type="checkbox" id="is_active_inv_status" name="active_only" checked={inventoryStatusFilters.active_only} onChange={handleInventoryStatusFilterChange} style={{width:'auto', transform:'scale(1.3)', marginRight:'8px', marginTop:'3px'}}/>
                <label htmlFor="is_active_inv_status" style={{...labelStyle, fontWeight:'normal', cursor:'pointer'}}>Mostrar Solo Activos</label>
            </div>
            <div style={filterItemStyle}>
                <label htmlFor="low_stock_filter" style={labelStyle}>Filtro Bajo Stock:</label>
                <select id="low_stock_filter" name="low_stock_only" value={inventoryStatusFilters.low_stock_only} onChange={handleInventoryStatusFilterChange} style={inputStyle}>
                    <option value="all">Todos</option>
                    <option value="low">Solo Bajo Stock</option>
                    <option value="not_low">Solo Con Stock Suficiente</option>
                </select>
            </div>
            <div style={filterItemStyle}>
                <label htmlFor="product_code_filter_inv_status" style={labelStyle}>Filtrar por Código Producto:</label>
                <input type="text" id="product_code_filter_inv_status" name="product_code_filter" value={inventoryStatusFilters.product_code_filter} onChange={handleInventoryStatusFilterChange} style={inputStyle} placeholder="Opcional"/>
            </div>
            <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
                <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingInventoryStatus}>
                {loadingInventoryStatus ? 'Generando...' : 'Generar Reporte Estado Inventario'}
                </button>
                <button type="button" onClick={handleExportInventoryStatusReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingInventoryStatusExport || inventoryStatusData.length === 0}>
                {loadingInventoryStatusExport ? 'Exportando...' : 'Exportar a Excel'}
                </button>
            </div>
        </form>
        {loadingInventoryStatus && <p style={{textAlign:'center', padding:'15px'}}>Cargando estado de inventario...</p>}
        {inventoryStatusError && <p style={errorStyle}>{inventoryStatusError}</p>}
        {!loadingInventoryStatus && submittedInventoryStatusFilters && inventoryStatusData.length === 0 && !inventoryStatusError && (
             <p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se encontró inventario con los filtros aplicados.</p>
        )}
        {!loadingInventoryStatus && inventoryStatusData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop:'20px'}}>
            <table style={{ width: '100%', minWidth:'800px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead>
                <tr>
                  <th style={tableHeaderLeftStyle}>Cód. Prod.</th>
                  <th style={tableHeaderLeftStyle}>Descripción</th>
                  <th style={tableHeaderRightStyle}>Cant.</th> {/* MODIFICADO */}
                  <th style={tableHeaderRightStyle}>Vlr. Venta</th> {/* MODIFICADO */}
                  <th style={tableHeaderRightStyle}>Vlr. Total Stock</th> {/* MODIFICADO */}
                  <th style={tableHeaderLeftStyle}>Bajo Stock?</th>{/* Se mantiene a la izquierda o centrado según prefieras */}
                </tr>
              </thead>
              <tbody>{inventoryStatusData.map((item) => (
                  <tr key={item.product_code}>
                    <td style={tableCellStyle}>{item.product_code}</td><td style={tableCellStyle}>{item.description}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{item.quantity}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{typeof item.sale_value === 'number' ? item.sale_value.toFixed(2) : item.sale_value}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{typeof item.total_value_in_stock === 'number' ? item.total_value_in_stock.toFixed(2) : item.total_value_in_stock}</td>
                    <td style={{...tableCellStyle, color: item.is_low_stock ? 'orange' : 'inherit', fontWeight: item.is_low_stock ? 'bold' : 'normal'}}>{item.is_low_stock ? 'SÍ' : 'No'}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === SECCIÓN REPORTE DE DESEMPEÑO FINANCIERO (se mantiene igual) === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Desempeño Financiero</h2>
        {/* ... (formulario de filtros se mantiene igual) ... */}
        <form onSubmit={handleGenerateFinancialSummaryReport} style={filterSectionStyle}>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fs_start_date">Desde: *</label><input style={inputStyle} type="date" id="fs_start_date" name="start_date" value={financialSummaryFilters.start_date} onChange={handleFinancialSummaryFilterChange} required /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fs_end_date">Hasta: *</label><input style={inputStyle} type="date" id="fs_end_date" name="end_date" value={financialSummaryFilters.end_date} onChange={handleFinancialSummaryFilterChange} required /></div>
          <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingFinancialSummary}>
              {loadingFinancialSummary ? 'Generando...' : 'Generar Resumen Financiero'}
            </button>
            <button type="button" onClick={handleExportFinancialSummaryReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingFinancialSummaryExport || !financialSummaryData}>
              {loadingFinancialSummaryExport ? 'Exportando...' : 'Exportar a Excel'}
            </button>
          </div>
        </form>
        {/* ... (resto de la sección de resumen financiero se mantiene igual) ... */}
        {loadingFinancialSummary && <p style={{textAlign:'center', padding:'15px'}}>Cargando resumen financiero...</p>}
        {financialSummaryError && <p style={errorStyle}>{financialSummaryError}</p>}
        {!loadingFinancialSummary && submittedFinancialSummaryFilters && !financialSummaryData && !financialSummaryError && (
             <p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se pudo generar el resumen financiero con las fechas dadas.</p>
        )}
        {!loadingFinancialSummary && financialSummaryData && (
          <div style={{marginTop:'20px', padding:'15px', border:'1px solid #eee', borderRadius:'5px'}}>
            <h3 style={{color:'#333'}}>Resumen para el Período: {parseLocalDateFromString(financialSummaryData.period_start_date)?.toLocaleDateString()} - {parseLocalDateFromString(financialSummaryData.period_end_date)?.toLocaleDateString()}</h3>
            <div style={summaryTextStyle}><strong>Total Ingresos por Ventas:</strong> {typeof financialSummaryData.total_income_from_sales === 'number' ? financialSummaryData.total_income_from_sales.toFixed(2) : financialSummaryData.total_income_from_sales}</div>
            <div style={summaryTextStyle}><strong>Total Egresos Registrados (Cuadres de Caja):</strong> {typeof financialSummaryData.total_expenses_recorded === 'number' ? financialSummaryData.total_expenses_recorded.toFixed(2) : financialSummaryData.total_expenses_recorded}</div>
            <div style={{...summaryTextStyle, fontWeight:'bold', fontSize:'1.2em', color: financialSummaryData.net_profit >= 0 ? 'green' : 'red', borderTop:'2px solid #333', paddingTop:'10px'}}>
              <strong>Utilidad Neta del Período:</strong> {typeof financialSummaryData.net_profit === 'number' ? financialSummaryData.net_profit.toFixed(2) : financialSummaryData.net_profit}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default FinancialReportsPage;