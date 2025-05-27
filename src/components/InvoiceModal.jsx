// src/components/InvoiceModal.jsx
import React from 'react';

// ... (estilos existentes se mantienen)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '8px',
  width: '90%', 
  maxWidth: '700px', 
  maxHeight: '90vh',
  overflowY: 'auto', 
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  color: '#333', 
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '25px', 
  borderBottom: '2px solid #eee',
  paddingBottom: '15px',
};

const sectionTitleStyle = {
  marginTop: '20px',
  marginBottom: '10px',
  fontSize: '1.3em', 
  color: '#007bff',
  borderBottom: '1px solid #ddd',
  paddingBottom: '5px',
};

const detailRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0', 
  borderBottom: '1px solid #f0f0f0',
  fontSize: '1.05em', 
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '15px',
};

const thStyle = {
  borderBottom: '2px solid #007bff',
  padding: '12px 8px', 
  textAlign: 'left',
  backgroundColor: '#f8f9fa',
};

const tdStyle = {
  borderBottom: '1px solid #ddd',
  padding: '10px 8px', 
};

const totalsSectionStyle = {
  marginTop: '25px', 
  paddingTop: '15px',
  borderTop: '2px solid #eee',
  textAlign: 'right',
  fontSize: '1.1em', 
};

const actionButtonsStyle = {
  marginTop: '30px', 
  textAlign: 'center',
};

const buttonStyle = {
  padding: '12px 25px', 
  fontSize: '1em', 
  margin: '0 10px',
  cursor: 'pointer',
  borderRadius: '5px',
  border: 'none',
};

const cancelledStatusStyle = {
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '1.5em',
    border: '2px dashed red',
    padding: '10px',
    marginTop: '15px',
    marginBottom: '15px',
};


const printStyles = `
  @media print {
    html, body {
      width: 100%;
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 10pt; 
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body * {
      visibility: hidden;
    }
    .invoice-modal-printable, .invoice-modal-printable * {
      visibility: visible;
    }
    .invoice-modal-printable {
      position: static !important; 
      padding: 10mm 10mm 5mm 10mm; 
      border: none !important;
      box-shadow: none !important;
      color: #000 !important;
      line-height: 1.3; 
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
      box-sizing: border-box; 
      width: 100%; 
    }
    .invoice-modal-printable .modal-actions-print {
      display: none !important;
    }
    .invoice-modal-printable h1, 
    .invoice-modal-printable h2, 
    .invoice-modal-printable h3 {
      color: #000 !important;
      margin-top: 12px; 
      margin-bottom: 8px;
      page-break-after: avoid; 
    }
    .invoice-modal-printable h1 { font-size: 16pt; } 
    .invoice-modal-printable h2 { font-size: 14pt; } 
    
    .invoice-modal-printable .section-title-style {
      font-size: 11pt; 
      color: #000 !important;
      border-bottom: 1px solid #000 !important;
      margin-top: 12px; 
      margin-bottom: 4px;
    }
    .invoice-modal-printable table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      page-break-inside: auto;
      font-size: 8.5pt; 
    }
    .invoice-modal-printable table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .invoice-modal-printable table th {
      background-color: #f0f0f0 !important; 
      border: 1px solid #555 !important; 
      padding: 4px; 
      text-align: left;
      font-weight: bold;
    }
    .invoice-modal-printable table td {
      border: 1px solid #555 !important; 
      padding: 3px 4px; 
      vertical-align: top;
    }
    .invoice-modal-printable .detail-row-print strong {
      font-weight: bold;
    }
    .invoice-modal-printable .totals-section-style {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px double #000 !important;
      font-size: 10pt; 
    }
    .invoice-modal-printable .totals-section-style .detail-row-print {
      padding: 3px 0; 
      border-bottom: 1px dotted #888;
    }
     .invoice-modal-printable .totals-section-style .detail-row-print:last-of-type {
      border-bottom: none;
    }
    .invoice-modal-printable .invoice-footer-message,
    .invoice-modal-printable .attended-by-message {
      text-align: center;
      margin-top: 8px; 
      font-size: 7.5pt; 
      page-break-inside: avoid; 
      clear: both; 
    }
     .invoice-modal-printable .invoice-footer-message {
        margin-top: 15px; 
     }
     /* Estilo para información de cancelación en impresión */
    .invoice-modal-printable .cancellation-details-print {
        margin-top: 15px;
        padding: 10px;
        border: 1px dashed #888;
        font-size: 9pt;
        page-break-before: auto; /* Puede ir a nueva página si es necesario */
    }
    .invoice-modal-printable .cancellation-details-print p {
        margin: 3px 0;
    }
  }
`;

