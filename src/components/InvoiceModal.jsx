// src/components/InvoiceModal.jsx
import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

// Asegúrate que la ruta al logo sea correcta desde src/components/
// Este es el logo que SIEMPRE se usará en la factura.
import companyLogo from '../assets/logo.jpeg'; 

// --- Estilos ---
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: '20px', boxSizing: 'border-box',
};
const modalContentStyle = {
  backgroundColor: '#fff', padding: '30px', borderRadius: '8px',
  width: '90%', maxWidth: '700px', maxHeight: 'calc(100vh - 40px)',
  overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  color: '#333', position: 'relative',
};
const invoiceLogoScreenStyle = {
  display: 'block', margin: '0 auto 15px auto', 
  maxWidth: '130px', maxHeight: '70px', height: 'auto',     
};
const headerStyle = {
  textAlign: 'center', marginBottom: '25px',
  borderBottom: '2px solid #eee', paddingBottom: '15px',
};
const sectionTitleStyle = {
  marginTop: '20px', marginBottom: '10px', fontSize: '1.3em',
  color: '#007bff', borderBottom: '1px solid #ddd', paddingBottom: '5px',
};
const detailRowStyle = {
  display: 'flex', justifyContent: 'space-between',
  padding: '8px 0', borderBottom: '1px solid #f0f0f0',
  fontSize: '1.05em',
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '15px'};
const thStyle = {
  borderBottom: '2px solid #007bff', padding: '12px 8px',
  textAlign: 'left', backgroundColor: '#f8f9fa',
};
const tdStyle = { borderBottom: '1px solid #ddd', padding: '10px 8px' };
const totalsSectionStyle = {
  marginTop: '25px', paddingTop: '15px', borderTop: '2px solid #eee',
  textAlign: 'right', fontSize: '1.1em',
};
const actionButtonsStyle = { marginTop: '30px', textAlign: 'center' };
const buttonStyle = {
  padding: '12px 25px', fontSize: '1em', margin: '0 10px',
  cursor: 'pointer', borderRadius: '5px', border: 'none',
};
const cancelledStatusStyle = {
    color: 'red', fontWeight: 'bold', textAlign: 'center', fontSize: '1.5em',
    border: '2px dashed red', padding: '10px', marginTop: '15px', marginBottom: '15px',
};

