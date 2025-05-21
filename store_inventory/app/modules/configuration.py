from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime, timedelta, timezone
import jwt
from pathlib import Path
import hashlib
import json
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()

SECRET_KEY= "tu_clave_secreta_muy_segura_cambiame_en_produccion_AHORA_MISMO"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


DATA_DIR = Path("data")
USERS_FILE = DATA_DIR / "users.csv"
CONFIG_FILE = DATA_DIR / "config.json"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    full_name: str = Field(..., min_length=3)
    email: Optional[EmailStr] = None
    role: str 
class UserCreate(UserBase):
    password: str = Field(..., min_length= 6)

class UserUpdate(BaseModel):
    full_name: Optional[str] =Field(None, min_length=3)
    email: Optional[EmailStr] = None
    role: Optional[str]= None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class UserInDB(UserBase):
    id: int
    is_active: bool
    
class UserResponse(UserBase):
    id: int
    is_active: bool
    
class TokenData(BaseModel):
    username: Optional[str]= None
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
    invoice_prefix: str = Field("INV-", min_length=1)
    next_invoice_number: int = Field(1, ge=1)
    initial_cash_balance: float = Field(0.0, ge=0)
    apply_iva_by_default: bool = False
    iva_percentage: float = Field(19.0, ge=0, le=100)
    low_stock_threshold: int = Field(5, ge=0)

def get_password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return get_password_hash(plain_password) == hashed_password

def load_df(file_path: Path, columns: Optional[List[str]] = None) -> pd.DataFrame:
    if not file_path.exists():
        if columns:
            return pd.DataFrame(columns=columns)
        else:
            # Si no se proveen columnas y el archivo no existe, es un error o necesita manejo específico
            raise FileNotFoundError(f"El archivo {file_path} no existe y no se especificaron columnas.")
    try:
        return pd.read_csv(file_path)
    except pd.errors.EmptyDataError:
        if columns:
            return pd.DataFrame(columns=columns)
        else:
            # Devolver un DataFrame vacío si se espera que las columnas se infieran y el archivo está vacío
            return pd.DataFrame()
        
def save_df(df: pd.DataFrame, file_path: Path):
    df.to_csv(file_path, index=False)
    
def create_default_admin():
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if users_df[users_df["username"] == "soporte"].empty:
        next_id = users_df["id"].max() + 1 if not users_df.empty else 1
        soporte_user = {
            "id": next_id, "username": "soporte", "hashed_password": get_password_hash("soporte123"),
            "full_name": "Soporte Técnico", "email": "soporte@tienda.com", "role": "soporte", "is_active": True
        }
        users_df = pd.concat([users_df, pd.DataFrame([soporte_user])], ignore_index=True)
        print("Usuario 'soporte' creado.")

    if users_df[users_df["username"] == "admin"].empty:
        next_id = users_df["id"].max() + 1 if not users_df.empty else 1
        admin_user = {
            "id": next_id, "username": "admin", "hashed_password": get_password_hash("admin123"),
            "full_name": "Administrador General", "email": "admin@tienda.com", "role": "admin", "is_active": True
        }
        users_df = pd.concat([users_df, pd.DataFrame([admin_user])], ignore_index=True)
        print("Usuario 'admin' creado.")
    save_df(users_df, USERS_FILE)
    

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    users_df = load_df(USERS_FILE)
    if users_df.empty: return None
    user_series = users_df[users_df["username"] == username]
    if user_series.empty: return None
    
    user_dict = user_series.iloc[0].to_dict()
    if not verify_password(password, user_dict["hashed_password"]): return None
    # if not user_dict["is_active"]: return None # Se maneja en el endpoint /token
    return user_dict

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
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
        if username is None or role is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role, user_id=user_id)
    except (jwt.PyJWTError, jwt.ExpiredSignatureError): # Captura también ExiredSignatureError
        raise credentials_exception
    return token_data


async def get_current_active_user(current_user_data: TokenData = Depends(get_current_user_data)) -> Dict[str, Any]:
    users_df = load_df(USERS_FILE)
    if users_df.empty: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    
    user_series = users_df[users_df["id"] == current_user_data.user_id] # Buscar por ID para mayor seguridad
    if user_series.empty:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    
    user_dict = user_series.iloc[0].to_dict()
    if not user_dict["is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo")
    return user_dict


