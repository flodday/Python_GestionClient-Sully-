document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            switchPage(page);
        });
    });

    // Chargement initial
    loadInvoices();
    loadClients();
    loadProducts();
    
    // Gestionnaires de recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterInvoices(searchTerm);
        });
    }

    const clientSearchInput = document.getElementById('clientSearchInput');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterItems('client', searchTerm);
        });
    }

    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterItems('product', searchTerm);
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const clientId = document.getElementById('searchClientId').value;
            const dateStart = document.getElementById('searchDateStart').value;
            const dateEnd = document.getElementById('searchDateEnd').value;
            searchInvoices(clientId, dateStart, dateEnd);
        });
    }

    // Initialisation des formulaires d'ajout
    initializeAddForms();
});

function initializeAddForms() {
    // Formulaire d'ajout de facture
    document.getElementById('newInvoiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const products = [];
        let hasError = false;

        document.querySelectorAll('.product-entry').forEach(entry => {
            const select = entry.querySelector('.product-select');
            const quantity = entry.querySelector('.quantity-input').value;
            
            if (!select.value) {
                showError('Veuillez sélectionner un produit pour chaque ligne');
                hasError = true;
                return;
            }

            const productId = parseInt(select.value);
            if (isNaN(productId)) {
                showError('ID de produit invalide');
                hasError = true;
                return;
            }

            const price = parseFloat(select.options[select.selectedIndex].dataset.price);
            if (isNaN(price)) {
                showError('Prix invalide pour un produit');
                hasError = true;
                return;
            }

            products.push({
                product_id: productId,
                quantity: parseInt(quantity),
                price: parseFloat(price.toFixed(2))
            });
        });

        if (hasError) return;

        const totalAmount = parseFloat(document.getElementById('invoiceTotal').textContent
            .replace('€', '')
            .replace(',', '.')
            .trim()
        );

        const invoiceData = {
            invoice_date: document.getElementById('newInvoiceDate').value,
            client_id: parseInt(document.getElementById('newInvoiceClient').value),
            products: products,
            total_amount: parseFloat(totalAmount.toFixed(2)),
            invoice_number: generateInvoiceNumber()
        };

        try {
            console.log('Données de la facture à envoyer:', invoiceData);
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error('Erreur lors de la création de la facture: ' + JSON.stringify(errorData));
            }

            hideAddInvoiceForm();
            loadInvoices();
            showSuccess('Facture créée avec succès');
        } catch (error) {
            console.error('Erreur détaillée:', error);
            showError('Erreur lors de la création de la facture: ' + error.message);
        }
    });

    // Formulaire d'ajout de client
    document.getElementById('newClientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const clientData = {
            name: document.getElementById('newClientName').value,
            address: document.getElementById('newClientAddress').value,
            tel: document.getElementById('newClientTel').value,
            email: document.getElementById('newClientEmail').value,
            sex: document.getElementById('newClientSex').value,
            date_birth: document.getElementById('newClientBirth').value,
            client_id: await getNextClientId()
        };

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) throw new Error('Erreur lors de la création du client');

            hideAddClientForm();
            loadClients();
            showSuccess('Client créé avec succès');
        } catch (error) {
            console.error('Erreur:', error);
            showError('Erreur lors de la création du client');
        }
    });

    // Formulaire d'ajout de produit
    document.getElementById('newProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Obtenir le prochain ID produit
            const nextId = await getNextProductId();
            console.log('Prochain ID produit obtenu:', nextId);

            if (!nextId || isNaN(nextId)) {
                throw new Error('Impossible d\'obtenir un ID valide pour le produit');
            }

            const productData = {
                name: document.getElementById('newProductName').value,
                category: document.getElementById('newProductCategory').value,
                price: parseFloat(document.getElementById('newProductPrice').value),
                product_id: nextId
            };

            console.log('Données du produit à envoyer:', productData);

            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error('Erreur lors de la création du produit: ' + JSON.stringify(errorData));
            }

            // Récupérer le produit créé
            const newProduct = await response.json();
            console.log('Réponse du serveur:', newProduct);

            if (!newProduct || !newProduct.product_id) {
                console.error('Produit créé sans ID valide:', newProduct);
                throw new Error('Le produit créé n\'a pas d\'ID valide');
            }

            // Ajouter le nouveau produit à productsData
            productsData.push(newProduct);

            hideAddProductForm();
            await loadProducts();
            showSuccess('Produit créé avec succès');

            // Si le formulaire d'ajout de facture est ouvert, mettre à jour les sélecteurs
            if (document.getElementById('addInvoiceForm').style.display === 'block') {
                updateAllProductSelectors();
            }
        } catch (error) {
            console.error('Erreur détaillée:', error);
            showError('Erreur lors de la création du produit: ' + error.message);
        }
    });

    // Gestionnaires pour fermer les modales
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    // Fermeture avec la croix
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Fermeture en cliquant en dehors de la modale
    modals.forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function switchPage(page) {
    // Mettre à jour la navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Afficher la page correspondante
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });
}

