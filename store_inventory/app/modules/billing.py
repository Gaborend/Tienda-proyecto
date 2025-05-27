from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime
import json 
from pydantic import BaseModel, Field, field_validator
from pydantic import ValidationInfo

from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user, 
    load_df,
    save_df,
    DATA_DIR,
    get_next_invoice_number,
    get_store_settings_sync
)
from app.modules.customer_management import CUSTOMERS_FILE, CUSTOMER_COLUMNS
from app.modules.inventory_management import (
    INVENTORY_FILE, INVENTORY_COLUMNS, 
    update_stock_after_sale, revert_stock_after_sale_cancellation,
    ProductResponse as InventoryProductResponse # Para verificar stock
)
from app.modules.service_management import SERVICES_FILE, SERVICES_COLUMNS, ServiceResponse

router = APIRouter()

SALES_FILE = DATA_DIR / "sales.csv"
SALES_COLUMNS = [
    "id", "invoice_number", "date", "customer_id", "customer_name", "customer_document",
    "subtotal", "discount_value", "discount_percentage", "iva_applied", "iva_percentage_used", "total_amount",
    "payment_method", "created_by_user_id", "created_by_username", "items", "status", # status: "completed", "cancelled"
    "cancellation_reason", "cancelled_by_user_id", "cancellation_date"
]
class BillableItemBase(BaseModel):
    id: int 
    item_type: str = Field(..., description="'product' o 'service' o 'temporary_service'")
    quantity: int = Field(..., ge=1)
    unit_price: float 
    description: str 

class BillableItemInput(BaseModel):
    id: int 
    item_type: str = Field(..., pattern="^(product|service|temporary_service)$")
    quantity: int = Field(1, ge=1)
    description: Optional[str] = None
    unit_price: Optional[float] = Field(None, ge=0)

    @field_validator('description', 'unit_price', mode='before')
    def check_temporary_service_fields(cls, v, info: ValidationInfo):
        # 'values' (los otros campos del modelo) ahora se accede a través de 'info.data'
        item_type = info.data.get('item_type') 
        if item_type == 'temporary_service':
            # 'field.name' (el nombre del campo actual) ahora es 'info.field_name'
            if info.field_name == 'description' and v is None:
                raise ValueError('La descripción es requerida para servicios temporales')
            if info.field_name == 'unit_price' and v is None:
                raise ValueError('El precio unitario es requerido para servicios temporales')
        return v

class SaleCreate(BaseModel):
    customer_id: int 
    items: List[BillableItemInput]
    payment_method: str = Field(..., description="Efectivo, Transferencia, Tarjeta")
    discount_percentage: Optional[float] = Field(0.0, ge=0, le=100, description="Descuento como porcentaje del subtotal")
    discount_value: Optional[float] = Field(None, ge=0, description="Descuento como un valor fijo") 
    apply_iva: Optional[bool] = None 

    
    @field_validator('items')
    def items_must_not_be_empty(cls, v): 
        if not v:
            raise ValueError('La lista de ítems no puede estar vacía')
        return v

    @field_validator('discount_value') 
    def ensure_only_one_discount_type(cls, v, info: ValidationInfo):
        # 'v' es el valor del campo 'discount_value' que se está validando.
        # 'info.data' es un diccionario que contiene los otros campos del modelo (como discount_percentage).
        discount_percentage = info.data.get('discount_percentage')
        
        # Si se proporciona un discount_value y es positivo:
        if v is not None and v > 0: 
            # Y si también se proporciona un discount_percentage y es positivo:
            if discount_percentage is not None and discount_percentage > 0:
                # Entonces lanzamos un error porque no se pueden aplicar ambos.
                raise ValueError('Solo se puede aplicar un tipo de descuento: porcentaje o valor fijo, no ambos.')
        return v # Siempre devuelve el valor (v) si la validación pasa.

class SaleResponseItem(BillableItemBase):
    total_item_price: float

