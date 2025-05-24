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
    DATA_DIR,
    get_store_settings_sync
)

router = APIRouter()

INVENTORY_FILE = DATA_DIR / "inventory.csv"
INVENTORY_HISTORY_FILE = DATA_DIR / "inventory_history.csv"

INVENTORY_COLUMNS = ["id", "code", "description", "brand", "quantity", "cost_value", "sale_value", "date_added", "last_updated", "is_active", "category", "low_stock_alert_sent", "created_by_user_id", "updated_by_user_id"]
HISTORY_COLUMNS = ["id", "product_id", "product_code", "quantity_changed", "new_quantity", "movement_type", "notes", "user_id", "date"]

#modelos Pydantic
class ProductBase(BaseModel):
    code: str = Field(..., description="Código interno único del producto")
    description: str = Field(..., min_length=3, description="Descripción del producto")
    brand: Optional[str] = Field(None, description="Marca del producto")
    category: Optional[str] = Field(None, description="Categoría del producto")
    cost_value: float = Field(..., ge=0, description="Valor de costo del producto")
    sale_value: float = Field(..., ge=0, description="Valor de venta del producto")

class ProductCreate(ProductBase):
    quantity: int = Field(..., ge=0, description="Cantidad inicial al registrar el producto")

class ProductUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=3)
    brand: Optional[str] = None
    category: Optional[str] = None
    cost_value: Optional[float] = Field(None, ge=0)
    sale_value: Optional[float] = Field(None, ge=0)
    # La cantidad se actualiza por un endpoint específico de "add stock"

class ProductResponse(ProductBase):
    id: int
    quantity: int
    is_active: bool
    date_added: datetime
    last_updated: datetime
    low_stock_alert_sent: bool
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None

class StockAdjustment(BaseModel):
    quantity_to_add: int # Puede ser negativo para reducir stock por ajuste manual (daño, pérdida)
    reason: str = Field(..., description="Motivo del ajuste (compra, devolución proveedor, daño, pérdida, ajuste inventario)")
    notes: Optional[str] = None

class InventoryMovementLog(BaseModel):
    id: int
    product_id: int
    product_code: str
    quantity_changed: int
    new_quantity: int
    movement_type: str # e.g., "venta", "devolucion_cliente", "compra_proveedor", "ajuste_manual_mas", "ajuste_manual_menos"
    notes: Optional[str] = None
    user_id: int
    date: datetime
    
#funciones de utilidad específicas del módulo 
def log_inventory_movement(
    product_id: int,
    product_code: str,
    quantity_changed: int,
    new_quantity: int,
    movement_type: str,
    user_id: int,
    notes: Optional[str] = None
):
    history_df = load_df(INVENTORY_HISTORY_FILE, columns=HISTORY_COLUMNS)
    next_id = history_df["id"].max() + 1 if not history_df.empty else 1
    
    log_entry = {
        "id": next_id,
        "product_id": product_id,
        "product_code": product_code,
        "quantity_changed": quantity_changed,
        "new_quantity": new_quantity,
        "movement_type": movement_type,
        "notes": notes,
        "user_id": user_id,
        "date": datetime.now()
    }
    history_df = pd.concat([history_df, pd.DataFrame([log_entry])], ignore_index=True)
    save_df(history_df, INVENTORY_HISTORY_FILE)

def check_and_send_low_stock_alerts():
    # Esta función es un placeholder. En una app real, se integraría con un sistema de notificaciones.
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    if inventory_df.empty: return

    settings = get_store_settings_sync()
    low_stock_threshold = settings.low_stock_threshold

    low_stock_products = inventory_df[
        (inventory_df["is_active"] == True) &
        (inventory_df["quantity"] <= low_stock_threshold) &
        (inventory_df["low_stock_alert_sent"] == False) # Solo alertar una vez
    ]

    for index, product in low_stock_products.iterrows():
        print(f"ALERTA BAJO STOCK: Producto {product['code']} - {product['description']} tiene {product['quantity']} unidades.")
        # Aquí iría la lógica para enviar email, SMS, notificación en app, etc.
        inventory_df.loc[inventory_df["id"] == product["id"], "low_stock_alert_sent"] = True
    
    save_df(inventory_df, INVENTORY_FILE)

#rutas
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    if not inventory_df[inventory_df["code"] == product_in.code].empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un producto con este código.")

    next_id = inventory_df["id"].max() + 1 if not inventory_df.empty else 1
    now = datetime.now()

    new_product_data = product_in.dict()
    new_product_data["id"] = next_id
    new_product_data["is_active"] = True
    new_product_data["date_added"] = now
    new_product_data["last_updated"] = now
    new_product_data["low_stock_alert_sent"] = False # Nueva columna
    new_product_data["created_by_user_id"] = current_user["id"]
    new_product_data["updated_by_user_id"] = current_user["id"]


    inventory_df = pd.concat([inventory_df, pd.DataFrame([new_product_data])], ignore_index=True)
    save_df(inventory_df, INVENTORY_FILE)
    
    log_inventory_movement(
        product_id=next_id,
        product_code=product_in.code,
        quantity_changed=product_in.quantity,
        new_quantity=product_in.quantity,
        movement_type="creacion_producto",
        user_id=current_user["id"],
        notes="Registro inicial de producto"
    )
    check_and_send_low_stock_alerts()
    return ProductResponse(**new_product_data)