// Variables globales pour la pagination
let currentPage = 1;
const itemsPerPage = 5;
let allInvoices = [];
let allClients = [];
let allProducts = [];
let currentClientPage = 1;
let currentProductPage = 1;

async function loadInvoices() {
    try {
        const response = await fetch('/api/invoices');
        const invoices = await response.json();
        displayInvoices(invoices);
    } catch (error) {
        console.error('Erreur lors du chargement des factures:', error);
        showError('Erreur lors du chargement des factures');
    }
}

function displayInvoices(invoices) {
    const invoicesList = document.getElementById('invoicesList');
    if (!invoicesList) {
        console.error('Element invoicesList non trouvé');
        return;
    }
    
    // Sauvegarder toutes les factures
    allInvoices = invoices;
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(invoices.length / itemsPerPage);
    
    // Calculer les indices de début et de fin pour la page actuelle
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Obtenir les factures pour la page actuelle
    const currentInvoices = invoices.slice(startIndex, endIndex);
    
    invoicesList.innerHTML = '';

    // Afficher les factures de la page actuelle
    currentInvoices.forEach(invoice => {
        const invoiceElement = document.createElement('div');
        invoiceElement.className = 'invoice-item';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'invoice-content';
        contentDiv.innerHTML = `
            <strong>Facture ${invoice.invoice_number}</strong><br>
            Date: ${formatDate(invoice.invoice_date)}<br>
            Client ID: ${invoice.client_id}<br>
            Montant: ${invoice.total_amount}€
        `;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'invoice-actions';
        actionsDiv.innerHTML = `
            <button class="delete-btn">Supprimer</button>
        `;
        
        contentDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            showInvoiceDetails(invoice._id);
        });
        
        const deleteBtn = actionsDiv.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteInvoice(invoice._id);
        });
        
        invoiceElement.appendChild(contentDiv);
        invoiceElement.appendChild(actionsDiv);
        invoicesList.appendChild(invoiceElement);
    });

    // Ajouter la pagination
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.innerHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Précédent</button>
        <div class="pagination-center">
            <span>Page </span>
            <input type="number" min="1" max="${totalPages}" value="${currentPage}" class="page-input" />
            <span> sur ${totalPages}</span>
        </div>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Suivant</button>
    `;
    invoicesList.appendChild(paginationDiv);

    // Ajouter l'événement pour le champ de saisie de page
    const pageInput = paginationDiv.querySelector('.page-input');
    pageInput.addEventListener('change', (e) => {
        const newPage = parseInt(e.target.value);
        if (newPage >= 1 && newPage <= totalPages) {
            changePage(newPage);
        } else {
            e.target.value = currentPage;
            showError('Numéro de page invalide');
        }
    });
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= Math.ceil(allInvoices.length / itemsPerPage)) {
        currentPage = newPage;
        displayInvoices(allInvoices);
    }
}

function filterInvoices(searchTerm) {
    const filteredInvoices = allInvoices.filter(invoice => {
        const invoiceText = `
            ${invoice.invoice_number}
            ${formatDate(invoice.invoice_date)}
            ${invoice.client_id}
            ${invoice.total_amount}
        `.toLowerCase();
        return invoiceText.includes(searchTerm.toLowerCase());
    });
    currentPage = 1; // Réinitialiser à la première page lors d'une recherche
    displayInvoices(filteredInvoices);
}

async function showInvoiceDetails(invoiceId) {
    try {
        console.log('Chargement des détails de la facture:', invoiceId);
        
        // Vérifier si l'élément selectedInvoice existe
        const selectedInvoice = document.getElementById('selectedInvoice');
        if (!selectedInvoice) {
            console.error('Element selectedInvoice non trouvé');
            showError('Erreur: élément selectedInvoice non trouvé');
            return;
        }
        
        // Afficher un message de chargement
        selectedInvoice.innerHTML = '<p>Chargement des détails...</p>';
        
        // Charger les données de la facture
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) throw new Error('Erreur lors du chargement de la facture');
        const invoice = await response.json();
        console.log('Données de la facture:', invoice);

        // Charger les données du client
        const clientResponse = await fetch('/api/clients');
        const clients = await clientResponse.json();
        const client = clients.find(c => c.client_id === invoice.client_id);
        console.log('Client trouvé:', client);

        // Charger les données des produits
        const productsResponse = await fetch('/api/products');
        const products = await productsResponse.json();

        // Générer le HTML pour les produits
        let productsHtml = '<ul class="product-list">';
        if (Array.isArray(invoice.products)) {
            invoice.products.forEach(item => {
                const product = products.find(p => p.product_id === item.product_id);
                if (product) {
                    productsHtml += `
                        <li class="product-item">
                            ${product.name} - Quantité: ${item.quantity} - Prix: ${item.price}€
                        </li>
                    `;
                }
            });
        }
        productsHtml += '</ul>';

        // Convertir le montant total
        const totalAmount = typeof invoice.total_amount === 'string' ? invoice.total_amount.replace(',', '.') : invoice.total_amount;
        console.log('Montant formaté:', totalAmount);

        // Mettre à jour l'affichage
        selectedInvoice.innerHTML = `
            <div class="invoice-details">
                <h3>Détails de la Facture ${invoice.invoice_number}</h3>
                <p><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</p>
                <p><strong>Client:</strong> ${client ? client.name : 'Client inconnu'} (ID: ${invoice.client_id})</p>
                <p><strong>Montant total:</strong> ${totalAmount}€</p>
                <h4>Produits:</h4>
                ${productsHtml}
                <div class="invoice-actions">
                    <button class="edit-btn">Modifier</button>
                    <button class="delete-btn">Supprimer</button>
                </div>
            </div>
        `;

        // Faire défiler jusqu'aux détails avec une animation
        selectedInvoice.querySelector('.invoice-details').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });

        // Ajouter la classe visible après un court délai
        setTimeout(() => {
            selectedInvoice.querySelector('.invoice-details').classList.add('visible');
        }, 100);

        const editBtn = selectedInvoice.querySelector('.edit-btn');
        const deleteBtn = selectedInvoice.querySelector('.delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', () => editInvoice(invoiceId));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteInvoice(invoiceId));
        }

    } catch (error) {
        console.error('Erreur détaillée:', error);
        showError('Erreur lors du chargement des détails de la facture');
        const selectedInvoice = document.getElementById('selectedInvoice');
        if (selectedInvoice) {
            selectedInvoice.innerHTML = '<p class="error-message">Erreur lors du chargement des détails</p>';
        }
    }
}

async function editInvoice(invoiceId) {
    try {
        console.log('Édition de la facture:', invoiceId);
        
        // Vérifier si l'élément selectedInvoice existe
        const selectedInvoice = document.getElementById('selectedInvoice');
        if (!selectedInvoice) {
            console.error('Element selectedInvoice non trouvé');
            showError('Erreur: élément selectedInvoice non trouvé');
            return;
        }
        
        // Afficher un message de chargement
        selectedInvoice.innerHTML = '<p>Chargement du formulaire...</p>';
        
        // Charger les données de la facture
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) throw new Error('Erreur lors du chargement de la facture');
        
        const invoice = await response.json();
        console.log('Données de la facture à éditer:', invoice);

        // Convertir la date au format ISO pour l'input date
        const dateStr = formatDateForInput(invoice.invoice_date);
        console.log('Date formatée:', dateStr);

        // Convertir le montant total
        const totalAmount = typeof invoice.total_amount === 'string' ? invoice.total_amount.replace(',', '.') : invoice.total_amount;
        console.log('Montant formaté:', totalAmount);

        // Créer le formulaire d'édition
        selectedInvoice.innerHTML = `
            <div class="form-container">
                <h3>Modifier la facture ${invoice.invoice_number}</h3>
                <form id="editInvoiceForm" class="edit-form">
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="editDate" value="${dateStr}" required>
                    </div>
                    <div class="form-group">
                        <label>Client ID:</label>
                        <input type="number" id="editClientId" value="${invoice.client_id}" required>
                    </div>
                    <div class="form-group">
                        <label>Montant total:</label>
                        <input type="number" id="editTotalAmount" value="${totalAmount}" step="0.01" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="save-btn">Enregistrer</button>
                        <button type="button" class="cancel-btn">Annuler</button>
                    </div>
                </form>
            </div>
        `;

        // Ajouter les gestionnaires d'événements
        const form = document.getElementById('editInvoiceForm');
        const cancelBtn = form.querySelector('.cancel-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateInvoice(e, invoiceId);
        });

        cancelBtn.addEventListener('click', () => {
            showInvoiceDetails(invoiceId);
        });

    } catch (error) {
        console.error('Erreur détaillée:', error);
        showError('Erreur lors du chargement de la facture');
        if (selectedInvoice) {
            selectedInvoice.innerHTML = '<p class="error-message">Erreur lors du chargement du formulaire d\'édition</p>';
        }
    }
}

async function updateInvoice(event, invoiceId) {
    event.preventDefault();
    const updateData = {
        invoice_date: document.getElementById('editDate').value,
        client_id: parseInt(document.getElementById('editClientId').value),
        total_amount: parseFloat(document.getElementById('editTotalAmount').value)
    };

    try {
        const response = await fetch(`/api/invoices/${invoiceId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error('Erreur lors de la mise à jour');

        await showInvoiceDetails(invoiceId);
        loadInvoices();
        showSuccess('Facture mise à jour avec succès');
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la mise à jour de la facture');
    }
}

