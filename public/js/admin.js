// Configuração de Pontos (1º ao 10º)
const POINTS_SYSTEM = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };

let appData = { drivers: [], races: [], results: [] };

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
});

// Busca dados atualizados do servidor
async function refreshData() {
    try {
        const res = await fetch('/api/data');
        appData = await res.json();
        renderLists();
    } catch (error) {
        console.error("Erro ao conectar com servidor:", error);
    }
}

// Funções Genéricas de API
async function apiPost(url, body) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            await refreshData();
            return true;
        }
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar dados.');
    }
    return false;
}

async function apiDelete(url) {
    if(confirm('Tem certeza que deseja excluir este item? Isso pode afetar o ranking.')) {
        await fetch(url, { method: 'DELETE' });
        refreshData();
    }
}

// --- EVENTOS DE FORMULÁRIO (CADASTROS) ---

// 1. Salvar Piloto
document.getElementById('driverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDriver = {
        id: Date.now().toString(),
        name: document.getElementById('driverName').value,
        surname: document.getElementById('driverSurname').value,
        age: document.getElementById('driverAge').value
    };
    if (await apiPost('/api/drivers', newDriver)) {
        e.target.reset();
        alert('Piloto cadastrado!');
    }
});

// 2. Salvar Corrida
document.getElementById('raceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newRace = {
        id: 'race_' + Date.now(),
        name: document.getElementById('raceName').value,
        date: document.getElementById('raceDate').value,
        flag: document.getElementById('raceFlag').value || '🏁'
    };
    if (await apiPost('/api/races', newRace)) {
        e.target.reset();
        alert('Corrida agendada!');
        updateSelects(); // Atualiza o select da outra aba também
    }
});

// --- RENDERIZAÇÃO NA TELA ---

function renderLists() {
    // Lista de Pilotos
    const dTable = document.getElementById('driversListTable');
    dTable.innerHTML = appData.drivers.map(d => 
        `<tr>
            <td class="align-middle">${d.name} ${d.surname}</td>
            <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="apiDelete('/api/drivers/${d.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`
    ).join('');

    // Lista de Corridas
    const rTable = document.getElementById('racesListTable');
    rTable.innerHTML = appData.races.map(r => {
        const dateFormatted = new Date(r.date).toLocaleDateString('pt-BR');
        return `<tr>
            <td class="align-middle">${r.flag} ${r.name} <small class="text-muted">(${dateFormatted})</small></td>
            <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="apiDelete('/api/races/${r.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
}

// Preenche o Select da aba de Pontos
function updateSelects() {
    const s = document.getElementById('scoringRaceSelect');
    s.innerHTML = '<option value="">-- Selecione a Corrida --</option>' + 
        appData.races.map(r => `<option value="${r.id}">${r.flag} ${r.name}</option>`).join('');
}

// --- LÓGICA DE PONTUAÇÃO ---

// Gera a tabela de inputs para lançar resultados
window.loadScoringTable = function() {
    const rId = document.getElementById('scoringRaceSelect').value;
    
    if(!rId) {
        alert("Por favor, selecione uma corrida primeiro!");
        return;
    }

    // Pega resultados já existentes dessa corrida (para edição)
    const existingResults = appData.results.filter(r => r.raceId === rId);
    
    const tbody = document.getElementById('scoringTableBody'); 
    tbody.innerHTML = '';
    
    // Cria uma linha para cada piloto
    appData.drivers.forEach(d => {
        const prev = existingResults.find(r => r.driverId === d.id);
        const posVal = prev ? prev.position : '';
        const lapChecked = prev && prev.fastestLap ? 'checked' : '';
        const ptsVal = prev ? prev.totalPoints : 0;

        tbody.innerHTML += `
            <tr>
                <td><strong>${d.name} ${d.surname}</strong></td>
                <td>
                    <input type="number" class="form-control" id="pos_${d.id}" 
                           value="${posVal}" placeholder="Pos" min="1" max="30"
                           oninput="calcPts('${d.id}')">
                </td>
                <td class="text-center">
                    <div class="form-check d-flex justify-content-center">
                        <input type="checkbox" class="form-check-input" id="lap_${d.id}" 
                               ${lapChecked} onchange="calcPts('${d.id}')">
                    </div>
                </td>
                <td class="text-end fw-bold text-danger">
                    <span id="badge_${d.id}" class="badge-points">${ptsVal}</span>
                </td>
            </tr>`;
    });
    
    document.getElementById('scoringArea').style.display = 'block';
}

// Calcula pontos em tempo real enquanto digita
window.calcPts = function(id) {
    const posInput = document.getElementById(`pos_${id}`).value;
    const pos = parseInt(posInput);
    const fast = document.getElementById(`lap_${id}`).checked;
    
    let pts = 0;
    
    // Se digitou uma posição válida
    if (pos > 0) {
        pts = (POINTS_SYSTEM[pos] || 0); // Pontos da posição
        if (fast) pts += 1;             // +1 Ponto volta rápida
    }

    document.getElementById(`badge_${id}`).innerText = pts;
}

// Salvar Resultados
document.getElementById('pointsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rId = document.getElementById('scoringRaceSelect').value;
    const newResults = [];
    
    appData.drivers.forEach(d => {
        const pos = parseInt(document.getElementById(`pos_${d.id}`).value) || 0;
        const fast = document.getElementById(`lap_${d.id}`).checked;
        
        // Só salva quem tem posição definida (quem correu)
        if(pos > 0) {
            newResults.push({ 
                raceId: rId, 
                driverId: d.id, 
                position: pos, 
                fastestLap: fast, 
                totalPoints: (POINTS_SYSTEM[pos]||0) + (fast?1:0) 
            });
        }
    });

    if (newResults.length === 0) {
        alert("Nenhum resultado preenchido. Defina as posições dos pilotos.");
        return;
    }

await apiPost('/api/results', { raceId: rId, results: newResults });
    alert('Resultados salvos e ranking atualizado!');
});