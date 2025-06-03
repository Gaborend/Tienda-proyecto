// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import configService from '../services/configService';

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [error, setError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);

  const [storeSettings, setStoreSettings] = useState(null);
  const [editingStoreSettings, setEditingStoreSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    email: '', // Se mantiene como string vacío para el input controlado
    password: '',
    role: 'caja',
  });
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [loadingCreateUser, setLoadingCreateUser] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editUserFormData, setEditUserFormData] = useState({
    full_name: '',
    email: '', // Se mantiene como string vacío para el input controlado
    role: 'caja',
    is_active: true,
    password: '',
  });
  const [editUserError, setEditUserError] = useState('');
  const [editUserSuccess, setEditUserSuccess] = useState('');
  const [loadingEditUser, setLoadingEditUser] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const data = await configService.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar usuarios: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLog = async () => {
    setLoadingAuditLog(true);
    setError('');
    try {
      const data = await configService.getConfigAuditLog({ limit: 20 }); // O el límite que se prefiera
      setAuditLog(data);
    } catch (err) {
      setError('Error al cargar el log de auditoría: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingAuditLog(false);
    }
  };

  const fetchStoreSettings = async () => {
    setLoadingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const data = await configService.getStoreSettings();
      setStoreSettings(data);
      setEditingStoreSettings(data); // Inicializa el formulario de edición con los datos actuales
    } catch (err) {
      setSettingsError('Error al cargar la configuración de la tienda: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLog();
    fetchStoreSettings();
  }, []);

  const handleSettingChange = (event) => {
    const { name, value, type, checked } = event.target;
    let processedValue = value;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'number') {
      // Para campos específicos que deben ser enteros
      if (name === "next_invoice_number" || name === "low_stock_threshold") {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue)) processedValue = 0; // o el valor anterior, o string vacío para revalidación
      } else { // Para otros campos numéricos que pueden ser flotantes
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) processedValue = 0.0;
      }
    }
    setEditingStoreSettings(prevSettings => ({
      ...prevSettings,
      [name]: processedValue,
    }));
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setLoadingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      // Asegurar que los números se envíen como números
      const settingsToSave = {
        ...editingStoreSettings,
        next_invoice_number: parseInt(editingStoreSettings.next_invoice_number, 10) || 0,
        initial_cash_balance: parseFloat(editingStoreSettings.initial_cash_balance) || 0.0,
        iva_percentage: parseFloat(editingStoreSettings.iva_percentage) || 0.0,
        low_stock_threshold: parseInt(editingStoreSettings.low_stock_threshold, 10) || 0,
      };
      const updatedSettings = await configService.updateStoreSettings(settingsToSave);
      setStoreSettings(updatedSettings);
      setEditingStoreSettings(updatedSettings); // Actualizar también el formulario de edición
      setSettingsSuccess('¡Configuración guardada exitosamente!');
      fetchAuditLog(); // Recargar log para ver el cambio
    } catch (err) {
      setSettingsError('Error al guardar la configuración: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleNewUserChange = (event) => {
    const { name, value } = event.target;
    setNewUser(prevUser => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const handleCreateUserSubmit = async (event) => {
    event.preventDefault();
    setLoadingCreateUser(true);
    setCreateUserError('');
    setCreateUserSuccess('');

    const payload = { ...newUser };
    // Si el email está vacío, enviar null al backend
    if (payload.email.trim() === '') {
      payload.email = null;
    }

    try {
      await configService.createUser(payload); // Usar el payload modificado
      setCreateUserSuccess(`¡Usuario ${newUser.username} creado exitosamente!`);
      setNewUser({ username: '', full_name: '', email: '', password: '', role: 'caja' }); // Reset form
      fetchUsers(); // Recargar lista de usuarios
      fetchAuditLog(); // Recargar log
      setTimeout(() => {
        setShowCreateUserForm(false); // Opcional: cerrar formulario tras éxito
        setCreateUserSuccess(''); // Limpiar mensaje de éxito
      }, 3000);
    } catch (err) {
      setCreateUserError('Error al crear usuario: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingCreateUser(false);
    }
  };

  const handleEditUserClick = (userToEdit) => {
    setShowCreateUserForm(false); // Ocultar form de creación si está abierto
    setCreateUserSuccess('');
    setCreateUserError('');
    setEditingUser(userToEdit);
    setEditUserFormData({
      full_name: userToEdit.full_name || '',
      email: userToEdit.email || '', // El backend espera null si es opcional y vacío
      role: userToEdit.role || 'caja',
      is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true,
      password: '', // Password siempre vacío al editar, solo se envía si se quiere cambiar
    });
    setEditUserError('');
    setEditUserSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditUserError('');
    setEditUserSuccess('');
  };

  const handleEditUserFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditUserFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpdateUserSubmit = async (event) => {
    event.preventDefault();
    if (!editingUser) return;

    setLoadingEditUser(true);
    setEditUserError('');
    setEditUserSuccess('');

    const dataToUpdate = { ...editUserFormData };
    // Si la contraseña está vacía, no se envía para no cambiarla
    if (!dataToUpdate.password || dataToUpdate.password.trim() === '') {
      delete dataToUpdate.password;
    }
    // Si el email está vacío, enviar null al backend
    if (dataToUpdate.email && dataToUpdate.email.trim() === '') {
      dataToUpdate.email = null;
    } else if (dataToUpdate.email === '') { // Si era null y se borró a ""
        dataToUpdate.email = null;
    }


    try {
      await configService.updateUser(editingUser.id, dataToUpdate);
      setEditUserSuccess(`¡Usuario ${editingUser.username} actualizado exitosamente!`);
      fetchUsers(); // Recargar lista
      fetchAuditLog(); // Recargar log
      setTimeout(() => {
        setEditingUser(null); // Cerrar formulario de edición
        setEditUserSuccess(''); // Limpiar mensaje de éxito
      }, 3000);
    } catch (err) {
      // Mantener el mensaje de error que tenías
      setEditUserError('ESTO ES DELICADO: Si está seguro presione Actualizar de nuevo ' );
    } finally {
      setLoadingEditUser(false);
    }
  };

  // --- Estilos para los formularios (para que se vean bien en tema oscuro) ---
  const formSectionStyle = {
    border: '1px solid #555',
    padding: '20px',
    marginTop: '20px',
    borderRadius: '8px',
    backgroundColor: '#2a2a2a' // Un fondo ligeramente diferente para la sección del formulario
  };

  const formInputStyle = {
    display: 'block',
    width: 'calc(100% - 20px)', // Ajustar para padding interno
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: 'white'
  };
  
  const formLabelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  };

  const formSelectStyle = { ...formInputStyle }; // Select puede usar el mismo estilo base
  
  const formButtonStyle = {
    padding: '10px 15px',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    marginRight: '10px'
  };
  
  const formCheckboxLabelStyle = {
    marginLeft: '5px',
    fontWeight: 'normal'
  };


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: 'white' }}> {/* Asumiendo tema oscuro */}
      <div style={{ marginBottom: '25px', textAlign: 'left' }}>
          <Link to="/dashboard">
              <button style={{ ...formButtonStyle, backgroundColor: '#6c757d' }}>
                  ← Volver al Inicio 
              </button>
          </Link>
      </div>

      <h2>Panel de Administración y Configuración</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Sección Configuración de la Tienda */}
      <section style={{ marginBottom: '40px' }}>
        <h3>Configuración de la Tienda</h3>
        {loadingSettings && <p>Cargando configuración...</p>}
        {settingsError && <p style={{ color: 'red' }}>{settingsError}</p>}
        {settingsSuccess && <p style={{ color: 'green' }}>{settingsSuccess}</p>}
        {editingStoreSettings && !loadingSettings && (
          <form onSubmit={handleSaveSettings} style={formSectionStyle}>
            <h4>Datos Generales:</h4>
            <div><label style={formLabelStyle} htmlFor="store_name">Nombre Tienda:</label><input style={formInputStyle} type="text" id="store_name" name="store_name" value={editingStoreSettings.store_name || ''} onChange={handleSettingChange} required /></div>
            <div><label style={formLabelStyle} htmlFor="contact_number">Teléfono Contacto:</label><input style={formInputStyle} type="text" id="contact_number" name="contact_number" value={editingStoreSettings.contact_number || ''} onChange={handleSettingChange} /></div>
            <div><label style={formLabelStyle} htmlFor="address">Dirección:</label><input style={formInputStyle} type="text" id="address" name="address" value={editingStoreSettings.address || ''} onChange={handleSettingChange} /></div>
            <div><label style={formLabelStyle} htmlFor="invoice_footer">Pie de Factura:</label><input style={formInputStyle} type="text" id="invoice_footer" name="invoice_footer" value={editingStoreSettings.invoice_footer || ''} onChange={handleSettingChange} /></div>
            <div><label style={formLabelStyle} htmlFor="store_logo_url">URL Logo:</label><input style={formInputStyle} type="url" id="store_logo_url" name="store_logo_url" value={editingStoreSettings.store_logo_url || ''} onChange={handleSettingChange} /></div>
            <div><label style={formLabelStyle} htmlFor="invoice_prefix">Prefijo Factura:</label><input style={formInputStyle} type="text" id="invoice_prefix" name="invoice_prefix" value={editingStoreSettings.invoice_prefix || ''} onChange={handleSettingChange} required /></div>
            <div><label style={formLabelStyle} htmlFor="next_invoice_number">Sgte. N° Factura:</label><input style={formInputStyle} type="number" id="next_invoice_number" name="next_invoice_number" value={editingStoreSettings.next_invoice_number || 0} onChange={handleSettingChange} min="1" required /></div>
            <div><label style={formLabelStyle} htmlFor="initial_cash_balance">Base Caja Inicial:</label><input style={formInputStyle} type="number" step="any" id="initial_cash_balance" name="initial_cash_balance" value={editingStoreSettings.initial_cash_balance || 0.0} onChange={handleSettingChange} min="0" required /></div>
            <div style={{ margin: '10px 0'}}><input type="checkbox" id="apply_iva_by_default" name="apply_iva_by_default" checked={editingStoreSettings.apply_iva_by_default || false} onChange={handleSettingChange} /><label style={formCheckboxLabelStyle} htmlFor="apply_iva_by_default">Aplicar IVA por Defecto</label></div>
            <div><label style={formLabelStyle} htmlFor="iva_percentage">Porcentaje IVA (%):</label><input style={formInputStyle} type="number" step="any" id="iva_percentage" name="iva_percentage" value={editingStoreSettings.iva_percentage || 0.0} onChange={handleSettingChange} min="0" max="100" required /></div>
            <div><label style={formLabelStyle} htmlFor="low_stock_threshold">Umbral Bajo Stock:</label><input style={formInputStyle} type="number" id="low_stock_threshold" name="low_stock_threshold" value={editingStoreSettings.low_stock_threshold || 0} onChange={handleSettingChange} min="0" required /></div>
            <button type="submit" disabled={loadingSettings} style={{...formButtonStyle, marginTop: '15px'}}>Guardar Configuración</button>
          </form>
        )}
        <button onClick={fetchStoreSettings} disabled={loadingSettings} style={{...formButtonStyle, backgroundColor: '#6c757d', marginTop: '10px'}}>Recargar Configuración</button>
      </section>
      
      <hr style={{borderColor: '#444'}} />

      {/* Sección Usuarios */}
      <section style={{ marginBottom: '40px' }}>
        <h3>Usuarios del Sistema</h3>
        {loadingUsers ? <p>Cargando usuarios...</p> : (
          users.length > 0 ? (
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {users.map(user => (
                <li key={user.id} style={{ borderBottom: '1px solid #444', padding: '10px 0', marginBottom: '5px' }}>
                  ID: {user.id}, Usuario: {user.username}, Nombre: {user.full_name}, Email: {user.email || 'N/A'}, Rol: {user.role}, Activo: {user.is_active ? 'Sí' : 'No'}
                  <button onClick={() => handleEditUserClick(user)} style={{ ...formButtonStyle, backgroundColor: '#ffc107', color: '#333', marginLeft: '10px', padding: '5px 10px', fontSize:'0.9em' }}>Editar</button>
                </li>
              ))}
            </ul>
          ) : <p>No hay usuarios para mostrar.</p>
        )}
        <button onClick={fetchUsers} disabled={loadingUsers} style={{...formButtonStyle, backgroundColor: '#6c757d', marginTop: '10px'}}>Recargar Usuarios</button>

        <div style={{marginTop: '10px'}}>
            {createUserSuccess && <p style={{ color: 'green' }}>{createUserSuccess}</p>}
            {createUserError && <p style={{ color: 'red' }}>{createUserError}</p>}
            {editUserSuccess && <p style={{ color: 'green' }}>{editUserSuccess}</p>}
            {editUserError && <p style={{ color: 'red' }}>{editUserError}</p>}
        </div>

        <div style={{marginTop: '20px'}}>
          <button 
            onClick={() => { 
              setShowCreateUserForm(!showCreateUserForm); 
              setEditingUser(null); // Si se abre el form de creación, se cancela la edición
              setCreateUserError(''); setCreateUserSuccess('');
              setEditUserError(''); setEditUserSuccess('');
            }}
            style={formButtonStyle}
          >
            {showCreateUserForm && !editingUser ? 'Cancelar Creación de Usuario' : 'Crear Nuevo Usuario'}
          </button>

          {showCreateUserForm && !editingUser && ( 
            <form onSubmit={handleCreateUserSubmit} style={formSectionStyle}>
              <h4>Formulario de Nuevo Usuario</h4>
              <div><label style={formLabelStyle} htmlFor="username_new">Username:</label><input style={formInputStyle} type="text" id="username_new" name="username" value={newUser.username} onChange={handleNewUserChange} required /></div>
              <div><label style={formLabelStyle} htmlFor="full_name_new">Nombre Completo:</label><input style={formInputStyle} type="text" id="full_name_new" name="full_name" value={newUser.full_name} onChange={handleNewUserChange} required /></div>
              {/* MODIFICACIÓN: Etiqueta de Email y ya no es 'required' en el input, aunque no lo tenía */}
              <div><label style={formLabelStyle} htmlFor="email_new">Email (Opcional):</label><input style={formInputStyle} type="email" id="email_new" name="email" value={newUser.email} onChange={handleNewUserChange} /></div>
              <div><label style={formLabelStyle} htmlFor="password_new">Contraseña:</label><input style={formInputStyle} type="password" id="password_new" name="password" value={newUser.password} onChange={handleNewUserChange} required minLength="6" /></div>
              <div><label style={formLabelStyle} htmlFor="role_new">Rol:</label>
                <select id="role_new" name="role" value={newUser.role} onChange={handleNewUserChange} style={formSelectStyle}>
                    <option value="caja">Caja</option>
                    <option value="admin">Admin</option>
                    <option value="soporte">Soporte</option>
                </select>
              </div>
              <button type="submit" disabled={loadingCreateUser} style={{...formButtonStyle, marginTop: '15px'}}>{loadingCreateUser ? 'Creando...' : 'Crear Usuario'}</button>
            </form>
          )}
        </div>

        {editingUser && (
          <div style={{ ...formSectionStyle, borderColor: '#007bff' }}> {/* Destacar formulario de edición */}
            <h4>Editando Usuario: {editingUser.username} (ID: {editingUser.id})</h4>
            <form onSubmit={handleUpdateUserSubmit}>
              <div><label style={formLabelStyle} htmlFor="full_name_edit">Nombre Completo:</label><input style={formInputStyle} type="text" id="full_name_edit" name="full_name" value={editUserFormData.full_name} onChange={handleEditUserFormChange} required /></div>
              <div><label style={formLabelStyle} htmlFor="email_edit">Email (Opcional):</label><input style={formInputStyle} type="email" id="email_edit" name="email" value={editUserFormData.email} onChange={handleEditUserFormChange} /></div>
              <div><label style={formLabelStyle} htmlFor="password_edit">Nueva Contraseña (dejar en blanco para no cambiar):</label><input style={formInputStyle} type="password" id="password_edit" name="password" value={editUserFormData.password} onChange={handleEditUserFormChange} minLength="6" /></div>
              <div><label style={formLabelStyle} htmlFor="role_edit">Rol:</label>
                <select id="role_edit" name="role" value={editUserFormData.role} onChange={handleEditUserFormChange} style={formSelectStyle}>
                    <option value="caja">Caja</option><option value="admin">Admin</option><option value="soporte">Soporte</option>
                </select>
              </div>
              <div style={{ margin: '10px 0'}}><input type="checkbox" id="is_active_edit" name="is_active" checked={editUserFormData.is_active} onChange={handleEditUserFormChange} /><label style={formCheckboxLabelStyle} htmlFor="is_active_edit">Activo</label></div>
              <div style={{marginTop: '10px'}}>
                <button type="submit" disabled={loadingEditUser} style={formButtonStyle}>{loadingEditUser ? 'Actualizando...' : 'Actualizar Usuario'}</button>
                <button type="button" onClick={handleCancelEdit} style={{ ...formButtonStyle, backgroundColor: '#6c757d', marginLeft: '10px' }} disabled={loadingEditUser}>Cancelar Edición</button>
              </div>
            </form>
          </div>
        )}
      </section>

      <hr style={{borderColor: '#444'}}/>

      {/* Sección Log de Auditoría */}
      <section>
        <h3>Log de Auditoría de Configuración</h3>
        {loadingAuditLog ? <p>Cargando log...</p> : (
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #555', 
            padding: '10px',
            backgroundColor: '#1e1e1e' // Fondo para la caja del log
          }}>
            {auditLog.length > 0 ? (
              auditLog.map(logEntry => (
                <div key={logEntry.id} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #444', fontSize: '0.9em' }}>
                  <p><strong>ID Log:</strong> {logEntry.id} | <strong>Fecha:</strong> {new Date(logEntry.timestamp).toLocaleString()}</p>
                  <p><strong>Usuario:</strong> {logEntry.username_performing_action} (ID: {logEntry.user_id_performing_action})</p>
                  <p><strong>Acción:</strong> {logEntry.action_type}</p>
                  {logEntry.target_entity_type && <p><strong>Entidad:</strong> {logEntry.target_entity_type} (ID: {logEntry.target_entity_id || 'N/A'})</p>}
                  <p><strong>Detalles:</strong></p> 
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#2b2b2b', padding: '8px', borderRadius: '4px', fontSize: '0.85em' }}>
                    {JSON.stringify(logEntry.details, null, 2)}
                  </pre>
                </div>
              ))
            ) : <p>No hay entradas en el log de auditoría.</p>}
          </div>
        )}
        <button onClick={fetchAuditLog} disabled={loadingAuditLog} style={{...formButtonStyle, backgroundColor: '#6c757d', marginTop: '10px'}}>Recargar Log de Auditoría</button>
      </section>
    </div>
  );
}

export default AdminPage;