class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    date: datetime
    customer_id: int
    customer_name: str
    customer_document: str
    subtotal: float
    discount_value: float # Valor monetario del descuento efectivamente aplicado
    discount_percentage: Optional[float] = None # Porcentaje original, si se usó ese método y no un valor fijo
    iva_applied: bool
    iva_percentage_used: Optional[float] = None
    total_amount: float
    payment_method: str
    created_by_user_id: int
    created_by_username: str
    items: List[SaleResponseItem]
    status: str
    cancellation_reason: Optional[str] = None
    cancelled_by_user_id: Optional[int] = None
    cancellation_date: Optional[datetime] = None
    
@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_in: SaleCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user) 
):
    if current_user["role"] not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para crear facturas.")

    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    customer_data = customers_df[(customers_df["id"] == sale_in.customer_id) & (customers_df["is_active"] == True)]
    if customer_data.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cliente con ID {sale_in.customer_id} no encontrado o inactivo.")
    customer_info = customer_data.iloc[0]

    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    services_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    
    store_settings = get_store_settings_sync()
    apply_iva_globally = sale_in.apply_iva if sale_in.apply_iva is not None else store_settings.apply_iva_by_default
    iva_percentage = store_settings.iva_percentage if apply_iva_globally else 0.0

    processed_items = []
    subtotal = 0.0

    for item_input in sale_in.items:
        item_id_for_log = item_input.id 
        unit_price = 0.0
        description = ""

        if item_input.item_type == "product":
            product_series = inventory_df[(inventory_df["id"] == item_input.id) & (inventory_df["is_active"] == True)]
            if product_series.empty:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Producto con ID {item_input.id} no encontrado o inactivo.")
            item_data = product_series.iloc[0]
            if item_data["quantity"] < item_input.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Stock insuficiente para producto '{item_data['description']}' (ID: {item_input.id}). Solicitado: {item_input.quantity}, Disponible: {item_data['quantity']}.")
            unit_price = item_data["sale_value"]
            description = item_data["description"]
        elif item_input.item_type == "service":
            service_series = services_df[(services_df["id"] == item_input.id) & (services_df["is_active"] == True)]
            if service_series.empty:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Servicio con ID {item_input.id} no encontrado o inactivo.")
            item_data = service_series.iloc[0]
            unit_price = item_data["value"]
            description = item_data["description"]
        elif item_input.item_type == "temporary_service":
            if current_user["role"] not in ["caja", "admin", "soporte"]:
                 raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para agregar servicios temporales.")
            unit_price = item_input.unit_price
            description = f"Servicio Temporal: {item_input.description}"
            item_id_for_log = 0 
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo de ítem inválido: {item_input.item_type}")

        total_item_price = unit_price * item_input.quantity
        subtotal += total_item_price
        
        processed_items.append({
            "id": item_id_for_log,
            "item_type": item_input.item_type,
            "quantity": item_input.quantity,
            "unit_price": unit_price,
            "description": description,
            "total_item_price": total_item_price
        })

    # >>> INICIO CAMBIO: Lógica de cálculo de descuentos actualizada <<<
    subtotal_before_discount = subtotal 
    actual_applied_discount_value = 0.0
    original_discount_percentage_input = sale_in.discount_percentage 

    if sale_in.discount_value is not None and sale_in.discount_value > 0:
        actual_applied_discount_value = min(sale_in.discount_value, subtotal_before_discount)
        original_discount_percentage_input = None 
    elif sale_in.discount_percentage is not None and sale_in.discount_percentage > 0:
        actual_applied_discount_value = (subtotal_before_discount * sale_in.discount_percentage / 100)
    
    subtotal_after_discount = subtotal_before_discount - actual_applied_discount_value
    # >>> FIN CAMBIO <<<
    
    iva_amount = (subtotal_after_discount * iva_percentage / 100) if apply_iva_globally else 0.0
    total_amount = subtotal_after_discount + iva_amount

    invoice_number = get_next_invoice_number()
    now = datetime.now()

    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    next_sale_id = sales_df["id"].max() + 1 if not sales_df.empty else 1

    sale_record = {
        "id": next_sale_id,
        "invoice_number": invoice_number,
        "date": now,
        "customer_id": customer_info["id"],
        "customer_name": customer_info["full_name"],
        "customer_document": f"{customer_info['document_type']} {customer_info['document_number']}",
        "subtotal": round(subtotal_before_discount, 2),
        "discount_value": round(actual_applied_discount_value, 2), 
        "discount_percentage": original_discount_percentage_input if (sale_in.discount_value is None or sale_in.discount_value == 0) and original_discount_percentage_input is not None else None,
        "iva_applied": apply_iva_globally,
        "iva_percentage_used": iva_percentage if apply_iva_globally else None,
        "total_amount": round(total_amount, 2),
        "payment_method": sale_in.payment_method,
        "created_by_user_id": current_user["id"],
        "created_by_username": current_user["username"],
        "items": json.dumps(processed_items), 
        "status": "completed",
        "cancellation_reason": None,
        "cancelled_by_user_id": None,
        "cancellation_date": None
    }
    
    try:
        for item in processed_items:
            if item["item_type"] == "product":
                update_stock_after_sale(product_id=item["id"], quantity_sold=item["quantity"], user_id=current_user["id"], sale_id=invoice_number)
    except ValueError as e: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    sales_df = pd.concat([sales_df, pd.DataFrame([sale_record])], ignore_index=True)
    save_df(sales_df, SALES_FILE)
    
    response_items_obj = [SaleResponseItem(**item) for item in processed_items]
    response_data = {**sale_record, "items": response_items_obj} 
    
    return SaleResponse(**response_data)


