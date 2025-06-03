from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse # Para exportar archivos
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime, date, timedelta
import io # Para generar archivos en memoria
import json
from pydantic import BaseModel

from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user,
    load_df,
    DATA_DIR,
    get_store_settings_sync # Necesario para low_stock_only
)
from app.modules.billing import SALES_FILE, SALES_COLUMNS, SaleResponseItem # Usaremos SaleResponseItem
from app.modules.inventory_management import INVENTORY_FILE, INVENTORY_COLUMNS, INVENTORY_HISTORY_FILE, HISTORY_COLUMNS
from app.modules.customer_management import CUSTOMERS_FILE, CUSTOMER_COLUMNS
from app.modules.cash_balance import CASH_RECORDS_FILE, CASH_RECORDS_COLUMNS
from app.modules.service_management import SERVICES_FILE, SERVICES_COLUMNS


router = APIRouter()



class ReportSaleItemDetail(BaseModel):
    id: int
    item_type: str
    quantity: int
    unit_price: float
    description: str
    total_item_price: float

class SalesReportItem(BaseModel):
    invoice_number: str
    date: datetime
    customer_id: int
    customer_name: str
    customer_document: Optional[str] = None
    total_amount: float
    payment_method: str
    status: str
    items: List[ReportSaleItemDetail] # INCLUYE DETALLE DE ITEMS

class InventoryStatusReportItem(BaseModel):
    product_code: str
    description: str
    quantity: int
    sale_value: float
    total_value_in_stock: float
    is_low_stock: bool # Para indicar si está bajo stock

class InventoryMovementReportItem(BaseModel):
    date: datetime
    product_id: int
    product_code: str
    # Podría añadir product_description aquí si hacemos un join con INVENTORY_FILE
    quantity_changed: int
    new_quantity: int
    movement_type: str
    notes: Optional[str] = None
    user_id: int

class ServicePerformedReportItem(BaseModel):
    sale_date: datetime
    invoice_number: str
    service_id: int # 0 si es temporal
    service_code: Optional[str] = None # Código del servicio si es permanente
    service_description: str
    quantity: int
    unit_price: float
    total_service_price: float
    customer_id: int
    customer_name: str

class FrequentCustomerReportItem(BaseModel):
    customer_id: int
    customer_name: str
    customer_document: Optional[str] = None
    total_sales_count: int
    total_amount_spent: float

class FinancialSummaryReportItem(BaseModel):
    period_start_date: date
    period_end_date: date
    total_income_from_sales: float
    total_expenses_recorded: float
    net_profit: float

#Funciones Auxiliares 

def filter_df_by_date_range(df: pd.DataFrame, date_column: str, start_date: Optional[date], end_date: Optional[date]) -> pd.DataFrame:
    if df.empty or date_column not in df.columns:
        return pd.DataFrame(columns=df.columns) # Devuelve un DF vacío con las mismas columnas si no hay datos o la columna no existe
    
    # Crear una copia para no modificar el DataFrame original fuera de la función
    df_copy = df.copy()

    # Asegurar que la columna de fecha es datetime.date para la comparación
    # Si ya es datetime64, extraer solo la parte de la fecha
    if pd.api.types.is_datetime64_any_dtype(df_copy[date_column]):
        df_copy[date_column] = pd.to_datetime(df_copy[date_column]).dt.date
    else: # Si no es datetime64, intentar convertirla, asumiendo que podría ser string
        df_copy[date_column] = pd.to_datetime(df_copy[date_column], errors='coerce').dt.date
    
    # Filtrar NaT (Not a Time) que resultan de conversiones fallidas
    df_copy = df_copy.dropna(subset=[date_column])

    if start_date:
        df_copy = df_copy[df_copy[date_column] >= start_date]
    if end_date:
        df_copy = df_copy[df_copy[date_column] <= end_date]
    return df_copy

