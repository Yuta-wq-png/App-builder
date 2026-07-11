const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'messages.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

app.get('/', (req, res) => res.send('Backend OK ✅'));

app.get('/api/messages', (req, res) => {
  const msgs = JSON.parse(fs.readFileSync(DB_FILE));
  res.json(msgs);
});

// NOUVELLE ROUTE POUR ENVOYER
app.post('/api/messages', (req, res) => {
  const msg = req.body;
  msg.time = new Date().toISOString();
  const msgs = JSON.parse(fs.readFileSync(DB_FILE));
  msgs.push(msg);
  fs.writeFileSync(DB_FILE, JSON.stringify(msgs, null, 2));
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend lancé sur ${PORT}`));