async def get_admin_or_support_user(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    if current_user["role"] not in ["admin", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol de Administrador o Soporte")
    return current_user

async def get_support_user(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    if current_user["role"] != "soporte":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol de Soporte")
    return current_user

#  rutas
#mostrar info de users solo admin o soporte
@router.get("/users", response_model=List[UserResponse], dependencies=[Depends(get_admin_or_support_user)])
async def read_users():
    users_df = load_df(USERS_FILE)
    if users_df.empty: return []
    return users_df.drop(columns=["hashed_password"]).to_dict("records")
#crear  users 
@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_admin_or_support_user)])
async def create_new_user(user: UserCreate):
    users_df = load_df(USERS_FILE, columns=["id", "username", "hashed_password", "full_name", "email", "role", "is_active"])
    if not users_df[users_df["username"] == user.username].empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de usuario ya existe")
    if user.role not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol de usuario inválido")

    next_id = users_df["id"].max() + 1 if not users_df.empty else 1
    new_user_data = user.dict()
    new_user_data["id"] = next_id
    new_user_data["hashed_password"] = get_password_hash(new_user_data.pop("password"))
    new_user_data["is_active"] = True # Por defecto activo

    users_df = pd.concat([users_df, pd.DataFrame([new_user_data])], ignore_index=True)
    save_df(users_df, USERS_FILE)
    
    # Devolver sin el hash
    created_user_response = UserResponse(**new_user_data)
    return created_user_response
#modificar users
@router.put("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(get_admin_or_support_user)])
async def update_existing_user(user_id: int, user_update_data: UserUpdate):
    users_df = load_df(USERS_FILE)
    user_index = users_df[users_df["id"] == user_id].index
    if user_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    idx = user_index[0]
    update_data = user_update_data.dict(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        users_df.loc[idx, "hashed_password"] = get_password_hash(update_data.pop("password"))
    if "role" in update_data and update_data["role"] not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol de usuario inválido")
    
    for key, value in update_data.items():
        if key != "id": # No permitir cambiar ID
             users_df.loc[idx, key] = value
    
    save_df(users_df, USERS_FILE)
    updated_user_dict = users_df.loc[idx].to_dict()
    return UserResponse(**updated_user_dict)

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    return UserResponse(**current_user)

#rutas de configuración de la tienda 

#muestra a cualquier usuario activo y autenticado, toda la info de la tienda
@router.get("/store-settings", response_model=StoreConfig, dependencies=[Depends(get_current_active_user)])
async def get_store_config():
    if not CONFIG_FILE.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo de configuración no encontrado.")
    with open(CONFIG_FILE, 'r') as f:
        config_data = json.load(f)
    return StoreConfig(**config_data)

@router.put("/store-settings", response_model=StoreConfig, dependencies=[Depends(get_admin_or_support_user)])
async def update_store_config(config_update: StoreConfig):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_update.dict(), f, indent=4)
    return config_update


def get_next_invoice_number() -> str:
    """Obtiene y actualiza el próximo número de factura."""
    with open(CONFIG_FILE, 'r+') as f:
        config_data = json.load(f)
        current_config = StoreConfig(**config_data)
        
        invoice_number_str = f"{current_config.invoice_prefix}{current_config.next_invoice_number}"
        
        current_config.next_invoice_number += 1
        
        f.seek(0)
        json.dump(current_config.dict(), f, indent=4)
        f.truncate()
        
    return invoice_number_str

def get_store_settings_sync() -> StoreConfig:
    """Función síncrona para obtener la configuración."""
    if not CONFIG_FILE.exists():
        # Esto es un problema si se llama antes de que el archivo se cree.
        # Considerar una configuración por defecto en memoria si el archivo no existe.
        raise FileNotFoundError("Archivo de configuración no encontrado.")
    with open(CONFIG_FILE, 'r') as f:
        config_data = json.load(f)
    return StoreConfig(**config_data)







