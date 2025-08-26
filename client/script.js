document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'http://localhost:3000/documents';
    let editingId = null;
    let currentDocuments = [];
    let statusFilter = "all";

    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        // filtrer les documents déjà récupérés
        const filteredDocs = currentDocuments.filter(doc => doc.titre.toLowerCase().includes(query));
        renderDocuments(filteredDocs);
    });

    function renderDocuments(docs) {
const list = document.getElementById('docList');
list.innerHTML = '';

if (docs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center; font-style:italic; color:#777;">Aucun document</td>`;
    list.appendChild(tr);
    return;
}

// 🔹 Trier par date_arrivee du plus ancien au plus récent
docs.sort((a, b) => {
const dateA = a.date_arrivee ? new Date(a.date_arrivee) : new Date(0);
const dateB = b.date_arrivee ? new Date(b.date_arrivee) : new Date(0);
return dateB - dateA; // ordre décroissant
});

docs.forEach((doc, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${doc.titre}</td>
        <td>${doc.auteur || ''}</td>
        <td class="${doc.statut}">${doc.statut}</td>
        <td></td>
    `;
    const actionTd = tr.querySelector("td:last-child");
    // Ajouter les boutons actions comme avant
    const editBtn = document.createElement('button');
    editBtn.textContent = "Modifier"; editBtn.className = "btn-blue";
    editBtn.onclick = () => openModal(doc.id, doc);
    actionTd.appendChild(editBtn);

    if (doc.statut !== 'archivé') {
        const archiveBtn = document.createElement('button');
        archiveBtn.textContent = "Archiver"; archiveBtn.className = "btn-gray";
        archiveBtn.onclick = () => archiveDocument(doc.id);
        actionTd.appendChild(archiveBtn);
    }

    if (doc.statut !== 'supprimé') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Supprimer"; deleteBtn.className = "btn-orange";
        deleteBtn.onclick = () => deleteDocument(doc.id);
        actionTd.appendChild(deleteBtn);
    }

    if (doc.statut === 'archivé' || doc.statut === 'supprimé') {
        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = "Restaurer"; restoreBtn.className = "btn-blue";
        restoreBtn.onclick = () => restoreDocument(doc.id);
        actionTd.appendChild(restoreBtn);
    }

    const purgeBtn = document.createElement('button');
    purgeBtn.textContent = "Purger"; purgeBtn.className = "btn-red";
    purgeBtn.onclick = () => purgeDocument(doc.id);
    actionTd.appendChild(purgeBtn);

    list.appendChild(tr);
});
}



    const filteredDocs = currentDocuments.filter(doc => 
        doc.titre.toLowerCase().includes(query) &&
        (statusFilter === "all" || doc.statut.toLowerCase() === statusFilter.toLowerCase())
    );
    renderDocuments(filteredDocs);



    function openModal(id, doc) {
        const modal = document.getElementById('editModal');
        const modalContent = modal.querySelector('.modal-content');

        // Nettoyer l'ancien contenu
        modalContent.innerHTML = `
            <h3>Modifier le document</h3>
            <label>Titre :</label><br>
            <input type="text" id="editTitreInput" style="width:90%; margin:5px 0"><br>
            <label>Auteur :</label><br>
            <input type="text" id="editAuteurInput" style="width:90%; margin:5px 0"><br>
            <label>Date d'arrivée :</label><br>
            <input type="date" id="editDateInput" style="width:90%; margin:5px 0"><br><br>
            <button id="saveEditBtn" class="btn-blue">Enregistrer</button>
            <button class="btn-gray" id="cancelEditBtn">Annuler</button>
        `;

        // Remplir avec les valeurs existantes
        document.getElementById('editTitreInput').value = doc.titre || '';
        document.getElementById('editAuteurInput').value = doc.auteur || '';
        document.getElementById('editDateInput').value = doc.date_arrivee ? doc.date_arrivee.split("T")[0] : new Date().toISOString().split("T")[0];

        modal.style.display = 'flex';

        // Bouton Annuler
        document.getElementById('cancelEditBtn').onclick = () => modal.style.display = 'none';

        // Bouton Enregistrer
        document.getElementById('saveEditBtn').onclick = async () => {
            const newTitre = document.getElementById('editTitreInput').value;
            const newAuteur = document.getElementById('editAuteurInput').value;
            const newDate = document.getElementById('editDateInput').value;

            try {
                await fetch(`http://localhost:3000/documents/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ titre: newTitre, auteur: newAuteur, date_arrivee: newDate })
                });
                showNotif("Document modifié avec succès !", "success");
                modal.style.display = 'none';
                fetchDocuments();
            } catch {
                showNotif("Erreur lors de la modification !", "error");
            }
        };
    }

    function closeModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    // Archiver
    async function archiveDocument(id) {
        try {
            await fetch(`http://localhost:3000/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statut: "archivé" })
            });
            showNotif("Document archivé !", "success");
            fetchDocuments();
        } catch {
            showNotif("Erreur lors de l'archivage !", "error");
        }
    }

    // Supprimer
    async function deleteDocument(id) {
        try {
            await fetch(`http://localhost:3000/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statut: "supprimé" })
            });
            showNotif("Document supprimé !", "success");
            fetchDocuments();
        } catch {
            showNotif("Erreur lors de la suppression !", "error");
        }
    }

    // Restaurer
    async function restoreDocument(id) {
        try {
            await fetch(`http://localhost:3000/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statut: "disponible" })
            });
            showNotif("Document restauré !", "success");
            fetchDocuments();
        } catch {
            showNotif("Erreur lors de la restauration !", "error");
        }
    }

    // Purger

    async function purgeDocument(id) {
try {
    await fetch(`${API_URL}/${id}/purge`, { method: "DELETE" });
    showNotif("Document purgé définitivement !", "success");
    fetchDocuments(); // recharge la liste
} catch {
    showNotif("Erreur lors de la purge !", "error");
}
}




    // ⚡ fonction pour activer les événements du bouton filtre
    function initFilterEvents() {
        const filterBtn = document.getElementById('statusFilterBtn');
        const filterMenu = document.getElementById('statusFilterMenu');

        if (!filterBtn) return; // sécurité

        filterBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // évite fermeture immédiate
            if (filterMenu.style.display === "block") {
                filterMenu.style.display = "none";
            } else {
                const rect = filterBtn.getBoundingClientRect();
                filterMenu.style.top = rect.bottom + "px";
                filterMenu.style.left = rect.left + "px";
                filterMenu.style.display = "block";
            }
        });

        document.querySelectorAll('.status-option').forEach(opt => {
            opt.onclick = () => {
                statusFilter = opt.dataset.status;
                filterMenu.style.display = "none";
                fetchDocuments();
            };
        });

        // Fermer si clic ailleurs
        document.addEventListener("click", (e) => {
            if (!filterMenu.contains(e.target) && e.target !== filterBtn) {
                filterMenu.style.display = "none";
            }
        });
    }

    function openForm(mode, doc = null) {
        const formCard = document.getElementById("docFormCard");
        const titreInput = document.getElementById("titreInput");
        const auteurInput = document.getElementById("auteurInput");
        const dateInput = document.getElementById("dateArriveeInput");
        const formTitle = document.getElementById("formTitle");

        if(mode === "add") {
            formTitle.textContent = "Ajouter un document";
            editingId = null;
            titreInput.value = "";
            auteurInput.value = "";
            dateInput.value = new Date().toISOString().split("T")[0];
        } else if(mode === "edit" && doc) {
            formTitle.textContent = "Modifier un document";
            editingId = doc.id;
            titreInput.value = doc.titre;
            auteurInput.value = doc.auteur || '';
            dateInput.value = doc.date_arrivee ? doc.date_arrivee.split("T")[0] : new Date().toISOString().split("T")[0];
        }

        formCard.style.display = "flex"; // Affiche le card en overlay
    }

    function closeForm() {
        document.getElementById("docFormCard").style.display = "none";
    }




    function showNotif(message, type = 'success') {
        const notif = document.getElementById('notif');
        notif.style.background = type === 'success' ? '#28a745' : '#dc3545'; // vert ou rouge
        notif.textContent = message;
        notif.style.display = 'block';
        setTimeout(() => {
            notif.style.display = 'none';
        }, 3000);
}


    function fetchDocuments() {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('docList');
                list.innerHTML = '';
                const table = document.querySelector('table');

                // Regénère l'entête
                const thead = table.querySelector('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Numéro</th>
                        <th>Titre</th>
                        <th>Auteur</th>
                        ${statusFilter === 'purgé' ? '<th>Date de purge</th>' : ''}
                        <th style="position: relative; min-width:120px;">
                            Statut <span id="statusFilterBtn" style="cursor:pointer;">▼</span>
                        </th>
                        <th>Actions</th>
                    </tr>
                `;

                // ⚡ Réactiver les événements du filtre
                initFilterEvents();

                currentDocuments = data;
                let filteredData = data;

                if (statusFilter !== "all") {
                    if (statusFilter === "purgé") {
                        fetch(`${API_URL}/purges`)
                            .then(res => res.json())
                            .then(purgedData => {
                                if (purgedData.length === 0) {
                                    const tr = document.createElement('tr');
                                    tr.innerHTML = `<td colspan="5" style="text-align:center; font-style:italic; color:#777;">Aucun document purgé</td>`;
                                    list.appendChild(tr);
                                    return;
                                }
                                purgedData.forEach((doc, index) => {
                                    const tr = document.createElement('tr');
                                    tr.innerHTML = `
                                        <td>${index + 1}</td>
                                        <td>${doc.titre}</td>
                                        <td>${doc.auteur || ''}</td>
                                        <td>${new Date(doc.date_purge).toLocaleString()}</td>
                                        <td class="supprimé">purgé</td>
                                        <td><i>Aucune action possible</i></td>
                                    `;
                                    list.appendChild(tr);
                                });
                            });
                        return;
                    } else {
                        filteredData = data.filter(doc => doc.statut.trim().toLowerCase() === statusFilter.toLowerCase());
                    }
                }
                renderDocuments(filteredData); // 🔹 Important : utiliser renderDocuments

                if (filteredData.length === 0) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td colspan="5" style="text-align:center; font-style:italic; color:#777;">Aucun document</td>`;
                    list.appendChild(tr);
                }

                filteredData.forEach((doc, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${doc.titre}</td>
                        <td>${doc.auteur || ''}</td>
                        <td class="${doc.statut}">${doc.statut}</td>
                        <td></td>
                    `;
                    const actionTd = tr.querySelector("td:last-child");
                    // ➝ Ajouter les actions
                    const editBtn = document.createElement('button');
                    editBtn.textContent = "Modifier"; editBtn.className = "btn-blue";
                    editBtn.onclick = () => openModal(doc.id, doc);

                    actionTd.appendChild(editBtn);

                    if (doc.statut !== 'archivé') {
                        const archiveBtn = document.createElement('button');
                        archiveBtn.textContent = "Archiver"; archiveBtn.className = "btn-gray";
                        archiveBtn.onclick = () => archiveDocument(doc.id);
                        actionTd.appendChild(archiveBtn);
                    }

                    if (doc.statut !== 'supprimé') {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = "Supprimer"; deleteBtn.className = "btn-orange";
                        deleteBtn.onclick = () => deleteDocument(doc.id);
                        actionTd.appendChild(deleteBtn);
                    }

                    if (doc.statut === 'archivé' || doc.statut === 'supprimé') {
                        const restoreBtn = document.createElement('button');
                        restoreBtn.textContent = "Restaurer"; restoreBtn.className = "btn-blue";
                        restoreBtn.onclick = () => restoreDocument(doc.id);
                        actionTd.appendChild(restoreBtn);
                    }

                    const purgeBtn = document.createElement('button');
                    purgeBtn.textContent = "Purger"; purgeBtn.className = "btn-red";
                    purgeBtn.onclick = () => purgeDocument(doc.id);
                    actionTd.appendChild(purgeBtn);

                    list.appendChild(tr);
                });
            });
    }

    fetchDocuments();

    document.getElementById("cancelAddBtn").addEventListener("click", () => {
        closeForm();
    });

        // Après tes fonctions openForm() et closeForm()
document.getElementById("addBtn").addEventListener("click", () => openForm("add"));

document.getElementById("docForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const titre = document.getElementById("titreInput").value;
    const auteur = document.getElementById("auteurInput").value;
    const date_arrivee = document.getElementById("dateArriveeInput").value;

    const payload = { titre, auteur, date_arrivee };

    try {
        if (editingId) {
            // Modification
            await fetch(`http://localhost:3000/documents/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showNotif("Document modifié avec succès !", "success");
        } else {
            // Ajout
            await fetch("http://localhost:3000/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showNotif("Document ajouté avec succès !", "success");
        }
        closeForm();       // Fermer la carte
        fetchDocuments();  // Mettre à jour la liste


    } catch (err) {
        console.error("Erreur :", err);
        showNotif("Erreur lors de l'ajout/modification !", "error");
    }


});





});

