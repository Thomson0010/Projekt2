
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeData([]);
      return [];
    }
    throw err;
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function nextId() {
  const items = await readData();
  const max = items.reduce((m, it) => (it.id > m ? it.id : m), 0);
  return max + 1;
}

app.get('/items', async (req, res) => {
  try {
    let items = await readData();

    const { q, yearMin, yearMax, artist, title } = req.query;

    if (q) {
      const ql = q.toLowerCase();
      items = items.filter(it =>
        (it.title && it.title.toLowerCase().includes(ql)) ||
        (it.artist && it.artist.toLowerCase().includes(ql)) ||
        (String(it.year) && String(it.year).includes(ql))
      );
    }
    if (artist) {
      const a = artist.toLowerCase();
      items = items.filter(it => it.artist && it.artist.toLowerCase().includes(a));
    }
    if (title) {
      const t = title.toLowerCase();
      items = items.filter(it => it.title && it.title.toLowerCase().includes(t));
    }
    if (yearMin) {
      const min = parseInt(yearMin, 10);
      if (!Number.isNaN(min)) items = items.filter(it => Number(it.year) >= min);
    }
    if (yearMax) {
      const max = parseInt(yearMax, 10);
      if (!Number.isNaN(max)) items = items.filter(it => Number(it.year) <= max);
    }

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

app.get('/item', async (req, res) => {
  try {
    const id = Number(req.query.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Neplatné id' });
    const items = await readData();
    const item = items.find(it => it.id === id);
    if (!item) return res.status(404).json({ error: 'Záznam nenalezen' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'změny uloženy' });
  }
});

app.post('/items', async (req, res) => {
  try {
    const { title, artist, year } = req.body;

    if (!title || !artist || !year) {
      return res.status(400).json({ error: 'Chybí povinné pole' });
    }
    const id = await nextId();
    const newItem = {
      id,
      title: String(title).trim(),
      artist: String(artist).trim(),
      year: Number(year)
    };
    const items = await readData();
    items.push(newItem);
    await writeData(items);
    res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'změny byly uloženy' });
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Neplatné id' });
    const items = await readData();
    const item = items.find(it => it.id === id);
    if (!item) return res.status(404).json({ error: 'Záznam nenalezen' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

app.post('/edit/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Neplatné id' });
    const { title, artist, year } = req.body;
    if (!title || !artist || !year) {
      return res.status(400).json({ error: 'Chybí povinné pole' });
    }
    const items = await readData();
    const idx = items.findIndex(it => it.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Záznam nenalezen' });
    items[idx] = { ...items[idx], title: String(title).trim(), artist: String(artist).trim(), year: Number(year) };
    await writeData(items);
    res.json(items[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

app.delete('/delete/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Neplatné id' });
    let items = await readData();
    const idx = items.findIndex(it => it.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Záznam nenalezen' });
    const removed = items.splice(idx, 1)[0];
    await writeData(items);
    res.json({ success: true, removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});