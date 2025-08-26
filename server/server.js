const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
});

const PORT = process.env.PORT || 3000;

// GET /documents

app.get('/documents', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY id');
        res.json(result.rows);
        console.log("GET /documents effectué");
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// POST /documents
app.post('/documents', async (req, res) => {
    const { titre, auteur, date_arrivee, statut } = req.body;
    if (!titre || titre.trim() === "") {
        return res.status(400).json({ success: false, message: "Le titre est requis" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO documents (titre, auteur, date_arrivee, statut) VALUES ($1, $2, $3, $4) RETURNING *',
            [titre, auteur || null, date_arrivee || new Date(), statut || 'disponible']
        );
        res.json({ success: true, document: result.rows[0] });
        console.log("POST /documents :", result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// PATCH /documents/:id
app.patch('/documents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { titre, auteur, date_arrivee, statut } = req.body;
    if (titre && titre.trim() === "") {
        return res.status(400).json({ success: false, message: "Le titre ne peut pas être vide" });
    }
    try {
        const result = await pool.query(
            `UPDATE documents 
             SET titre = COALESCE($1, titre), 
                 auteur = COALESCE($2, auteur), 
                 date_arrivee = COALESCE($3, date_arrivee),
                 statut = COALESCE($4, statut) 
             WHERE id = $5 RETURNING *`,
            [titre, auteur, date_arrivee, statut, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Document non trouvé" });
        res.json({ success: true, document: result.rows[0] });
        console.log(`PATCH /documents/${id} :`, result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});







// PATCH /documents/:id/archive -> archivage
app.patch('/documents/:id/archive', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(
            'UPDATE documents SET statut = $1 WHERE id = $2 RETURNING *',
            ['archivé', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Document non trouvé" });
        res.json({ success: true, document: result.rows[0] });
        console.log(`PATCH /documents/${id}/archive : document archivé`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});



// DELETE /documents/:id -> soft delete
app.delete('/documents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(
            'UPDATE documents SET statut = $1 WHERE id = $2 RETURNING *',
            ['supprimé', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Document non trouvé" });
        res.json({ success: true });
        console.log(`DELETE /documents/${id} : soft delete`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// DELETE /documents/:id/purge -> suppression définitive
app.delete("/documents/:id/purge", async (req, res) => {
    const { id } = req.params;
    try {
        // Récupérer le document avant suppression
        const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
        const doc = result.rows[0];
        if (!doc) return res.json({ success: false, message: "Document introuvable" });

        // Ajouter dans documents_purges
        await pool.query(
            'INSERT INTO documents_purges (titre, auteur, ancien_statut) VALUES ($1, $2, $3)',
            [doc.titre, doc.auteur, doc.statut]
        );

        // Supprimer définitivement le document
        await pool.query('DELETE FROM documents WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Erreur serveur" });
    }
});


// GET /documents/purges -> récupérer les documents purgés
app.get("/documents/purges", async (req, res) => {
    try {
        const purgesResult = await pool.query('SELECT * FROM documents_purges ORDER BY date_purge DESC');
        res.json(purgesResult.rows);  // renvoie bien un tableau
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});


// PATCH /documents/:id/restore -> restaurer un document archivé ou supprimé
app.patch('/documents/:id/restore', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(
            'UPDATE documents SET statut = $1 WHERE id = $2 RETURNING *',
            ['disponible', id]  // <-- restauré = 'disponible'
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Document non trouvé" });
        res.json({ success: true, document: result.rows[0] });
        console.log(`PATCH /documents/${id}/restore : document restauré`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});


// GET /utilisateurs
app.get('/utilisateurs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM utilisateurs ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// POST /utilisateurs
app.post('/utilisateurs', async (req, res) => {
    const { nom, email, telephone } = req.body;
    if (!nom || !email) return res.status(400).json({ success: false, message: "Nom et email requis" });

    try {
        const result = await pool.query(
            'INSERT INTO utilisateurs (nom, email, telephone) VALUES ($1, $2, $3) RETURNING *',
            [nom, email, telephone]
        );
        res.json({ success: true, utilisateur: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});



// GET /emprunts
app.get('/emprunts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, u.nom AS utilisateur_nom, d.titre AS document_titre
            FROM emprunts e
            JOIN utilisateurs u ON e.utilisateur_id = u.id
            JOIN documents d ON e.document_id = d.id
            ORDER BY e.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// POST /emprunts
app.post('/emprunts', async (req, res) => {
    let { utilisateur_id, document_id } = req.body;
    utilisateur_id = parseInt(utilisateur_id);
    document_id = parseInt(document_id);

    if (!utilisateur_id || !document_id)
        return res.status(400).json({ success: false, message: "Utilisateur et document requis" });

    try {
        // Vérifier si document déjà emprunté
        const check = await pool.query(
            'SELECT * FROM emprunts WHERE document_id = $1 AND rendu = FALSE',
            [document_id]
        );
        if (check.rows.length > 0)
            return res.status(400).json({ success: false, message: "Document déjà emprunté" });

        const result = await pool.query(
            'INSERT INTO emprunts (utilisateur_id, document_id) VALUES ($1, $2) RETURNING *',
            [utilisateur_id, document_id]
        );
        res.json({ success: true, emprunt: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

app.patch('/emprunts/:id/rendu', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(
            'UPDATE emprunts SET rendu = TRUE, date_retour = CURRENT_DATE WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: "Emprunt non trouvé" });
        res.json({ success: true, emprunt: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});




app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
