require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// 2. Config Storage Cloudinary pour les vocaux
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'speak-send-vocals',
    resource_type: 'video', // Cloudinary met les audios en "video"
    allowed_formats: ['mp3', 'wav', 'm4a', 'ogg', 'webm'],
  },
});
const upload = multer({ storage: storage });

// 3. Connect Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.use(cors());
app.use(express.json());

// 4. Route Test
app.get('/', (req, res) => {
  res.send('API SpeakSend is running');
});

// 5. Route Upload Vocal
app.post('/upload-vocal', upload.single('vocal'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }
    
    // req.file.path = URL Cloudinary du vocal
    const vocalUrl = req.file.path;
    
    // Ici tu peux sauver dans Mongo: { url: vocalUrl, userId: ... }
    res.status(200).json({ 
      message: 'Upload réussi', 
      url: vocalUrl 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
