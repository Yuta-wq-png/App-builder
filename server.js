require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connexion Mongo
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo Connecté"))
.catch(err => console.log(err));

// 2. Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'speak-send-audio', resource_type: 'video' }
});
const upload = multer({ storage: storage });

// 3. Schéma Post
const PostSchema = new mongoose.Schema({
  text: String,
  audioUrl: String,
  author: String,
  date: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', PostSchema);

// 4. Routes
app.get('/api/posts', async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  res.json(posts);
});

app.post('/api/posts', upload.single('audio'), async (req, res) => {
  const newPost = new Post({
    text: req.body.text,
    audioUrl: req.file ? req.file.path : null,
    author: "Anonyme"
  });
  await newPost.save();
  res.json(newPost);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
