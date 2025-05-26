from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
import json 


from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user,
    load_df,
    save_df,
    DATA_DIR
)

router = APIRouter()

CUSTOMERS_FILE = DATA_DIR / "customers.csv"
CUSTOMER_COLUMNS = ["id", "document_type", "document_number", "full_name", "phone", "email", "address", "is_active", "created_at", "updated_at", "created_by_user_id", "updated_by_user_id"]


CUSTOMER_HISTORY_FILE = DATA_DIR / "customer_history.csv"
CUSTOMER_HISTORY_COLUMNS = ["id", "customer_id", "action", "details", "user_id", "date"]


class CustomerBase(BaseModel):
    document_type: str = Field(..., description="Tipo de identificación (Cédula, Pasaporte, NIT, etc.)")
    document_number: str = Field(..., description="Número de identificación")
    full_name: str = Field(..., min_length=3, description="Nombre completo del cliente")
    phone: str = Field(..., description="Número de teléfono")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico del cliente")
    address: Optional[str] = Field(None, description="Dirección de residencia")

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    full_name: Optional[str] = Field(None, min_length=3)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None

#Modelo para historial
class CustomerHistoryResponse(BaseModel):
    id: int
    customer_id: int
    action: str 
    details: str 
    user_id: int
    date: datetime
    
def log_customer_action(customer_id: int, action: str, user_id: int, details: Dict):
    """Guarda un registro de acción sobre un cliente."""
    history_df = load_df(CUSTOMER_HISTORY_FILE, columns=CUSTOMER_HISTORY_COLUMNS)
    next_id = history_df["id"].max() + 1 if not history_df.empty else 1
    now = datetime.now()
    log_entry = {
        "id": next_id,
        "customer_id": customer_id,
        "action": action,
        "details": json.dumps(details), # Guardamos los detalles como JSON string
        "user_id": user_id,
        "date": now
    }
    history_df = pd.concat([history_df, pd.DataFrame([log_entry])], ignore_index=True)
    save_df(history_df, CUSTOMER_HISTORY_FILE)
    
    
@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_in: CustomerCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user) # MANTENIDO: Cualquier user puede crear
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    
    if not customers_df[(customers_df["document_type"] == customer_in.document_type) &
                        (customers_df["document_number"] == customer_in.document_number)].empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un cliente con este tipo y número de documento."
        )

    next_id = customers_df["id"].max() + 1 if not customers_df.empty else 1
    now = datetime.now()

    new_customer_data = customer_in.dict()
    new_customer_data["id"] = next_id
    new_customer_data["is_active"] = True
    new_customer_data["created_at"] = now
    new_customer_data["updated_at"] = now
    new_customer_data["created_by_user_id"] = current_user["id"]
    new_customer_data["updated_by_user_id"] = current_user["id"]

    customers_df = pd.concat([customers_df, pd.DataFrame([new_customer_data])], ignore_index=True)
    save_df(customers_df, CUSTOMERS_FILE)

    # Nota: No logueamos la creación, pero podríamos si quisiéramos.

    return CustomerResponse(**new_customer_data)