// MODIFICADO: Se añade `isViewingMode` como prop
function InvoiceModal({ saleData, onClose, storeConfig, isViewingMode = false }) {
  if (!saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{printStyles}</style>
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle} className="invoice-modal-printable">
          <div style={headerStyle}>
            <h1>{storeConfig?.store_name || 'Recibo de Venta'}</h1>
            {storeConfig?.address && <p>{storeConfig.address}</p>}
            {storeConfig?.contact_number && <p>Tel: {storeConfig.contact_number}</p>}
            <h2>Factura N°: {saleData.invoice_number}</h2>
          </div>

          {/* Mostrar estado si está cancelada */}
          {saleData.status === 'cancelled' && (
            <div style={cancelledStatusStyle}>FACTURA CANCELADA</div>
          )}

          <div style={sectionTitleStyle} className="section-title-style">Cliente</div>
          {/* ... (resto de detalles del cliente) ... */}
          <div style={detailRowStyle} className="detail-row-print">
            <span>Nombre:</span> <strong>{saleData.customer_name}</strong>
          </div>
          <div style={detailRowStyle} className="detail-row-print">
            <span>Documento:</span> <strong>{saleData.customer_document}</strong>
          </div>
          <div style={detailRowStyle} className="detail-row-print">
            <span>Fecha:</span> <strong>{new Date(saleData.date).toLocaleString()}</strong>
          </div>


          <div style={sectionTitleStyle} className="section-title-style">Ítems</div>
          {/* ... (tabla de ítems) ... */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Cant.</th>
                <th style={thStyle}>Vlr. Unit.</th>
                <th style={thStyle}>Vlr. Total</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items.map((item, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{item.quantity}</td>
                  <td style={tdStyle}>{item.unit_price.toFixed(2)}</td>
                  <td style={tdStyle}>{item.total_item_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={totalsSectionStyle} className="totals-section-style">
            {/* ... (subtotal, descuento, IVA, TOTAL) ... */}
            <div style={detailRowStyle} className="detail-row-print"><span>Subtotal:</span> <strong>{saleData.subtotal.toFixed(2)}</strong></div>
            <div style={detailRowStyle} className="detail-row-print"><span>Descuento:</span> <strong>- {saleData.discount_value.toFixed(2)}</strong></div>
            {saleData.iva_applied && (
              <div style={detailRowStyle} className="detail-row-print">
                <span>IVA ({saleData.iva_percentage_used?.toFixed(1) || storeConfig?.iva_percentage.toFixed(1)}%):</span>
                <strong>+ {(saleData.total_amount - (saleData.subtotal - saleData.discount_value)).toFixed(2)}</strong>
              </div>
            )}
            <div style={{...detailRowStyle, fontSize: '1.3em', marginTop: '10px', borderTop: '1px solid #333', paddingTop: '5px'}} className="detail-row-print">
              <span><strong>TOTAL:</strong></span> <strong>{saleData.total_amount.toFixed(2)}</strong>
            </div>
             <div style={{...detailRowStyle, marginTop: '10px'}} className="detail-row-print">
                <span>Método de Pago:</span> <strong>{saleData.payment_method}</strong>
            </div>
          </div>

          {/* Mostrar detalles de cancelación si existen */}
          {saleData.status === 'cancelled' && saleData.cancellation_date && (
            <div className="cancellation-details-print" style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ color: 'red', fontSize: '1.1em' }}>Detalles de Cancelación:</h3>
              <p><strong>Fecha de Cancelación:</strong> {new Date(saleData.cancellation_date).toLocaleString()}</p>
              <p><strong>Motivo:</strong> {saleData.cancellation_reason}</p>
              <p><strong>Cancelada por:</strong> {saleData.cancelled_by_user_id}</p> {/* Podrías buscar el username si lo tienes */}
            </div>
          )}

          {/* ... (pie de página y "Atendido por") ... */}
           {storeConfig?.invoice_footer && (
            <p className="invoice-footer-message" style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em', fontStyle: 'italic' }}>
              {storeConfig.invoice_footer}
            </p>
          )}
           <p className="attended-by-message" style={{ textAlign: 'center', marginTop: '5px', fontSize: '0.8em' }}>
            Atendido por: {saleData.created_by_username}
          </p>


          <div style={actionButtonsStyle} className="modal-actions-print">
            {/* El botón de imprimir siempre está disponible */}
            <button onClick={handlePrint} style={{...buttonStyle, backgroundColor: '#007bff', color: 'white'}}>
              Imprimir
            </button>
            {/* Cambiar texto del botón de cerrar según el contexto */}
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