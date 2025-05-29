// src/pages/CashBalancePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import cashBalanceService from '../services/cashBalanceService';
import configService from '../services/configService';
import authService from '../services/authService';
import billingService from '../services/billingService';

// Estilos
const pageStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' };
const sectionStyle = { 
  marginBottom: '30px', padding: '20px', border: '1px solid #ccc', 
  borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333'
};
const buttonStyle = { padding: '10px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.95em', marginRight:'10px', minWidth:'120px' };
const inputStyle = { padding: '10px', margin: '0 0 10px 0', border: '1px solid #ccc', borderRadius: '5px', width: '100%', boxSizing: 'border-box', fontSize:'0.95em'};
const labelStyle = { fontWeight: 'bold', marginBottom: '4px', display: 'block', color: '#343a40', fontSize:'0.9em' };
const errorStyle = { color: 'red', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0' };
const successStyle = { color: 'green', marginTop: '10px', fontWeight: 'bold', textAlign: 'center', padding: '10px', border: '1px solid green', backgroundColor: '#e6ffed' };
const infoBoxStyle = { padding: '15px', backgroundColor: '#e7f3fe', borderLeft: '6px solid #2196F3', marginBottom: '20px', fontSize: '0.95em'};
const h2Style = { color: '#333', marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom:'10px'};
const h3Style = { color: '#333', fontSize:'1.2em', borderBottom:'1px solid #ddd', paddingBottom:'10px', marginTop:'25px', marginBottom:'15px'};
const expenseItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee', flexWrap:'wrap', gap:'10px'};
const expenseItemDetailsStyle = { flexGrow:1, marginRight:'10px', fontSize:'0.9em'};
const calculationRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '1.05em', borderBottom:'1px dotted #eee'};
const calculationTotalRowStyle = {...calculationRowStyle, fontWeight:'bold', borderTop:'1px solid #ccc', paddingTop:'10px', marginTop:'8px'};
const formRowStyle = {display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px', alignItems:'flex-end'};
const formFieldStyle = (flex = 1, minWidth = '120px') => ({flex, minWidth, marginBottom:'10px'});
const salesDetailTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.9em' };
const salesDetailThStyle = { backgroundColor: '#f2f2f2', border: '1px solid #ddd', padding: '8px', textAlign: 'left' };
const salesDetailTdStyle = { border: '1px solid #ddd', padding: '8px', textAlign: 'left' };
const itemsSubTableStyle = { width: '100%', marginTop: '5px', fontSize: '0.95em' };
const itemsSubThStyle = { backgroundColor: '#fafafa', padding: '4px', textAlign: 'left', borderBottom:'1px solid #eee' };
const itemsSubTdStyle = { padding: '4px', borderBottom:'1px solid #f5f5f5' };

const printCashSummaryStyles = `
  @media print {
    html, body {
      width: 100%; height: auto !important; overflow: visible !important;
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      font-size: 9pt; 
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    body * { visibility: hidden; }
    .cash-summary-printable, .cash-summary-printable * {
      visibility: visible; box-sizing: border-box;
    }
    .cash-summary-printable {
      position: static !important; width: 100% !important; max-width: 100% !important;
      margin: 0 auto !important; padding: 10mm 8mm !important; 
      border: none !important; box-shadow: none !important;
      color: #000 !important; line-height: 1.3;
      overflow: visible !important; height: auto !important; max-height: none !important;
      background-color: #fff !important;
    }
    .cash-summary-printable .no-print { display: none !important; }
    .cash-summary-printable h1, .cash-summary-printable h2, 
    .cash-summary-printable h3, .cash-summary-printable h4 {
      color: #000 !important; background: none !important;
      margin-top: 0.8em; margin-bottom: 0.4em;
      page-break-after: avoid; word-wrap: break-word; overflow-wrap: break-word;
    }
    .cash-summary-printable h1 { font-size: 16pt; text-align:center; }
    .cash-summary-printable h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 3px;}
    .cash-summary-printable h3 { font-size: 12pt; border-bottom: 1px dotted #000; padding-bottom: 2px;}
    .cash-summary-printable .info-box-print p { 
        margin: 2px 0; font-size: 9pt; word-wrap: break-word; overflow-wrap: break-word;
    }
    .cash-summary-printable .info-box-print { 
        border: 1px solid #aaa; padding: 8px; margin-bottom: 12px;
    }
    .cash-summary-printable .calculation-row-print {
        display: flex; justify-content: space-between; padding: 4px 0;
        border-bottom: 1px dotted #888; font-size: 9pt;
    }
    .cash-summary-printable .calculation-row-print span { 
        word-break: break-word; overflow-wrap: break-word;
    }
    .cash-summary-printable .calculation-row-print span:last-child {
        text-align: right; flex-shrink: 0; margin-left: 10px;
    }
    .cash-summary-printable .calculation-total-row-print {
        font-weight: bold; border-top: 1px solid #000;
        padding-top: 6px; margin-top: 6px;
    }
    .cash-summary-printable hr { border-top: 1px solid #333; margin: 10px 0; }
    .cash-summary-printable ul { list-style-position: inside; padding-left: 0; font-size: 8.5pt;}
    .cash-summary-printable li { 
        padding: 3px 0; border-bottom: 1px dotted #ccc;
        display: flex; justify-content: space-between; flex-wrap: wrap;
    }
    .cash-summary-printable li > div:first-child { 
        flex-grow: 1; word-break: break-word; overflow-wrap: break-word;
    }
    .cash-summary-printable li em { font-style: italic; color: #333; margin-left:5px; white-space: nowrap;}
    .cash-summary-printable p { word-wrap: break-word; overflow-wrap: break-word; margin: 4px 0; }
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

function CashBalancePage() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [initialBalanceOverride, setInitialBalanceOverride] = useState('');
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [dailySalesSummary, setDailySalesSummary] = useState({ cash: 0, card: 0, transfer: 0, total: 0 });
  const [detailedTodaysSales, setDetailedTodaysSales] = useState([]);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [currentExpense, setCurrentExpense] = useState({ 
    concept: '', value: '', recipient_id: '', 
    expense_date: new Date().toISOString().split('T')[0],
    payment_method_expense: 'Efectivo'
  });
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingClose, setLoadingClose] = useState(false);
  const [loadingReopen, setLoadingReopen] = useState(false);
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalIncome: 0, totalExpenses: 0, totalCashExpenses: 0, profit: 0,
    expectedCash: 0, difference: 0, cashToConsign: 0,
  });

  const currentUser = useMemo(() => authService.getCurrentUser(), []);
  // Descomenta este log para verificar el usuario y rol al cargar la página:
  // console.log("CashBalancePage - currentUser (al inicio del componente):", currentUser); 
  
  const canOverrideInitialBalance = currentUser && ['admin', 'soporte'].includes(currentUser.role);
  const canReopenCashBalance = currentUser && ['admin', 'soporte'].includes(currentUser.role);

  const loadInitialPageData = useCallback(async () => {
    // console.log("CashBalancePage: loadInitialPageData - Iniciando carga...");
    setLoading(true); setError('');
    try {
      const [recordResponse, configResponse] = await Promise.all([
        cashBalanceService.getTodaysCashRecord(),
        configService.getStoreSettings()
      ]);
      // console.log("CashBalancePage: loadInitialPageData - recordResponse:", recordResponse);
      // console.log("CashBalancePage: loadInitialPageData - configResponse:", configResponse);

      setTodayRecord(recordResponse); 
      setStoreConfig(configResponse);
      
      if (!recordResponse || recordResponse.status !== 'open') {
          setExpenses([]); setCountedCash(''); setNotes('');
      }
    } catch (err) {
      console.error("CashBalancePage: Error en loadInitialPageData:", err.response?.data || err.message || err);
      setError("Error al cargar datos iniciales. Verifique la conexión o intente recargar.");
      setTodayRecord(null); setStoreConfig(null);
    } finally {
      // console.log("CashBalancePage: loadInitialPageData - Finalizado.");
      setLoading(false);
    }
  }, []); 

  useEffect(() => { loadInitialPageData(); }, [loadInitialPageData]);

  const fetchTodaysSales = useCallback(async () => {
    if (!todayRecord || !todayRecord.date || todayRecord.status !== 'open') {
      setDailySalesSummary({ cash: 0, card: 0, transfer: 0, total: 0 });
      setDetailedTodaysSales([]); return;
    }
    setLoadingSales(true);
    try {
        const recordDateStr = todayRecord.date; 
        const salesData = await billingService.getSales({
            start_date: recordDateStr, end_date: recordDateStr,
            status: 'completed', limit: 10000, 
        });
        setDetailedTodaysSales(salesData || []);
        let cash = 0, card = 0, transfer = 0;
        (salesData || []).forEach(sale => {
            if (sale.payment_method?.toLowerCase() === 'efectivo') cash += sale.total_amount;
            else if (sale.payment_method?.toLowerCase() === 'tarjeta') card += sale.total_amount;
            else if (sale.payment_method?.toLowerCase() === 'transferencia') transfer += sale.total_amount;
        });
        setDailySalesSummary({ cash, card, transfer, total: cash + card + transfer });
    } catch (err) {
        console.error("Error cargando ventas del día:", err);
        setError(prev => (prev ? prev + " " : "") + "Error al cargar resumen de ventas del día.");
    } finally { setLoadingSales(false); }
  }, [todayRecord]);

  useEffect(() => {
    if (todayRecord && todayRecord.status === 'open') {
      fetchTodaysSales();
    }
  }, [todayRecord, fetchTodaysSales]);

  useEffect(() => {
    if (todayRecord && todayRecord.status === 'open' && storeConfig) {
      const totalIncome = dailySalesSummary.total;
      const totalAllExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.value || 0), 0);
      const totalCashExpenses = expenses
        .filter(exp => exp.payment_method_expense && exp.payment_method_expense.toLowerCase() === 'efectivo')
        .reduce((sum, exp) => sum + parseFloat(exp.value || 0), 0);
      const profit = totalIncome - totalAllExpenses;
      const initialBalance = parseFloat(todayRecord.initial_balance); 
      if (isNaN(initialBalance)) { console.error("Balance inicial inválido en todayRecord:", todayRecord); return; }
      const cashSales = dailySalesSummary.cash;
      const expectedCash = initialBalance + cashSales - totalCashExpenses;
      const currentCountedCash = parseFloat(countedCash || 0);
      const difference = currentCountedCash - expectedCash;
      const cashToConsign = Math.max(0, cashSales - totalCashExpenses);
      setCalculatedTotals({
        totalIncome, totalExpenses: totalAllExpenses, totalCashExpenses, 
        profit, expectedCash, difference, cashToConsign
      });
    } else {
      setCalculatedTotals({
        totalIncome: 0, totalExpenses: 0, totalCashExpenses: 0, profit: 0,
        expectedCash: 0, difference: 0, cashToConsign: 0,
      });
    }
  }, [dailySalesSummary, expenses, countedCash, todayRecord, storeConfig]);

  const handleOpenCashBalance = async (e) => {
    e.preventDefault(); setLoadingOpen(true); setError(''); setSuccessMessage('');
    try {
      const openData = {};
      if (initialBalanceOverride !== '' && canOverrideInitialBalance) {
        const balance = parseFloat(initialBalanceOverride);
        if (isNaN(balance) || balance < 0) {
          setError("La base de caja personalizada debe ser un número positivo.");
          setLoadingOpen(false); return;
        }
        openData.initial_balance_override = balance;
      }
      const newRecord = await cashBalanceService.openCashBalance(openData);
      setTodayRecord(newRecord); 
      setSuccessMessage(`Caja abierta exitosamente con base de ${newRecord.initial_balance.toFixed(2)}.`);
      setInitialBalanceOverride(''); 
    } catch (err) { setError(err.response?.data?.detail || err.message || "Error al abrir la caja.");
    } finally { setLoadingOpen(false); }
  };

  const handleAddExpense = () => {
    if (!currentExpense.concept.trim() || !currentExpense.value.trim() || parseFloat(currentExpense.value) <= 0) {
      alert("Concepto y valor (positivo) del egreso son obligatorios."); return;
    }
    if (!currentExpense.payment_method_expense) {
        alert("Por favor, seleccione un método de pago para el egreso."); return;
    }
    setExpenses([...expenses, { ...currentExpense, id_temporal: Date.now(), value: parseFloat(currentExpense.value) }]);
    setCurrentExpense({ 
        concept: '', value: '', recipient_id: '', 
        expense_date: new Date().toISOString().split('T')[0],
        payment_method_expense: 'Efectivo'
    });
  };

  const handleRemoveExpense = (id_temporal) => {
    setExpenses(expenses.filter(exp => exp.id_temporal !== id_temporal));
  };
  
  const handleCloseCashBalance = async () => {
    if (countedCash === '' || isNaN(parseFloat(countedCash))) {
        setError("Debe ingresar el valor del efectivo físico contado."); return;
    }
    setLoadingClose(true); setError(''); setSuccessMessage('');
    try {
        const closeData = {
            expenses_details: expenses.map(exp => ({
                concept: exp.concept, value: exp.value, 
                recipient_id: exp.recipient_id || null,
                expense_date: exp.expense_date, 
                payment_method_expense: exp.payment_method_expense
            })),
            counted_cash_physical: parseFloat(countedCash),
            notes: notes.trim() || null,
        };
        const closedRecord = await cashBalanceService.closeCashBalance(closeData);
        setTodayRecord(closedRecord);
        setSuccessMessage("¡Caja cerrada exitosamente!");
        setExpenses([]); setCountedCash(''); setNotes('');
    } catch (err) {
        console.error("Error al cerrar la caja:", err.response?.data || err.message || err);
        setError(err.response?.data?.detail || err.message || "Error al cerrar la caja.");
    } finally { setLoadingClose(false); }
  };

    const handleReopenCashBalance = async () => {
    const clientCurrentDateString = new Date().toLocaleDateString('en-CA'); // Obtiene "YYYY-MM-DD" en la zona local del cliente

    // Asegurarse de que todayRecord y todayRecord.date existen
    if (!todayRecord || !todayRecord.date) {
        alert("No hay un registro de cuadre cargado para reabrir.");
        return;
    }

    // todayRecord.date ya viene del backend como "YYYY-MM-DD"
    const recordDateString = todayRecord.date; 

    console.log("handleReopen - Fecha Cliente (YYYY-MM-DD):", clientCurrentDateString);
    console.log("handleReopen - Fecha Registro (YYYY-MM-DD):", recordDateString);
    console.log("handleReopen - Estado del Registro:", todayRecord.status);


    if (todayRecord.status !== 'closed' || recordDateString !== clientCurrentDateString) {
      alert("Solo se puede reabrir un cuadre cerrado del día actual.");
      return;
    }

    if (!window.confirm("¿Está seguro de que desea reabrir este cuadre de caja para correcciones? Esta acción puede afectar reportes previos si no se maneja con cuidado.")) {
        return;
    }

    setLoadingReopen(true); setError(''); setSuccessMessage('');
    try {
        const reopenedRecord = await cashBalanceService.reopenLatestToday();
        setTodayRecord(reopenedRecord); 
        setSuccessMessage("Cuadre de caja reabierto para correcciones.");
         if (reopenedRecord && reopenedRecord.status === 'open') {
            setExpenses( (reopenedRecord.expenses_details || []).map(exp => ({
                ...exp, 
                id_temporal: `prev_${exp.concept}_${Date.now()}_${Math.random()}`.replace('.',''),
                expense_date: exp.expense_date ? (parseLocalDateFromString(exp.expense_date)?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
            })) );
            setCountedCash(''); 
            setNotes(reopenedRecord.notes || '');
        }
    } catch (err) {
        console.error("Error al reabrir cuadre de caja:", err.response?.data || err.message || err);
        setError(err.response?.data?.detail || err.message || "Error al intentar reabrir el cuadre.");
    } finally {
        setLoadingReopen(false);
    }
  };
  const handlePrintCashSummary = () => {
    window.print();
  };

  const renderOpenCashForm = () => {
    if (!storeConfig) return <p style={{textAlign:'center'}}>Cargando configuración de la tienda...</p>;
    const todayClientDate = new Date().toLocaleDateString();
    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Abrir Caja para Hoy ({todayClientDate})</h2>
        <form onSubmit={handleOpenCashBalance}>
          <p>Base de caja por defecto: <strong>{storeConfig.initial_cash_balance.toFixed(2)}</strong></p>
          {canOverrideInitialBalance && (
            <div style={{marginBottom:'15px'}}>
              <label htmlFor="initialBalanceOverride" style={labelStyle}>
                Base de Caja Personalizada (Admin/Soporte):
              </label>
              <input
                type="number" id="initialBalanceOverride" value={initialBalanceOverride}
                onChange={(e) => setInitialBalanceOverride(e.target.value)}
                placeholder="Dejar vacío para usar la base por defecto"
                step="any" min="0" style={inputStyle}
              />
            </div>
          )}
          <button type="submit" disabled={loadingOpen} style={{...buttonStyle, width:'auto'}}>
            {loadingOpen ? 'Abriendo...' : 'Confirmar Apertura de Caja'}
          </button>
        </form>
      </section>
    );
  };

  const renderCloseCashForm = () => {
    if (!todayRecord || !storeConfig || !todayRecord.date) return <p style={{textAlign:'center'}}>Cargando datos del cuadre...</p>;
    const displayRecordDateObj = parseLocalDateFromString(todayRecord.date);
    const displayRecordDateStr = displayRecordDateObj ? displayRecordDateObj.toLocaleDateString() : "Fecha inválida";
    const openingDateStr = parseLocalDateFromString(todayRecord.date)?.toLocaleDateString() || "Fecha inválida";

    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Cerrar Caja - {displayRecordDateStr}</h2>
        <div style={infoBoxStyle}>
            <p>Caja abierta por: <strong>{todayRecord.opened_by_username}</strong></p>
            <p>Base Inicial Reportada: <strong>{parseFloat(todayRecord.initial_balance).toFixed(2)}</strong></p>
            <p>Fecha Apertura: <strong>{openingDateStr}</strong></p>
            <p>Estado: <strong style={{color: 'green'}}>ABIERTA</strong></p>
        </div>
        <div style={{marginBottom: '25px'}}>
            <h3 style={h3Style}>Resumen de Ventas del Día</h3>
            {loadingSales && <p>Cargando ventas...</p>}
            <div style={calculationRowStyle}><span>Ventas en Efectivo:</span> <strong>{dailySalesSummary.cash.toFixed(2)}</strong></div>
            <div style={calculationRowStyle}><span>Ventas con Tarjeta:</span> <strong>{dailySalesSummary.card.toFixed(2)}</strong></div>
            <div style={calculationRowStyle}><span>Ventas por Transferencia:</span> <strong>{dailySalesSummary.transfer.toFixed(2)}</strong></div>
            <div style={calculationTotalRowStyle}>
                <span>Total Ingresos del Día:</span> 
                <strong>{dailySalesSummary.total.toFixed(2)}</strong>
            </div>
            {detailedTodaysSales.length > 0 && (
                <button 
                    onClick={() => setShowSalesDetails(!showSalesDetails)} 
                    style={{...buttonStyle, backgroundColor: '#6c757d', color:'white', marginTop:'15px', fontSize:'0.9em', padding:'8px 12px', width:'auto', minWidth: '200px', marginRight:0}}
                >
                    {showSalesDetails ? 'Ocultar Detalle de Ventas' : 'Mostrar Detalle de Ventas'}
                </button>
            )}
            {showSalesDetails && detailedTodaysSales.length > 0 && (
                <div style={{marginTop: '15px', maxHeight:'300px', overflowY:'auto', border:'1px solid #eee', padding:'10px', backgroundColor:'#fff'}}>
                    <h4 style={{marginTop:0, marginBottom:'10px', fontSize:'1.1em', color:'#333'}}>Detalle de Transacciones del Día:</h4>
                    {detailedTodaysSales.map(sale => (
                        <div key={sale.id} style={{marginBottom:'15px', paddingBottom:'10px', borderBottom:'1px dashed #ccc'}}>
                            <p style={{margin:'2px 0', fontSize:'0.95em'}}><strong>Factura:</strong> {sale.invoice_number} - <strong>Cliente:</strong> {sale.customer_name} ({sale.customer_document || 'N/A'})</p>
                            <p style={{margin:'2px 0', fontSize:'0.95em'}}><strong>Total Factura:</strong> {sale.total_amount.toFixed(2)} - <strong>Método:</strong> {sale.payment_method}</p>
                            <table style={itemsSubTableStyle}>
                                <thead><tr>
                                    <th style={itemsSubThStyle}>Item</th><th style={{...itemsSubThStyle, textAlign:'right'}}>Cant.</th>
                                    <th style={{...itemsSubThStyle, textAlign:'right'}}>P.Unit</th><th style={{...itemsSubThStyle, textAlign:'right'}}>P.Total</th>
                                </tr></thead>
                                <tbody>
                                    {(sale.items || []).map((item, index) => (
                                        <tr key={index}><td style={itemsSubTdStyle}>{item.description}</td>
                                            <td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.quantity}</td>
                                            <td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.unit_price.toFixed(2)}</td>
                                            <td style={{...itemsSubTdStyle, textAlign:'right'}}>{item.total_item_price.toFixed(2)}</td></tr>
                                    ))}</tbody>
                            </table></div>
                    ))}</div>
            )}
            {!loadingSales && detailedTodaysSales.length === 0 && <p style={{fontStyle:'italic', fontSize:'0.9em', marginTop:'10px'}}>No hay ventas registradas para este cuadre.</p>}
        </div>
        <div style={{marginBottom: '25px'}}>
            <h3 style={h3Style}>Registro de Egresos Diarios</h3>
            <div style={formRowStyle}>
                <div style={formFieldStyle(2, '180px')}>
                    <label htmlFor="expConcept" style={labelStyle}>Concepto:</label>
                    <input type="text" id="expConcept" style={inputStyle} value={currentExpense.concept} onChange={e => setCurrentExpense({...currentExpense, concept: e.target.value})} />
                </div>
                <div style={formFieldStyle(1, '100px')}>
                    <label htmlFor="expValue" style={labelStyle}>Valor:</label>
                    <input type="number" id="expValue" style={inputStyle} value={currentExpense.value} onChange={e => setCurrentExpense({...currentExpense, value: e.target.value})} step="any" min="0" />
                </div>
                <div style={formFieldStyle(1, '130px')}>
                    <label htmlFor="expRecipient" style={labelStyle}>ID Receptor (Opcional):</label>
                    <input type="text" id="expRecipient" style={inputStyle} value={currentExpense.recipient_id} onChange={e => setCurrentExpense({...currentExpense, recipient_id: e.target.value})} />
                </div>
                 <div style={formFieldStyle(1, '130px')}>
                    <label htmlFor="expDate" style={labelStyle}>Fecha Egreso:</label>
                    <input type="date" id="expDate" style={inputStyle} value={currentExpense.expense_date} onChange={e => setCurrentExpense({...currentExpense, expense_date: e.target.value})} />
                </div>
                <div style={formFieldStyle(1, '150px')}>
                    <label htmlFor="expPaymentMethod" style={labelStyle}>Método Pago Egreso:</label>
                    <select id="expPaymentMethod" style={inputStyle} value={currentExpense.payment_method_expense} 
                        onChange={e => setCurrentExpense({...currentExpense, payment_method_expense: e.target.value})}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Cuenta Bancaria">Cuenta Bancaria</option>
                        <option value="Tarjeta Empresarial">Tarjeta Empresarial</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div style={{...formFieldStyle(0.5, 'auto'), alignSelf: 'flex-end'}}>
                  <button onClick={handleAddExpense} type="button" style={{...buttonStyle, backgroundColor:'#5cb85c', padding:'10px 15px', width:'100%', minWidth:'130px', marginRight:0}}>Añadir Egreso</button>
                </div>
            </div>
            {expenses.length > 0 && (
                <ul style={{listStyle:'none', padding:0, marginTop:'15px'}}>
                    {expenses.map(exp => (
                        <li key={exp.id_temporal} style={expenseItemStyle}>
                            <div style={expenseItemDetailsStyle}>
                                {(parseLocalDateFromString(exp.expense_date)?.toLocaleDateString() || exp.expense_date)}: {exp.concept} 
                                ({exp.recipient_id || 'N/A'}) - <strong>{parseFloat(exp.value).toFixed(2)}</strong>
                                <em style={{fontSize:'0.85em', marginLeft:'10px', color:'#555'}}>(Pagado con: {exp.payment_method_expense})</em>
                            </div>
                            <button onClick={() => handleRemoveExpense(exp.id_temporal)} style={{...buttonStyle, backgroundColor:'#d9534f', fontSize:'0.8em', padding:'4px 8px', flexShr:0, minWidth:'auto', marginRight:0}}>Quitar</button>
                        </li>
                    ))}
                </ul>
            )}
            <div style={calculationTotalRowStyle}>
                <span>Total Egresos Registrados (Todos):</span> 
                <strong>{calculatedTotals.totalExpenses.toFixed(2)}</strong>
            </div>
        </div>
        <div style={{marginBottom: '25px'}}>
            <h3 style={h3Style}>Cierre de Caja</h3>
            <div style={{marginBottom:'15px'}}>
                <label htmlFor="countedCash" style={labelStyle}>Efectivo Físico Contado en Caja: *</label>
                <input type="number" id="countedCash" value={countedCash} onChange={e => setCountedCash(e.target.value)} style={inputStyle} step="any" min="0" required/>
            </div>
            <div>
                <label htmlFor="notes" style={labelStyle}>Notas Adicionales (Opcional):</label>
                <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" style={{...inputStyle, minHeight:'60px'}}></textarea>
            </div>
        </div>
        <div style={{marginBottom: '30px', padding:'20px', border:'1px dashed #007bff', borderRadius:'8px', backgroundColor:'#fff'}}>
            <h3 style={{...h2Style, fontSize:'1.3em', color:'#007bff', borderBottom:'none', paddingBottom:0}}>Cálculos del Cuadre</h3>
            <div style={calculationRowStyle}><span>(+) Base Inicial de Caja:</span> <span>{parseFloat(todayRecord.initial_balance).toFixed(2)}</span></div>
            <div style={calculationRowStyle}><span>(+) Ventas en Efectivo del Día:</span> <span>{dailySalesSummary.cash.toFixed(2)}</span></div>
            <div style={calculationRowStyle}><span>(-) Egresos en Efectivo del Día:</span> <span>- {calculatedTotals.totalCashExpenses.toFixed(2)}</span></div>
            <div style={calculationTotalRowStyle}><span>(=) Efectivo Esperado en Caja:</span><span>{calculatedTotals.expectedCash.toFixed(2)}</span></div>
            <div style={calculationRowStyle}><span>(&nbsp;&nbsp;&nbsp;) Efectivo Físico Contado:</span> <span>{parseFloat(countedCash || 0).toFixed(2)}</span></div>
            <div style={{...calculationTotalRowStyle, color: calculatedTotals.difference === 0 ? 'green' : (isNaN(calculatedTotals.difference) ? '#333' : 'red')}}>
                <span>(=) Diferencia:</span> 
                <span>
                    {isNaN(calculatedTotals.difference) ? '0.00' : calculatedTotals.difference.toFixed(2)}
                    {!isNaN(calculatedTotals.difference) && (calculatedTotals.difference > 0 ? ' (Sobrante)' : calculatedTotals.difference < 0 ? ' (Faltante)' : (countedCash !== '' ? ' (Cuadre Exacto)' : ''))}
                </span>
            </div>
            <hr style={{margin: '20px 0'}}/>
            <div style={calculationRowStyle}><span>Utilidad Bruta del Día (Ingresos Totales - Egresos Totales):</span> <strong>{calculatedTotals.profit.toFixed(2)}</strong></div>
            <div style={calculationTotalRowStyle}><span>Dinero a Consignar (Ventas Efectivo - Egresos Efectivo):</span> <strong>{calculatedTotals.cashToConsign.toFixed(2)}</strong></div>
        </div>
        <button onClick={handleCloseCashBalance} disabled={loadingClose || loadingSales} style={{...buttonStyle, backgroundColor:'#28a745', width:'100%', padding:'15px', fontSize:'1.1em', marginRight:0}}>
            {loadingClose ? 'Cerrando Caja...' : (loadingSales ? 'Calculando ventas...' : 'Confirmar y Cerrar Caja')}
        </button>
      </section>
    );
  };

  const renderClosedCashSummary = () => { 
    if (!todayRecord || !todayRecord.date) return null;
    const closedRecordDateObj = parseLocalDateFromString(todayRecord.date);
    const closedRecordDateStr = closedRecordDateObj ? closedRecordDateObj.toLocaleDateString() : "Fecha inválida";
    let isToday = false;
    const clientToday = new Date(); // Fecha y hora actual del cliente
    clientToday.setHours(0, 0, 0, 0); // Normalizar al inicio del día (medianoche local)

    if (closedRecordDateObj) { // Asegurarse que closedRecordDateObj no sea null
        // closedRecordDateObj ya está normalizado a medianoche local por parseLocalDateFromString
        isToday = clientToday.getTime() === closedRecordDateObj.getTime();
    }

     
   
    console.log("--- Debug renderClosedCashSummary ---");
    console.log("Fecha Actual (Cliente String):", new Date().toISOString().split('T')[0]);
    console.log("Fecha del Registro (todayRecord.date String):", todayRecord.date);
    console.log("¿Es Hoy (isToday)?", isToday);
    console.log("Usuario Actual (currentUser):", currentUser);
    console.log("¿Puede Reabrir (canReopenCashBalance)?", canReopenCashBalance);
    console.log("Estado del Registro (todayRecord.status):", todayRecord.status);
    console.log("------------------------------------");
    

    return (
      <div className="cash-summary-printable"> 
        <section style={{...sectionStyle, border:0, boxShadow:'none', padding:0}}>
          <h2 style={{...h2Style, textAlign:'center'}}>Cuadre de Caja del {closedRecordDateStr} - CERRADO</h2>
          <div style={{...infoBoxStyle, border:'1px solid #ddd', backgroundColor:'#f9f9f9'}} className="info-box-print">
              <p>Caja abierta por: <strong>{todayRecord.opened_by_username}</strong></p>
              <p>Base Inicial: <strong>{parseFloat(todayRecord.initial_balance).toFixed(2)}</strong></p>
              <p>Cerrada por: <strong>{todayRecord.closed_by_username || 'N/A'}</strong> el {todayRecord.closing_time ? new Date(todayRecord.closing_time).toLocaleString() : 'N/A'}</p>
              <p>Estado: <strong style={{color: 'red'}}>CERRADA</strong></p>
          </div>
          <h3 style={h3Style}>Resumen del Cierre:</h3>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Total Ingresos Calculados:</span> <strong>{todayRecord.total_income_calculated?.toFixed(2) ?? 'N/A'}</strong></div>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas en Efectivo:</span> <strong>{todayRecord.cash_sales?.toFixed(2) ?? 'N/A'}</strong></div>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas con Tarjeta:</span> <strong>{todayRecord.card_sales?.toFixed(2) ?? 'N/A'}</strong></div>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Ventas por Transferencia:</span> <strong>{todayRecord.transfer_sales?.toFixed(2) ?? 'N/A'}</strong></div>
          <hr style={{margin:'15px 0'}}/>
          <h4 style={{color:'#333', fontSize:'1.1em', marginTop:'15px', marginBottom:'5px'}}>Egresos Registrados:</h4>
          {todayRecord.expenses_details && todayRecord.expenses_details.length > 0 ? (
              <ul style={{listStyle:'none', paddingLeft: '0px', fontSize:'0.9em'}}>
                  {todayRecord.expenses_details.map((exp, idx) => (
                      <li key={idx} style={{padding:'4px 0', borderBottom:'1px dotted #eee'}}>
                          {(exp.expense_date ? (parseLocalDateFromString(exp.expense_date)?.toLocaleDateString() || exp.expense_date) : 'N/A')}: {exp.concept} 
                          ({exp.recipient_id || 'N/A'}) - <strong>{parseFloat(exp.value).toFixed(2)}</strong>
                          {exp.payment_method_expense && <em style={{fontSize:'0.9em', marginLeft:'10px', color:'#555'}}>(Pagado con: {exp.payment_method_expense})</em>}
                      </li>
                  ))}
              </ul>
          ) : <p><em>No se registraron egresos.</em></p>}
          <div style={calculationTotalRowStyle} className="calculation-row-print"><span>Total Egresos Registrados:</span> <strong>{todayRecord.total_expenses_recorded?.toFixed(2) ?? 'N/A'}</strong></div>
          <hr style={{margin:'15px 0'}}/>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Utilidad del Día (Ingresos - Egresos):</span> <strong>{todayRecord.profit_of_the_day?.toFixed(2) ?? 'N/A'}</strong></div>
          <hr style={{margin:'15px 0'}}/>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Efectivo Esperado en Caja:</span> <strong>{todayRecord.expected_cash_in_box?.toFixed(2) ?? 'N/A'}</strong></div>
          <div style={calculationRowStyle} className="calculation-row-print"><span>Efectivo Físico Contado:</span> <strong>{todayRecord.counted_cash_physical?.toFixed(2) ?? 'N/A'}</strong></div>
          <div style={{...calculationTotalRowStyle, color: todayRecord.difference === 0 ? 'green' : (todayRecord.difference == null ? '#333' : 'red')}} className="calculation-row-print">
              <span>Diferencia:</span> 
              <strong>
                  {todayRecord.difference?.toFixed(2) ?? 'N/A'} 
                  {todayRecord.difference != null && (todayRecord.difference > 0 ? ' (Sobrante)' : todayRecord.difference < 0 ? ' (Faltante)' : ' (Cuadre Exacto)')}
              </strong>
          </div>
          <hr style={{margin:'15px 0'}}/>
          <div style={calculationTotalRowStyle} className="calculation-row-print"><span>Dinero a Consignar (Efectivo):</span> <strong>{todayRecord.cash_to_consign?.toFixed(2) ?? 'N/A'}</strong></div>
          {todayRecord.notes && <p style={{marginTop:'15px'}}><strong>Notas del Cierre:</strong> <em>{todayRecord.notes}</em></p>}

          <div style={{marginTop: '25px', textAlign:'center'}} className="no-print">
              <button 
                  onClick={handlePrintCashSummary} 
                  style={{...buttonStyle, backgroundColor: '#007bff', color:'white', width:'auto', marginRight: '10px'}}
              >
                  Imprimir Resumen
              </button>
              {isToday && canReopenCashBalance && todayRecord.status === 'closed' && (
                  <button 
                      onClick={handleReopenCashBalance} 
                      disabled={loadingReopen}
                      style={{...buttonStyle, backgroundColor: '#ffc107', color:'#212529', width:'auto', marginRight:0}}
                  >
                      {loadingReopen ? 'Reabriendo...' : 'Corregir Cierre / Reabrir'}
                  </button>
              )}
          </div>
        </section>
      </div>
    );
  };
  
  if (loading) { return <div style={pageStyle}><p style={{textAlign:'center', fontSize:'1.2em', padding:'30px'}}>Cargando información del cuadre de caja...</p></div>; }

  return (
    <div style={pageStyle}>
      <style>{printCashSummaryStyles}</style> 
      <Link to="/dashboard" className="no-print">
        <button style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginBottom: '20px', marginRight:0 }}>
          ← Volver al Dashboard
        </button>
      </Link>
      <h1 style={{color: '#fffff', textAlign: 'center', marginBottom: '30px'}} className="no-print">Gestión de Cuadre de Caja</h1>

      {error && <p style={errorStyle} className="no-print">{error}</p>}
      {successMessage && <p style={successStyle} className="no-print">{successMessage}</p>}

      <div className="content-to-show">
        {!error && storeConfig && !todayRecord && renderOpenCashForm()}
        {!error && storeConfig && todayRecord && todayRecord.status === 'open' && renderCloseCashForm()}
        {!error && storeConfig && todayRecord && todayRecord.status === 'closed' && renderClosedCashSummary()}
        
        {!loading && !storeConfig && !error && (
          <p style={errorStyle}>No se pudo cargar la configuración de la tienda. Por favor, <button onClick={loadInitialPageData} style={{...buttonStyle, fontSize:'0.9em', padding:'5px 10px', backgroundColor:'#0069d9'}}>reintente</button> o contacte a soporte.</p>
        )}
      </div>
    </div>
  );
}

export default CashBalancePage;