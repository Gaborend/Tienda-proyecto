// src/pages/InventoryPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import inventoryService from '../services/inventoryService';
import authService from '../services/authService';

// CSS para ocultar los spinners de los inputs numéricos
const numberInputStyleFix = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield; /* Firefox */
  }
`;

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingStockProduct, setAdjustingStockProduct] = useState(null);
  const [viewingHistoryForProduct, setViewingHistoryForProduct] = useState(null);

  const [newProduct, setNewProduct] = useState({
    code: '', description: '', brand: '', category: '',
    quantity: '', cost_value: '', sale_value: '',
  });
  const [editProductFormData, setEditProductFormData] = useState({
    id: null, code: '', description: '', brand: '', category: '',
    cost_value: '', sale_value: '', is_active: true
  });
  const [adjustStockFormData, setAdjustStockFormData] = useState({ quantity_to_add: '', reason: '', notes: '' });
  
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
  const [foundProduct, setFoundProduct] = useState(null); 
  const [specificProductSearchError, setSpecificProductSearchError] = useState('');
  const [loadingSpecificProductSearch, setLoadingSpecificProductSearch] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser ? currentUser.role : null;
  const canManage = userRole === 'admin' || userRole === 'soporte';

  useEffect(() => {
    fetchProducts();
    const styleSheet = document.createElement("style");
    styleSheet.innerText = numberInputStyleFix;
    document.head.appendChild(styleSheet);
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inventoryService.getProducts({ active_only: null });
      console.log("Productos recibidos del fetch:", JSON.stringify(data, null, 2));
      setProducts(data);
    } catch (err) {
      setError('Error al cargar la lista de productos. ' + (err.detail || err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event, setStateFunction) => {
    const { name, value, type, checked } = event.target;
    setStateFunction(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const resetFormsAndViews = () => {
    setShowCreateForm(false);
    setEditingProduct(null);
    setAdjustingStockProduct(null);
    setViewingHistoryForProduct(null);
    setFoundProduct(null); 
    setCreateError(''); setCreateSuccess('');
    setEditProductError(''); setEditProductSuccess('');
    setAdjustStockError(''); setAdjustStockSuccess('');
    setHistoryError('');
    setSpecificProductSearchError(''); 
    setSearchIdInputProd(''); 
    setSearchCodeInputProd(''); 
    setNewProduct({ code: '', description: '', brand: '', category: '', quantity: '', cost_value: '', sale_value: '' });
    setEditProductFormData({ id: null, code: '', description: '', brand: '', category: '', cost_value: '', sale_value: '', is_active: true });
    setAdjustStockFormData({ quantity_to_add: '', reason: '', notes: '' });
  };

const handleCreateProductSubmit = async (event) => {
    event.preventDefault();
    setCreateError(''); 
    setCreateSuccess(''); 
    setLoadingCreate(true);

    const quantity = parseInt(newProduct.quantity, 10);
    const cost_value = parseFloat(newProduct.cost_value);
    const sale_value = parseFloat(newProduct.sale_value);

    if (!newProduct.code || !newProduct.description || isNaN(quantity) || quantity < 0 || isNaN(cost_value) || cost_value < 0 || isNaN(sale_value) || sale_value < 0) {
      setCreateError('Campos obligatorios (Código, Descripción) y valores numéricos válidos y no negativos requeridos.');
      setLoadingCreate(false); 
      return;
    }
    
    const productDataToSend = { 
      ...newProduct, 
      quantity, 
      cost_value, 
      sale_value, 
      brand: newProduct.brand || null, 
      category: newProduct.category || null 
    };

    try {
      await inventoryService.createProduct(productDataToSend);
      setCreateSuccess('¡Producto creado exitosamente!');
      setNewProduct({ code: '', description: '', brand: '', category: '', quantity: '', cost_value: '', sale_value: '' });
      resetFormsAndViews(); 
      fetchProducts(); // Asegúrate que esta función se llame correctamente
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      console.log("Objeto de error completo en createProduct:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        // Este es el caso más común para errores de FastAPI con un 'detail' string
        let detailMessage = err.response.data.detail;
        if (typeof detailMessage === 'string' && detailMessage.toLowerCase().includes("ya existe un producto con este código")) {
          setCreateError("Error al crear producto: El código de producto ingresado ya existe. Por favor, use uno diferente.");
        } else if (typeof detailMessage === 'string') {
          setCreateError('Error al crear producto: ' + detailMessage);
        } else if (Array.isArray(detailMessage)) { // Para errores de validación Pydantic
          setCreateError('Error de validación: ' + detailMessage.map(d => `${d.loc.join('->')}: ${d.msg}`).join('; '));
        } else {
          setCreateError('Error al crear producto: ' + JSON.stringify(detailMessage));
        }
      } else if (err.message) {
        // Error de red u otro error de JS sin err.response
        setCreateError('Error al crear producto: ' + err.message);
      } else {
        // Fallback si ninguna de las anteriores funciona
        setCreateError('Error al crear producto: YA EXISTE UN PRODUCTO CON ESE CODIGO');
      }
    } finally { 
      setLoadingCreate(false); 
    }
  };
  
  const handleEditProductClick = (product) => {
    resetFormsAndViews(); 
    setEditingProduct(product);
    setEditProductFormData({
      id: product.id, code: product.code, description: product.description || '',
      brand: product.brand || '', category: product.category || '',
      cost_value: product.cost_value != null ? String(product.cost_value) : '',
      sale_value: product.sale_value != null ? String(product.sale_value) : '',
      is_active: product.is_active !== undefined ? product.is_active : true,
    });
  };

  const handleCancelEditProduct = () => {
    resetFormsAndViews();
  };

  const handleUpdateProductDetailsSubmit = async (event) => {
    event.preventDefault();
    if (!editProductFormData.id) return;
    setLoadingEditProduct(true); setEditProductError(''); setEditProductSuccess('');
    const cost_value = parseFloat(editProductFormData.cost_value);
    const sale_value = parseFloat(editProductFormData.sale_value);

    if (!editProductFormData.description || isNaN(cost_value) || cost_value < 0 || isNaN(sale_value) || sale_value < 0) {
      setEditProductError('Descripción es obligatoria y valores numéricos deben ser válidos y no negativos.');
      setLoadingEditProduct(false); return;
    }
    const { id, code, ...baseDataFromForm } = editProductFormData; 
    const dataToUpdate = { 
        description: baseDataFromForm.description,
        brand: baseDataFromForm.brand === '' ? null : baseDataFromForm.brand,
        category: baseDataFromForm.category === '' ? null : baseDataFromForm.category,
        cost_value, sale_value, is_active: baseDataFromForm.is_active,
    };
    console.log("Enviando para actualizar producto (ID:", id, "):", JSON.stringify(dataToUpdate, null, 2));
    try {
      await inventoryService.updateProductDetails(id, dataToUpdate);
      setEditProductSuccess('¡Producto actualizado exitosamente!');
      resetFormsAndViews(); fetchProducts();
      setTimeout(() => setEditProductSuccess(''), 3000);
    } catch (err) {
      let e = 'Error al actualizar producto: ' + (err.detail?.map(d=>d.msg).join(', ') || err.message || 'Error desconocido.');
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
        setTimeout(() => setInactivateProductMessage(''), 3000);
      } catch (err) {
        setInactivateProductMessage('Error al inactivar producto: ' + (err.detail || err.message || JSON.stringify(err)));
        setTimeout(() => setInactivateProductMessage(''), 5000);
      }
    }
  };

  const handleAdjustStockClick = (product) => {
    resetFormsAndViews();
    setAdjustingStockProduct(product);
    setAdjustStockFormData({ quantity_to_add: '', reason: '', notes: '' });
  };

  const handleCancelAdjustStock = () => {
    resetFormsAndViews();
  };

  const handleAdjustStockSubmit = async (event) => {
    event.preventDefault();
    if (!adjustingStockProduct) return;
    setLoadingAdjustStock(true); setAdjustStockError(''); setAdjustStockSuccess('');
    const quantity_to_add = parseInt(adjustStockFormData.quantity_to_add, 10);
    if (isNaN(quantity_to_add)) {
      setAdjustStockError('La cantidad a añadir/restar debe ser un número.');
      setLoadingAdjustStock(false); return;
    }
    if (!adjustStockFormData.reason.trim()) {
      setAdjustStockError('El motivo del ajuste es obligatorio.');
      setLoadingAdjustStock(false); return;
    }
    const payload = { quantity_to_add, reason: adjustStockFormData.reason, notes: adjustStockFormData.notes || null };
    try {
      await inventoryService.adjustProductStock(adjustingStockProduct.id, payload);
      setAdjustStockSuccess('¡Stock ajustado exitosamente!');
      resetFormsAndViews(); fetchProducts();
      setTimeout(() => setAdjustStockSuccess(''), 3000);
    } catch (err) {
      let e = 'Error al ajustar stock: ' + (err.detail || err.message || 'Error desconocido.');
      setAdjustStockError(e); setTimeout(() => setAdjustStockError(''), 7000);
    } finally { setLoadingAdjustStock(false); }
  };

  const handleViewHistoryClick = async (product) => {
    resetFormsAndViews();
    setViewingHistoryForProduct(product);
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
      return;
    }
    resetFormsAndViews(); 
    setLoadingSpecificProductSearch(true);
    try {
      const data = await inventoryService.getProductById(searchIdInputProd);
      setFoundProduct(data);
    } catch (err) {
      setSpecificProductSearchError(`Error al buscar producto por Código de Barras ${searchIdInputProd}: ` + (err.detail || err.message || 'Producto no encontrado.'));
      setFoundProduct(null); 
    } finally {
      setLoadingSpecificProductSearch(false);
    }
  };

  const handleSearchProductByCodeSubmit = async (event) => {
    event.preventDefault();
    if (!searchCodeInputProd.trim()) {
      setSpecificProductSearchError('Por favor, ingrese un código de producto para buscar.');
      return;
    }
    resetFormsAndViews(); 
    setLoadingSpecificProductSearch(true);
    try {
      const data = await inventoryService.getProductByCode(searchCodeInputProd);
      setFoundProduct(data);
    } catch (err) {
      setSpecificProductSearchError(`Error al buscar producto por código "${searchCodeInputProd}": ` + (err.detail || err.message || 'Producto no encontrado.'));
      setFoundProduct(null);
    } finally {
      setLoadingSpecificProductSearch(false);
    }
  };

  const displayMode = 
    foundProduct ? 'foundProduct' :
    showCreateForm ? 'create' :
    editingProduct ? 'edit' :
    adjustingStockProduct ? 'adjust' :
    viewingHistoryForProduct ? 'history' : 
    'list';

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard"><button style={{ padding: '8px 15px', fontSize: '14px' }}>← Volver al Dashboard</button></Link>
        {canManage && displayMode === 'list' && !foundProduct && (
          <button onClick={() => { resetFormsAndViews(); setShowCreateForm(true); }}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >Registrar Nuevo Producto</button>
        )}
        {displayMode !== 'list' && (
             <button onClick={resetFormsAndViews}
            style={{ padding: '10px 15px', backgroundColor:  '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
          >{displayMode === 'create' ? 'Cancelar Registro' : 
            (displayMode === 'edit' ? 'Cancelar Edición': 
            (displayMode === 'adjust' ? 'Cancelar Ajuste' : 
            (displayMode === 'history' ? 'Cerrar Historial' : 
            (displayMode === 'foundProduct' ? 'Limpiar Búsqueda y Volver' : 'Cancelar'))))}</button>
        )}
      </div>

      <h2>Gestión de Inventario</h2>
      
      {createSuccess && <p style={{ color: 'green' }}>{createSuccess}</p>}
      {createError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{createError}</p>}
      {editProductSuccess && <p style={{ color: 'green' }}>{editProductSuccess}</p>}
      {editProductError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{editProductError}</p>}
      {inactivateProductMessage && <p style={{ color: inactivateProductMessage.startsWith('Error') ? 'red' : 'green' }}>{inactivateProductMessage}</p>}
      {adjustStockSuccess && <p style={{ color: 'green' }}>{adjustStockSuccess}</p>}
      {adjustStockError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{adjustStockError}</p>}
      {historyError && <p style={{ color: 'red' }}>{historyError}</p>}
      {specificProductSearchError && <p style={{ color: 'red' }}>{specificProductSearchError}</p>}

      {displayMode === 'list' && (
        <div style={formContainerStyle}>
          <h4>Buscar Producto Específico</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <form onSubmit={handleSearchProductByIdSubmit} style={{ flex: 1, minWidth: '250px' }}>
              <label htmlFor="searchIdInputProd" style={{ display: 'block', marginBottom: '5px' }}>Código de Barra</label>
              <div style={{ display: 'flex' }}>
                <input type="number" id="searchIdInputProd" value={searchIdInputProd} 
                       onChange={(e) => setSearchIdInputProd(e.target.value)} 
                       placeholder="Escanea o ingresa Código de Barras" style={inputStyle} />
                <button type="submit" disabled={loadingSpecificProductSearch} style={{ padding: '8px 15px', marginLeft: '10px' }}>Buscar</button>
              </div>
            </form>
            <form onSubmit={handleSearchProductByCodeSubmit} style={{ flex: 2, minWidth: '300px' }}>
              <label htmlFor="searchCodeInputProd" style={{ display: 'block', marginBottom: '5px' }}>Buscar por Código:</label>
              <div style={{ display: 'flex' }}>
                <input type="text" id="searchCodeInputProd" value={searchCodeInputProd} 
                       onChange={(e) => setSearchCodeInputProd(e.target.value)} 
                       placeholder="Código del producto" style={inputStyle} />
                <button type="submit" disabled={loadingSpecificProductSearch} style={{ padding: '8px 15px', marginLeft: '10px' }}>Buscar</button>
              </div>
            </form>
          </div>
          {loadingSpecificProductSearch && <p style={{marginTop: '10px'}}>Buscando producto...</p>}
        </div>
      )}

      {displayMode === 'foundProduct' && foundProduct && (
        <div style={{ border: '1px solid #28a745', padding: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Producto Encontrado</h3>
          <p><strong>Código de barras</strong> {foundProduct.id}</p>
          <p><strong>Código:</strong> {foundProduct.code}</p>
          <p><strong>Descripción:</strong> {foundProduct.description}</p>
          <p><strong>Marca:</strong> {foundProduct.brand || '-'}</p>
          <p><strong>Categoría:</strong> {foundProduct.category || '-'}</p>
          <p><strong>Cantidad:</strong> {foundProduct.quantity}</p>
          <p><strong>Costo:</strong> {foundProduct.cost_value != null ? foundProduct.cost_value.toFixed(2) : 'N/A'}</p>
          <p><strong>Venta:</strong> {foundProduct.sale_value != null ? foundProduct.sale_value.toFixed(2) : 'N/A'}</p>
          <p><strong>Estado:</strong> {foundProduct.is_active ? 'Activo' : 'Inactivo'}</p>
          {canManage && (
            <div style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
              <button onClick={() => handleEditProductClick(foundProduct)} style={actionButtonStyle}>Editar este Producto</button>
              <button onClick={() => handleAdjustStockClick(foundProduct)} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>Ajustar Stock</button>
              <button onClick={() => handleViewHistoryClick(foundProduct)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Ver Historial</button>
            </div>
          )}
        </div>
      )}
      
      {displayMode === 'create' && canManage && (
        <div style={formContainerStyle}>
          <h3>Registrar Nuevo Producto</h3>
          <form onSubmit={handleCreateProductSubmit}>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="code_new">Código Interno: *</label><input type="text" id="code_new" name="code" value={newProduct.code} onChange={(e) => handleInputChange(e, setNewProduct)} required style={inputStyle} /></div><div style={{...formFieldStyle, flex: 2}}><label htmlFor="description_new">Descripción: *</label><input type="text" id="description_new" name="description" value={newProduct.description} onChange={(e) => handleInputChange(e, setNewProduct)} required style={inputStyle} /></div></div>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="brand_new">Marca:*</label><input type="text" id="brand_new" name="brand" value={newProduct.brand} onChange={(e) => handleInputChange(e, setNewProduct)} style={inputStyle} /></div><div style={formFieldStyle}><label htmlFor="category_new">Categoría:*</label><input type="text" id="category_new" name="category" value={newProduct.category} onChange={(e) => handleInputChange(e, setNewProduct)} style={inputStyle} /></div></div>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="quantity_new">Cantidad Inicial: *</label><input type="number" id="quantity_new" name="quantity" value={newProduct.quantity} onChange={(e) => handleInputChange(e, setNewProduct)} required min="0" style={inputStyle} /></div><div style={formFieldStyle}><label htmlFor="cost_value_new">Valor Costo: *</label><input type="number" id="cost_value_new" name="cost_value" value={newProduct.cost_value} onChange={(e) => handleInputChange(e, setNewProduct)} required min="0" step="any" style={inputStyle} /></div><div style={formFieldStyle}><label htmlFor="sale_value_new">Valor Venta: *</label><input type="number" id="sale_value_new" name="sale_value" value={newProduct.sale_value} onChange={(e) => handleInputChange(e, setNewProduct)} required min="0" step="any" style={inputStyle} /></div></div>
            <button type="submit" disabled={loadingCreate} style={submitButtonStyle}>{loadingCreate ? 'Guardando...' : 'Guardar Producto'}</button>
          </form>
        </div>
      )}

      {displayMode === 'edit' && editingProduct && canManage && (
        <div style={formContainerStyle}>
          <h3>Editando Producto: {editingProduct.description} (Código: {editingProduct.code})</h3>
          <form onSubmit={handleUpdateProductDetailsSubmit}>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="edit_code">Código Interno: (No editable)</label><input type="text" id="edit_code" name="code" value={editProductFormData.code} readOnly style={{...inputStyle, backgroundColor: '#333'}} /></div><div style={{...formFieldStyle, flex: 2}}><label htmlFor="edit_description">Descripción: *</label><input type="text" id="edit_description" name="description" value={editProductFormData.description} onChange={(e) => handleInputChange(e, setEditProductFormData)} required style={inputStyle} /></div></div>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="edit_brand">Marca:*</label><input type="text" id="edit_brand" name="brand" value={editProductFormData.brand} onChange={(e) => handleInputChange(e, setEditProductFormData)} style={inputStyle} /></div><div style={formFieldStyle}><label htmlFor="edit_category">Categoría:*</label><input type="text" id="edit_category" name="category" value={editProductFormData.category} onChange={(e) => handleInputChange(e, setEditProductFormData)} style={inputStyle} /></div></div>
            <div style={formRowStyle}><div style={formFieldStyle}><label htmlFor="edit_cost_value">Valor de Costo: *</label><input type="number" id="edit_cost_value" name="cost_value" value={editProductFormData.cost_value} onChange={(e) => handleInputChange(e, setEditProductFormData)} required min="0" step="any" style={inputStyle} /></div><div style={formFieldStyle}><label htmlFor="edit_sale_value">Valor de Venta: *</label><input type="number" id="edit_sale_value" name="sale_value" value={editProductFormData.sale_value} onChange={(e) => handleInputChange(e, setEditProductFormData)} required min="0" step="any" style={inputStyle} /></div></div>
            <div style={{ marginBottom: '15px' }}><label htmlFor="edit_is_active" style={{ marginRight: '10px' }}>Producto Activo:</label><input type="checkbox" id="edit_is_active" name="is_active" checked={editProductFormData.is_active} onChange={(e) => handleInputChange(e, setEditProductFormData)} /></div>
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}><button type="submit" disabled={loadingEditProduct} style={submitButtonStyle}>{loadingEditProduct ? 'Actualizando...' : 'Actualizar Detalles'}</button><button type="button" onClick={handleCancelEditProduct} style={cancelButtonStyle}>Cancelar</button></div>
          </form>
        </div>
      )}
      
      {displayMode === 'adjust' && adjustingStockProduct && canManage && (
         <div style={formContainerStyle}>
          <h3>Ajustar Stock de: {adjustingStockProduct.description} (Actual: {adjustingStockProduct.quantity})</h3>
          <form onSubmit={handleAdjustStockSubmit}>
            <div style={formFieldStyleFullWidth}><label htmlFor="quantity_to_add_adjust">Cantidad a Añadir/Restar: *</label><input type="number" id="quantity_to_add_adjust" name="quantity_to_add" value={adjustStockFormData.quantity_to_add} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} placeholder="Ej: 10 (sumar), -5 (restar)" required style={inputStyle} /></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="reason_adjust" style={{marginTop:'10px'}}>Motivo del Ajuste: *</label><input type="text" id="reason_adjust" name="reason" value={adjustStockFormData.reason} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} required style={inputStyle} placeholder="Ej: Compra proveedor, Daño" /></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="notes_adjust" style={{marginTop:'10px'}}>Notas (Opcional):</label><textarea id="notes_adjust" name="notes" rows="3" value={adjustStockFormData.notes} onChange={(e) => handleInputChange(e, setAdjustStockFormData)} style={{...inputStyle, resize: 'vertical'}} /></div>
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}><button type="submit" disabled={loadingAdjustStock} style={submitButtonStyle}>{loadingAdjustStock ? 'Ajustando...' : 'Confirmar Ajuste'}</button><button type="button" onClick={handleCancelAdjustStock} style={cancelButtonStyle}>Cancelar</button></div>
          </form>
        </div>
      )}

      {displayMode === 'history' && viewingHistoryForProduct && canManage && (
         <div style={{ border: '1px solid #6c757d', padding: '20px', marginTop:'20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Historial de: {viewingHistoryForProduct.description} (Código: {viewingHistoryForProduct.code})</h3>
          {loadingProductHistory && <p>Cargando historial...</p>}
          {historyError && <p style={{ color: 'red' }}>{historyError}</p>}
          {!loadingProductHistory && !historyError && productHistory.length === 0 && <p>No hay movimientos de inventario para este producto.</p>}
          {!loadingProductHistory && !historyError && productHistory.length > 0 && (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={tableHeaderStyle}>Fecha</th><th style={tableHeaderStyle}>Tipo Mov.</th><th style={tableHeaderStyle}>Cant. Modif.</th><th style={tableHeaderStyle}>Nueva Cant.</th><th style={tableHeaderStyle}>Usuario (ID)</th><th style={tableHeaderStyle}>Notas</th></tr></thead>
                <tbody>{productHistory.map(entry => (<tr key={entry.id}><td style={tableCellStyle}>{new Date(entry.date).toLocaleString()}</td><td style={tableCellStyle}>{entry.movement_type}</td><td style={tableCellStyle}>{entry.quantity_changed}</td><td style={tableCellStyle}>{entry.new_quantity}</td><td style={tableCellStyle}>{entry.user_id}</td><td style={tableCellStyle}>{entry.notes || '-'}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {displayMode === 'list' && (
        <>
          <hr style={{margin: '30px 0'}} />
          <h3>Listado de Productos en Inventario</h3>
          {loading && <p>Cargando productos...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && products.length === 0 && <p>No hay productos registrados.</p>}
          {!loading && !error && products.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead><tr><th style={tableHeaderStyle}>Código de Barras</th><th style={tableHeaderStyle}>Código</th><th style={tableHeaderStyle}>Descripción</th><th style={tableHeaderStyle}>Marca</th><th style={tableHeaderStyle}>Categoría</th><th style={tableHeaderStyle}>Cant.</th><th style={tableHeaderStyle}>V. Costo</th><th style={tableHeaderStyle}>V. Venta</th><th style={tableHeaderStyle}>Estado</th>{canManage && <th style={tableHeaderStyle}>Acciones</th>}</tr></thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td style={tableCellStyle}>{product.id}</td><td style={tableCellStyle}>{product.code}</td>
                    <td style={tableCellStyle}>{product.description}</td><td style={tableCellStyle}>{product.brand || '-'}</td>
                    <td style={tableCellStyle}>{product.category || '-'}</td><td style={tableCellStyle}>{product.quantity}</td>
                    <td style={tableCellStyle}>{product.cost_value != null ? product.cost_value.toFixed(2) : '0.00'}</td>
                    <td style={tableCellStyle}>{product.sale_value != null ? product.sale_value.toFixed(2) : '0.00'}</td>
                    <td style={tableCellStyle}>{product.is_active ? 'Activo' : 'Inactivo'}</td>
                    {canManage && (
                      <td style={tableCellStyle}>
                        <button onClick={() => handleEditProductClick(product)} style={actionButtonStyle}>Editar</button>
                        <button onClick={() => handleAdjustStockClick(product)} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>Ajustar Stock</button>
                        {product.is_active && (<button onClick={() => handleInactivateProductClick(product)} style={{...actionButtonStyle, backgroundColor: '#ffc107'}}>Inactivar</button>)}
                        {!product.is_active && <span style={{color: '#6c757d', marginRight: '5px'}}>(Inactivo)</span>}
                        <button onClick={() => handleViewHistoryClick(product)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Historial</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

// --- CONSTANTES DE ESTILO (VERIFICADO QUE ESTÁN TODAS LAS USADAS) ---
const formContainerStyle = { border: '1px solid #555', padding: '20px', marginBottom: '30px', borderRadius: '5px' };
const formFieldStyle = { flex: 1, display: 'flex', flexDirection: 'column' }; // Usado en formRowStyle
const formFieldStyleFullWidth = { display: 'flex', flexDirection: 'column', marginBottom: '15px' };
const formRowStyle = { display: 'flex', gap: '20px', marginBottom: '10px' }; 
const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px' };
const tableHeaderStyle = { borderBottom: '2px solid #888', padding: '10px', textAlign: 'left' };
const tableCellStyle = { borderBottom: '1px solid #555', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };
const actionButtonStyle = { marginRight: '5px', marginBottom: '5px', padding: '5px 8px', fontSize: '13px', cursor: 'pointer', border: 'none', borderRadius: '3px', color: 'white', backgroundColor: '#007bff' };
const submitButtonStyle = { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };
const cancelButtonStyle = { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
// --- FIN CONSTANTES DE ESTILO ---

export default InventoryPage;