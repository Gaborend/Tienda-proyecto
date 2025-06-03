from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Optional, Any
import pandas as pd
from datetime import datetime, date 
import json

from pydantic import BaseModel, Field 


from app.modules.configuration import (
    get_current_active_user,
    get_admin_or_support_user, 
    load_df,
    save_df,
    DATA_DIR,
    get_store_settings_sync
)
# Para el resumen de ventas en el cierre de caja
from app.modules.billing import SALES_FILE, SALES_COLUMNS 


class ExpenseItem(BaseModel):
    concept: str = Field(..., min_length=3)
    value: float = Field(..., ge=0)
    recipient_id: Optional[str] = Field(None, description="Cédula o ID de quien recibe el egreso")
    expense_date: Optional[date] = Field(None, description="Fecha del egreso (si es diferente a la del cuadre, por defecto es la del cuadre)")
    payment_method_expense: str = Field("Efectivo", description="Método de pago del egreso: Efectivo, Cuenta Bancaria, etc.") # CAMPO ACTUALIZADO/ASEGURADO

class CashBalanceOpen(BaseModel):
    initial_balance_override: Optional[float] = Field(None, ge=0, description="Si se quiere sobreescribir la base de caja configurada (requiere permiso admin)")

class CashBalanceClose(BaseModel):
    expenses_details: List[ExpenseItem] = [] # FastAPI usará el ExpenseItem de arriba para validar
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
    expenses_details: List[ExpenseItem] = [] # Debería mostrar los egresos con su método de pago
    total_expenses_recorded: Optional[float] = None
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


router = APIRouter()

CASH_RECORDS_FILE = DATA_DIR / "cash_records.csv"
CASH_RECORDS_COLUMNS = [
    "id", "date", "opened_by_user_id", "opened_by_username", "initial_balance",
    "cash_sales", "card_sales", "transfer_sales", "total_income_calculated",
    "expenses_details", # Guardará el JSON string de List[Dict_de_ExpenseItem_con_payment_method]
    "total_expenses_recorded", "profit_of_the_day", "expected_cash_in_box", 
    "counted_cash_physical", "difference", "cash_to_consign", 
    "notes", "closed_by_user_id", "closed_by_username", "closing_time", "status"
]

