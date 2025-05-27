// src/components/InvoiceModal.jsx
import React from 'react';

// Estilos para la vista en pantalla (sin cambios)
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


// CSS para impresión (AJUSTADO PARA MEJORAR ENCAJE DE CONTENIDO LARGO)
const printStyles = `
  @media print {
    html, body { /* Aplicar a html y body para reseteo de impresión */
      width: 100%;
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      /* Tamaño de fuente base ligeramente más pequeño para impresión */
      font-size: 10pt; /* Reducido de 12pt para ayudar a encajar más contenido */
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
      position: static !important; /* Flujo de documento normal */
      padding: 10mm 10mm 5mm 10mm; /* Margen inferior reducido un poco */
      border: none !important;
      box-shadow: none !important;
      color: #000 !important;
      line-height: 1.3; /* Línea de altura para fuentes más pequeñas */
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
      page-break-after: avoid; /* Intentar mantener títulos con su contenido */
    }
    .invoice-modal-printable h1 { font-size: 16pt; } /* Ligeramente reducido */
    .invoice-modal-printable h2 { font-size: 14pt; } /* Ligeramente reducido */
    
    .invoice-modal-printable .section-title-style {
      font-size: 11pt; /* Reducido */
      color: #000 !important;
      border-bottom: 1px solid #000 !important;
      margin-top: 12px; /* Ajuste de margen */
      margin-bottom: 4px;
    }
    .invoice-modal-printable table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      page-break-inside: auto;
      font-size: 8.5pt; /* Reducido para celdas de tabla */
    }
    .invoice-modal-printable table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .invoice-modal-printable table th {
      background-color: #f0f0f0 !important; 
      border: 1px solid #555 !important; /* Borde más definido */
      padding: 4px; /* Padding reducido */
      text-align: left;
      font-weight: bold;
    }
    .invoice-modal-printable table td {
      border: 1px solid #555 !important; /* Borde más definido */
      padding: 3px 4px; /* Padding reducido */
      vertical-align: top;
    }
    .invoice-modal-printable .detail-row-print strong {
      font-weight: bold;
    }
    .invoice-modal-printable .totals-section-style {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px double #000 !important;
      font-size: 10pt; /* Consistente con base */
    }
    .invoice-modal-printable .totals-section-style .detail-row-print {
      padding: 3px 0; /* Padding reducido */
      border-bottom: 1px dotted #888;
    }
     .invoice-modal-printable .totals-section-style .detail-row-print:last-of-type {
      border-bottom: none;
    }

    /* Estilos específicos para los mensajes del pie de página */
    .invoice-modal-printable .invoice-footer-message,
    .invoice-modal-printable .attended-by-message {
      text-align: center;
      margin-top: 8px; /* Margen reducido */
      font-size: 7.5pt; /* Fuente más pequeña para estos mensajes */
      page-break-inside: avoid; /* Intentar mantenerlos juntos */
      clear: both; /* Asegurar que no floten alrededor de otros elementos */
    }
     .invoice-modal-printable .invoice-footer-message {
        margin-top: 15px; /* Un poco más de espacio antes del "Gracias" */
     }
  }
`;

function InvoiceModal({ saleData, onClose, storeConfig }) {
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

          <div style={sectionTitleStyle} className="section-title-style">Cliente</div>
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
            <div style={detailRowStyle} className="detail-row-print"><span>Subtotal:</span> <strong>{saleData.subtotal.toFixed(2)}</strong></div>
            <div style={detailRowStyle} className="detail-row-print"><span>Descuento:</span> <strong>- {saleData.discount_value.toFixed(2)}</strong></div>
            {saleData.iva_applied && (
              <div style={detailRowStyle} className="detail-row-print">
                <span>IVA ({saleData.iva_percentage_used?.toFixed(1) || storeConfig?.iva_percentage.toFixed(1)}%):</span>
                <strong>+ {(saleData.total_amount - (saleData.subtotal - saleData.discount_value)).toFixed(2)}</strong>
              </div>
            )}
            <div style={{...detailRowStyle, fontSize: '1.2em', marginTop: '8px', borderTop: '1px solid #333', paddingTop: '5px'}} className="detail-row-print"> {/* Ajuste visual para TOTAL */}
              <span><strong>TOTAL:</strong></span> <strong>{saleData.total_amount.toFixed(2)}</strong>
            </div>
             <div style={{...detailRowStyle, marginTop: '8px'}} className="detail-row-print">
                <span>Método de Pago:</span> <strong>{saleData.payment_method}</strong>
            </div>
          </div>

          {/* Añadir clases a los párrafos del pie de página */}
          {storeConfig?.invoice_footer && (
            <p className="invoice-footer-message" style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em', fontStyle: 'italic' }}>
              {storeConfig.invoice_footer}
            </p>
          )}
           <p className="attended-by-message" style={{ textAlign: 'center', marginTop: '5px', fontSize: '0.8em' }}>
            Atendido por: {saleData.created_by_username}
          </p>

          <div style={actionButtonsStyle} className="modal-actions-print">
            <button onClick={handlePrint} style={{...buttonStyle, backgroundColor: '#007bff', color: 'white'}}>
              Imprimir
            </button>
            <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}}>
              Cerrar / Nueva Venta
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default InvoiceModal;