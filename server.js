const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'kart-secreto-chave-seguranca',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mude para true se tiver HTTPS configurado
}));

app.use(express.static('public'));

// --- CONFIGURAÇÃO DO BANCO DE DADOS (SQLite) ---

// Garante que a pasta data existe
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Conecta (ou cria) o arquivo do banco
const db = new sqlite3.Database(path.join(DATA_DIR, 'kart.db'), (err) => {
    if (err) console.error("Erro ao abrir banco:", err.message);
    else console.log("Conectado ao banco SQLite 'kart.db'.");
});

// Cria as tabelas se não existirem
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT,
        surname TEXT,
        age INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS races (
        id TEXT PRIMARY KEY,
        name TEXT,
        date TEXT,
        flag TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raceId TEXT,
        driverId TEXT,
        position INTEGER,
        fastestLap INTEGER, -- 0 ou 1 (booleano)
        totalPoints INTEGER,
        FOREIGN KEY(raceId) REFERENCES races(id) ON DELETE CASCADE,
        FOREIGN KEY(driverId) REFERENCES drivers(id) ON DELETE CASCADE
    )`);
});

// --- FUNÇÕES AUXILIARES (Promessas para o SQLite) ---
// Transformamos callbacks do SQLite em Promessas para usar async/await
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    if (req.path.startsWith('/api/') && req.method !== 'GET') {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    res.redirect('/login.html');
}

// --- ROTAS DE LOGIN ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.user = username;
        res.redirect('/admin');
    } else {
        res.redirect('/login.html?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- ROTA ADMIN PROTEGIDA ---
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// --- API (Agora com SQL) ---

// 1. Pegar todos os dados (Mantendo estrutura antiga para compatibilidade)
app.get('/api/data', async (req, res) => {
    try {
        const drivers = await dbAll("SELECT * FROM drivers");
        const races = await dbAll("SELECT * FROM races");
        // O SQLite salva booleanos como 0/1. Vamos converter de volta se precisar,
        // mas o JS costuma tratar 1 como true em condicionais.
        const results = await dbAll("SELECT * FROM results");
        
        // Pequeno ajuste: converter 1/0 de volta para true/false para o frontend
        const formattedResults = results.map(r => ({
            ...r,
            fastestLap: !!r.fastestLap // Converte 1 -> true, 0 -> false
        }));

        res.json({ drivers, races, results: formattedResults });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});

// 2. Salvar Piloto
app.post('/api/drivers', isAuthenticated, async (req, res) => {
    const { id, name, surname, age } = req.body;
    try {
        await dbRun(
            "INSERT INTO drivers (id, name, surname, age) VALUES (?, ?, ?, ?)",
            [id, name, surname, age]
        );
        res.json({ message: 'Piloto salvo!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Deletar Piloto
app.delete('/api/drivers/:id', isAuthenticated, async (req, res) => {
    try {
        // Deleta o piloto. O ON DELETE CASCADE no banco cuidaria dos resultados,
        // mas vamos garantir deletando manualmente também por segurança.
        await dbRun("DELETE FROM results WHERE driverId = ?", [req.params.id]);
        await dbRun("DELETE FROM drivers WHERE id = ?", [req.params.id]);
        res.json({ message: 'Piloto removido' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Salvar Corrida
app.post('/api/races', isAuthenticated, async (req, res) => {
    const { id, name, date, flag } = req.body;
    try {
        await dbRun(
            "INSERT INTO races (id, name, date, flag) VALUES (?, ?, ?, ?)",
            [id, name, date, flag]
        );
        res.json({ message: 'Corrida agendada!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Deletar Corrida
app.delete('/api/races/:id', isAuthenticated, async (req, res) => {
    try {
        await dbRun("DELETE FROM results WHERE raceId = ?", [req.params.id]);
        await dbRun("DELETE FROM races WHERE id = ?", [req.params.id]);
        res.json({ message: 'Corrida removida' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Salvar Resultados
app.post('/api/results', isAuthenticated, async (req, res) => {
    const { raceId, results } = req.body;
    try {
        // Transação manual: Removemos anteriores e inserimos novos
        await dbRun("BEGIN TRANSACTION");
        
        await dbRun("DELETE FROM results WHERE raceId = ?", [raceId]);
        
        for (const r of results) {
            await dbRun(
                `INSERT INTO results (raceId, driverId, position, fastestLap, totalPoints) 
                 VALUES (?, ?, ?, ?, ?)`,
                [r.raceId, r.driverId, r.position, r.fastestLap ? 1 : 0, r.totalPoints]
            );
        }

        await dbRun("COMMIT");
        res.json({ message: 'Resultados atualizados!' });
    } catch (err) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});