async function deleteInvoice(invoiceId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
        try {
            await fetch(`/api/invoices/${invoiceId}`, {
                method: 'DELETE'
            });
            loadInvoices();
            showSuccess('Facture supprimée avec succès');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showError('Erreur lors de la suppression de la facture');
        }
    }
}

async function searchInvoices(clientId, dateStart, dateEnd) {
    try {
        let url = '/api/invoices/search?';
        if (clientId) url += `client_id=${clientId}&`;
        if (dateStart) url += `date_start=${dateStart}&`;
        if (dateEnd) url += `date_end=${dateEnd}`;
        
        const response = await fetch(url);
        const invoices = await response.json();
        displayInvoices(invoices);
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showError('Erreur lors de la recherche');
    }
}

function formatDate(dateString) {
    try {
        // Convertir la chaîne en nombre et gérer le format décimal avec virgule
        const excelDate = parseFloat(dateString.toString().replace(',', '.'));
        // Date de début Excel (1/1/1900)
        const startDate = new Date(1900, 0, 1);
        // Ajouter le nombre de jours
        const targetDate = new Date(startDate.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
        return targetDate.toLocaleDateString('fr-FR');
    } catch (error) {
        console.error('Erreur de formatage de date:', error);
        return dateString; // Retourner la chaîne originale en cas d'erreur
    }
}

function formatDateForInput(dateString) {
    try {
        // Convertir la chaîne en nombre et gérer le format décimal avec virgule
        const excelDate = parseFloat(dateString.toString().replace(',', '.'));
        // Date de début Excel (1/1/1900)
        const startDate = new Date(1900, 0, 1);
        // Ajouter le nombre de jours
        const targetDate = new Date(startDate.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
        return targetDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Erreur de formatage de date:', error);
        return ''; // Retourner une chaîne vide en cas d'erreur
    }
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// Nouvelles fonctions pour les clients
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        displayClients(clients);
    } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
        showError('Erreur lors du chargement des clients');
    }
}