def sanitize_record_dict(record_dict: Dict[str, Any]) -> Dict[str, Any]:
    fields_to_sanitize_if_nan = [
        "notes", "closed_by_user_id", "closed_by_username", "closing_time",
        "cash_sales", "card_sales", "transfer_sales", "total_income_calculated",
        "total_expenses_recorded", "profit_of_the_day",
        "expected_cash_in_box", "counted_cash_physical", "difference", "cash_to_consign"
    ]
    for field in fields_to_sanitize_if_nan:
        if field in record_dict and pd.isna(record_dict[field]):
            record_dict[field] = None
    
    expenses_data_str = record_dict.get("expenses_details")
    parsed_expenses_list = []
    if isinstance(expenses_data_str, str) and expenses_data_str.strip():
        try:
            loaded_expenses_json = json.loads(expenses_data_str)
            if isinstance(loaded_expenses_json, list):
                for e_data in loaded_expenses_json:
                    if isinstance(e_data, dict):
                        # Asegurar que expense_date sea un objeto date si es un string
                        if 'expense_date' in e_data and isinstance(e_data['expense_date'], str):
                            try:
                                e_data['expense_date'] = datetime.fromisoformat(e_data['expense_date'].split('T')[0]).date()
                            except ValueError:
                                # Si la fecha no es válida, Pydantic podría rechazarlo o podrías poner None
                                e_data['expense_date'] = None 
                        # Crear objeto ExpenseItem para validación y asegurar todos los campos (incluyendo defaults)
                        # y luego convertirlo a dict para la respuesta
                        try:
                            item_obj = ExpenseItem(**e_data)
                            parsed_expenses_list.append(item_obj.model_dump()) # Pydantic v2
                        except Exception as pydantic_exc:
                            print(f"Advertencia: Datos de egreso inválidos al sanitizar: {e_data}. Error: {pydantic_exc}")
                            # Opcional: añadir el egreso original si falla la validación Pydantic o excluirlo
                            # parsed_expenses_list.append(e_data) # Omitir si es problemático
            record_dict["expenses_details"] = parsed_expenses_list
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Advertencia: No se pudo procesar 'expenses_details' string: {expenses_data_str}. Error: {e}")
            record_dict["expenses_details"] = []
    elif isinstance(expenses_data_str, list): # Si ya es una lista de dicts (menos probable desde CSV directo)
        record_dict["expenses_details"] = [ExpenseItem(**e).model_dump() if isinstance(e, dict) else e for e in expenses_data_str]
    else: # Si es NaN, None, o un string vacío (ya manejado arriba si era NaN)
        record_dict["expenses_details"] = []


    if 'date_obj' in record_dict: # Si usamos una columna temporal 'date_obj'
        record_dict['date'] = record_dict['date_obj']
    elif 'date' in record_dict and isinstance(record_dict['date'], (str, pd.Timestamp)):
        try:
            record_dict['date'] = pd.to_datetime(record_dict['date']).date()
        except ValueError:
            print(f"Advertencia: formato de fecha inválido para 'date': {record_dict['date']}")
            record_dict['date'] = None # O manejar el error de otra forma

    if 'closing_time' in record_dict and pd.isna(record_dict['closing_time']):
        record_dict['closing_time'] = None
    elif 'closing_time' in record_dict and isinstance(record_dict['closing_time'], str):
        try:
            record_dict['closing_time'] = datetime.fromisoformat(record_dict['closing_time'])
        except ValueError:
            record_dict['closing_time'] = None
    return record_dict