async def export_dataframe_to_excel(df: pd.DataFrame, filename_prefix: str) -> StreamingResponse:
    """Helper para exportar un DataFrame de Pandas a un archivo Excel en memoria."""
    output = io.BytesIO()
    try:
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Report')
        output.seek(0) # Mover el cursor al inicio del stream
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename_prefix}_{date.today()}.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        # Log el error si tiene un sistema de logging
        print(f"Error al generar Excel: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al generar el archivo Excel.")



@router.get("/sales-summary", response_model=List[SalesReportItem], tags=["Reports - JSON"])
async def get_sales_summary_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    customer_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None, description="Filtrar por ID de producto vendido"),
    service_id: Optional[int] = Query(None, description="Filtrar por ID de servicio (permanente) vendido"),
    payment_method: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, pattern="^(completed|cancelled)$", alias="status"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    if sales_df.empty: return []

    sales_df = filter_df_by_date_range(sales_df, "date", start_date, end_date)

    if customer_id:
        sales_df = sales_df[sales_df["customer_id"] == customer_id]
    if payment_method:
        sales_df = sales_df[sales_df["payment_method"].str.lower() == payment_method.lower()]
    if status_filter:
        sales_df = sales_df[sales_df["status"] == status_filter]

    # Filtro por product_id o service_id
    if product_id is not None or service_id is not None:
        def check_item_in_sale(items_json_str: str) -> bool:
            if not isinstance(items_json_str, str): return False
            try:
                items_list = json.loads(items_json_str)
                for item in items_list:
                    if isinstance(item, dict):
                        if product_id is not None and item.get("item_type") == "product" and item.get("id") == product_id:
                            return True
                        if service_id is not None and item.get("item_type") == "service" and item.get("id") == service_id:
                            return True
            except json.JSONDecodeError: return False
            return False
        sales_df = sales_df[sales_df["items"].apply(check_item_in_sale)]
    
    # Preparar datos para la respuesta, incluyendo items detallados
    report_data_list = []
    for _, row in sales_df.iterrows():
        row_dict = row.to_dict()
        try:
            items_from_json = json.loads(row_dict.get("items", "[]"))
            detailed_items = [ReportSaleItemDetail(**item) for item in items_from_json]
        except (json.JSONDecodeError, TypeError):
            detailed_items = []
        
        report_data_list.append(SalesReportItem(
            invoice_number=row_dict.get("invoice_number"),
            date=pd.to_datetime(row_dict.get("date")), # Asegurar que sea datetime
            customer_id=row_dict.get("customer_id"),
            customer_name=row_dict.get("customer_name"),
            customer_document=row_dict.get("customer_document"),
            total_amount=row_dict.get("total_amount"),
            payment_method=row_dict.get("payment_method"),
            status=row_dict.get("status"),
            items=detailed_items
        ))
    return report_data_list

@router.get("/sales-summary/export/excel", tags=["Reports - Export"])
async def export_sales_summary_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    customer_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    service_id: Optional[int] = Query(None),
    payment_method: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, pattern="^(completed|cancelled)$", alias="status"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    sales_report_items = await get_sales_summary_report(
        start_date, end_date, customer_id, product_id, service_id, payment_method, status_filter, current_user
    )
    if not sales_report_items:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay datos para exportar con los filtros aplicados.")

    # Para Excel, es mejor aplanar los ítems o representarlos de forma simple.
    # Aquí, convertiremos la lista de ítems a una cadena JSON para simplificar la exportación.
    # O podríamos crear una fila por cada ítem (más complejo de estructurar aquí).
    data_to_export = []
    for sale in sales_report_items:
        sale_dict = sale.dict()
        sale_dict["items"] = json.dumps([item.dict() for item in sale.items]) # Items como JSON string
        # Asegurar que la fecha se formatee bien para Excel si es necesario (opcional)
        sale_dict["date"] = sale.date.strftime('%Y-%m-%d %H:%M:%S') if sale.date else None
        data_to_export.append(sale_dict)
    
    df_to_export = pd.DataFrame(data_to_export)
    return await export_dataframe_to_excel(df_to_export, "sales_summary")

