// src/pages/CustomersPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import customerService from '../services/customerService';
import authService from '../services/authService';

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

  // <<< --- Estados para Búsqueda Específica (NUEVO) --- >>>
  const [searchIdInput, setSearchIdInput] = useState('');
  const [searchDocTypeInput, setSearchDocTypeInput] = useState('CC');
  const [searchDocNumberInput, setSearchDocNumberInput] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null); // Cliente encontrado por búsqueda específica
  const [specificSearchError, setSpecificSearchError] = useState('');
  const [loadingSpecificSearch, setLoadingSpecificSearch] = useState(false);
  // <<< --- Fin Estados para Búsqueda Específica --- >>>

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser ? currentUser.role : null;
  const isAdminOrSoporte = userRole === 'admin' || userRole === 'soporte';

  useEffect(() => {
    if (isAdminOrSoporte) {
      fetchCustomers();
    }
  }, [isAdminOrSoporte]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerService.getCustomers(); 
      setCustomers(data);
    } catch (err) {
      setError('Error al cargar la lista de clientes. ' + (err.detail || err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Asumimos que estas funciones ya las tienes completas y funcionales de nuestras interacciones previas:
  const handleNewCustomerChange = (event) => {
    const { name, value } = event.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateCustomerSubmit = async (event) => {
    event.preventDefault();
    setCreateError(''); setCreateSuccess('');
    if (!newCustomer.full_name || !newCustomer.document_type || !newCustomer.document_number || !newCustomer.phone) {
      setCreateError('Por favor, completa todos los campos obligatorios: Nombre, Tipo y N° Documento, Teléfono.'); return;
    }
    const customerDataToSend = { ...newCustomer, email: newCustomer.email === '' ? null : newCustomer.email, address: newCustomer.address === '' ? null : newCustomer.address };
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
    }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({ id: customer.id, full_name: customer.full_name || '', document_type: customer.document_type || 'CC', document_number: customer.document_number || '', phone: customer.phone || '', email: customer.email || '', address: customer.address || '', is_active: customer.is_active === undefined ? true : customer.is_active });
    setShowCreateForm(false); setSelectedCustomerForHistory(null); setFoundCustomer(null); // Ocultar otras vistas
    setEditError(''); setEditSuccess('');
  };

  const handleEditFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
    if (updateDataPayload.email === '') { updateDataPayload.email = null; }
    if (updateDataPayload.address === '') { updateDataPayload.address = null; }
    try {
      await customerService.updateCustomer(id, updateDataPayload);
      setEditSuccess('¡Cliente actualizado exitosamente!');
      setEditingCustomer(null); fetchCustomers();
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
        setInactivateMessage(`Cliente "${customerName}" inactivado correctamente.`); fetchCustomers();
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
    setShowCreateForm(false); setEditingCustomer(null); setFoundCustomer(null); // Ocultar otras vistas
    try {
      const historyData = await customerService.getCustomerHistory(customer.id);
      setCustomerHistory(historyData);
    } catch (err) {
      setHistoryError('Error al cargar el historial del cliente: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingHistory(false);
    }
  };

  // <<< --- Funciones para Búsqueda Específica (NUEVO) --- >>>
  const handleSearchByIdSubmit = async (event) => {
    event.preventDefault();
    if (!searchIdInput.trim()) {
      setSpecificSearchError('Por favor, ingrese un ID para buscar.');
      return;
    }
    setLoadingSpecificSearch(true);
    setSpecificSearchError('');
    setFoundCustomer(null);
    setShowCreateForm(false); setEditingCustomer(null); setSelectedCustomerForHistory(null);
    try {
      const data = await customerService.getCustomer(searchIdInput);
      setFoundCustomer(data);
    } catch (err) {
      setSpecificSearchError(`Error al buscar cliente por ID ${searchIdInput}: ` + (err.detail || err.message || 'Cliente no encontrado.'));
      setFoundCustomer(null); // Asegurar que no haya un cliente encontrado previo si hay error
    } finally {
      setLoadingSpecificSearch(false);
    }
  };

  const handleSearchByDocumentSubmit = async (event) => {
    event.preventDefault();
    if (!searchDocTypeInput.trim() || !searchDocNumberInput.trim()) {
      setSpecificSearchError('Por favor, ingrese tipo y número de documento para buscar.');
      return;
    }
    setLoadingSpecificSearch(true);
    setSpecificSearchError('');
    setFoundCustomer(null);
    setShowCreateForm(false); setEditingCustomer(null); setSelectedCustomerForHistory(null);
    try {
      const data = await customerService.getCustomerByDocument(searchDocTypeInput, searchDocNumberInput);
      setFoundCustomer(data);
    } catch (err) {
      setSpecificSearchError(`Error al buscar cliente por documento: ` + (err.detail || err.message || 'Cliente no encontrado.'));
      setFoundCustomer(null); // Asegurar que no haya un cliente encontrado previo si hay error
    } finally {
      setLoadingSpecificSearch(false);
    }
  };

  const clearSpecificSearch = () => {
    setFoundCustomer(null);
    setSpecificSearchError('');
    setSearchIdInput('');
    setSearchDocTypeInput('CC');
    setSearchDocNumberInput('');
  };
  // <<< --- Fin Funciones para Búsqueda Específica --- >>>

  // Lógica para determinar qué vista principal mostrar
  const showMainListView = isAdminOrSoporte && !showCreateForm && !editingCustomer && !selectedCustomerForHistory && !foundCustomer;
  const showCreateView = showCreateForm && !editingCustomer && !selectedCustomerForHistory && !foundCustomer;
  const showEditView = editingCustomer && !selectedCustomerForHistory && !foundCustomer;
  const showHistoryView = selectedCustomerForHistory && !foundCustomer;
  const showFoundCustomerView = foundCustomer;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard"><button style={{ padding: '8px 15px', fontSize: '14px' }}>← Volver al Dashboard</button></Link>
        {/* Botón de crear solo visible si ninguna otra acción principal (editar, historial, búsqueda específica) está activa */}
        {!editingCustomer && !selectedCustomerForHistory && !foundCustomer && (
          <button 
            onClick={() => { 
              setShowCreateForm(!showCreateForm); 
              setCreateError(''); setCreateSuccess('');
              // Asegurar que otros estados se reseteen si se abre el form de creación
              setEditingCustomer(null); 
              setSelectedCustomerForHistory(null);
              setFoundCustomer(null);
            }}
            style={{ padding: '10px 15px', backgroundColor: showCreateForm ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {showCreateForm ? 'Cancelar Creación' : 'Registrar Nuevo Cliente'}
          </button>
        )}
      </div>

      <h2>Gestión de Clientes</h2>
      
      {createSuccess && <p style={{ color: 'green' }}>{createSuccess}</p>}
      {createError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{createError}</p>}
      {editSuccess && <p style={{ color: 'green' }}>{editSuccess}</p>}
      {editError && <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{editError}</p>}
      {inactivateMessage && <p style={{ color: inactivateMessage.startsWith('Error') ? 'red' : 'green' }}>{inactivateMessage}</p>}
      {specificSearchError && <p style={{ color: 'red' }}>{specificSearchError}</p>}

      {/* Formularios de Búsqueda Específica (Solo para Admin/Soporte, y si no se muestra otra vista principal) */}
      {isAdminOrSoporte && !showCreateView && !showEditView && !showHistoryView && !showFoundCustomerView && (
        <div style={{ border: '1px solid #444', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
          <h4>Buscar Cliente Específico</h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <form onSubmit={handleSearchByIdSubmit} style={{ flex: 1, minWidth: '250px' }}>
              <label htmlFor="searchIdInput" style={{ display: 'block', marginBottom: '5px' }}>Buscar por ID:</label>
              <div style={{ display: 'flex' }}>
                <input type="number" id="searchIdInput" value={searchIdInput} onChange={(e) => setSearchIdInput(e.target.value)} placeholder="ID del cliente" style={{ padding: '8px', flexGrow: 1, boxSizing: 'border-box' }} />
                <button type="submit" disabled={loadingSpecificSearch} style={{ padding: '8px 15px', marginLeft: '10px' }}>Buscar</button>
              </div>
            </form>
            <form onSubmit={handleSearchByDocumentSubmit} style={{ flex: 2, minWidth: '300px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Buscar por Documento:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={searchDocTypeInput} onChange={(e) => setSearchDocTypeInput(e.target.value)} style={{ padding: '8px', boxSizing: 'border-box' }}>
                  <option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option>
                  <option value="PAS">PAS</option><option value="TI">TI</option><option value="Otro">Otro</option>
                </select>
                <input type="text" value={searchDocNumberInput} onChange={(e) => setSearchDocNumberInput(e.target.value)} placeholder="Número de documento" style={{ padding: '8px', flexGrow: 1, boxSizing: 'border-box' }} />
                <button type="submit" disabled={loadingSpecificSearch} style={{ padding: '8px 15px' }}>Buscar</button>
              </div>
            </form>
          </div>
          {loadingSpecificSearch && <p style={{marginTop: '10px'}}>Buscando cliente...</p>}
        </div>
      )}

      {/* Visualización del Cliente Encontrado */}
      {showFoundCustomerView && (
        <div style={{ border: '1px solid #28a745', padding: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Cliente Encontrado</h3>
          <p><strong>ID:</strong> {foundCustomer.id}</p>
          <p><strong>Nombre:</strong> {foundCustomer.full_name}</p>
          <p><strong>Documento:</strong> {foundCustomer.document_type} {foundCustomer.document_number}</p>
          <p><strong>Teléfono:</strong> {foundCustomer.phone}</p>
          <p><strong>Email:</strong> {foundCustomer.email || '-'}</p>
          <p><strong>Dirección:</strong> {foundCustomer.address || '-'}</p>
          <p><strong>Estado:</strong> {foundCustomer.is_active ? 'Activo' : 'Inactivo'}</p>
          <div style={{marginTop: '15px'}}>
            {isAdminOrSoporte && <button onClick={() => { handleEditClick(foundCustomer); }} style={{marginRight: '10px'}}>Editar este Cliente</button> }
            {isAdminOrSoporte && <button onClick={() => { handleViewHistory(foundCustomer); }} style={{marginRight: '10px'}}>Ver Historial</button>}
            <button onClick={clearSpecificSearch}>Limpiar Búsqueda y Volver</button>
          </div>
        </div>
      )}

      {/* Formulario de Creación */}
      {showCreateView && (
        <div style={{ border: '1px solid #555', padding: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Registrar Nuevo Cliente</h3>
          <form onSubmit={handleCreateCustomerSubmit}>
            <div style={{ marginBottom: '10px' }}><label htmlFor="full_name_new">Nombre Completo: *</label><input type="text" id="full_name_new" name="full_name" value={newCustomer.full_name} onChange={handleNewCustomerChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}><div style={{ flex: 1 }}><label htmlFor="document_type_new">Tipo Documento: *</label><select id="document_type_new" name="document_type" value={newCustomer.document_type} onChange={handleNewCustomerChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}><option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="NIT">NIT</option><option value="PAS">Pasaporte</option><option value="TI">Tarjeta de Identidad</option><option value="Otro">Otro</option></select></div><div style={{ flex: 2 }}><label htmlFor="document_number_new">Número Documento: *</label><input type="text" id="document_number_new" name="document_number" value={newCustomer.document_number} onChange={handleNewCustomerChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div></div>
            <div style={{ marginBottom: '10px' }}><label htmlFor="phone_new">Teléfono: *</label><input type="tel" id="phone_new" name="phone" value={newCustomer.phone} onChange={handleNewCustomerChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ marginBottom: '10px' }}><label htmlFor="email_new">Email (Opcional):</label><input type="email" id="email_new" name="email" value={newCustomer.email} onChange={handleNewCustomerChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ marginBottom: '15px' }}><label htmlFor="address_new">Dirección (Opcional):</label><input type="text" id="address_new" name="address" value={newCustomer.address} onChange={handleNewCustomerChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Cliente</button>
          </form>
        </div>
      )}

      {/* Formulario de Edición */}
      {showEditView && (
        <div style={{ border: '1px solid #007bff', padding: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Editando Cliente: {editingCustomer.full_name} (ID: {editingCustomer.id})</h3>
          <form onSubmit={handleUpdateCustomerSubmit}>
            <div style={{ marginBottom: '10px' }}><label htmlFor="full_name_edit">Nombre Completo: *</label><input type="text" id="full_name_edit" name="full_name" value={editFormData.full_name} onChange={handleEditFormChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}><div style={{ flex: 1 }}><label htmlFor="document_type_edit">Tipo Documento: *</label><select id="document_type_edit" name="document_type" value={editFormData.document_type} onChange={handleEditFormChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}><option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="NIT">NIT</option><option value="PAS">Pasaporte</option><option value="TI">Tarjeta de Identidad</option><option value="Otro">Otro</option></select></div><div style={{ flex: 2 }}><label htmlFor="document_number_edit">Número Documento: *</label><input type="text" id="document_number_edit" name="document_number" value={editFormData.document_number} onChange={handleEditFormChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div></div>
            <div style={{ marginBottom: '10px' }}><label htmlFor="phone_edit">Teléfono: *</label><input type="tel" id="phone_edit" name="phone" value={editFormData.phone} onChange={handleEditFormChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ marginBottom: '10px' }}><label htmlFor="email_edit">Email (Opcional):</label><input type="email" id="email_edit" name="email" value={editFormData.email} onChange={handleEditFormChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ marginBottom: '10px' }}><label htmlFor="address_edit">Dirección (Opcional):</label><input type="text" id="address_edit" name="address" value={editFormData.address} onChange={handleEditFormChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></div>
            <div style={{ marginBottom: '15px' }}><label htmlFor="is_active_edit" style={{ marginRight: '10px' }}>Cliente Activo:</label><input type="checkbox" id="is_active_edit" name="is_active" checked={editFormData.is_active} onChange={handleEditFormChange} /></div>
            <div style={{display: 'flex', gap: '10px'}}><button type="submit" disabled={loadingEdit} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{loadingEdit ? 'Actualizando...' : 'Actualizar Cliente'}</button><button type="button" onClick={handleCancelEdit} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar Edición</button></div>
          </form>
        </div>
      )}

      {/* Historial del Cliente */}
      {showHistoryView && (
        <div style={{ border: '1px solid #ffc107', padding: '20px', marginTop: '20px', marginBottom: '30px', borderRadius: '5px' }}>
          <h3>Historial de: {selectedCustomerForHistory.full_name} (ID: {selectedCustomerForHistory.id})</h3>
          {loadingHistory && <p>Cargando historial...</p>}
          {historyError && <p style={{ color: 'red' }}>{historyError}</p>}
          {!loadingHistory && !historyError && customerHistory.length === 0 && <p>No hay historial disponible para este cliente.</p>}
          {!loadingHistory && !historyError && customerHistory.length > 0 && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {customerHistory.map(entry => (
                <div key={entry.id} style={{ borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '10px' }}>
                  <p><strong>Fecha:</strong> {new Date(entry.date).toLocaleString()}</p>
                  <p><strong>Acción:</strong> {entry.action}</p>
                  <p><strong>Usuario (ID):</strong> {entry.user_id}</p>
                  <p><strong>Detalles:</strong></p>
                  <pre style={{ backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {typeof entry.details === 'string' ? JSON.stringify(JSON.parse(entry.details), null, 2) : JSON.stringify(entry.details, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setSelectedCustomerForHistory(null)} style={{ marginTop: '15px', padding: '8px 15px' }}>Cerrar Historial</button>
        </div>
      )}

      {/* Listado de Clientes */}
      {showMainListView && (
        <>
          <hr style={{margin: '30px 0'}} />
          <h3>Listado de Clientes Registrados</h3>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {loading && <p>Cargando clientes...</p>}
          {!loading && !error && customers.length === 0 && <p>No hay clientes registrados para mostrar.</p>}
          {!loading && !error && customers.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th><th style={tableHeaderStyle}>Nombre Completo</th>
                  <th style={tableHeaderStyle}>Documento</th><th style={tableHeaderStyle}>Teléfono</th>
                  <th style={tableHeaderStyle}>Email</th><th style={tableHeaderStyle}>Estado</th>
                  <th style={tableHeaderStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td style={tableCellStyle}>{customer.id}</td>
                    <td style={tableCellStyle}>{customer.full_name}</td>
                    <td style={tableCellStyle}>{customer.document_type} {customer.document_number}</td>
                    <td style={tableCellStyle}>{customer.phone}</td>
                    <td style={tableCellStyle}>{customer.email || '-'}</td>
                    <td style={tableCellStyle}>{customer.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td style={tableCellStyle}>
                      <button onClick={() => handleEditClick(customer)} style={{marginRight: '5px', padding: '5px 10px', cursor: 'pointer'}}>Editar</button>
                      {customer.is_active && (
                        <button onClick={() => handleInactivateClick(customer.id, customer.full_name)} style={{marginRight: '5px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#ffc107'}}>Inactivar</button>
                      )}
                      {!customer.is_active && (<span style={{color: '#6c757d', marginRight: '5px'}}>(Inactivo)</span>)}
                      <button onClick={() => handleViewHistory(customer)} style={{padding: '5px 10px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white'}}>Historial</button>
                    </td>
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

const tableHeaderStyle = { borderBottom: '2px solid #888', padding: '10px', textAlign: 'left' };
const tableCellStyle = { borderBottom: '1px solid #555', padding: '10px' };

export default CustomersPage;