// Estilos de Impresión
const printStyles = `
  @media print {
    @page { margin: 10mm; size: auto; }
    html, body {
      width: 100% !important; height: auto !important; overflow: visible !important;
      background: #fff !important; margin: 0 !important; padding: 0 !important; 
      font-size: 10pt; 
    }
    .invoice-modal-printable-container {
        visibility: visible !important; position: absolute; left: 0; top: 0; 
        width: 100%; height: 100%; margin:0; padding:0;
    }
    .invoice-modal-printable, .invoice-modal-printable * {
      visibility: visible !important; -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .invoice-modal-printable {
      position: static !important; margin: 0 auto !important; padding: 0mm !important; 
      border: none !important; box-shadow: none !important; color: #000 !important;
      line-height: 1.3; width: 100% !important; height: auto !important;
      min-height: 0 !important; max-height: none !important; overflow: visible !important; 
      box-sizing: border-box !important; page-break-before: auto; page-break-after: auto;
      font-family: Arial, Helvetica, sans-serif; 
    }
    .invoice-modal-printable .invoice-logo-print-class { /* Estilo para el logo en impresión */
      display: block !important;
      margin: 0 auto 8mm auto !important; 
      max-width: 35mm !important;  
      max-height: 20mm !important; 
      page-break-after: avoid !important;
    }
    .invoice-modal-printable .invoice-header-print {
        text-align: center !important; margin-bottom: 6mm !important;
        border-bottom: 1px solid #000 !important; padding-bottom: 4mm !important;
    }
    .invoice-modal-printable .invoice-header-print h1 { font-size: 14pt !important; margin-bottom: 2mm !important; }
    .invoice-modal-printable .invoice-header-print p { font-size: 9pt !important; margin: 1mm 0 !important; }
    .invoice-modal-printable .invoice-header-print h2 { font-size: 12pt !important; margin-top: 3mm !important; }
    .invoice-modal-printable .modal-actions-print { display: none !important; }
    .invoice-modal-printable .section-title-style {
      font-size: 11pt !important; color: #000 !important; border-bottom: 1px solid #333 !important; 
      padding-bottom: 2mm !important; margin-top: 5mm !important; margin-bottom: 3mm !important;
      page-break-after: avoid !important;
    }
    .invoice-modal-printable table {
      width: 100%; border-collapse: collapse; margin-top: 3mm;
      page-break-inside: auto; font-size: 8.5pt;
    }
    .invoice-modal-printable table tr { page-break-inside: avoid !important; page-break-after: auto; }
    .invoice-modal-printable table th {
      background-color: #e0e0e0 !important; border: 1px solid #333 !important;
      padding: 2mm 1.5mm !important; text-align: left; font-weight: bold;
    }
    .invoice-modal-printable table td {
      border: 1px solid #555 !important; padding: 1.5mm !important; vertical-align: top;
    }
    .invoice-modal-printable .detail-row-print {
        display: flex; justify-content: space-between; padding: 1.5mm 0 !important;
        border-bottom: 1px dotted #777 !important; font-size: 9pt !important;
    }
    .invoice-modal-printable .detail-row-print strong { font-weight: bold; }
    .invoice-modal-printable .totals-section-style {
      margin-top: 5mm !important; padding-top: 3mm !important; 
      border-top: 1.5px solid #000 !important; font-size: 9.5pt !important; 
      page-break-before: auto; 
    }
    .invoice-modal-printable .totals-section-style .detail-row-print {
      padding: 1.5mm 0 !important; border-bottom: 1px dotted #aaa !important;
    }
    .invoice-modal-printable .totals-section-style .detail-row-print:last-of-type { border-bottom: none !important; }
    .invoice-modal-printable .totals-section-style strong { font-weight: bold; }
    .invoice-modal-printable .totals-section-style > div:nth-last-child(2) { /* Total General */
        font-size: 11pt !important; border-top: 1px solid #333 !important; 
        padding-top: 2mm !important; margin-top:1mm !important;
    }
    .invoice-modal-printable .invoice-footer-message, 
    .invoice-modal-printable .attended-by-message {
      text-align: center !important; margin-top: 4mm !important; font-size: 7.5pt !important;
      page-break-inside: avoid !important; clear: both;
    }
    .invoice-modal-printable .invoice-footer-message { margin-top: 6mm !important; }
    .invoice-modal-printable .cancellation-details-print {
      margin-top: 6mm !important; padding: 3mm !important; border: 1px dashed #555 !important;
      font-size: 8.5pt !important; page-break-before: auto; 
    }
    .invoice-modal-printable .cancellation-details-print p { margin: 1mm 0 !important; }
    .invoice-modal-printable .cancelled-status-print {
        color: #D32F2F !important; font-weight: bold !important; text-align: center !important;
        font-size: 14pt !important; border: 2px dashed #D32F2F !important;
        padding: 3mm !important; margin-top: 4mm !important; margin-bottom: 4mm !important;
        page-break-after: avoid !important;
    }
  }
`;