@router.get("/", response_model=List[SaleResponse])
async def read_sales(
    skip: int = 0,
    limit: int = 100,
    invoice_number: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None, description="Filtrar ventas que contengan este ID de producto"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    payment_method: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(completed|cancelled)$"),
    current_user: Dict[str, Any] = Depends(get_current_active_user) 
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS) # Asegúrate que SALES_FILE y SALES_COLUMNS estén definidos y accesibles
    if sales_df.empty:
        return []

    # Asegurar que las columnas de fecha sean del tipo datetime
    if 'date' in sales_df.columns and not pd.api.types.is_datetime64_any_dtype(sales_df['date']):
        sales_df['date'] = pd.to_datetime(sales_df['date'])
    
    if 'cancellation_date' in sales_df.columns and not pd.api.types.is_datetime64_any_dtype(sales_df['cancellation_date']):
        sales_df['cancellation_date'] = pd.to_datetime(sales_df['cancellation_date'], errors='coerce')

    # Aplicación de filtros
    if invoice_number:
        # --- CAMBIO AQUÍ ---
        # Antes: sales_df = sales_df[sales_df["invoice_number"].str.contains(invoice_number, case=False, na=False)]
        # Ahora (coincidencia exacta, sensible a mayúsculas/minúsculas):
        sales_df = sales_df[sales_df["invoice_number"] == invoice_number]
        # -------------------

    if customer_id is not None: # Es buena práctica chequear 'is not None' para parámetros opcionales
        # Para mayor robustez con tipos de datos en el CSV:
        if "customer_id" in sales_df.columns:
            sales_df['customer_id'] = pd.to_numeric(sales_df['customer_id'], errors='coerce')
            # Opcional: si quieres ser estricto y solo comparar con enteros no NaN:
            # sales_df = sales_df.dropna(subset=['customer_id'])
            # sales_df['customer_id'] = sales_df['customer_id'].astype(int) # O pd.Int64Dtype()
        sales_df = sales_df[sales_df["customer_id"] == customer_id]
    
    if product_id is not None:
        def check_product_in_items(items_json_str: str, target_product_id: int) -> bool:
            if not isinstance(items_json_str, str): 
                return False
            try:
                items_list = json.loads(items_json_str)
                for item in items_list:
                    if isinstance(item, dict) and item.get("item_type") == "product" and item.get("id") == target_product_id:
                        return True
            except json.JSONDecodeError:
                return False 
            return False
        sales_df = sales_df[sales_df["items"].apply(lambda x: check_product_in_items(x, product_id))]
        
    if start_date:
        # Asegurar que la columna 'date' del DataFrame sea solo fecha para la comparación si start_date es solo fecha
        sales_df_date_to_compare = sales_df['date'].dt.tz_localize(None).dt.normalize() if sales_df['date'].dt.tz is not None else sales_df['date'].dt.normalize()
        query_start_date = pd.to_datetime(start_date).normalize()
        sales_df = sales_df[sales_df_date_to_compare >= query_start_date]

    if end_date:
        # Ajustar end_date para incluir todo el día
        query_end_date = pd.to_datetime(end_date)
        if query_end_date.hour == 0 and query_end_date.minute == 0 and query_end_date.second == 0:
            query_end_date = query_end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        sales_df_date_to_compare = sales_df['date'].dt.tz_localize(None) if sales_df['date'].dt.tz is not None else sales_df['date']
        sales_df = sales_df[sales_df_date_to_compare <= query_end_date]

    if payment_method:
        sales_df = sales_df[sales_df["payment_method"].str.lower() == payment_method.lower()]
    if status:
        sales_df = sales_df[sales_df["status"] == status]
    
    sales_df = sales_df.sort_values(by="date", ascending=False)
    
    results = []
    for _, row in sales_df.iloc[skip : skip + limit].iterrows():
        row_dict = row.to_dict()
        
        # Convertir NaN a None para campos opcionales
        for col in ["cancellation_reason", "cancelled_by_user_id", "cancellation_date", "discount_percentage", "iva_percentage_used"]:
            if col in row_dict and pd.isna(row_dict[col]):
                row_dict[col] = None
        
        try:
            items_input = row_dict.get("items") # Obtener el valor de 'items'
            if isinstance(items_input, str): # Verificar si es un string JSON
                 items_list_obj = json.loads(items_input)
                 row_dict["items"] = [SaleResponseItem(**item) for item in items_list_obj] # Asignar la lista de objetos Pydantic
            elif isinstance(items_input, list): # Si ya es una lista (por ejemplo, de una ejecución anterior o carga directa)
                 # Asegurar que los elementos de la lista son dicts antes de pasarlos a SaleResponseItem
                 row_dict["items"] = [SaleResponseItem(**item) if isinstance(item, dict) else item for item in items_input]
            else:
                 row_dict["items"] = [] # Default a lista vacía si no es string ni lista
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Warning: Could not parse items for sale ID {row_dict.get('id', 'N/A')}. Error: {e}. Items: {row_dict.get('items')}")
            row_dict["items"] = [] 

        try:
            results.append(SaleResponse(**row_dict))
        except Exception as e:
            print(f"Error al crear SaleResponse para la fila: {row_dict.get('id', 'N/A')}")
            print(f"Excepción: {e}")
            continue 
            
    return results

