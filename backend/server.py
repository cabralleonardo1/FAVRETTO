from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
    observations: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    contact_name: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    observations: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
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

class BudgetItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    unit_price: float
    length: Optional[float] = None
    height: Optional[float] = None
    width: Optional[float] = None
    subtotal: float

class Budget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    budget_type: BudgetType
    items: List[BudgetItem]
    installation_location: Optional[str] = None
    travel_distance_km: Optional[float] = None
    observations: Optional[str] = None
    subtotal: float
    discount_percentage: float = 0.0
    discount_amount: float = 0.0
    total: float
    validity_days: int = 30
    status: str = "DRAFT"  # DRAFT, SENT, APPROVED, REJECTED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class BudgetCreate(BaseModel):
    client_id: str
    budget_type: BudgetType
    items: List[BudgetItem]
    installation_location: Optional[str] = None
    travel_distance_km: Optional[float] = None
    observations: Optional[str] = None
    discount_percentage: float = 0.0

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
    
    # Calculate totals
    subtotal = sum(item.subtotal for item in budget_data.items)
    discount_amount = subtotal * (budget_data.discount_percentage / 100)
    total = subtotal - discount_amount
    
    budget_dict = budget_data.dict()
    budget_dict.update({
        "client_name": client["name"],
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "total": total,
        "created_by": current_user.username
    })
    
    budget_obj = Budget(**budget_dict)
    await db.budgets.insert_one(budget_obj.dict())
    return budget_obj

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(current_user: User = Depends(get_current_user)):
    budgets = await db.budgets.find().sort("created_at", -1).to_list(1000)
    return [Budget(**budget) for budget in budgets]

@api_router.get("/budgets/{budget_id}", response_model=Budget)
async def get_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    budget = await db.budgets.find_one({"id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Budget(**budget)

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