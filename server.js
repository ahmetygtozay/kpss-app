const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
// Resim verileri büyük olduğu için limiti artırıyoruz
app.use(bodyParser.json({ limit: '50mb' })); 

// PostgreSQL Bağlantı Bilgileri
const pool = new Pool({
    user: 'postgres',         // Kendi kullanıcı adınız
    host: 'localhost',
    database: 'kpss_app',      // Veritabanı adınız
    password: 'Ahmet1212.',        // Şifreniz
    port: 5432,
});

// Derse göre soruları getir
app.get('/api/questions/:lesson', async (req, res) => {
    try {
        const { lesson } = req.params;
        const result = await pool.query('SELECT * FROM questions WHERE lesson = $1 ORDER BY id DESC', [lesson]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yeni soru ekle
app.post('/api/questions', async (req, res) => {
    const { lesson, topic, answer, image, hard } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO questions (lesson, topic, answer, image, hard) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [lesson, topic, answer, image, hard]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Soru güncelle
app.put('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { topic, answer, image, hard } = req.body;
    try {
        await pool.query(
            'UPDATE questions SET topic=$1, answer=$2, image=$3, hard=$4 WHERE id=$5',
            [topic, answer, image, hard, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Soru sil
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// İstatistikleri getir
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT lesson, COUNT(*) as count FROM questions GROUP BY lesson');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Backend http://localhost:3000 adresinde çalışıyor'));