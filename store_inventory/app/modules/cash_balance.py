from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime, date
import json
from pydantic import BaseModel, Field, field_validator 
from pydantic import ValidationInfo 

from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user,
    load_df,
    save_df,
    DATA_DIR,
    get_store_settings_sync
)
from app.modules.billing import SALES_FILE, SALES_COLUMNS # Para obtener ventas del día

router = APIRouter()

CASH_RECORDS_FILE = DATA_DIR / "cash_records.csv"
CASH_RECORDS_COLUMNS = [
    "id", "date", "opened_by_user_id", "opened_by_username", "initial_balance",
    "cash_sales", "card_sales", "transfer_sales", "total_income_calculated",
    "expenses_details", 
    "total_expenses_recorded",
    "profit_of_the_day", 
    "expected_cash_in_box", 
    "counted_cash_physical",
    "difference", 
    "cash_to_consign", 
    "notes", "closed_by_user_id", "closed_by_username", "closing_time", "status"
]

class ExpenseItem(BaseModel):
    concept: str = Field(..., min_length=3)
    value: float = Field(..., ge=0)
    recipient_id: Optional[str] = Field(None, description="Cédula o ID de quien recibe el egreso")
    
    expense_date: Optional[date] = Field(None, description="Fecha del egreso (si es diferente a la del cuadre, por defecto es la del cuadre)")

class CashBalanceOpen(BaseModel):
    initial_balance_override: Optional[float] = Field(None, ge=0, description="Si se quiere sobreescribir la base de caja configurada (requiere permiso admin)")

class CashBalanceClose(BaseModel):
    expenses_details: List[ExpenseItem] = []
    counted_cash_physical: float = Field(..., ge=0, description="Efectivo físico contado en caja")
    notes: Optional[str] = None

class CashRecordResponse(BaseModel):
    id: int
    date: date 
    opened_by_user_id: int
    opened_by_username: str
    initial_balance: float
    cash_sales: Optional[float] = None
    card_sales: Optional[float] = None
    transfer_sales: Optional[float] = None
    total_income_calculated: Optional[float] = None
    expenses_details: List[ExpenseItem] = [] # ExpenseItem ahora incluye expense_date
    total_expenses_recorded: Optional[float] = None
    #Utilidad del Día Explícita 
    profit_of_the_day: Optional[float] = None 
    expected_cash_in_box: Optional[float] = None
    counted_cash_physical: Optional[float] = None
    difference: Optional[float] = None
    cash_to_consign: Optional[float] = None
    notes: Optional[str] = None
    closed_by_user_id: Optional[int] = None
    closed_by_username: Optional[str] = None
    closing_time: Optional[datetime] = None
    status: str

def get_open_cash_record_for_today(today_date: date) -> Optional[pd.Series]:
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty:
        return None
    if 'date' not in cash_records_df.columns or cash_records_df['date'].isnull().all():
        return None # Evitar error si la columna 'date' no existe o está toda vacía
        
    cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date']).dt.date
    
    open_record = cash_records_df[
        (cash_records_df['date_obj'] == today_date) &
        (cash_records_df['status'] == 'open')
    ]
    return open_record.iloc[0] if not open_record.empty else None


