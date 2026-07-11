require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 10000;

console.log("Server starting...");

// CORS pour tout le monde
app.use(cors({ origin: "*" }));
app.use(express.json());

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});
console.log("Cloudinary Config OK");

// Storage Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'speak-send-vocals',
    resource_type: 'auto', // auto détecte audio/video
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Routes
app.get('/', (req, res) => res.send('API SpeakSend is running'));
app.get('/ping', (req, res) => res.send('pong'));

// Route Upload avec gestion d'erreur complète
app.post('/upload-vocal', (req, res) => {
  console.log("Requête reçue sur /upload-vocal");
  upload.single('vocal')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.log("ERREUR MULTER:", err);
      return res.status(500).json({ error: `Multer: ${err.message}` });
    } else if (err) {
      console.log("ERREUR UPLOAD:", err);
      return res.status(500).json({ error: `Upload: ${err.message}` });
    }
    
    if (!req.file) {
      console.log("AUCUN FICHIER");
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    
    console.log("FICHIER UPLOADE:", req.file.path);
    res.json({ message: 'Upload réussi', url: req.file.path });
  })
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
