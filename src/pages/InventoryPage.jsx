// src/pages/InventoryPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import authService from '../services/authService';

// CSS (se mantiene)
const numberInputStyleFix = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

// Estilos (se mantienen de la versión anterior que te gustó)
const pageOverallStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', color: 'white' };
const formSectionBoxStyle = { border: '1px solid #444', backgroundColor: '#222', padding: '20px', marginBottom: '25px', borderRadius: '8px' };
const formFieldStyle = { display: 'flex', flexDirection: 'column', marginBottom: '16px', flex: 1 };
const formFieldStyleFullWidth = { display: 'flex', flexDirection: 'column', marginBottom: '16px' };
const formFieldHorizontalAlignStyle = { display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '16px'};
const formCheckboxContainerStyle = { ...formFieldHorizontalAlignStyle };
const formLabelStyle = { display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.95em' };
const formInputStyle = { width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white'};
const formSelectStyle = { ...formInputStyle };
const formButtonStyle = { padding: '10px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.95em' }; 
const formCheckboxLabelStyle = { marginRight: '10px', fontWeight:'bold', fontSize: '0.95em' };
const formCheckboxInputStyle = { transform: 'scale(1.2)', cursor: 'pointer', marginRight: '5px', verticalAlign: 'middle' };
const formRowStyle = { display: 'flex', gap: '20px', marginBottom: '0' }; 

const tableHeaderStyle = { borderBottom: '2px solid #555', padding: '10px', textAlign: 'left', color: '#ddd' };
const tableCellStyle = { borderBottom: '1px solid #444', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };
const actionButtonStyleOriginal = { marginRight: '5px', marginBottom: '5px', padding: '6px 10px', fontSize: '0.9em', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white' };

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeView, setActiveView] = useState('list'); 
  
  const [newProduct, setNewProduct] = useState({
    code: '', description: '', brand: '', category: '',
    quantity: '', cost_value: '', sale_value: '',
  });
  const [editingProductData, setEditingProductData] = useState(null); 
  const [editProductFormData, setEditProductFormData] = useState({
    id: null, code: '', description: '', brand: '', category: '',
    cost_value: '', sale_value: '', is_active: true
  });
  const [adjustingStockProductData, setAdjustingStockProductData] = useState(null);
  const [adjustStockFormData, setAdjustStockFormData] = useState({ quantity_to_add: '', reason: '', notes: '' });
  
  const [viewingHistoryProductData, setViewingHistoryProductData] = useState(null);
  const [productHistory, setProductHistory] = useState([]);
  const [loadingProductHistory, setLoadingProductHistory] = useState(false);

  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editProductError, setEditProductError] = useState('');
  const [editProductSuccess, setEditProductSuccess] = useState('');
  const [inactivateProductMessage, setInactivateProductMessage] = useState('');
  const [adjustStockError, setAdjustStockError] = useState('');
  const [adjustStockSuccess, setAdjustStockSuccess] = useState('');
  const [historyError, setHistoryError] = useState('');
  
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEditProduct, setLoadingEditProduct] = useState(false);
  const [loadingAdjustStock, setLoadingAdjustStock] = useState(false);

  const [searchIdInputProd, setSearchIdInputProd] = useState('');
  const [searchCodeInputProd, setSearchCodeInputProd] = useState('');
  const [foundProductData, setFoundProductData] = useState(null); 
  const [specificProductSearchError, setSpecificProductSearchError] = useState('');
  const [loadingSpecificProductSearch, setLoadingSpecificProductSearch] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser ? currentUser.role : null;
  const canManage = userRole === 'admin' || userRole === 'soporte';

  useEffect(() => {
    if (activeView === 'list') { // Solo cargar productos si la vista es la lista principal
        fetchProducts();
    }
    const styleSheet = document.createElement("style");
    styleSheet.innerText = numberInputStyleFix;
    document.head.appendChild(styleSheet);
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, [activeView]); // Recargar si activeView cambia a 'list'

  const fetchProducts = async (params = {}) => {
    setLoading(true); setError('');
    try {
      const data = await inventoryService.getProducts({ active_only: null, ...params });
      if (!params.id && !params.code && !params.search) {
          setProducts(data);
      }
    } catch (err) {
      setError('Error al cargar productos: ' + (err.detail || err.message || ''));
    } finally { setLoading(false); }
  };
  
  const clearAllMessagesAndData = () => {
    setCreateError(''); setCreateSuccess('');
    setEditProductError(''); setEditProductSuccess('');
    setInactivateProductMessage('');
    setAdjustStockError(''); setAdjustStockSuccess('');
    setHistoryError('');
    setSpecificProductSearchError('');
    
    setNewProduct({ code: '', description: '', brand: '', category: '', quantity: '', cost_value: '', sale_value: '' });
    setEditingProductData(null); 
    setEditProductFormData({ id: null, code: '', description: '', brand: '', category: '', cost_value: '', sale_value: '', is_active: true });
    setAdjustingStockProductData(null); 
    setAdjustStockFormData({ quantity_to_add: '', reason: '', notes: '' });
    setViewingHistoryProductData(null);
    setProductHistory([]);
    setFoundProductData(null);
    // No limpiar los inputs de búsqueda aquí, se limpian con su propio botón o al cambiar de vista principal
  };
  
  const switchToView = (viewName, reloadListIfList = false) => {
    clearAllMessagesAndData(); // Limpia datos de formularios y errores
    setActiveView(viewName);
    if (viewName === 'list' && reloadListIfList) {
      fetchProducts();
    }
  };

  // --- FUNCIÓN handleCancelAction DEFINIDA AQUÍ ---
  const handleCancelAction = () => { 
    switchToView('list', true); 
  };

  const handleInputChange = (event, setStateFunction) => {
    const { name, value, type, checked } = event.target;
    let processedValue = type === 'checkbox' ? checked : value;

    if (name === "value" || name === "cost_value" || name === "sale_value") { 
        processedValue = value.replace(/[^0-9.]/g, '');
        const parts = processedValue.split('.');
        if (parts.length > 2) {
            processedValue = parts[0] + '.' + parts.slice(1).join('');
        }
    } else if (name === "quantity") { 
        processedValue = value.replace(/[^0-9]/g, '');
    } else if (name === "quantity_to_add") {
        // Permite un '-' opcional al inicio, y luego solo números.
        // Si el valor es solo '-', lo permite para UX.
        if (value === "-") {
            processedValue = "-";
        } else {
            let numPart = value.replace(/[^-0-9]/g, ''); // Quitar caracteres no válidos
            if (numPart.startsWith('-')) {
                processedValue = '-' + numPart.substring(1).replace(/-/g, ''); // Mantener solo el primer '-'
            } else {
                processedValue = numPart.replace(/-/g, ''); // Quitar todos los '-' si no está al inicio
            }
        }
    } else if (name === "code") { 
        processedValue = value.replace(/\s+/g, '').toUpperCase();
    }
    
    setStateFunction(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleCreateProductSubmit = async (event) => {
    event.preventDefault();
    setCreateError(''); setCreateSuccess(''); setLoadingCreate(true);
    const quantity = parseInt(newProduct.quantity, 10);
    const cost_value = parseFloat(newProduct.cost_value);
    const sale_value = parseFloat(newProduct.sale_value);

    if (!newProduct.code || !newProduct.description || isNaN(quantity) || quantity < 0 || isNaN(cost_value) || cost_value < 0 || isNaN(sale_value) || sale_value < 0) {
      setCreateError('Campos obligatorios (Código, Descripción) y valores numéricos válidos y no negativos requeridos.');
      setLoadingCreate(false); return;
    }
    const productDataToSend = { ...newProduct, quantity, cost_value, sale_value, brand: newProduct.brand.trim() === '' ? null : newProduct.brand.trim(), category: newProduct.category.trim() === '' ? null : newProduct.category.trim() };
    try {
      await inventoryService.createProduct(productDataToSend);
      setCreateSuccess('¡Producto creado exitosamente!');
      switchToView('list', true);
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      let detailMessage = 'Error desconocido.';
      if (err.response && err.response.data && err.response.data.detail) { detailMessage = err.response.data.detail; } 
      else if (err.message) { detailMessage = err.message; }
      if (typeof detailMessage === 'string' && detailMessage.toLowerCase().includes("ya existe un producto con este código")) {
        setCreateError("Error al crear producto: El código de producto ingresado ya existe.");
      } else if (typeof detailMessage === 'string') { setCreateError('El código de producto ingresado ya existe. ');
      } else if (Array.isArray(detailMessage)) { setCreateError('Error de validación: ' + detailMessage.map(d => `${d.loc.join('->')}: ${d.msg}`).join('; '));
      } else { setCreateError('Error al crear producto: ' + JSON.stringify(detailMessage)); }
      setTimeout(() => setCreateError(''), 3000);
    } finally { setLoadingCreate(false); }
  };
  
  const handleEditProductClick = (product) => {
    clearAllMessagesAndData(); 
    setActiveView('edit');     
    setEditingProductData(product); 
    setEditProductFormData({  
      id: product.id, code: product.code, description: product.description || '',
      brand: product.brand || '', category: product.category || '',
      cost_value: product.cost_value != null ? String(product.cost_value) : '',
      sale_value: product.sale_value != null ? String(product.sale_value) : '',
      is_active: product.is_active !== undefined ? product.is_active : true,
    });
  };

  const handleUpdateProductDetailsSubmit = async (event) => {
    event.preventDefault();
    if (!editProductFormData.id) return; // Debería usar editingProductData.id si ese es el que tiene el producto
    setLoadingEditProduct(true); setEditProductError(''); setEditProductSuccess('');
    const cost_value = parseFloat(editProductFormData.cost_value);
    const sale_value = parseFloat(editProductFormData.sale_value);

    if (!editProductFormData.description || isNaN(cost_value) || cost_value < 0 || isNaN(sale_value) || sale_value < 0) {
      setEditProductError('Descripción es obligatoria y valores numéricos deben ser válidos y no negativos.');
      setLoadingEditProduct(false); return;
    }
    const { id, code, ...baseDataFromForm } = editProductFormData; 
    const dataToUpdate = { description: baseDataFromForm.description, brand: baseDataFromForm.brand.trim() === '' ? null : baseDataFromForm.brand.trim(), category: baseDataFromForm.category.trim() === '' ? null : baseDataFromForm.category.trim(), cost_value, sale_value, is_active: baseDataFromForm.is_active, };
    try {
      await inventoryService.updateProductDetails(editingProductData.id, dataToUpdate); // Usar editingProductData.id
      setEditProductSuccess('¡Producto actualizado exitosamente!');
      switchToView('list', true);
      setTimeout(() => setEditProductSuccess(''), 3000);
    } catch (err) {
      let e = 'Error al actualizar producto: ';
      if (err.detail && Array.isArray(err.detail)) { e += err.detail.map(d=>d.msg).join(', ');}
      else if (err.detail) { e += JSON.stringify(err.detail); }
      else {e += err.message || 'Error desconocido.';}
      setEditProductError(e); setTimeout(() => setEditProductError(''), 7000);
    } finally { setLoadingEditProduct(false); }
  };

  const handleInactivateProductClick = async (product) => {
    setInactivateProductMessage('');
    if (window.confirm(`¿Estás seguro de que deseas inactivar el producto "${product.description}" (Código: ${product.code})?`)) {
      try {
        await inventoryService.inactivateProduct(product.id);
        setInactivateProductMessage(`Producto "${product.description}" inactivado correctamente.`);
        fetchProducts(); 
        if (foundProductData && foundProductData.id === product.id) {
            setFoundProductData({...foundProductData, is_active: false});
        }
        setTimeout(() => setInactivateProductMessage(''), 3000);
      } catch (err) {
        setInactivateProductMessage('Error al inactivar producto: ' + (err.detail || err.message || JSON.stringify(err)));
        setTimeout(() => setInactivateProductMessage(''), 5000);
      }
    }
  };

  const handleAdjustStockClick = (product) => {
    clearAllMessagesAndData();
    setActiveView('adjust');
    setAdjustingStockProductData(product);
    setAdjustStockFormData({ quantity_to_add: '', reason: '', notes: '' });
  };

  const handleAdjustStockSubmit = async (event) => {
    event.preventDefault();
    if (!adjustingStockProductData) return;
    setLoadingAdjustStock(true); setAdjustStockError(''); setAdjustStockSuccess('');
    const quantity_to_add_str = String(adjustStockFormData.quantity_to_add); // Trabajar con string para parseInt
    
    // Validar si es un número válido (incluyendo negativos)
    if (!/^-?\d+$/.test(quantity_to_add_str) || quantity_to_add_str === '-' ) {
         setAdjustStockError('La cantidad a añadir/restar debe ser un número entero válido.');
         setLoadingAdjustStock(false); 
         return;
    }
    const quantity_to_add = parseInt(quantity_to_add_str, 10);

    if (isNaN(quantity_to_add)) { 
      setAdjustStockError('La cantidad a añadir/restar debe ser un número válido.');
      setLoadingAdjustStock(false); return;
    }
    if (!adjustStockFormData.reason.trim()) {
      setAdjustStockError('El motivo del ajuste es obligatorio.');
      setLoadingAdjustStock(false); return;
    }
    const payload = { quantity_to_add, reason: adjustStockFormData.reason, notes: adjustStockFormData.notes.trim() === '' ? null : adjustStockFormData.notes.trim() };
    try {
      await inventoryService.adjustProductStock(adjustingStockProductData.id, payload);
      setAdjustStockSuccess('¡Stock ajustado exitosamente!');
      switchToView('list', true); 
    } catch (err) {
      let e = 'Error al ajustar stock: ';
      if (err.detail && Array.isArray(err.detail)) { e += err.detail.map(d=>d.msg).join(', ');}
      else if (err.detail) { e += JSON.stringify(err.detail); }
      else {e += err.message || 'Error desconocido.';}
      setAdjustStockError(e); setTimeout(() => setAdjustStockError(''), 7000);
    } finally { setLoadingAdjustStock(false); }
  };

  const handleViewHistoryClick = async (product) => {
    clearAllMessagesAndData();
    setActiveView('history');
    setViewingHistoryProductData(product);
    setLoadingProductHistory(true); setProductHistory([]); setHistoryError('');
    try {
      const historyData = await inventoryService.getInventoryHistory({ product_id: product.id, limit: 50 });
      setProductHistory(historyData);
    } catch (err) {
      setHistoryError('Error al cargar historial: ' + (err.detail || err.message || ''));
    } finally { setLoadingProductHistory(false); }
  };

  const handleSearchProductByIdSubmit = async (event) => { 
    event.preventDefault();
    if (!searchIdInputProd.trim()) {
      setSpecificProductSearchError('Por favor, ingrese un Código de Barras para buscar.');
      setTimeout(() => setSpecificProductSearchError(''), 3000); return;
    }
    clearAllMessagesAndData();
    setLoadingSpecificProductSearch(true);
    setFoundProductData(null); 
    try {
      const data = await inventoryService.getProductById(searchIdInputProd); 
      setFoundProductData(data); // Esto establece los datos para la vista 'foundProduct'
      setActiveView('foundProduct'); // Asegurarse de cambiar la vista aquí
      if (!data) {
          setSpecificProductSearchError(`Producto con Código de Barras ${searchIdInputProd} no encontrado.`);
          setTimeout(() => setSpecificProductSearchError(''), 3000);
      }
    } catch (err) {
      setSpecificProductSearchError(`Error al buscar por Código de Barras ${searchIdInputProd}: ` + (err.detail || err.message || 'Producto no encontrado.'));
      setFoundProductData(null); 
      setActiveView('list'); // Volver a la lista si hay error
      setTimeout(() => setSpecificProductSearchError(''), 3000);
    } finally {
      setLoadingSpecificProductSearch(false);
    }
  };

  const handleSearchProductByCodeSubmit = async (event) => { 
    event.preventDefault();
    if (!searchCodeInputProd.trim()) {
      setSpecificProductSearchError('Por favor, ingrese un código de producto para buscar.');
      setTimeout(() => setSpecificProductSearchError(''), 3000); return;
    }
    clearAllMessagesAndData();
    setLoadingSpecificProductSearch(true);
    setFoundProductData(null); 
    try {
      const data = await inventoryService.getProductByCode(searchCodeInputProd.toUpperCase());
      setFoundProductData(data);
      setActiveView('foundProduct'); // Asegurarse de cambiar la vista aquí
      if (!data) {
          setSpecificProductSearchError(`Producto con código "${searchCodeInputProd.toUpperCase()}" no encontrado.`);
          setTimeout(() => setSpecificProductSearchError(''), 3000);
      }
    } catch (err) {
      setSpecificProductSearchError(`Error al buscar por código "${searchCodeInputProd.toUpperCase()}": ` + (err.detail || err.message || 'Producto no encontrado.'));
      setFoundProductData(null);
      setActiveView('list'); // Volver a la lista si hay error
      setTimeout(() => setSpecificProductSearchError(''), 3000);
    } finally {
      setLoadingSpecificProductSearch(false);
    }
  };
  
  return (
    <div style={pageOverallStyle}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard"><button style={{ ...formButtonStyle, backgroundColor: '#6c757d', padding: '8px 15px', fontSize: '14px' }}>← Volver</button></Link>
        {canManage && activeView === 'list' && (
          <button onClick={() => { clearAllMessagesAndData(); setActiveView('create'); setNewProduct({ code: '', description: '', brand: '', category: '', quantity: '', cost_value: '', sale_value: '' }); }}
            style={{ ...formButtonStyle, backgroundColor: '#007bff' }}
          >Registrar Nuevo Producto</button>
        )}
        {activeView !== 'list' && (
          <button onClick={() => switchToView('list', activeView !== 'foundProduct' || !foundProductData)} // Recargar si no veníamos de un producto encontrado exitoso
            style={{ ...formButtonStyle, backgroundColor: '#6c757d' }}
          >{activeView === 'create' ? 'Cancelar Registro' : 
            (activeView === 'edit' ? 'Cancelar Edición': 
            (activeView === 'adjust' ? 'Cancelar Ajuste' : 
            (activeView === 'history' ? 'Cerrar Historial' : 
            (activeView === 'foundProduct' ? 'Volver a Lista' : 'Cancelar'))))}</button>
        )}
      </div>

      <h2>Gestión de Inventario</h2>
      
      {/* ... (Mensajes de notificación se mantienen igual) ... */}
      {createSuccess && <p style={{ color: 'lightgreen', textAlign: 'center' }}>{createSuccess}</p>}
      {createError && <p style={{ color: '#ff7b7b', whiteSpace: 'pre-wrap', textAlign: 'center' }}>{createError}</p>}
      {editProductSuccess && <p style={{ color: 'lightgreen', textAlign: 'center' }}>{editProductSuccess}</p>}
      {editProductError && <p style={{ color: '#ff7b7b', whiteSpace: 'pre-wrap', textAlign: 'center' }}>{editProductError}</p>}
      {inactivateProductMessage && <p style={{ color: inactivateProductMessage.startsWith('Error') ? '#ff7b7b' : 'lightgreen', textAlign: 'center' }}>{inactivateProductMessage}</p>}
      {adjustStockSuccess && <p style={{ color: 'lightgreen', textAlign: 'center' }}>{adjustStockSuccess}</p>}
      {adjustStockError && <p style={{ color: '#ff7b7b', whiteSpace: 'pre-wrap', textAlign: 'center' }}>{adjustStockError}</p>}
      {historyError && <p style={{ color: 'red', textAlign: 'center' }}>{historyError}</p>}
      {specificProductSearchError && <p style={{ color: 'red', textAlign: 'center' }}>{specificProductSearchError}</p>}


      {/* Sección de Búsqueda */}
      {activeView === 'list' && (
        <div style={formSectionBoxStyle}>
          <h4>Buscar Producto Específico</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <form onSubmit={handleSearchProductByIdSubmit} style={{ flex: 1, minWidth: '280px' }}>
              <div style={formFieldStyle}>
                <label htmlFor="searchIdInputProd" style={formLabelStyle}>Buscar por Código de Barras (ID):</label>
                <div style={{ display: 'flex' }}>
                  <input type="number" id="searchIdInputProd" value={searchIdInputProd}
                         min="0" // <-- AÑADIDO: Para indicar que el valor mínimo es 0
                         onChange={(e) => {
                         const inputValue = e.target.value;
         // Procesa el valor para permitir solo dígitos (números no negativos)
                         const processedValue = inputValue.replace(/[^0-9]/g, ''); 
                         setSearchIdInputProd(processedValue);
                         if(specificProductSearchError) setSpecificProductSearchError('');
                         }} 
                         placeholder="ID numérico (Código de Barras)" style={{...formInputStyle, marginBottom: 0, flexGrow:1}} />
                  <button type="submit" disabled={loadingSpecificProductSearch} style={{ ...formButtonStyle, backgroundColor: '#007bff', padding: '10px', marginLeft: '10px' }}>Buscar</button>
                </div>
              </div>
            </form>
            <form onSubmit={handleSearchProductByCodeSubmit} style={{ flex: 1, minWidth: '280px' }}>
              <div style={formFieldStyle}>
                <label htmlFor="searchCodeInputProd" style={formLabelStyle}>Buscar por Código Interno:</label>
                <div style={{ display: 'flex' }}>
                  <input type="text" id="searchCodeInputProd" value={searchCodeInputProd} 
                         onChange={(e) => {setSearchCodeInputProd(e.target.value.toUpperCase()); if(specificProductSearchError) setSpecificProductSearchError('');}} 
                         placeholder="Código del producto" style={{...formInputStyle, marginBottom:0, flexGrow:1, textTransform: 'uppercase'}} />
                  <button type="submit" disabled={loadingSpecificProductSearch} style={{ ...formButtonStyle, backgroundColor: '#007bff', padding: '10px', marginLeft: '10px' }}>Buscar</button>
                </div>
              </div>
            </form>
          </div>
          {loadingSpecificProductSearch && <p style={{marginTop: '10px', textAlign:'center'}}>Buscando producto...</p>}
        </div>
      )}

      {/* Vista de Producto Encontrado */}
      {activeView === 'foundProduct' && foundProductData && (
        <div style={{...formSectionBoxStyle, borderColor: '#28a745'}}>
          <h3>Producto Encontrado</h3>
          {/* ... (resto del JSX para mostrar foundProductData se mantiene igual) ... */}
          <p><strong>Código de Barras (ID):</strong> {foundProductData.id}</p>
          <p><strong>Código Interno:</strong> {foundProductData.code}</p>
          <p><strong>Descripción:</strong> {foundProductData.description}</p>
          <p><strong>Marca:</strong> {foundProductData.brand || '-'}</p>
          <p><strong>Categoría:</strong> {foundProductData.category || '-'}</p>
          <p><strong>Cantidad en Stock:</strong> {foundProductData.quantity}</p>
          <p><strong>Valor Costo:</strong> {foundProductData.cost_value != null ? foundProductData.cost_value.toFixed(2) : 'N/A'}</p>
          <p><strong>Valor Venta:</strong> {foundProductData.sale_value != null ? foundProductData.sale_value.toFixed(2) : 'N/A'}</p>
          <p><strong>Estado:</strong> 
            <span style={{ color: foundProductData.is_active ? 'lightgreen' : '#ff7b7b', fontWeight: 'bold', marginLeft: '5px' }}>
              {foundProductData.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </p>
          {canManage && (
            <div style={{marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
              <button onClick={() => handleEditProductClick(foundProductData)} style={{...formButtonStyle, backgroundColor: '#ffc107', color: '#212529'}}>Editar Detalles</button>
              <button onClick={() => handleAdjustStockClick(foundProductData)} style={{...formButtonStyle, backgroundColor: '#17a2b8'}}>Ajustar Stock</button>
              <button onClick={() => handleViewHistoryClick(foundProductData)} style={{...formButtonStyle, backgroundColor: '#6c757d'}}>Ver Historial</button>
            </div>
          )}
        </div>
      )}
      
      {/* Formulario de Creación */}
      {activeView === 'create' && canManage && (
        <div style={formSectionBoxStyle}>
          <h3>Registrar Nuevo Producto</h3>
          <form onSubmit={handleCreateProductSubmit}>
            {/* ... (JSX de los campos del formulario de creación, usando los estilos definidos) ... */}
            <div style={formRowStyle}>
              <div style={formFieldStyle}><label htmlFor="code_new" style={formLabelStyle}>Código Interno: *</label><input type="text" id="code_new" name="code" value={newProduct.code} onChange={(e) => handleInputChange(e, setNewProduct)} required style={{...formInputStyle, textTransform: 'uppercase'}} /></div>
              <div style={{...formFieldStyle, flex: 2}}><label htmlFor="description_new" style={formLabelStyle}>Descripción: *</label><input type="text" id="description_new" name="description" value={newProduct.description} onChange={(e) => handleInputChange(e, setNewProduct)} required style={formInputStyle} /></div>
            </div>
            <div style={formRowStyle}>
              <div style={formFieldStyle}><label htmlFor="brand_new" style={formLabelStyle}>Marca:*</label><input type="text" id="brand_new" name="brand" value={newProduct.brand} onChange={(e) => handleInputChange(e, setNewProduct)} style={formInputStyle} /></div>
              <div style={formFieldStyle}><label htmlFor="category_new" style={formLabelStyle}>Categoría:*</label><input type="text" id="category_new" name="category" value={newProduct.category} onChange={(e) => handleInputChange(e, setNewProduct)} style={formInputStyle} /></div>
            </div>
            <div style={formRowStyle}>
              <div style={formFieldStyle}><label htmlFor="quantity_new" style={formLabelStyle}>Cantidad Inicial: *</label><input type="text" pattern="[0-9]*" title="Solo números enteros no negativos" id="quantity_new" name="quantity" value={newProduct.quantity} onChange={(e) => handleInputChange(e, setNewProduct)} required style={formInputStyle} /></div>
              <div style={formFieldStyle}><label htmlFor="cost_value_new" style={formLabelStyle}>Valor Costo: *</label><input type="text" pattern="[0-9]*\.?[0-9]{0,2}" title="Número con hasta 2 decimales" id="cost_value_new" name="cost_value" value={newProduct.cost_value} onChange={(e) => handleInputChange(e, setNewProduct)} required style={formInputStyle} /></div>
              <div style={formFieldStyle}><label htmlFor="sale_value_new" style={formLabelStyle}>Valor Venta: *</label><input type="text" pattern="[0-9]*\.?[0-9]{0,2}" title="Número con hasta 2 decimales" id="sale_value_new" name="sale_value" value={newProduct.sale_value} onChange={(e) => handleInputChange(e, setNewProduct)} required style={formInputStyle} /></div>
            </div>
            <button type="submit" disabled={loadingCreate} style={{ ...formButtonStyle, backgroundColor: '#28a745', marginTop: '15px' }}>{loadingCreate ? 'Guardando...' : 'Guardar Producto'}</button>
          </form>
        </div>
      )}

      {/* Formulario de Edición */}
      {activeView === 'edit' && editingProductData && canManage && (
        <div style={{...formSectionBoxStyle, borderColor: '#007bff'}}>
          <h3>Editando Producto: {editProductFormData.description} (Cód: {editProductFormData.code})</h3>
          <form onSubmit={handleUpdateProductDetailsSubmit}>
            <div style={formFieldStyle}><label htmlFor="edit_code" style={formLabelStyle}>Código Interno: (No editable)</label><input type="text" id="edit_code" name="code" value={editProductFormData.code} readOnly style={{...formInputStyle, backgroundColor:'#444'}}/></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="edit_description" style={formLabelStyle}>Descripción: *</label><textarea id="edit_description" name="description" value={editProductFormData.description} onChange={(e) => handleInputChange(e, setEditProductFormData)} required rows="3" style={{...formInputStyle, resize:'vertical'}}/></div>
            <div style={formRowStyle}>
              <div style={formFieldStyle}><label htmlFor="edit_brand" style={formLabelStyle}>Marca:*</label><input type="text" id="edit_brand" name="brand" value={editProductFormData.brand} onChange={(e) => handleInputChange(e, setEditProductFormData)} style={formInputStyle} /></div>
              <div style={formFieldStyle}><label htmlFor="edit_category" style={formLabelStyle}>Categoría:*</label><input type="text" id="edit_category" name="category" value={editProductFormData.category} onChange={(e) => handleInputChange(e, setEditProductFormData)} style={formInputStyle} /></div>
            </div>
            <div style={formRowStyle}>
                <div style={formFieldStyle}><label htmlFor="edit_cost_value" style={formLabelStyle}>Valor de Costo: *</label><input type="text" pattern="[0-9]*\.?[0-9]{0,2}" title="Número con hasta 2 decimales" id="edit_cost_value" name="cost_value" value={editProductFormData.cost_value} onChange={(e) => handleInputChange(e, setEditProductFormData)} required style={formInputStyle} /></div>
                <div style={formFieldStyle}><label htmlFor="edit_sale_value" style={formLabelStyle}>Valor de Venta: *</label><input type="text" pattern="[0-9]*\.?[0-9]{0,2}" title="Número con hasta 2 decimales" id="edit_sale_value" name="sale_value" value={editProductFormData.sale_value} onChange={(e) => handleInputChange(e, setEditProductFormData)} required style={formInputStyle} /></div>
            </div>
            <div style={formCheckboxContainerStyle}> 
              <label htmlFor="edit_is_active" style={formCheckboxLabelStyle}>Producto Activo:</label>
              <input type="checkbox" id="edit_is_active" name="is_active" checked={editProductFormData.is_active} onChange={(e) => handleInputChange(e, setEditProductFormData)} style={formCheckboxInputStyle}/>
            </div>
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button type="submit" disabled={loadingEditProduct} style={{...formButtonStyle, backgroundColor: '#007bff'}}>{loadingEditProduct ? 'Actualizando...' : 'Actualizar Detalles'}</button>
                <button type="button" onClick={handleCancelAction} style={{...formButtonStyle, backgroundColor: '#6c757d'}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
      
      {/* Formulario de Ajuste de Stock */}
      {activeView === 'adjust' && adjustingStockProductData && canManage && (
         <div style={{...formSectionBoxStyle, borderColor: '#17a2b8'}}>
           <h3>Ajustar Stock de: {adjustingStockProductData.description} (Actual: {adjustingStockProductData.quantity})</h3>
           <form onSubmit={handleAdjustStockSubmit}>
             <div style={formFieldStyleFullWidth}><label htmlFor="quantity_to_add_adjust" style={formLabelStyle}>Cantidad a Añadir/Restar: *</label><input type="text" pattern="-?[0-9]+" title="Número entero (positivo o negativo)" id="quantity_to_add_adjust" name="quantity_to_add" value={adjustStockFormData.quantity_to_add} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} placeholder="Ej: 10 (sumar), -5 (restar)" required style={formInputStyle} /></div>
             <div style={formFieldStyleFullWidth}><label htmlFor="reason_adjust" style={formLabelStyle}>Motivo del Ajuste: *</label><input type="text" id="reason_adjust" name="reason" value={adjustStockFormData.reason} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} required style={formInputStyle} placeholder="Ej: Compra proveedor, Daño, Merma" /></div>
             <div style={formFieldStyleFullWidth}><label htmlFor="notes_adjust" style={formLabelStyle}>Notas (Opcional):</label><textarea id="notes_adjust" name="notes" rows="3" value={adjustStockFormData.notes} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} style={{...formInputStyle, resize: 'vertical'}} /></div>
             <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                 <button type="submit" disabled={loadingAdjustStock} style={{...formButtonStyle, backgroundColor: '#28a745'}}>{loadingAdjustStock ? 'Ajustando...' : 'Confirmar Ajuste'}</button>
                 <button type="button" onClick={handleCancelAction} style={{...formButtonStyle, backgroundColor: '#6c757d'}}>Cancelar</button>
             </div>
           </form>
         </div>
      )}

      {/* Vista de Historial */}
      {activeView === 'history' && viewingHistoryProductData && canManage && (
         <div style={{...formSectionBoxStyle, borderColor: '#6f42c1'}}>
           <h3>Historial de Movimientos: {viewingHistoryProductData.description} (Cód: {viewingHistoryProductData.code})</h3>
           {loadingProductHistory && <p style={{textAlign:'center'}}>Cargando historial...</p>}
           {historyError && <p style={{ color: 'red', textAlign:'center' }}>{historyError}</p>}
           {!loadingProductHistory && !historyError && productHistory.length === 0 && <p style={{textAlign:'center', fontStyle:'italic'}}>No hay movimientos de inventario para este producto.</p>}
           {/* ... (JSX de la tabla de historial se mantiene igual) ... */}
           {!loadingProductHistory && !historyError && productHistory.length > 0 && (
             <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #444', padding:'5px', borderRadius:'4px' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                 <thead><tr><th style={tableHeaderStyle}>Fecha</th><th style={tableHeaderStyle}>Tipo</th><th style={{...tableHeaderStyle, textAlign:'right'}}>Cant. Modif.</th><th style={{...tableHeaderStyle, textAlign:'right'}}>Nueva Cant.</th><th style={tableHeaderStyle}>Usuario (ID)</th><th style={tableHeaderStyle}>Notas</th></tr></thead>
                 <tbody>{productHistory.map(entry => (<tr key={entry.id}><td style={tableCellStyle}>{new Date(entry.date).toLocaleString()}</td><td style={tableCellStyle}>{entry.movement_type}</td><td style={{...tableCellStyle, textAlign:'right'}}>{entry.quantity_changed}</td><td style={{...tableCellStyle, textAlign:'right'}}>{entry.new_quantity}</td><td style={tableCellStyle}>{entry.user_id}</td><td style={tableCellStyle}>{entry.notes || '-'}</td></tr>))}</tbody>
               </table>
             </div>
           )}
         </div>
      )}
      
      {/* Listado de Productos */}
      {activeView === 'list' && (
        <>
          <hr style={{margin: '30px 0', borderColor: '#444'}} />
          <h3>Listado de Productos en Inventario</h3>
          {/* ... (JSX de la tabla de productos se mantiene igual) ... */}
          {loading && <p style={{textAlign:'center'}}>Cargando productos...</p>}
          {error && <p style={{ color: 'red', textAlign:'center' }}>{error}</p>}
          {!loading && !error && products.length === 0 && <p style={{textAlign:'center', fontStyle:'italic'}}>No hay productos registrados.</p>}
          {!loading && !error && products.length > 0 && (
            <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', minWidth:'1000px', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.9em' }}>
              <thead><tr><th style={tableHeaderStyle}>ID Barras</th><th style={tableHeaderStyle}>Código</th><th style={tableHeaderStyle}>Descripción</th><th style={tableHeaderStyle}>Marca</th><th style={tableHeaderStyle}>Categoría</th><th style={{...tableHeaderStyle, textAlign:'right'}}>Cant.</th><th style={{...tableHeaderStyle, textAlign:'right'}}>V. Costo</th><th style={{...tableHeaderStyle, textAlign:'right'}}>V. Venta</th><th style={tableHeaderStyle}>Estado</th>{canManage && <th style={tableHeaderStyle}>Acciones</th>}</tr></thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td style={tableCellStyle}>{product.id}</td><td style={{...tableCellStyle, textTransform: 'uppercase'}}>{product.code}</td>
                    <td style={tableCellStyle}>{product.description}</td><td style={tableCellStyle}>{product.brand || '-'}</td>
                    <td style={tableCellStyle}>{product.category || '-'}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{product.quantity}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{product.cost_value != null ? product.cost_value.toFixed(2) : '0.00'}</td>
                    <td style={{...tableCellStyle, textAlign:'right'}}>{product.sale_value != null ? product.sale_value.toFixed(2) : '0.00'}</td>
                    <td style={{...tableCellStyle, color: product.is_active ? 'lightgreen' : '#ff7b7b', fontWeight: 'bold' }}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    {canManage && (
                      <td style={{...tableCellStyle, whiteSpace: 'nowrap'}}>
                        <button onClick={() => handleEditProductClick(product)} style={{...actionButtonStyleOriginal, backgroundColor: '#007bff'}}>Editar</button>
                        <button onClick={() => handleAdjustStockClick(product)} style={{...actionButtonStyleOriginal, backgroundColor: '#17a2b8'}}>Ajustar Stock</button>
                        {product.is_active && (<button onClick={() => handleInactivateProductClick(product)} style={{...actionButtonStyleOriginal, backgroundColor: '#ffc107', color: '#212529'}}>Inactivar</button>)}
                        {!product.is_active && <span style={{color: '#888', marginRight: '5px', fontStyle: 'italic', fontSize:'0.9em'}}>(Inactivo)</span>}
                        <button onClick={() => handleViewHistoryClick(product)} style={{...actionButtonStyleOriginal, backgroundColor: '#6c757d'}}>Historial</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default InventoryPage;