# Rutas 
@router.post("/open", response_model=CashRecordResponse, status_code=status.HTTP_201_CREATED)
async def open_cash_balance(
    open_data: Optional[CashBalanceOpen] = None, 
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    if current_user["role"] not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para abrir caja.")

    today = date.today()
    if get_open_cash_record_for_today(today) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un cuadre de caja abierto para hoy.")

    cash_records_df_all = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if not cash_records_df_all.empty and 'date' in cash_records_df_all.columns and not cash_records_df_all['date'].isnull().all():
        cash_records_df_all['date_obj'] = pd.to_datetime(cash_records_df_all['date']).dt.date
        pending_closure = cash_records_df_all[
            (cash_records_df_all['status'] == 'open') & (cash_records_df_all['date_obj'] < today)
        ]
        if not pending_closure.empty:
            last_pending_date = pending_closure['date_obj'].max()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Existe un cuadre de caja abierto del día {last_pending_date} que debe cerrarse primero.")

    store_settings = get_store_settings_sync()
    initial_balance = store_settings.initial_cash_balance

    if open_data and open_data.initial_balance_override is not None:
        if current_user["role"] not in ["admin", "soporte"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores o soporte pueden sobreescribir la base de caja.")
        initial_balance = open_data.initial_balance_override
    
    # Re-cargar por si se creó el archivo en load_df dentro de get_open_cash_record_for_today
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    next_id = cash_records_df["id"].max() + 1 if not cash_records_df.empty else 1

    new_record_data = {
        "id": next_id,
        "date": today.isoformat(),
        "opened_by_user_id": current_user["id"],
        "opened_by_username": current_user["username"],
        "initial_balance": initial_balance,
        "status": "open",
        "cash_sales": None, "card_sales": None, "transfer_sales": None, "total_income_calculated": None,
        "expenses_details": json.dumps([]), "total_expenses_recorded": None,
        "profit_of_the_day": None, # <<< NUEVO CAMPO INICIALIZADO >>>
        "expected_cash_in_box": None, "counted_cash_physical": None, "difference": None,
        "cash_to_consign": None, "notes": None, "closed_by_user_id": None,
        "closed_by_username": None, "closing_time": None
    }

    cash_records_df = pd.concat([cash_records_df, pd.DataFrame([new_record_data])], ignore_index=True)
    save_df(cash_records_df, CASH_RECORDS_FILE)
    
    response_data = new_record_data.copy()
    response_data["expenses_details"] = [] 
    response_data["date"] = today 

    return CashRecordResponse(**response_data)


@router.post("/close", response_model=CashRecordResponse)
async def close_cash_balance(
    close_data: CashBalanceClose,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    today = date.today()
    open_record_series = get_open_cash_record_for_today(today)

    if open_record_series is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay un cuadre de caja abierto para hoy.")
    
    if open_record_series["opened_by_user_id"] != current_user["id"] and current_user["role"] not in ["admin", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el usuario que abrió la caja o un administrador/soporte pueden cerrarla.")

    sales_df_all = load_df(SALES_FILE, columns=SALES_COLUMNS)
    today_sales_df = pd.DataFrame(columns=SALES_COLUMNS) # Inicializar por si no hay ventas
    if not sales_df_all.empty and 'date' in sales_df_all.columns and not sales_df_all['date'].isnull().all():
        sales_df_all['date_obj'] = pd.to_datetime(sales_df_all['date']).dt.date
        today_sales_df = sales_df_all[
            (sales_df_all['date_obj'] == today) & (sales_df_all['status'] == 'completed')
        ]
    
    cash_sales_today = today_sales_df[today_sales_df["payment_method"].str.lower() == "efectivo"]["total_amount"].sum()
    card_sales_today = today_sales_df[today_sales_df["payment_method"].str.lower() == "tarjeta"]["total_amount"].sum()
    transfer_sales_today = today_sales_df[today_sales_df["payment_method"].str.lower() == "transferencia"]["total_amount"].sum()
    total_income_calculated_today = cash_sales_today + card_sales_today + transfer_sales_today

    total_expenses_recorded_today = sum(e.value for e in close_data.expenses_details)
    
    #  Utilidad del Día
    profit_of_the_day_calculated = total_income_calculated_today - total_expenses_recorded_today

    initial_cash = open_record_series["initial_balance"]
    expected_cash_in_box = initial_cash + cash_sales_today - total_expenses_recorded_today
    difference = close_data.counted_cash_physical - expected_cash_in_box
    
    cash_to_consign = cash_sales_today - total_expenses_recorded_today
    if cash_to_consign < 0: 
        cash_to_consign = 0

    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    record_index = cash_records_df[cash_records_df["id"] == open_record_series["id"]].index
    
    if record_index.empty:
        # Esto sería muy raro si get_open_cash_record_for_today funcionó, pero por si acaso
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se encontró el registro de caja abierta para actualizar.")
    idx = record_index[0]
    
    # Preparar detalles de egresos con la fecha
    processed_expenses = []
    for e in close_data.expenses_details:
        expense_dict = e.dict()
        if e.expense_date is None: # Si no se provee fecha, se asume la del cuadre
            expense_dict["expense_date"] = today.isoformat()
        else:
            expense_dict["expense_date"] = e.expense_date.isoformat()
        processed_expenses.append(expense_dict)

    cash_records_df.loc[idx, "cash_sales"] = round(cash_sales_today, 2)
    cash_records_df.loc[idx, "card_sales"] = round(card_sales_today, 2)
    cash_records_df.loc[idx, "transfer_sales"] = round(transfer_sales_today, 2)
    cash_records_df.loc[idx, "total_income_calculated"] = round(total_income_calculated_today, 2)
    cash_records_df.loc[idx, "expenses_details"] = json.dumps(processed_expenses) # Guardar con fechas
    cash_records_df.loc[idx, "total_expenses_recorded"] = round(total_expenses_recorded_today, 2)
    cash_records_df.loc[idx, "profit_of_the_day"] = round(profit_of_the_day_calculated, 2) 
    cash_records_df.loc[idx, "expected_cash_in_box"] = round(expected_cash_in_box, 2)
    cash_records_df.loc[idx, "counted_cash_physical"] = round(close_data.counted_cash_physical, 2)
    cash_records_df.loc[idx, "difference"] = round(difference, 2)
    cash_records_df.loc[idx, "cash_to_consign"] = round(cash_to_consign, 2)
    cash_records_df.loc[idx, "notes"] = close_data.notes
    cash_records_df.loc[idx, "closed_by_user_id"] = current_user["id"]
    cash_records_df.loc[idx, "closed_by_username"] = current_user["username"]
    cash_records_df.loc[idx, "closing_time"] = datetime.now()
    cash_records_df.loc[idx, "status"] = "closed"

    save_df(cash_records_df, CASH_RECORDS_FILE)
    
    closed_record_data = cash_records_df.loc[idx].to_dict()
    # Deserializar expenses_details para la respuesta
    try:
        loaded_expenses = json.loads(closed_record_data["expenses_details"])
        closed_record_data["expenses_details"] = [ExpenseItem(**e) for e in loaded_expenses]
    except (json.JSONDecodeError, TypeError):
        closed_record_data["expenses_details"] = []
        
    closed_record_data["date"] = pd.to_datetime(closed_record_data["date"]).date() 
    # Manejo de NaN para profit_of_the_day en la respuesta
    if pd.isna(closed_record_data.get("profit_of_the_day")):
        closed_record_data["profit_of_the_day"] = None
            
    return CashRecordResponse(**closed_record_data)


@router.get("/today", response_model=Optional[CashRecordResponse])
async def get_todays_cash_record_status(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    today = date.today()
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty:
        return None
            
    if 'date' not in cash_records_df.columns or cash_records_df['date'].isnull().all():
        return None
        
    cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date']).dt.date
    todays_record_series = cash_records_df[cash_records_df['date_obj'] == today]

    if todays_record_series.empty:
        return None
    
    record_to_show_series = None
    open_today = todays_record_series[todays_record_series['status'] == 'open']
    if not open_today.empty:
        record_to_show_series = open_today.iloc[-1] 
    else: 
        closed_today = todays_record_series[todays_record_series['status'] == 'closed']
        if not closed_today.empty:
            record_to_show_series = closed_today.iloc[-1] 
        else:
            return None

    if record_to_show_series is None: return None

    record_dict = record_to_show_series.to_dict()
    try:
        loaded_expenses = json.loads(record_dict["expenses_details"])
        record_dict["expenses_details"] = [ExpenseItem(**e) for e in loaded_expenses]
    except (json.JSONDecodeError, TypeError):
         record_dict["expenses_details"] = []
    record_dict["date"] = pd.to_datetime(record_dict["date"]).date()
    
    # Manejo de NaN para campos opcionales en la respuesta
    if pd.isna(record_dict.get("profit_of_the_day")):
        record_dict["profit_of_the_day"] = None
    if pd.isna(record_dict.get("closing_time")):
        record_dict["closing_time"] = None
    # podría añadi más chequeos para otros campos opcionales si es necesario

    return CashRecordResponse(**record_dict)


@router.get("/", response_model=List[CashRecordResponse])
async def read_cash_records(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, pattern="^(open|closed)$", alias="status"),
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) 
):
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty:
        return []

    if 'date' not in cash_records_df.columns or cash_records_df['date'].isnull().all():
        return [] # Si no hay columna de fecha o está vacía, no se puede procesar.

    cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date']).dt.date
    if 'closing_time' in cash_records_df.columns: 
        cash_records_df['closing_time'] = pd.to_datetime(cash_records_df['closing_time'], errors='coerce')

    if start_date:
        cash_records_df = cash_records_df[cash_records_df["date_obj"] >= start_date]
    if end_date:
        cash_records_df = cash_records_df[cash_records_df["date_obj"] <= end_date]
    if status_filter:
        cash_records_df = cash_records_df[cash_records_df["status"] == status_filter]
            
    cash_records_df = cash_records_df.sort_values(by="date_obj", ascending=False)
    
    results = []
    for _, row in cash_records_df.iloc[skip : skip + limit].iterrows():
        row_dict = row.to_dict()
        try:
            loaded_expenses = json.loads(row_dict["expenses_details"])
            row_dict["expenses_details"] = [ExpenseItem(**e) for e in loaded_expenses]
        except (json.JSONDecodeError, TypeError):
            row_dict["expenses_details"] = []

        row_dict["date"] = row_dict["date_obj"] 
        
        # Manejo de NaN para campos opcionales en la respuesta
        if pd.isna(row_dict.get("profit_of_the_day")):
            row_dict["profit_of_the_day"] = None
        if pd.isna(row_dict.get("closing_time")): 
            row_dict["closing_time"] = None
        #podría añadir más chequeos para otros campos opcionales si es necesario

        results.append(CashRecordResponse(**row_dict))
            
    return results

