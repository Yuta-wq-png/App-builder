require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. CORS - Autorise ton localhost + tout le monde
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// 2. Config Cloudinary v1
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// 3. Config Storage Cloudinary pour les vocaux
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'speak-send-vocals',
    resource_type: 'video', // obligatoire pour audio
    format: async (req, file) => 'mp3', // convertit tout en mp3
  },
});
const upload = multer({ storage: storage });

// 4. Connect Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// 5. Route Test
app.get('/', (req, res) => {
  res.send('API SpeakSend is running');
});

// 6. Route Upload Vocal
app.post('/upload-vocal', upload.single('vocal'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }
    console.log("Fichier reçu:", req.file.path);
    res.status(200).json({ 
      message: 'Upload réussi', 
      url: req.file.path 
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
