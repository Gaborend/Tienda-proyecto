from fastapi import APIRouter, Depends, HTTPException, status, Query 
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime, timedelta, timezone, date 
import jwt
from pathlib import Path
import hashlib
import json
from pydantic import BaseModel, EmailStr, Field, field_validator 
from pydantic import ValidationInfo 

router = APIRouter()

SECRET_KEY = "tu_clave_secreta_muy_segura_cambiame_en_produccion_AHORA_MISMO"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

DATA_DIR = Path("data")
USERS_FILE = DATA_DIR / "users.csv"
CONFIG_FILE = DATA_DIR / "config.json"

# Archivo y columnas para el log de auditoría de configuración 
CONFIG_AUDIT_LOG_FILE = DATA_DIR / "config_audit_log.csv"
CONFIG_AUDIT_LOG_COLUMNS = [
    "id", "timestamp", "user_id_performing_action", "username_performing_action",
    "action_type", "target_entity_type", "target_entity_id", "details"
]


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token") 


class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    full_name: str = Field(..., min_length=3)
    email: Optional[EmailStr] = None
    role: str 

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=3)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class UserInDB(UserBase): 
    id: int
    is_active: bool
    

class UserResponse(UserBase):
    id: int
    is_active: bool
    
class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user_id: int
    
class StoreConfig(BaseModel):
    store_name: str = Field(..., min_length=3)
    contact_number: Optional[str] = None
    address: Optional[str] = None
    invoice_footer: Optional[str] = None
    #  URL del Logo 
    store_logo_url: Optional[str] = Field(None, description="URL del logo de la tienda")
    
    invoice_prefix: str = Field("INV-", min_length=1)
    next_invoice_number: int = Field(1, ge=1)
    initial_cash_balance: float = Field(0.0, ge=0)
    apply_iva_by_default: bool = False
    iva_percentage: float = Field(19.0, ge=0, le=100)
    low_stock_threshold: int = Field(5, ge=0)

#  Modelo para la respuesta del log de auditoría de configuración 
class ConfigAuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id_performing_action: int
    username_performing_action: str
    action_type: str
    target_entity_type: Optional[str] = None
    target_entity_id: Optional[str] = None
    details: Dict[str, Any]




def get_password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return get_password_hash(plain_password) == hashed_password

def load_df(file_path: Path, columns: Optional[List[str]] = None) -> pd.DataFrame:
    if not file_path.parent.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True) # Asegurar que el directorio data exista
    if not file_path.exists():
        if columns:
            return pd.DataFrame(columns=columns)
        else:
            raise FileNotFoundError(f"El archivo {file_path} no existe y no se especificaron columnas.")
    try:
        return pd.read_csv(file_path)
    except pd.errors.EmptyDataError:
        if columns:
            return pd.DataFrame(columns=columns)
        else:
            return pd.DataFrame()
    except Exception as e: # Captura genérica para debugging si hay otros problemas de lectura
        print(f"Error leyendo el archivo {file_path}: {e}")
        if columns: return pd.DataFrame(columns=columns)
        return pd.DataFrame()
            
def save_df(df: pd.DataFrame, file_path: Path):
    if not file_path.parent.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(file_path, index=False)
    
#  Función para registrar acciones de auditoría de configuración 
def log_config_audit_action(
    performing_user: Dict[str, Any], # El diccionario del usuario que realiza la acción
    action_type: str, 
    details: Dict[str, Any],
    target_entity_type: Optional[str] = None,
    target_entity_id: Optional[Any] = None
):
    """Registra una acción de auditoría relacionada con la configuración o usuarios."""
    audit_df = load_df(CONFIG_AUDIT_LOG_FILE, columns=CONFIG_AUDIT_LOG_COLUMNS)
    next_id = audit_df["id"].max() + 1 if not audit_df.empty and "id" in audit_df.columns else 1
    now = datetime.now(timezone.utc) # Usar UTC para consistencia
    
    log_entry = {
        "id": next_id,
        "timestamp": now.isoformat(), # Guardar como ISO string
        "user_id_performing_action": performing_user.get("id"),
        "username_performing_action": performing_user.get("username"),
        "action_type": action_type,
        "target_entity_type": target_entity_type,
        "target_entity_id": str(target_entity_id) if target_entity_id is not None else None,
        "details": json.dumps(details) # Guardar detalles como string JSON
    }
    new_log_df = pd.DataFrame([log_entry])
    # Asegurar que las columnas coincidan antes de concatenar, especialmente si el CSV estaba vacío
    for col in CONFIG_AUDIT_LOG_COLUMNS:
        if col not in new_log_df.columns:
            new_log_df[col] = None # o pd.NA

    audit_df = pd.concat([audit_df, new_log_df], ignore_index=True)
    save_df(audit_df, CONFIG_AUDIT_LOG_FILE)


