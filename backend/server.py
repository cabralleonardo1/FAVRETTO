from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import pandas as pd
import io
import csv
import re
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Sistema de Orçamentos Favretto", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "favretto-secret-key-2024")

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

class BudgetType(str, Enum):
    REMOCAO = "REMOÇÃO"
    IMPLANTACAO_AUTOMIDIA = "IMPLANTAÇÃO AUTOMIDIA"
    TROCA = "TROCA"
    PLOTAGEM_ADESIVO = "PLOTAGEM ADESIVO"
    SIDER_UV = "SIDER E UV"

class BudgetStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class CommissionStatus(str, Enum):
    PENDING = "PENDING"
    CALCULATED = "CALCULATED"
    PAID = "PAID"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    role: UserRole
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_name: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    observations: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    contact_name: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    observations: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    observations: Optional[str] = None

class Seller(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    commission_percentage: float = Field(default=0.0, ge=0, le=100)
    active: bool = True
    registration_number: Optional[str] = None
    observations: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SellerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    commission_percentage: float = Field(default=5.0, ge=0, le=100)
    registration_number: Optional[str] = None
    observations: Optional[str] = None

class SellerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    commission_percentage: Optional[float] = Field(None, ge=0, le=100)
    registration_number: Optional[str] = None
    observations: Optional[str] = None

class PriceTableItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    unit: str
    unit_price: float
    category: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PriceTableItemCreate(BaseModel):
    code: str
    name: str
    unit: str
    unit_price: float
    category: str

class PriceTableItemUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    category: Optional[str] = None

class CanvasColor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    hex_code: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CanvasColorCreate(BaseModel):
    name: str
    hex_code: Optional[str] = None

class CanvasColorUpdate(BaseModel):
    name: Optional[str] = None
    hex_code: Optional[str] = None

class BudgetItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    unit_price: float
    length: Optional[float] = None
    height: Optional[float] = None
    width: Optional[float] = None
    area_m2: Optional[float] = None
    canvas_color: Optional[str] = None
    print_percentage: Optional[float] = None
    item_discount_percentage: Optional[float] = Field(default=0.0, ge=0, le=100)
    subtotal: float
    final_price: Optional[float] = None

class Budget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    budget_type: BudgetType
    items: List[BudgetItem]
    installation_location: Optional[str] = None
    travel_distance_km: Optional[float] = None
    observations: Optional[str] = None
    subtotal: float
    discount_percentage: float = 0.0
    discount_amount: float = 0.0
    discount_type: str = "percentage"  # "percentage" or "fixed"
    total: float
    validity_days: int = 30
    status: BudgetStatus = BudgetStatus.DRAFT
    version: int = 1
    original_budget_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class BudgetCreate(BaseModel):
    client_id: str
    seller_id: Optional[str] = None
    budget_type: BudgetType
    items: List[BudgetItem]
    installation_location: Optional[str] = None
    travel_distance_km: Optional[float] = None
    observations: Optional[str] = None
    discount_percentage: float = 0.0
    discount_type: str = "percentage"  # "percentage" or "fixed"

class BudgetUpdate(BaseModel):
    client_id: Optional[str] = None
    seller_id: Optional[str] = None
    budget_type: Optional[BudgetType] = None
    items: Optional[List[BudgetItem]] = None
    installation_location: Optional[str] = None
    travel_distance_km: Optional[float] = None
    observations: Optional[str] = None
    discount_percentage: Optional[float] = None
    discount_type: Optional[str] = None  # "percentage" or "fixed"
    status: Optional[BudgetStatus] = None

class Commission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    budget_id: str
    seller_id: str
    seller_name: str
    budget_total: float
    commission_percentage: float
    commission_amount: float
    status: CommissionStatus = CommissionStatus.PENDING
    payment_date: Optional[datetime] = None
    observations: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionCreate(BaseModel):
    budget_id: str
    seller_id: str
    commission_percentage: Optional[float] = None
    observations: Optional[str] = None

class CommissionUpdate(BaseModel):
    commission_percentage: Optional[float] = None
    status: Optional[CommissionStatus] = None
    payment_date: Optional[datetime] = None
    observations: Optional[str] = None

class ImportResult(BaseModel):
    success: bool
    total_processed: int
    imported_count: int
    errors: List[dict]
    warnings: List[dict]

class ExportConfig(BaseModel):
    fields: List[str] = ["name", "contact_name", "phone", "email", "address", "city", "state", "zip_code"]
    include_dates: bool = True
    date_format: str = "%d/%m/%Y"

class BulkDeleteRequest(BaseModel):
    client_ids: List[str]
    force_delete: bool = False  # Force delete even with dependencies

class BulkDeleteResult(BaseModel):
    success: bool
    total_requested: int
    deleted_count: int
    skipped_count: int
    errors: List[dict]
    warnings: List[dict]
    dependencies_found: List[dict]

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    resource_type: str
    resource_ids: List[str]
    details: dict
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    budget_id: str
    changes: Dict[str, Any]
    changed_by: str
    change_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict(exclude={"password"})
    user_obj = User(**user_dict)
    
    await db.users.insert_one({**user_obj.dict(), "password": hashed_password})
    return {"message": "User created successfully"}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("active", True):
        raise HTTPException(status_code=401, detail="User is inactive")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer", "user": User(**user)}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Client routes
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    # Check for duplicate by name and phone
    existing_client = await db.clients.find_one({
        "$or": [
            {"name": client_data.name},
            {"phone": client_data.phone}
        ]
    })
    if existing_client:
        raise HTTPException(status_code=400, detail="Cliente já existe com este nome ou telefone")
    
    client_obj = Client(**client_data.dict())
    await db.clients.insert_one(client_obj.dict())
    return client_obj

@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    clients = await db.clients.find().to_list(1000)
    return [Client(**client) for client in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in client_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Check for duplicates if name or phone is being updated
    if "name" in update_data or "phone" in update_data:
        query_conditions = []
        if "name" in update_data:
            query_conditions.append({"name": update_data["name"]})
        if "phone" in update_data:
            query_conditions.append({"phone": update_data["phone"]})
        
        existing_client = await db.clients.find_one({
            "$or": query_conditions,
            "id": {"$ne": client_id}  # Exclude current client
        })
        if existing_client:
            raise HTTPException(status_code=400, detail="Cliente já existe com este nome ou telefone")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updated_client = await db.clients.find_one({"id": client_id})
    return Client(**updated_client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# Seller routes
@api_router.post("/sellers", response_model=Seller)
async def create_seller(seller_data: SellerCreate, current_user: User = Depends(get_current_user)):
    # Check for duplicate by name or registration number
    existing_seller = await db.sellers.find_one({
        "$or": [
            {"name": seller_data.name},
            {"registration_number": seller_data.registration_number} if seller_data.registration_number else {"name": seller_data.name}
        ]
    })
    if existing_seller:
        raise HTTPException(status_code=400, detail="Vendedor já existe com este nome ou registro")
    
    seller_obj = Seller(**seller_data.dict())
    await db.sellers.insert_one(seller_obj.dict())
    return seller_obj

@api_router.get("/sellers", response_model=List[Seller])
async def get_sellers(current_user: User = Depends(get_current_user)):
    sellers = await db.sellers.find({"active": True}).to_list(1000)
    return [Seller(**seller) for seller in sellers]

@api_router.get("/sellers/{seller_id}", response_model=Seller)
async def get_seller(seller_id: str, current_user: User = Depends(get_current_user)):
    seller = await db.sellers.find_one({"id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return Seller(**seller)

@api_router.put("/sellers/{seller_id}", response_model=Seller)
async def update_seller(seller_id: str, seller_data: SellerUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in seller_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Check for duplicates if name or registration number is being updated
    if "name" in update_data or "registration_number" in update_data:
        query_conditions = []
        if "name" in update_data:
            query_conditions.append({"name": update_data["name"]})
        if "registration_number" in update_data and update_data["registration_number"]:
            query_conditions.append({"registration_number": update_data["registration_number"]})
        
        if query_conditions:
            existing_seller = await db.sellers.find_one({
                "$or": query_conditions,
                "id": {"$ne": seller_id}  # Exclude current seller
            })
            if existing_seller:
                raise HTTPException(status_code=400, detail="Vendedor já existe com este nome ou registro")
    
    result = await db.sellers.update_one({"id": seller_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    updated_seller = await db.sellers.find_one({"id": seller_id})
    return Seller(**updated_seller)

@api_router.delete("/sellers/{seller_id}")
async def delete_seller(seller_id: str, current_user: User = Depends(get_current_user)):
    # Soft delete - mark as inactive
    result = await db.sellers.update_one(
        {"id": seller_id}, 
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    return {"message": "Seller deleted successfully"}

# Canvas Color routes
@api_router.post("/canvas-colors", response_model=CanvasColor)
async def create_canvas_color(color_data: CanvasColorCreate, current_user: User = Depends(get_current_user)):
    # Check for duplicate name
    existing_color = await db.canvas_colors.find_one({"name": color_data.name.upper(), "active": True})
    if existing_color:
        raise HTTPException(status_code=400, detail="Cor já existe")
    
    color_dict = color_data.dict()
    color_dict["name"] = color_dict["name"].upper()  # Store colors in uppercase
    color_obj = CanvasColor(**color_dict)
    await db.canvas_colors.insert_one(color_obj.dict())
    return color_obj

@api_router.get("/canvas-colors", response_model=List[CanvasColor])
async def get_canvas_colors(current_user: User = Depends(get_current_user)):
    colors = await db.canvas_colors.find({"active": True}).to_list(1000)
    return [CanvasColor(**color) for color in colors]

@api_router.put("/canvas-colors/{color_id}", response_model=CanvasColor)
async def update_canvas_color(color_id: str, color_data: CanvasColorUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in color_data.dict().items() if v is not None}
    if "name" in update_data:
        update_data["name"] = update_data["name"].upper()
        # Check for duplicate name
        existing_color = await db.canvas_colors.find_one({
            "name": update_data["name"],
            "active": True,
            "id": {"$ne": color_id}
        })
        if existing_color:
            raise HTTPException(status_code=400, detail="Cor já existe")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.canvas_colors.update_one({"id": color_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Color not found")
    
    updated_color = await db.canvas_colors.find_one({"id": color_id})
    return CanvasColor(**updated_color)

@api_router.delete("/canvas-colors/{color_id}")
async def delete_canvas_color(color_id: str, current_user: User = Depends(get_current_user)):
    # Soft delete
    result = await db.canvas_colors.update_one(
        {"id": color_id}, 
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Color not found")
    return {"message": "Color deleted successfully"}

# Initialize default canvas colors
@api_router.post("/canvas-colors/initialize")
async def initialize_default_colors(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can initialize colors")
    
    default_colors = [
        {"name": "BRANCA", "hex_code": "#FFFFFF"},
        {"name": "PRETA", "hex_code": "#000000"},
        {"name": "AZUL", "hex_code": "#0066CC"},
        {"name": "VERDE", "hex_code": "#00CC00"},
        {"name": "AMARELA", "hex_code": "#FFCC00"},
        {"name": "VERMELHA", "hex_code": "#CC0000"}
    ]
    
    created_count = 0
    for color_data in default_colors:
        existing = await db.canvas_colors.find_one({"name": color_data["name"], "active": True})
        if not existing:
            color_obj = CanvasColor(**color_data)
            await db.canvas_colors.insert_one(color_obj.dict())
            created_count += 1
    
    return {"message": f"Initialized {created_count} default colors"}

# Price table routes
@api_router.post("/price-table", response_model=PriceTableItem)
async def create_price_item(item_data: PriceTableItemCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can modify price table")
    
    # Check if code already exists
    existing_item = await db.price_table.find_one({"code": item_data.code, "active": True})
    if existing_item:
        raise HTTPException(status_code=400, detail="Item with this code already exists")
    
    item_obj = PriceTableItem(**item_data.dict())
    await db.price_table.insert_one(item_obj.dict())
    return item_obj

@api_router.get("/price-table", response_model=List[PriceTableItem])
async def get_price_table(current_user: User = Depends(get_current_user)):
    items = await db.price_table.find({"active": True}).to_list(1000)
    return [PriceTableItem(**item) for item in items]

@api_router.get("/price-table/categories")
async def get_price_categories(current_user: User = Depends(get_current_user)):
    categories = await db.price_table.distinct("category", {"active": True})
    return {"categories": categories}

@api_router.put("/price-table/{item_id}", response_model=PriceTableItem)
async def update_price_item(item_id: str, item_data: PriceTableItemUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can modify price table")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Check if code already exists (if updating code)
    if "code" in update_data:
        existing_item = await db.price_table.find_one({"code": update_data["code"], "active": True, "id": {"$ne": item_id}})
        if existing_item:
            raise HTTPException(status_code=400, detail="Item with this code already exists")
    
    result = await db.price_table.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Price item not found")
    
    updated_item = await db.price_table.find_one({"id": item_id})
    return PriceTableItem(**updated_item)

@api_router.delete("/price-table/{item_id}")
async def delete_price_item(item_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can modify price table")
    
    # Soft delete - mark as inactive
    result = await db.price_table.update_one({"id": item_id}, {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Price item not found")
    return {"message": "Price item deleted successfully"}

# Budget routes
@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, current_user: User = Depends(get_current_user)):
    # Get client info
    client = await db.clients.find_one({"id": budget_data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get seller info if provided
    seller_name = None
    if budget_data.seller_id:
        seller = await db.sellers.find_one({"id": budget_data.seller_id})
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        seller_name = seller["name"]
    
    # Calculate totals
    subtotal = sum(item.final_price or item.subtotal for item in budget_data.items)
    
    # Calculate discount based on type
    if budget_data.discount_type == "fixed":
        discount_amount = budget_data.discount_percentage  # When type is "fixed", discount_percentage contains the fixed amount
    else:  # percentage
        discount_amount = subtotal * (budget_data.discount_percentage / 100)
    
    total = subtotal - discount_amount
    
    budget_dict = budget_data.dict()
    budget_dict.update({
        "client_name": client["name"],
        "seller_name": seller_name,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "total": total,
        "created_by": current_user.username
    })
    
    budget_obj = Budget(**budget_dict)
    await db.budgets.insert_one(budget_obj.dict())
    
    # Create history entry
    history_entry = BudgetHistory(
        budget_id=budget_obj.id,
        changes={"action": "created", "budget": budget_obj.dict()},
        changed_by=current_user.username,
        change_reason="Budget created"
    )
    await db.budget_history.insert_one(history_entry.dict())
    
    # Create commission if seller is assigned and budget is approved
    if budget_obj.seller_id and budget_obj.status == BudgetStatus.APPROVED:
        await create_commission_for_budget(budget_obj, current_user.username)
    
    return budget_obj

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(
    current_user: User = Depends(get_current_user),
    client_id: Optional[str] = None,
    seller_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    # Build query filters
    query = {}
    
    if client_id:
        query["client_id"] = client_id
    
    if seller_id:
        query["seller_id"] = seller_id
    
    if status and status != "all":
        query["status"] = status
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query["created_at"] = date_query
    
    budgets = await db.budgets.find(query).sort("created_at", -1).to_list(1000)
    return [Budget(**budget) for budget in budgets]

@api_router.get("/budgets/{budget_id}", response_model=Budget)
async def get_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    budget = await db.budgets.find_one({"id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Budget(**budget)

@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget_data: BudgetUpdate, current_user: User = Depends(get_current_user)):
    # Get existing budget
    existing_budget = await db.budgets.find_one({"id": budget_id})
    if not existing_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = {k: v for k, v in budget_data.dict().items() if v is not None}
    
    # If items are being updated, recalculate totals
    if "items" in update_data:
        subtotal = sum(item.get("final_price") or item.get("subtotal", 0) for item in update_data["items"])
        discount_percentage = update_data.get("discount_percentage", existing_budget.get("discount_percentage", 0))
        discount_type = update_data.get("discount_type", existing_budget.get("discount_type", "percentage"))
        
        # Calculate discount based on type
        if discount_type == "fixed":
            discount_amount = discount_percentage  # When type is "fixed", discount_percentage contains the fixed amount
        else:  # percentage
            discount_amount = subtotal * (discount_percentage / 100)
        
        total = subtotal - discount_amount
        
        update_data.update({
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "total": total
        })
    
    # If client is being updated, get client name
    if "client_id" in update_data:
        client = await db.clients.find_one({"id": update_data["client_id"]})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        update_data["client_name"] = client["name"]
    
    # If seller is being updated, get seller name
    if "seller_id" in update_data:
        if update_data["seller_id"]:
            seller = await db.sellers.find_one({"id": update_data["seller_id"]})
            if not seller:
                raise HTTPException(status_code=404, detail="Seller not found")
            update_data["seller_name"] = seller["name"]
        else:
            update_data["seller_name"] = None
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["version"] = existing_budget.get("version", 1) + 1
    
    result = await db.budgets.update_one({"id": budget_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Create history entry
    history_entry = BudgetHistory(
        budget_id=budget_id,
        changes={"action": "updated", "changes": update_data},
        changed_by=current_user.username,
        change_reason="Budget updated"
    )
    await db.budget_history.insert_one(history_entry.dict())
    
    updated_budget = await db.budgets.find_one({"id": budget_id})
    budget_obj = Budget(**updated_budget)
    
    # Update or create commission if status changed to approved and seller is assigned
    if (update_data.get("status") == BudgetStatus.APPROVED and 
        budget_obj.seller_id and 
        existing_budget.get("status") != BudgetStatus.APPROVED):
        await create_commission_for_budget(budget_obj, current_user.username)
    
    return budget_obj

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    # Check if budget exists
    existing_budget = await db.budgets.find_one({"id": budget_id})
    if not existing_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Delete associated commissions first
    await db.commissions.delete_many({"budget_id": budget_id})
    
    # Delete budget history
    await db.budget_history.delete_many({"budget_id": budget_id})
    
    # Delete the budget
    result = await db.budgets.delete_one({"id": budget_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Create history entry for deletion
    history_entry = BudgetHistory(
        budget_id=budget_id,
        changes={"action": "deleted", "budget": existing_budget},
        changed_by=current_user.username,
        change_reason="Budget deleted"
    )
    await db.budget_history.insert_one(history_entry.dict())
    
    return {"message": "Budget deleted successfully"}

@api_router.post("/budgets/{budget_id}/duplicate", response_model=Budget)
async def duplicate_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    # Get original budget
    original_budget = await db.budgets.find_one({"id": budget_id})
    if not original_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Create new budget based on original
    new_budget_dict = original_budget.copy()
    new_budget_dict.pop("_id", None)  # Remove MongoDB _id
    new_budget_dict["id"] = str(uuid.uuid4())
    new_budget_dict["status"] = BudgetStatus.DRAFT
    new_budget_dict["version"] = 1
    new_budget_dict["original_budget_id"] = budget_id
    new_budget_dict["created_at"] = datetime.now(timezone.utc)
    new_budget_dict["updated_at"] = datetime.now(timezone.utc)
    new_budget_dict["created_by"] = current_user.username
    
    new_budget_obj = Budget(**new_budget_dict)
    await db.budgets.insert_one(new_budget_obj.dict())
    
    # Create history entry
    history_entry = BudgetHistory(
        budget_id=new_budget_obj.id,
        changes={"action": "duplicated_from", "original_budget_id": budget_id},
        changed_by=current_user.username,
        change_reason=f"Budget duplicated from {budget_id}"
    )
    await db.budget_history.insert_one(history_entry.dict())
    
    return new_budget_obj

@api_router.get("/budgets/{budget_id}/history", response_model=List[BudgetHistory])
async def get_budget_history(budget_id: str, current_user: User = Depends(get_current_user)):
    history = await db.budget_history.find({"budget_id": budget_id}).sort("created_at", -1).to_list(1000)
    return [BudgetHistory(**entry) for entry in history]

# Endpoint to update budget status
@api_router.patch("/budgets/{budget_id}/status")
async def update_budget_status(
    budget_id: str, 
    status_data: dict, 
    current_user: User = Depends(get_current_user)
):
    try:
        new_status = status_data.get("status")
        if new_status not in ["DRAFT", "SENT", "APPROVED", "REJECTED"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        # Update budget status
        result = await db.budgets.update_one(
            {"id": budget_id}, 
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        # Get updated budget
        updated_budget = await db.budgets.find_one({"id": budget_id})
        if not updated_budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        return {"message": "Status updated successfully", "budget": Budget(**updated_budget)}
    
    except Exception as e:
        print(f"Error updating budget status: {e}")
        raise HTTPException(status_code=500, detail="Error updating budget status")

# CSV Import/Export endpoints
@api_router.post("/clients/import", response_model=ImportResult)
async def import_clients_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Import clients from CSV file"""
    try:
        # Validate file type and size
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Apenas arquivos CSV são permitidos")
        
        # Read file content
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Arquivo muito grande. Limite máximo: 10MB")
        
        # Parse CSV
        try:
            csv_content = content.decode('utf-8-sig')  # Handle BOM
        except UnicodeDecodeError:
            try:
                csv_content = content.decode('latin1')
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="Encoding do arquivo não suportado. Use UTF-8 ou Latin1")
        
        # Read CSV data
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        # Expected CSV columns mapping
        column_mapping = {
            'nome': 'name',
            'name': 'name',
            'contato': 'contact_name',
            'contact_name': 'contact_name',
            'telefone': 'phone',
            'phone': 'phone',
            'email': 'email',
            'endereco': 'address',
            'address': 'address',
            'cidade': 'city',
            'city': 'city',
            'estado': 'state',
            'state': 'state',
            'cep': 'zip_code',
            'zip_code': 'zip_code'
        }
        
        # Process rows
        errors = []
        warnings = []
        imported_count = 0
        total_processed = 0
        
        for row_number, row in enumerate(csv_reader, start=2):  # Start at 2 because line 1 is header
            total_processed += 1
            
            if total_processed > 1000:  # Limit to 1000 records per import
                warnings.append({
                    'message': f'Limite de 1000 registros atingido. Apenas os primeiros 1000 foram processados.'
                })
                break
            
            # Map CSV columns to system fields
            mapped_row = {}
            for csv_col, value in row.items():
                system_field = column_mapping.get(csv_col.lower().strip())
                if system_field:
                    mapped_row[system_field] = value
            
            # Validate data
            clean_data, row_errors = validate_client_data(mapped_row, row_number)
            
            if row_errors:
                errors.extend(row_errors)
                continue
            
            # Check for duplicates
            existing_client = await db.clients.find_one({"name": clean_data["name"]})
            if existing_client:
                warnings.append({
                    'row': row_number,
                    'message': f'Cliente "{clean_data["name"]}" já existe e foi ignorado'
                })
                continue
            
            # Create client
            try:
                client_data = ClientCreate(**clean_data)
                client_dict = client_data.dict()
                client_dict["created_at"] = datetime.now(timezone.utc).isoformat()
                client_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
                
                await db.clients.insert_one(client_dict)
                imported_count += 1
                
            except Exception as e:
                errors.append({
                    'row': row_number,
                    'message': f'Erro ao criar cliente: {str(e)}'
                })
        
        success = len(errors) == 0 or imported_count > 0
        
        return ImportResult(
            success=success,
            total_processed=total_processed,
            imported_count=imported_count,
            errors=errors,
            warnings=warnings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error importing CSV: {e}")
        raise HTTPException(status_code=500, detail="Erro interno durante importação")

@api_router.post("/clients/export")
async def export_clients_csv(
    config: ExportConfig,
    current_user: User = Depends(get_current_user)
):
    """Export clients to CSV file"""
    try:
        # Get all clients
        clients = await db.clients.find().to_list(length=None)
        
        if not clients:
            raise HTTPException(status_code=404, detail="Nenhum cliente encontrado para exportar")
        
        # Prepare CSV data
        output = io.StringIO()
        
        # Column headers mapping
        headers_mapping = {
            'name': 'Nome',
            'contact_name': 'Contato',
            'phone': 'Telefone',
            'email': 'Email',
            'address': 'Endereço',
            'city': 'Cidade',
            'state': 'Estado',
            'zip_code': 'CEP',
            'created_at': 'Data Criação',
            'updated_at': 'Data Atualização'
        }
        
        # Get headers for selected fields
        headers = [headers_mapping.get(field, field) for field in config.fields]
        if config.include_dates:
            headers.extend(['Data Criação', 'Data Atualização'])
        
        writer = csv.writer(output)
        writer.writerow(headers)
        
        # Write data rows
        for client in clients:
            formatted_client = format_client_for_export(client, config)
            
            row_data = [formatted_client.get(field, '') for field in config.fields]
            
            if config.include_dates:
                created_at = client.get('created_at', '')
                updated_at = client.get('updated_at', '')
                
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime(config.date_format)
                    except:
                        created_at = ''
                
                if isinstance(updated_at, str):
                    try:
                        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00')).strftime(config.date_format)
                    except:
                        updated_at = ''
                
                row_data.extend([created_at, updated_at])
            
            writer.writerow(row_data)
        
        # Prepare response
        output.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"clientes_export_{timestamp}.csv"
        
        # Create streaming response
        def generate():
            yield output.getvalue().encode('utf-8-sig')  # Include BOM for Excel compatibility
        
        return StreamingResponse(
            generate(),
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        raise HTTPException(status_code=500, detail="Erro interno durante exportação")

@api_router.post("/clients/bulk-delete", response_model=BulkDeleteResult)
async def bulk_delete_clients(
    request: BulkDeleteRequest,
    current_user: User = Depends(get_current_user)
):
    """Bulk delete clients with dependency checking and audit logging"""
    try:
        # Only admin users can bulk delete
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=403, 
                detail="Apenas administradores podem excluir clientes em massa"
            )
        
        if not request.client_ids:
            raise HTTPException(status_code=400, detail="Nenhum cliente selecionado")
        
        if len(request.client_ids) > 100:  # Limit bulk operations
            raise HTTPException(
                status_code=400, 
                detail="Máximo de 100 clientes por operação"
            )
        
        result = BulkDeleteResult(
            success=False,
            total_requested=len(request.client_ids),
            deleted_count=0,
            skipped_count=0,
            errors=[],
            warnings=[],
            dependencies_found=[]
        )
        
        # Process each client
        successfully_deleted = []
        
        for client_id in request.client_ids:
            try:
                # Get client info for logging
                client = await db.clients.find_one({"id": client_id})
                if not client:
                    result.errors.append({
                        'client_id': client_id,
                        'message': 'Cliente não encontrado'
                    })
                    result.skipped_count += 1
                    continue
                
                # Attempt deletion with dependency check
                delete_result = await safe_delete_client_with_dependencies(
                    client_id, 
                    request.force_delete
                )
                
                if delete_result['success']:
                    result.deleted_count += 1
                    successfully_deleted.append({
                        'client_id': client_id,
                        'client_name': client.get('name', 'Unknown'),
                        'budgets_deleted': delete_result['budgets_deleted']
                    })
                    
                    # Log successful deletion
                    await log_audit_action(
                        user=current_user,
                        action="BULK_DELETE_CLIENT",
                        resource_type="client",
                        resource_ids=[client_id],
                        details={
                            'client_name': client.get('name'),
                            'force_delete': request.force_delete,
                            'budgets_deleted': delete_result['budgets_deleted'],
                            'dependencies': delete_result['dependencies']
                        }
                    )
                else:
                    result.skipped_count += 1
                    
                    # Check if it's a dependency issue
                    dependencies = delete_result['dependencies']
                    if dependencies.get('has_dependencies') and not request.force_delete:
                        result.dependencies_found.append({
                            'client_id': client_id,
                            'client_name': client.get('name'),
                            'budgets': dependencies['budgets'],
                            'approved_budgets': dependencies['approved_budgets'],
                            'pending_budgets': dependencies['pending_budgets'],
                            'total_value': dependencies['total_budget_value'],
                            'details': dependencies['details']
                        })
                        
                        result.warnings.append({
                            'client_id': client_id,
                            'client_name': client.get('name'),
                            'message': f"Cliente possui dependências: {', '.join(dependencies['details'])}"
                        })
                    else:
                        result.errors.append({
                            'client_id': client_id,
                            'client_name': client.get('name'),
                            'message': delete_result['error']
                        })
                        
            except Exception as e:
                result.errors.append({
                    'client_id': client_id,
                    'message': f'Erro interno: {str(e)}'
                })
                result.skipped_count += 1
        
        # Log bulk operation summary
        await log_audit_action(
            user=current_user,
            action="BULK_DELETE_CLIENTS_SUMMARY",
            resource_type="bulk_operation",
            resource_ids=request.client_ids,
            details={
                'total_requested': result.total_requested,
                'deleted_count': result.deleted_count,
                'skipped_count': result.skipped_count,
                'force_delete': request.force_delete,
                'successfully_deleted': successfully_deleted
            }
        )
        
        result.success = result.deleted_count > 0
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in bulk delete: {e}")
        raise HTTPException(status_code=500, detail="Erro interno durante exclusão em massa")

@api_router.post("/clients/check-dependencies")
async def check_clients_dependencies(
    client_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Check dependencies for multiple clients before deletion"""
    try:
        if current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Acesso negado")
        
        dependencies_summary = {
            'total_clients': len(client_ids),
            'clients_with_dependencies': 0,
            'total_budgets': 0,
            'total_approved_budgets': 0,
            'total_budget_value': 0.0,
            'details': []
        }
        
        for client_id in client_ids:
            client = await db.clients.find_one({"id": client_id})
            if not client:
                continue
                
            dependencies = await check_client_dependencies(client_id)
            
            if dependencies['has_dependencies']:
                dependencies_summary['clients_with_dependencies'] += 1
                dependencies_summary['total_budgets'] += dependencies['budgets']
                dependencies_summary['total_approved_budgets'] += dependencies['approved_budgets']
                dependencies_summary['total_budget_value'] += dependencies['total_budget_value']
                
                dependencies_summary['details'].append({
                    'client_id': client_id,
                    'client_name': client.get('name'),
                    'budgets': dependencies['budgets'],
                    'approved_budgets': dependencies['approved_budgets'],
                    'pending_budgets': dependencies['pending_budgets'],
                    'total_value': dependencies['total_budget_value'],
                    'messages': dependencies['details']
                })
        
        return dependencies_summary
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking dependencies: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar dependências")

# Endpoint for budget statistics
@api_router.get("/statistics/budgets")
async def get_budget_statistics(current_user: User = Depends(get_current_user)):
    try:
        from datetime import datetime, timezone
        import calendar
        
        # Get current month start and end
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        next_month = month_start.replace(day=28) + timedelta(days=4)
        month_end = next_month.replace(day=1) - timedelta(seconds=1)
        
        # Get all budgets
        all_budgets = await db.budgets.find().to_list(length=None)
        
        # Calculate overall approval rate
        total_sent = len([b for b in all_budgets if b.get("status") in ["SENT", "APPROVED", "REJECTED"]])
        total_approved = len([b for b in all_budgets if b.get("status") == "APPROVED"])
        
        approval_rate = (total_approved / total_sent * 100) if total_sent > 0 else 0
        
        # Calculate monthly revenue (only approved budgets in current month)
        monthly_revenue = 0.0
        approved_this_month = 0
        
        for budget in all_budgets:
            budget_date = budget.get("created_at")
            if isinstance(budget_date, str):
                try:
                    budget_date = datetime.fromisoformat(budget_date.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    continue
            elif not isinstance(budget_date, datetime):
                continue
                
            # Check if budget is approved and within current month
            if (budget.get("status") == "APPROVED" and 
                month_start <= budget_date <= month_end):
                monthly_revenue += budget.get("total", 0)
                approved_this_month += 1
        
        # Additional statistics
        stats = {
            "total_budgets": len(all_budgets),
            "draft_budgets": len([b for b in all_budgets if b.get("status") == "DRAFT"]),
            "sent_budgets": len([b for b in all_budgets if b.get("status") == "SENT"]),
            "approved_budgets": total_approved,
            "rejected_budgets": len([b for b in all_budgets if b.get("status") == "REJECTED"]),
            "approval_rate": round(approval_rate, 2),
            "monthly_revenue": round(monthly_revenue, 2),
            "approved_this_month": approved_this_month,
            "current_month": now.strftime("%B %Y"),
            "last_updated": now.isoformat()
        }
        
        return stats
        
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        raise HTTPException(status_code=500, detail="Error calculating budget statistics")

# CSV Import/Export Helper Functions
def sanitize_csv_data(data: str) -> str:
    """Sanitize CSV data to prevent injection attacks"""
    if not data or not isinstance(data, str):
        return ""
    
    # Remove potentially dangerous characters and formulas
    dangerous_chars = ['=', '+', '-', '@', '\t', '\r']
    for char in dangerous_chars:
        if data.startswith(char):
            data = "'" + data  # Prefix with single quote to neutralize formula
    
    # Clean up the string
    data = data.strip()
    return data

def validate_client_data(row_data: dict, row_number: int) -> tuple[dict, list]:
    """Validate client data and return clean data + errors"""
    errors = []
    clean_data = {}
    
    # Required fields validation
    required_fields = ['name']
    for field in required_fields:
        if not row_data.get(field, '').strip():
            errors.append({
                'row': row_number,
                'field': field,
                'message': f'Campo obrigatório "{field}" está vazio'
            })
            continue
        clean_data[field] = sanitize_csv_data(row_data[field])
    
    # Optional fields with validation
    optional_fields = {
        'contact_name': str,
        'phone': str,
        'email': str,
        'address': str,
        'city': str,
        'state': str,
        'zip_code': str
    }
    
    for field, field_type in optional_fields.items():
        value = row_data.get(field, '').strip()
        if value:
            if field == 'email' and value:
                # Basic email validation
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, value):
                    errors.append({
                        'row': row_number,
                        'field': field,
                        'message': 'Formato de email inválido'
                    })
                    continue
            
            clean_data[field] = sanitize_csv_data(value)
        else:
            clean_data[field] = ""
    
    return clean_data, errors

def format_client_for_export(client: dict, config: ExportConfig) -> dict:
    """Format client data for CSV export"""
    formatted = {}
    
    for field in config.fields:
        if field in client:
            value = client[field]
            if value is None:
                formatted[field] = ""
            elif isinstance(value, datetime):
                if config.include_dates:
                    formatted[field] = value.strftime(config.date_format)
                else:
                    formatted[field] = ""
            else:
                formatted[field] = str(value)
        else:
            formatted[field] = ""
    
    return formatted

# Audit and Dependencies Helper Functions
async def log_audit_action(
    user: User, 
    action: str, 
    resource_type: str, 
    resource_ids: List[str], 
    details: dict,
    request = None
):
    """Log audit action to database"""
    try:
        audit_log = AuditLog(
            user_id=user.id,
            user_name=user.username,
            action=action,
            resource_type=resource_type,
            resource_ids=resource_ids,
            details=details,
            ip_address=getattr(request, 'client', {}).get('host') if request else None,
            user_agent=getattr(request, 'headers', {}).get('user-agent') if request else None
        )
        
        audit_dict = audit_log.dict()
        audit_dict["created_at"] = audit_log.created_at.isoformat()
        
        await db.audit_logs.insert_one(audit_dict)
        return True
    except Exception as e:
        print(f"Error logging audit action: {e}")
        return False

async def check_client_dependencies(client_id: str) -> dict:
    """Check if client has dependencies that prevent deletion"""
    dependencies = {
        'has_dependencies': False,
        'budgets': 0,
        'approved_budgets': 0,
        'pending_budgets': 0,
        'total_budget_value': 0.0,
        'details': []
    }
    
    try:
        # Check for budgets
        budgets = await db.budgets.find({"client_id": client_id}).to_list(length=None)
        dependencies['budgets'] = len(budgets)
        
        if budgets:
            dependencies['has_dependencies'] = True
            
            approved_budgets = [b for b in budgets if b.get('status') == 'APPROVED']
            pending_budgets = [b for b in budgets if b.get('status') in ['DRAFT', 'SENT']]
            
            dependencies['approved_budgets'] = len(approved_budgets)
            dependencies['pending_budgets'] = len(pending_budgets)
            dependencies['total_budget_value'] = sum(b.get('total', 0) for b in approved_budgets)
            
            # Add detail messages
            if approved_budgets:
                total_value = dependencies['total_budget_value']
                dependencies['details'].append(
                    f"{len(approved_budgets)} orçamentos aprovados (Total: R$ {total_value:,.2f})"
                )
            
            if pending_budgets:
                dependencies['details'].append(
                    f"{len(pending_budgets)} orçamentos pendentes"
                )
        
        return dependencies
        
    except Exception as e:
        print(f"Error checking dependencies for client {client_id}: {e}")
        return dependencies

async def safe_delete_client_with_dependencies(client_id: str, force_delete: bool = False) -> dict:
    """Safely delete client considering dependencies"""
    result = {
        'success': False,
        'client_deleted': False,
        'budgets_deleted': 0,
        'dependencies': {},
        'error': None
    }
    
    try:
        # Check dependencies first
        dependencies = await check_client_dependencies(client_id)
        result['dependencies'] = dependencies
        
        if dependencies['has_dependencies'] and not force_delete:
            result['error'] = f"Cliente possui {dependencies['budgets']} orçamentos associados"
            return result
        
        # If force delete, delete dependencies first
        if dependencies['has_dependencies'] and force_delete:
            # Delete all budgets for this client
            delete_result = await db.budgets.delete_many({"client_id": client_id})
            result['budgets_deleted'] = delete_result.deleted_count
        
        # Delete the client
        client_result = await db.clients.delete_one({"id": client_id})
        result['client_deleted'] = client_result.deleted_count > 0
        result['success'] = result['client_deleted']
        
        if not result['client_deleted']:
            result['error'] = "Cliente não encontrado"
        
        return result
        
    except Exception as e:
        result['error'] = f"Erro ao excluir cliente: {str(e)}"
        return result

# Commission routes
async def create_commission_for_budget(budget: Budget, created_by: str):
    """Helper function to create commission when budget is approved"""
    if not budget.seller_id:
        return
    
    seller = await db.sellers.find_one({"id": budget.seller_id})
    if not seller:
        return
    
    # Check if commission already exists
    existing_commission = await db.commissions.find_one({"budget_id": budget.id})
    if existing_commission:
        return
    
    commission_amount = budget.total * (seller["commission_percentage"] / 100)
    
    commission_obj = Commission(
        budget_id=budget.id,
        seller_id=budget.seller_id,
        seller_name=seller["name"],
        budget_total=budget.total,
        commission_percentage=seller["commission_percentage"],
        commission_amount=commission_amount,
        status=CommissionStatus.CALCULATED
    )
    
    await db.commissions.insert_one(commission_obj.dict())

@api_router.post("/commissions", response_model=Commission)
async def create_commission(commission_data: CommissionCreate, current_user: User = Depends(get_current_user)):
    # Get budget info
    budget = await db.budgets.find_one({"id": commission_data.budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Get seller info
    seller = await db.sellers.find_one({"id": commission_data.seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Check if commission already exists
    existing_commission = await db.commissions.find_one({"budget_id": commission_data.budget_id})
    if existing_commission:
        raise HTTPException(status_code=400, detail="Commission already exists for this budget")
    
    # Use provided commission percentage or seller's default
    commission_percentage = commission_data.commission_percentage or seller["commission_percentage"]
    commission_amount = budget["total"] * (commission_percentage / 100)
    
    commission_dict = {
        "budget_id": commission_data.budget_id,
        "seller_id": commission_data.seller_id,
        "seller_name": seller["name"],
        "budget_total": budget["total"],
        "commission_percentage": commission_percentage,
        "commission_amount": commission_amount,
        "observations": commission_data.observations,
        "status": CommissionStatus.CALCULATED
    }
    
    commission_obj = Commission(**commission_dict)
    await db.commissions.insert_one(commission_obj.dict())
    return commission_obj

@api_router.get("/commissions", response_model=List[Commission])
async def get_commissions(
    current_user: User = Depends(get_current_user),
    seller_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    # Build query filters
    query = {}
    
    if seller_id:
        query["seller_id"] = seller_id
    
    if status and status != "all":
        query["status"] = status
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query["created_at"] = date_query
    
    commissions = await db.commissions.find(query).sort("created_at", -1).to_list(1000)
    return [Commission(**commission) for commission in commissions]

@api_router.get("/commissions/summary")
async def get_commissions_summary(
    current_user: User = Depends(get_current_user),
    seller_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    # Build query filters
    query = {}
    
    if seller_id:
        query["seller_id"] = seller_id
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query["created_at"] = date_query
    
    # Aggregate commission data
    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$seller_id",
                "seller_name": {"$first": "$seller_name"},
                "total_commissions": {"$sum": "$commission_amount"},
                "total_sales": {"$sum": "$budget_total"},
                "commission_count": {"$sum": 1},
                "avg_commission_percentage": {"$avg": "$commission_percentage"}
            }
        },
        {"$sort": {"total_commissions": -1}}
    ]
    
    result = await db.commissions.aggregate(pipeline).to_list(1000)
    
    return {
        "summary": result,
        "totals": {
            "total_commission_amount": sum(item["total_commissions"] for item in result),
            "total_sales_amount": sum(item["total_sales"] for item in result),
            "total_commission_count": sum(item["commission_count"] for item in result)
        }
    }

@api_router.put("/commissions/{commission_id}", response_model=Commission)
async def update_commission(commission_id: str, commission_data: CommissionUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in commission_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If commission percentage is updated, recalculate amount
    existing_commission = await db.commissions.find_one({"id": commission_id})
    if not existing_commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    if "commission_percentage" in update_data:
        budget_total = existing_commission["budget_total"]
        update_data["commission_amount"] = budget_total * (update_data["commission_percentage"] / 100)
    
    result = await db.commissions.update_one({"id": commission_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    updated_commission = await db.commissions.find_one({"id": commission_id})
    return Commission(**updated_commission)

@api_router.delete("/commissions/{commission_id}")
async def delete_commission(commission_id: str, current_user: User = Depends(get_current_user)):
    result = await db.commissions.delete_one({"id": commission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"message": "Commission deleted successfully"}

@api_router.get("/budget-types")
async def get_budget_types(current_user: User = Depends(get_current_user)):
    return {"budget_types": [{"value": bt.value, "label": bt.value} for bt in BudgetType]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()