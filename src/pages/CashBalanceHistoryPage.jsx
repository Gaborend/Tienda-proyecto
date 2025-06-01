// src/pages/CashBalanceHistoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import cashBalanceService from '../services/cashBalanceService';
import configService from '../services/configService';

// Estilos
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
const errorStyle = { color: 'red', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0' };
const infoBoxStyle = { padding: '15px', backgroundColor: '#e7f3fe', borderLeft: '6px solid #2196F3', marginBottom: '20px', fontSize: '0.95em'};
const h3Style = { color: '#333', fontSize:'1.2em', borderBottom:'1px solid #ddd', paddingBottom:'10px', marginTop:'25px', marginBottom:'15px'};
const calculationRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '1.05em', borderBottom:'1px dotted #eee'};
const calculationTotalRowStyle = {...calculationRowStyle, fontWeight:'bold', borderTop:'1px solid #ccc', paddingTop:'10px', marginTop:'8px'};

const printCashDetailStyles = `
  @media print {
    body * { visibility: hidden; }
    .cash-detail-printable, .cash-detail-printable * {
      visibility: visible; box-sizing: border-box;
    }
    .cash-detail-printable {
      position: absolute !important; left: 0; top: 0; width: 100% !important; margin: 0 !important;
      padding: 15mm 10mm !important; border: none !important; box-shadow: none !important;
      color: #000 !important; font-size: 10pt !important; line-height: 1.3 !important;
      background-color: #fff !important; max-height: none !important; overflow: visible !important;
    }
    .cash-detail-printable .modal-actions-no-print { display: none !important; }
    .cash-detail-printable h2, .cash-detail-printable h3, .cash-detail-printable h4 {
      color: #000 !important; background: none !important; margin-top: 0.8em; 
      margin-bottom: 0.4em; page-break-after: avoid; word-wrap: break-word;
    }
    .cash-detail-printable h2 { font-size: 16pt; border-bottom: 1px solid #000; padding-bottom: 3px;}
    .cash-detail-printable h3 { font-size: 13pt; margin-top: 1.2em; }
    .cash-detail-printable h4 { font-size: 11pt; margin-top: 1em; }
    .cash-detail-printable .info-box-print p { margin: 2px 0; font-size: 9pt; word-wrap: break-word; }
    .cash-detail-printable .info-box-print { border: 1px solid #aaa; padding: 8px; margin-bottom: 12px; }
    .cash-detail-printable .calculation-row-print { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #888; font-size: 9pt; }
    .cash-detail-printable .calculation-row-print span:last-child { text-align: right; flex-shrink: 0; margin-left: 10px; }
    .cash-detail-printable .calculation-row-print span:first-child { word-break: break-word; }
    .cash-detail-printable .calculation-total-row-print { font-weight: bold; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
    .cash-detail-printable hr { border-top: 1px solid #333; margin: 10px 0; }
    .cash-detail-printable ul { list-style-position: inside; padding-left: 0; font-size: 8.5pt;}
    .cash-detail-printable li { padding: 3px 0; border-bottom: 1px dotted #ccc; display: flex; justify-content: space-between; flex-wrap: wrap; }
    .cash-detail-printable li div { flex-grow: 1; word-break: break-word; }
    .cash-detail-printable li em { font-style: italic; color: #333; margin-left:5px; white-space: nowrap;}
    .cash-detail-printable p { word-wrap: break-word; margin: 4px 0; }
  }
`;

const parseLocalDateFromString = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) return new Date(year, month, day);
  }
  const standardParsedDate = new Date(dateString);
  return !isNaN(standardParsedDate.getTime()) ? standardParsedDate : null;
};