def create_default_admin(): # Esta función se llama desde main.py al inicio
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])

    if users_df[users_df["username"] == "soporte"].empty:
        next_id = users_df["id"].max() + 1 if not users_df.empty else 1
        soporte_user = {
            "id": next_id, "username": "soporte", "hashed_password": get_password_hash("soporte123"),
            "full_name": "Soporte Técnico", "email": "soporte@tienda.com", "role": "soporte", "is_active": True
        }
        users_df = pd.concat([users_df, pd.DataFrame([soporte_user])], ignore_index=True)
        print("Usuario 'soporte' creado por defecto.")

    if users_df[users_df["username"] == "admin"].empty:
        next_id = users_df["id"].max() + 1 if not users_df.empty else (users_df["id"].max() + 1 if not users_df.empty else 1)
        admin_user = {
            "id": next_id, "username": "admin", "hashed_password": get_password_hash("admin123"),
            "full_name": "Administrador General", "email": "admin@tienda.com", "role": "admin", "is_active": True
        }
        users_df = pd.concat([users_df, pd.DataFrame([admin_user])], ignore_index=True)
        print("Usuario 'admin' creado por defecto.")
    save_df(users_df, USERS_FILE)

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if users_df.empty: return None
    user_series = users_df[users_df["username"] == username]
    if user_series.empty: return None
    
    user_dict = user_series.iloc[0].to_dict()
    if not verify_password(password, user_dict["hashed_password"]): return None
    return user_dict

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) # Ajustado para usar la constante
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_data(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales", headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        user_id: Optional[int] = payload.get("user_id")
        if username is None or role is None or user_id is None: # Validar user_id también
            raise credentials_exception
        token_data = TokenData(username=username, role=role, user_id=user_id)
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError): # Usar InvalidTokenError más genérico
        raise credentials_exception
    return token_data

async def get_current_active_user(current_user_data: TokenData = Depends(get_current_user_data)) -> Dict[str, Any]:
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if users_df.empty: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sistema de usuarios no inicializado")
    
    user_series = users_df[users_df["id"] == current_user_data.user_id] 
    if user_series.empty:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario del token no encontrado")
    
    user_dict = user_series.iloc[0].to_dict()
    if not user_dict.get("is_active", False): # Usar .get() para seguridad
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo")
    return user_dict

