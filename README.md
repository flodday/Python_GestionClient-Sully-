### Sullivan's work ( my mate )

# Système de Gestion des Factures

Une application web moderne pour la gestion des factures, clients et produits, développée avec FastAPI et MongoDB.

## 🚀 Fonctionnalités

### Gestion des Factures
- Affichage paginé des factures (5 par page)
- Recherche rapide et avancée
- Visualisation détaillée des factures
- Modification et suppression des factures
- Animation fluide lors de la navigation

### Gestion des Clients
- Liste complète des clients
- Ajout de nouveaux clients
- Modification des informations clients
- Suppression de clients

### Gestion des Produits
- Catalogue complet des produits
- Ajout de nouveaux produits
- Modification des détails produits
- Suppression de produits

## 💻 Technologies Utilisées

- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **Frontend**: HTML, CSS, JavaScript vanilla
- **API**: RESTful

## 📋 Prérequis

- Python 3.8 ou supérieur
- MongoDB
- pip (gestionnaire de paquets Python)

## 🔧 Installation

1. Clonez le dépôt :
```bash
git clone [url-du-repo]
cd gestionClients
```

2. Installez les dépendances :
```bash
pip install -r requirements.txt
```

3. Assurez-vous que MongoDB est en cours d'exécution

4. Lancez l'application :
```bash
uvicorn app:app --reload
```

L'application sera accessible à l'adresse : `http://localhost:8000`

## 📱 Utilisation

### Page des Factures
- Utilisez la barre de recherche rapide pour filtrer les factures
- La recherche avancée permet de filtrer par ID client et dates
- Cliquez sur une facture pour voir ses détails
- Les détails incluent les informations du client et la liste des produits
- Modifiez ou supprimez une facture depuis la vue détaillée

### Page des Clients
- Recherchez des clients par leur nom ou ID
- Ajoutez de nouveaux clients via le bouton "Ajouter un client"
- Modifiez les informations client avec le bouton "Modifier"
- Supprimez un client avec le bouton "Supprimer"

### Page des Produits
- Parcourez le catalogue de produits
- Ajoutez de nouveaux produits
- Modifiez les prix et catégories
- Supprimez les produits obsolètes

## 🔒 Sécurité

- Validation des données côté serveur et client
- Protection contre les injections MongoDB
- Gestion sécurisée des ID clients

## 📝 Format des Données

### Facture
```json
{
    "invoice_number": "FAC/2023/0001",
    "invoice_date": "43386,14375",
    "client_id": 485,
    "products": [
        {
            "product_id": 686,
            "quantity": 4,
            "price": 12.18
        }
    ],
    "total_amount": "1146,84"
}
```

### Client
```json
{
    "client_id": 1,
    "name": "Nom du Client",
    "address": "Adresse du Client",
    "tel": "0123456789",
    "email": "client@example.com"
}
```

### Produit
```json
{
    "product_id": 1,
    "name": "Nom du Produit",
    "category": "Catégorie",
    "price": "126,35"
}
```

