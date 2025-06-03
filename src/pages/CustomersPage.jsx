// src/pages/CustomersPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import customerService from '../services/customerService';
import authService from '../services/authService';


const pageOverallStyle = { padding: '20px', fontFamily: 'Arial, sans-serif', color: 'white' };
const formSectionBoxStyle = { border: '1px solid #444', backgroundColor: '#222', padding: '20px', marginBottom: '25px', borderRadius: '8px' };
const formFieldStyle = { display: 'flex', flexDirection: 'column', marginBottom: '16px' };
const formFieldHorizontalAlignStyle = { display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '16px'};
const formLabelStyle = { display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.95em' };
const formInputStyle = { width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white'};
const formSelectStyle = { ...formInputStyle }; // Hereda de formInputStyle, ajusta si es necesario
const formButtonStyle = { padding: '10px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.95em', // Estilo base para botones
}; 
const formCheckboxContainerStyle = { ...formFieldHorizontalAlignStyle, marginTop: '5px' }; // Reutiliza el estilo horizontal
const formCheckboxLabelStyle = { marginRight: '10px', fontWeight:'bold', fontSize: '0.95em' }; // Etiqueta del checkbox
const formCheckboxInputStyle = { transform: 'scale(1.2)', cursor: 'pointer', marginRight: '5px', verticalAlign: 'middle' }; // Estilo para el input checkbox

const tableHeaderStyle = { borderBottom: '2px solid #555', padding: '10px', textAlign: 'left', color: '#ddd' };
const tableCellStyle = { borderBottom: '1px solid #444', padding: '10px', verticalAlign: 'middle' };

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: '', document_type: 'CC', document_number: '',
    phone: '', email: '', address: ''
  });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);


  const [editingCustomer, setEditingCustomer] = useState(null); 
  const [editFormData, setEditFormData] = useState({
    id: null, full_name: '', document_type: '', document_number: '',
    phone: '', email: '', address: '', is_active: true
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  
  const [inactivateMessage, setInactivateMessage] = useState('');

  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [searchNameInput, setSearchNameInput] = useState('');
  const [foundCustomers, setFoundCustomers] = useState([]); 
  const [nameSearchError, setNameSearchError] = useState('');
  const [loadingNameSearch, setLoadingNameSearch] = useState(false); 
  
  const [searchDocTypeInput, setSearchDocTypeInput] = useState('CC');
  const [searchDocNumberInput, setSearchDocNumberInput] = useState('');
  const [docSearchError, setDocSearchError] = useState('');
  const [loadingDocSearch, setLoadingDocSearch] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser ? currentUser.role : null;
  const isAdminOrSoporte = userRole === 'admin' || userRole === 'soporte';

  useEffect(() => {
    if (isAdminOrSoporte) {
      fetchCustomers();
    }
  }, [isAdminOrSoporte]);

  const fetchCustomers = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await customerService.getCustomers(params); 
      if (params.search || (params.document_type && params.document_number)) { 
        setFoundCustomers(data || []);
      } else { 
        setCustomers(data || []);
      }
    } catch (err) {
      const errorMsg = 'Error al cargar clientes: ' + (err.detail || err.message || '');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCustomerChange = (event) => {
    const { name, value } = event.target;
    let processedValue = value;

    if (name === 'document_number') {
      processedValue = value.replace(/\s+/g, '');
    } else if (name === 'phone') {
      processedValue = value.replace(/\s+/g, '').slice(0, 15); 
    }
    setNewCustomer(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleCreateCustomerSubmit = async (event) => {
    event.preventDefault();
    setCreateError(''); setCreateSuccess(''); setLoadingCreate(true);
    if (!newCustomer.full_name || !newCustomer.document_type || !newCustomer.document_number || !newCustomer.phone) {
      setCreateError('Por favor, completa todos los campos obligatorios: Nombre, Tipo y N° Documento, Teléfono.'); 
      setLoadingCreate(false); return;
    }
    const customerDataToSend = { 
      ...newCustomer, 
      email: newCustomer.email.trim() === '' ? null : newCustomer.email, 
      address: newCustomer.address.trim() === '' ? null : newCustomer.address 
    };
    try {
      await customerService.createCustomer(customerDataToSend);
      setCreateSuccess('¡Cliente creado exitosamente!');
      setNewCustomer({ full_name: '', document_type: 'CC', document_number: '', phone: '', email: '', address: '' });
      setShowCreateForm(false);
      if (isAdminOrSoporte) fetchCustomers();
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      let errorMessage = 'Error al crear cliente: ';
      if (err.detail && Array.isArray(err.detail)) { errorMessage += err.detail.map(d => `${d.loc.join(' -> ')}: ${d.msg}`).join('; '); } 
      else if (err.detail) { errorMessage += JSON.stringify(err.detail); } 
      else { errorMessage += err.message || JSON.stringify(err); }
      setCreateError(errorMessage); setTimeout(() => setCreateError(''), 7000);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({ 
      id: customer.id, 
      full_name: customer.full_name || '', 
      document_type: customer.document_type || 'CC', 
      document_number: customer.document_number || '', 
      phone: customer.phone || '', 
      email: customer.email || '', 
      address: customer.address || '', 
      is_active: customer.is_active === undefined ? true : customer.is_active 
    });
    setShowCreateForm(false); setSelectedCustomerForHistory(null); setFoundCustomers([]); 
    setNameSearchError(''); setDocSearchError('');
    setEditError(''); setEditSuccess('');
  };

  const handleEditFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    let processedValue = type === 'checkbox' ? checked : value;

    if (name === 'document_number') {
      processedValue = value.replace(/\s+/g, '');
    } else if (name === 'phone') {
      processedValue = value.replace(/\s+/g, '').slice(0, 15); 
    }
    setEditFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
    setEditFormData({ id: null, full_name: '', document_type: '', document_number: '', phone: '', email: '', address: '', is_active: true });
    setEditError(''); setEditSuccess('');
  };

  const handleUpdateCustomerSubmit = async (event) => {
    event.preventDefault();
    if (!editFormData.id) return;
    setLoadingEdit(true); setEditError(''); setEditSuccess('');
    const { id, ...updateDataPayload } = editFormData;
    if (!updateDataPayload.full_name || !updateDataPayload.document_type || !updateDataPayload.document_number || !updateDataPayload.phone) {
      setEditError('Por favor, completa todos los campos obligatorios: Nombre, Tipo y N° Documento, Teléfono.'); setLoadingEdit(false); return;
    }
    if (updateDataPayload.email.trim() === '') { updateDataPayload.email = null; }
    if (updateDataPayload.address.trim() === '') { updateDataPayload.address = null; }
    try {
      await customerService.updateCustomer(id, updateDataPayload);
      setEditSuccess('¡Cliente actualizado exitosamente!');
      setEditingCustomer(null); 
      const wasEditingFoundCustomer = foundCustomers.some(c => c.id === id);
      fetchCustomers(); 
      if (wasEditingFoundCustomer) { 
        clearSpecificSearches(false); 
      }
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      let errorMessage = 'Error al actualizar cliente: ';
      if (err.detail && Array.isArray(err.detail)) { errorMessage += err.detail.map(d => `${d.loc.join(' -> ')}: ${d.msg}`).join('; '); }
      else if (err.detail) { errorMessage += JSON.stringify(err.detail); }
      else { errorMessage += err.message || JSON.stringify(err); }
      setEditError(errorMessage); setTimeout(() => setEditError(''), 7000);
    } finally { setLoadingEdit(false); }
  };

  const handleInactivateClick = async (customerId, customerName) => {
     setInactivateMessage('');
    if (window.confirm(`¿Estás seguro de que deseas inactivar al cliente "${customerName}" (ID: ${customerId})?`)) {
      try {
        await customerService.inactivateCustomer(customerId);
        setInactivateMessage(`Cliente "${customerName}" inactivado correctamente.`); 
        fetchCustomers(); 
        if (foundCustomers.some(c => c.id === customerId)) { 
            setFoundCustomers(prev => prev.map(c => c.id === customerId ? {...c, is_active: false} : c));
        }
        setTimeout(() => setInactivateMessage(''), 3000);
      } catch (err) {
        setInactivateMessage('Error al inactivar cliente: ' + (err.detail || err.message || JSON.stringify(err)));
        setTimeout(() => setInactivateMessage(''), 5000);
      }
    }
  };
  
  const handleViewHistory = async (customer) => {
    setSelectedCustomerForHistory(customer);
    setLoadingHistory(true);
    setHistoryError('');
    setCustomerHistory([]); 
    setShowCreateForm(false); setEditingCustomer(null); setFoundCustomers([]); 
    setNameSearchError(''); setDocSearchError('');
    try {
      const historyData = await customerService.getCustomerHistory(customer.id);
      setCustomerHistory(historyData);
    } catch (err) {
      setHistoryError('Error al cargar el historial del cliente: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearchNameChange = (e) => {
    setSearchNameInput(e.target.value);
    if (nameSearchError) setNameSearchError('');
    if (docSearchError) setDocSearchError(''); 
  };

  const handleSearchDocTypeChange = (e) => {
    setSearchDocTypeInput(e.target.value);
    if (docSearchError) setDocSearchError('');
    if (nameSearchError) setNameSearchError('');
  };
  
  const handleSearchDocNumberChange = (e) => {
    const { value } = e.target;
    const sanitizedValue = value.replace(/\s+/g, '');
    setSearchDocNumberInput(sanitizedValue);
    if (docSearchError) setDocSearchError('');
    if (nameSearchError) setNameSearchError('');
  };

  const handleSearchByNameSubmit = async (event) => {
    event.preventDefault();
    if (!searchNameInput.trim()) {
      setNameSearchError('Por favor, ingrese un nombre para buscar.');
      setTimeout(() => setNameSearchError(''), 3000); 
      return;
    }
    setLoadingNameSearch(true);
    setNameSearchError(''); setDocSearchError(''); 
    setFoundCustomers([]);
    setShowCreateForm(false); setEditingCustomer(null); setSelectedCustomerForHistory(null);
    try {
      const data = await customerService.getCustomers({ search: searchNameInput, limit: 20 });
      setFoundCustomers(data || []);
      if (!data || data.length === 0) {
        const errorMsg = `No se encontraron clientes con el nombre: "${searchNameInput}".`;
        setNameSearchError(errorMsg);
        setTimeout(() => setNameSearchError(''), 3000); 
      }
    } catch (err) {
      const errorMsg = `Error al buscar cliente por nombre: ` + (err.detail || err.message || 'Error desconocido.');
      setNameSearchError(errorMsg);
      setFoundCustomers([]);
      setTimeout(() => setNameSearchError(''), 3000); 
    } finally {
      setLoadingNameSearch(false);
    }
  };

  const handleSearchByDocumentSubmit = async (event) => {
    event.preventDefault();
    if (!searchDocTypeInput.trim() || !searchDocNumberInput.trim()) {
      setDocSearchError('Por favor, ingrese tipo y número de documento para buscar.');
      setTimeout(() => setDocSearchError(''), 3000); 
      return;
    }
    setLoadingDocSearch(true);
    setDocSearchError(''); setNameSearchError(''); 
    setFoundCustomers([]); 
    setShowCreateForm(false); setEditingCustomer(null); setSelectedCustomerForHistory(null);
    try {
      const data = await customerService.getCustomerByDocument(searchDocTypeInput, searchDocNumberInput);
      if (data) { 
        setFoundCustomers([data]);
      } else { 
        setFoundCustomers([]);
        const errorMsg = `No se encontró cliente con el documento: ${searchDocTypeInput} ${searchDocNumberInput}.`;
        setDocSearchError(errorMsg);
        setTimeout(() => setDocSearchError(''), 3000); 
      }
    } catch (err) { 
      const errorMsg = `Error al buscar cliente por documento: ` + (err.detail || err.message || 'Cliente no encontrado.');
      setDocSearchError(errorMsg);
      setFoundCustomers([]);
      setTimeout(() => setDocSearchError(''), 3000); 
    } finally {
      setLoadingDocSearch(false);
    }
  };

  const clearSpecificSearches = (reloadFullList = true) => { 
    setFoundCustomers([]);
    setNameSearchError('');
    setDocSearchError('');
    setSearchNameInput('');
    setSearchDocTypeInput('CC');
    setSearchDocNumberInput('');
    if (reloadFullList && isAdminOrSoporte) {
        fetchCustomers(); 
    } else if (!isAdminOrSoporte) {
        setCustomers([]); 
    }
  };

  const showMainListView = isAdminOrSoporte && !showCreateForm && !editingCustomer && !selectedCustomerForHistory && foundCustomers.length === 0;
  const showCreateView = showCreateForm && !editingCustomer && !selectedCustomerForHistory && foundCustomers.length === 0;
  const showEditView = editingCustomer && !selectedCustomerForHistory && foundCustomers.length === 0;
  const showHistoryView = selectedCustomerForHistory && foundCustomers.length === 0;
  const showFoundCustomersView = foundCustomers.length > 0;

  return (
    <div style={pageOverallStyle}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard"><button style={{ ...formButtonStyle, backgroundColor: '#6c757d', padding: '8px 15px', fontSize: '14px' }}>← Volver al Inicio</button></Link>
        {!editingCustomer && !selectedCustomerForHistory && foundCustomers.length === 0 && (
          <button 
            onClick={() => { 
              const newShowState = !showCreateForm;
              setShowCreateForm(newShowState); 
              setCreateError(''); setCreateSuccess('');
              setEditingCustomer(null); 
              setSelectedCustomerForHistory(null);
              setFoundCustomers([]); 
              setNameSearchError(''); 
              setDocSearchError('');   
              if (!newShowState && customers.length === 0 && isAdminOrSoporte) { 
                  fetchCustomers();
              }
            }}
            style={{ ...formButtonStyle, backgroundColor: showCreateForm ? '#dc3545' : '#007bff' }}
          >
            {showCreateForm ? 'Cancelar Creación' : 'Registrar Nuevo Cliente'}
          </button>
        )}
      </div>

      <h2>Gestión de Clientes</h2>
      
      {createSuccess && <p style={{ color: 'lightgreen', textAlign: 'center' }}>{createSuccess}</p>}
      {createError && <p style={{ color: '#ff7b7b', whiteSpace: 'pre-wrap', textAlign: 'center' }}>{createError}</p>}
      {editSuccess && <p style={{ color: 'lightgreen', textAlign: 'center' }}>{editSuccess}</p>}
      {editError && <p style={{ color: '#ff7b7b', whiteSpace: 'pre-wrap', textAlign: 'center' }}>{editError}</p>}
      {inactivateMessage && <p style={{ color: inactivateMessage.startsWith('Error') ? '#ff7b7b' : 'lightgreen', textAlign: 'center' }}>{inactivateMessage}</p>}
      
      {nameSearchError && <p style={{ color: '#ff7b7b', textAlign: 'center' }}>{nameSearchError}</p>}
      {docSearchError && <p style={{ color: '#ff7b7b', textAlign: 'center' }}>{docSearchError}</p>}

      {isAdminOrSoporte && !showCreateView && !showEditView && !showHistoryView && !showFoundCustomersView && (
        <div style={formSectionBoxStyle}>
          <h4>Buscar Cliente Específico</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '15px' }}>
            <form onSubmit={handleSearchByNameSubmit} style={{ flex: 1, minWidth: '250px' }}>
              <div style={formFieldStyle}>
                <label htmlFor="searchNameInput" style={formLabelStyle}>Buscar por Nombre:</label>
                <div style={{ display: 'flex' }}>
                  <input type="text" id="searchNameInput" value={searchNameInput} onChange={handleSearchNameChange} placeholder="Nombre del cliente" style={{...formInputStyle, marginBottom:0, flexGrow: 1}} />
                  <button type="submit" disabled={loadingNameSearch} style={{ ...formButtonStyle, backgroundColor: '#007bff', padding: '10px', marginLeft: '10px' }}>
                    {loadingNameSearch ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            </form>

            <form onSubmit={handleSearchByDocumentSubmit} style={{ flex: 1, minWidth: '300px' }}>
              <div style={formFieldStyle}>
                <label style={formLabelStyle}>Buscar por Documento:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={searchDocTypeInput} onChange={handleSearchDocTypeChange} style={{...formSelectStyle, marginBottom:0, width: 'auto', flexBasis: '100px' }}>
                    <option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option>
                    <option value="PAS">PAS</option><option value="TI">TI</option><option value="Otro">Otro</option>
                  </select>
                  <input type="text" value={searchDocNumberInput} onChange={handleSearchDocNumberChange} placeholder="Número" style={{...formInputStyle, marginBottom:0, flexGrow: 1}} />
                  <button type="submit" disabled={loadingDocSearch} style={{ ...formButtonStyle, backgroundColor: '#007bff', padding: '10px' }}>
                      {loadingDocSearch ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          {(loadingNameSearch || loadingDocSearch) && <p style={{marginTop: '10px', textAlign:'center'}}>Buscando cliente...</p>}
        </div>
      )}
      
      {showFoundCustomersView && (
        <div style={{...formSectionBoxStyle, borderColor: '#28a745' }}>
          <h3>Clientes Encontrados ({foundCustomers.length})</h3>
          {loadingNameSearch || loadingDocSearch ? <p style={{textAlign: 'center'}}>Actualizando...</p> : (
            foundCustomers.length === 0 ? <p style={{textAlign: 'center', fontStyle: 'italic'}}>No se encontraron clientes con los criterios de búsqueda.</p> : (
                foundCustomers.map(customer => (
                <div key={customer.id} style={{ borderBottom: '1px solid #444', padding: '15px 0', marginBottom: '10px' }}>
                    <p><strong>ID:</strong> {customer.id}</p>
                    <p><strong>Nombre:</strong> {customer.full_name}</p>
                    <p><strong>Documento:</strong> {customer.document_type} {customer.document_number}</p>
                    <p><strong>Teléfono:</strong> {customer.phone}</p>
                    <p><strong>Email:</strong> {customer.email || '-'}</p>
                    <p><strong>Dirección:</strong> {customer.address || '-'}</p>
                    <p><strong>Estado:</strong> 
                        <span style={{ color: customer.is_active ? 'lightgreen' : '#ff7b7b', fontWeight: 'bold', marginLeft: '5px' }}>
                            {customer.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </p>
                    <div style={{marginTop: '10px'}}>
                    {isAdminOrSoporte && <button onClick={() => { handleEditClick(customer); }} style={{...formButtonStyle, backgroundColor: '#ffc107', color: '#212529', marginRight: '10px'}}>Editar</button> }
                    {isAdminOrSoporte && <button onClick={() => { handleViewHistory(customer); }} style={{...formButtonStyle, backgroundColor: '#17a2b8'}}>Ver Historial</button>}
                    </div>
                </div>
                ))
            )
          )}
          <button onClick={() => clearSpecificSearches(true)} style={{ ...formButtonStyle, backgroundColor: '#6c757d', marginTop: '15px' }}>Limpiar Búsqueda y Ver Lista</button>
        </div>
      )}

      {showCreateView && (
         <div style={formSectionBoxStyle}> {/* Aplicando estilo de caja de sección */}
          <h3>Registrar Nuevo Cliente</h3>
          <form onSubmit={handleCreateCustomerSubmit}>
            <div style={formFieldStyle}><label htmlFor="full_name_new" style={formLabelStyle}>Nombre Completo: *</label><input type="text" id="full_name_new" name="full_name" value={newCustomer.full_name} onChange={handleNewCustomerChange} required style={formInputStyle}/></div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '0' }}> {/* Quitado marginBottom de aquí */}
                <div style={{ flex: 1, ...formFieldStyle }}><label htmlFor="document_type_new" style={formLabelStyle}>Tipo Documento: *</label>
                    <select id="document_type_new" name="document_type" value={newCustomer.document_type} onChange={handleNewCustomerChange} required style={formSelectStyle}>
                        <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="NIT">NIT</option>
                        <option value="PAS">Pasaporte</option><option value="TI">Tarjeta de Identidad</option><option value="Otro">Otro</option>
                    </select>
                </div>
                <div style={{ flex: 2, ...formFieldStyle }}><label htmlFor="document_number_new" style={formLabelStyle}>Número Documento: *</label>
                    <input type="text" id="document_number_new" name="document_number" value={newCustomer.document_number} onChange={handleNewCustomerChange} required style={formInputStyle}/>
                </div>
            </div>
            <div style={formFieldStyle}><label htmlFor="phone_new" style={formLabelStyle}>Teléfono: *</label><input type="tel" id="phone_new" name="phone" value={newCustomer.phone} onChange={handleNewCustomerChange} required maxLength="15" style={formInputStyle}/></div>
            <div style={formFieldStyle}><label htmlFor="email_new" style={formLabelStyle}>Email (Opcional):</label><input type="email" id="email_new" name="email" value={newCustomer.email} onChange={handleNewCustomerChange} style={formInputStyle}/></div>
            <div style={formFieldStyle}><label htmlFor="address_new" style={formLabelStyle}>Dirección (Opcional):</label><input type="text" id="address_new" name="address" value={newCustomer.address} onChange={handleNewCustomerChange} style={formInputStyle}/></div>
            <button type="submit" disabled={loadingCreate} style={{ ...formButtonStyle, backgroundColor: '#28a745', marginTop: '10px' }}>{loadingCreate ? 'Guardando...' : 'Guardar Cliente'}</button>
          </form>
        </div>
      )}

      {showEditView && (
        <div style={{...formSectionBoxStyle, borderColor: '#007bff'}}> {/* Aplicando estilo de caja de sección */}
          <h3>Editando Cliente: {editingCustomer.full_name} (ID: {editingCustomer.id})</h3>
          <form onSubmit={handleUpdateCustomerSubmit}>
            <div style={formFieldStyle}><label htmlFor="full_name_edit" style={formLabelStyle}>Nombre Completo: *</label><input type="text" id="full_name_edit" name="full_name" value={editFormData.full_name} onChange={handleEditFormChange} required style={formInputStyle}/></div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '0' }}>
                <div style={{ flex: 1, ...formFieldStyle }}><label htmlFor="document_type_edit" style={formLabelStyle}>Tipo Documento: *</label>
                    <select id="document_type_edit" name="document_type" value={editFormData.document_type} onChange={handleEditFormChange} required style={formSelectStyle}>
                        <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="NIT">NIT</option>
                        <option value="PAS">Pasaporte</option><option value="TI">Tarjeta de Identidad</option><option value="Otro">Otro</option>
                    </select>
                </div>
                <div style={{ flex: 2, ...formFieldStyle }}><label htmlFor="document_number_edit" style={formLabelStyle}>Número Documento: *</label>
                    <input type="text" id="document_number_edit" name="document_number" value={editFormData.document_number} onChange={handleEditFormChange} required style={formInputStyle}/>
                </div>
            </div>
            <div style={formFieldStyle}><label htmlFor="phone_edit" style={formLabelStyle}>Teléfono: *</label><input type="tel" id="phone_edit" name="phone" value={editFormData.phone} onChange={handleEditFormChange} required maxLength="15" style={formInputStyle}/></div>
            <div style={formFieldStyle}><label htmlFor="email_edit" style={formLabelStyle}>Email (Opcional):</label><input type="email" id="email_edit" name="email" value={editFormData.email} onChange={handleEditFormChange} style={formInputStyle}/></div>
            <div style={formFieldStyle}><label htmlFor="address_edit" style={formLabelStyle}>Dirección (Opcional):</label><input type="text" id="address_edit" name="address" value={editFormData.address} onChange={handleEditFormChange} style={formInputStyle}/></div>
            
            <div style={formCheckboxContainerStyle}> {/* Estilo para el checkbox */}
              <label htmlFor="is_active_edit" style={formCheckboxLabelStyle}>Cliente Activo:</label>
              <input type="checkbox" id="is_active_edit" name="is_active" checked={editFormData.is_active} onChange={handleEditFormChange} style={formCheckboxInputStyle} />
            </div>

            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button type="submit" disabled={loadingEdit} style={{ ...formButtonStyle, backgroundColor: '#007bff'}}>{loadingEdit ? 'Actualizando...' : 'Actualizar Cliente'}</button>
                <button type="button" onClick={handleCancelEdit} style={{ ...formButtonStyle, backgroundColor: '#6c757d'}}>Cancelar Edición</button>
            </div>
          </form>
        </div>
      )}

      {showHistoryView && (
        <div style={{...formSectionBoxStyle, borderColor: '#ffc107'}}> {/* Aplicando estilo de caja de sección */}
          <h3>Historial de: {selectedCustomerForHistory.full_name} (ID: {selectedCustomerForHistory.id})</h3>
          {loadingHistory && <p>Cargando historial...</p>}
          {historyError && <p style={{ color: 'red' }}>{historyError}</p>}
          {!loadingHistory && !historyError && customerHistory.length === 0 && <p>No hay historial disponible para este cliente.</p>}
          {!loadingHistory && !historyError && customerHistory.length > 0 && (
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #444', padding: '10px', borderRadius: '4px' }}>
              {customerHistory.map(entry => (
                <div key={entry.id} style={{ borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '10px', fontSize: '0.9em' }}>
                  <p><strong>Fecha:</strong> {new Date(entry.date).toLocaleString()}</p>
                  <p><strong>Acción:</strong> {entry.action}</p>
                  <p><strong>Usuario (ID):</strong> {entry.user_id}</p>
                  <p><strong>Detalles:</strong></p>
                  <pre style={{ backgroundColor: '#333', color: '#f0f0f0', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.85em' }}>
                    {typeof entry.details === 'string' && entry.details.startsWith('{') ? JSON.stringify(JSON.parse(entry.details), null, 2) : entry.details}
                  </pre>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setSelectedCustomerForHistory(null)} style={{ ...formButtonStyle, backgroundColor: '#6c757d', marginTop: '15px' }}>Cerrar Historial</button>
        </div>
      )}

      {showMainListView && (
        <>
          <hr style={{margin: '30px 0', borderColor: '#444'}} />
          <h3>Listado de Clientes Registrados</h3>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {loading && <p style={{textAlign: 'center'}}>Cargando clientes...</p>}
          {!loading && !error && customers.length === 0 && <p style={{textAlign: 'center', fontStyle: 'italic'}}>No hay clientes registrados para mostrar.</p>}
          {!loading && !error && customers.length > 0 && (
            <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', marginTop: '20px', color: 'white' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>Nombre Completo</th>
                  <th style={tableHeaderStyle}>Documento</th>
                  <th style={tableHeaderStyle}>Teléfono</th>
                  <th style={tableHeaderStyle}>Email</th>
                  <th style={tableHeaderStyle}>Estado</th>
                  <th style={tableHeaderStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td style={tableCellStyle}>{customer.id}</td>
                    <td style={tableCellStyle}>{customer.full_name}</td>
                    <td style={{...tableCellStyle, whiteSpace: 'nowrap'}}>{customer.document_type} {customer.document_number}</td>
                    <td style={tableCellStyle}>{customer.phone}</td>
                    <td style={tableCellStyle}>{customer.email || '-'}</td>
                    <td style={{...tableCellStyle, color: customer.is_active ? 'lightgreen' : '#ff7b7b', fontWeight: 'bold' }}>
                        {customer.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td style={{...tableCellStyle, whiteSpace: 'nowrap'}}>
                      <button onClick={() => handleEditClick(customer)} style={{...formButtonStyle, backgroundColor: '#007bff', marginRight: '5px', padding: '6px 10px', fontSize:'0.9em'}}>Editar</button>
                      {customer.is_active && (
                        <button onClick={() => handleInactivateClick(customer.id, customer.full_name)} style={{...formButtonStyle, backgroundColor: '#ffc107', color: '#212529', marginRight: '5px', padding: '6px 10px', fontSize:'0.9em'}}>Inactivar</button>
                      )}
                      {!customer.is_active && (<span style={{color: '#888', marginRight: '5px', fontStyle: 'italic', fontSize:'0.9em'}}>(Inactivo)</span>)}
                      <button onClick={() => handleViewHistory(customer)} style={{...formButtonStyle, backgroundColor: '#17a2b8', padding: '6px 10px', fontSize:'0.9em'}}>Historial</button>
                    </td>
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

export default CustomersPage;