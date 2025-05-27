// src/pages/ServicesPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import serviceService from '../services/serviceService';
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

function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [viewingPriceHistoryForService, setViewingPriceHistoryForService] = useState(null);

  const [newService, setNewService] = useState({ code: '', description: '', value: '' });
  const [editServiceFormData, setEditServiceFormData] = useState({
    id: null, code: '', description: '', value: '', is_active: true
  });
  
  const [servicePriceHistory, setServicePriceHistory] = useState([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);

  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editServiceError, setEditServiceError] = useState('');
  const [editServiceSuccess, setEditServiceSuccess] = useState('');
  const [inactivateServiceMessage, setInactivateServiceMessage] = useState('');
  const [priceHistoryError, setPriceHistoryError] = useState('');
  
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingEditService, setLoadingEditService] = useState(false);

  // <<< --- Estados para Búsqueda Específica de Servicio (NUEVO) --- >>>
  const [searchIdInputSrv, setSearchIdInputSrv] = useState('');
  const [searchCodeInputSrv, setSearchCodeInputSrv] = useState('');
  const [foundService, setFoundService] = useState(null); 
  const [specificServiceSearchError, setSpecificServiceSearchError] = useState('');
  const [loadingSpecificServiceSearch, setLoadingSpecificServiceSearch] = useState(false);
  // <<< --- Fin Estados para Búsqueda Específica de Servicio --- >>>

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser ? currentUser.role : null;
  const canManage = userRole === 'admin' || userRole === 'soporte';

  useEffect(() => {
    fetchServices();
    const styleSheet = document.createElement("style");
    styleSheet.innerText = numberInputStyleFix;
    document.head.appendChild(styleSheet);
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  const fetchServices = async () => {
    setLoading(true); setError('');
    try {
      const data = await serviceService.getServices({ active_only: null });
      console.log("SERVICIOS RECIBIDOS DEL FETCH:", JSON.stringify(data, null, 2));
      setServices(data);
    } catch (err) {
      setError('Error al cargar servicios: ' + (err.detail || err.message || ''));
    } finally { setLoading(false); }
  };

  const handleInputChange = (event, setStateFunction) => {
    const { name, value, type, checked } = event.target;
    setStateFunction(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const resetFormsAndViews = () => {
    setShowCreateForm(false); setEditingService(null); setViewingPriceHistoryForService(null);
    setFoundService(null); 
    setCreateError(''); setCreateSuccess('');
    setEditServiceError(''); setEditServiceSuccess('');
    setPriceHistoryError(''); setInactivateServiceMessage('');
    setNewService({ code: '', description: '', value: '' });
    setEditServiceFormData({ id: null, code: '', description: '', value: '', is_active: true });
    setSpecificServiceSearchError(''); 
    setSearchIdInputSrv(''); 
    setSearchCodeInputSrv(''); 
  };

  const handleCreateServiceSubmit = async (event) => {
    event.preventDefault();
    setCreateError(''); setCreateSuccess(''); setLoadingCreate(true);
    const serviceValue = parseFloat(newService.value);
    if (!newService.code || !newService.description || isNaN(serviceValue) || serviceValue < 0) {
      setCreateError('Código, Descripción y Valor válido (numérico >= 0) son requeridos.');
      setLoadingCreate(false); return;
    }
    const serviceDataToSend = { code: newService.code, description: newService.description, value: serviceValue };
    try {
      await serviceService.createService(serviceDataToSend);
      setCreateSuccess('¡Servicio creado exitosamente!');
      resetFormsAndViews(); 
      fetchServices();
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      let e = 'Error al crear servicio: ';
      if (err.detail && Array.isArray(err.detail)) { e += err.detail.map(d => `${d.loc.join('->')}: ${d.msg}`).join('; '); }
      else if (err.detail) { e += JSON.stringify(err.detail); } 
      else { e += err.message || 'Error desconocido.'; }
      setCreateError(e); setTimeout(() => setCreateError(''), 7000);
    } finally { setLoadingCreate(false); }
  };

  const handleEditServiceClick = (service) => {
    resetFormsAndViews();
    setEditingService(service);
    setEditServiceFormData({
      id: service.id, code: service.code, description: service.description || '',
      value: service.value != null ? String(service.value) : '',
      is_active: service.is_active,
    });
  };

  const handleCancelEditService = () => {
    resetFormsAndViews();
  };

  const handleUpdateServiceSubmit = async (event) => {
    event.preventDefault();
    if (!editServiceFormData.id) return;
    setLoadingEditService(true); setEditServiceError(''); setEditServiceSuccess('');
    const serviceValue = parseFloat(editServiceFormData.value);
    if (!editServiceFormData.description || isNaN(serviceValue) || serviceValue < 0) {
      setEditServiceError('Descripción y Valor válido (numérico >= 0) son requeridos.');
      setLoadingEditService(false); return;
    }
    const { id, code, ...dataFromForm } = editServiceFormData; 
    const dataToUpdate = { 
        description: dataFromForm.description,
        value: serviceValue,
        is_active: dataFromForm.is_active
    };
    console.log("Enviando para actualizar SERVICIO (ID:", id, "):", JSON.stringify(dataToUpdate, null, 2));
    try {
      await serviceService.updateService(id, dataToUpdate);
      setEditServiceSuccess('¡Servicio actualizado exitosamente!');
      resetFormsAndViews(); fetchServices();
      setTimeout(() => setEditServiceSuccess(''), 3000);
    } catch (err) {
      let e = 'Error al actualizar servicio: ';
      if (err.detail && Array.isArray(err.detail)) { e += err.detail.map(d => `${d.loc.join('->')}: ${d.msg}`).join('; '); }
      else if (err.detail) { e += JSON.stringify(err.detail); } 
      else { e += err.message || 'Error desconocido.'; }
      setEditServiceError(e); setTimeout(() => setEditServiceError(''), 7000);
    } finally { setLoadingEditService(false); }
  };

  const handleInactivateServiceClick = async (service) => {
    setInactivateServiceMessage('');
    if (window.confirm(`¿Seguro deseas inactivar el servicio "${service.description}" (Código: ${service.code})?`)) {
      try {
        await serviceService.inactivateService(service.id);
        setInactivateServiceMessage(`Servicio "${service.description}" inactivado correctamente.`);
        fetchServices();
        setTimeout(() => setInactivateServiceMessage(''), 3000);
      } catch (err) {
        setInactivateServiceMessage('Error al inactivar: ' + (err.detail || err.message));
        setTimeout(() => setInactivateServiceMessage(''), 5000);
      }
    }
  };

  const handleViewPriceHistoryClick = async (service) => {
    resetFormsAndViews();
    setViewingPriceHistoryForService(service);
    setLoadingPriceHistory(true); setServicePriceHistory([]); setPriceHistoryError('');
    try {
      const historyData = await serviceService.getServicePriceHistory(service.id);
      console.log('Historial de precios recibido:', historyData);
      setServicePriceHistory(historyData);
    } catch (err) {
      setPriceHistoryError('Error al cargar historial de precios: ' + (err.detail || err.message || ''));
    } finally { setLoadingPriceHistory(false); }
  };

  const handleSearchServiceByIdSubmit = async (event) => {
    event.preventDefault();
    if (!searchIdInputSrv.trim()) {
      setSpecificServiceSearchError('Por favor, ingrese un ID de servicio para buscar.');
      return;
    }
    resetFormsAndViews(); 
    setLoadingSpecificServiceSearch(true);
    try {
      const data = await serviceService.getServiceById(searchIdInputSrv);
      setFoundService(data);
    } catch (err) {
      setSpecificServiceSearchError(`Error al buscar servicio por ID ${searchIdInputSrv}: ` + (err.detail || err.message || 'Servicio no encontrado.'));
      setFoundService(null); 
    } finally {
      setLoadingSpecificServiceSearch(false);
    }
  };

  const handleSearchServiceByCodeSubmit = async (event) => {
    event.preventDefault();
    if (!searchCodeInputSrv.trim()) {
      setSpecificServiceSearchError('Por favor, ingrese un código de servicio para buscar.');
      return;
    }
    resetFormsAndViews(); 
    setLoadingSpecificServiceSearch(true);
    try {
      const data = await serviceService.getServiceByCode(searchCodeInputSrv);
      setFoundService(data);
    } catch (err) {
      setSpecificServiceSearchError(`Error al buscar servicio por código "${searchCodeInputSrv}": ` + (err.detail || err.message || 'Servicio no encontrado.'));
      setFoundService(null);
    } finally {
      setLoadingSpecificServiceSearch(false);
    }
  };

  const displayMode = 
    foundService ? 'foundService' :
    showCreateForm ? 'create' :
    editingService ? 'edit' :
    viewingPriceHistoryForService ? 'history' :
    'list';

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard"><button style={{ padding: '8px 15px', fontSize: '14px' }}>← Volver al Dashboard</button></Link>
        {canManage && displayMode === 'list' && (
          <button onClick={() => { resetFormsAndViews(); setShowCreateForm(true); }}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >Registrar Nuevo Servicio</button>
        )}
        {displayMode !== 'list' && (
             <button onClick={resetFormsAndViews}
            style={{ padding: '10px 15px', backgroundColor:  '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
          >{displayMode === 'create' ? 'Cancelar Registro' : 
            (displayMode === 'edit' ? 'Cancelar Edición': 
            (displayMode === 'history' ? 'Cerrar Historial' : 
            (displayMode === 'foundService' ? 'Limpiar Búsqueda y Volver' : 'Cancelar')))}</button>
        )}
      </div>

      <h2>Gestión de Servicios</h2>
      
      {createSuccess && <p style={{ color: 'green' }}>{createSuccess}</p>}
      {createError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{createError}</p>}
      {editServiceSuccess && <p style={{ color: 'green' }}>{editServiceSuccess}</p>}
      {editServiceError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{editServiceError}</p>}
      {inactivateServiceMessage && <p style={{ color: inactivateServiceMessage.startsWith('Error') ? 'red' : 'green' }}>{inactivateServiceMessage}</p>}
      {priceHistoryError && <p style={{ color: 'red' }}>{priceHistoryError}</p>}
      {specificServiceSearchError && <p style={{ color: 'red' }}>{specificServiceSearchError}</p>}


      {/* Formularios de Búsqueda Específica de Servicio */}
      {displayMode === 'list' && (
        <div style={{ border: '1px solid #444', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
          <h4>Buscar Servicio Específico</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <form onSubmit={handleSearchServiceByIdSubmit} style={{ flex: 1, minWidth: '250px' }}>
              <label htmlFor="searchIdInputSrv" style={{ display: 'block', marginBottom: '5px' }}>Buscar por ID de Servicio:</label>
              <div style={{ display: 'flex' }}>
                <input type="number" id="searchIdInputSrv" value={searchIdInputSrv} 
                       onChange={(e) => setSearchIdInputSrv(e.target.value)} 
                       placeholder="ID del servicio" style={{ padding: '8px', flexGrow: 1, boxSizing: 'border-box' }} />
                <button type="submit" disabled={loadingSpecificServiceSearch} style={{ padding: '8px 15px', marginLeft: '10px' }}>Buscar</button>
              </div>
            </form>
            <form onSubmit={handleSearchServiceByCodeSubmit} style={{ flex: 2, minWidth: '300px' }}>
              <label htmlFor="searchCodeInputSrv" style={{ display: 'block', marginBottom: '5px' }}>Buscar por Código de Servicio:</label>
              <div style={{ display: 'flex' }}>
                <input type="text" id="searchCodeInputSrv" value={searchCodeInputSrv} 
                       onChange={(e) => setSearchCodeInputSrv(e.target.value)} 
                       placeholder="Código del servicio" style={{ padding: '8px', flexGrow: 1, boxSizing: 'border-box' }} />
                <button type="submit" disabled={loadingSpecificServiceSearch} style={{ padding: '8px 15px', marginLeft: '10px' }}>Buscar</button>
              </div>
            </form>
          </div>
          {loadingSpecificServiceSearch && <p style={{marginTop: '10px'}}>Buscando servicio...</p>}
        </div>
      )}

      {/* Visualización del Servicio Encontrado */}
      {displayMode === 'foundService' && foundService && (
        <div style={{ border: '1px solid #28a745', padding: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Servicio Encontrado</h3>
          <p><strong>ID:</strong> {foundService.id}</p>
          <p><strong>Código:</strong> {foundService.code}</p>
          <p><strong>Descripción:</strong> {foundService.description}</p>
          <p><strong>Valor:</strong> {foundService.value != null ? foundService.value.toFixed(2) : 'N/A'}</p>
          <p><strong>Estado:</strong> {foundService.is_active ? 'Activo' : 'Inactivo'}</p>
          {canManage && (
            <div style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
              <button onClick={() => handleEditServiceClick(foundService)} style={actionButtonStyle}>Editar Servicio</button>
              <button onClick={() => handleViewPriceHistoryClick(foundService)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Ver Hist. Precios</button>
            </div>
          )}
        </div>
      )}
      
      {/* --- Formulario de Creación --- */}
      {displayMode === 'create' && canManage && (
        <div style={formContainerStyle}>
          <h3>Registrar Nuevo Servicio</h3>
          <form onSubmit={handleCreateServiceSubmit}>
            <div style={formFieldStyleFullWidth}><label htmlFor="code_new_srv">Código: *</label><input type="text" id="code_new_srv" name="code" value={newService.code} onChange={(e)=>handleInputChange(e, setNewService)} required style={inputStyle}/></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="desc_new_srv">Descripción: *</label><textarea id="desc_new_srv" name="description" value={newService.description} onChange={(e)=>handleInputChange(e, setNewService)} required rows="3" style={{...inputStyle, resize:'vertical'}}/></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="val_new_srv">Valor: *</label><input type="number" id="val_new_srv" name="value" value={newService.value} onChange={(e)=>handleInputChange(e, setNewService)} required min="0" step="any" style={inputStyle}/></div>
            <button type="submit" disabled={loadingCreate} style={submitButtonStyle}>{loadingCreate ? 'Guardando...' : 'Guardar Servicio'}</button>
          </form>
        </div>
      )}

      {/* --- Formulario de Edición --- */}
      {displayMode === 'edit' && editingService && canManage && (
        <div style={formContainerStyle}>
          <h3>Editando Servicio: {editingService.description} (Cód: {editingService.code})</h3>
          <form onSubmit={handleUpdateServiceSubmit}>
            <div style={formFieldStyleFullWidth}><label htmlFor="code_edit_srv">Código: (No editable)</label><input type="text" id="code_edit_srv" name="code" value={editServiceFormData.code} readOnly style={{...inputStyle, backgroundColor:'#e9ecef'}}/></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="desc_edit_srv">Descripción: *</label><textarea id="desc_edit_srv" name="description" value={editServiceFormData.description} onChange={(e)=>handleInputChange(e, setEditServiceFormData)} required rows="3" style={{...inputStyle, resize:'vertical'}}/></div>
            <div style={formFieldStyleFullWidth}><label htmlFor="val_edit_srv">Valor: *</label><input type="number" id="val_edit_srv" name="value" value={editServiceFormData.value} onChange={(e)=>handleInputChange(e, setEditServiceFormData)} required min="0" step="any" style={inputStyle}/></div>
            <div style={{...formFieldStyleFullWidth, marginTop: '10px' }}><label htmlFor="active_edit_srv" style={{marginRight:'10px'}}>Servicio Activo:</label><input type="checkbox" id="active_edit_srv" name="is_active" checked={editServiceFormData.is_active} onChange={(e)=>handleInputChange(e, setEditServiceFormData)} /></div>
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button type="submit" disabled={loadingEditService} style={submitButtonStyle}>{loadingEditService ? 'Actualizando...' : 'Actualizar Servicio'}</button>
                <button type="button" onClick={handleCancelEditService} style={cancelButtonStyle}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* --- Vista de Historial de Precios --- */}
      {displayMode === 'history' && viewingPriceHistoryForService && canManage && (
         <div style={{ border: '1px solid #6c757d', padding: '20px', marginTop:'20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Historial de Precios: {viewingPriceHistoryForService.description} (Cód: {viewingPriceHistoryForService.code})</h3>
          {loadingPriceHistory && <p>Cargando historial...</p>}
          {priceHistoryError && <p style={{ color: 'red' }}>{priceHistoryError}</p>}
          {!loadingPriceHistory && !priceHistoryError && servicePriceHistory.length === 0 && <p>No hay historial de cambios de precio para este servicio.</p>}
          {!loadingPriceHistory && !priceHistoryError && servicePriceHistory.length > 0 && (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={tableHeaderStyle}>Fecha Cambio</th><th style={tableHeaderStyle}>Usuario (ID)</th><th style={tableHeaderStyle}>Valor Anterior</th><th style={tableHeaderStyle}>Valor Nuevo</th></tr></thead>
                <tbody>{servicePriceHistory.map(entry => (<tr key={entry.id}><td style={tableCellStyle}>{new Date(entry.change_date).toLocaleString()}</td><td style={tableCellStyle}>{entry.changed_by_user_id}</td><td style={tableCellStyle}>{entry.old_value.toFixed(2)}</td><td style={tableCellStyle}>{entry.new_value.toFixed(2)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* --- Listado de Servicios --- */}
      {displayMode === 'list' && (
        <>
          <hr style={{margin: '30px 0'}} />
          <h3>Listado de Servicios Ofrecidos</h3>
          {loading && <p>Cargando servicios...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && services.length === 0 && <p>No hay servicios registrados.</p>}
          {!loading && !error && services.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead><tr><th style={tableHeaderStyle}>ID</th><th style={tableHeaderStyle}>Código</th><th style={tableHeaderStyle}>Descripción</th><th style={tableHeaderStyle}>Valor</th><th style={tableHeaderStyle}>Estado</th>{canManage && <th style={tableHeaderStyle}>Acciones</th>}</tr></thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id}>
                    <td style={tableCellStyle}>{service.id}</td><td style={tableCellStyle}>{service.code}</td>
                    <td style={tableCellStyle}>{service.description}</td><td style={tableCellStyle}>{service.value != null ? service.value.toFixed(2) : '0.00'}</td>
                    <td style={tableCellStyle}>{service.is_active ? 'Activo' : 'Inactivo'}</td>
                    {canManage && (
                      <td style={tableCellStyle}>
                        <button onClick={() => handleEditServiceClick(service)} style={actionButtonStyle}>Editar</button>
                        {service.is_active && (<button onClick={() => handleInactivateServiceClick(service)} style={{...actionButtonStyle, backgroundColor: '#ffc107'}}>Inactivar</button>)}
                        {!service.is_active && <span style={{color: '#6c757d', marginRight: '5px'}}>(Inactivo)</span>}
                        <button onClick={() => handleViewPriceHistoryClick(service)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Hist. Precios</button>
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

const formContainerStyle = { border: '1px solid #555', padding: '20px', marginBottom: '30px', borderRadius: '5px' };
const formFieldStyleFullWidth = { display: 'flex', flexDirection: 'column', marginBottom: '15px' };
const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px' };
const tableHeaderStyle = { borderBottom: '2px solid #888', padding: '10px', textAlign: 'left' };
const tableCellStyle = { borderBottom: '1px solid #555', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };
const actionButtonStyle = { marginRight: '5px', marginBottom: '5px', padding: '5px 8px', fontSize: '13px', cursor: 'pointer', border: 'none', borderRadius: '3px', color: 'white', backgroundColor: '#007bff' };
const submitButtonStyle = { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };
const cancelButtonStyle = { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default ServicesPage;