function displayClients(clients) {
    const clientsList = document.getElementById('clientsList');
    if (!clientsList) {
        console.error('Element clientsList non trouvé');
        return;
    }
    
    // Sauvegarder tous les clients
    allClients = clients;
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(clients.length / itemsPerPage);
    
    // Calculer les indices de début et de fin pour la page actuelle
    const startIndex = (currentClientPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Obtenir les clients pour la page actuelle
    const currentClients = clients.slice(startIndex, endIndex);
    
    clientsList.innerHTML = '';

    // Afficher les clients de la page actuelle
    currentClients.forEach(client => {
        const clientElement = document.createElement('div');
        clientElement.className = 'data-item';
        clientElement.dataset.clientId = client._id;
        clientElement.innerHTML = `
            <div class="data-item-info">
                <strong>${client.name}</strong><br>
                ID: ${client.client_id}
            </div>
            <div class="data-item-actions">
                <button class="edit-btn">Modifier</button>
                <button class="delete-btn">Supprimer</button>
            </div>
        `;

        const editBtn = clientElement.querySelector('.edit-btn');
        const deleteBtn = clientElement.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => showEditForm(clientElement, client));
        deleteBtn.addEventListener('click', () => deleteClient(client._id));

        clientsList.appendChild(clientElement);
    });

    // Ajouter la pagination
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.innerHTML = `
        <button ${currentClientPage === 1 ? 'disabled' : ''} onclick="changeClientPage(${currentClientPage - 1})">Précédent</button>
        <div class="pagination-center">
            <span>Page </span>
            <input type="number" min="1" max="${totalPages}" value="${currentClientPage}" class="page-input" />
            <span> sur ${totalPages}</span>
        </div>
        <button ${currentClientPage === totalPages ? 'disabled' : ''} onclick="changeClientPage(${currentClientPage + 1})">Suivant</button>
    `;
    clientsList.appendChild(paginationDiv);

    // Ajouter l'événement pour le champ de saisie de page
    const pageInput = paginationDiv.querySelector('.page-input');
    pageInput.addEventListener('change', (e) => {
        const newPage = parseInt(e.target.value);
        if (newPage >= 1 && newPage <= totalPages) {
            changeClientPage(newPage);
        } else {
            e.target.value = currentClientPage;
            showError('Numéro de page invalide');
        }
    });
}