# --- Rutas GET (sin cambios) ---
@router.get("/", response_model=List[CustomerResponse])
async def read_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    active_only: bool = Query(None, description="Filtrar solo clientes activos (true/false) o mostrar todos (si no se envía)"), # Permitir no enviar para mostrar todos
    search: Optional[str] = Query(None, description="Buscar por nombre, documento o email"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        return []

    if active_only is not None: # Solo filtrar si se provee el parámetro
        customers_df = customers_df[customers_df["is_active"] == active_only]
    
    if search:
        search_lower = search.lower()
        # Asegurarse que las columnas existan y manejar NaN antes de aplicar .str
        customers_df = customers_df[
            customers_df["full_name"].astype(str).str.lower().str.contains(search_lower, na=False) |
            customers_df["document_number"].astype(str).str.lower().str.contains(search_lower, na=False) |
            customers_df["email"].astype(str).str.lower().str.contains(search_lower, na=False)
        ]
    
    # <<< --- INICIO DE LA CORRECCIÓN CRÍTICA --- >>>
    # Reemplazar NaN y pd.NA con None para evitar errores de validación de Pydantic
    # Esto es importante para campos Optional[str], Optional[int], etc.
    df_for_response = customers_df.iloc[skip : skip + limit].copy() # Trabajar sobre una copia de la porción
    
    # Convertir columnas de fecha a datetime si son strings y asegurar que Pydantic las reciba bien
    # Pandas to_datetime maneja diferentes formatos y devuelve NaT para inválidos.
    if 'created_at' in df_for_response.columns:
        df_for_response['created_at'] = pd.to_datetime(df_for_response['created_at'], errors='coerce')
    if 'updated_at' in df_for_response.columns:
        df_for_response['updated_at'] = pd.to_datetime(df_for_response['updated_at'], errors='coerce')

    # Reemplazar NaT (Not a Time) resultante de conversiones fallidas por None, Pydantic lo maneja bien para Optional[datetime]
    # Y reemplazar NaN y pd.NA genéricos con None para otros tipos de datos opcionales
    # El método .replace es más amplio y puede manejar varios reemplazos
    df_for_response = df_for_response.replace({pd.NaT: None, float('nan'): None, pd.NA: None})
    # <<< --- FIN DE LA CORRECCIÓN CRÍTICA --- >>>

    records = df_for_response.to_dict(orient="records")
    
    # Pydantic intentará convertir los valores a los tipos del modelo.
    # Si 'created_at' o 'updated_at' son None (por NaT previo), Pydantic los aceptará para Optional[datetime].
    # Si son Timestamps de Pandas, Pydantic también los manejará para campos datetime.
    return records

@router.get("/{customer_id}", response_model=CustomerResponse)
async def read_customer( # Esta es la función para buscar por ID
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    # Filtra para obtener una Serie (una fila) si el ID existe
    customer_series = customers_df[customers_df["id"] == customer_id]

    if customer_series.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    
    # Convertir la primera (y única) fila encontrada a un diccionario
    customer_dict = customer_series.iloc[0].to_dict()
    
    # <<< --- INICIO CORRECCIÓN CRÍTICA --- >>>
    # Sanitizar NaN/NaT a None en el diccionario antes de que Pydantic valide
    for key, value in customer_dict.items():
        if pd.isna(value):  # pd.isna() es True para None, np.nan, pd.NaT
            customer_dict[key] = None
    
    # Asegurar que los campos de fecha sean objetos datetime o None
    # Esto es importante si tus fechas en CSV son strings y Pydantic espera datetime
    if 'created_at' in customer_dict and customer_dict['created_at'] is not None:
        customer_dict['created_at'] = pd.to_datetime(customer_dict['created_at'], errors='coerce')
        if pd.isna(customer_dict['created_at']): # Si la conversión falla, poner None
             customer_dict['created_at'] = None
            
    if 'updated_at' in customer_dict and customer_dict['updated_at'] is not None:
        customer_dict['updated_at'] = pd.to_datetime(customer_dict['updated_at'], errors='coerce')
        if pd.isna(customer_dict['updated_at']): # Si la conversión falla, poner None
            customer_dict['updated_at'] = None
    # <<< --- FIN CORRECCIÓN CRÍTICA --- >>>
            
    return customer_dict


@router.get("/by_document/", response_model=CustomerResponse) # Esta es la función para buscar por documento
async def read_customer_by_document(
    document_type: str = Query(...), # Hacemos los query params obligatorios
    document_number: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    # Filtra para obtener una Serie (una fila) si el documento existe
    customer_series = customers_df[
        (customers_df["document_type"].astype(str) == document_type) &  # Asegurar comparación de strings
        (customers_df["document_number"].astype(str) == document_number)
    ]

    if customer_series.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado con ese documento")
    
    # Convertir la primera (y única) fila encontrada a un diccionario
    customer_dict = customer_series.iloc[0].to_dict()

    # <<< --- INICIO CORRECCIÓN CRÍTICA --- >>>
    # Sanitizar NaN/NaT a None en el diccionario antes de que Pydantic valide
    for key, value in customer_dict.items():
        if pd.isna(value): # pd.isna() es True para None, np.nan, pd.NaT
            customer_dict[key] = None

    # Asegurar que los campos de fecha sean objetos datetime o None
    if 'created_at' in customer_dict and customer_dict['created_at'] is not None:
        customer_dict['created_at'] = pd.to_datetime(customer_dict['created_at'], errors='coerce')
        if pd.isna(customer_dict['created_at']):
             customer_dict['created_at'] = None

    if 'updated_at' in customer_dict and customer_dict['updated_at'] is not None:
        customer_dict['updated_at'] = pd.to_datetime(customer_dict['updated_at'], errors='coerce')
        if pd.isna(customer_dict['updated_at']):
            customer_dict['updated_at'] = None
    # <<< --- FIN CORRECCIÓN CRÍTICA --- >>>

    return customer_dict

# --- Ruta PUT (MODIFICADA para añadir log) ---
@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    customer_index = customers_df[customers_df["id"] == customer_id].index

    if customer_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    idx = customer_index[0]
    update_data = customer_in.dict(exclude_unset=True) # Solo los campos enviados

    # Validar documento duplicado si se cambia
    if "document_number" in update_data or "document_type" in update_data:
        doc_type = update_data.get("document_type", customers_df.loc[idx, "document_type"])
        doc_num = update_data.get("document_number", customers_df.loc[idx, "document_number"])
        existing_customer_conflict = customers_df[
            (customers_df["document_type"] == doc_type) &
            (customers_df["document_number"] == doc_num) &
            (customers_df["id"] != customer_id)
        ]
        if not existing_customer_conflict.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Otro cliente ya existe con este tipo y número de documento."
            )

    # --- LOG DE AUDITORÍA ---
    if update_data: # Solo loguear si hay algo que cambiar
        log_customer_action(
            customer_id=customer_id,
            action="modificacion",
            user_id=current_user["id"],
            details=update_data 
        )
    # --- FIN LOG ---

    for key, value in update_data.items():
        customers_df.loc[idx, key] = value
    
    customers_df.loc[idx, "updated_at"] = datetime.now()
    customers_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(customers_df, CUSTOMERS_FILE)
    return customers_df.loc[idx].to_dict()

# --- Ruta PATCH (MODIFICADA para añadir log) ---
@router.patch("/{customer_id}/inactivate", status_code=status.HTTP_200_OK)
async def inactivate_customer(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    customer_index = customers_df[customers_df["id"] == customer_id].index

    if customer_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    idx = customer_index[0]
    if not customers_df.loc[idx, "is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El cliente ya está inactivo")

    customers_df.loc[idx, "is_active"] = False
    customers_df.loc[idx, "updated_at"] = datetime.now()
    customers_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(customers_df, CUSTOMERS_FILE)

    # --- LOG DE AUDITORÍA ---
    log_customer_action(
        customer_id=customer_id,
        action="inactivacion",
        user_id=current_user["id"],
        details={"inactivated": True} # Detalle simple
    )
    # --- FIN LOG ---

    return {"message": "Cliente inactivado correctamente", "customer_id": customer_id}

# --- NUEVA: Ruta para ver el historial de clientes ---
@router.get("/{customer_id}/history", response_model=List[CustomerHistoryResponse])
async def get_customer_history(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) # Solo Admin/Soporte ve historial
):
    # Validar que el cliente exista
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df[customers_df["id"] == customer_id].empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    history_df = load_df(CUSTOMER_HISTORY_FILE, columns=CUSTOMER_HISTORY_COLUMNS)
    if history_df.empty:
        return []

    customer_history = history_df[history_df["customer_id"] == customer_id]
    
    return customer_history.sort_values(by="date", ascending=False).to_dict(orient="records")

