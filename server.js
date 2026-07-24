const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Dosya yükleme kütüphanesi
require('dotenv').config();

const app = express();

// --- 1. OTOMATİK KLASÖR KONTROLÜ ---
// 'videos' klasörü yoksa sunucu başlarken hata vermemesi için otomatik oluşturur
const uploadDir = path.join(__dirname, 'videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Gelen verileri okuma ve izin ayarları (CORS Tam İzin)
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Statik Dosya Sunumu (HTML, CSS, JS ve Yüklenen Videolar)
app.use(express.static(__dirname));
app.use('/videos', express.static(uploadDir)); // videos klasörünü dışarıya açar

// MongoDB Veritabanı Bağlantısı
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Veritabanına Başarıyla Bağlanıldı!'))
    .catch(err => console.error('❌ Veritabanı Bağlantı Hatası:', err));

// --- MONGODB ŞEMALARI (MODELS) ---

// Kullanıcı Şeması
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

// Video Şeması
const VideoSchema = new mongoose.Schema({
    seriesId:    { type: String, required: true }, // Örn: 'digital-art'
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    duration:    { type: String, default: 'Yeni Video' },
    date:        { type: String, required: true },
    videoPath:   { type: String, required: true }  // Örn: 'videos/video-12345.mp4'
});

const Video = mongoose.model('Video', VideoSchema);


// --- MULTER DOSYA YÜKLEME AYARLARI ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'videos/'); // Yüklenen dosyaların kaydedileceği klasör
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });


// --- ANA SAYFA YÖNLENDİRMESİ ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- KAYIT OL (REGISTER) API ---
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


// --- GİRİŞ YAP (LOGIN) API ---
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


// --- VİDEO YÜKLEME API ---
app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Lütfen bir video dosyası seçin.' });
        }

        const { seriesId, title, description } = req.body;
        const videoPath = 'videos/' + req.file.filename;
        const today = new Date().toLocaleDateString('tr-TR');

        // MongoDB'ye Video Bilgilerini Kaydet
        const newVideo = new Video({
            seriesId: seriesId,
            title: title,
            description: description,
            date: today,
            videoPath: videoPath
        });

        await newVideo.save();

        res.status(200).json({
            success: true,
            message: 'Video kaydedildi ve veritabanına eklendi!',
            video: newVideo
        });
    } catch (error) {
        console.error('Video yükleme hatası:', error);
        res.status(500).json({ success: false, message: 'Video yüklenirken sunucu hatası oluştu.' });
    }
});


// --- TÜM VİDEOLARI GETİRME API ---
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find();
        res.status(200).json({ success: true, videos: videos });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Videolar getirilemedi.' });
    }
});


// --- SUNUCUYU BAŞLAT (HER YERDEN ERİŞİM İÇİN '0.0.0.0' EKLENDİ) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu çalışıyor!`);
    console.log(`💻 Bilgisayardan: http://localhost:${PORT}`);
    console.log(`📱 Telefondan yerel erişim: http://<BILGISAYAR_IP_ADRESINIZ>:${PORT}`);
});