async def get_admin_or_support_user(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    if current_user.get("role") not in ["admin", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol de Administrador o Soporte")
    return current_user

async def get_support_user(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    if current_user.get("role") != "soporte":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol de Soporte")
    return current_user


@router.get("/users", response_model=List[UserResponse])
async def read_users(current_user_actor: Dict[str, Any] = Depends(get_admin_or_support_user)): # Renombrado para claridad
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if users_df.empty: return []
    return users_df.drop(columns=["hashed_password"]).to_dict("records")

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(user: UserCreate, current_user_actor: Dict[str, Any] = Depends(get_admin_or_support_user)):
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if not users_df[users_df["username"] == user.username].empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de usuario ya existe")
    if user.role not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol de usuario inválido")

    next_id = users_df["id"].max() + 1 if not users_df.empty and "id" in users_df.columns else 1
    new_user_data = user.dict()
    new_user_data["id"] = next_id
    new_user_data["hashed_password"] = get_password_hash(new_user_data.pop("password"))
    new_user_data["is_active"] = True 

    users_df = pd.concat([users_df, pd.DataFrame([new_user_data])], ignore_index=True)
    save_df(users_df, USERS_FILE)
    
    #  Registrar acción de auditoría 
    log_config_audit_action(
        performing_user=current_user_actor,
        action_type="USER_CREATED",
        target_entity_type="user",
        target_entity_id=new_user_data["id"],
        details={
            "username": new_user_data["username"], 
            "role": new_user_data["role"], 
            "full_name": new_user_data["full_name"],
            "email": new_user_data.get("email"),
            "is_active": new_user_data["is_active"]
        }
    )
    
    
    created_user_response_data = {k: v for k, v in new_user_data.items() if k != "hashed_password"}
    return UserResponse(**created_user_response_data)

@router.put("/users/{user_id_to_update}", response_model=UserResponse) # Renombrado para claridad
async def update_existing_user(
    user_id_to_update: int, 
    user_update_data: UserUpdate, 
    current_user_actor: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    user_index = users_df[users_df["id"] == user_id_to_update].index
    if user_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    idx = user_index[0]
    update_data_dict = user_update_data.dict(exclude_unset=True) # Solo campos enviados
    
    # Guardar una copia de los datos originales para el log, antes de modificar
    # original_user_data_for_log = users_df.loc[idx].to_dict() # Opcional para más detalle en log

    if "password" in update_data_dict and update_data_dict["password"]:
        users_df.loc[idx, "hashed_password"] = get_password_hash(update_data_dict.pop("password"))
    if "role" in update_data_dict and update_data_dict["role"] not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol de usuario inválido")
    
    changed_fields = {} # Para el log de auditoría
    for key, value in update_data_dict.items():
        if key != "id" and key != "password": # ID no se cambia, password ya se manejó
            if users_df.loc[idx, key] != value: # Loguear solo si realmente cambió
                 changed_fields[key] = {"old": users_df.loc[idx, key], "new": value}
            users_df.loc[idx, key] = value
    
    save_df(users_df, USERS_FILE)
    
    # Registrar acción de auditoría si hubo cambios 
    if changed_fields: # Solo loguear si algo cambió
        log_config_audit_action(
            performing_user=current_user_actor,
            action_type="USER_UPDATED",
            target_entity_type="user",
            target_entity_id=user_id_to_update,
            details=changed_fields 
        )
    

    updated_user_dict_response = users_df.loc[idx].to_dict()
    # Quitar el hash para la respuesta
    if "hashed_password" in updated_user_dict_response:
        del updated_user_dict_response["hashed_password"]
        
    return UserResponse(**updated_user_dict_response)

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    # Quitar el hash para la respuesta
    current_user_response_data = {k: v for k, v in current_user.items() if k != "hashed_password"}
    return UserResponse(**current_user_response_data)


@router.get("/store-settings", response_model=StoreConfig) # Dependencia es para cualquier usuario activo
async def get_store_config(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    if not CONFIG_FILE.exists():
        # Si el archivo no existe, podríamos crear uno con valores por defecto aquí o manejar el error.
        # Por ahora, si no existe, es un error, pero startup_db_client debería crearlo.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo de configuración no encontrado.")
    with open(CONFIG_FILE, 'r') as f:
        config_data = json.load(f)
    return StoreConfig(**config_data)

@router.put("/store-settings", response_model=StoreConfig)
async def update_store_config(
    config_update: StoreConfig, 
    current_user_actor: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    # Modificado Registrar acción de auditoría
    # Para tener los "cambios", necesitamos cargar la config vieja primero
    old_config_data = {}
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f_old:
            try:
                old_config_data = json.load(f_old)
            except json.JSONDecodeError:
                pass # Si está corrupto, se sobrescribirá y el log mostrará la nueva config

    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_update.dict(), f, indent=4)
    
    changes_made_dict = {}
    new_config_dict = config_update.dict()
    for key, new_value in new_config_dict.items():
        old_value = old_config_data.get(key)
        if old_value != new_value:
            changes_made_dict[key] = {"old": old_value, "new": new_value}
            
    if changes_made_dict: # Solo loguear si hubo cambios
        log_config_audit_action(
            performing_user=current_user_actor,
            action_type="STORE_SETTINGS_UPDATED",
            target_entity_type="store_config",
            details=changes_made_dict
        )
    
    return config_update

#Endpoint para ver el log de auditoría de configuración 




@router.get("/audit-log", response_model=List[ConfigAuditLogResponse])
async def get_config_audit_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    action_type_filter: Optional[str] = Query(None, alias="action_type"),
    user_id_filter: Optional[int] = Query(None, alias="user_id"),
    target_entity_type_filter: Optional[str] = Query(None, alias="target_type"),
    target_entity_id_filter: Optional[str] = Query(None, alias="target_id"), # Este filtro espera un string
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user_actor: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    audit_df = load_df(CONFIG_AUDIT_LOG_FILE, columns=CONFIG_AUDIT_LOG_COLUMNS)
    if audit_df.empty:
        return []

    if 'timestamp' in audit_df.columns:
         audit_df['timestamp_dt'] = pd.to_datetime(audit_df['timestamp'], errors='coerce')

    if action_type_filter:
        audit_df = audit_df[audit_df["action_type"].str.contains(action_type_filter, case=False, na=False)]
    if user_id_filter is not None:
        # Asegurar que la columna es del tipo correcto para comparar o convertir el filtro
        if 'user_id_performing_action' in audit_df.columns:
            audit_df['user_id_performing_action'] = pd.to_numeric(audit_df['user_id_performing_action'], errors='coerce')
            audit_df = audit_df.dropna(subset=['user_id_performing_action']) # Eliminar filas donde la conversión falló
            audit_df['user_id_performing_action'] = audit_df['user_id_performing_action'].astype(int)
            audit_df = audit_df[audit_df["user_id_performing_action"] == user_id_filter]
    if target_entity_type_filter:
        audit_df = audit_df[audit_df["target_entity_type"].str.contains(target_entity_type_filter, case=False, na=False)]
    if target_entity_id_filter:
        # target_entity_id_filter es string, la columna en el df también debería ser tratada como string para el filtro
        if 'target_entity_id' in audit_df.columns:
            audit_df = audit_df[audit_df["target_entity_id"].astype(str) == target_entity_id_filter] 
            # O .str.contains si quieres búsqueda parcial    
    
    if start_date and 'timestamp_dt' in audit_df.columns:
        audit_df = audit_df.dropna(subset=['timestamp_dt']) # Quitar NaT antes de comparar fechas
        audit_df = audit_df[audit_df['timestamp_dt'].dt.date >= start_date]
    if end_date and 'timestamp_dt' in audit_df.columns:
        audit_df = audit_df.dropna(subset=['timestamp_dt'])
        audit_df = audit_df[audit_df['timestamp_dt'].dt.date <= end_date]

    audit_df = audit_df.sort_values(by="timestamp", ascending=False)
    
    results = []
    for _, row in audit_df.iloc[skip : skip + limit].iterrows():
        row_dict = row.to_dict()
        try:
            row_dict["details"] = json.loads(row_dict.get("details", "{}"))
        except (json.JSONDecodeError, TypeError):
            row_dict["details"] = {"error": "Failed to parse details"}
        
        if 'timestamp' in row_dict and isinstance(row_dict['timestamp'], str):
            row_dict['timestamp'] = pd.to_datetime(row_dict['timestamp'])
        
       
        if "target_entity_id" in row_dict:
            if pd.isna(row_dict["target_entity_id"]):
                row_dict["target_entity_id"] = None
            else:
                # Convertir a string si no es None
                row_dict["target_entity_id"] = str(row_dict["target_entity_id"])
        
            
        results.append(ConfigAuditLogResponse(**row_dict))
            
    return results




def get_next_invoice_number() -> str:
    """Obtiene y actualiza el próximo número de factura."""
    # Asegurar que el archivo de config existe y tiene el formato esperado
    if not CONFIG_FILE.exists():
        # Si es la primera vez, el archivo lo crea startup_db_client. Si aun así no existe, es un error.
        raise HTTPException(status_code=500, detail="Archivo de configuración no encontrado o no inicializado.")
    
    try:
        with open(CONFIG_FILE, 'r+') as f:
            config_data = json.load(f)
            current_config = StoreConfig(**config_data) # Validar con Pydantic
            
            invoice_number_str = f"{current_config.invoice_prefix}{current_config.next_invoice_number}"
            
            current_config.next_invoice_number += 1
            
            f.seek(0)
            json.dump(current_config.dict(), f, indent=4)
            f.truncate()
            
        return invoice_number_str
    except (FileNotFoundError, json.JSONDecodeError, Exception) as e:
        # Loggear el error 'e' sería bueno aquí
        raise HTTPException(status_code=500, detail=f"Error al procesar el número de factura: {e}")


def get_store_settings_sync() -> StoreConfig:
    """Función síncrona para obtener la configuración."""
    if not CONFIG_FILE.exists():
        # El archivo es creado por startup_db_client. Si no existe en este punto, algo falló.
        raise HTTPException(status_code=500, detail="Archivo de configuración no encontrado. La aplicación podría no haberse iniciado correctamente.")
    try:
        with open(CONFIG_FILE, 'r') as f:
            config_data = json.load(f)
        return StoreConfig(**config_data) # Validar al leer
    except (FileNotFoundError, json.JSONDecodeError, Exception) as e:
        # Loggear el error 'e'
        raise HTTPException(status_code=500, detail=f"Error al leer la configuración de la tienda: {e}")