function showEditForm(clientElement, client) {
    const originalHtml = clientElement.innerHTML;
    
    clientElement.innerHTML = `
        <form class="edit-form">
            <div class="form-group">
                <label>Nom:</label>
                <input type="text" class="edit-client-name" value="${client.name}" required>
            </div>
            <div class="form-group">
                <label>ID Client:</label>
                <input type="number" class="edit-client-id" value="${client.client_id}" readonly>
                <small>L'ID client ne peut pas être modifié</small>
            </div>
            <div class="form-actions">
                <button type="submit" class="save-btn">Enregistrer</button>
                <button type="button" class="cancel-btn">Annuler</button>
            </div>
        </form>
    `;

    const form = clientElement.querySelector('form');
    const cancelBtn = clientElement.querySelector('.cancel-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = clientElement.querySelector('.edit-client-name');
        const idInput = clientElement.querySelector('.edit-client-id');
        
        try {
            const response = await fetch(`/api/clients/${client._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameInput.value,
                    client_id: parseInt(idInput.value)
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour');
            }

            await loadClients();
            showSuccess('Client mis à jour avec succès');
        } catch (error) {
            console.error('Erreur:', error);
            showError('Erreur lors de la mise à jour du client');
            clientElement.innerHTML = originalHtml;
            const newEditBtn = clientElement.querySelector('.edit-btn');
            const newDeleteBtn = clientElement.querySelector('.delete-btn');
            newEditBtn.addEventListener('click', () => showEditForm(clientElement, client));
            newDeleteBtn.addEventListener('click', () => deleteClient(client._id));
        }
    });

    cancelBtn.addEventListener('click', () => {
        clientElement.innerHTML = originalHtml;
        const newEditBtn = clientElement.querySelector('.edit-btn');
        const newDeleteBtn = clientElement.querySelector('.delete-btn');
        newEditBtn.addEventListener('click', () => showEditForm(clientElement, client));
        newDeleteBtn.addEventListener('click', () => deleteClient(client._id));
    });
}

async function deleteClient(clientId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
        try {
            await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });
            loadClients();
            showSuccess('Client supprimé avec succès');
        } catch (error) {
            showError('Erreur lors de la suppression du client');
        }
    }
}

// Fonctions pour les produits
async function loadProducts() {
    try {
        console.log('Chargement des produits...');
        const response = await fetch('/api/products');
        const products = await response.json();
        console.log('Produits reçus:', products);
        displayProducts(products);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showError('Erreur lors du chargement des produits');
    }
}

function displayProducts(products) {
    console.log('Début de displayProducts avec', products.length, 'produits');
    const productsList = document.getElementById('productsListContainer');
    if (!productsList) {
        console.error('Element productsListContainer non trouvé');
        return;
    }
    console.log('Element productsListContainer trouvé:', productsList);
    
    // Sauvegarder tous les produits
    allProducts = products;
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(products.length / itemsPerPage);
    console.log('Nombre total de pages:', totalPages);
    
    // Calculer les indices de début et de fin pour la page actuelle
    const startIndex = (currentProductPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Obtenir les produits pour la page actuelle
    const currentProducts = products.slice(startIndex, endIndex);
    console.log('Produits pour la page courante:', currentProducts);
    
    productsList.innerHTML = '';

    // Afficher les produits de la page actuelle
    currentProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'data-item';
        productElement.dataset.productId = product._id;
        productElement.innerHTML = `
            <div class="data-item-info">
                <strong>${product.name}</strong><br>
                Prix: ${product.price}€ - Catégorie: ${product.category}
            </div>
            <div class="data-item-actions">
                <button class="edit-btn">Modifier</button>
                <button class="delete-btn">Supprimer</button>
            </div>
        `;

        const editBtn = productElement.querySelector('.edit-btn');
        const deleteBtn = productElement.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => showEditProductForm(productElement, product));
        deleteBtn.addEventListener('click', () => deleteProduct(product._id));

        productsList.appendChild(productElement);
    });

    // Ajouter la pagination
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.innerHTML = `
        <button ${currentProductPage === 1 ? 'disabled' : ''} onclick="changeProductPage(${currentProductPage - 1})">Précédent</button>
        <div class="pagination-center">
            <span>Page </span>
            <input type="number" min="1" max="${totalPages}" value="${currentProductPage}" class="page-input" />
            <span> sur ${totalPages}</span>
        </div>
        <button ${currentProductPage === totalPages ? 'disabled' : ''} onclick="changeProductPage(${currentProductPage + 1})">Suivant</button>
    `;
    productsList.appendChild(paginationDiv);

    // Ajouter l'événement pour le champ de saisie de page
    const pageInput = paginationDiv.querySelector('.page-input');
    pageInput.addEventListener('change', (e) => {
        const newPage = parseInt(e.target.value);
        if (newPage >= 1 && newPage <= totalPages) {
            changeProductPage(newPage);
        } else {
            e.target.value = currentProductPage;
            showError('Numéro de page invalide');
        }
    });
}

function showEditProductForm(productElement, product) {
    const originalHtml = productElement.innerHTML;
    
    productElement.innerHTML = `
        <form class="edit-form">
            <div class="form-group">
                <label>Nom:</label>
                <input type="text" class="edit-product-name" value="${product.name}" required>
            </div>
            <div class="form-group">
                <label>Prix:</label>
                <input type="number" class="edit-product-price" value="${product.price}" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Catégorie:</label>
                <input type="text" class="edit-product-category" value="${product.category}" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="save-btn">Enregistrer</button>
                <button type="button" class="cancel-btn">Annuler</button>
            </div>
        </form>
    `;

    const form = productElement.querySelector('form');
    const cancelBtn = productElement.querySelector('.cancel-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = productElement.querySelector('.edit-product-name');
        const priceInput = productElement.querySelector('.edit-product-price');
        const categoryInput = productElement.querySelector('.edit-product-category');
        
        try {
            const response = await fetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameInput.value,
                    price: parseFloat(priceInput.value),
                    category: categoryInput.value
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour');
            }

            await loadProducts();
            showSuccess('Produit mis à jour avec succès');
        } catch (error) {
            console.error('Erreur:', error);
            showError('Erreur lors de la mise à jour du produit');
            productElement.innerHTML = originalHtml;
            const newEditBtn = productElement.querySelector('.edit-btn');
            const newDeleteBtn = productElement.querySelector('.delete-btn');
            newEditBtn.addEventListener('click', () => showEditProductForm(productElement, product));
            newDeleteBtn.addEventListener('click', () => deleteProduct(product._id));
        }
    });

    cancelBtn.addEventListener('click', () => {
        productElement.innerHTML = originalHtml;
        const newEditBtn = productElement.querySelector('.edit-btn');
        const newDeleteBtn = productElement.querySelector('.delete-btn');
        newEditBtn.addEventListener('click', () => showEditProductForm(productElement, product));
        newDeleteBtn.addEventListener('click', () => deleteProduct(product._id));
    });
}

async function deleteProduct(productId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
        try {
            await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            loadProducts();
            showSuccess('Produit supprimé avec succès');
        } catch (error) {
            showError('Erreur lors de la suppression du produit');
        }
    }
}

function filterItems(type, searchTerm) {
    const items = type === 'client' ? allClients : allProducts;
    const filteredItems = items.filter(item => {
        const itemText = type === 'client' 
            ? `${item.name} ${item.client_id}`
            : `${item.name} ${item.price} ${item.category}`;
        return itemText.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    if (type === 'client') {
        currentClientPage = 1;
        displayClients(filteredItems);
    } else {
        currentProductPage = 1;
        displayProducts(filteredItems);
    }
}

// Fonctions pour l'ajout de factures
async function showAddInvoiceForm() {
    const modal = document.getElementById('addInvoiceForm');
    modal.style.display = 'block';
    
    // Charger la liste des clients et des produits
    await Promise.all([loadClientsList(), loadProductsList()]);
    
    // Réinitialiser le formulaire
    document.getElementById('newInvoiceForm').reset();
    document.querySelector('.product-entries').innerHTML = '';
    document.getElementById('invoiceTotal').textContent = '0,00 €';
    
    // Ajouter une première ligne de produit
    addProductEntry();

    // Mettre à jour tous les sélecteurs de produits existants
    updateAllProductSelectors();
}

function hideAddInvoiceForm() {
    document.getElementById('addInvoiceForm').style.display = 'none';
}

async function loadClientsList() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        const select = document.getElementById('newInvoiceClient');
        select.innerHTML = '<option value="">Sélectionnez un client</option>';
        clients.forEach(client => {
            select.innerHTML += `<option value="${client.client_id}">${client.name}</option>`;
        });
    } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
        showError('Erreur lors du chargement des clients');
    }
}

let productsData = [];
async function loadProductsList() {
    try {
        console.log('Chargement des produits...');
        const response = await fetch('/api/products');
        productsData = await response.json();
        console.log('Produits chargés:', productsData.length);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showError('Erreur lors du chargement des produits');
    }
}

function addProductEntry() {
    const productEntry = document.createElement('div');
    productEntry.className = 'product-entry';
    productEntry.innerHTML = `
        <select class="product-select" required onchange="updateProductPrice(this)">
            <option value="">Sélectionnez un produit</option>
            ${productsData.filter(p => p && p.product_id).map(p => {
                const price = typeof p.price === 'string' ? 
                    parseFloat(p.price.replace(',', '.')) : 
                    p.price;
                return `<option value="${p.product_id}" data-price="${price}">${p.name} - ${price.toFixed(2).replace('.', ',')}€</option>`;
            }).join('')}
        </select>
        <input type="number" class="quantity-input" min="1" value="1" required onchange="updateTotal()">
        <span class="product-total">0,00 €</span>
        <button type="button" onclick="removeProductEntry(this)">×</button>
    `;
    document.querySelector('.product-entries').appendChild(productEntry);
    updateTotal();
}

function removeProductEntry(button) {
    button.closest('.product-entry').remove();
    updateTotal();
}

function updateProductPrice(select) {
    const entry = select.closest('.product-entry');
    const quantity = entry.querySelector('.quantity-input').value;
    const price = select.options[select.selectedIndex].dataset.price;
    const total = (parseFloat(price) * parseInt(quantity)).toFixed(2);
    entry.querySelector('.product-total').textContent = total.replace('.', ',') + ' €';
    updateTotal();
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('.product-entry').forEach(entry => {
        const select = entry.querySelector('.product-select');
        const quantity = entry.querySelector('.quantity-input').value;
        if (select.value) {
            const price = select.options[select.selectedIndex].dataset.price;
            total += parseFloat(price) * parseInt(quantity);
        }
    });
    document.getElementById('invoiceTotal').textContent = total.toFixed(2).replace('.', ',') + ' €';
}

function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FAC/${year}${month}${day}/${random}`;
}

// Fonctions pour l'ajout de clients
function showAddClientForm() {
    document.getElementById('addClientForm').style.display = 'block';
}

function hideAddClientForm() {
    document.getElementById('addClientForm').style.display = 'none';
}

async function getNextClientId() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        const maxId = Math.max(...clients.map(c => c.client_id), 0);
        return maxId + 1;
    } catch (error) {
        console.error('Erreur lors de la récupération du prochain ID client:', error);
        return 1;
    }
}

// Fonctions pour l'ajout de produits
function showAddProductForm() {
    document.getElementById('addProductForm').style.display = 'block';
}

function hideAddProductForm() {
    document.getElementById('addProductForm').style.display = 'none';
}

async function getNextProductId() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des produits');
        }
        const products = await response.json();
        console.log('Produits récupérés pour ID:', products);
        
        // Filtrer les produits qui ont un product_id valide
        const validProducts = products.filter(p => p && p.product_id && Number.isInteger(p.product_id));
        console.log('Produits avec ID valides:', validProducts);
        
        // Trouver le plus grand ID
        const maxId = validProducts.length > 0 
            ? Math.max(...validProducts.map(p => p.product_id))
            : 0;
        console.log('ID maximum trouvé:', maxId);
        
        // Retourner le prochain ID
        return maxId + 1;
    } catch (error) {
        console.error('Erreur lors de la récupération du prochain ID produit:', error);
        throw new Error('Impossible de générer un nouvel ID de produit');
    }
}

