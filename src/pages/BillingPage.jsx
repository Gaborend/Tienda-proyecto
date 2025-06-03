// src/pages/BillingPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import customerService from '../services/customerService';
import inventoryService from '../services/inventoryService';
import serviceService from '../services/serviceService';
import billingService from '../services/billingService';
import authService from '../services/authService';
import configService from '../services/configService';
import InvoiceModal from '../components/InvoiceModal'; 

const pageStyle = { 
  padding: '25px', 
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif", 
  color: '#34495e', 
  backgroundColor: '#e9ecef',
  maxWidth: '1300px', // Ajustar si es necesario
  margin: '0 auto'
};
const sectionStyle = { 
  marginBottom: '30px', 
  padding: '25px', 
  border: '1px solid #d1d5db', 
  borderRadius: '8px', 
  backgroundColor: '#f8f9fa', 
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
};
const sectionHeaderStyle = {
  fontSize: '1.4em',
  color: '#2c3e50', 
  borderBottom: '1px solid #dee2e6', 
  paddingBottom: '12px',
  marginBottom: '25px',
  fontWeight: '600'
};
const inputGroupStyle = { 
  display: 'flex', 
  gap: '12px', 
  marginBottom: '18px', 
  alignItems: 'flex-end',
  flexWrap: 'wrap' // Para mejor responsividad
};
const baseInputStyle = {
  padding: '12px',
  fontSize: '1em',
  border: '1px solid #ced4da', 
  borderRadius: '6px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff', 
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
  transition: 'background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease',
  lineHeight: '1.5' // Para mejor alineación del texto
};
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
const warningButtonStyle = { 
  ...baseButtonStyle,
  backgroundColor: '#ffc107', 
  color: '#212529',
  borderColor: '#ffc107'
};
const dangerButtonStyle = { 
  ...baseButtonStyle,
  backgroundColor: '#dc3545', 
  color: 'white',
  borderColor: '#dc3545'
};
const successButtonStyle = { 
  ...baseButtonStyle,
  backgroundColor: '#28a745', 
  color: 'white',
  borderColor: '#28a745'
};
const infoButtonStyle = { 
    ...baseButtonStyle,
    backgroundColor: '#17a2b8',
    color: 'white',
    borderColor: '#17a2b8'
};
const tableHeaderStyle = { 
  borderBottom: '2px solid #adb5bd', 
  padding: '12px', 
  textAlign: 'left', 
  backgroundColor: '#dee2e6', 
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
  backgroundColor: '#e9ecef', 
  borderRadius: '6px', 
  border: '1px solid #ced4da'
};
const itemDetailStyle = { 
  marginTop: '15px', 
  padding: '15px', 
  backgroundColor: '#e9ecef', 
  borderRadius: '6px', 
  border: '1px solid #ced4da'
};
const formFieldStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  flexGrow: 1, 
  minWidth: '200px' // Para que los inputs no se achiquen demasiado
};
const labelStyle = { 
  marginBottom: '8px', 
  fontWeight: '600', 
  fontSize: '0.95em', 
  color: '#495057' 
};

// --- Funciones Utilitarias de Fecha ---
const parseLocalDateFromString = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.split('T')[0].split('-'); 
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; 
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const d = new Date(Date.UTC(year, month, day)); 
            if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) {
                return d;
            }
        }
    }
    const standardParsedDate = new Date(dateString); // Fallback
    return !isNaN(standardParsedDate.getTime()) ? standardParsedDate : null;
};

const formatDateForDisplay = (dateStr, locale = 'es-CO') => {
    if (!dateStr) return 'N/A';
    const dateObj = parseLocalDateFromString(dateStr);
    return dateObj ? dateObj.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }) : 'Fecha Inválida';
};