function InvoiceModal({ saleData, onClose, storeConfig, isViewingMode = false }) {
  if (!saleData) {
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <p>Error: No hay datos de factura para mostrar.</p>
                <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white', marginTop:'20px'}}>
                    Cerrar
                </button>
            </div>
        </div>
    );
  }

  const [cancellerFullName, setCancellerFullName] = useState('');
  const [loadingCancellerName, setLoadingCancellerName] = useState(false);

  useEffect(() => {
    // Asegurarse que saleData exista antes de acceder a sus propiedades
    if (saleData && saleData.status === 'cancelled' && saleData.cancelled_by_user_id) {
      const fetchCancellerName = async () => {
        setLoadingCancellerName(true);
        setCancellerFullName(''); 
        try {
          const user = await authService.getUserDetailsById(saleData.cancelled_by_user_id);
          if (user && user.full_name) {
            setCancellerFullName(user.full_name);
          } else {
            setCancellerFullName(`ID: ${saleData.cancelled_by_user_id}`);
          }
        } catch (error) {
          console.error("Error fetching canceller name:", error);
          setCancellerFullName(`ID: ${saleData.cancelled_by_user_id} (Error al cargar nombre)`);
        } finally {
          setLoadingCancellerName(false);
        }
      };
      fetchCancellerName();
    } else {
      setCancellerFullName(''); 
    }
  }, [saleData?.status, saleData?.cancelled_by_user_id]); // Dependencias con optional chaining por si saleData cambia a null

  const handlePrint = () => {
    const printableElement = document.querySelector('.invoice-modal-printable');
    if (!printableElement) {
      alert('Error: No se encontró el contenido para imprimir.');
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; 
    iframe.style.height = '0'; iframe.style.border = '0';
    iframe.style.visibility = 'hidden'; iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>Factura</title>');
    doc.write(`<style type="text/css">${printStyles}</style>`);
    doc.write('</head><body class="invoice-modal-printable-container"></body></html>');
    doc.close();
    
    const clonedPrintableElement = printableElement.cloneNode(true);
    doc.body.appendChild(clonedPrintableElement);
    
    iframe.contentWindow.focus(); 
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Error al imprimir desde el iframe:', e);
        alert('Ocurrió un error al intentar imprimir. Por favor, intente de nuevo.');
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000); 
      }
    }, 750); 
  };

  const formatNumber = (num, decimals = 2) => (typeof num === 'number' ? num.toFixed(decimals) : Number(0).toFixed(decimals));
  const formatPercentage = (num) => (typeof num === 'number' ? num.toFixed(1) : 'N/A');
  
  const calculatedIvaAmount = (
        typeof saleData.total_amount === 'number' && 
        typeof saleData.subtotal === 'number' && 
        typeof saleData.discount_value === 'number'
    ) ? saleData.total_amount - (saleData.subtotal - saleData.discount_value) : 0;

  return (
    <>
      <style>{printStyles}</style> 
      
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle} className="invoice-modal-printable">
          
          {/* SECCIÓN DEL LOGO CORREGIDA */}
          {/* Siempre se usa el logo local importado para la factura. */}
          {/* El alt puede usar el nombre de la tienda de la configuración si está disponible. */}
          {companyLogo && (
            <img 
              src={companyLogo} 
              alt={storeConfig?.store_name || "Logo Empresa"} 
              style={invoiceLogoScreenStyle} 
              className="invoice-logo-print-class" 
            />
          )}
          
          <div style={headerStyle} className="invoice-header-print">
            <h1>{storeConfig?.store_name || 'Recibo de Venta'}</h1>
            {storeConfig?.address && <p>{storeConfig.address}</p>}
            {storeConfig?.contact_number && <p>Tel: {storeConfig.contact_number}</p>}
            <h2>Factura N°: {saleData.invoice_number || 'N/A'}</h2>
          </div>

          {saleData.status === 'cancelled' && (
            <div style={cancelledStatusStyle} className="cancelled-status-print">FACTURA CANCELADA</div>
          )}

          <div style={sectionTitleStyle} className="section-title-style">Cliente</div>
          <div style={detailRowStyle} className="detail-row-print">
            <span>Nombre:</span> <strong>{saleData.customer_name || 'N/A'}</strong>
          </div>
          <div style={detailRowStyle} className="detail-row-print">
            <span>Documento:</span> <strong>{saleData.customer_document || 'N/A'}</strong>
          </div>
          <div style={detailRowStyle} className="detail-row-print">
            <span>Fecha:</span> 
            <strong>
                {saleData.date 
                    ? new Date(saleData.date).toLocaleString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                    : 'N/A'}
            </strong>
          </div>

          <div style={sectionTitleStyle} className="section-title-style">Ítems</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Cant.</th>
                <th style={{...thStyle, textAlign:'right'}}>Vlr. Unit.</th>
                <th style={{...thStyle, textAlign:'right'}}>Vlr. Total</th>
              </tr>
            </thead>
            <tbody>
              {(saleData.items || []).map((item, index) => (
                <tr key={item?.id ? `${item.id}-${index}` : `item-${index}-${item?.description?.slice(0,5) || 'temp'}`}>
                  <td style={tdStyle}>{item?.description || 'N/A'}</td>
                  <td style={{...tdStyle, textAlign:'center'}}>{item?.quantity ?? 0}</td>
                  <td style={{...tdStyle, textAlign:'right'}}>${formatNumber(item?.unit_price)}</td>
                  <td style={{...tdStyle, textAlign:'right'}}>${formatNumber(item?.total_item_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={totalsSectionStyle} className="totals-section-style">
            <div style={detailRowStyle} className="detail-row-print">
                <span>Subtotal:</span> <strong>${formatNumber(saleData.subtotal)}</strong>
            </div>
            <div style={detailRowStyle} className="detail-row-print">
                <span>Descuento:</span> <strong>- ${formatNumber(saleData.discount_value)}</strong>
            </div>
            {/* Mostrar IVA solo si fue aplicado Y si el monto es mayor a cero (o ligeramente mayor para evitar problemas de redondeo) */}
            {saleData.iva_applied && calculatedIvaAmount > 0.001 && (
              <div style={detailRowStyle} className="detail-row-print">
                <span>IVA ({formatPercentage(saleData.iva_percentage_used ?? storeConfig?.iva_percentage)}%):</span>
                <strong>+ ${formatNumber(calculatedIvaAmount)}</strong>
              </div>
            )}
            <div style={{...detailRowStyle, fontSize: '1.3em', marginTop: '10px', borderTop: '1px solid #333', paddingTop: '5px'}} className="detail-row-print">
              <span><strong>TOTAL:</strong></span> <strong>${formatNumber(saleData.total_amount)}</strong>
            </div>
              <div style={{...detailRowStyle, marginTop: '10px'}} className="detail-row-print">
                <span>Método de Pago:</span> <strong>{saleData.payment_method || 'N/A'}</strong>
            </div>
          </div>
          
          {saleData.status === 'cancelled' && saleData.cancellation_date && (
            <div className="cancellation-details-print" style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ color: 'red', fontSize: '1.1em' }}>Detalles de Cancelación:</h3>
              <p><strong>Fecha de Cancelación:</strong> 
                {saleData.cancellation_date ? new Date(saleData.cancellation_date).toLocaleString('es-CO') : 'N/A'}
              </p>
              <p><strong>Motivo:</strong> {saleData.cancellation_reason || 'No especificado'}</p>
              <p>
                <strong>Cancelada por: </strong> 
                {loadingCancellerName ? 'Cargando nombre...' : (cancellerFullName || `ID: ${saleData.cancelled_by_user_id || 'Desconocido'}`)}
              </p>
            </div>
          )}

            {(storeConfig?.invoice_footer) && (
            <p className="invoice-footer-message" style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em', fontStyle: 'italic' }}>
              {storeConfig.invoice_footer}
            </p>
          )}
            <p className="attended-by-message" style={{ textAlign: 'center', marginTop: '5px', fontSize: '0.8em' }}>
            Atendido por: {saleData.created_by_username || 'N/A'}
          </p>

          <div style={actionButtonsStyle} className="modal-actions-print">
            <button onClick={handlePrint} style={{...buttonStyle, backgroundColor: '#007bff', color: 'white'}}>
              Imprimir
            </button>
            <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>
              {isViewingMode ? 'Cerrar Vista' : 'Cerrar / Nueva Venta'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default InvoiceModal;