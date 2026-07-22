const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Gelen verileri okuma ve izin ayarları
app.use(express.json());
app.use(cors());

// MongoDB Veritabanı Bağlantısı
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Veritabanına Başarıyla Bağlanıldı!'))
    .catch(err => console.error('❌ Veritabanı Bağlantı Hatası:', err));

// Kullanıcı Model Şeması
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

// --- 1. KAYIT OL (REGISTER) API ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda!' });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        res.status(201).json({ message: 'Kayıt başarıyla gerçekleşti!' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası oluştu.' });
    }
});

// --- 2. GİRİŞ YAP (LOGIN) API ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Kullanıcı bulunamadı!' });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: 'Şifre hatalı!' });
        }

        res.status(200).json({ 
            message: 'Giriş başarılı!', 
            user: { username: user.username, email: user.email } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası oluştu.' });
    }
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor!`);
});