const formatDateForInput = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return ''; 
    }
    const year = dateObj.getUTCFullYear();
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0'); 
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isToday = (dateString) => {
    if (!dateString) return false;
    const recordDate = parseLocalDateFromString(dateString);
    if (!recordDate) return false; 
    const today = new Date();
    return recordDate.getUTCFullYear() === today.getUTCFullYear() &&
           recordDate.getUTCMonth() === today.getUTCMonth() &&
           recordDate.getUTCDate() === today.getUTCDate();
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
  const [initialAllProducts, setInitialAllProducts] = useState([]); // Para stock original
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
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
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
      setSaleError('');
      try {
        const [config, productsData, servicesData] = await Promise.all([
          configService.getStoreSettings(),
          inventoryService.getProducts({ limit: 10000, active_only: true }), 
          serviceService.getServices({ limit: 10000, active_only: true })    
        ]);
        
        setStoreConfig(config);
        setApplyIVA(config?.apply_iva_by_default || false);
        
        const products = productsData || [];
        setAllProducts(products); 
        setInitialAllProducts(JSON.parse(JSON.stringify(products))); // Copia profunda

        setAllServices(servicesData || []);

      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setSaleError("Error al cargar datos iniciales. Revise la conexión o intente más tarde.");
      } finally {
        setLoadingProductsList(false);
        setLoadingServicesList(false);
      }
    };
    fetchInitialData();
  }, []);

  const clearForm = (clearCustomerFields = true) => {
      if (clearCustomerFields) {
        setSearchDocType('CC');
        setSearchDocNumber('');
        setSelectedCustomer(null);
        setCustomerSearchError('');
      }
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
      setPaymentMethod('Efectivo');
      setSaleError('');
      if (storeConfig) {
          setApplyIVA(storeConfig.apply_iva_by_default);
      } else {
          setApplyIVA(false);
      }
      inventoryService.getProducts({ limit: 10000, active_only: true })
        .then(productsData => {
            const products = productsData || [];
            setAllProducts(products);
            setInitialAllProducts(JSON.parse(JSON.stringify(products)));
        })
        .catch(err => {
            console.error("Error recargando productos tras limpiar form:", err);
            setSaleError("Error al recargar lista de productos.");
        });
  };

  const handleClearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearchError('');
    setSearchDocNumber(''); 
    setSearchDocType('CC');   
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
      setCustomerSearchError(error.response?.data?.detail || error.message || 'Cliente no encontrado o error al buscar.');
    } finally {
      setLoadingCustomerSearch(false);
    }
  };

  const handleItemSearchByCode = async (e) => {
    e.preventDefault();
    if (!itemSearchCode.trim()) { 
        setItemSearchError(`Ingrese un código de ${itemSearchType === 'product' ? 'producto' : 'servicio'}.`); 
        return; 
    }
    setLoadingItemSearch(true); setItemSearchError(''); setFoundItem(null);
    setSelectedItemFromDropdown(''); 

    try {
      let itemDataFromService;
      if (itemSearchType === 'product') {
        itemDataFromService = await inventoryService.getProductByCode(itemSearchCode);
      } else {
        itemDataFromService = await serviceService.getServiceByCode(itemSearchCode);
      }

      if (itemDataFromService && itemDataFromService.is_active) {
        // foundItem siempre debe reflejar el stock *original* del producto como si se acabara de cargar
        // para que las validaciones de stock total en factura sean consistentes.
        // La lista `allProducts` manejará el stock visual que se reduce.
        setFoundItem({...itemDataFromService, item_type: itemSearchType });
      } else if (itemDataFromService && !itemDataFromService.is_active) {
        setItemSearchError(`El ${itemSearchType === "product" ? "producto" : "servicio"} con código "${itemSearchCode}" está inactivo.`);
      } else {
        setItemSearchError(`El ${itemSearchType === "product" ? "producto" : "servicio"} con código "${itemSearchCode}" no fue encontrado.`);
      }
    } catch (error) {
      setItemSearchError(error.response?.data?.detail || error.message || `Error al buscar ítem por código.`);
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
    setQuantityToAdd(1);

    if (!value) return;

    const [typePrefix, idStr] = value.split('-');
    const id = parseInt(idStr);
    let itemDataToSetAsFound = null;

    if (typePrefix === 'product') {
      // Para foundItem, usamos la data de initialAllProducts para tener el stock original
      const originalProductData = initialAllProducts.find(p => p.id === id);
      if (originalProductData) {
        itemDataToSetAsFound = { ...originalProductData, item_type: 'product' };
        setItemSearchType('product'); 
      } else {
         setItemSearchError("Producto no encontrado en la lista original. Puede que necesite recargar.");
      }
    } else if (typePrefix === 'service') {
      const serviceData = allServices.find(s => s.id === id);
      if (serviceData) {
        itemDataToSetAsFound = { ...serviceData, item_type: 'service' };
        setItemSearchType('service'); 
      }
    }
    
    if (itemDataToSetAsFound) {
        setFoundItem(itemDataToSetAsFound);
    } else if (typePrefix === 'product' && !itemDataToSetAsFound) { // Ya se manejó arriba, pero por si acaso
        // El error ya se puso si no se encontró en initialAllProducts
    } else {
        setItemSearchError("Ítem seleccionado del desplegable no encontrado.");
    }
  };
  
  // Función simplificada para actualizar los ítems de la factura
  const performInvoiceItemsUpdate = (newItem) => {
    setCurrentInvoiceItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.id === newItem.id && item.item_type === newItem.item_type
      );

      if (existingItemIndex > -1) { // El ítem ya existe, actualizar cantidad
        return prevItems.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + newItem.quantity;
            return { ...item, quantity: newQuantity, total_item_price: item.unit_price * newQuantity };
          }
          return item;
        });
      } else { // Es un nuevo ítem para la factura
        return [...prevItems, newItem];
      }
    });
  };

  const handleAddItemToInvoice = () => {
    if (!foundItem || quantityToAdd <= 0) { 
        alert('Busque o seleccione un ítem y especifique una cantidad válida (> 0).'); 
        return; 
    }

    const numericQuantityToAdd = parseInt(quantityToAdd, 10);
    const { id: itemId, item_type: itemType, description: itemDescription } = foundItem;

    if (itemType === 'product') {
        // Verificación 1: Contra el stock visualmente disponible en el dropdown (allProducts)
        const productInVisualList = allProducts.find(p => p.id === itemId);
        if (!productInVisualList) {
            alert('Error: Producto no encontrado en la lista de stock visual. Por favor, recargue.');
            return;
        }
        if (productInVisualList.quantity < numericQuantityToAdd) {
            alert(`Stock visualmente insuficiente para "${itemDescription}". Disponible en lista: ${productInVisualList.quantity}. Intentando añadir: ${numericQuantityToAdd}.`);
            return;
        }

        // Verificación 2: Contra el stock ORIGINAL del producto (usando initialAllProducts)
        const originalProductData = initialAllProducts.find(p => p.id === itemId);
        if (!originalProductData) {
            alert(`Error: Información de stock original no encontrada para "${itemDescription}". Por favor, recargue.`);
            return;
        }
        const originalStock = originalProductData.quantity;

        const itemAlreadyInInvoice = currentInvoiceItems.find(item => item.id === itemId && item.item_type === 'product');
        const quantityAlreadyInInvoice = itemAlreadyInInvoice ? itemAlreadyInInvoice.quantity : 0;
        
        if ((quantityAlreadyInInvoice + numericQuantityToAdd) > originalStock) {
             alert(`La cantidad total para "${itemDescription}" en la factura (${quantityAlreadyInInvoice + numericQuantityToAdd}) excedería el stock original total del producto (${originalStock}). Ya tiene ${quantityAlreadyInInvoice} en factura.`);
             return;
        }
    }

    // Si todas las verificaciones pasan:
    const newItemData = {
      id: itemId, 
      item_type: itemType, 
      description: itemDescription,
      quantity: numericQuantityToAdd,
      // Usar el precio de foundItem, que refleja el precio del ítem al momento de la selección/búsqueda
      unit_price: parseFloat(itemType === 'product' ? foundItem.sale_value : foundItem.value),
      total_item_price: parseFloat(itemType === 'product' ? foundItem.sale_value : foundItem.value) * numericQuantityToAdd,
    };
    
    performInvoiceItemsUpdate(newItemData); // Añade/fusiona a currentInvoiceItems
    
    // Actualizar el stock visual en allProducts
    if (itemType === 'product') {
      setAllProducts(prevAllProducts =>
        prevAllProducts.map(p =>
          p.id === itemId
            ? { ...p, quantity: p.quantity - numericQuantityToAdd } 
            : p
        )
      );
    }

    // Limpiar campos de selección de ítem
    setFoundItem(null); 
    setItemSearchCode(''); 
    setSelectedItemFromDropdown(''); 
    setQuantityToAdd(1);
    setItemSearchError('');
  };

  const handleAddTempService = () => {
    setTempServiceError('');
    const value = parseFloat(tempServiceValue);
    if (!tempServiceDesc.trim() || isNaN(value) || value <= 0) {
        setTempServiceError('Ingrese descripción y un valor válido mayor a cero.');
        return;
    }
    const newItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
        item_type: 'temporary_service',
        description: tempServiceDesc.trim(),
        quantity: 1, 
        unit_price: value,
        total_item_price: value,
    };
    performInvoiceItemsUpdate(newItem); 
    setTempServiceDesc(''); setTempServiceValue(''); setTempServiceError('');
  };

  const handleRemoveItem = (indexToRemove) => {
    const itemToRemove = currentInvoiceItems[indexToRemove];
    if (itemToRemove.item_type === 'product') {
      setAllProducts(prevAllProducts =>
        prevAllProducts.map(p =>
          p.id === itemToRemove.id
            ? { ...p, quantity: p.quantity + itemToRemove.quantity } 
            : p
        )
      );
    }
    setCurrentInvoiceItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  const handleDiscountPercentageChange = (e) => {
      const value = e.target.value;
      if (value === '') {
          setDiscountPercentage('');
          return;
      }
      // Permitir escribir decimales, pero el step="1" afecta spinners.
      // La validación de que sea un número entre 0 y 100.
      const numValue = parseFloat(value);
      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 100) ) {
        setDiscountPercentage(value);
         if (value !== '' && !isNaN(numValue) && numValue >=0) setDiscountValue(''); 
      } else if (!isNaN(numValue) && numValue < 0) {
        setDiscountPercentage('0');
        setDiscountValue('');
      } else if (!isNaN(numValue) && numValue > 100) {
        setDiscountPercentage('100');
        setDiscountValue('');
      }
  };

  const handleDiscountValueChange = (e) => {
      const value = e.target.value;
       if (value === '') {
          setDiscountValue('');
          return;
      }
      const numValue = parseFloat(value);
      if (value === '' || (!isNaN(numValue) && numValue >= 0) ) {
        setDiscountValue(value);
        if (value !== '' && !isNaN(numValue) && numValue >=0) setDiscountPercentage('');
      } else if (!isNaN(numValue) && numValue < 0) {
        setDiscountValue('0');
        setDiscountPercentage('');
      }
  };
  
  useEffect(() => {
    const currentSubtotal = currentInvoiceItems.reduce((sum, item) => sum + item.total_item_price, 0);
    setSubtotal(currentSubtotal);
    let discount = 0;
    const perc = parseFloat(discountPercentage); 
    const val = parseFloat(discountValue);   

    if (discountPercentage !== '' && !isNaN(perc) && perc >= 0) { 
        discount = (currentSubtotal * perc) / 100;
    } else if (discountValue !== '' && !isNaN(val) && val >= 0) { 
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
      setLoadingSale(true); setSaleError(''); 
      if (!selectedCustomer) { setSaleError('Debe seleccionar un cliente.'); setLoadingSale(false); return; }
      if (currentInvoiceItems.length === 0) { setSaleError('Debe añadir al menos un ítem a la factura.'); setLoadingSale(false); return; }
      
      for (const item of currentInvoiceItems) {
          if (item.item_type === 'product' && item.quantity <=0) {
              setSaleError(`El producto "${item.description}" tiene cantidad inválida (${item.quantity}). Por favor, corríjalo o quítelo.`);
              setLoadingSale(false);
              return;
          }
      }
      
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
          payment_method: paymentMethod,
          discount_percentage: (discountPercentage !== '' && !isNaN(parseFloat(discountPercentage))) ? parseFloat(discountPercentage) : 0.0,
          discount_value: (discountValue !== '' && !isNaN(parseFloat(discountValue))) ? parseFloat(discountValue) : null,
          apply_iva: applyIVA,
      };
      if (saleData.discount_value !== null && saleData.discount_value > 0) {
          saleData.discount_percentage = 0.0;
      }
      
      try {
          const response = await billingService.createSale(saleData);
          setCompletedSaleData(response); 
          setShowInvoiceModal(true);    
          
          const productsData = await inventoryService.getProducts({ limit: 10000, active_only: true });
          const products = productsData || [];
          setAllProducts(products);
          setInitialAllProducts(JSON.parse(JSON.stringify(products)));

      } catch (error) {
          console.error("Error al crear la venta:", error.response?.data || error.message || error);
          let errMsg = 'Error al finalizar la venta.';
          if (error.response?.data?.detail) {
              if (typeof error.response.data.detail === 'string') {
                  errMsg += ` Detalle: ${error.response.data.detail}`;
              } else if (Array.isArray(error.response.data.detail)) {
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

  // --- JSX de la Página ---
  return (
    <div style={pageStyle}>
      <Link to="/dashboard">
        <button style={{...secondaryButtonStyle, marginBottom: '25px'}}>
          ← Volver al Inicio
        </button>
      </Link>
      <h2 style={{...sectionHeaderStyle, fontSize: '1.8em', borderBottom: 'none', marginBottom: '25px', color: '#1a2530'}}>Nueva Factura 🧾</h2>

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
                    <select value={searchDocType} onChange={(e) => setSearchDocType(e.target.value)} style={{...selectStyle, flexGrow: 0, minWidth: '100px', height:'47px'}}>
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
                            style={{...selectStyle, flexGrow: 0, minWidth: '130px', height:'47px'}}
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
                        style={{...selectStyle, width: '100%', height:'47px'}}
                        disabled={loadingProductsList || loadingServicesList}
                    >
                        <option value="">-- {(loadingProductsList || loadingServicesList) ? 'Cargando ítems...' : 'Seleccione un Producto o Servicio'} --</option>
                        {allProducts.length > 0 && (
                            <optgroup label="PRODUCTOS (Descripción - Stock - Valor)">
                                {allProducts.map(product => (
                                    <option 
                                        key={`product-${product.id}`} 
                                        value={`product-${product.id}`}
                                        disabled={product.quantity <= 0}
                                        style={product.quantity <= 0 ? {color: 'lightgrey', fontStyle: 'italic'} : {}}
                                    >
                                        {product.description} - Stock: {product.quantity} - Vlr: ${product.sale_value?.toFixed(2)}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {allServices.length > 0 && (
                            <optgroup label="SERVICIOS (Descripción - Valor)">
                                {allServices.map(service => (
                                    <option key={`service-${service.id}`} value={`service-${service.id}`}>
                                        {service.description} - Vlr: ${service.value?.toFixed(2)}
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
                        <p>Precio Unitario: ${(foundItem.item_type === 'product' ? foundItem.sale_value : foundItem.value)?.toFixed(2)}
                        {foundItem.item_type === 'product' && 
                         // Mostrar el stock visualmente disponible de allProducts para este ítem
                         ` - Stock Actual en Lista: ${allProducts.find(p=>p.id === foundItem.id)?.quantity ?? 'N/A'}` 
                        }
                        </p>
                        <div style={inputGroupStyle}>
                            <label htmlFor="quantityToAdd" style={{...labelStyle, marginBottom: 0, marginRight: '8px', flexGrow:0, whiteSpace:'nowrap' }}>Cantidad:</label>
                            <input id="quantityToAdd" type="number" value={quantityToAdd} 
                                    onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1" 
                                    style={{...inputStyle, width: '100px', flexGrow: '0', padding: '10px'}} />
                            <button onClick={handleAddItemToInvoice} style={{...successButtonStyle, flexGrow:1}}>Añadir a Factura</button>
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
                          placeholder="Valor" min="0" step="any" style={{...inputStyle, flexGrow: '0.5', width:'120px'}} />
                      <button onClick={handleAddTempService} style={infoButtonStyle}>Añadir Servicio Temp.</button>
                  </div>
                  {tempServiceError && <p style={errorStyle}>{tempServiceError}</p>}
                </section>
              </>
            )}

            {currentInvoiceItems.length > 0 && (
              <section style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>4. Ítems en la Factura Actual</h3>
                <div style={{overflowX: 'auto'}}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={tableHeaderStyle}>Descripción</th> 
                            <th style={{...tableHeaderStyle, textAlign:'center'}}>Cant.</th>
                            <th style={{...tableHeaderStyle, textAlign:'right'}}>Vlr. Unit.</th> 
                            <th style={{...tableHeaderStyle, textAlign:'right'}}>Vlr. Total</th>
                            <th style={{...tableHeaderStyle, textAlign:'center'}}>Acción</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentInvoiceItems.map((item, index) => (
                            <tr key={`${item.id}-${index}-${item.item_type}`}>
                            <td style={tableCellStyle}>{item.description}</td>
                            <td style={{...tableCellStyle, textAlign:'center'}}>{item.quantity}</td>
                            <td style={{...tableCellStyle, textAlign:'right'}}>${item.unit_price?.toFixed(2)}</td>
                            <td style={{...tableCellStyle, textAlign:'right'}}>${item.total_item_price?.toFixed(2)}</td>
                            <td style={{...tableCellStyle, textAlign:'center'}}>
                                <button onClick={() => handleRemoveItem(index)} style={{...dangerButtonStyle, padding:'8px 12px'}}>Quitar</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <div style={{textAlign: 'right', marginTop: '25px', fontSize: '1.2em', fontWeight:'bold'}}>
                    Subtotal: ${subtotal.toFixed(2)}
                </div>
              </section>
            )}

            {currentInvoiceItems.length > 0 && (
              <section style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>5. Resumen y Pago</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    <div>
                        <h4 style={{...labelStyle, fontSize:'1.1em', color: '#2c3e50', marginBottom:'15px'}}>Descuentos e Impuestos</h4>
                        <div style={{marginBottom: '15px'}}>
                            <label htmlFor="discountPercentage" style={labelStyle}>Descuento (%):</label>
                            <input 
                                id="discountPercentage" type="number" value={discountPercentage} 
                                onChange={handleDiscountPercentageChange}
                                min="0" max="100" 
                                step="1" // Correcto para enteros
                                placeholder="Ej: 5" style={inputStyle} 
                            />
                        </div>
                        <div style={{marginBottom: '20px'}}>
                            <label htmlFor="discountValue" style={labelStyle}>Descuento ($):</label>
                            <input 
                                id="discountValue" type="number" value={discountValue} 
                                onChange={handleDiscountValueChange}
                                min="0" 
                                step="1" // Correcto para enteros
                                placeholder="Ej: 10000" style={inputStyle} 
                            />
                        </div>
                        {storeConfig ? (
                            <div style={{display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                                <input type="checkbox" id="applyIVA" checked={applyIVA} onChange={(e) => setApplyIVA(e.target.checked)}
                                    style={{ width: '20px', height: '20px', marginRight: '10px', cursor: 'pointer', flexShrink:0 }} />
                                <label htmlFor="applyIVA" style={{...labelStyle, marginBottom:0, cursor: 'pointer', fontWeight:'normal'}}>Aplicar IVA ({storeConfig.iva_percentage}%)</label>
                            </div>
                        ) : <p style={{...errorStyle, fontSize:'0.9em'}}>Cargando configuración de IVA...</p>}
                    </div>
                    <div style={{borderLeft: '1px solid #ecf0f1', paddingLeft: '30px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                        <div>
                            <h4 style={{...labelStyle, fontSize:'1.1em', color: '#2c3e50', marginBottom:'15px'}}>Método de Pago</h4>
                            <div style={{marginBottom: '25px'}}>
                                <label htmlFor="paymentMethod" style={labelStyle}>Seleccione:</label>
                                <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{...selectStyle, width:'100%', padding: '12px', height:'47px'}}>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta C/D</option> 
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style={{fontSize: '1.1em', lineHeight: '1.8', marginTop: 'auto'}}>
                            <p style={{display:'flex', justifyContent:'space-between'}}><span>Subtotal:</span> <strong>${subtotal.toFixed(2)}</strong></p>
                            <p style={{display:'flex', justifyContent:'space-between'}}><span>Descuento Aplicado:</span> <strong style={{color:'#dc3545'}}>- ${discountAmountApplied.toFixed(2)}</strong></p>
                            <p style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #dee2e6', paddingBottom:'8px', marginBottom:'8px'}}>
                              <span>IVA ({applyIVA && storeConfig ? storeConfig.iva_percentage : 0}%):</span> 
                              <strong style={{color:'#28a745'}}>+ ${ivaAmountApplied.toFixed(2)}</strong>
                            </p>
                            <h3 style={{color: '#28a745', marginTop: '15px', display:'flex', justifyContent:'space-between', fontSize:'1.4em'}}>
                              <span>Total a Pagar:</span> 
                              <strong>${totalAmount.toFixed(2)}</strong>
                            </h3>
                        </div>
                    </div>
                </div>
              </section>
            )}

            {/* BOTÓN DE FINALIZAR VENTA */}
            {saleError && !showInvoiceModal && <p style={{...errorStyle, fontSize: '1.1em', textAlign:'center', marginTop:'20px'}}>{saleError}</p>}
            
            {currentInvoiceItems.length > 0 && selectedCustomer && !showInvoiceModal && (
              <div style={{textAlign: 'center', marginTop: '40px', marginBottom: '20px'}}>
                  <button
                      onClick={handleFinalizeSale}
                      disabled={loadingSale}
                      style={{ ...primaryButtonStyle, padding: '15px 35px', fontSize: '1.3em', backgroundColor:'#28a745', borderColor:'#28a745' }}
                  >
                      {loadingSale ? 'Procesando Venta...' : '✅ Finalizar y Generar Venta'}
                  </button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

export default BillingPage;