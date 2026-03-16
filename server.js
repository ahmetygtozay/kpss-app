const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// frontend dosyalarını servis et
app.use(express.static(path.join(__dirname)));

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Derse göre sorular
app.get('/api/questions/:lesson', async (req, res) => {
  try {
    const { lesson } = req.params;
    const result = await pool.query(
      'SELECT * FROM questions WHERE lesson = $1 ORDER BY id DESC',
      [lesson]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// soru ekle
app.post('/api/questions', async (req, res) => {
  const { lesson, topic, answer, image, hard } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO questions (lesson, topic, answer, image, hard) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [lesson, topic, answer, image, hard]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// soru güncelle
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

// soru sil
app.delete('/api/questions/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM questions WHERE id=$1',
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// istatistik
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT lesson, COUNT(*) as count FROM questions GROUP BY lesson'
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// index.html yönlendirme
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server çalışıyor: ${PORT}`);
});