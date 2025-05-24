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
    skip: int = 0,
    limit: int = 100,
    active_only: bool = Query(True, description="Filtrar solo clientes activos"),
    search: Optional[str] = Query(None, description="Buscar por nombre, documento o email"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        return []

    if active_only:
        customers_df = customers_df[customers_df["is_active"] == True]
    
    if search:
        search_lower = search.lower()
        customers_df = customers_df[
            customers_df["full_name"].str.lower().str.contains(search_lower, na=False) |
            customers_df["document_number"].str.lower().str.contains(search_lower, na=False) |
            customers_df["email"].str.lower().str.contains(search_lower, na=False)
        ]

    return customers_df.iloc[skip : skip + limit].to_dict(orient="records")

@router.get("/{customer_id}", response_model=CustomerResponse)
async def read_customer(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    customer_data = customers_df[customers_df["id"] == customer_id]

    if customer_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    
    return customer_data.iloc[0].to_dict()

@router.get("/by_document/", response_model=CustomerResponse)
async def read_customer_by_document(
    document_type: str,
    document_number: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    customer_data = customers_df[
        (customers_df["document_type"] == document_type) &
        (customers_df["document_number"] == document_number)
    ]

    if customer_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado con ese documento")
    
    return customer_data.iloc[0].to_dict()

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