@router.get("/", response_model=List[ProductResponse])
async def read_products(
    skip: int = 0,  
    limit: int = 100,
    active_only: bool = Query(True, description="Filtrar solo productos activos"),
    search: Optional[str] = Query(None, description="Buscar por código, descripción o marca"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    low_stock: Optional[bool] = Query(None, description="Filtrar productos con bajo stock"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    if inventory_df.empty:
        return []

    if active_only:
        inventory_df = inventory_df[inventory_df["is_active"] == True]
    
    if search:
        search_lower = search.lower()
        inventory_df = inventory_df[
            inventory_df["code"].str.lower().str.contains(search_lower, na=False) |
            inventory_df["description"].str.lower().str.contains(search_lower, na=False) |
            inventory_df["brand"].str.lower().str.contains(search_lower, na=False)
        ]
    
    if category:
        inventory_df = inventory_df[inventory_df["category"].str.lower() == category.lower()]

    if low_stock is not None:
        settings = get_store_settings_sync()
        threshold = settings.low_stock_threshold
        if low_stock: # True: mostrar los que están bajos
            inventory_df = inventory_df[inventory_df["quantity"] <= threshold]
        else: # False: mostrar los que NO están bajos
            inventory_df = inventory_df[inventory_df["quantity"] > threshold]
            
    return inventory_df.iloc[skip : skip + limit].to_dict(orient="records")


@router.get("/{product_id}", response_model=ProductResponse)
async def read_product(
    product_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_data = inventory_df[inventory_df["id"] == product_id]

    if product_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    
    return product_data.iloc[0].to_dict()

@router.get("/by_code/{product_code}", response_model=ProductResponse)
async def read_product_by_code(
    product_code: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_data = inventory_df[inventory_df["code"] == product_code]

    if product_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado con ese código")
    
    return product_data.iloc[0].to_dict()


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product_details( # No actualiza stock aquí, solo detalles
    product_id: int,
    product_in: ProductUpdate,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_index = inventory_df[inventory_df["id"] == product_id].index

    if product_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    idx = product_index[0]
    update_data = product_in.dict(exclude_unset=True)
    
    # Si el código se intenta cambiar, verificar que no exista ya (aunque el modelo no lo permite ahora)
    # if "code" in update_data and update_data["code"] != inventory_df.loc[idx, "code"]:
    #     if not inventory_df[inventory_df["code"] == update_data["code"]].empty:
    #         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe otro producto con el nuevo código.")

    for key, value in update_data.items():
        inventory_df.loc[idx, key] = value
    
    inventory_df.loc[idx, "last_updated"] = datetime.now()
    inventory_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(inventory_df, INVENTORY_FILE)
    check_and_send_low_stock_alerts() # Si cambia el umbral o algo
    return inventory_df.loc[idx].to_dict()


@router.patch("/{product_id}/adjust-stock", response_model=ProductResponse)
async def adjust_product_stock(
    product_id: int,
    adjustment: StockAdjustment,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_index = inventory_df[inventory_df["id"] == product_id].index

    if product_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    idx = product_index[0]
    current_quantity = inventory_df.loc[idx, "quantity"]
    new_quantity = current_quantity + adjustment.quantity_to_add

    if new_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad en inventario no puede ser negativa.")

    inventory_df.loc[idx, "quantity"] = new_quantity
    inventory_df.loc[idx, "last_updated"] = datetime.now()
    inventory_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    inventory_df.loc[idx, "low_stock_alert_sent"] = False # Resetear alerta para que se pueda volver a enviar si es necesario

    save_df(inventory_df, INVENTORY_FILE)
    
    movement_type_log = f"ajuste_stock_{'aumento' if adjustment.quantity_to_add >= 0 else 'reduccion'}"
    log_inventory_movement(
        product_id=product_id,
        product_code=inventory_df.loc[idx, "code"],
        quantity_changed=adjustment.quantity_to_add,
        new_quantity=new_quantity,
        movement_type=movement_type_log,
        user_id=current_user["id"],
        notes=f"Razón: {adjustment.reason}. Notas: {adjustment.notes or ''}"
    )
    check_and_send_low_stock_alerts()
    return inventory_df.loc[idx].to_dict()


@router.patch("/{product_id}/inactivate", status_code=status.HTTP_200_OK)
async def inactivate_product(
    product_id: int,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_index = inventory_df[inventory_df["id"] == product_id].index

    if product_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    idx = product_index[0]
    if inventory_df.loc[idx, "is_active"] == False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El producto ya está inactivo")

    inventory_df.loc[idx, "is_active"] = False
    inventory_df.loc[idx, "last_updated"] = datetime.now()
    inventory_df.loc[idx, "updated_by_user_id"] = current_user["id"]
    
    save_df(inventory_df, INVENTORY_FILE)
    return {"message": "Producto inactivado correctamente", "product_id": product_id}


@router.get("/history/", response_model=List[InventoryMovementLog])
async def get_inventory_history(
    product_id: Optional[int] = Query(None, description="Filtrar por ID de producto"),
    product_code: Optional[str] = Query(None, description="Filtrar por código de producto"),
    movement_type: Optional[str] = Query(None, description="Filtrar por tipo de movimiento"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario que realizó el movimiento"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) # Solo admin o soporte ven historial completo
):
    history_df = load_df(INVENTORY_HISTORY_FILE, columns=HISTORY_COLUMNS)
    if history_df.empty:
        return []
    
    # Convertir columna 'date' a datetime si no lo está
    if not pd.api.types.is_datetime64_any_dtype(history_df['date']):
        history_df['date'] = pd.to_datetime(history_df['date'])

    if product_id:
        history_df = history_df[history_df["product_id"] == product_id]
    if product_code:
        history_df = history_df[history_df["product_code"] == product_code]
    if movement_type:
        history_df = history_df[history_df["movement_type"].str.contains(movement_type, case=False, na=False)]
    if user_id:
        history_df = history_df[history_df["user_id"] == user_id]
    if start_date:
        history_df = history_df[history_df["date"] >= start_date]
    if end_date:
        # Para end_date, usualmente queremos incluir todo el día, así que ajustamos a fin del día si no tiene hora.
        if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
            end_date = end_date.replace(hour=23, minute=59, second=59)
        history_df = history_df[history_df["date"] <= end_date]
        
    history_df = history_df.sort_values(by="date", ascending=False)
    return history_df.iloc[skip : skip + limit].to_dict(orient="records")

# Helper function to be used by billing module
def update_stock_after_sale(product_id: int, quantity_sold: int, user_id: int, sale_id: str):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_index = inventory_df[inventory_df["id"] == product_id].index

    if product_index.empty:
        # Esto sería un error grave si se llama desde facturación.
        raise ValueError(f"Producto con ID {product_id} no encontrado durante actualización de stock por venta.")

    idx = product_index[0]
    current_quantity = inventory_df.loc[idx, "quantity"]
    
    if current_quantity < quantity_sold:
        raise ValueError(f"Stock insuficiente para producto ID {product_id} (código: {inventory_df.loc[idx, 'code']}). Solicitado: {quantity_sold}, Disponible: {current_quantity}")

    new_quantity = current_quantity - quantity_sold
    inventory_df.loc[idx, "quantity"] = new_quantity
    inventory_df.loc[idx, "last_updated"] = datetime.now()
    inventory_df.loc[idx, "updated_by_user_id"] = user_id
    inventory_df.loc[idx, "low_stock_alert_sent"] = False # Resetear alerta

    save_df(inventory_df, INVENTORY_FILE)

    log_inventory_movement(
        product_id=product_id,
        product_code=inventory_df.loc[idx, "code"],
        quantity_changed=-quantity_sold, # Negativo porque es una salida
        new_quantity=new_quantity,
        movement_type="venta",
        user_id=user_id,
        notes=f"Venta asociada a factura ID: {sale_id}"
    )
    check_and_send_low_stock_alerts()

def revert_stock_after_sale_cancellation(product_id: int, quantity_reverted: int, user_id: int, sale_id: str):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    product_index = inventory_df[inventory_df["id"] == product_id].index

    if product_index.empty:
        raise ValueError(f"Producto con ID {product_id} no encontrado durante reversión de stock por cancelación de venta.")

    idx = product_index[0]
    current_quantity = inventory_df.loc[idx, "quantity"]
    new_quantity = current_quantity + quantity_reverted # Sumar de nuevo al stock

    inventory_df.loc[idx, "quantity"] = new_quantity
    inventory_df.loc[idx, "last_updated"] = datetime.now()
    inventory_df.loc[idx, "updated_by_user_id"] = user_id
    inventory_df.loc[idx, "low_stock_alert_sent"] = False

    save_df(inventory_df, INVENTORY_FILE)

    log_inventory_movement(
        product_id=product_id,
        product_code=inventory_df.loc[idx, "code"],
        quantity_changed=quantity_reverted, # Positivo porque es una entrada
        new_quantity=new_quantity,
        movement_type="cancelacion_venta",
        user_id=user_id,
        notes=f"Cancelación de venta ID: {sale_id}"
    )
    check_and_send_low_stock_alerts()
    
    
    
    
    
    
    