const CashBalanceDetailModal = ({ record, storeConfig, onClose }) => {
    if (!record) return null;
    const formatDate = (dateStr) => dateStr ? (parseLocalDateFromString(dateStr)?.toLocaleDateString() || dateStr) : 'N/A';

    const handlePrintDetail = () => {
        window.print();
    };

    return (
        <>
            <style>{printCashDetailStyles}</style>
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex:1001}}>
                <div className="cash-detail-printable" style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '700px', maxHeight:'90vh', overflowY:'auto', color:'#333'}}>
                    <h2 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px', textAlign:'center'}}>
                        Detalle del Cuadre de Caja - {formatDate(record.date)}
                    </h2>
                    <div style={infoBoxStyle} className="info-box-print">
                        <p>ID Cuadre: <strong>{record.id}</strong></p>
                        <p>Abierto por: <strong>{record.opened_by_username}</strong></p>
                        <p>Base Inicial: <strong>{record.initial_balance?.toFixed(2)}</strong></p>
                        {record.status === 'closed' && (
                            <>
                                <p>Cerrado por: <strong>{record.closed_by_username || 'N/A'}</strong></p>
                                <p>Hora Cierre: {record.closing_time ? new Date(record.closing_time).toLocaleString() : 'N/A'}</p>
                            </>
                        )}
                        <p>Estado: <strong style={{color: record.status === 'closed' ? 'red' : 'green'}}>{record.status?.toUpperCase()}</strong></p>
                    </div>

                    <h3 style={h3Style}>Resumen Financiero</h3>
                    <div style={calculationRowStyle} className="calculation-row-print"><span>Total Ingresos:</span> <strong>{record.total_income_calculated?.toFixed(2) ?? 'N/A'}</strong></div>
                    <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas Efectivo:</span> <strong>{record.cash_sales?.toFixed(2) ?? 'N/A'}</strong></div>
                    <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas Tarjeta:</span> <strong>{record.card_sales?.toFixed(2) ?? 'N/A'}</strong></div>
                    <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas Transferencia:</span> <strong>{record.transfer_sales?.toFixed(2) ?? 'N/A'}</strong></div>
                    
                    <h4 style={{color:'#333', fontSize:'1.1em', marginTop:'15px', marginBottom:'5px'}}>Egresos Registrados:</h4>
                    {record.expenses_details && record.expenses_details.length > 0 ? (
                        <ul style={{listStyle:'none', paddingLeft: '0px', fontSize:'0.9em'}}>
                            {record.expenses_details.map((exp, idx) => (
                                <li key={idx} style={{padding:'4px 0', borderBottom:'1px dotted #eee'}}>
                                    <div>
                                    {formatDate(exp.expense_date)}: {exp.concept} 
                                    ({exp.recipient_id || 'N/A'}) - <strong>{parseFloat(exp.value).toFixed(2)}</strong>
                                    </div>
                                    {exp.payment_method_expense && <em style={{fontSize:'0.9em', marginLeft:'10px', color:'#555'}}>(Pagado con: {exp.payment_method_expense})</em>}
                                </li>
                            ))}
                        </ul>
                    ) : <p><em>No se registraron egresos.</em></p>}
                    <div style={{...calculationTotalRowStyle, ...calculationRowStyle}} className="calculation-row-print calculation-total-row-print"><span>Total Egresos:</span> <strong>{record.total_expenses_recorded?.toFixed(2) ?? 'N/A'}</strong></div>
                    
                    <hr style={{margin:'15px 0'}}/>
                    <div style={calculationRowStyle} className="calculation-row-print"><span>Utilidad del Día:</span> <strong>{record.profit_of_the_day?.toFixed(2) ?? 'N/A'}</strong></div>
                    <hr style={{margin:'15px 0'}}/>

                    {record.status === 'closed' && (
                        <>
                            <div style={calculationRowStyle} className="calculation-row-print"><span>Efectivo Esperado:</span> <strong>{record.expected_cash_in_box?.toFixed(2) ?? 'N/A'}</strong></div>
                            <div style={calculationRowStyle} className="calculation-row-print"><span>Efectivo Contado:</span> <strong>{record.counted_cash_physical?.toFixed(2) ?? 'N/A'}</strong></div>
                            <div style={{...calculationTotalRowStyle, ...calculationRowStyle, color: record.difference === 0 ? 'green' : (record.difference == null ? '#333' : 'red')}} className="calculation-row-print calculation-total-row-print">
                                <span>Diferencia:</span> 
                                <strong>
                                    {record.difference?.toFixed(2) ?? 'N/A'} 
                                    {record.difference != null && (record.difference > 0 ? ' (Sobrante)' : record.difference < 0 ? ' (Faltante)' : ' (Cuadre Exacto)')}
                                </strong>
                            </div>
                            <hr style={{margin:'15px 0'}}/>
                            <div style={{...calculationTotalRowStyle, ...calculationRowStyle}} className="calculation-row-print calculation-total-row-print"><span>Dinero a Consignar:</span> <strong>{record.cash_to_consign?.toFixed(2) ?? 'N/A'}</strong></div>
                            {record.notes && <p style={{marginTop:'15px'}}><strong>Notas:</strong> <em>{record.notes}</em></p>}
                        </>
                    )}
                    <div style={{textAlign:'center', marginTop:'25px'}} className="modal-actions-no-print">
                        <button onClick={handlePrintDetail} style={{...buttonStyle, backgroundColor:'#007bff', color:'white'}}>Imprimir Detalle</button>
                        <button onClick={onClose} style={{...buttonStyle, backgroundColor:'#6c757d', color:'white', marginRight:0}}>Cerrar</button>
                    </div>
                </div>
            </div>
        </>
    );
};

