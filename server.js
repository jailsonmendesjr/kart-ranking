const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session'); // Nova dependência
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de Segurança (Lê do EasyPanel ou usa padrão inseguro para teste)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para ler o form de login

// Configuração da Sessão
app.use(session({
    secret: 'kart-secreto-chave-seguranca', // Em produção idealmente seria var de ambiente
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mude para true se estiver usando HTTPS no EasyPanel
}));

// Serve arquivos públicos (CSS, JS, Imagens)
// Nota: O admin.html NÃO está mais aqui, então não é acessível publicamente
app.use(express.static('public')); 

// Caminho do banco de dados
const DB_FILE = path.join(__dirname, 'data', 'database.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Auxiliares de Dados
const readData = () => {
    if (!fs.existsSync(DB_FILE)) {
        const defaultData = { drivers: [], races: [], results: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};
const writeData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// Essa função bloqueia quem não está logado
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    // Se for uma chamada de API, retorna erro 401
    if (req.path.startsWith('/api/') && req.method !== 'GET') {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    // Se for acesso ao site, manda pro login
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
    // Agora servimos o arquivo da pasta PRIVATE, que ninguém acessa por URL direta
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// --- ROTAS DA API ---

// Leitura (Pública - Todos podem ver o ranking)
app.get('/api/data', (req, res) => res.json(readData()));

// Escrita (Protegida - Só admin altera)
app.post('/api/drivers', isAuthenticated, (req, res) => {
    const data = readData();
    data.drivers.push(req.body);
    writeData(data);
    res.json({ message: 'Salvo' });
});

app.delete('/api/drivers/:id', isAuthenticated, (req, res) => {
    const data = readData();
    data.drivers = data.drivers.filter(d => d.id !== req.params.id);
    data.results = data.results.filter(r => r.driverId !== req.params.id);
    writeData(data);
    res.json({ message: 'Removido' });
});

app.post('/api/races', isAuthenticated, (req, res) => {
    const data = readData();
    data.races.push(req.body);
    writeData(data);
    res.json({ message: 'Salvo' });
});

app.delete('/api/races/:id', isAuthenticated, (req, res) => {
    const data = readData();
    data.races = data.races.filter(r => r.id !== req.params.id);
    data.results = data.results.filter(r => r.raceId !== req.params.id);
    writeData(data);
    res.json({ message: 'Removido' });
});

app.post('/api/results', isAuthenticated, (req, res) => {
    const data = readData();
    const { raceId, results } = req.body;
    data.results = data.results.filter(r => r.raceId !== raceId);
    results.forEach(r => data.results.push(r));
    writeData(data);
    res.json({ message: 'Atualizado' });
});

// Rota Home
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));