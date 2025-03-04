from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from pymongo import MongoClient
import json
from bson import ObjectId
from datetime import datetime
import ast

# Modèles Pydantic
class Product(BaseModel):
    product_id: int
    quantity: int
    price: float

class InvoiceCreate(BaseModel):
    invoice_date: str
    client_id: int
    products: List[Product]
    total_amount: float
    invoice_number: str

class InvoiceUpdate(BaseModel):
    invoice_date: Optional[str] = None
    client_id: Optional[int] = None
    products: Optional[List[Product]] = None
    total_amount: Optional[float] = None

app = FastAPI()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connexion à MongoDB
client = MongoClient("mongodb://mongodb:27017/")
db = client.gestion_clients

# Montage des fichiers statiques
app.mount("/static", StaticFiles(directory="static"), name="static")

# Route pour la page d'accueil
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

# Fonction d'initialisation de la base de données
@app.on_event("startup")
async def init_db():
    # Vérifier si les collections sont vides
    if db.clients.count_documents({}) == 0:
        # Charger les données des CSV
        clients_df = pd.read_csv("CSV/customer.csv")
        products_df = pd.read_csv("CSV/products.csv")
        invoices_df = pd.read_csv("CSV/invoices.csv")
        
        # Convertir les DataFrames en listes de dictionnaires
        clients = clients_df.to_dict('records')
        products = products_df.to_dict('records')
        
        # Traitement spécial pour les factures (conversion des chaînes en listes)
        invoices = []
        for _, row in invoices_df.iterrows():
            invoice = row.to_dict()
            invoice['products'] = ast.literal_eval(invoice['products'])
            invoices.append(invoice)
        
        # Insérer les données dans MongoDB
        db.clients.insert_many(clients)
        db.products.insert_many(products)
        db.invoices.insert_many(invoices)

# Routes pour les factures
@app.get("/api/invoices")
async def get_invoices():
    invoices = list(db.invoices.find())
    for invoice in invoices:
        invoice["_id"] = str(invoice["_id"])
    return invoices

@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if invoice:
        invoice["_id"] = str(invoice["_id"])
        return invoice
    raise HTTPException(status_code=404, detail="Facture non trouvée")

# Routes pour les clients
@app.get("/api/clients")
async def get_clients():
    clients = list(db.clients.find())
    for client in clients:
        client["_id"] = str(client["_id"])
    return clients

# Routes pour les produits
@app.get("/api/products")
async def get_products():
    products = list(db.products.find())
    for product in products:
        product["_id"] = str(product["_id"])
    return products

# Routes CRUD pour les factures
@app.post("/api/invoices")
async def create_invoice(invoice: InvoiceCreate):
    invoice_dict = invoice.dict()
    result = db.invoices.insert_one(invoice_dict)
    invoice_dict["_id"] = str(result.inserted_id)
    return invoice_dict

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice: InvoiceUpdate):
    update_data = {k: v for k, v in invoice.dict().items() if v is not None}
    result = db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    updated_invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    updated_invoice["_id"] = str(updated_invoice["_id"])
    return updated_invoice

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    result = db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": "Facture supprimée avec succès"}

# Routes CRUD pour les clients
@app.post("/api/clients")
async def create_client(client: dict):
    result = db.clients.insert_one(client)
    client["_id"] = str(result.inserted_id)
    return client

@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, client: dict):
    result = db.clients.update_one(
        {"_id": ObjectId(client_id)},
        {"$set": client}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    updated_client = db.clients.find_one({"_id": ObjectId(client_id)})
    updated_client["_id"] = str(updated_client["_id"])
    return updated_client

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    result = db.clients.delete_one({"_id": ObjectId(client_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé avec succès"}

# Routes CRUD pour les produits
@app.post("/api/products")
async def create_product(product: dict):
    # Vérifier si le produit contient les champs requis
    if not all(key in product for key in ["name", "category", "price", "product_id"]):
        raise HTTPException(status_code=422, detail="Les champs name, category, price et product_id sont requis")
    
    # Vérifier que le product_id est valide
    if not isinstance(product["product_id"], int) or product["product_id"] <= 0:
        raise HTTPException(status_code=422, detail="L'ID du produit doit être un entier positif")
    
    # Vérifier que le prix est un nombre
    try:
        product["price"] = float(product["price"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Le prix doit être un nombre valide")
    
    # Vérifier si l'ID existe déjà
    existing_product = db.products.find_one({"product_id": product["product_id"]})
    if existing_product:
        raise HTTPException(status_code=409, detail=f"Un produit avec l'ID {product['product_id']} existe déjà")
    
    print("Création du produit avec les données:", product)
    
    # Insérer le produit
    result = db.products.insert_one(product)
    
    # Récupérer le produit créé pour vérification
    created_product = db.products.find_one({"_id": result.inserted_id})
    if not created_product:
        raise HTTPException(status_code=500, detail="Erreur lors de la création du produit")
    
    print("Produit créé:", created_product)
    
    # Convertir l'ObjectId en string pour la réponse JSON
    created_product["_id"] = str(created_product["_id"])
    return created_product

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: dict):
    result = db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": product}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    updated_product = db.products.find_one({"_id": ObjectId(product_id)})
    updated_product["_id"] = str(updated_product["_id"])
    return updated_product

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    result = db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé avec succès"}

# Route de recherche pour les factures
@app.get("/api/invoices/search")
async def search_invoices(
    client_id: Optional[int] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None
):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if date_start or date_end:
        query["invoice_date"] = {}
        if date_start:
            query["invoice_date"]["$gte"] = date_start
        if date_end:
            query["invoice_date"]["$lte"] = date_end

    invoices = list(db.invoices.find(query))
    for invoice in invoices:
        invoice["_id"] = str(invoice["_id"])
    return invoices 