function CashBalanceHistoryPage() {
  const [cashRecords, setCashRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeConfig, setStoreConfig] = useState(null); 

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [filters, setFilters] = useState({ status: '', start_date: '', end_date: '', });
  const [pagination, setPagination] = useState({ skip: 0, limit: 15 });

  const fetchCashRecords = useCallback(async () => {
    setLoading(true); setError('');
    const params = {
      skip: pagination.skip, limit: pagination.limit,
      ...(filters.status && { status: filters.status }),
      ...(filters.start_date && { start_date: filters.start_date }),
      ...(filters.end_date && { end_date: filters.end_date }),
    };
    try {
      const response = await cashBalanceService.getCashRecordsHistory(params);
      setCashRecords(response || []);
      if (response && response.length === 0) {
        // setError('No se encontraron registros de cuadre de caja con los filtros aplicados.');
      }
    } catch (err) {
      console.error("Error al cargar historial de cuadres:", err);
      setError('Error al cargar el historial: ' + (err.response?.data?.detail || err.message));
      setCashRecords([]);
    } finally { setLoading(false); }
  }, [filters, pagination.skip, pagination.limit]);

  useEffect(() => { fetchCashRecords(); }, [fetchCashRecords]);

  useEffect(() => { 
    const fetchConf = async () => {
        try { const conf = await configService.getStoreSettings(); setStoreConfig(conf); }
        catch (e) { console.error("Error cargando config tienda en historial cuadres", e); }
    }
    fetchConf();
  }, []);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 })); 
    // El useEffect [fetchCashRecords] se disparará porque pagination.skip cambia (o filters si fetchCashRecords dependiera de él directamente)
    // Si pagination.skip ya era 0, forzamos el fetch.
    if (pagination.skip === 0) {
        fetchCashRecords();
    }
  };
  
  const handleNextPage = () => {
    if (cashRecords.length < pagination.limit && pagination.skip > 0) {
        alert("No hay más registros para mostrar."); return;
    }
    if (cashRecords.length === 0 && pagination.skip === 0) {
        alert("No hay registros para mostrar."); return;
    }
    setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
  };

  const handlePreviousPage = () => {
    setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }));
  };

  return (
    <div style={pageStyle}>
      {/* La etiqueta style para printCashDetailStyles se incluye dentro del modal */}
      <Link to="/dashboard">
        <button style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginBottom: '20px' }}>
          ← Volver al Dashboard
        </button>
      </Link>
      <h2>Historial de Cuadres de Caja</h2>

      <form onSubmit={handleFilterSubmit} style={filterSectionStyle}>
        <div style={filterItemStyle}>
          <label htmlFor="status_filter_history" style={labelStyle}>Estado:</label>
          <select id="status_filter_history" name="status" value={filters.status} onChange={handleFilterChange} style={inputStyle}>
            <option value="">Todos</option>
            <option value="open">Abierto</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="start_date_filter_history" style={labelStyle}>Desde:</label>
          <input id="start_date_filter_history" type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} style={inputStyle} />
        </div>
        <div style={filterItemStyle}>
          <label htmlFor="end_date_filter_history" style={labelStyle}>Hasta:</label>
          <input id="end_date_filter_history" type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} style={inputStyle} />
        </div>
        
      </form>

      {loading && <p style={{textAlign:'center', padding: '20px'}}>Cargando historial...</p>}
      {error && cashRecords.length === 0 && <p style={errorStyle}>{error}</p>} 
      {!loading && cashRecords.length === 0 && !error && <p style={{textAlign:'center', padding:'20px'}}>No se encontraron registros con los filtros aplicados.</p>}
      
      {!loading && cashRecords.length > 0 && (
        <div style={{overflowX: 'auto'}}>
          <table style={{ width: '100%', minWidth:'800px', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.95em' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>ID</th>
                <th style={tableHeaderStyle}>Fecha</th>
                <th style={tableHeaderStyle}>Abierto por</th>
                <th style={tableHeaderStyle}>Cerrado por</th>
                <th style={tableHeaderStyle}>Diferencia</th>
                <th style={tableHeaderStyle}>Estado</th>
                <th style={tableHeaderStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cashRecords.map(record => (
                <tr key={record.id}>
                  <td style={tableCellStyle}>{record.id}</td>
                  <td style={tableCellStyle}>{parseLocalDateFromString(record.date)?.toLocaleDateString() || 'N/A'}</td>
                  <td style={tableCellStyle}>{record.opened_by_username}</td>
                  <td style={tableCellStyle}>{record.closed_by_username || '-'}</td>
                  <td style={{...tableCellStyle, color: record.difference < 0 ? 'red' : (record.difference == null || record.difference === 0 ? 'green' : 'blue'), fontWeight:'bold' }}>
                    {record.difference?.toFixed(2) ?? '-'}
                    {record.difference != null && (record.difference > 0 ? ' (Sobrante)' : record.difference < 0 ? ' (Faltante)' : ' (Exacto)')}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                        color: record.status === 'closed' ? '#dc3545' : '#28a745', fontWeight: 'bold',
                        padding: '4px 8px', borderRadius: '4px',
                        backgroundColor: record.status === 'closed' ? '#f8d7da' : '#d4edda',
                        fontSize: '0.9em'
                    }}>
                      {record.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <button onClick={() => handleViewDetails(record)} style={{ ...buttonStyle, backgroundColor: '#17a2b8', color: 'white' }} title="Ver Detalle">
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {((!loading && cashRecords.length > 0) || pagination.skip > 0) ? (
          <div style={paginationContainerStyle}>
            <button onClick={handlePreviousPage} disabled={pagination.skip === 0 || loading} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>
                Anterior
            </button>
            <span>Página {Math.floor(pagination.skip / pagination.limit) + 1}</span>
            <button onClick={handleNextPage} disabled={cashRecords.length < pagination.limit || loading} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>
                Siguiente
            </button>
          </div>
      ) : null}

      {showDetailModal && selectedRecord && (
        <CashBalanceDetailModal
          record={selectedRecord}
          storeConfig={storeConfig}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </div>
  );
}

export default CashBalanceHistoryPage;