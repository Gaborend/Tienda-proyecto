// src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import reportsService from '../services/reportsService';

// --- ESTILOS COMUNES (COMO LOS TENÍAS) ---
const pageStyle = { padding: '20px', fontFamily: 'Arial, sans-serif' };
const sectionStyle = { 
  marginBottom: '30px', padding: '20px', border: '1px solid #ccc', 
  borderRadius: '8px', backgroundColor: '#fff', color: '#333'
};
const filterSectionStyle = { 
  marginBottom: '25px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', 
  display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', 
  backgroundColor: '#f8f9fa'
};
const inputStyle = { padding: '10px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ced4da', fontSize: '0.95em', width: '100%' };
const filterItemStyle = { display: 'flex', flexDirection: 'column', minWidth: '160px', flexGrow: 1};
const labelStyle = { marginBottom: '5px', fontSize: '0.9em', fontWeight: '600', display: 'block', color: '#343a40' };
const buttonStyle = { padding: '10px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.95em', marginRight:'10px' };
const tableHeaderStyle = { borderBottom: '2px solid #333', padding: '10px', textAlign: 'left', backgroundColor: '#e9ecef', color: '#212529', fontWeight: 'bold' };
const tableCellStyle = { borderBottom: '1px solid #ddd', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle' };
const errorStyle = { color: 'red', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0' };
const itemsSubTableStyle = { width: '100%', marginTop: '5px', fontSize: '0.9em', borderCollapse:'collapse' };
const itemsSubThStyle = { backgroundColor: '#f8f9fa', padding: '5px', textAlign: 'left', border:'1px solid #eee' };
const itemsSubTdStyle = { padding: '5px', border:'1px solid #eee' };
const paginationContainerStyle = { marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderTop: '1px solid #eee' };
const h2ReportStyle = {marginTop:0, borderBottom: '1px solid #eee', paddingBottom:'10px', color: '#333'};
// --- FIN ESTILOS ---

const parseLocalDateFromString = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) return new Date(year, month, day);
  }
  return new Date(dateString);
};