@router.get("/inventory-status", response_model=List[InventoryStatusReportItem], tags=["Reports - JSON"])
async def get_inventory_status_report(
    active_only: bool = Query(True),
    low_stock_only: Optional[bool] = Query(None), 
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    inventory_df = load_df(INVENTORY_FILE, columns=INVENTORY_COLUMNS)
    if inventory_df.empty: return []

    if active_only:
        inventory_df = inventory_df[inventory_df["is_active"] == True]

    # Lógica de low_stock_only (ACTIVADA)
    settings = get_store_settings_sync() # Cargar configuración de la tienda
    threshold = settings.low_stock_threshold

    if low_stock_only is not None:
        if low_stock_only: # True: mostrar los que están bajos
            inventory_df = inventory_df[inventory_df["quantity"] <= threshold]
        else: # False: mostrar los que NO están bajos
            inventory_df = inventory_df[inventory_df["quantity"] > threshold]
            
    inventory_df["total_value_in_stock"] = inventory_df["quantity"] * inventory_df["sale_value"]
    inventory_df["is_low_stock"] = inventory_df["quantity"] <= threshold
    
    report_data = inventory_df[[
        "code", "description", "quantity", "sale_value", "total_value_in_stock", "is_low_stock"
    ]].rename(columns={"code": "product_code"}).to_dict(orient="records")
    
    return [InventoryStatusReportItem(**item) for item in report_data]

@router.get("/inventory-status/export/excel", tags=["Reports - Export"])
async def export_inventory_status_excel(
    active_only: bool = Query(True),
    low_stock_only: Optional[bool] = Query(None),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    report_items = await get_inventory_status_report(active_only, low_stock_only, current_user)
    if not report_items:
        raise HTTPException(status_code=404, detail="No hay datos para exportar.")
    df_to_export = pd.DataFrame([item.dict() for item in report_items])
    return await export_dataframe_to_excel(df_to_export, "inventory_status")


@router.get("/inventory-movements", response_model=List[InventoryMovementReportItem], tags=["Reports - JSON"])
async def get_inventory_movements_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product_id: Optional[int] = Query(None),
    product_code: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    user_id_filter: Optional[int] = Query(None, alias="user_id"), # Renombrar para evitar conflicto con current_user
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    history_df = load_df(INVENTORY_HISTORY_FILE, columns=HISTORY_COLUMNS)
    if history_df.empty: return []

    history_df = filter_df_by_date_range(history_df, "date", start_date, end_date)

    if product_id is not None:
        history_df = history_df[history_df["product_id"] == product_id]
    if product_code:
        history_df = history_df[history_df["product_code"] == product_code]
    if movement_type:
        history_df = history_df[history_df["movement_type"].str.contains(movement_type, case=False, na=False)]
    if user_id_filter is not None:
        history_df = history_df[history_df["user_id"] == user_id_filter]
        
    history_df = history_df.sort_values(by="date", ascending=False)
    return history_df.to_dict(orient="records") # Pydantic validará cada dict

@router.get("/inventory-movements/export/excel", tags=["Reports - Export"])
async def export_inventory_movements_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product_id: Optional[int] = Query(None),
    product_code: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    user_id_filter: Optional[int] = Query(None, alias="user_id"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    report_items = await get_inventory_movements_report(
        start_date, end_date, product_id, product_code, movement_type, user_id_filter, current_user
    )
    if not report_items: # report_items es una lista de dicts aquí
        raise HTTPException(status_code=404, detail="No hay datos para exportar.")
    df_to_export = pd.DataFrame(report_items)
    # Asegurar que la columna 'date' se formatee bien para Excel
    if 'date' in df_to_export.columns:
        df_to_export['date'] = pd.to_datetime(df_to_export['date']).dt.strftime('%Y-%m-%d %H:%M:%S')
    return await export_dataframe_to_excel(df_to_export, "inventory_movements")


@router.get("/services-performed", response_model=List[ServicePerformedReportItem], tags=["Reports - JSON"])
async def get_services_performed_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    service_id_filter: Optional[int] = Query(None, alias="service_id", description="Filtrar por ID de servicio (permanente)"),
    customer_id_filter: Optional[int] = Query(None, alias="customer_id"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    if sales_df.empty: return []

    # Cargar nombres de servicios permanentes
    services_master_df = load_df(SERVICES_FILE, columns=SERVICES_COLUMNS)
    service_codes_map = pd.Series(services_master_df.code.values, index=services_master_df.id).to_dict()


    sales_df_filtered_date = filter_df_by_date_range(sales_df, "date", start_date, end_date)
    
    if customer_id_filter is not None:
        sales_df_filtered_date = sales_df_filtered_date[sales_df_filtered_date["customer_id"] == customer_id_filter]

    performed_services = []
    for _, sale_row in sales_df_filtered_date.iterrows():
        try:
            items_list = json.loads(sale_row["items"])
            for item in items_list:
                if isinstance(item, dict) and item.get("item_type") in ["service", "temporary_service"]:
                    if service_id_filter is not None and item.get("item_type") == "service" and item.get("id") != service_id_filter:
                        continue # Saltar si no es el servicio permanente buscado

                    performed_services.append(ServicePerformedReportItem(
                        sale_date=pd.to_datetime(sale_row["date"]),
                        invoice_number=sale_row["invoice_number"],
                        service_id=item.get("id"),
                        service_code=service_codes_map.get(item.get("id")) if item.get("item_type") == "service" else None,
                        service_description=item.get("description"),
                        quantity=item.get("quantity"),
                        unit_price=item.get("unit_price"),
                        total_service_price=item.get("total_item_price"),
                        customer_id=sale_row["customer_id"],
                        customer_name=sale_row["customer_name"]
                    ))
        except (json.JSONDecodeError, TypeError):
            continue # Saltar ventas con items malformados

    return performed_services

@router.get("/services-performed/export/excel", tags=["Reports - Export"])
async def export_services_performed_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    service_id_filter: Optional[int] = Query(None, alias="service_id"),
    customer_id_filter: Optional[int] = Query(None, alias="customer_id"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    report_items = await get_services_performed_report(
        start_date, end_date, service_id_filter, customer_id_filter, current_user
    )
    if not report_items:
        raise HTTPException(status_code=404, detail="No hay datos para exportar.")
    df_to_export = pd.DataFrame([item.dict() for item in report_items])
    if 'sale_date' in df_to_export.columns:
        df_to_export['sale_date'] = pd.to_datetime(df_to_export['sale_date']).dt.strftime('%Y-%m-%d %H:%M:%S')
    return await export_dataframe_to_excel(df_to_export, "services_performed")

@router.get("/frequent-customers", response_model=List[FrequentCustomerReportItem], tags=["Reports - JSON"])
async def get_frequent_customers_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    top_n: int = Query(10, ge=1, description="Número de clientes más frecuentes a mostrar"),
    min_purchases: Optional[int] = Query(None, ge=1, description="Número mínimo de compras para ser considerado"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    if sales_df.empty: return []

    sales_df_filtered = filter_df_by_date_range(sales_df, "date", start_date, end_date)
    sales_df_filtered = sales_df_filtered[sales_df_filtered["status"] == "completed"] # Solo ventas completadas

    if sales_df_filtered.empty: return []

    # Agrupar por cliente
    customer_summary = sales_df_filtered.groupby("customer_id").agg(
        total_sales_count=('invoice_number', 'nunique'), # Contar facturas únicas
        total_amount_spent=('total_amount', 'sum')
    ).reset_index()

    if min_purchases is not None:
        customer_summary = customer_summary[customer_summary['total_sales_count'] >= min_purchases]

    # Ordenar por número de ventas y luego por monto gastado (para desempate)
    customer_summary = customer_summary.sort_values(by=["total_sales_count", "total_amount_spent"], ascending=[False, False])
    
    # Tomar el top_n
    top_customers_summary = customer_summary.head(top_n)

    if top_customers_summary.empty: return []

    # Cargar datos de clientes para añadir nombres y documentos
    customers_df = load_df(CUSTOMERS_FILE, columns=CUSTOMER_COLUMNS)
    
    # Unir con la información de los clientes
    # Asegurarse que customer_id sea del mismo tipo en ambos DataFrames antes del merge
    top_customers_summary['customer_id'] = top_customers_summary['customer_id'].astype(customers_df['id'].dtype)
    
    report_df = pd.merge(
        top_customers_summary,
        customers_df[["id", "full_name", "document_type", "document_number"]],
        left_on="customer_id",
        right_on="id",
        how="left"
    )
    
    # Crear la respuesta
    result_list = []
    for _, row in report_df.iterrows():
        result_list.append(FrequentCustomerReportItem(
            customer_id=row["customer_id"],
            customer_name=row["full_name"],
            customer_document=f"{row['document_type']} {row['document_number']}" if pd.notna(row['document_type']) else None,
            total_sales_count=row["total_sales_count"],
            total_amount_spent=row["total_amount_spent"]
        ))
        
    return result_list

@router.get("/frequent-customers/export/excel", tags=["Reports - Export"])
async def export_frequent_customers_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    top_n: int = Query(10, ge=1),
    min_purchases: Optional[int] = Query(None, ge=1),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    report_items = await get_frequent_customers_report(
        start_date, end_date, top_n, min_purchases, current_user
    )
    if not report_items:
        raise HTTPException(status_code=404, detail="No hay datos para exportar.")
    df_to_export = pd.DataFrame([item.dict() for item in report_items])
    return await export_dataframe_to_excel(df_to_export, "frequent_customers")

@router.get("/financial-summary", response_model=FinancialSummaryReportItem, tags=["Reports - JSON"])
async def get_financial_summary_report(
    start_date: date = Query(..., description="Fecha de inicio del período"),
    end_date: date = Query(..., description="Fecha de fin del período"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    # Calcular ingresos totales de ventas completadas
    sales_df = load_df(SALES_FILE, columns=SALES_COLUMNS)
    sales_in_period = filter_df_by_date_range(sales_df, "date", start_date, end_date)
    completed_sales_in_period = sales_in_period[sales_in_period["status"] == "completed"]
    total_income = completed_sales_in_period["total_amount"].sum() if not completed_sales_in_period.empty else 0.0

    # Calcular egresos totales de cuadres cerrados
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    cash_records_in_period = filter_df_by_date_range(cash_records_df, "date", start_date, end_date)
    closed_cash_records = cash_records_in_period[cash_records_in_period["status"] == "closed"]
    total_expenses = closed_cash_records["total_expenses_recorded"].sum() if not closed_cash_records.empty else 0.0
    
    # Calcular utilidad neta
    net_profit = total_income - total_expenses

    return FinancialSummaryReportItem(
        period_start_date=start_date,
        period_end_date=end_date,
        total_income_from_sales=round(total_income, 2),
        total_expenses_recorded=round(total_expenses, 2),
        net_profit=round(net_profit, 2)
    )

@router.get("/financial-summary/export/excel", tags=["Reports - Export"])
async def export_financial_summary_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user)
):
    report_item = await get_financial_summary_report(start_date, end_date, current_user)
    # Convertir el único item a un DataFrame para la función de exportación
    df_to_export = pd.DataFrame([report_item.dict()])
    return await export_dataframe_to_excel(df_to_export, "financial_summary")