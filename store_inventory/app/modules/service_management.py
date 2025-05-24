from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime
from pydantic import BaseModel, Field

from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user,
    load_df,
    save_df,
    DATA_DIR
)

router = APIRouter()

SERVICES_FILE = DATA_DIR / "services.csv"
SERVICES_COLUMNS = ["id", "code", "description", "value", "is_active", "created_at", "updated_at", "created_by_user_id", "updated_by_user_id"]

SERVICE_PRICE_HISTORY_FILE = DATA_DIR / "service_price_history.csv"
HISTORY_COLUMNS = ["id", "service_id", "service_code", "old_value", "new_value", "changed_by_user_id", "change_date"]

class ServiceBase(BaseModel):
    code: str = Field(..., description="Código interno único del servicio")
    description: str = Field(..., min_length=3, description="Descripción del servicio")
    value: float = Field(..., ge=0, description="Valor total del servicio")

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=3)
    value: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None


class ServicePriceHistoryResponse(BaseModel):
    id: int
    service_id: int
    service_code: str
    old_value: float
    new_value: float
    changed_by_user_id: int
    change_date: datetime
    
def log_price_change(service_id: int, service_code: str, old_value: float, new_value: float, user_id: int):
    """Guarda un registro de cambio de precio en el historial."""
    history_df = load_df(SERVICE_PRICE_HISTORY_FILE, columns=HISTORY_COLUMNS)
    next_id = history_df["id"].max() + 1 if not history_df.empty else 1
    now = datetime.now()
    log_entry = {
        "id": next_id,
        "service_id": service_id,
        "service_code": service_code,
        "old_value": old_value,
        "new_value": new_value,
        "changed_by_user_id": user_id,
        "change_date": now
    }
    history_df = pd.concat([history_df, pd.DataFrame([log_entry])], ignore_index=True)
    save_df(history_df, SERVICE_PRICE_HISTORY_FILE)
    
@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_in: ServiceCreate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    if not services_df[services_df["code"] == service_in.code].empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un servicio con este código.")

    next_id = services_df["id"].max() + 1 if not services_df.empty else 1
    now = datetime.now()

    new_service_data = service_in.dict()
    new_service_data["id"] = next_id
    new_service_data["is_active"] = True
    new_service_data["created_at"] = now
    new_service_data["updated_at"] = now
    new_service_data["created_by_user_id"] = current_user["id"]
    new_service_data["updated_by_user_id"] = current_user["id"]

    services_df = pd.concat([services_df, pd.DataFrame([new_service_data])], ignore_index=True)
    save_df(services_df, SERVICES_FILE)
    
    return ServiceResponse(**new_service_data)


@router.get("/", response_model=List[ServiceResponse])
async def read_services(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = Query(True, description="Filtrar solo servicios activos"),
    search: Optional[str] = Query(None, description="Buscar por código o descripción"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    if services_df.empty:
        return []

    if active_only:
        services_df = services_df[services_df["is_active"] == True]
    
    if search:
        search_lower = search.lower()
        services_df = services_df[
            services_df["code"].str.lower().str.contains(search_lower, na=False) |
            services_df["description"].str.lower().str.contains(search_lower, na=False)
        ]
            
    return services_df.iloc[skip : skip + limit].to_dict(orient="records")

@router.get("/{service_id}", response_model=ServiceResponse)
async def read_service(
    service_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    service_data = services_df[services_df["id"] == service_id]

    if service_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    
    return service_data.iloc[0].to_dict()

@router.get("/by_code/{service_code}", response_model=ServiceResponse)
async def read_service_by_code(
    service_code: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    service_data = services_df[services_df["code"] == service_code]

    if service_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado con ese código")
    
    return service_data.iloc[0].to_dict()


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_in: ServiceUpdate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    service_index = services_df[services_df["id"] == service_id].index

    if service_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    idx = service_index[0]
    update_data = service_in.dict(exclude_unset=True)
    
    # logica historial de precios
    old_value = services_df.loc[idx, "value"]
    service_code = services_df.loc[idx, "code"]
    
    if "value" in update_data and update_data["value"] != old_value:
        new_value = update_data["value"]
        log_price_change(
            service_id=service_id,
            service_code=service_code,
            old_value=old_value,
            new_value=new_value,
            user_id=current_user["id"]
        )
    # fin logica del historial

    for key, value in update_data.items():
        services_df.loc[idx, key] = value
    
    services_df.loc[idx, "updated_at"] = datetime.now()
    services_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(services_df, SERVICES_FILE)
    return services_df.loc[idx].to_dict()


@router.patch("/{service_id}/inactivate", status_code=status.HTTP_200_OK)
async def inactivate_service(
    service_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    service_index = services_df[services_df["id"] == service_id].index

    if service_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    idx = service_index[0]
    if not services_df.loc[idx, "is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El servicio ya está inactivo")

    services_df.loc[idx, "is_active"] = False
    services_df.loc[idx, "updated_at"] = datetime.now()
    services_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(services_df, SERVICES_FILE)
    return {"message": "Servicio inactivado correctamente", "service_id": service_id}

#Ruta para ver el historial de precios 
@router.get("/{service_id}/price-history", response_model=List[ServicePriceHistoryResponse])
async def get_service_price_history(
    service_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) # Solo Admin/Soporte ve historial
):
    # Validar que el servicio exista
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    if services_df[services_df["id"] == service_id].empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    history_df = load_df(SERVICE_PRICE_HISTORY_FILE, columns=HISTORY_COLUMNS)
    if history_df.empty:
        return []

    service_history = history_df[history_df["service_id"] == service_id]
    
    return service_history.sort_values(by="change_date", ascending=False).to_dict(orient="records")


