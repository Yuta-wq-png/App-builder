const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const DB_FILE = path.join(__dirname, 'messages.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

// ROUTE TEST
app.get('/', (req, res) => {
  res.send('Backend OK ✅ Va sur /api/messages pour voir les messages');
});

// ROUTE POUR L'APP
app.get('/api/messages', (req, res) => {
  const msgs = JSON.parse(fs.readFileSync(DB_FILE));
  res.json(msgs);
});

// WEBSOCKET
wss.on('connection', ws => {
  ws.on('message', data => {
    const msg = JSON.parse(data);
    msg.time = new Date().toISOString();
    const msgs = JSON.parse(fs.readFileSync(DB_FILE));
    msgs.push(msg);
    fs.writeFileSync(DB_FILE, JSON.stringify(msgs, null, 2));
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify(msg));
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend lancé sur ${PORT}`));
