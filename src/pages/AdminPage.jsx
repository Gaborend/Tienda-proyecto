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
    email: '',
    password: '',
    role: 'caja',
  });
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [loadingCreateUser, setLoadingCreateUser] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editUserFormData, setEditUserFormData] = useState({
    full_name: '',
    email: '',
    role: 'caja',
    is_active: true,
    password: '',
  });
  const [editUserError, setEditUserError] = useState('');
  const [editUserSuccess, setEditUserSuccess] = useState('');
  const [loadingEditUser, setLoadingEditUser] = useState(false);

  // --- Mantenemos todas las funciones (fetchUsers, fetchAuditLog, etc.) ---
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
      const data = await configService.getConfigAuditLog({ limit: 20 });
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
      setEditingStoreSettings(data);
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
      if (name === "next_invoice_number" || name === "low_stock_threshold") {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue)) processedValue = 0;
      } else {
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
      const settingsToSave = {
        ...editingStoreSettings,
        next_invoice_number: parseInt(editingStoreSettings.next_invoice_number, 10) || 0,
        initial_cash_balance: parseFloat(editingStoreSettings.initial_cash_balance) || 0.0,
        iva_percentage: parseFloat(editingStoreSettings.iva_percentage) || 0.0,
        low_stock_threshold: parseInt(editingStoreSettings.low_stock_threshold, 10) || 0,
      };
      const updatedSettings = await configService.updateStoreSettings(settingsToSave);
      setStoreSettings(updatedSettings);
      setEditingStoreSettings(updatedSettings);
      setSettingsSuccess('¡Configuración guardada exitosamente!');
      fetchAuditLog();
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
    try {
      await configService.createUser(newUser);
      setCreateUserSuccess(`¡Usuario ${newUser.username} creado exitosamente!`);
      setNewUser({ username: '', full_name: '', email: '', password: '', role: 'caja' });
      fetchUsers();
      fetchAuditLog();
      setTimeout(() => {
        setShowCreateUserForm(false);
        setCreateUserSuccess('');
      }, 3000);
    } catch (err) {
      setCreateUserError('Error al crear usuario: ' + (err.detail || err.message || JSON.stringify(err)));
    } finally {
      setLoadingCreateUser(false);
    }
  };

  const handleEditUserClick = (userToEdit) => {
    setShowCreateUserForm(false);
    setCreateUserSuccess('');
    setCreateUserError('');
    setEditingUser(userToEdit);
    setEditUserFormData({
      full_name: userToEdit.full_name || '',
      email: userToEdit.email || '',
      role: userToEdit.role || 'caja',
      is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true,
      password: '',
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
    if (!dataToUpdate.password || dataToUpdate.password.trim() === '') {
      delete dataToUpdate.password;
    }

    try {
      await configService.updateUser(editingUser.id, dataToUpdate);
      setEditUserSuccess(`¡Usuario ${editingUser.username} actualizado exitosamente!`);
      fetchUsers();
      fetchAuditLog();
      setTimeout(() => {
        setEditingUser(null);
        setEditUserSuccess('');
      }, 3000);
    } catch (err) {
      setEditUserError('ESTO ES DELICADO: Si está seguro presione Actualizar de nuevo ' );
    } finally {
      setLoadingEditUser(false);
    }
  };
  // --- Fin funciones ---

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '25px', textAlign: 'left' }}>
          <Link to="/dashboard">
              <button style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '14px' }}>
                  ← Volver al Dashboard
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
          // <<< CORRECCIÓN AQUÍ: Quitamos backgroundColor y color, ajustamos borde >>>
          <form onSubmit={handleSaveSettings} style={{
              border: '1px solid #555', // Borde visible en fondo oscuro
              padding: '15px', 
              marginBottom: '20px', 
              // Quitamos backgroundColor y color
          }}>
              <h4>Datos Generales:</h4>
              {/* Todos los inputs... */}
              <div><label htmlFor="store_name">Nombre Tienda:</label><input type="text" id="store_name" name="store_name" value={editingStoreSettings.store_name || ''} onChange={handleSettingChange} required /></div>
              <div><label htmlFor="contact_number">Teléfono Contacto:</label><input type="text" id="contact_number" name="contact_number" value={editingStoreSettings.contact_number || ''} onChange={handleSettingChange} /></div>
              <div><label htmlFor="address">Dirección:</label><input type="text" id="address" name="address" value={editingStoreSettings.address || ''} onChange={handleSettingChange} /></div>
              <div><label htmlFor="invoice_footer">Pie de Factura:</label><input type="text" id="invoice_footer" name="invoice_footer" value={editingStoreSettings.invoice_footer || ''} onChange={handleSettingChange} /></div>
              <div><label htmlFor="store_logo_url">URL Logo:</label><input type="url" id="store_logo_url" name="store_logo_url" value={editingStoreSettings.store_logo_url || ''} onChange={handleSettingChange} /></div>
              <div><label htmlFor="invoice_prefix">Prefijo Factura:</label><input type="text" id="invoice_prefix" name="invoice_prefix" value={editingStoreSettings.invoice_prefix || ''} onChange={handleSettingChange} required /></div>
              <div><label htmlFor="next_invoice_number">Sgte. N° Factura:</label><input type="number" id="next_invoice_number" name="next_invoice_number" value={editingStoreSettings.next_invoice_number || 0} onChange={handleSettingChange} min="1" required /></div>
              <div><label htmlFor="initial_cash_balance">Base Caja Inicial:</label><input type="number" step="any" id="initial_cash_balance" name="initial_cash_balance" value={editingStoreSettings.initial_cash_balance || 0.0} onChange={handleSettingChange} min="0" required /></div>
              <div><label htmlFor="apply_iva_by_default">Aplicar IVA por Defecto:</label><input type="checkbox" id="apply_iva_by_default" name="apply_iva_by_default" checked={editingStoreSettings.apply_iva_by_default || false} onChange={handleSettingChange} /></div>
              <div><label htmlFor="iva_percentage">Porcentaje IVA (%):</label><input type="number" step="any" id="iva_percentage" name="iva_percentage" value={editingStoreSettings.iva_percentage || 0.0} onChange={handleSettingChange} min="0" max="100" required /></div>
              <div><label htmlFor="low_stock_threshold">Umbral Bajo Stock:</label><input type="number" id="low_stock_threshold" name="low_stock_threshold" value={editingStoreSettings.low_stock_threshold || 0} onChange={handleSettingChange} min="0" required /></div>
              <button type="submit" disabled={loadingSettings} style={{marginTop: '10px'}}>Guardar Configuración</button>
          </form>
        )}
        <button onClick={fetchStoreSettings} disabled={loadingSettings} style={{marginTop: '10px'}}>Recargar Configuración</button>
      </section>
      
      <hr />

      {/* Sección Usuarios */}
      <section style={{ marginBottom: '40px' }}>
        <h3>Usuarios del Sistema</h3>
        {loadingUsers ? <p>Cargando usuarios...</p> : (
          users.length > 0 ? (
            <ul>
              {users.map(user => (
                <li key={user.id}>
                  ID: {user.id}, Usuario: {user.username}, Nombre: {user.full_name}, Rol: {user.role}, Activo: {user.is_active ? 'Sí' : 'No'}
                  <button onClick={() => handleEditUserClick(user)} style={{ marginLeft: '10px' }}>Editar</button>
                </li>
              ))}
            </ul>
          ) : <p>No hay usuarios para mostrar.</p>
        )}
        <button onClick={fetchUsers} disabled={loadingUsers}>Recargar Usuarios</button>

        <div style={{marginTop: '10px'}}>
            {createUserSuccess && <p style={{ color: 'green' }}>{createUserSuccess}</p>}
            {createUserError && <p style={{ color: 'red' }}>{createUserError}</p>}
            {editUserSuccess && <p style={{ color: 'green' }}>{editUserSuccess}</p>}
            {editUserError && <p style={{ color: 'red' }}>{editUserError}</p>}
        </div>

        <div style={{marginTop: '20px'}}>
          <button onClick={() => { 
            setShowCreateUserForm(!showCreateUserForm); 
            setEditingUser(null); 
            setCreateUserError(''); 
            setCreateUserSuccess('');
            setEditUserError(''); 
            setEditUserSuccess('');
          }}>
            {showCreateUserForm && !editingUser ? 'Cancelar Creación' : (editingUser ? 'Crear Nuevo Usuario' : 'Crear Nuevo Usuario')}
          </button>

          {showCreateUserForm && !editingUser && ( 
            // <<< CORRECCIÓN AQUÍ >>>
            <form onSubmit={handleCreateUserSubmit} style={{
                marginTop: '10px', 
                border: '1px solid #555', // Borde oscuro
                padding: '15px', 
                // Quitamos backgroundColor y color
            }}>
              <h4>Formulario de Nuevo Usuario</h4>
              <div><label htmlFor="username_new">Username:</label><input type="text" id="username_new" name="username" value={newUser.username} onChange={handleNewUserChange} required /></div>
              <div><label htmlFor="full_name_new">Nombre Completo:</label><input type="text" id="full_name_new" name="full_name" value={newUser.full_name} onChange={handleNewUserChange} required /></div>
              <div><label htmlFor="email_new">Email*:</label><input type="email" id="email_new" name="email" value={newUser.email} onChange={handleNewUserChange} /></div>
              <div><label htmlFor="password_new">Contraseña:</label><input type="password" id="password_new" name="password" value={newUser.password} onChange={handleNewUserChange} required minLength="6" /></div>
              <div><label htmlFor="role_new">Rol:</label><select id="role_new" name="role" value={newUser.role} onChange={handleNewUserChange}><option value="caja">Caja</option><option value="admin">Admin</option><option value="soporte">Soporte</option></select></div>
              <button type="submit" disabled={loadingCreateUser} style={{marginTop: '10px'}}>{loadingCreateUser ? 'Creando...' : 'Crear Usuario'}</button>
            </form>
          )}
        </div>

        {editingUser && (
          // <<< CORRECCIÓN AQUÍ >>>
          <div style={{
              marginTop: '20px', 
              border: '1px solid #007bff', // Mantenemos borde azul para destacar
              padding: '15px', 
              // Quitamos backgroundColor y color
          }}>
            <h4>Editando Usuario: {editingUser.username} (ID: {editingUser.id})</h4>
            <form onSubmit={handleUpdateUserSubmit}>
              <div><label htmlFor="full_name_edit">Nombre Completo:</label><input type="text" id="full_name_edit" name="full_name" value={editUserFormData.full_name} onChange={handleEditUserFormChange} required /></div>
              <div><label htmlFor="email_edit">Email (Opcional):</label><input type="email" id="email_edit" name="email" value={editUserFormData.email} onChange={handleEditUserFormChange} /></div>
              <div><label htmlFor="password_edit">Nueva Contraseña (dejar en blanco para no cambiar):</label><input type="password" id="password_edit" name="password" value={editUserFormData.password} onChange={handleEditUserFormChange} minLength="6" /></div>
              <div><label htmlFor="role_edit">Rol:</label><select id="role_edit" name="role" value={editUserFormData.role} onChange={handleEditUserFormChange}><option value="caja">Caja</option><option value="admin">Admin</option><option value="soporte">Soporte</option></select></div>
              <div><label htmlFor="is_active_edit">Activo:</label><input type="checkbox" id="is_active_edit" name="is_active" checked={editUserFormData.is_active} onChange={handleEditUserFormChange} /></div>
              <div style={{marginTop: '10px'}}>
                <button type="submit" disabled={loadingEditUser}>{loadingEditUser ? 'Actualizando...' : 'Actualizar Usuario'}</button>
                <button type="button" onClick={handleCancelEdit} style={{ marginLeft: '10px' }} disabled={loadingEditUser}>Cancelar Edición</button>
              </div>
            </form>
          </div>
        )}
      </section>

      <hr />

      {/* Sección Log de Auditoría */}
      <section>
        <h3>Log de Auditoría de Configuración</h3>
        {loadingAuditLog ? <p>Cargando log...</p> : (
          // <<< CORRECCIÓN AQUÍ >>>
          <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid #555', // Borde oscuro
              padding: '10px', 
              // Quitamos backgroundColor y color
          }}>
            {auditLog.length > 0 ? (
              auditLog.map(logEntry => (
                <div key={logEntry.id} style={{ marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #444' }}> {/* Borde interno más oscuro */}
                  <p><strong>ID Log:</strong> {logEntry.id} | <strong>Fecha:</strong> {new Date(logEntry.timestamp).toLocaleString()}</p>
                  <p><strong>Usuario:</strong> {logEntry.username_performing_action} (ID: {logEntry.user_id_performing_action})</p>
                  <p><strong>Acción:</strong> {logEntry.action_type}</p>
                  {logEntry.target_entity_type && <p><strong>Entidad:</strong> {logEntry.target_entity_type} (ID: {logEntry.target_entity_id || 'N/A'})</p>}
                  {/* <<< CORRECCIÓN AQUÍ: Quitamos estilos de <pre> >>> */}
                  <p><strong>Detalles:</strong> <pre>{JSON.stringify(logEntry.details, null, 2)}</pre></p>
                </div>
              ))
            ) : <p>No hay entradas en el log de auditoría.</p>}
          </div>
        )}
        <button onClick={fetchAuditLog} disabled={loadingAuditLog} style={{marginTop: '10px'}}>Recargar Log de Auditoría</button>
      </section>
    </div>
  );
}

export default AdminPage;