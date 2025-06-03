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
    email: Optional[EmailStr] = None # Permite None explícito para borrar email
    address: Optional[str] = None # Permite None explícito para borrar dirección
    is_active: Optional[bool] = None

class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None

class CustomerHistoryResponse(BaseModel):
    id: int
    customer_id: int
    action: str 
    details: str 
    user_id: int
    date: datetime

def log_customer_action(customer_id: int, action: str, user_id: int, details: Dict):
    history_df = load_df(CUSTOMER_HISTORY_FILE, columns=CUSTOMER_HISTORY_COLUMNS)
    
    # Asegurar que customer_id y user_id sean enteros para el log
    try:
        log_customer_id = int(customer_id)
        log_user_id = int(user_id)
    except (ValueError, TypeError):
        # Manejar error si los IDs no son convertibles a int, aunque deberían serlo.
        print(f"Error: IDs inválidos para log_customer_action. Customer ID: {customer_id}, User ID: {user_id}")
        return # No loguear si los IDs son inválidos

    next_id_candidate = history_df["id"].max() if not history_df.empty else 0
    next_id = pd.to_numeric(next_id_candidate, errors='coerce')
    if pd.isna(next_id): next_id = 0
    next_id = int(next_id) + 1
    
    now = datetime.now()
    log_entry = {
        "id": next_id,
        "customer_id": log_customer_id,
        "action": action,
        "details": json.dumps(details), # Guardamos los detalles como JSON string
        "user_id": log_user_id,
        "date": now
    }
    history_df = pd.concat([history_df, pd.DataFrame([log_entry])], ignore_index=True)
    save_df(history_df, CUSTOMER_HISTORY_FILE)

