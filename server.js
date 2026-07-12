const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Fichier JSON pour sauvegarder
const DB_FILE = path.join(__dirname, 'messages.json');

// Middleware
app.use(cors());
app.use(express.json());

// Charger les messages au démarrage
let messages = [];
if (fs.existsSync(DB_FILE)) {
  messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Fonction pour sauvegarder
function saveMessages() {
  fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2));
}

// Routes
app.get('/', (req, res) => {
  res.json({ status: "API Chat Public OK", messages: messages.length });
});

// GET: Récupérer tous les messages
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// POST: Poster un nouveau message
app.post('/api/messages', (req, res) => {
  const { user, texte } = req.body;
  
  if(!user || !texte || texte.trim() === "") {
    return res.status(400).json({error: "Pseudo et message requis"});
  }

  const nouveauMessage = {
    id: Date.now(),
    user: user.trim(),
    texte: texte.trim(),
    heure: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
  };

  messages.unshift(nouveauMessage);
  if(messages.length > 100) messages.pop();
  
  saveMessages(); // Sauvegarde dans le json
  
  res.status(201).json(nouveauMessage);
});

app.listen(PORT, () => {
  console.log(`API lancée sur le port ${PORT}`);
});