function changeClientPage(newPage) {
    if (newPage >= 1 && newPage <= Math.ceil(allClients.length / itemsPerPage)) {
        currentClientPage = newPage;
        displayClients(allClients);
    }
}

function changeProductPage(newPage) {
    if (newPage >= 1 && newPage <= Math.ceil(allProducts.length / itemsPerPage)) {
        currentProductPage = newPage;
        displayProducts(allProducts);
    }
}

// Nouvelle fonction pour mettre à jour tous les sélecteurs de produits
function updateAllProductSelectors() {
    const productSelectors = document.querySelectorAll('.product-select');
    productSelectors.forEach(select => {
        const selectedValue = select.value; // Sauvegarder la valeur sélectionnée
        select.innerHTML = `
            <option value="">Sélectionnez un produit</option>
            ${productsData.filter(p => p && p.product_id).map(p => {
                const price = typeof p.price === 'string' ? 
                    parseFloat(p.price.replace(',', '.')) : 
                    p.price;
                return `<option value="${p.product_id}" data-price="${price}">${p.name} - ${price.toFixed(2).replace('.', ',')}€</option>`;
            }).join('')}
        `;
        select.value = selectedValue; // Restaurer la valeur sélectionnée
        updateProductPrice(select); // Mettre à jour le prix
    });
} 