def sanitize_customer_dict_for_response(customer_dict: Dict[str, Any]) -> Dict[str, Any]:
    processed_dict = customer_dict.copy()

    for key, value in processed_dict.items():
        if pd.isna(value):
            processed_dict[key] = None

    string_fields_required = ["document_type", "document_number", "full_name", "phone"]
    for field in string_fields_required:
        if field in processed_dict:
            if processed_dict[field] is None:
                processed_dict[field] = "" 
            else:
                val_str = str(processed_dict[field])
                if val_str.endswith(".0") and val_str[:-2].isdigit(): # Ej: "123.0" -> "123"
                    processed_dict[field] = val_str[:-2]
                else:
                    processed_dict[field] = val_str
        elif field in CustomerBase.__annotations__:
             processed_dict[field] = ""

    optional_string_fields = ["email", "address"]
    for field in optional_string_fields:
        if field in processed_dict and processed_dict[field] is not None:
            val_str = str(processed_dict[field])
            if val_str.lower() in ["nan", "none", ""]:
                processed_dict[field] = None
            else:
                processed_dict[field] = val_str
        elif field in processed_dict and processed_dict[field] is None: # Asegurar que si es None, se mantenga None
             processed_dict[field] = None


    date_fields = ['created_at', 'updated_at']
    for field in date_fields:
        if field in processed_dict:
            if processed_dict[field] is not None:
                dt_val = pd.to_datetime(processed_dict[field], errors='coerce')
                processed_dict[field] = None if pd.isna(dt_val) else dt_val
            elif field in CustomerResponse.__annotations__ and not isinstance(CustomerResponse.__annotations__[field], type(None)): # Si es None pero Pydantic lo requiere
                 # Esto indica un problema de datos si un campo de fecha requerido es None.
                 # Pydantic fallará, lo cual es el comportamiento esperado.
                 # Podríamos asignar un valor por defecto aquí si fuera apropiado, pero usualmente no lo es para timestamps.
                 pass


    if 'is_active' in processed_dict:
        if processed_dict['is_active'] is None:
            processed_dict['is_active'] = False 
        else:
            val = processed_dict['is_active']
            if isinstance(val, str):
                processed_dict['is_active'] = val.lower() == 'true' or val == '1'
            else:
                processed_dict['is_active'] = bool(val)
    elif 'is_active' in CustomerResponse.__annotations__:
        processed_dict['is_active'] = False

    id_fields_to_int = ['id', 'created_by_user_id']
    for field in id_fields_to_int:
        if field in processed_dict:
            if processed_dict[field] is None:
                # Estos IDs son requeridos y no pueden ser None
                raise HTTPException(status_code=500, detail=f"El campo ID '{field}' es None, lo cual no está permitido para el cliente: {processed_dict.get('id', 'ID DESCONOCIDO')}")
            try:
                processed_dict[field] = int(float(str(processed_dict[field])))
            except (ValueError, TypeError):
                raise HTTPException(status_code=500, detail=f"Campo ID '{field}' inválido ('{processed_dict[field]}') para el cliente: {processed_dict.get('id', 'ID DESCONOCIDO')}")
        elif field in CustomerResponse.__annotations__ and not isinstance(CustomerResponse.__annotations__[field], type(None)):
             raise HTTPException(status_code=500, detail=f"Falta el campo ID requerido '{field}' para el cliente: {processed_dict.get('id', 'ID DESCONOCIDO')}")


    if 'updated_by_user_id' in processed_dict and processed_dict['updated_by_user_id'] is not None:
        try:
            processed_dict['updated_by_user_id'] = int(float(str(processed_dict['updated_by_user_id'])))
        except (ValueError, TypeError):
            processed_dict['updated_by_user_id'] = None 
            print(f"Advertencia: updated_by_user_id '{customer_dict['updated_by_user_id']}' no pudo ser convertido a int y se estableció a None.")

    return processed_dict


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_in: CustomerCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    
    customer_in_doc_type_cleaned = customer_in.document_type.strip()
    customer_in_doc_num_cleaned = customer_in.document_number.strip()
    if customer_in_doc_num_cleaned.endswith(".0") and customer_in_doc_num_cleaned[:-2].isdigit():
        customer_in_doc_num_cleaned = customer_in_doc_num_cleaned[:-2]

    if not customers_df.empty:
        df_doc_num_standardized = customers_df["document_number"].astype(str).apply(
            lambda x: (x[:-2] if isinstance(x,str) and x.endswith(".0") and x[:-2].isdigit() else x).strip()
        )
        condition = (
            (customers_df["document_type"].astype(str).str.strip() == customer_in_doc_type_cleaned) &
            (df_doc_num_standardized == customer_in_doc_num_cleaned)
        )
        if not customers_df[condition].empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un cliente con este tipo y número de documento."
            )
    
    next_id_candidate = customers_df["id"].max() if not customers_df.empty else 0
    next_id_num = pd.to_numeric(next_id_candidate, errors='coerce')
    if pd.isna(next_id_num): next_id_num = 0
    next_id = int(next_id_num) + 1

    now = datetime.now()
    new_customer_data = customer_in.dict()
    new_customer_data["id"] = next_id
    new_customer_data["is_active"] = True
    new_customer_data["created_at"] = now
    new_customer_data["updated_at"] = now
    new_customer_data["created_by_user_id"] = current_user["id"]
    new_customer_data["updated_by_user_id"] = current_user["id"]

    new_customer_df_row = pd.DataFrame([new_customer_data]) 
    # Asegurar que todas las columnas necesarias existan en la nueva fila antes de concatenar
    for col in CUSTOMER_COLUMNS:
        if col not in new_customer_df_row.columns:
             # Asegurar que el default sea compatible con el tipo esperado o pd.NA
            if col in ['created_at', 'updated_at']:
                new_customer_df_row[col] = pd.NaT
            elif col in ['is_active']:
                new_customer_df_row[col] = True # O False, según la lógica de negocio para nuevos
            elif col in ['id', 'created_by_user_id', 'updated_by_user_id']: # Suponiendo que estos IDs son int
                new_customer_df_row[col] = pd.NA # O un valor int por defecto si aplica
            else: # Para strings
                new_customer_df_row[col] = ""


    # Reordenar columnas para que coincidan con CUSTOMER_COLUMNS si es necesario
    new_customer_df_row = new_customer_df_row.reindex(columns=CUSTOMER_COLUMNS)


    customers_df = pd.concat([customers_df, new_customer_df_row], ignore_index=True)
    save_df(customers_df, CUSTOMERS_FILE)
    
    return sanitize_customer_dict_for_response(new_customer_data.copy())


