// src/pages/BillingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import customerService from '../services/customerService';
import inventoryService from '../services/inventoryService';
import serviceService from '../services/serviceService';
import billingService from '../services/billingService';
import authService from '../services/authService';
import configService from '../services/configService';
import InvoiceModal from '../components/InvoiceModal';

// --- ESTILOS MEJORADOS ---
const pageStyle = { 
  padding: '25px', 
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif", 
  color: '#34495e', 
  backgroundColor: '#e9ecef' // Fondo de página un gris un poco más notable
};

const sectionStyle = { 
  marginBottom: '30px', 
  padding: '25px', 
  border: '1px solid #d1d5db', // Borde consistente con inputs
  borderRadius: '8px', 
  backgroundColor: '#f8f9fa', // Un gris muy claro para las secciones, no blanco puro
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
};

const sectionHeaderStyle = {
  fontSize: '1.4em',
  color: '#2c3e50', 
  borderBottom: '1px solid #dee2e6', // Borde inferior más visible
  paddingBottom: '12px',
  marginBottom: '25px',
  fontWeight: '600'
};

const inputGroupStyle = { 
  display: 'flex', 
  gap: '12px', 
  marginBottom: '18px', 
  alignItems: 'flex-end' 
};

const baseInputStyle = {
  padding: '12px',
  fontSize: '1em',
  border: '1px solid #ced4da', // Borde estándar de Bootstrap
  borderRadius: '6px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff', // Inputs blancos para contraste con sección
  color: '#495057',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
};

const inputStyle = { 
  ...baseInputStyle,
  flexGrow: 1 
};

const selectStyle = { 
  ...baseInputStyle,
  flexGrow: 1 
};

const baseButtonStyle = {
  padding: '12px 18px',
  fontSize: '1em',
  cursor: 'pointer',
  borderRadius: '6px',
  border: '1px solid transparent',
  fontWeight: '500',
  transition: 'background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease'
};
// Añadimos un efecto al presionar
// (Esto normalmente se haría con :active en CSS, pero aquí una simulación leve si es necesario o dejarlo)

const primaryButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: '#007bff', 
  color: 'white',
  borderColor: '#007bff'
};

const secondaryButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: '#6c757d', 
  color: 'white',
  borderColor: '#6c757d'
};

const warningButtonStyle = { // Botón "Limpiar Cliente"
  ...baseButtonStyle,
  backgroundColor: '#ffc107', 
  color: '#212529',
  borderColor: '#ffc107'
};

const dangerButtonStyle = { // Botón "Quitar" ítem
  ...baseButtonStyle,
  backgroundColor: '#dc3545', 
  color: 'white',
  borderColor: '#dc3545'
};

const successButtonStyle = { // Botón "Añadir a Factura"
  ...baseButtonStyle,
  backgroundColor: '#28a745', 
  color: 'white',
  borderColor: '#28a745'
};

const infoButtonStyle = { // Botón "Añadir Servicio Temp."
    ...baseButtonStyle,
    backgroundColor: '#17a2b8',
    color: 'white',
    borderColor: '#17a2b8'
}

const tableHeaderStyle = { 
  borderBottom: '2px solid #adb5bd', 
  padding: '12px', 
  textAlign: 'left', 
  backgroundColor: '#dee2e6', // Cabecera de tabla con gris más oscuro
  color: '#212529', 
  fontWeight: '600',
  fontSize: '0.95em'
};

const tableCellStyle = { 
  borderBottom: '1px solid #dee2e6', 
  padding: '12px', 
  textAlign: 'left', 
  verticalAlign: 'middle' 
};

const errorStyle = { 
  color: '#721c24', 
  marginTop: '8px', 
  fontSize: '0.9em',
  padding: '10px 15px',
  backgroundColor: '#f8d7da',
  border: '1px solid #f5c6cb',
  borderRadius: '4px'
};

const customerDetailStyle = { 
  marginTop: '15px', 
  padding: '18px', 
  backgroundColor: '#e9ecef', // Un gris claro para destacar info del cliente
  borderRadius: '6px', 
  border: '1px solid #ced4da'
};

const itemDetailStyle = { 
  marginTop: '15px', 
  padding: '15px', 
  backgroundColor: '#e9ecef', // Mismo gris claro para info de ítem
  borderRadius: '6px', 
  border: '1px solid #ced4da'
};

const formFieldStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  flexGrow: 1, 
  minWidth: '200px' 
};

const labelStyle = { 
  marginBottom: '8px', 
  fontWeight: '600', 
  fontSize: '0.95em', 
  color: '#495057' 
};


function BillingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);

  const [searchDocType, setSearchDocType] = useState('CC');
  const [searchDocNumber, setSearchDocNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchError, setCustomerSearchError] = useState('');
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);

  const [itemSearchType, setItemSearchType] = useState('product');
  const [itemSearchCode, setItemSearchCode] = useState('');
  const [foundItem, setFoundItem] = useState(null); 
  const [itemSearchError, setItemSearchError] = useState('');
  const [loadingItemSearch, setLoadingItemSearch] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  const [allProducts, setAllProducts] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loadingProductsList, setLoadingProductsList] = useState(false);
  const [loadingServicesList, setLoadingServicesList] = useState(false);
  const [selectedItemFromDropdown, setSelectedItemFromDropdown] = useState('');

  const [tempServiceDesc, setTempServiceDesc] = useState('');
  const [tempServiceValue, setTempServiceValue] = useState('');
  const [tempServiceError, setTempServiceError] = useState('');

  const [currentInvoiceItems, setCurrentInvoiceItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [applyIVA, setApplyIVA] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo'); // Valor por defecto
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountAmountApplied, setDiscountAmountApplied] = useState(0);
  const [ivaAmountApplied, setIvaAmountApplied] = useState(0);

  const [loadingSale, setLoadingSale] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const fetchInitialData = async () => {
      setLoadingProductsList(true);
      setLoadingServicesList(true);
      try {
        const [config, productsData, servicesData] = await Promise.all([
          configService.getStoreSettings(),
          inventoryService.getProducts({ limit: 10000, active_only: true }), 
          serviceService.getServices({ limit: 10000, active_only: true })    
        ]);
        
        setStoreConfig(config);
        setApplyIVA(config.apply_iva_by_default);
        setAllProducts(productsData || []);
        setAllServices(servicesData || []);

      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setSaleError("Error al cargar datos iniciales (configuración, productos o servicios).");
      } finally {
        setLoadingProductsList(false);
        setLoadingServicesList(false);
      }
    };

    fetchInitialData();
  }, []);

  const clearForm = (clearCustomerFields = true) => {
      if (clearCustomerFields) { // Solo limpiar campos de cliente si se indica
        setSearchDocType('CC');
        setSearchDocNumber('');
        setSelectedCustomer(null);
        setCustomerSearchError('');
      }
      // Siempre limpiar el resto
      setItemSearchType('product');
      setItemSearchCode('');
      setFoundItem(null);
      setItemSearchError('');
      setQuantityToAdd(1);
      setSelectedItemFromDropdown(''); 
      setTempServiceDesc('');
      setTempServiceValue('');
      setTempServiceError('');
      setCurrentInvoiceItems([]);
      setDiscountPercentage('');
      setDiscountValue('');
      setPaymentMethod('Efectivo'); // Resetear método de pago
      setSaleError('');
      if (storeConfig) {
          setApplyIVA(storeConfig.apply_iva_by_default);
      } else {
          setApplyIVA(false);
      }
  };

  // --- MODIFICADO: Función para limpiar selección de cliente ---
  const handleClearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearchError('');
    setSearchDocNumber(''); // Limpiar número de documento
    setSearchDocType('CC');   // Resetear tipo de documento
    // No llamamos a clearForm() completo para no borrar ítems, etc.
  };

  const handleCustomerSearch = async (e) => {
    e.preventDefault();
    setLoadingCustomerSearch(true); setCustomerSearchError(''); setSelectedCustomer(null);
    try {
      const customerData = await customerService.getCustomerByDocument(searchDocType, searchDocNumber);
      if (customerData && customerData.is_active) {
        setSelectedCustomer(customerData);
      } else if (customerData && !customerData.is_active) {
        setCustomerSearchError('El cliente encontrado está inactivo.');
      } else {
        setCustomerSearchError('Cliente no encontrado.');
      }
    } catch (error) {
      setCustomerSearchError(error.detail || error.message || 'Cliente no encontrado o error al buscar.');
    } finally {
      setLoadingCustomerSearch(false);
    }
  };

  const handleItemSearchByCode = async (e) => {
    e.preventDefault();
    if (!itemSearchCode.trim()) { setItemSearchError(`Ingrese un código de ${itemSearchType === 'product' ? 'producto' : 'servicio'}.`); return; }
    setLoadingItemSearch(true); setItemSearchError(''); setFoundItem(null);
    setSelectedItemFromDropdown(''); 

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
        setItemSearchError(`El ${itemSearchType === "product" ? "producto" : "servicio"} con código "${itemSearchCode}" no está activo o no fue encontrado.`);
      }
    } catch (error) {
      setItemSearchError(error.detail || error.message || `Error al buscar ${itemSearchType === 'product' ? 'producto' : 'servicio'} por código.`);
    } finally {
      setLoadingItemSearch(false);
    }
  };

  const handleDropdownItemSelect = (e) => {
    const value = e.target.value;
    setSelectedItemFromDropdown(value);
    setItemSearchCode(''); 
    setFoundItem(null); 
    setItemSearchError('');
    setQuantityToAdd(1); // Resetear cantidad al seleccionar nuevo ítem

    if (!value) return;

    const [typePrefix, idStr] = value.split('-');
    const id = parseInt(idStr);
    let selectedItemData = null;

    if (typePrefix === 'product') {
      selectedItemData = allProducts.find(p => p.id === id);
      if (selectedItemData) {
        setFoundItem({ ...selectedItemData, item_type: 'product' });
        setItemSearchType('product'); 
      }
    } else if (typePrefix === 'service') {
      selectedItemData = allServices.find(s => s.id === id);
      if (selectedItemData) {
        setFoundItem({ ...selectedItemData, item_type: 'service' });
        setItemSearchType('service'); 
      }
    }
    if (!selectedItemData) {
        setItemSearchError("Ítem seleccionado del desplegable no encontrado en listas cargadas.");
    }
  };

  const handleAddItemToInvoice = () => {
    // ... (lógica sin cambios)
    if (!foundItem || quantityToAdd <= 0) { alert('Busque o seleccione un ítem y especifique una cantidad válida (> 0).'); return; }
    if (foundItem.item_type === 'product' && foundItem.quantity < quantityToAdd) { alert(`Stock insuficiente para "${foundItem.description}". Disponible: ${foundItem.quantity}`); return; }

    const newItem = {
      id: foundItem.id, 
      item_type: foundItem.item_type, 
      description: foundItem.description,
      quantity: parseInt(quantityToAdd, 10),
      unit_price: parseFloat(foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value),
      total_item_price: parseFloat(foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value) * parseInt(quantityToAdd, 10),
    };

    updateInvoiceItems(newItem, foundItem.item_type === 'product' ? foundItem.quantity : Infinity);
    setFoundItem(null); 
    setItemSearchCode(''); 
    setSelectedItemFromDropdown(''); 
    setQuantityToAdd(1);
    setItemSearchError('');
  };

  const handleAddTempService = () => {
    // ... (lógica sin cambios)
    setTempServiceError('');
    const value = parseFloat(tempServiceValue);
    if (!tempServiceDesc.trim() || isNaN(value) || value <= 0) {
        setTempServiceError('Ingrese descripción y un valor válido mayor a cero.');
        return;
    }
    const newItem = {
        id: `temp_${Date.now()}`, 
        item_type: 'temporary_service',
        description: tempServiceDesc.trim(),
        quantity: 1, 
        unit_price: value,
        total_item_price: value,
    };
    updateInvoiceItems(newItem); 
    setTempServiceDesc(''); setTempServiceValue(''); setTempServiceError('');
  };

  const updateInvoiceItems = (newItem, availableStock = Infinity) => {
    // ... (lógica sin cambios)
    setCurrentInvoiceItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(
            item => item.id === newItem.id && item.item_type === newItem.item_type
        );

        if (existingItemIndex > -1) {
            return prevItems.map((item, index) => {
                if (index === existingItemIndex) {
                    const newQuantity = item.quantity + newItem.quantity;
                    if (item.item_type === 'product' && newQuantity > availableStock) {
                        alert(`Stock insuficiente para ${item.description}. En factura: ${item.quantity}, Stock total: ${availableStock}, Intentando añadir: ${newItem.quantity}`);
                        return item; 
                    }
                    return { ...item, quantity: newQuantity, total_item_price: item.unit_price * newQuantity };
                }
                return item;
            });
        } else { 
            if (newItem.item_type === 'product' && newItem.quantity > availableStock) {
                 alert(`Stock insuficiente para ${newItem.description}. Disponible: ${availableStock}`);
                 return prevItems;
            }
            return [...prevItems, newItem];
        }
    });
  };

  const handleRemoveItem = (indexToRemove) => {
    // ... (lógica sin cambios)
    setCurrentInvoiceItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  const handleDiscountPercentageChange = (e) => {
    // ... (lógica sin cambios)
      const value = e.target.value;
      const floatValue = parseFloat(value);
      if (value === '' || (floatValue >= 0 && floatValue <= 100) ) {
        setDiscountPercentage(value);
        if (value && floatValue > 0) { 
          setDiscountValue(''); 
        }
      }
  };
  const handleDiscountValueChange = (e) => {
    // ... (lógica sin cambios)
      const value = e.target.value;
      const floatValue = parseFloat(value);
       if (value === '' || floatValue >= 0) {
        setDiscountValue(value);
        if (value && floatValue > 0) { 
          setDiscountPercentage(''); 
        }
      }
  };
  
  useEffect(() => {
    // ... (lógica de cálculo de totales sin cambios)
    const currentSubtotal = currentInvoiceItems.reduce((sum, item) => sum + item.total_item_price, 0);
    setSubtotal(currentSubtotal);
    let discount = 0;
    const perc = parseFloat(discountPercentage);
    const val = parseFloat(discountValue);
    if (!isNaN(perc) && perc >= 0) { 
        discount = (currentSubtotal * perc) / 100;
    } else if (!isNaN(val) && val >= 0) { 
        discount = val;
    }
    discount = Math.min(Math.max(0, discount), currentSubtotal); 
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
    // ... (lógica sin cambios significativos, excepto el valor de paymentMethod)
      setLoadingSale(true); setSaleError(''); 
      if (!selectedCustomer) { setSaleError('Debe seleccionar un cliente.'); setLoadingSale(false); return; }
      if (currentInvoiceItems.length === 0) { setSaleError('Debe añadir al menos un ítem.'); setLoadingSale(false); return; }
      const itemsPayload = currentInvoiceItems.map(item => ({
          id: item.item_type === 'temporary_service' ? 0 : item.id, 
          item_type: item.item_type,
          quantity: item.quantity,
          ...(item.item_type === 'temporary_service' && {
              description: item.description,
              unit_price: item.unit_price  
          })
      }));
      const saleData = {
          customer_id: selectedCustomer.id,
          items: itemsPayload,
          payment_method: paymentMethod, // El valor de paymentMethod ya reflejará "Tarjeta C/D" si se seleccionó
          discount_percentage: discountPercentage && discountPercentage !== '' ? parseFloat(discountPercentage) : 0.0,
          discount_value: discountValue && discountValue !== '' ? parseFloat(discountValue) : null,
          apply_iva: applyIVA,
      };
      if (saleData.discount_value !== null && saleData.discount_value > 0) {
          saleData.discount_percentage = 0.0;
      }
      try {
          const response = await billingService.createSale(saleData);
          setCompletedSaleData(response); 
          setShowInvoiceModal(true);      
      } catch (error) {
          console.error("Error al crear la venta:", error.response?.data || error.message || error);
          let errMsg = 'Error al finalizar la venta.';
          if (error.response?.data?.detail) {
              if (Array.isArray(error.response.data.detail)) {
                  errMsg += error.response.data.detail.map(d => ` ${d.loc ? d.loc.join('->') : 'Error'}: ${d.msg}`).join(';');
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
      <Link to="/dashboard">
        <button style={{...secondaryButtonStyle, marginBottom: '25px'}}>
          ← Volver al Dashboard
        </button>
      </Link>
      <h2 style={{...sectionHeaderStyle, fontSize: '1.8em', borderBottom: 'none', marginBottom: '25px', color: '#1a2530'}}>Nueva Factura</h2>

      {showInvoiceModal && completedSaleData && (
        <InvoiceModal
          saleData={completedSaleData}
          storeConfig={storeConfig}
          onClose={() => {
            setShowInvoiceModal(false);
            setCompletedSaleData(null);
            clearForm(true); 
          }}
        />
      )}

      {!showInvoiceModal && (
        <>
            <section style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>1. Cliente</h3>
                <form onSubmit={handleCustomerSearch}>
                <div style={inputGroupStyle}>
                    <select value={searchDocType} onChange={(e) => setSearchDocType(e.target.value)} style={{...selectStyle, flexGrow: 0, minWidth: '100px'}}>
                    <option value="CC">CC</option><option value="CE">CE</option>
                    <option value="NIT">NIT</option><option value="PAS">PAS</option>
                    <option value="TI">TI</option><option value="Otro">Otro</option>
                    </select>
                    <input type="text" value={searchDocNumber} onChange={(e) => setSearchDocNumber(e.target.value)}
                        placeholder="Número de Documento" required style={inputStyle} />
                    <button type="submit" disabled={loadingCustomerSearch} style={primaryButtonStyle}>
                    {loadingCustomerSearch ? 'Buscando...' : 'Buscar Cliente'}
                    </button>
                </div>
                </form>
                {customerSearchError && <p style={errorStyle}>{customerSearchError}</p>}
                {selectedCustomer && (
                <div style={customerDetailStyle}>
                    <h4 style={{marginTop:0, marginBottom:'12px', color: '#004085'}}>Cliente Seleccionado:</h4>
                    <p><strong>Nombre:</strong> {selectedCustomer.full_name}</p>
                    <p><strong>Documento:</strong> {selectedCustomer.document_type} {selectedCustomer.document_number}</p>
                    <p><strong>Teléfono:</strong> {selectedCustomer.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedCustomer.email || 'N/A'}</p>
                    <p><strong>Dirección:</strong> {selectedCustomer.address || 'N/A'}</p>
                    {/* --- BOTÓN LIMPIAR CLIENTE MODIFICADO --- */}
                    <button 
                        onClick={handleClearCustomerSelection}
                        style={{...warningButtonStyle, fontSize: '0.9em', marginTop:'10px', padding: '8px 12px'}}
                    >
                        Limpiar Cliente
                    </button>
                </div>
                )}
            </section>

            {selectedCustomer && (
              <>
                <section style={sectionStyle}>
                  <h3 style={sectionHeaderStyle}>2. Añadir Ítems Registrados</h3>
                  <form onSubmit={handleItemSearchByCode} style={{marginBottom: '20px'}}>
                    <label style={labelStyle}>Buscar por Código:</label>
                    <div style={inputGroupStyle}>
                        <select 
                            value={itemSearchType} 
                            onChange={(e) => { 
                                setItemSearchType(e.target.value); setFoundItem(null); 
                                setItemSearchCode(''); setSelectedItemFromDropdown(''); 
                            }} 
                            style={{...selectStyle, flexGrow: 0, minWidth: '130px'}}
                        >
                            <option value="product">Producto</option>
                            <option value="service">Servicio</option>
                        </select>
                        <input 
                            type="text" value={itemSearchCode} 
                            onChange={(e) => {
                                setItemSearchCode(e.target.value);
                                if(e.target.value.trim() !== '') setSelectedItemFromDropdown('');
                            }}
                            placeholder={`Código de ${itemSearchType === 'product' ? 'Producto' : 'Servicio'}`} style={inputStyle} />
                        <button type="submit" disabled={loadingItemSearch || !itemSearchCode.trim()} style={primaryButtonStyle}>
                            {loadingItemSearch ? 'Buscando...' : 'Buscar Código'}
                        </button>
                    </div>
                  </form>

                  <div style={formFieldStyle}>
                    <label htmlFor="itemDropdown" style={labelStyle}>O seleccionar de la lista:</label>
                    <select 
                        id="itemDropdown"
                        value={selectedItemFromDropdown}
                        onChange={handleDropdownItemSelect}
                        style={{...selectStyle, width: '100%'}}
                        disabled={loadingProductsList || loadingServicesList}
                    >
                        <option value="">-- {(loadingProductsList || loadingServicesList) ? 'Cargando ítems...' : 'Seleccione un Producto o Servicio'} --</option>
                        {allProducts.length > 0 && (
                            <optgroup label="Productos">
                                {allProducts.map(product => (
                                    <option key={`product-${product.id}`} value={`product-${product.id}`}>
                                        {product.description} (Cód: {product.internal_code || product.barcode || 'N/A'}) - Stock: {product.quantity} - Vlr: {product.sale_value.toFixed(2)}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {allServices.length > 0 && (
                            <optgroup label="Servicios">
                                {allServices.map(service => (
                                    <option key={`service-${service.id}`} value={`service-${service.id}`}>
                                        {service.description} (Cód: {service.internal_code || 'N/A'}) - Vlr: {service.value.toFixed(2)}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                         {!(loadingProductsList || loadingServicesList) && allProducts.length === 0 && allServices.length === 0 && (
                            <option disabled>No hay productos ni servicios registrados o activos.</option>
                        )}
                    </select>
                  </div>
                  
                  {itemSearchError && <p style={errorStyle}>{itemSearchError}</p>}
                  
                  {foundItem && (
                    <div style={itemDetailStyle}>
                        <h4 style={{marginTop:0, marginBottom:'10px', color: '#004085'}}>Ítem a Añadir:</h4>
                        <p><strong>{foundItem.description}</strong></p>
                        <p>Precio Unitario: {(foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value).toFixed(2)}
                        {foundItem.item_type === 'product' && ` - Stock Disponible: ${foundItem.quantity}`}
                        </p>
                        <div style={inputGroupStyle}>
                            <label htmlFor="quantityToAdd" style={{...labelStyle, marginBottom: 0, marginRight: '8px', flexGrow:0 }}>Cantidad:</label>
                            <input id="quantityToAdd" type="number" value={quantityToAdd} 
                                   onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                                   min="1" 
                                   style={{...inputStyle, width: '80px', flexGrow: '0', padding: '10px'}} />
                            <button onClick={handleAddItemToInvoice} style={successButtonStyle}>Añadir a Factura</button>
                        </div>
                    </div>
                  )}
                </section>

                <section style={sectionStyle}>
                  <h3 style={sectionHeaderStyle}>3. Añadir Servicio Temporal</h3>
                  <div style={inputGroupStyle}>
                      <input type="text" value={tempServiceDesc} onChange={(e) => setTempServiceDesc(e.target.value)}
                          placeholder="Descripción del Servicio Temporal" style={inputStyle} />
                      <input type="number" value={tempServiceValue} onChange={(e) => setTempServiceValue(e.target.value)}
                          placeholder="Valor" min="0" step="any" style={{...inputStyle, flexGrow: '0.5'}} />
                      <button onClick={handleAddTempService} style={infoButtonStyle}>Añadir Servicio Temp.</button>
                  </div>
                  {tempServiceError && <p style={errorStyle}>{tempServiceError}</p>}
                </section>
              </>
            )}

            {currentInvoiceItems.length > 0 && (
              <section style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>4. Ítems en la Factura</h3>
                <div style={{overflowX: 'auto'}}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={tableHeaderStyle}>Descripción</th> 
                            <th style={tableHeaderStyle}>Cant.</th>
                            <th style={tableHeaderStyle}>Vlr. Unit.</th> 
                            <th style={tableHeaderStyle}>Vlr. Total</th>
                            <th style={tableHeaderStyle}>Acción</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentInvoiceItems.map((item, index) => (
                            <tr key={`${item.id}-${index}-${item.item_type}`}>
                            <td style={tableCellStyle}>{item.description}</td>
                            <td style={tableCellStyle}>{item.quantity}</td>
                            <td style={tableCellStyle}>{item.unit_price.toFixed(2)}</td>
                            <td style={tableCellStyle}>{item.total_item_price.toFixed(2)}</td>
                            <td style={tableCellStyle}>
                                <button onClick={() => handleRemoveItem(index)} style={dangerButtonStyle}>Quitar</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <div style={{textAlign: 'right', marginTop: '25px', fontSize: '1.2em', fontWeight:'bold'}}>
                    Subtotal: {subtotal.toFixed(2)}
                </div>
              </section>
            )}

            {currentInvoiceItems.length > 0 && (
              <section style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>5. Resumen y Pago</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                        <div>
                        <h4 style={{...labelStyle, fontSize:'1.1em', color: '#2c3e50', marginBottom:'15px'}}>Descuentos e Impuestos</h4>
                        <div style={{marginBottom: '15px'}}>
                            <label htmlFor="discountPercentage" style={labelStyle}>Descuento (%):</label>
                            <input 
                                id="discountPercentage" 
                                type="number" 
                                value={discountPercentage} 
                                onChange={handleDiscountPercentageChange}
                                min="0" 
                                max="100" 
                                step="1" // MODIFICADO: Incremento de 1 en 1
                                placeholder="Ej: 5" // Placeholder opcional
                                style={inputStyle} 
                            />
                        </div>
                        <div style={{marginBottom: '20px'}}>
                            <label htmlFor="discountValue" style={labelStyle}>Descuento ($):</label>
                            <input 
                                id="discountValue" 
                                type="number" 
                                value={discountValue} 
                                onChange={handleDiscountValueChange}
                                min="0" 
                                step="1" // MODIFICADO: Incremento de 1 en 1
                                placeholder="Ej: 10000" // Placeholder opcional
                                style={inputStyle} 
                            />
                        </div>
                        {storeConfig ? (
                            <div style={{display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                                <input type="checkbox" id="applyIVA" checked={applyIVA} onChange={(e) => setApplyIVA(e.target.checked)}
                                    style={{ width: '20px', height: '20px', marginRight: '10px', cursor: 'pointer' }} />
                                <label htmlFor="applyIVA" style={{...labelStyle, marginBottom:0, cursor: 'pointer', fontWeight:'normal'}}>Aplicar IVA ({storeConfig.iva_percentage}%)</label>
                            </div>
                        ) : <p style={errorStyle}>Cargando config. IVA...</p>}
                    </div>
                    <div style={{borderLeft: '1px solid #ecf0f1', paddingLeft: '25px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                        <div>
                            <h4 style={{...labelStyle, fontSize:'1.1em', color: '#2c3e50', marginBottom:'15px'}}>Método de Pago</h4>
                            <div style={{marginBottom: '25px'}}>
                                <label htmlFor="paymentMethod" style={labelStyle}>Seleccione:</label>
                                {/* --- SELECT DE MÉTODO DE PAGO MODIFICADO --- */}
                                <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{...selectStyle, width:'100%', padding: '12px'}}>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta C/D">Tarjeta de Crédito/Débito</option>
                                    <option value="Transferencia">Transferencia</option>
                                    {/* Puedes añadir más opciones si es necesario */}
                                </select>
                            </div>
                        </div>
                        
                        <div style={{fontSize: '1.1em', lineHeight: '1.8', marginTop: 'auto'}}> {/* marginTop auto para empujar hacia abajo */}
                            <p style={{display:'flex', justifyContent:'space-between'}}><span>Subtotal:</span> <strong>{subtotal.toFixed(2)}</strong></p>
                            <div style={{clear:'both'}}></div>
                            <p style={{display:'flex', justifyContent:'space-between'}}><span>Descuento Aplicado:</span> <strong>- {discountAmountApplied.toFixed(2)}</strong></p>
                            <div style={{clear:'both'}}></div>
                            <p style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #dee2e6', paddingBottom:'8px', marginBottom:'8px'}}>
                              <span>IVA ({applyIVA && storeConfig ? storeConfig.iva_percentage : 0}%):</span> 
                              <strong>+ {ivaAmountApplied.toFixed(2)}</strong>
                            </p>
                            <h3 style={{color: '#28a745', marginTop: '15px', display:'flex', justifyContent:'space-between', fontSize:'1.4em'}}>
                              <span>Total a Pagar:</span> 
                              <strong>{totalAmount.toFixed(2)}</strong>
                            </h3>
                            <div style={{clear:'both'}}></div>
                        </div>
                    </div>
                </div>
              </section>
            )}

            {currentInvoiceItems.length > 0 && selectedCustomer && (
              <div style={{textAlign: 'center', marginTop: '40px', marginBottom: '20px'}}>
                  {saleError && <p style={{...errorStyle, fontSize: '1.1em', marginBottom: '15px'}}>{saleError}</p>}
                  <button
                      onClick={handleFinalizeSale}
                      disabled={loadingSale}
                      style={{ ...primaryButtonStyle, padding: '15px 35px', fontSize: '1.3em' }}
                  >
                      {loadingSale ? 'Procesando Venta...' : 'Finalizar Venta'}
                  </button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

export default BillingPage;