function ReportsPage() {
  // Estados para Reporte de Ventas
  const [salesReportData, setSalesReportData] = useState([]);
  const [salesFilters, setSalesFilters] = useState({
    start_date: '', end_date: '', customer_id: '',
    product_id: '', service_id: '', payment_method: '', status: '',
  });
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [loadingSalesExport, setLoadingSalesExport] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [salesPagination, setSalesPagination] = useState({ skip: 0, limit: 10 });
  const [submittedSalesFilters, setSubmittedSalesFilters] = useState(null);

  // Estados para Reporte de Movimientos de Inventario
  const [inventoryMovementsData, setInventoryMovementsData] = useState([]);
  const [inventoryMovementsFilters, setInventoryMovementsFilters] = useState({
    start_date: '', end_date: '', product_id: '', product_code: '',
    movement_type: '', user_id: ''
  });
  const [loadingInventoryMovements, setLoadingInventoryMovements] = useState(false);
  const [inventoryMovementsError, setInventoryMovementsError] = useState('');
  const [loadingInventoryMovementsExport, setLoadingInventoryMovementsExport] = useState(false);
  const [inventoryMovementsPagination, setInventoryMovementsPagination] = useState({ skip: 0, limit: 10 });
  const [submittedInventoryMovementsFilters, setSubmittedInventoryMovementsFilters] = useState(null);
  
  // Estados para Reporte de Servicios Realizados
  const [rawServicesPerformedData, setRawServicesPerformedData] = useState([]);
  const [servicesPerformedData, setServicesPerformedData] = useState([]);
  const [servicesPerformedFilters, setServicesPerformedFilters] = useState({
    start_date: '', end_date: '', 
    service_id_filter: '', 
    customer_id: '',
    include_temporary: true, 
  });
  const [loadingServicesPerformed, setLoadingServicesPerformed] = useState(false);
  const [servicesPerformedError, setServicesPerformedError] = useState('');
  const [loadingServicesPerformedExport, setLoadingServicesPerformedExport] = useState(false);
  const [servicesPerformedPagination, setServicesPerformedPagination] = useState({ skip: 0, limit: 10 });
  const [submittedServicesPerformedFilters, setSubmittedServicesPerformedFilters] = useState(null);

  // Estados para Reporte de Clientes Frecuentes
  const [frequentCustomersData, setFrequentCustomersData] = useState([]);
  const [frequentCustomersFilters, setFrequentCustomersFilters] = useState({
    start_date: '', end_date: '', top_n: 10, min_purchases: '',
  });
  const [loadingFrequentCustomers, setLoadingFrequentCustomers] = useState(false);
  const [frequentCustomersError, setFrequentCustomersError] = useState('');
  const [loadingFrequentCustomersExport, setLoadingFrequentCustomersExport] = useState(false);
  const [submittedFrequentCustomersFilters, setSubmittedFrequentCustomersFilters] = useState(null);

  const [error, setError] = useState('');

  // --- LÓGICA PARA REPORTE DE VENTAS ---
  const handleSalesFilterChange = (e) => {
    const { name, value } = e.target;
    setSalesFilters(prev => ({ ...prev, [name]: value }));
  };
  const fetchSalesReport = useCallback(async () => {
    if (!submittedSalesFilters) { setSalesReportData([]); return; }
    setLoadingSales(true); setSalesError('');
    const params = { ...submittedSalesFilters, skip: salesPagination.skip, limit: salesPagination.limit  };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined ) delete params[key]; });
    if (params.customer_id && String(params.customer_id).trim() !== '') params.customer_id = parseInt(params.customer_id, 10); else delete params.customer_id;
    if (params.product_id && String(params.product_id).trim() !== '') params.product_id = parseInt(params.product_id, 10); else delete params.product_id;
    if (params.service_id && String(params.service_id).trim() !== '') params.service_id = parseInt(params.service_id, 10); else delete params.service_id;
    try {
      const data = await reportsService.getSalesSummaryReport(params);
      setSalesReportData(data || []);
      if ((!data || data.length === 0) && submittedSalesFilters) setSalesError("No se encontraron ventas con los filtros aplicados.");
    } catch (err) {
      console.error("Error al generar reporte de ventas:", err);
      setSalesError("Error al generar reporte de ventas: " + (err.detail || err.message));
      setSalesReportData([]);
    } finally { setLoadingSales(false); }
  }, [submittedSalesFilters, salesPagination.skip, salesPagination.limit]);
  useEffect(() => { if (submittedSalesFilters) fetchSalesReport(); }, [fetchSalesReport]);
  const handleGenerateSalesReport = (e) => { e.preventDefault(); setError(''); setSalesPagination(prev => ({...prev, skip:0})); setSubmittedSalesFilters(salesFilters); };
  const handleExportSalesReport = async () => {
    if (!submittedSalesFilters || salesReportData.length === 0) { alert("Genere un reporte con datos primero."); return; }
    setLoadingSalesExport(true); setSalesError(''); 
    const params = { ...submittedSalesFilters };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]; });
    if (params.customer_id && String(params.customer_id).trim() !== '') params.customer_id = parseInt(params.customer_id, 10); else delete params.customer_id;
    if (params.product_id && String(params.product_id).trim() !== '') params.product_id = parseInt(params.product_id, 10); else delete params.product_id;
    if (params.service_id && String(params.service_id).trim() !== '') params.service_id = parseInt(params.service_id, 10); else delete params.service_id;
    delete params.skip; delete params.limit;
    try { await reportsService.downloadSalesSummaryReport(params); }
    catch (err) { console.error("Error al exportar reporte de ventas:", err); setSalesError("Error al exportar reporte de ventas: " + (err.detail || err.message)); }
    finally { setLoadingSalesExport(false); }
  };
  const toggleSaleDetails = (saleInvoiceNumber) => { setExpandedSaleId(expandedSaleId === saleInvoiceNumber ? null : saleInvoiceNumber); };
  const handleSalesNextPage = () => { if (salesReportData.length < salesPagination.limit && salesPagination.skip > 0) return; if (salesReportData.length === 0 && salesPagination.skip === 0 && submittedSalesFilters) return; setSalesPagination(prev => ({ ...prev, skip: prev.skip + prev.limit })); };
  const handleSalesPreviousPage = () => { setSalesPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) })); };
  // --- FIN LÓGICA REPORTE DE VENTAS ---

  // --- LÓGICA PARA REPORTE DE MOVIMIENTOS DE INVENTARIO ---
  const handleInventoryMovementsFilterChange = (e) => {
    const { name, value } = e.target;
    setInventoryMovementsFilters(prev => ({ ...prev, [name]: value }));
  };
  const fetchInventoryMovementsReport = useCallback(async () => {
    if (!submittedInventoryMovementsFilters) { setInventoryMovementsData([]); return; }
    setLoadingInventoryMovements(true); setInventoryMovementsError('');
    const params = { ...submittedInventoryMovementsFilters, skip: inventoryMovementsPagination.skip, limit: inventoryMovementsPagination.limit };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]; });
    if (params.product_id && String(params.product_id).trim() !== '') params.product_id = parseInt(params.product_id, 10); else delete params.product_id;
    if (params.user_id && String(params.user_id).trim() !== '') params.user_id = parseInt(params.user_id, 10); else delete params.user_id;
    try {
      const data = await reportsService.getInventoryMovementsReport(params);
      setInventoryMovementsData(data || []);
      if ((!data || data.length === 0) && submittedInventoryMovementsFilters) setInventoryMovementsError("No se encontraron movimientos de inventario.");
    } catch (err) {
      console.error("Error al generar reporte de movimientos:", err);
      setInventoryMovementsError("Error al generar reporte: " + (err.detail || err.message));
      setInventoryMovementsData([]);
    } finally { setLoadingInventoryMovements(false); }
  }, [submittedInventoryMovementsFilters, inventoryMovementsPagination.skip, inventoryMovementsPagination.limit]);
  useEffect(() => { if (submittedInventoryMovementsFilters) fetchInventoryMovementsReport(); }, [fetchInventoryMovementsReport]);
  const handleGenerateInventoryMovementsReport = (e) => { e.preventDefault(); setError(''); setInventoryMovementsPagination(prev => ({...prev, skip:0})); setSubmittedInventoryMovementsFilters(inventoryMovementsFilters); };
  const handleExportInventoryMovementsReport = async () => {
    if (!submittedInventoryMovementsFilters || inventoryMovementsData.length === 0) { alert("Genere un reporte con datos primero."); return; }
    setLoadingInventoryMovementsExport(true); setInventoryMovementsError(''); 
    const params = { ...submittedInventoryMovementsFilters };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]; });
    if (params.product_id) params.product_id = parseInt(params.product_id, 10);
    if (params.user_id) params.user_id = parseInt(params.user_id, 10);
    delete params.skip; delete params.limit;
    try { await reportsService.downloadInventoryMovementsReport(params); }
    catch (err) { console.error("Error al exportar reporte de movimientos:", err); setInventoryMovementsError("Error al exportar: " + (err.detail || err.message));}
    finally { setLoadingInventoryMovementsExport(false); }
  };
  const handleInventoryMovementsNextPage = () => { if (inventoryMovementsData.length < inventoryMovementsPagination.limit) return; setInventoryMovementsPagination(prev => ({ ...prev, skip: prev.skip + prev.limit })); };
  const handleInventoryMovementsPreviousPage = () => { setInventoryMovementsPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) })); };
  // --- FIN LÓGICA REPORTE DE MOVIMIENTOS DE INVENTARIO ---

  // --- LÓGICA PARA REPORTE DE SERVICIOS REALIZADOS ---
  const handleServicesPerformedFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServicesPerformedFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const fetchRawServicesPerformedReport = useCallback(async () => {
    if (!submittedServicesPerformedFilters) { setRawServicesPerformedData([]); return; }
    setLoadingServicesPerformed(true); setServicesPerformedError('');
    const paramsForBackend = { 
      start_date: submittedServicesPerformedFilters.start_date,
      end_date: submittedServicesPerformedFilters.end_date,
      customer_id: submittedServicesPerformedFilters.customer_id,
      service_id: submittedServicesPerformedFilters.service_id_filter && parseInt(submittedServicesPerformedFilters.service_id_filter, 10) > 0 
                  ? parseInt(submittedServicesPerformedFilters.service_id_filter, 10) : undefined,
      include_temporary: submittedServicesPerformedFilters.include_temporary, // Enviar para que el backend pueda usarlo
      skip: servicesPerformedPagination.skip, limit: servicesPerformedPagination.limit
    };
    Object.keys(paramsForBackend).forEach(key => { if (paramsForBackend[key] === '' || paramsForBackend[key] === null || paramsForBackend[key] === undefined) delete paramsForBackend[key]; });
    if (paramsForBackend.customer_id && String(paramsForBackend.customer_id).trim() !== '') { const custId = parseInt(paramsForBackend.customer_id, 10); if (!isNaN(custId) && custId > 0) paramsForBackend.customer_id = custId; else delete paramsForBackend.customer_id; } else { delete paramsForBackend.customer_id; }
    try {
      const data = await reportsService.getServicesPerformedReport(paramsForBackend);
      setRawServicesPerformedData(data || []); // Guardamos los datos que podrían estar pre-filtrados por el backend
    } catch (err) {
      console.error("Error al generar reporte de servicios (raw):", err);
      setServicesPerformedError("Error al generar reporte: " + (err.detail || err.message));
      setRawServicesPerformedData([]); setServicesPerformedData([]);
    } finally { setLoadingServicesPerformed(false); }
  }, [submittedServicesPerformedFilters, servicesPerformedPagination.skip, servicesPerformedPagination.limit]);
  useEffect(() => { if (submittedServicesPerformedFilters) fetchRawServicesPerformedReport(); }, [fetchRawServicesPerformedReport]);
  useEffect(() => {
    if (!submittedServicesPerformedFilters) { setServicesPerformedData([]); setServicesPerformedError(''); return; }
    let filteredData = [...rawServicesPerformedData];
    const serviceIdToFilter = submittedServicesPerformedFilters.service_id_filter ? parseInt(submittedServicesPerformedFilters.service_id_filter, 10) : null;
    if (!isNaN(serviceIdToFilter) && serviceIdToFilter > 0) {
        filteredData = filteredData.filter(serv => serv.service_id === serviceIdToFilter && serv.service_id !== 0);
    } else {
        if (!submittedServicesPerformedFilters.include_temporary) {
            filteredData = filteredData.filter(serv => serv.service_id !== 0);
        }
    }
    setServicesPerformedData(filteredData);
    if (submittedServicesPerformedFilters && filteredData.length === 0 && rawServicesPerformedData.length > 0 && !loadingServicesPerformed) {
         setServicesPerformedError("Ningún servicio coincide con el filtro de ID/temporales.");
    } else if (submittedServicesPerformedFilters && filteredData.length === 0 && rawServicesPerformedData.length === 0 && !loadingServicesPerformed) {
        setServicesPerformedError("No se encontraron servicios con los filtros aplicados.");
    } else if (filteredData.length > 0) {
        setServicesPerformedError("");
    }
  }, [rawServicesPerformedData, submittedServicesPerformedFilters, loadingServicesPerformed]);
  const handleGenerateServicesPerformedReport = (e) => { e.preventDefault(); setError(''); setServicesPerformedPagination(prev => ({...prev, skip:0})); setSubmittedServicesPerformedFilters(servicesPerformedFilters); };
  const handleExportServicesPerformedReport = async () => {
    if (!submittedServicesPerformedFilters || servicesPerformedData.length === 0) { alert("Genere y filtre un reporte con datos primero."); return; }
    setLoadingServicesPerformedExport(true); setServicesPerformedError(''); 
    const paramsToExport = { ...submittedServicesPerformedFilters };
    if (paramsToExport.service_id_filter && paramsToExport.service_id_filter.trim() !== '') { const serviceIdNum = parseInt(paramsToExport.service_id_filter, 10); if(!isNaN(serviceIdNum) && serviceIdNum > 0) paramsToExport.service_id = serviceIdNum; } delete paramsToExport.service_id_filter; 
    if (paramsToExport.customer_id && paramsToExport.customer_id.trim() !== '') { const customerIdNum = parseInt(paramsToExport.customer_id, 10); if(!isNaN(customerIdNum) && customerIdNum > 0) paramsToExport.customer_id = customerIdNum; else delete paramsToExport.customer_id; } else { delete paramsToExport.customer_id; }
    Object.keys(paramsToExport).forEach(key => { if (typeof paramsToExport[key] !== 'boolean' && (paramsToExport[key] === '' || paramsToExport[key] === null || paramsToExport[key] === undefined)) delete paramsToExport[key]; });
    delete paramsToExport.skip; delete paramsToExport.limit;
    try { await reportsService.downloadServicesPerformedReport(paramsToExport); }
    catch (err) { setServicesPerformedError("Error al exportar: " + (err.detail || err.message)); }
    finally { setLoadingServicesPerformedExport(false); }
  };
  const handleServicesPerformedNextPage = () => { /* ... (sin cambios) ... */ };
  const handleServicesPerformedPreviousPage = () => { /* ... (sin cambios) ... */ };
  // --- FIN LÓGICA REPORTE DE SERVICIOS REALIZADOS ---

  // --- LÓGICA PARA REPORTE DE CLIENTES FRECUENTES ---
  const handleFrequentCustomersFilterChange = (e) => {
    const { name, value } = e.target;
    setFrequentCustomersFilters(prev => ({ ...prev, [name]: value }));
  };
  const fetchFrequentCustomersReport = useCallback(async () => {
    if (!submittedFrequentCustomersFilters) { setFrequentCustomersData([]); return; }
    setLoadingFrequentCustomers(true); setFrequentCustomersError('');
    const params = { ...submittedFrequentCustomersFilters };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]; });
    if (params.top_n && String(params.top_n).trim() !== '') params.top_n = parseInt(params.top_n, 10); else params.top_n = 10; // Default si está vacío
    if (params.min_purchases && String(params.min_purchases).trim() !== '') params.min_purchases = parseInt(params.min_purchases, 10); else delete params.min_purchases;
    try {
      const data = await reportsService.getFrequentCustomersReport(params);
      setFrequentCustomersData(data || []);
      if ((!data || data.length === 0) && submittedFrequentCustomersFilters) setFrequentCustomersError("No se encontraron clientes frecuentes.");
    } catch (err) {
      console.error("Error al generar reporte de clientes frecuentes:", err);
      setFrequentCustomersError("Error al generar reporte: " + (err.detail || err.message));
      setFrequentCustomersData([]);
    } finally { setLoadingFrequentCustomers(false); }
  }, [submittedFrequentCustomersFilters]);
  useEffect(() => { if (submittedFrequentCustomersFilters) fetchFrequentCustomersReport(); }, [fetchFrequentCustomersReport]);
  const handleGenerateFrequentCustomersReport = (e) => { e.preventDefault(); setError(''); setSubmittedFrequentCustomersFilters(frequentCustomersFilters); };
  const handleExportFrequentCustomersReport = async () => {
    if (!submittedFrequentCustomersFilters || frequentCustomersData.length === 0) { alert("Genere un reporte con datos primero."); return; }
    setLoadingFrequentCustomersExport(true); setFrequentCustomersError(''); 
    const params = { ...submittedFrequentCustomersFilters };
    Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]; });
    if (params.top_n) params.top_n = parseInt(params.top_n, 10);
    if (params.min_purchases) params.min_purchases = parseInt(params.min_purchases, 10);
    try { await reportsService.downloadFrequentCustomersReport(params); }
    catch (err) { setFrequentCustomersError("Error al exportar: " + (err.detail || err.message)); }
    finally { setLoadingFrequentCustomersExport(false); }
  };
  // --- FIN LÓGICA CLIENTES FRECUENTES ---


  return (
    <div style={pageStyle}>
      <Link to="/dashboard">
        <button style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginBottom: '20px' }}>
          ← Volver al Dashboard
        </button>
      </Link>
      <h1>Módulo de Reportes</h1>
      {error && <p style={errorStyle}>{error}</p>}

      {/* === SECCIÓN REPORTE DE VENTAS DETALLADO === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Ventas Detallado</h2>
        <form onSubmit={handleGenerateSalesReport} style={filterSectionStyle}>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sr_start_date">Desde:</label><input style={inputStyle} type="date" id="sr_start_date" name="start_date" value={salesFilters.start_date} onChange={handleSalesFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sr_end_date">Hasta:</label><input style={inputStyle} type="date" id="sr_end_date" name="end_date" value={salesFilters.end_date} onChange={handleSalesFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sr_customer_id">ID Cliente:</label><input style={inputStyle} type="text" id="sr_customer_id" name="customer_id" value={salesFilters.customer_id} onChange={handleSalesFilterChange} placeholder="Opcional"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sr_product_id">ID Producto:</label><input style={inputStyle} type="text" id="sr_product_id" name="product_id" value={salesFilters.product_id} onChange={handleSalesFilterChange} placeholder="En venta (opcional)"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sr_service_id">ID Servicio:</label><input style={inputStyle} type="text" id="sr_service_id" name="service_id" value={salesFilters.service_id} onChange={handleSalesFilterChange} placeholder="En venta (opcional)"/></div>
          <div style={filterItemStyle}>
            <label style={labelStyle} htmlFor="sr_payment_method">Método Pago:</label>
            <select style={inputStyle} id="sr_payment_method" name="payment_method" value={salesFilters.payment_method} onChange={handleSalesFilterChange}>
              <option value="">Todos</option><option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option><option value="Transferencia">Transferencia</option>
            </select>
          </div>
          <div style={filterItemStyle}>
            <label style={labelStyle} htmlFor="sr_status">Estado Venta:</label>
            <select style={inputStyle} id="sr_status" name="status" value={salesFilters.status} onChange={handleSalesFilterChange}>
              <option value="">Todos</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingSales}>
              {loadingSales ? 'Generando...' : 'Generar Reporte de Ventas'}
            </button>
            <button type="button" onClick={handleExportSalesReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingSalesExport || salesReportData.length === 0}>
              {loadingSalesExport ? 'Exportando...' : 'Exportar a Excel'}
            </button>
          </div>
        </form>
        {loadingSales && <p style={{textAlign:'center', padding:'15px'}}>Cargando reporte de ventas...</p>}
        {salesError && <p style={errorStyle}>{salesError}</p>} 
        {!loadingSales && submittedSalesFilters && salesReportData.length === 0 && !salesError && (
             <p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se encontraron ventas con los filtros aplicados.</p>
        )}
        {!loadingSales && salesReportData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop:'20px'}}>
            <table style={{ width: '100%', minWidth:'900px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead><tr><th style={tableHeaderStyle}></th><th style={tableHeaderStyle}>Factura N°</th><th style={tableHeaderStyle}>Fecha</th><th style={tableHeaderStyle}>Cliente</th><th style={tableHeaderStyle}>Documento</th><th style={tableHeaderStyle}>Total</th><th style={tableHeaderStyle}>Método Pago</th><th style={tableHeaderStyle}>Estado</th></tr></thead>
              <tbody>
                {salesReportData.map(sale => (
                  <React.Fragment key={sale.invoice_number}>
                    <tr>
                      <td style={tableCellStyle}><button onClick={() => toggleSaleDetails(sale.invoice_number)} style={{padding:'3px 6px', fontSize:'0.8em', cursor:'pointer', border:'1px solid #ccc', background:'#f0f0f0'}}>{expandedSaleId === sale.invoice_number ? '−' : '+'}</button></td>
                      <td style={tableCellStyle}>{sale.invoice_number}</td><td style={tableCellStyle}>{new Date(sale.date).toLocaleString()}</td>
                      <td style={tableCellStyle}>{sale.customer_name}</td><td style={tableCellStyle}>{sale.customer_document || 'N/A'}</td>
                      <td style={{...tableCellStyle, textAlign:'right'}}>{sale.total_amount.toFixed(2)}</td><td style={tableCellStyle}>{sale.payment_method}</td>
                      <td style={tableCellStyle}><span style={{ color: sale.status === 'cancelled' ? 'red' : 'green', fontWeight:'bold' }}>{sale.status === 'completed' ? 'Completada' : 'Cancelada'}</span></td>
                    </tr>
                    {expandedSaleId === sale.invoice_number && (<tr><td colSpan="8" style={{padding: '10px 15px 10px 40px', backgroundColor:'#fdfdfd', borderBottom:'1px solid #ddd'}}><h4 style={{marginTop:'5px', marginBottom:'8px', fontSize:'0.95em', color:'#444'}}>Items de la Factura:</h4><table style={itemsSubTableStyle}><thead><tr><th style={itemsSubThStyle}>Descripción</th><th style={{...itemsSubThStyle, textAlign:'right'}}>Cant.</th><th style={{...itemsSubThStyle, textAlign:'right'}}>P. Unit.</th><th style={{...itemsSubThStyle, textAlign:'right'}}>Total Ítem</th></tr></thead><tbody>{(sale.items || []).map((item, index) => (<tr key={index}><td style={itemsSubTdStyle}>{item.description}</td><td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.quantity}</td><td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.unit_price.toFixed(2)}</td><td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.total_item_price.toFixed(2)}</td></tr>))}</tbody></table></td></tr>)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {submittedSalesFilters && ((!loadingSales && salesReportData.length > 0) || salesPagination.skip > 0) ? (
          <div style={paginationContainerStyle}><button onClick={handleSalesPreviousPage} disabled={salesPagination.skip === 0 || loadingSales} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Anterior</button><span>Página {Math.floor(salesPagination.skip / salesPagination.limit) + 1}</span><button onClick={handleSalesNextPage} disabled={salesReportData.length < salesPagination.limit || loadingSales} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Siguiente</button></div>
      ) : null}

      {/* === SECCIÓN REPORTE DE MOVIMIENTOS DE INVENTARIO === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Movimientos de Inventario</h2>
        <form onSubmit={handleGenerateInventoryMovementsReport} style={filterSectionStyle}>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_start_date">Desde:</label><input style={inputStyle} type="date" id="im_start_date" name="start_date" value={inventoryMovementsFilters.start_date} onChange={handleInventoryMovementsFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_end_date">Hasta:</label><input style={inputStyle} type="date" id="im_end_date" name="end_date" value={inventoryMovementsFilters.end_date} onChange={handleInventoryMovementsFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_product_id">ID Producto:</label><input style={inputStyle} type="text" id="im_product_id" name="product_id" value={inventoryMovementsFilters.product_id} onChange={handleInventoryMovementsFilterChange} placeholder="Opcional"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_product_code">Código Producto:</label><input style={inputStyle} type="text" id="im_product_code" name="product_code" value={inventoryMovementsFilters.product_code} onChange={handleInventoryMovementsFilterChange} placeholder="Opcional"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_movement_type">Tipo Movimiento:</label><input style={inputStyle} type="text" id="im_movement_type" name="movement_type" value={inventoryMovementsFilters.movement_type} onChange={handleInventoryMovementsFilterChange} placeholder="Ej: venta, compra"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="im_user_id">ID Usuario:</label><input style={inputStyle} type="text" id="im_user_id" name="user_id" value={inventoryMovementsFilters.user_id} onChange={handleInventoryMovementsFilterChange} placeholder="Opcional"/></div>
          <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingInventoryMovements}>{loadingInventoryMovements ? 'Generando...' : 'Generar Reporte Mov. Inventario'}</button>
            <button type="button" onClick={handleExportInventoryMovementsReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingInventoryMovementsExport || inventoryMovementsData.length === 0}>{loadingInventoryMovementsExport ? 'Exportando...' : 'Exportar a Excel'}</button>
          </div>
        </form>
        {loadingInventoryMovements && <p style={{textAlign:'center', padding:'15px'}}>Cargando reporte de movimientos...</p>}
        {inventoryMovementsError && <p style={errorStyle}>{inventoryMovementsError}</p>}
        {!loadingInventoryMovements && submittedInventoryMovementsFilters && inventoryMovementsData.length === 0 && !inventoryMovementsError && ( <p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se encontraron movimientos de inventario.</p> )}
        {!loadingInventoryMovements && inventoryMovementsData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop:'20px'}}>
            <table style={{ width: '100%', minWidth:'900px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead><tr><th style={tableHeaderStyle}>Fecha</th><th style={tableHeaderStyle}>Código de Barras</th><th style={tableHeaderStyle}>Cód. Prod.</th><th style={tableHeaderStyle}>Cant. Modif.</th><th style={tableHeaderStyle}>Nueva Cant.</th><th style={tableHeaderStyle}>Tipo Mov.</th><th style={tableHeaderStyle}>Usuario (ID)</th><th style={tableHeaderStyle}>Notas</th></tr></thead>
              <tbody>{inventoryMovementsData.map((mov, index) => (<tr key={mov.id || index}> <td style={tableCellStyle}>{new Date(mov.date).toLocaleString()}</td><td style={tableCellStyle}>{mov.product_id}</td><td style={tableCellStyle}>{mov.product_code}</td><td style={{...tableCellStyle, color: mov.quantity_changed < 0 ? 'red' : 'green', fontWeight:'bold'}}>{mov.quantity_changed}</td><td style={tableCellStyle}>{mov.new_quantity}</td><td style={tableCellStyle}>{mov.movement_type}</td><td style={tableCellStyle}>{mov.user_id}</td><td style={tableCellStyle}>{mov.notes || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </section>
      {submittedInventoryMovementsFilters && ((!loadingInventoryMovements && inventoryMovementsData.length > 0) || inventoryMovementsPagination.skip > 0) ? (
          <div style={paginationContainerStyle}><button onClick={handleInventoryMovementsPreviousPage} disabled={inventoryMovementsPagination.skip === 0 || loadingInventoryMovements} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Anterior</button><span>Página {Math.floor(inventoryMovementsPagination.skip / inventoryMovementsPagination.limit) + 1}</span><button onClick={handleInventoryMovementsNextPage} disabled={inventoryMovementsData.length < inventoryMovementsPagination.limit || loadingInventoryMovements} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Siguiente</button></div>
      ) : null}

      {/* === SECCIÓN REPORTE DE SERVICIOS REALIZADOS === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Servicios Realizados</h2>
        <form onSubmit={handleGenerateServicesPerformedReport} style={filterSectionStyle}>
         <div style={filterItemStyle}><label style={labelStyle} htmlFor="sp_start_date">Desde:</label><input style={inputStyle} type="date" id="sp_start_date" name="start_date" value={servicesPerformedFilters.start_date} onChange={handleServicesPerformedFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sp_end_date">Hasta:</label><input style={inputStyle} type="date" id="sp_end_date" name="end_date" value={servicesPerformedFilters.end_date} onChange={handleServicesPerformedFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sp_service_id_filter">ID Servicio (Registrado):</label><input style={inputStyle} type="text" id="sp_service_id_filter" name="service_id_filter" value={servicesPerformedFilters.service_id_filter} onChange={handleServicesPerformedFilterChange} placeholder="Opcional"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="sp_customer_id">ID Cliente:</label><input style={inputStyle} type="text" id="sp_customer_id" name="customer_id" value={servicesPerformedFilters.customer_id} onChange={handleServicesPerformedFilterChange} placeholder="Opcional"/></div>
          <div style={{...filterItemStyle, minWidth: '200px', justifyContent:'center', alignItems:'flex-start', flexDirection:'row', paddingTop:'15px'}}>
            <input type="checkbox" id="sp_include_temporary" name="include_temporary" checked={servicesPerformedFilters.include_temporary} onChange={handleServicesPerformedFilterChange} style={{width:'auto', transform: 'scale(1.3)', marginRight:'8px', marginTop:'3px'}}/>
            <label htmlFor="sp_include_temporary" style={{...labelStyle, fontWeight:'normal', cursor:'pointer'}}> Incluir Servicios Temporales </label>
          </div>
          <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingServicesPerformed}>{loadingServicesPerformed ? 'Generando...' : 'Generar Reporte Servicios'}</button>
            <button type="button" onClick={handleExportServicesPerformedReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingServicesPerformedExport || servicesPerformedData.length === 0}>{loadingServicesPerformedExport ? 'Exportando...' : 'Exportar a Excel'}</button>
          </div>
        </form>
        {loadingServicesPerformed && <p style={{textAlign:'center', padding:'15px'}}>Cargando reporte de servicios...</p>}
        {servicesPerformedError && <p style={errorStyle}>{servicesPerformedError}</p>}
        {!loadingServicesPerformed && submittedServicesPerformedFilters && servicesPerformedData.length === 0 && !servicesPerformedError && ( <p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se encontraron servicios realizados.</p> )}
        {!loadingServicesPerformed && servicesPerformedData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop:'20px'}}>
            <table style={{ width: '100%', minWidth:'900px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead><tr><th style={tableHeaderStyle}>Fecha Venta</th><th style={tableHeaderStyle}>Factura N°</th><th style={tableHeaderStyle}>Servicio (ID)</th><th style={tableHeaderStyle}>Cód. Servicio</th><th style={tableHeaderStyle}>Descripción Servicio</th><th style={{...tableHeaderStyle, textAlign:'right'}}>Cant.</th><th style={{...tableHeaderStyle, textAlign:'right'}}>P. Unit.</th><th style={{...tableHeaderStyle, textAlign:'right'}}>P. Total Serv.</th><th style={tableHeaderStyle}>Cliente (ID)</th><th style={tableHeaderStyle}>Nombre Cliente</th></tr></thead>
              <tbody>{servicesPerformedData.map((serv, index) => (<tr key={`${serv.invoice_number}-${serv.service_id}-${index}`}><td style={tableCellStyle}>{new Date(serv.sale_date).toLocaleString()}</td><td style={tableCellStyle}>{serv.invoice_number}</td><td style={tableCellStyle}>{serv.service_id === 0 ? 'Temporal' : serv.service_id}</td><td style={tableCellStyle}>{serv.service_code || '-'}</td><td style={tableCellStyle}>{serv.service_description}</td><td style={{...tableCellStyle, textAlign:'right'}}>{serv.quantity}</td><td style={{...tableCellStyle, textAlign:'right'}}>{serv.unit_price.toFixed(2)}</td><td style={{...tableCellStyle, textAlign:'right'}}>{serv.total_service_price.toFixed(2)}</td><td style={tableCellStyle}>{serv.customer_id}</td><td style={tableCellStyle}>{serv.customer_name}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </section>
      {submittedServicesPerformedFilters && ((!loadingServicesPerformed && servicesPerformedData.length > 0) || servicesPerformedPagination.skip > 0) ? (
          <div style={paginationContainerStyle}><button onClick={handleServicesPerformedPreviousPage} disabled={servicesPerformedPagination.skip === 0 || loadingServicesPerformed} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Anterior</button><span>Página {Math.floor(servicesPerformedPagination.skip / servicesPerformedPagination.limit) + 1}</span><button onClick={handleServicesPerformedNextPage} disabled={servicesPerformedData.length < servicesPerformedPagination.limit || loadingServicesPerformed} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>Siguiente</button></div>
      ) : null}

      {/* === NUEVA SECCIÓN PARA REPORTE DE CLIENTES FRECUENTES === */}
      <section style={sectionStyle}>
        <h2 style={h2ReportStyle}>Reporte de Clientes Frecuentes</h2>
        <form onSubmit={handleGenerateFrequentCustomersReport} style={filterSectionStyle}>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fc_start_date">Desde:</label><input style={inputStyle} type="date" id="fc_start_date" name="start_date" value={frequentCustomersFilters.start_date} onChange={handleFrequentCustomersFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fc_end_date">Hasta:</label><input style={inputStyle} type="date" id="fc_end_date" name="end_date" value={frequentCustomersFilters.end_date} onChange={handleFrequentCustomersFilterChange} /></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fc_top_n">Top N Clientes:</label><input style={inputStyle} type="number" id="fc_top_n" name="top_n" value={frequentCustomersFilters.top_n} onChange={handleFrequentCustomersFilterChange} placeholder="Ej: 10" min="1"/></div>
          <div style={filterItemStyle}><label style={labelStyle} htmlFor="fc_min_purchases">Mínimo de Compras:</label><input style={inputStyle} type="number" id="fc_min_purchases" name="min_purchases" value={frequentCustomersFilters.min_purchases} onChange={handleFrequentCustomersFilterChange} placeholder="Opcional" min="1"/></div>
          <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', flexGrow:1}} disabled={loadingFrequentCustomers}>{loadingFrequentCustomers ? 'Generando...' : 'Generar Reporte Clientes Frec.'}</button>
            <button type="button" onClick={handleExportFrequentCustomersReport} style={{ ...buttonStyle, backgroundColor: '#17a2b8', flexGrow:1}} disabled={loadingFrequentCustomersExport || frequentCustomersData.length === 0}>{loadingFrequentCustomersExport ? 'Exportando...' : 'Exportar a Excel'}</button>
          </div>
        </form>
        {loadingFrequentCustomers && <p style={{textAlign:'center', padding:'15px'}}>Cargando reporte de clientes frecuentes...</p>}
        {frequentCustomersError && <p style={errorStyle}>{frequentCustomersError}</p>}
        {!loadingFrequentCustomers && submittedFrequentCustomersFilters && frequentCustomersData.length === 0 && !frequentCustomersError && (<p style={{textAlign:'center', padding:'20px', fontStyle:'italic'}}>No se encontraron clientes frecuentes.</p>)}
        {!loadingFrequentCustomers && frequentCustomersData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop:'20px'}}>
            <table style={{ width: '100%', minWidth:'700px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead><tr><th style={tableHeaderStyle}>ID Cliente</th><th style={tableHeaderStyle}>Nombre Cliente</th><th style={tableHeaderStyle}>Documento</th><th style={{...tableHeaderStyle, textAlign:'right'}}># Compras</th><th style={{...tableHeaderStyle, textAlign:'right'}}>Monto Total Gastado</th></tr></thead>
              <tbody>{frequentCustomersData.map((cust) => (<tr key={cust.customer_id}><td style={tableCellStyle}>{cust.customer_id}</td><td style={tableCellStyle}>{cust.customer_name}</td><td style={tableCellStyle}>{cust.customer_document || '-'}</td><td style={{...tableCellStyle, textAlign:'right'}}>{cust.total_sales_count}</td><td style={{...tableCellStyle, textAlign:'right'}}>{cust.total_amount_spent.toFixed(2)}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </section>
      {/* No hay paginación para clientes frecuentes */}
    </div>
  );
}

export default ReportsPage;