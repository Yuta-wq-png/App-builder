const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const ADMIN_PASSWORD = "admin123" // <-- CHANGE TON MDP ICI

app.use(cors()) // pour que ton front puisse appeler
app.use(express.json())

// Créer la DB
const db = new sqlite3.Database('./database.db')
db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL, 
  telephone TEXT NOT NULL, 
  produit TEXT NOT NULL, 
  quantite INTEGER DEFAULT 1, 
  adresse TEXT, 
  statut TEXT DEFAULT 'nouveau',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

// ROUTE TEST
app.get('/', (req,res) => res.json({status: "API OK ✅"}))

// API : Login Admin
app.post('/api/login', (req, res) => {
  const {password} = req.body
  if(password === ADMIN_PASSWORD) return res.json({success: true})
  res.status(401).json({success: false, message: "Mauvais mot de passe"})
})

// API : Ajouter commande
app.post('/api/orders', (req, res) => {
  const {nom, telephone, produit, quantite, adresse} = req.body
  if(!nom || !telephone || !produit) return res.status(400).json({error: "Champs manquants"})
  
  db.run(`INSERT INTO orders (nom, telephone, produit, quantite, adresse) VALUES (?,?,?,?,?)`,
  [nom, telephone, produit, quantite || 1, adresse],
  function(err){ 
    if(err) return res.status(500).json({error: err.message}) 
    res.json({success: true, id: this.lastID})
  })
})

// API : Lister toutes les commandes
app.get('/api/orders', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, [], (err, rows) => {
    if(err) return res.status(500).json({error: err.message}) 
    res.json(rows)
  })
})

// API : Modifier statut
app.put('/api/orders/:id', (req, res) => {
  db.run(`UPDATE orders SET statut = ? WHERE id = ?`, [req.body.statut, req.params.id],
  function(err){ 
    if(err) return res.status(500).json({error: err.message}) 
    res.json({success: true, updated: this.changes})
  })
})

// API : Supprimer commande
app.delete('/api/orders/:id', (req, res) => {
  db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id],
  function(err){ 
    if(err) return res.status(500).json({error: err.message}) 
    res.json({success: true})
  })
})

app.listen(PORT, () => console.log(`API lancée sur ${PORT}`))