@router.get("/", response_model=List[CustomerResponse])
async def read_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    active_only: Optional[bool] = Query(None, description="Filtrar solo clientes activos (true/false) o mostrar todos (si no se envía)"),
    search: Optional[str] = Query(None, description="Buscar por nombre, documento o email"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        return []

    if active_only is not None:
        # Convertir la columna 'is_active' del df a booleano de Python para comparación robusta
        df_is_active_bool = customers_df["is_active"].apply(
            lambda x: (str(x).lower() == 'true' or str(x) == '1') if pd.notna(x) else False
        )
        customers_df = customers_df[df_is_active_bool == active_only]
    
    if search:
        search_lower = search.lower().strip()
        df_doc_num_standardized = customers_df["document_number"].astype(str).apply(
            lambda x: (x[:-2] if isinstance(x,str) and x.endswith(".0") and x[:-2].isdigit() else x).strip().lower()
        )
        customers_df = customers_df[
            customers_df["full_name"].astype(str).str.lower().str.contains(search_lower, na=False) |
            df_doc_num_standardized.str.contains(search_lower, na=False) |
            customers_df["email"].astype(str).str.lower().str.contains(search_lower, na=False)
        ]
    
    df_paginated = customers_df.iloc[skip : skip + limit]
    
    records = df_paginated.to_dict(orient="records")
    sanitized_records = [sanitize_customer_dict_for_response(record.copy()) for record in records]
    
    return sanitized_records


@router.get("/{customer_id}", response_model=CustomerResponse)
async def read_customer(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay clientes registrados.")

    df_id_as_numeric = pd.to_numeric(customers_df["id"], errors='coerce')
    customer_series_df = customers_df[df_id_as_numeric == customer_id]

    if customer_series_df.empty:
        customer_series_df = customers_df[customers_df["id"].astype(str) == str(customer_id)]
        if customer_series_df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    
    customer_dict = customer_series_df.iloc[0].to_dict()
    return sanitize_customer_dict_for_response(customer_dict.copy())


@router.get("/by_document/", response_model=CustomerResponse)
async def read_customer_by_document(
    document_type: str = Query(...),
    document_number: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay clientes para buscar.")

    search_doc_type_cleaned = document_type.strip()
    search_doc_number_cleaned = document_number.strip()
    if search_doc_number_cleaned.endswith(".0") and search_doc_number_cleaned[:-2].isdigit():
        search_doc_number_cleaned = search_doc_number_cleaned[:-2]

    df_doc_num_standardized = customers_df["document_number"].astype(str).apply(
        lambda x: (x[:-2] if isinstance(x,str) and x.endswith(".0") and x[:-2].isdigit() else x).strip()
    )
    
    customer_series_df = customers_df[
        (customers_df["document_type"].astype(str).str.strip() == search_doc_type_cleaned) &
        (df_doc_num_standardized == search_doc_number_cleaned)
    ]

    if customer_series_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado con ese documento")
    
    customer_dict = customer_series_df.iloc[0].to_dict()
    return sanitize_customer_dict_for_response(customer_dict.copy())


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay clientes para actualizar.")

    df_id_as_numeric = pd.to_numeric(customers_df["id"], errors='coerce')
    original_customer_series_df = customers_df[df_id_as_numeric == customer_id]

    if original_customer_series_df.empty:
        original_customer_series_df = customers_df[customers_df["id"].astype(str) == str(customer_id)]
        if original_customer_series_df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado para actualizar")

    idx = original_customer_series_df.index[0]
    actual_customer_id_in_df = int(float(str(original_customer_series_df.loc[idx, "id"])))

    update_data = customer_in.dict(exclude_unset=True)
    if not update_data:
        current_customer_dict = customers_df.loc[idx].to_dict()
        return sanitize_customer_dict_for_response(current_customer_dict.copy())

    # Obtener valores actuales o nuevos para la comprobación de duplicados
    doc_type_to_check = str(update_data.get("document_type", customers_df.loc[idx, "document_type"])).strip()
    
    doc_num_val_for_check = update_data.get("document_number", customers_df.loc[idx, "document_number"])
    doc_num_to_check_cleaned = str(doc_num_val_for_check).strip()
    if doc_num_to_check_cleaned.endswith(".0") and doc_num_to_check_cleaned[:-2].isdigit():
        doc_num_to_check_cleaned = doc_num_to_check_cleaned[:-2]


    if "document_number" in update_data or "document_type" in update_data: # Solo verificar si estos campos cambian
        df_doc_num_standardized = customers_df["document_number"].astype(str).apply(
            lambda x: (x[:-2] if isinstance(x,str) and x.endswith(".0") and x[:-2].isdigit() else x).strip()
        )
        # Necesitamos el ID del DataFrame como int para la comparación
        df_ids_int = pd.to_numeric(customers_df["id"], errors='coerce').fillna(-1).astype(int)


        conflict_condition = (
            (customers_df["document_type"].astype(str).str.strip() == doc_type_to_check) &
            (df_doc_num_standardized == doc_num_to_check_cleaned) &
            (df_ids_int != actual_customer_id_in_df) 
        )
        if not customers_df[conflict_condition].empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Otro cliente ya existe con este nuevo tipo y número de documento."
            )

    if update_data: 
        log_customer_action(
            customer_id=actual_customer_id_in_df,
            action="modificacion",
            user_id=current_user["id"],
            details=update_data
        )

    for key, value in update_data.items():
        # Pydantic Optional[EmailStr]=None significa borrar email.
        # Si value es None y el campo es opcional, se setea a None (o pd.NA para Pandas)
        if value is None and key in ["email", "address", "updated_by_user_id"]: # Campos opcionales que pueden ser None
            customers_df.loc[idx, key] = pd.NA 
        else:
            customers_df.loc[idx, key] = value
    
    customers_df.loc[idx, "updated_at"] = datetime.now()
    customers_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(customers_df, CUSTOMERS_FILE)
    
    updated_customer_dict_from_df = customers_df.loc[idx].to_dict()
    return sanitize_customer_dict_for_response(updated_customer_dict_from_df.copy())


@router.patch("/{customer_id}/inactivate", status_code=status.HTTP_200_OK)
async def inactivate_customer(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay clientes para inactivar.")

    df_id_as_numeric = pd.to_numeric(customers_df["id"], errors='coerce')
    original_customer_series_df = customers_df[df_id_as_numeric == customer_id]

    if original_customer_series_df.empty:
        original_customer_series_df = customers_df[customers_df["id"].astype(str) == str(customer_id)]
        if original_customer_series_df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado para inactivar")
    
    idx = original_customer_series_df.index[0]
    actual_customer_id_in_df = int(float(str(customers_df.loc[idx, "id"])))

    current_is_active_val = customers_df.loc[idx, "is_active"]
    is_currently_active = False 
    if pd.notna(current_is_active_val):
        if isinstance(current_is_active_val, str):
            is_currently_active = current_is_active_val.lower() == 'true' or current_is_active_val == '1'
        else:
            is_currently_active = bool(current_is_active_val)
    
    if not is_currently_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El cliente ya está inactivo")

    customers_df.loc[idx, "is_active"] = False 
    customers_df.loc[idx, "updated_at"] = datetime.now()
    customers_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(customers_df, CUSTOMERS_FILE)

    log_customer_action(
        customer_id=actual_customer_id_in_df,
        action="inactivacion",
        user_id=current_user["id"],
        details={"inactivated": True}
    )
    
    return {"message": "Cliente inactivado correctamente", "customer_id": actual_customer_id_in_df}


@router.get("/{customer_id}/history", response_model=List[CustomerHistoryResponse])
async def get_customer_history(
    customer_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    if customers_df.empty:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay clientes para verificar historial.")

    df_id_as_numeric = pd.to_numeric(customers_df["id"], errors='coerce')
    customer_exists_df = customers_df[df_id_as_numeric == customer_id]
    if customer_exists_df.empty:
        customer_exists_df = customers_df[customers_df["id"].astype(str) == str(customer_id)]
        if customer_exists_df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado para ver historial")

    history_df = load_df(CUSTOMER_HISTORY_FILE, columns=CUSTOMER_HISTORY_COLUMNS)
    if history_df.empty:
        return []

    # Asegurar que customer_id en history_df (que debería ser int) se compare con el int customer_id
    history_customer_id_col_numeric = pd.to_numeric(history_df["customer_id"], errors='coerce')
    customer_specific_history_df = history_df[history_customer_id_col_numeric == customer_id]
    
    # Sanitización para la respuesta del historial
    # CustomerHistoryResponse espera 'details: str', 'date: datetime', 'id: int', 'customer_id: int', 'user_id: int'
    if customer_specific_history_df.empty:
        return []
        
    results = []
    for _, row in customer_specific_history_df.iterrows():
        history_item = row.to_dict()
        # Asegurar tipos correctos
        try:
            history_item['id'] = int(float(str(history_item.get('id',0))))
            history_item['customer_id'] = int(float(str(history_item.get('customer_id',0))))
            history_item['user_id'] = int(float(str(history_item.get('user_id',0))))
        except (ValueError, TypeError):
            print(f"Advertencia: No se pudieron convertir IDs a int para el registro de historial: {history_item}")
            continue # Omitir este registro de historial si los IDs son inválidos

        history_item['date'] = pd.to_datetime(history_item.get('date'), errors='coerce')
        if pd.isna(history_item['date']): # Si la fecha no es válida, no incluirla o manejar error
            print(f"Advertencia: Fecha inválida para el registro de historial: {history_item}")
            continue # Omitir
            
        # 'details' ya debería ser un string JSON. Si no, asegurarse.
        if not isinstance(history_item.get('details'), str):
            history_item['details'] = json.dumps(history_item.get('details', {}))
            
        # 'action' debería ser string
        history_item['action'] = str(history_item.get('action', ''))

        results.append(history_item)
        
    return sorted(results, key=lambda x: x['date'], reverse=True)