@router.get("/{sale_id}", response_model=SaleResponse)
async def read_sale(
    sale_id: int, 
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    # Asegurar que la columna 'id' sea del tipo correcto para la comparación
    if 'id' in sales_df.columns:
        sales_df['id'] = sales_df['id'].astype(int)

    sale_data_series = sales_df[sales_df["id"] == sale_id]

    if sale_data_series.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    
    sale_dict = sale_data_series.iloc[0].to_dict()
    
    #  Convertir NaN a None para campos opcionales ---
    if pd.isna(sale_dict.get("cancellation_reason")):
        sale_dict["cancellation_reason"] = None
    if pd.isna(sale_dict.get("cancelled_by_user_id")):
        sale_dict["cancelled_by_user_id"] = None
    # Para cancellation_date, pd.to_datetime con errors='coerce' en read_sales
    # ya lo convertiría a NaT. Si aquí es leído de nuevo, pd.isna es correcto.
    if pd.isna(sale_dict.get("cancellation_date")):
        sale_dict["cancellation_date"] = None
    if pd.isna(sale_dict.get("discount_percentage")): # Este es Optional[float] en SaleResponse
        sale_dict["discount_percentage"] = None
    if pd.isna(sale_dict.get("iva_percentage_used")): # Este es Optional[float] en SaleResponse
        sale_dict["iva_percentage_used"] = None
    
        
    try:
        items_list_obj = json.loads(sale_dict["items"])
        # Similar al anterior, asegurar que los items son válidos para SaleResponseItem
        sale_dict["items"] = [SaleResponseItem(**item) for item in items_list_obj]
    except (json.JSONDecodeError, TypeError):
        sale_dict["items"] = []
        
    return SaleResponse(**sale_dict)

@router.patch("/{sale_id}/cancel", response_model=SaleResponse)
async def cancel_sale(
    sale_id: int,
    reason: str = Query(..., min_length=5, description="Motivo de la cancelación"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) 
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    # Asegurar que la columna 'id' sea del tipo correcto para la comparación
    if 'id' in sales_df.columns:
        sales_df['id'] = sales_df['id'].astype(int) # Asegurar que el ID sea int para la comparación

    sale_index = sales_df[sales_df["id"] == sale_id].index

    if sale_index.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")

    idx = sale_index[0]
    if sales_df.loc[idx, "status"] == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La venta ya está cancelada.")

    # Revertir stock
    try:
        items_sold_json = sales_df.loc[idx, "items"]
        if isinstance(items_sold_json, str): # Solo intentar parsear si es un string
            items_sold = json.loads(items_sold_json)
            for item in items_sold:
                if item.get("item_type") == "product": # Usar .get() para seguridad
                    revert_stock_after_sale_cancellation(
                        product_id=item.get("id"), # Usar .get()
                        quantity_reverted=item.get("quantity"), # Usar .get()
                        user_id=current_user["id"],
                        sale_id=sales_df.loc[idx, "invoice_number"]
                    )
        else:
            # Si 'items' no es un string JSON (ej. ya es una lista o NaN), loguear o manejar
            print(f"ADVERTENCIA: Campo 'items' no es un string JSON para la venta {sale_id}. No se revierte stock.")

    except ValueError as e: 
        print(f"ADVERTENCIA: Error al revertir stock para venta {sale_id} (Factura: {sales_df.loc[idx, 'invoice_number']}): {e}")
    except (json.JSONDecodeError, TypeError) as je:
        print(f"ADVERTENCIA: Error al parsear items para reversión de stock en venta {sale_id} (Factura: {sales_df.loc[idx, 'invoice_number']}): {je}")

    # Actualizar los campos de la venta. Pandas manejará la conversión de tipos si es necesario,
    # pero las advertencias podrían persistir si las columnas eran float64 debido a NaN iniciales.
    # Forzar el tipo de columna a 'object' antes de cargar el DF podría ayudar con los FutureWarning,
    # pero la conversión a None para Pydantic es más crucial para el error de JSON.
    sales_df.loc[idx, "status"] = "cancelled"
    sales_df.loc[idx, "cancellation_reason"] = reason 
    sales_df.loc[idx, "cancelled_by_user_id"] = current_user["id"]
    sales_df.loc[idx, "cancellation_date"] = datetime.now()

    save_df(sales_df, SALES_FILE)
    
    cancelled_sale_dict = sales_df.loc[idx].to_dict()
    
    # Convertir NaN a None para campos opcionales
    # Es crucial hacer esto DESPUÉS de .to_dict() y ANTES de SaleResponse()
    if pd.isna(cancelled_sale_dict.get("cancellation_reason")): # Aunque lo acabamos de setear
        cancelled_sale_dict["cancellation_reason"] = None
    if pd.isna(cancelled_sale_dict.get("cancelled_by_user_id")): # Aunque lo acabamos de setear
        cancelled_sale_dict["cancelled_by_user_id"] = None
    if pd.isna(cancelled_sale_dict.get("cancellation_date")): # Aunque lo acabamos de setear
        cancelled_sale_dict["cancellation_date"] = None
    
    # Estos son más propensos a ser NaN si la venta original no los usó
    if pd.isna(cancelled_sale_dict.get("discount_percentage")):
        cancelled_sale_dict["discount_percentage"] = None
    if pd.isna(cancelled_sale_dict.get("iva_percentage_used")):
        cancelled_sale_dict["iva_percentage_used"] = None
    
        
    try:
        items_list_obj_json = cancelled_sale_dict.get("items")
        if isinstance(items_list_obj_json, str):
            items_list_obj = json.loads(items_list_obj_json)
            cancelled_sale_dict["items"] = [SaleResponseItem(**item) for item in items_list_obj]
        elif isinstance(items_list_obj_json, list): # Si ya es una lista (poco probable aquí pero por si acaso)
             cancelled_sale_dict["items"] = [SaleResponseItem(**item) for item in items_list_obj]
        else:
            cancelled_sale_dict["items"] = []

    except (json.JSONDecodeError, TypeError):
        cancelled_sale_dict["items"] = []
    
    return SaleResponse(**cancelled_sale_dict)



