const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors()); // important pour que ton app Android puisse appeler
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const DB_FILE = path.join(__dirname, 'messages.json');

// Charger / Sauver messages JSON
function loadMessages() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveMessages(msgs) {
  fs.writeFileSync(DB_FILE, JSON.stringify(msgs, null, 2));
}

// API historique
app.get('/api/messages', (req, res) => {
  res.json(loadMessages());
});

// WebSocket temps réel
wss.on('connection', ws => {
  ws.on('message', data => {
    const msg = JSON.parse(data);
    msg.time = new Date().toISOString();
    
    const msgs = loadMessages();
    msgs.push(msg);
    saveMessages(msgs);

    // Broadcast à tous
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify(msg));
    });
  });
});

const PORT = process.env.PORT || 3000; // Render donne le PORT auto
server.listen(PORT, () => console.log(`Backend lancé sur ${PORT}`));