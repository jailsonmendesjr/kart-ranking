// Configuração de Pontos (1º ao 10º)
const POINTS_SYSTEM = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };

let appData = { drivers: [], races: [], results: [] };
// Instâncias dos Modais do Bootstrap
let driverModal, raceModal;

document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    // Inicializa os modais
    driverModal = new bootstrap.Modal(document.getElementById('editDriverModal'));
    raceModal = new bootstrap.Modal(document.getElementById('editRaceModal'));
});

// Busca dados atualizados do servidor
async function refreshData() {
    try {
        const res = await fetch('/api/data');
        appData = await res.json();
        renderLists();
        updateSelects();
    } catch (error) {
        console.error("Erro ao conectar com servidor:", error);
    }
}

// --- FUNÇÕES DE API GENÉRICAS ---

async function apiRequest(url, method, body = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        if (res.ok) {
            await refreshData();
            return true;
        } else {
            alert('Erro na operação. Verifique se está logado.');
        }
    } catch (error) {
        console.error(error);
        alert('Erro de conexão.');
    }
    return false;
}

// --- EVENTOS DE CADASTRO (CRIAR) ---

document.getElementById('driverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDriver = {
        id: Date.now().toString(),
        name: document.getElementById('driverName').value,
        surname: document.getElementById('driverSurname').value,
        age: document.getElementById('driverAge').value
    };
    if (await apiRequest('/api/drivers', 'POST', newDriver)) {
        e.target.reset();
        alert('Piloto cadastrado!');
    }
});

document.getElementById('raceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newRace = {
        id: 'race_' + Date.now(),
        name: document.getElementById('raceName').value,
        date: document.getElementById('raceDate').value,
        flag: document.getElementById('raceFlag').value || '🏁'
    };
    if (await apiRequest('/api/races', 'POST', newRace)) {
        e.target.reset();
        alert('Corrida agendada!');
    }
});

// --- RENDERIZAÇÃO DAS LISTAS (COM BOTÃO EDITAR) ---

function renderLists() {
    // Lista de Pilotos
    const dTable = document.getElementById('driversListTable');
    dTable.innerHTML = appData.drivers.map(d => 
        `<tr>
            <td class="align-middle">${d.name} ${d.surname}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-info me-1" onclick="openEditDriver('${d.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('/api/drivers/${d.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`
    ).join('');

    // Lista de Corridas
    const rTable = document.getElementById('racesListTable');
    rTable.innerHTML = appData.races.map(r => {
        const dateFormatted = new Date(r.date).toLocaleDateString('pt-BR'); // Corrige problema de fuso se necessário
        return `<tr>
            <td class="align-middle">${r.flag} ${r.name} <small class="text-muted">(${dateFormatted})</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-info me-1" onclick="openEditRace('${r.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('/api/races/${r.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function deleteItem(url) {
    if(confirm('Tem certeza? Isso apagará dados vinculados.')) {
        await apiRequest(url, 'DELETE');
    }
}

// --- LÓGICA DE EDIÇÃO (MODAIS) ---

// 1. Pilotos
window.openEditDriver = function(id) {
    const d = appData.drivers.find(driver => driver.id === id);
    if (!d) return;

    document.getElementById('editDriverId').value = d.id;
    document.getElementById('editDriverName').value = d.name;
    document.getElementById('editDriverSurname').value = d.surname;
    document.getElementById('editDriverAge').value = d.age;
    
    driverModal.show();
}

window.saveDriverEdit = async function() {
    const id = document.getElementById('editDriverId').value;
    const body = {
        name: document.getElementById('editDriverName').value,
        surname: document.getElementById('editDriverSurname').value,
        age: document.getElementById('editDriverAge').value
    };
    
    if (await apiRequest(`/api/drivers/${id}`, 'PUT', body)) {
        driverModal.hide();
        // Não precisa de alert, a lista já atualiza
    }
}

// 2. Corridas
window.openEditRace = function(id) {
    const r = appData.races.find(race => race.id === id);
    if (!r) return;

    document.getElementById('editRaceId').value = r.id;
    document.getElementById('editRaceName').value = r.name;
    document.getElementById('editRaceDate').value = r.date; // Formato YYYY-MM-DD funciona direto no input date
    document.getElementById('editRaceFlag').value = r.flag;
    
    raceModal.show();
}

window.saveRaceEdit = async function() {
    const id = document.getElementById('editRaceId').value;
    const body = {
        name: document.getElementById('editRaceName').value,
        date: document.getElementById('editRaceDate').value,
        flag: document.getElementById('editRaceFlag').value
    };
    
    if (await apiRequest(`/api/races/${id}`, 'PUT', body)) {
        raceModal.hide();
    }
}

// --- PARTE DE PONTUAÇÃO (MANTEVE IGUAL) ---

function updateSelects() {
    const s = document.getElementById('scoringRaceSelect');
    // Salva seleção atual para não perder ao recarregar
    const currentVal = s.value;
    
    s.innerHTML = '<option value="">-- Selecione a Corrida --</option>' + 
        appData.races.map(r => `<option value="${r.id}">${r.flag} ${r.name}</option>`).join('');
        
    s.value = currentVal;
}

window.loadScoringTable = function() {
    const rId = document.getElementById('scoringRaceSelect').value;
    if(!rId) { alert("Selecione uma corrida!"); return; }

    const existingResults = appData.results.filter(r => r.raceId === rId);
    const tbody = document.getElementById('scoringTableBody'); 
    tbody.innerHTML = '';
    
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

window.calcPts = function(id) {
    const posInput = document.getElementById(`pos_${id}`).value;
    const pos = parseInt(posInput);
    const fast = document.getElementById(`lap_${id}`).checked;
    
    let pts = 0;
    if (pos > 0) {
        pts = (POINTS_SYSTEM[pos] || 0);
        if (fast) pts += 1;
    }
    document.getElementById(`badge_${id}`).innerText = pts;
}

document.getElementById('pointsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rId = document.getElementById('scoringRaceSelect').value;
    const newResults = [];
    
    appData.drivers.forEach(d => {
        const pos = parseInt(document.getElementById(`pos_${d.id}`).value) || 0;
        const fast = document.getElementById(`lap_${d.id}`).checked;
        
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
        alert("Nenhum resultado preenchido.");
        return;
    }

    if (await apiRequest('/api/results', 'POST', { raceId: rId, results: newResults })) {
        alert('Ranking atualizado!');
    }
});