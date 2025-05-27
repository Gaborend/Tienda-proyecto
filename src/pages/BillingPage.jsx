// src/pages/BillingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import customerService from '../services/customerService';
import inventoryService from '../services/inventoryService';
import serviceService from '../services/serviceService';
import billingService from '../services/billingService';
import authService from '../services/authService';
import configService from '../services/configService';
import InvoiceModal from '../components/InvoiceModal'; // <-- Importar el modal

// ... (los estilos permanecen igual)
const pageStyle = { padding: '20px' };
const sectionStyle = { marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' };
const inputGroupStyle = { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end' };
const inputStyle = { padding: '8px', boxSizing: 'border-box', flexGrow: 1 };
const buttonStyle = { padding: '8px 15px', cursor: 'pointer' };
// const itemRowStyle = { display: 'flex', gap: '10px', marginBottom: '5px', alignItems: 'center' }; // No usado directamente aquí
const tableHeaderStyle = { borderBottom: '2px solid #888', padding: '8px', textAlign: 'left' };
const tableCellStyle = { borderBottom: '1px solid #eee', padding: '8px', textAlign: 'left' };
const errorStyle = { color: 'red', marginTop: '5px', fontSize: '0.9em' };
const successStyle = { color: 'green', marginTop: '10px', fontWeight: 'bold' };


function BillingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);

  // Estados para el cliente
  const [searchDocType, setSearchDocType] = useState('CC');
  const [searchDocNumber, setSearchDocNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchError, setCustomerSearchError] = useState('');
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);

  // Estados para buscar y añadir ítems (productos/servicios)
  const [itemSearchType, setItemSearchType] = useState('product');
  const [itemSearchCode, setItemSearchCode] = useState('');
  const [foundItem, setFoundItem] = useState(null);
  const [itemSearchError, setItemSearchError] = useState('');
  const [loadingItemSearch, setLoadingItemSearch] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  // Estados para añadir servicio temporal
  const [tempServiceDesc, setTempServiceDesc] = useState('');
  const [tempServiceValue, setTempServiceValue] = useState('');
  const [tempServiceError, setTempServiceError] = useState('');

  // Estados de la factura actual
  const [currentInvoiceItems, setCurrentInvoiceItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [applyIVA, setApplyIVA] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountAmountApplied, setDiscountAmountApplied] = useState(0);
  const [ivaAmountApplied, setIvaAmountApplied] = useState(0);

  // Estados para finalizar venta y mostrar modal
  const [loadingSale, setLoadingSale] = useState(false);
  const [saleError, setSaleError] = useState('');
  // const [saleSuccess, setSaleSuccess] = useState(''); // Ya no se usa para mensaje de texto
  const [showInvoiceModal, setShowInvoiceModal] = useState(false); // <-- Nuevo estado para el modal
  const [completedSaleData, setCompletedSaleData] = useState(null); // <-- Datos para el modal

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    const fetchConfig = async () => {
        try {
            const config = await configService.getStoreSettings();
            setStoreConfig(config);
            setApplyIVA(config.apply_iva_by_default);
        } catch (error) {
            console.error("Error cargando configuración:", error);
            setSaleError("No se pudo cargar la configuración. El IVA podría no calcularse correctamente.");
        }
    };
    fetchConfig();
  }, []);

  const clearForm = () => {
      setSearchDocType('CC');
      setSearchDocNumber('');
      setSelectedCustomer(null);
      setCustomerSearchError('');
      setItemSearchType('product');
      setItemSearchCode('');
      setFoundItem(null);
      setItemSearchError('');
      setQuantityToAdd(1);
      setTempServiceDesc('');
      setTempServiceValue('');
      setTempServiceError('');
      setCurrentInvoiceItems([]);
      setDiscountPercentage('');
      setDiscountValue('');
      setPaymentMethod('Efectivo');
      setSaleError('');
      // setSaleSuccess(''); // No es necesario aquí ya que el modal maneja la info de éxito
      if (storeConfig) {
          setApplyIVA(storeConfig.apply_iva_by_default);
      } else {
          setApplyIVA(false);
      }
  };

  // ... (handleCustomerSearch, handleItemSearch, handleAddItemToInvoice, handleAddTempService, updateInvoiceItems, handleRemoveItem, handleDiscountPercentageChange, handleDiscountValueChange, useEffect para cálculos se mantienen igual que en la respuesta anterior)
  // --- Búsqueda de Cliente ---
  const handleCustomerSearch = async (e) => {
    e.preventDefault();
    setLoadingCustomerSearch(true); setCustomerSearchError(''); setSelectedCustomer(null);
    try {
      const customerData = await customerService.getCustomerByDocument(searchDocType, searchDocNumber);
      setSelectedCustomer(customerData);
    } catch (error) {
      setCustomerSearchError(error.detail || error.message || 'Cliente no encontrado o error.');
    } finally {
      setLoadingCustomerSearch(false);
    }
  };

  // --- Búsqueda de Ítem (Producto/Servicio Registrado) ---
  const handleItemSearch = async (e) => {
    e.preventDefault();
    if (!itemSearchCode.trim()) { setItemSearchError(`Ingrese un código.`); return; }
    setLoadingItemSearch(true); setItemSearchError(''); setFoundItem(null);
    try {
      let itemData;
      if (itemSearchType === 'product') {
        itemData = await inventoryService.getProductByCode(itemSearchCode);
      } else {
        itemData = await serviceService.getServiceByCode(itemSearchCode);
      }
      if (itemData && itemData.is_active) {
        setFoundItem({...itemData, item_type: itemSearchType });
      } else {
        setItemSearchError(`El ${itemSearchType === "product" ? "producto" : "servicio"} no está activo o no fue encontrado.`);
      }
    } catch (error) {
      setItemSearchError(error.detail || error.message || `Error al buscar.`);
    } finally {
      setLoadingItemSearch(false);
    }
  };

  // --- Añadir Ítem (Producto/Servicio Registrado) ---
  const handleAddItemToInvoice = () => {
    if (!foundItem || quantityToAdd <= 0) { alert('Busque un ítem y especifique cantidad > 0.'); return; }
    if (foundItem.item_type === 'product' && foundItem.quantity < quantityToAdd) { alert(`Stock insuficiente. Disponible: ${foundItem.quantity}`); return; }

    const newItem = {
      id: foundItem.id, item_type: foundItem.item_type, description: foundItem.description,
      quantity: parseInt(quantityToAdd, 10),
      unit_price: foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value,
      total_item_price: (foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value) * parseInt(quantityToAdd, 10),
    };

    updateInvoiceItems(newItem, foundItem.item_type === 'product' ? foundItem.quantity : Infinity);
    setFoundItem(null); setItemSearchCode(''); setQuantityToAdd(1);
  };

  // --- Añadir Servicio Temporal ---
  const handleAddTempService = () => {
    setTempServiceError('');
    const value = parseFloat(tempServiceValue);
    if (!tempServiceDesc.trim() || isNaN(value) || value <= 0) {
        setTempServiceError('Ingrese descripción y un valor válido mayor a cero.');
        return;
    }
    const newItem = {
        // Usamos un ID negativo temporal o un string único para diferenciarlo en la UI antes de enviar al backend
        // El backend esperará ID 0 para servicios temporales si así se definió.
        id: `temp_${Date.now()}`, 
        item_type: 'temporary_service',
        description: tempServiceDesc,
        quantity: 1, 
        unit_price: value,
        total_item_price: value,
    };
    updateInvoiceItems(newItem); 
    setTempServiceDesc(''); setTempServiceValue(''); setTempServiceError('');
  };

  // --- Lógica Común para Añadir/Actualizar Ítems en la Factura ---
  const updateInvoiceItems = (newItem, availableStock = Infinity) => {
    setCurrentInvoiceItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(
            item => item.id === newItem.id && item.item_type === newItem.item_type
        );

        if (existingItemIndex > -1) {
            return prevItems.map((item, index) => {
                if (index === existingItemIndex) {
                    const newQuantity = item.quantity + newItem.quantity;
                    // Para servicios temporales, no hay 'availableStock' como tal,
                    // pero la lógica de cantidad es más para productos/servicios registrados.
                    // Aquí, si es un servicio temporal y el ID es el mismo (lo cual no debería pasar si generamos IDs únicos para temporales),
                    // simplemente se sumaría la cantidad, aunque usualmente los temporales se añaden como líneas separadas si son distintos.
                    // La lógica actual asume que si el ID y tipo son iguales, se agrupa.
                    if (item.item_type !== 'temporary_service' && newQuantity > availableStock) {
                        alert(`Stock insuficiente para ${item.description}. Disponible: ${availableStock}, en factura: ${item.quantity}, intentando añadir: ${newItem.quantity}`);
                        return item;
                    }
                    return { ...item, quantity: newQuantity, total_item_price: item.unit_price * newQuantity };
                }
                return item;
            });
        } else {
            if (newItem.item_type !== 'temporary_service' && newItem.quantity > availableStock) {
                 alert(`Stock insuficiente para ${newItem.description}. Disponible: ${availableStock}`);
                 return prevItems; // No añadir si no hay stock
            }
            return [...prevItems, newItem];
        }
    });
  };

  // --- Quitar Ítem ---
  const handleRemoveItem = (indexToRemove) => {
    setCurrentInvoiceItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  // --- Manejo de Cambios en Descuentos ---
  const handleDiscountPercentageChange = (e) => {
      const value = e.target.value;
      setDiscountPercentage(value);
      if (value && parseFloat(value) > 0) { 
        setDiscountValue(''); 
      } else if (value === '') {
        // Permite borrar el campo
      }
  };
  const handleDiscountValueChange = (e) => {
      const value = e.target.value;
      setDiscountValue(value);
      if (value && parseFloat(value) > 0) { 
        setDiscountPercentage(''); 
      } else if (value === '') {
        // Permite borrar el campo
      }
  };
  
  // --- Calcular Totales ---
  useEffect(() => {
    const currentSubtotal = currentInvoiceItems.reduce((sum, item) => sum + item.total_item_price, 0);
    setSubtotal(currentSubtotal);

    let discount = 0;
    const perc = parseFloat(discountPercentage);
    const val = parseFloat(discountValue);

    if (!isNaN(perc) && perc > 0) {
        discount = (currentSubtotal * perc) / 100;
    } else if (!isNaN(val) && val > 0) {
        discount = val;
    }
    
    discount = Math.min(discount, currentSubtotal); 
    setDiscountAmountApplied(discount);

    const subtotalAfterDiscount = currentSubtotal - discount;
    let iva = 0;
    if (applyIVA && storeConfig && storeConfig.iva_percentage > 0) {
        iva = (subtotalAfterDiscount * storeConfig.iva_percentage) / 100;
    }
    setIvaAmountApplied(iva);

    setTotalAmount(subtotalAfterDiscount + iva);

  }, [currentInvoiceItems, discountPercentage, discountValue, applyIVA, storeConfig]);


  const handleFinalizeSale = async () => {
      setLoadingSale(true); setSaleError(''); 
      // setSaleSuccess(''); // No necesario, el modal lo reemplaza

      if (!selectedCustomer) { setSaleError('Debe seleccionar un cliente.'); setLoadingSale(false); return; }
      if (currentInvoiceItems.length === 0) { setSaleError('Debe añadir al menos un ítem.'); setLoadingSale(false); return; }

      const itemsPayload = currentInvoiceItems.map(item => ({
          id: item.item_type === 'temporary_service' ? 0 : item.id, 
          item_type: item.item_type,
          quantity: item.quantity,
          ...(item.item_type === 'temporary_service' && {
              description: item.description, // Asegurar que 'description' se envíe
              unit_price: item.unit_price    // Asegurar que 'unit_price' se envíe
          })
      }));

      const saleData = {
          customer_id: selectedCustomer.id,
          items: itemsPayload,
          payment_method: paymentMethod,
          // Backend maneja que si discount_value > 0, discount_percentage es ignorado o debe ser 0
          discount_percentage: discountPercentage && discountPercentage !== '' ? parseFloat(discountPercentage) : 0.0,
          discount_value: discountValue && discountValue !== '' ? parseFloat(discountValue) : null,
          apply_iva: applyIVA,
      };
      
      if (saleData.discount_value !== null && saleData.discount_value > 0) {
          saleData.discount_percentage = 0.0; // Asegurar que no se envíen ambos al backend si es necesario
      }


      console.log("Enviando al backend:", JSON.stringify(saleData, null, 2));

      try {
          const response = await billingService.createSale(saleData);
          setCompletedSaleData(response); // <-- Guardar datos para el modal
          setShowInvoiceModal(true);      // <-- Mostrar el modal
          // No limpiamos el form aquí, se hará al cerrar el modal
      } catch (error) {
          console.error("Error al crear la venta:", error.response?.data || error.message || error);
          let errMsg = 'Error al finalizar la venta.';
          if (error.response?.data?.detail) {
              if (Array.isArray(error.response.data.detail)) {
                  errMsg += error.response.data.detail.map(d => ` ${d.loc.join('->')}: ${d.msg}`).join(';');
              } else {
                 errMsg += ` Detalle: ${JSON.stringify(error.response.data.detail)}`;
              }
          } else if (error.message) {
              errMsg += ` Mensaje: ${error.message}`;
          }
          setSaleError(errMsg);
      } finally {
          setLoadingSale(false);
      }
  };

  return (
    <div style={pageStyle}>
      <Link to="/dashboard"><button style={{...buttonStyle, marginBottom: '20px'}}>← Volver al Dashboard</button></Link>
      <h2>Nueva Factura</h2>

      {/* Renderizar el modal si showInvoiceModal es true y hay datos */}
      {showInvoiceModal && completedSaleData && (
        <InvoiceModal
          saleData={completedSaleData}
          storeConfig={storeConfig}
          onClose={() => {
            setShowInvoiceModal(false);
            setCompletedSaleData(null);
            clearForm(); // Limpiar el formulario principal aquí
          }}
        />
      )}

      {/* El resto del JSX de BillingPage (secciones de cliente, ítems, etc.) 
          se mantiene igual que en la respuesta anterior, 
          solo asegúrate de que el botón "Finalizar Venta" 
          NO esté deshabilitado si `showInvoiceModal` es true, 
          o mejor aún, el flujo es que se finaliza, y LUEGO se muestra el modal.
      */}
      {/* --- Sección Cliente --- */}
      {!showInvoiceModal && ( // Ocultar formulario principal si el modal está visible
        <>
            <section style={sectionStyle}>
                <h3>1. Cliente</h3>
                <form onSubmit={handleCustomerSearch}>
                <div style={inputGroupStyle}>
                    <select value={searchDocType} onChange={(e) => setSearchDocType(e.target.value)} style={{padding: '8px'}}>
                    <option value="CC">CC</option><option value="CE">CE</option>
                    <option value="NIT">NIT</option><option value="PAS">PAS</option>
                    <option value="TI">TI</option><option value="Otro">Otro</option>
                    </select>
                    <input type="text" value={searchDocNumber} onChange={(e) => setSearchDocNumber(e.target.value)}
                        placeholder="Número de Documento" required style={inputStyle} />
                    <button type="submit" disabled={loadingCustomerSearch} style={buttonStyle}>
                    {loadingCustomerSearch ? 'Buscando...' : 'Buscar Cliente'}
                    </button>
                </div>
                </form>
                {customerSearchError && <p style={errorStyle}>{customerSearchError}</p>}
                {selectedCustomer && (
                <div>
                    <h4>Cliente Seleccionado:</h4>
                    <p><strong>Nombre:</strong> {selectedCustomer.full_name}</p>
                    <p><strong>Documento:</strong> {selectedCustomer.document_type} {selectedCustomer.document_number}</p>
                    <button onClick={() => setSelectedCustomer(null)} style={{...buttonStyle, backgroundColor: '#ffc107', fontSize: '0.8em'}}>Cambiar Cliente</button>
                </div>
                )}
            </section>

            {/* --- Sección Añadir Ítems (Solo si hay cliente) --- */}
            {selectedCustomer && (
                <>
                    {/* --- Ítems Registrados --- */}
                    <section style={sectionStyle}>
                        <h3>2. Añadir Ítems Registrados</h3>
                        <form onSubmit={handleItemSearch}>
                            <div style={inputGroupStyle}>
                                <select value={itemSearchType} onChange={(e) => { setItemSearchType(e.target.value); setFoundItem(null); setItemSearchCode(''); }} style={{padding: '8px'}}>
                                    <option value="product">Producto</option>
                                    <option value="service">Servicio</option>
                                </select>
                                <input type="text" value={itemSearchCode} onChange={(e) => setItemSearchCode(e.target.value)}
                                        placeholder={`Código`} required style={inputStyle} />
                                <button type="submit" disabled={loadingItemSearch} style={buttonStyle}>
                                    {loadingItemSearch ? 'Buscando...' : 'Buscar'}
                                </button>
                            </div>
                        </form>
                        {itemSearchError && <p style={errorStyle}>{itemSearchError}</p>}
                        {foundItem && (
                            <div style={{ border: '1px dashed #ccc', padding: '10px', margin: '10px 0' }}>
                                <p><strong>{foundItem.description}</strong> - Precio: {(foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value).toFixed(2)}
                                {foundItem.item_type === 'product' && ` - Stock: ${foundItem.quantity}`}
                                </p>
                                <div style={inputGroupStyle}>
                                    <input type="number" value={quantityToAdd} onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1" style={{...inputStyle, width: '80px', flexGrow: '0'}} />
                                    <button onClick={handleAddItemToInvoice} style={{...buttonStyle, backgroundColor: '#28a745', color: 'white'}}>Añadir</button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* --- Servicio Temporal --- */}
                    <section style={sectionStyle}>
                        <h3>3. Añadir Servicio Temporal</h3>
                        <div style={inputGroupStyle}>
                            <input type="text" value={tempServiceDesc} onChange={(e) => setTempServiceDesc(e.target.value)}
                                placeholder="Descripción del Servicio Temporal" style={inputStyle} />
                            <input type="number" value={tempServiceValue} onChange={(e) => setTempServiceValue(e.target.value)}
                                placeholder="Valor" min="0" step="any" style={{...inputStyle, flexGrow: '0.5'}} />
                            <button onClick={handleAddTempService} style={{...buttonStyle, backgroundColor: '#17a2b8', color: 'white'}}>Añadir Servicio Temp.</button>
                        </div>
                        {tempServiceError && <p style={errorStyle}>{tempServiceError}</p>}
                    </section>
                </>
            )}

            {/* --- Ítems de la Factura Actual --- */}
            {currentInvoiceItems.length > 0 && (
                <section style={sectionStyle}>
                <h3>4. Ítems en la Factura</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        <th style={tableHeaderStyle}>Descripción</th> <th style={tableHeaderStyle}>Cant.</th>
                        <th style={tableHeaderStyle}>Vlr. Unit.</th> <th style={tableHeaderStyle}>Vlr. Total</th>
                        <th style={tableHeaderStyle}>Acción</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentInvoiceItems.map((item, index) => (
                        <tr key={`${item.id}-${index}`}> {/* Asegurar una key única si los IDs temporales pudieran colisionar */}
                        <td style={tableCellStyle}>{item.description}</td>
                        <td style={tableCellStyle}>{item.quantity}</td>
                        <td style={tableCellStyle}>{item.unit_price.toFixed(2)}</td>
                        <td style={tableCellStyle}>{item.total_item_price.toFixed(2)}</td>
                        <td style={tableCellStyle}>
                            <button onClick={() => handleRemoveItem(index)} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>Quitar</button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <div style={{textAlign: 'right', marginTop: '20px', fontSize: '1.1em'}}>
                    <strong>Subtotal: {subtotal.toFixed(2)}</strong>
                </div>
                </section>
            )}

            {/* --- Sección Totales y Pago --- */}
            {currentInvoiceItems.length > 0 && (
                <section style={sectionStyle}>
                    <h3>5. Resumen y Pago</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <h4>Descuentos e Impuestos</h4>
                            <div style={{...inputGroupStyle, marginBottom: '15px'}}>
                                <label style={{minWidth: '120px'}}>Descuento (%):</label>
                                <input type="number" value={discountPercentage} onChange={handleDiscountPercentageChange}
                                        min="0" max="100" step="0.01" style={inputStyle} />
                            </div>
                            <div style={{...inputGroupStyle, marginBottom: '15px'}}>
                                <label style={{minWidth: '120px'}}>Descuento ($):</label>
                                <input type="number" value={discountValue} onChange={handleDiscountValueChange}
                                        min="0" step="any" style={inputStyle} />
                            </div>
                            {storeConfig && (
                                <div style={{...inputGroupStyle, marginBottom: '15px', alignItems: 'center'}}>
                                    <input type="checkbox" id="applyIVA" checked={applyIVA} onChange={(e) => setApplyIVA(e.target.checked)}
                                        style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                                    <label htmlFor="applyIVA">Aplicar IVA ({storeConfig.iva_percentage}%)</label>
                                </div>
                            )}
                            {!storeConfig && <p style={errorStyle}>Cargando config. IVA...</p>}
                        </div>
                        <div>
                            <h4>Método de Pago</h4>
                            <div style={{...inputGroupStyle, marginBottom: '15px'}}>
                                <label style={{minWidth: '100px'}}>Seleccione:</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{...inputStyle, padding: '8px'}}>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>
                            <hr />
                            <div style={{textAlign: 'right', marginTop: '20px', fontSize: '1.2em', lineHeight: '1.6'}}>
                                <p>Subtotal: <strong>{subtotal.toFixed(2)}</strong></p>
                                <p>Descuento: <strong>- {discountAmountApplied.toFixed(2)}</strong></p>
                                <p>IVA: <strong>+ {ivaAmountApplied.toFixed(2)}</strong></p>
                                <h3 style={{color: '#28a745', marginTop: '10px'}}>Total a Pagar: <strong>{totalAmount.toFixed(2)}</strong></h3>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* --- Botón Finalizar --- */}
            {currentInvoiceItems.length > 0 && selectedCustomer && (
                <div style={{textAlign: 'center', marginTop: '30px'}}>
                    {saleError && <p style={{...errorStyle, fontSize: '1.1em', marginBottom: '15px'}}>{saleError}</p>}
                    {/* {saleSuccess && <p style={{...successStyle, fontSize: '1.1em', marginBottom: '15px'}}>{saleSuccess}</p>} Mensaje de éxito ahora es el modal */}
                    <button
                        onClick={handleFinalizeSale}
                        disabled={loadingSale}
                        style={{ ...buttonStyle, backgroundColor: '#007bff', color: 'white', padding: '15px 30px', fontSize: '1.3em' }}
                    >
                        {loadingSale ? 'Procesando Venta...' : 'Finalizar Venta'}
                    </button>
                </div>
            )}
        </>
      )} {/* Fin del condicional !showInvoiceModal */}
    </div>
  );
}

export default BillingPage;