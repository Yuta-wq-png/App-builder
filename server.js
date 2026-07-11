require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: "*" }));
app.use(express.json());

console.log("Server starting...");

// 1. MONGO
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("MongoDB OK"))
.catch(err=> console.log("Mongo ERR", err));

// 2. SCHEMAS
const UserSchema = new mongoose.Schema({
  nom: String,
  prenom: String,
  username: {type: String, unique: true},
  tel: {type: String, unique: true},
  password: String,
  createdAt: {type: Date, default: Date.now}
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  url: String,
  createdAt: {type: Date, default: Date.now}
});
const Message = mongoose.model('Message', MessageSchema);

// 3. CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});
console.log("Cloudinary Config OK");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'speak-send-vocals',
    resource_type: 'video',
    format: 'mp3',
    flags: 'attachment'
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({error: "Non autorisé"});
  try{
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch{
    res.status(401).json({error: "Token invalide"});
  }
}

// ROUTES
app.get('/', (req, res) => res.send('API SpeakSend is running'));
app.get('/ping', (req, res) => res.send('pong'));

// REGISTER
app.post('/register', async (req, res) => {
  try{
    const {nom, prenom, username, tel, password} = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({nom, prenom, username, tel, password: hash});
    const token = jwt.sign({id: user._id, tel: user.tel}, JWT_SECRET);
    res.json({token, user: {nom, prenom, username, tel}});
  } catch(e){
    res.status(400).json({error: "Tel ou Username déjà pris"});
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const {tel, password} = req.body;
  const user = await User.findOne({tel});
  if(!user) return res.status(400).json({error: "Utilisateur introuvable"});
  const ok = await bcrypt.compare(password, user.password);
  if(!ok) return res.status(400).json({error: "Mot de passe incorrect"});
  const token = jwt.sign({id: user._id, tel: user.tel}, JWT_SECRET);
  res.json({token, user: {nom: user.nom, prenom: user.prenom, username: user.username, tel: user.tel}});
});

// GET ALL USERS sauf moi
app.get('/users', auth, async (req, res) => {
  const users = await User.find({tel: {$ne: req.user.tel}}).select('-password');
  res.json(users);
});

// UPLOAD VOCAL
app.post('/upload-vocal', auth, upload.single('vocal'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const {to} = req.body;
  const msg = await Message.create({from: req.user.tel, to, url: req.file.path});
  res.json({ message: 'Upload réussi', url: req.file.path, msg });
});

// GET MESSAGES
app.get('/messages/:otherTel', auth, async (req, res) => {
  const {otherTel} = req.params;
  const messages = await Message.find({
    $or: [{from: req.user.tel, to: otherTel}, {from: otherTel, to: req.user.tel}]
  }).sort({createdAt: 1});
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
