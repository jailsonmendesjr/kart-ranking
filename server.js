const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve os arquivos HTML/CSS/JS da pasta public

// Caminho do arquivo de banco de dados
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Garantir que a pasta 'data' existe
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Função auxiliar para ler dados
const readData = () => {
    if (!fs.existsSync(DB_FILE)) {
        // Se não existir, cria estrutura padrão vazia
        const defaultData = { drivers: [], races: [], results: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData));
        return defaultData;
    }
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
};

// Função auxiliar para salvar dados
const writeData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ROTAS DA API (O Frontend vai chamar aqui) ---

// 1. Pegar todos os dados (para carregar o ranking)
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// 2. Salvar Piloto
app.post('/api/drivers', (req, res) => {
    const data = readData();
    const newDriver = req.body; // { id, name, surname, age }
    data.drivers.push(newDriver);
    writeData(data);
    res.json({ message: 'Piloto salvo!', driver: newDriver });
});

// 3. Deletar Piloto
app.delete('/api/drivers/:id', (req, res) => {
    const data = readData();
    const { id } = req.params;
    data.drivers = data.drivers.filter(d => d.id !== id);
    data.results = data.results.filter(r => r.driverId !== id); // Remove resultados dele também
    writeData(data);
    res.json({ message: 'Piloto removido' });
});

// 4. Salvar Corrida
app.post('/api/races', (req, res) => {
    const data = readData();
    const newRace = req.body;
    data.races.push(newRace);
    writeData(data);
    res.json({ message: 'Corrida agendada!' });
});

// 5. Deletar Corrida
app.delete('/api/races/:id', (req, res) => {
    const data = readData();
    const { id } = req.params;
    data.races = data.races.filter(r => r.id !== id);
    data.results = data.results.filter(r => r.raceId !== id);
    writeData(data);
    res.json({ message: 'Corrida removida' });
});

// 6. Salvar Resultados (Pontos)
app.post('/api/results', (req, res) => {
    const data = readData();
    const { raceId, results } = req.body;
    
    // Remove resultados antigos dessa corrida para sobrescrever
    data.results = data.results.filter(r => r.raceId !== raceId);
    
    // Adiciona os novos
    // results é um array de objetos { raceId, driverId, position, fastestLap, totalPoints }
    results.forEach(r => data.results.push(r));
    
    writeData(data);
    res.json({ message: 'Resultados atualizados!' });
});

// Rota principal (entrega o index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// CORREÇÃO AQUI: Adicionado '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
// TESTE DE COMENTÁRIO