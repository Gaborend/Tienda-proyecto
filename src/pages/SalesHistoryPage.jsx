// src/pages/SalesHistoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import billingService from '../services/billingService';
import InvoiceModal from '../components/InvoiceModal';
import configService from '../services/configService';

// Estilos (se mantienen los que ya tienes)
const pageStyle = { padding: '20px', fontFamily: 'Arial, sans-serif' };
const tableHeaderStyle = { 
  borderBottom: '2px solid #333', padding: '12px 10px', textAlign: 'left', 
  backgroundColor: '#e9ecef', color: '#212529', fontWeight: 'bold',
};
const tableCellStyle = { borderBottom: '1px solid #ddd', padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle' };
const buttonStyle = { padding: '8px 15px', margin: '0 5px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.9em' };
const filterSectionStyle = { 
  marginBottom: '25px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', 
  display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', 
  backgroundColor: '#f8f9fa'
};
const inputStyle = { padding: '10px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ced4da', fontSize: '0.95em', width: '100%' };
const filterItemStyle = { display: 'flex', flexDirection: 'column', minWidth: '180px', flexGrow: 1};
const labelStyle = { 
  marginBottom: '5px', fontSize: '0.9em', fontWeight: '600', 
  display: 'block', color: '#343a40'
};
const paginationContainerStyle = { marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderTop: '1px solid #eee' };

const REGULAR_LIMIT = 10; 
const EXPANDED_SEARCH_LIMIT = 200; 

function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeConfig, setStoreConfig] = useState(null);

  const [selectedSaleForModal, setSelectedSaleForModal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  const [currentFilters, setCurrentFilters] = useState({
    invoice_number: '',
    customer_document_query: '',
    status: '', 
    start_date: '',
    end_date: '',
    payment_method: '', 
    product_id_in_sale: '',
  });

  const [submittedFilters, setSubmittedFilters] = useState(currentFilters);

  const [pagination, setPagination] = useState({
    skip: 0,
    limit: REGULAR_LIMIT,
  });

  const isExpandedSearchForUI = pagination.limit === EXPANDED_SEARCH_LIMIT;

  const fetchSales = useCallback(async () => {
    setLoading(true);

    console.log("FETCHSALES: Iniciando con submittedFilters:", JSON.parse(JSON.stringify(submittedFilters)));
    console.log("FETCHSALES: Paginación actual:", JSON.parse(JSON.stringify(pagination)));

    const paramsForBackend = {
      skip: pagination.skip,
      limit: pagination.limit,
    };
    
    if (submittedFilters.invoice_number.trim()) {
      paramsForBackend.invoice_number = submittedFilters.invoice_number.trim();
    }
    if (submittedFilters.start_date) {
      paramsForBackend.start_date = submittedFilters.start_date;
    }
    if (submittedFilters.end_date) {
      paramsForBackend.end_date = submittedFilters.end_date;
    }
    
    let validationErrorForProductId = '';
    const productIdInSaleTrimmed = submittedFilters.product_id_in_sale.trim();
    if (productIdInSaleTrimmed) {
        const prodId = parseInt(productIdInSaleTrimmed, 10);
        if (!isNaN(prodId) && prodId > 0) {
            paramsForBackend.product_id = prodId;
        } else if (productIdInSaleTrimmed !== '') { 
            validationErrorForProductId = "El Código de Barras de Producto en Venta no es válido. Se ignorará este filtro.";
        }
    }

    // --- MODIFICACIÓN: Lógica de envío de status y payment_method ---
    // Enviar 'status' al backend si está seleccionado (no es "Todos")
    if (submittedFilters.status) { 
        paramsForBackend.status = submittedFilters.status;
    }
    // Enviar 'payment_method' al backend SIEMPRE si está seleccionado (no es "Todos")
    // El backend deberá manejar la combinación de estos filtros.
    // Si 'status' no se envía, el backend debería devolver todos los estados para el 'payment_method' dado.
    if (submittedFilters.payment_method) {
        paramsForBackend.payment_method = submittedFilters.payment_method;
    }
    // --- FIN DE LA MODIFICACIÓN ---

    console.log("FETCHSALES: Parámetros enviados al Backend:", JSON.parse(JSON.stringify(paramsForBackend)));

    try {
      const response = await billingService.getSales(paramsForBackend);
      let ventasRecibidasDelBackend = response || [];
      console.log(`FETCHSALES: Ventas recibidas del backend (${ventasRecibidasDelBackend.length})`);
      
      let ventasFiltradas = ventasRecibidasDelBackend;

      // Filtrar por Documento del Cliente (se mantiene en frontend)
      const docQuery = submittedFilters.customer_document_query.trim().toLowerCase();
      if (docQuery) {
        ventasFiltradas = ventasFiltradas.filter(sale =>
          sale.customer_document && 
          typeof sale.customer_document === 'string' && 
          sale.customer_document.toLowerCase().includes(docQuery)
        );
        console.log(`FETCHSALES: Ventas tras filtro DOC (${docQuery}) quedaron (${ventasFiltradas.length})`);
      }
      
      // --- ELIMINADO: Filtrado adicional de payment_method en frontend ---
      // Ya que ahora se envía payment_method al backend en todos los casos donde está seleccionado.

      setSales(ventasFiltradas);

      let currentErrorMessage = validationErrorForProductId || '';
      if (ventasFiltradas.length === 0 && !loading) {
        const noResultsMsg = 'No se encontraron ventas con los filtros aplicados.';
        currentErrorMessage = currentErrorMessage ? `${currentErrorMessage} Adicionalmente, ${noResultsMsg.toLowerCase()}` : noResultsMsg;
      }
      
      if (error !== currentErrorMessage) { 
          setError(currentErrorMessage);
      } else if (!currentErrorMessage && error) {
          setError('');
      }

    } catch (err) {
      console.error("Error al cargar historial:", err);
      const detail = err.response?.data?.detail || err.message || 'Error desconocido.';
      let apiErrorMsg = `Error al cargar el historial de ventas: ${detail}`;
      if (validationErrorForProductId) {
          apiErrorMsg = `${validationErrorForProductId} Y además, ${apiErrorMsg}`;
      }
      setError(apiErrorMsg);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [submittedFilters, pagination.skip, pagination.limit]); 

  useEffect(() => {
    const fetchStoreConfig = async () => { 
        try {
            const config = await configService.getStoreSettings(); 
            setStoreConfig(config);
        } catch (err) {
            console.error("Error al cargar configuración de la tienda:", err);
        }
    };
    fetchStoreConfig();
  }, []);

  useEffect(() => {
    console.log("USEEFFECT: Disparando fetchSales debido a cambio en submittedFilters o paginación.");
    fetchSales();
  }, [fetchSales]); 

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setCurrentFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setError(''); 
    
    const shouldUseExpandedLimit = 
      currentFilters.customer_document_query.trim() !== '' &&
      !currentFilters.invoice_number.trim() &&
      !currentFilters.start_date &&
      !currentFilters.end_date &&
      !currentFilters.product_id_in_sale.trim();
    
    setPagination({ 
      skip: 0, 
      limit: shouldUseExpandedLimit ? EXPANDED_SEARCH_LIMIT : REGULAR_LIMIT
    });
    
    setSubmittedFilters(currentFilters); 
  };
  
  const handleViewDetails = (sale) => {
    setSelectedSaleForModal(sale);
    setShowInvoiceModal(true); 
  };

  const handleOpenCancelPrompt = (sale) => {
    if (sale.status === 'cancelled') {
        alert('Esta factura ya ha sido cancelada.');
        return;
    }
    setSaleToCancel(sale);
    setShowCancelPrompt(true); 
    setCancelReason('');
    setCancelError('');
    setCancelSuccess('');
  };

  const handleConfirmCancel = async () => {
    if (!saleToCancel || cancelReason.trim().length < 5) {
      setCancelError('Debe ingresar un motivo para la cancelación (mínimo 5 caracteres).');
      return;
    }
    setLoading(true); 
    setCancelError('');
    setCancelSuccess('');
    try {
      await billingService.cancelSale(saleToCancel.id, cancelReason);
      setCancelSuccess(`Factura ${saleToCancel.invoice_number} cancelada exitosamente.`);
      setShowCancelPrompt(false);
      setSaleToCancel(null);
      fetchSales(); 
      setTimeout(() => setCancelSuccess(''), 5000);
    } catch (err) {
      setCancelError('Error al cancelar la factura: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setCancelError(''), 7000);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (loading || pagination.limit === EXPANDED_SEARCH_LIMIT) return; 
    if (sales.length < pagination.limit && !loading) {
        return; 
    }
    setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
  };

  const handlePreviousPage = () => {
    if (loading || pagination.limit === EXPANDED_SEARCH_LIMIT) return;
    setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }));
  };

  return (
    <div style={pageStyle}>
      <Link to="/dashboard">
        <button style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginBottom: '20px' }}>
          ← Volver al Dashboard
        </button>
      </Link>
      <h2>Historial de Ventas</h2>

      <form onSubmit={handleFilterSubmit} style={filterSectionStyle}>
        <div style={filterItemStyle}>
          <label htmlFor="invoice_number_filter" style={labelStyle}>N° Factura:</label>
          <input id="invoice_number_filter" type="text" name="invoice_number" value={currentFilters.invoice_number} onChange={handleFilterChange} placeholder="Buscar N° Factura" style={inputStyle} />
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="customer_document_query_filter" style={labelStyle}>Documento Cliente:</label>
          <input id="customer_document_query_filter" type="text" name="customer_document_query" value={currentFilters.customer_document_query} onChange={handleFilterChange} placeholder="N° Documento Cliente" style={inputStyle} />
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="status_filter" style={labelStyle}>Estado:</label>
          <select id="status_filter" name="status" value={currentFilters.status} onChange={handleFilterChange} style={inputStyle}>
            <option value="">Todos</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="start_date_filter" style={labelStyle}>Desde:</label>
          <input id="start_date_filter" type="date" name="start_date" value={currentFilters.start_date} onChange={handleFilterChange} style={inputStyle} />
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="end_date_filter" style={labelStyle}>Hasta:</label>
          <input id="end_date_filter" type="date" name="end_date" value={currentFilters.end_date} onChange={handleFilterChange} style={inputStyle} />
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="payment_method_filter" style={labelStyle}>Método de Pago:</label>
          <select id="payment_method_filter" name="payment_method" value={currentFilters.payment_method} onChange={handleFilterChange} style={inputStyle}>
            <option value="">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="product_id_in_sale_filter" style={labelStyle}>Cód. Barras Producto en Venta:</label>
          <input id="product_id_in_sale_filter" type="text" name="product_id_in_sale" value={currentFilters.product_id_in_sale} onChange={handleFilterChange} placeholder="Cód. Barras (Numérico)" style={inputStyle} />
        </div>
        <button type="submit" style={{ ...buttonStyle, backgroundColor: '#007bff', color: 'white', padding: '10px 20px', height:'min-content' }} disabled={loading}>
            {loading ? 'Buscando...' : 'Aplicar Filtros'}
        </button>
      </form>

      {loading && <p style={{textAlign:'center', padding: '20px'}}>Cargando historial...</p>}
      {error && !loading && <p style={{ color: 'red', fontWeight: 'bold', textAlign:'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0', marginTop:'10px' }}>{error}</p>}
      {cancelSuccess && <p style={{ color: 'green', fontWeight: 'bold', textAlign:'center', padding: '10px', border: '1px solid green', backgroundColor: '#e6ffed', marginTop:'10px' }}>{cancelSuccess}</p>}
      
      {!loading && !error && sales.length === 0 && (
          <p style={{textAlign:'center', padding: '20px'}}>No se encontraron ventas con los criterios actuales.</p>
      )}
      
      {!loading && sales.length > 0 && (
        <div style={{overflowX: 'auto'}}>
          <table style={{ width: '100%', minWidth:'900px', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.95em' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Factura N°</th>
                <th style={tableHeaderStyle}>Fecha</th>
                <th style={tableHeaderStyle}>Cliente (Documento)</th>
                <th style={tableHeaderStyle}>Total</th>
                <th style={tableHeaderStyle}>Método Pago</th>
                <th style={tableHeaderStyle}>Estado</th>
                <th style={tableHeaderStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td style={tableCellStyle}>{sale.invoice_number}</td>
                  <td style={tableCellStyle}>{new Date(sale.date).toLocaleDateString()}</td>
                  <td style={tableCellStyle}>{sale.customer_name} ({sale.customer_document || 'N/A'})</td>
                  <td style={tableCellStyle}>{sale.total_amount.toFixed(2)}</td>
                  <td style={tableCellStyle}>{sale.payment_method}</td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                        color: sale.status === 'cancelled' ? '#dc3545' : '#28a745', 
                        fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px',
                        backgroundColor: sale.status === 'cancelled' ? '#f8d7da' : '#d4edda',
                        fontSize: '0.9em'
                    }}>
                      {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <button onClick={() => handleViewDetails(sale)} style={{ ...buttonStyle, backgroundColor: '#17a2b8', color: 'white' }} title="Ver Detalle" disabled={loading}>
                      Ver
                    </button>
                    {sale.status === 'completed' && (
                      <button onClick={() => handleOpenCancelPrompt(sale)} style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }} title="Cancelar Factura" disabled={loading}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && !isExpandedSearchForUI && (sales.length > 0 || pagination.skip > 0) ? (
          <div style={paginationContainerStyle}>
            <button 
              onClick={handlePreviousPage} 
              disabled={pagination.skip === 0 || loading} 
              style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}
            >
              Anterior
            </button>
            <span>Página {Math.floor(pagination.skip / REGULAR_LIMIT) + 1}</span>
            <button 
              onClick={handleNextPage} 
              disabled={loading || (sales.length < pagination.limit && !loading)}
              style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}
            >
              Siguiente
            </button>
          </div>
      ) : null}

      {showInvoiceModal && selectedSaleForModal && (
        <InvoiceModal
          saleData={selectedSaleForModal}
          storeConfig={storeConfig}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedSaleForModal(null);
          }}
          isViewingMode={true}
        />
      )}

      {showCancelPrompt && saleToCancel && (
        <div style={{ position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '450px', color: '#333' }}>
            <h3 style={{marginTop: 0}}>Cancelar Factura: {saleToCancel.invoice_number}</h3>
            <p><strong>Cliente:</strong> {saleToCancel.customer_name}</p>
            <p><strong>Total:</strong> {saleToCancel.total_amount.toFixed(2)}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de la cancelación (obligatorio) min 5 caracteres"
              rows="3"
              style={{ width: '100%', padding: '10px', margin: '15px 0', border: '1px solid #ccc', boxSizing: 'border-box', borderRadius: '4px' }}
              minLength={5}
            />
            {cancelError && <p style={{color: 'red', fontSize: '0.9em', marginBottom: '10px'}}>{cancelError}</p>}
            <div style={{ textAlign: 'right', marginTop: '15px' }}>
              <button onClick={() => {setShowCancelPrompt(false); setSaleToCancel(null); setCancelError('');}} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginRight: '10px'}} disabled={loading}>
                Cerrar
              </button>
              <button onClick={handleConfirmCancel} disabled={loading || cancelReason.trim().length < 5} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>
                {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHistoryPage;