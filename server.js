const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
app.use(express.json({limit: '50mb'})); // pour base64 vocal
app.use(cors());

// --- CONFIG CLOUDINARY POUR SAUVER LES VOCAUX ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// --- CONNEXION MONGO ---
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log('MongoDB Connecté'))
.catch(err=>console.log(err))

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
  nom: String,
  prenom: String,
  username: {type: String, unique: true},
  tel: {type: String, unique: true},
  mdp: String,
  pdp: String
}, {timestamps: true})

const PostSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  username: String,
  nom: String,
  text: String,
  likes: [String]
}, {timestamps: true})

const ChatSchema = new mongoose.Schema({
  from: String,
  to: String,
  audioUrl: String, // lien cloudinary
  lu: {type: Boolean, default: false}
}, {timestamps: true})

const User = mongoose.model('User', UserSchema)
const Post = mongoose.model('Post', PostSchema)
const Chat = mongoose.model('Chat', ChatSchema)

// --- MIDDLEWARE AUTH ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if(!token) return res.status(401).json({msg: 'Pas de token'});
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e) { res.status(401).json({msg: 'Token invalide'}) }
}

// --- ROUTES AUTH ---
app.post('/api/register', async (req, res) => {
  const {nom, prenom, username, tel, mdp} = req.body;
  try {
    let user = await User.findOne({tel});
    if(user) return res.status(400).json({msg: 'Numéro déjà utilisé'});

    const salt = await bcrypt.genSalt(10);
    const hashMdp = await bcrypt.hash(mdp, salt);

    user = new User({nom, prenom, username, tel, mdp: hashMdp});
    await user.save();

    const payload = {id: user.id};
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '7d'});
    res.json({token, user: {id: user.id, nom, username}});
  } catch(e) { res.status(500).send('Erreur serveur') }
})

app.post('/api/login', async (req, res) => {
  const {tel, mdp} = req.body;
  try {
    const user = await User.findOne({tel});
    if(!user) return res.status(400).json({msg: 'Numéro incorrect'});

    const isMatch = await bcrypt.compare(mdp, user.mdp);
    if(!isMatch) return res.status(400).json({msg: 'Mot de passe incorrect'});

    const payload = {id: user.id};
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '7d'});
    res.json({token, user});
  } catch(e) { res.status(500).send('Erreur serveur') }
})

// --- ROUTES POSTS ---
app.get('/api/posts', auth, async (req, res) => {
  const posts = await Post.find().sort({createdAt: -1});
  res.json(posts);
})

app.post('/api/posts', auth, async (req, res) => {
  const {text} = req.body;
  const user = await User.findById(req.user.id);
  const post = new Post({userId: user.id, username: user.username, nom: user.nom, text});
  await post.save();
  res.json(post);
})

// --- ROUTES CHAT + UPLOAD VOCAL ---
const upload = multer({storage: multer.memoryStorage()});

app.post('/api/chat/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(`data:audio/webm;base64,${req.body.audio}`, {
      resource_type: 'video', // cloudinary met audio dans "video"
      folder: 'speak-send-vocaux'
    });
    const chat = new Chat({from: req.user.id, to: req.body.to, audioUrl: result.secure_url});
    await chat.save();
    res.json(chat);
  } catch(e) { res.status(500).json({msg: 'Upload erreur'}) }
})

app.get('/api/chat/:userId', auth, async (req, res) => {
  const chats = await Chat.find({
    $or: [{from: req.user.id, to: req.params.userId}, {from: req.params.userId, to: req.user.id}]
  }).sort({createdAt: 1});
  res.json(chats);
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Serveur lancé sur ${PORT}`))