@router.get("/today", response_model=Optional[CashRecordResponse])
async def get_todays_cash_record_status(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    today_server_date = date.today()
    print(f"--- Endpoint /today: La fecha del servidor (date.today()) es: {today_server_date} ---")
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
   
    if cash_records_df.empty:
        print(f"--- Endpoint /today: No hay registros en {CASH_RECORDS_FILE}. Devolviendo None. ---")
        return None
    if 'date' not in cash_records_df.columns or cash_records_df['date'].isnull().all():
        print(f"--- Endpoint /today: Columna 'date' no existe o está vacía. Devolviendo None. ---")
        return None
    try:
        cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date'], errors='coerce').dt.date
        cash_records_df = cash_records_df.dropna(subset=['date_obj'])
    except Exception as e:
        print(f"Error crítico al convertir la columna 'date' en {CASH_RECORDS_FILE}: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar fechas de registros de caja.")
    todays_record_series_df = cash_records_df[cash_records_df['date_obj'] == today_server_date]
    # print(f"--- Endpoint /today: Registros encontrados en CSV para la fecha {today_server_date}: ---")
    # print(todays_record_series_df.to_string()) # Comentado para no ser muy verboso
    if todays_record_series_df.empty:
        print(f"--- Endpoint /today: No se encontró ningún registro para la fecha {today_server_date}. Devolviendo None. ---")
        return None
    record_to_show_series = None
    open_today_df = todays_record_series_df[todays_record_series_df['status'] == 'open']
    if not open_today_df.empty:
        record_to_show_series = open_today_df.iloc[-1]
        
    else: 
        closed_today_df = todays_record_series_df[todays_record_series_df['status'] == 'closed']
        if not closed_today_df.empty:
            record_to_show_series = closed_today_df.iloc[-1]
        else:
            return None
    if record_to_show_series is None: return None
    record_dict = record_to_show_series.to_dict()
    record_dict = sanitize_record_dict(record_dict)       
    return CashRecordResponse(**record_dict)


@router.post("/open", response_model=CashRecordResponse, status_code=status.HTTP_201_CREATED)
async def open_cash_balance(
    open_data: Optional[CashBalanceOpen] = None, 
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    if current_user["role"] not in ["admin", "caja", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para abrir caja.")
    today_server_date = date.today()
    print(f"--- Endpoint /open: Intentando abrir caja. Fecha del servidor (date.today()): {today_server_date} ---")
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if not cash_records_df.empty and 'date' in cash_records_df.columns:
        try:
            cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date'], errors='coerce').dt.date
        except Exception: pass
    if 'date_obj' in cash_records_df.columns:
        open_record_today = cash_records_df[
            (cash_records_df['date_obj'] == today_server_date) &
            (cash_records_df['status'] == 'open')
        ]
        if not open_record_today.empty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ya existe un cuadre de caja abierto para hoy ({today_server_date.strftime('%d/%m/%Y')}).")
        pending_closure_df = cash_records_df[
            (cash_records_df['status'] == 'open') & 
            (cash_records_df['date_obj'].notna()) &
            (cash_records_df['date_obj'] < today_server_date)
        ]
        if not pending_closure_df.empty:
            last_pending_date = pending_closure_df['date_obj'].max()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Existe un cuadre de caja abierto del día {last_pending_date.strftime('%d/%m/%Y')} que debe cerrarse primero.")
    store_settings = get_store_settings_sync()
    initial_balance = store_settings.initial_cash_balance
    if open_data and open_data.initial_balance_override is not None:
        if current_user["role"] not in ["admin", "soporte"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores o soporte pueden sobreescribir la base de caja.")
        initial_balance = open_data.initial_balance_override
    next_id = cash_records_df["id"].max() + 1 if not cash_records_df.empty and "id" in cash_records_df.columns and not cash_records_df["id"].isnull().all() else 1
    new_record_data = {
        "id": next_id, "date": today_server_date.isoformat(),
        "opened_by_user_id": current_user["id"], "opened_by_username": current_user["username"],
        "initial_balance": initial_balance, "status": "open", "cash_sales": None, 
        "card_sales": None, "transfer_sales": None, "total_income_calculated": None,
        "expenses_details": json.dumps([]), "total_expenses_recorded": None,
        "profit_of_the_day": None, "expected_cash_in_box": None, 
        "counted_cash_physical": None, "difference": None, "cash_to_consign": None, 
        "notes": None, "closed_by_user_id": None, "closed_by_username": None, "closing_time": None
    }
    new_entry_df = pd.DataFrame([new_record_data])
    if cash_records_df.empty:
        cash_records_df = pd.DataFrame(columns=CASH_RECORDS_COLUMNS)
    cash_records_df_to_concat = cash_records_df.drop(columns=['date_obj'], errors='ignore')
    cash_records_df = pd.concat([cash_records_df_to_concat, new_entry_df], ignore_index=True)
    save_df(cash_records_df, CASH_RECORDS_FILE)
    response_data_dict = sanitize_record_dict(new_record_data.copy())
    print(f"--- Endpoint /open: Datos del nuevo registro ANTES de Pydantic (new_record_data): {new_record_data} ---")
    print(f"--- Endpoint /open: Datos del nuevo registro DESPUÉS de sanitize y ANTES de Pydantic (response_data_dict): {response_data_dict} ---")
    return CashRecordResponse(**response_data_dict)


@router.post("/close", response_model=CashRecordResponse)
async def close_cash_balance(
    close_data: CashBalanceClose, # FastAPI valida el cuerpo de la petición con este modelo
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    # DEBUG: Ver qué llega del frontend para expenses_details
    print(f"--- Endpoint /close: close_data.expenses_details RECIBIDO DEL FRONTEND: {[item.model_dump() for item in close_data.expenses_details]} ---")

    today_server_date = date.today() # Se usa para buscar el registro abierto de HOY si no se cierra un día anterior
    
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay registros de caja.")

    open_record_series = None
    record_date_to_close = None # Fecha del registro que se está cerrando

    if 'date' in cash_records_df.columns:
        cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date'], errors='coerce').dt.date
        # Buscar un registro abierto para la fecha actual del servidor
        open_record_series_df = cash_records_df[
            (cash_records_df['date_obj'] == today_server_date) & (cash_records_df['status'] == 'open')
        ]
        if not open_record_series_df.empty:
            open_record_series = open_record_series_df.iloc[-1]
            record_date_to_close = open_record_series['date_obj']
            print(f"--- Endpoint /close: Cerrando caja para {record_date_to_close} (ID: {open_record_series['id']}) ---")
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No hay un cuadre de caja abierto para hoy ({today_server_date.strftime('%d/%m/%Y')}) para cerrar.")
    else:
        raise HTTPException(status_code=500, detail="Falta la columna 'date' en el archivo de registros de caja.")

    if open_record_series["opened_by_user_id"] != current_user["id"] and current_user["role"] not in ["admin", "soporte"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el usuario que abrió la caja o un admin/soporte pueden cerrarla.")
    
    sales_df_all = load_df(SALES_FILE, columns=SALES_COLUMNS)
    relevant_sales_df = pd.DataFrame(columns=SALES_COLUMNS) 
    if not sales_df_all.empty and 'date' in sales_df_all.columns and not sales_df_all['date'].isnull().all():
        sales_df_all['sale_date_obj'] = pd.to_datetime(sales_df_all['date']).dt.date
        relevant_sales_df = sales_df_all[
            (sales_df_all['sale_date_obj'] == record_date_to_close) & (sales_df_all['status'] == 'completed')
        ]
    
    cash_sales = relevant_sales_df[relevant_sales_df["payment_method"].str.lower() == "efectivo"]["total_amount"].sum()
    card_sales = relevant_sales_df[relevant_sales_df["payment_method"].str.lower() == "tarjeta"]["total_amount"].sum()
    transfer_sales = relevant_sales_df[relevant_sales_df["payment_method"].str.lower() == "transferencia"]["total_amount"].sum()
    total_income = cash_sales + card_sales + transfer_sales

    processed_expenses_for_json = []
    total_all_expenses = 0.0 # Suma de TODOS los egresos
    total_cash_expenses = 0.0  # Suma de egresos pagados en EFECTIVO

    for e_item in close_data.expenses_details: # e_item ya es un objeto ExpenseItem validado por FastAPI
        total_all_expenses += e_item.value
        if e_item.payment_method_expense and e_item.payment_method_expense.lower() == "efectivo": # <-- LÓGICA CORREGIDA
            total_cash_expenses += e_item.value
        
        exp_dict = e_item.model_dump() # Pydantic v2
        # Asegurar que expense_date se guarde como string YYYY-MM-DD
        if exp_dict.get('expense_date') and isinstance(exp_dict['expense_date'], date):
            exp_dict['expense_date'] = exp_dict['expense_date'].isoformat()
        elif not exp_dict.get('expense_date'): # Si es None o no se envió
             # Usar la fecha del cuadre como defecto si la fecha del egreso no se especificó
            exp_dict['expense_date'] = record_date_to_close.isoformat() 
        processed_expenses_for_json.append(exp_dict)
    
    profit = total_income - total_all_expenses # Utilidad usa todos los egresos
    initial_cash = open_record_series["initial_balance"]
    
    # Usar total_cash_expenses para los cálculos de caja
    expected_cash = initial_cash + cash_sales - total_cash_expenses
    difference = close_data.counted_cash_physical - expected_cash
    cash_to_consign = max(0, cash_sales - total_cash_expenses)

    idx_to_update = cash_records_df[cash_records_df["id"] == open_record_series["id"]].index[0]
    
    cash_records_df.loc[idx_to_update, "cash_sales"] = round(cash_sales, 2)
    cash_records_df.loc[idx_to_update, "card_sales"] = round(card_sales, 2)
    cash_records_df.loc[idx_to_update, "transfer_sales"] = round(transfer_sales, 2)
    cash_records_df.loc[idx_to_update, "total_income_calculated"] = round(total_income, 2)
    cash_records_df.loc[idx_to_update, "expenses_details"] = json.dumps(processed_expenses_for_json) # Guardará payment_method_expense
    cash_records_df.loc[idx_to_update, "total_expenses_recorded"] = round(total_all_expenses, 2) # Total de todos los egresos
    cash_records_df.loc[idx_to_update, "profit_of_the_day"] = round(profit, 2)
    cash_records_df.loc[idx_to_update, "expected_cash_in_box"] = round(expected_cash, 2) # Basado en egresos en efectivo
    cash_records_df.loc[idx_to_update, "counted_cash_physical"] = round(close_data.counted_cash_physical, 2)
    cash_records_df.loc[idx_to_update, "difference"] = round(difference, 2)
    cash_records_df.loc[idx_to_update, "cash_to_consign"] = round(cash_to_consign, 2) # Basado en egresos en efectivo
    cash_records_df.loc[idx_to_update, "notes"] = close_data.notes
    cash_records_df.loc[idx_to_update, "closed_by_user_id"] = current_user["id"]
    cash_records_df.loc[idx_to_update, "closed_by_username"] = current_user["username"]
    cash_records_df.loc[idx_to_update, "closing_time"] = datetime.now()
    cash_records_df.loc[idx_to_update, "status"] = "closed"

    save_df(cash_records_df.drop(columns=['date_obj', 'sale_date_obj'], errors='ignore'), CASH_RECORDS_FILE)
    
    closed_record_dict = cash_records_df.loc[idx_to_update].to_dict()
    closed_record_dict = sanitize_record_dict(closed_record_dict)
            
    return CashRecordResponse(**closed_record_dict)

@router.patch("/reopen-latest-today", response_model=Optional[CashRecordResponse])
async def reopen_latest_today_cash_record(
    current_user: Dict[str, Any] = Depends(get_admin_or_support_user) # Solo admin/soporte pueden reabrir
):
    today_server_date = date.today()
    print(f"--- Endpoint /reopen-latest-today: Intentando reabrir cuadre para {today_server_date} ---")

    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay registros de caja para reabrir.")

    if 'date' not in cash_records_df.columns:
        raise HTTPException(status_code=500, detail="Falta la columna 'date' en registros de caja.")
    
    try:
        cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date'], errors='coerce').dt.date
        cash_records_df_cleaned = cash_records_df.dropna(subset=['date_obj']) # Trabajar con fechas válidas
    except Exception as e:
        print(f"Error crítico al convertir la columna 'date' en /reopen: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar fechas.")

    # Buscar el último registro cerrado para la fecha de hoy
    # Primero, filtramos por la fecha de hoy y que esté cerrado
    todays_closed_records_df = cash_records_df_cleaned[
        (cash_records_df_cleaned['date_obj'] == today_server_date) &
        (cash_records_df_cleaned['status'] == 'closed')
    ]

    if todays_closed_records_df.empty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No se encontró un cuadre cerrado para hoy ({today_server_date.strftime('%d/%m/%Y')}) que se pueda reabrir.")

    # Si hay múltiples cerrados hoy (no debería pasar), tomamos el más reciente por 'closing_time'
    # Asegurar que closing_time sea datetime para ordenar
    if 'closing_time' in todays_closed_records_df.columns:
        todays_closed_records_df.loc[:, 'closing_time_dt'] = pd.to_datetime(todays_closed_records_df['closing_time'], errors='coerce')
        record_to_reopen_series = todays_closed_records_df.sort_values(by='closing_time_dt', ascending=False).iloc[0]
    else: # Si no hay closing_time, tomar el último por índice (menos preciso)
        record_to_reopen_series = todays_closed_records_df.iloc[-1]
    
    record_id_to_reopen = record_to_reopen_series["id"]
    idx_to_update_series = cash_records_df[cash_records_df["id"] == record_id_to_reopen].index

    if idx_to_update_series.empty:
        raise HTTPException(status_code=500, detail="Error interno: No se pudo encontrar el índice del registro a reabrir.")
    
    idx_to_update = idx_to_update_series[0]

    # Campos a limpiar/resetear para reabrir.
    # Los ingresos (cash_sales, etc.) y los expenses_details se MANTIENEN.
    cash_records_df.loc[idx_to_update, "status"] = "open"
    cash_records_df.loc[idx_to_update, "counted_cash_physical"] = None # O pd.NA
    cash_records_df.loc[idx_to_update, "difference"] = None          # O pd.NA
    # cash_to_consign se recalculará, así que se puede limpiar.
    # profit_of_the_day también.
    # notes se podría mantener o limpiar. Por ahora, lo limpiamos para que el usuario reingrese si es necesario.
    # cash_records_df.loc[idx_to_update, "notes"] = None               # O pd.NA (o mantenerlo)
    cash_records_df.loc[idx_to_update, "closed_by_user_id"] = None    # O pd.NA
    cash_records_df.loc[idx_to_update, "closed_by_username"] = None   # O pd.NA
    cash_records_df.loc[idx_to_update, "closing_time"] = None        # O pd.NaT

    # Los campos que dependen de los cálculos finales también se resetean,
    # ya que el usuario va a re-hacer el cierre.
    # El backend los recalculará de todas formas cuando se llame a /close de nuevo.
    # expected_cash_in_box, profit_of_the_day, cash_to_consign
    # Estos se recalculan en el frontend y luego en el backend al cerrar de nuevo.

    save_df(cash_records_df.drop(columns=['date_obj', 'sale_date_obj', 'closing_time_dt'], errors='ignore'), CASH_RECORDS_FILE)
    
    reopened_record_dict = cash_records_df.loc[idx_to_update].to_dict()
    reopened_record_dict = sanitize_record_dict(reopened_record_dict) # Es importante sanitizar
            
    print(f"--- Endpoint /reopen-latest-today: Cuadre ID {record_id_to_reopen} reabierto. ---")
    return CashRecordResponse(**reopened_record_dict)

@router.get("/", response_model=List[CashRecordResponse])
async def read_cash_records(
    skip: int = 0, limit: int = 100,
    start_date_filter: Optional[date] = Query(None, alias="start_date"),
    end_date_filter: Optional[date] = Query(None, alias="end_date"),
    status_filter: Optional[str] = Query(None, pattern="^(open|closed)$", alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    
    cash_records_df = load_df(CASH_RECORDS_FILE, columns=CASH_RECORDS_COLUMNS)
    if cash_records_df.empty: return []
    if 'date' not in cash_records_df.columns or cash_records_df['date'].isnull().all(): return []
    try:
        cash_records_df['date_obj'] = pd.to_datetime(cash_records_df['date'], errors='coerce').dt.date
        cash_records_df = cash_records_df.dropna(subset=['date_obj'])
    except Exception as e:
        print(f"Error al convertir la columna 'date' en GET /: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar fechas.")
    if start_date_filter:
        cash_records_df = cash_records_df[cash_records_df["date_obj"] >= start_date_filter]
    if end_date_filter:
        cash_records_df = cash_records_df[cash_records_df["date_obj"] <= end_date_filter]
    if status_filter:
        cash_records_df = cash_records_df[cash_records_df["status"] == status_filter]
    cash_records_df = cash_records_df.sort_values(by="date_obj", ascending=False)
    results = []
    for _, row in cash_records_df.iloc[skip : skip + limit].iterrows():
        row_dict = row.to_dict()
        row_dict = sanitize_record_dict(row_dict)
        results.append(CashRecordResponse(**row_dict))
    return results