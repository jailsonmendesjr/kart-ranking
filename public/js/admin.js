const POINTS_SYSTEM = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
let appData = { drivers: [], races: [], results: [] };

document.addEventListener('DOMContentLoaded', () => {
    refreshData();
});

async function refreshData() {
    const res = await fetch('/api/data');
    appData = await res.json();
    renderLists();
}

// Funções de API
async function apiPost(url, body) {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    refreshData();
}

async function apiDelete(url) {
    if(confirm('Tem certeza?')) {
        await fetch(url, { method: 'DELETE' });
        refreshData();
    }
}

// Event Listeners
document.getElementById('driverForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newDriver = {
        id: Date.now().toString(),
        name: document.getElementById('driverName').value,
        surname: document.getElementById('driverSurname').value,
        age: document.getElementById('driverAge').value
    };
    apiPost('/api/drivers', newDriver);
    e.target.reset();
});

document.getElementById('raceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newRace = {
        id: 'race_' + Date.now(),
        name: document.getElementById('raceName').value,
        date: document.getElementById('raceDate').value,
        flag: document.getElementById('raceFlag').value
    };
    apiPost('/api/races', newRace);
    e.target.reset();
});

function renderLists() {
    const dTable = document.getElementById('driversListTable');
    dTable.innerHTML = appData.drivers.map(d => 
        `<tr><td>${d.name} ${d.surname}</td><td class="text-end"><button class="btn btn-sm btn-danger" onclick="apiDelete('/api/drivers/${d.id}')">X</button></td></tr>`
    ).join('');

    const rTable = document.getElementById('racesListTable');
    rTable.innerHTML = appData.races.map(r => 
        `<tr><td>${r.flag} ${r.name}</td><td class="text-end"><button class="btn btn-sm btn-danger" onclick="apiDelete('/api/races/${r.id}')">X</button></td></tr>`
    ).join('');
}

function updateSelects() {
    const s = document.getElementById('scoringRaceSelect');
    s.innerHTML = '<option value="">-- Selecione --</option>' + 
        appData.races.map(r => `<option value="${r.id}">${r.flag} ${r.name}</option>`).join('');
}

window.calcPts = function(id) {
    const pos = parseInt(document.getElementById(`pos_${id}`).value) || 0;
    const fast = document.getElementById(`lap_${id}`).checked;
    let pts = (POINTS_SYSTEM[pos] || 0) + (fast && pos > 0 ? 1 : 0);
    document.getElementById(`badge_${id}`).innerText = pts;
}

window.loadScoringTable = function() {
    const rId = document.getElementById('scoringRaceSelect').value;
    if(!rId) return;
    const res = appData.results.filter(r => r.raceId === rId);
    const tbody = document.getElementById('scoringTableBody'); tbody.innerHTML = '';
    
    appData.drivers.forEach(d => {
        const prev = res.find(r => r.driverId === d.id);
        tbody.innerHTML += `
            <tr>
                <td>${d.name} ${d.surname}</td>
                <td><input type="number" class="form-control form-control-sm" id="pos_${d.id}" value="${prev?.position||''}" oninput="calcPts('${d.id}')"></td>
                <td class="text-center"><input type="checkbox" class="form-check-input" id="lap_${d.id}" ${prev?.fastestLap?'checked':''} onchange="calcPts('${d.id}')"></td>
                <td class="text-end fw-bold"><span id="badge_${d.id}">${prev?.totalPoints||0}</span></td>
            </tr>`;
    });
    document.getElementById('scoringArea').style.display = 'block';
}

document.getElementById('pointsForm').addEventListener('submit', (e) => {
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

    apiPost('/api/results', { raceId: rId, results: newResults });
    alert('Salvo!');
});