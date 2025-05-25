from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
import jwt
from datetime import datetime, timedelta
import pandas as pd
from pathlib import Path
import json 


from app.modules import customer_management, inventory_management,service_management
from app.modules import cash_balance, billing, reports,configuration

app = FastAPI(
    title="Sistema de Inventario de Tienda de Maquillaje",
    description="API para gestionar el inventario, ventas y cuadre de caja de una tienda de maquillaje.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)


SECRET_KEY = configuration.SECRET_KEY
ALGORITHM = configuration.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = configuration.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/")
def root():
    return {"message": "¡Bienvenido al sistema de gestión de la tienda de maquillaje!"}


@app.on_event("startup")
async def startup_db_client():
    csv_files = {
        "users.csv": ["id", "username", "hashed_password", "full_name", "email", "role", "is_active"],
        "customers.csv": ["id", "document_type", "document_number", "full_name", "phone", "email", "address", "is_active"],
        "inventory.csv": ["id", "code", "description", "brand", "quantity", "cost_value", "sale_value", "date_added", "last_updated", "is_active", "category", "low_stock_alert_sent", "created_by_user_id", "updated_by_user_id"],
        "inventory_history.csv": ["id", "product_id", "product_code", "quantity_changed", "new_quantity", "movement_type", "notes", "user_id", "date"],
        "services.csv": ["id", "code", "description", "value", "created_by_user_id", "date_created", "last_updated_by_user_id", "last_updated_date", "is_active"],
        "service_price_history.csv": ["id", "service_id", "service_code", "old_value", "new_value", "changed_by_user_id", "change_date"],
        "customer_history.csv": ["id", "customer_id", "action", "details", "user_id", "date"],
        "sales.csv": [ "id", "invoice_number", "date", "customer_id", "customer_name", "customer_document",
        "subtotal", "discount_value", "discount_percentage", "iva_applied", "iva_percentage_used", "total_amount",
        "payment_method", "created_by_user_id", "created_by_username", "items", "status",
        "cancellation_reason", "cancelled_by_user_id", "cancellation_date" ],
        "cash_records.csv": ["id", "date", "opened_by_user_id", "opened_by_username", "initial_balance", "cash_sales", "card_sales", "transfer_sales", "total_income_calculated","expenses_details", "total_expenses_recorded", "profit_of_the_day", "expected_cash_in_box",  "counted_cash_physical", "difference", 
        "cash_to_consign", "notes", "closed_by_user_id", "closed_by_username", "closing_time", "status"]
    }
    
    for file, columns in csv_files.items():
        file_path = data_dir / file
        if not file_path.exists():
            pd.DataFrame(columns=columns).to_csv(file_path, index=False)

    # Crear config.json si no existe
    config_file_path = data_dir / "config.json"
    if not config_file_path.exists():
        default_config = {
            "store_name": "Mi Tienda de Maquillaje",
            "contact_number": "000-000-0000",
            "address": "Calle Falsa 123",
            "invoice_footer": "¡Gracias por su compra!",
            "invoice_prefix": "INV-",
            "next_invoice_number": 1,
            "initial_cash_balance": 50000.0, # Base de caja
            "apply_iva_by_default": False,
            "iva_percentage": 19.0,
            "low_stock_threshold": 5 # Para alertas de inventario
        }
        with open(config_file_path, 'w') as f:
            json.dump(default_config, f, indent=4)
    
    # Crear usuario administrador por defecto si no existe y no hay archivo de configuración
    users_path = data_dir / "users.csv"
    if users_path.exists():
        try:
            users_df = pd.read_csv(users_path)
            if users_df.empty:
                configuration.create_default_admin() # Llama a la función de configuration.py
        except pd.errors.EmptyDataError:
            configuration.create_default_admin()
    else:
        # Si el archivo no existe, create_default_admin lo creará
        configuration.create_default_admin()


# Incluir routers de cada módulo
app.include_router(configuration.router, prefix="/config", tags=["⚙️ Configuration & Users"])
app.include_router(customer_management.router, prefix="/customers", tags=["👥 Customers"])
app.include_router(inventory_management.router, prefix="/inventory", tags=["📦 Inventory"])
app.include_router(service_management.router, prefix="/services", tags=["🔖 Services"])
app.include_router(billing.router, prefix="/billing", tags=["🧾 Billing"])
app.include_router(cash_balance.router, prefix="/cash-balance", tags=["💰 Cash Balance"])
app.include_router(reports.router, prefix="/reports", tags=["📊 Reports"])

# Autenticación y generación de tokens
@app.post("/token", response_model=configuration.Token, tags=["🔑 Authentication"]) # Usa el modelo Token de configuration.py
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = configuration.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = configuration.create_access_token(
        data={"sub": user["username"], "role": user["role"], "user_id": user["id"]}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"], "username": user["username"], "user_id": user["id"]}


if __name__ == "__main__":
    import uvicorn
    # Para ejecutar: uvicorn app.main:app --reload
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 