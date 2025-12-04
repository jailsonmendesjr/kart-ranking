let appData = { drivers: [], races: [], results: [] };

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// Busca dados do servidor (Backend)
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        appData = await response.json();
        renderGlobalRank();
        fillRaceSelect();
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    }
}

function showGlobal() {
    document.getElementById('panel-global').style.display = 'block';
    document.getElementById('panel-race').style.display = 'none';
}

function showRace() {
    document.getElementById('panel-global').style.display = 'none';
    document.getElementById('panel-race').style.display = 'block';
}

function renderGlobalRank() {
    const tbody = document.getElementById('globalTable');
    const ranking = appData.drivers.map(d => {
        const driverRes = appData.results.filter(r => r.driverId === d.id);
        const total = driverRes.reduce((sum, r) => sum + r.totalPoints, 0);
        return { ...d, total, races: driverRes.length };
    }).sort((a,b) => b.total - a.total);

    tbody.innerHTML = '';
    ranking.forEach((d, idx) => {
        let cl = idx === 0 ? 'pos-1' : (idx === 1 ? 'pos-2' : (idx === 2 ? 'pos-3' : ''));
        let icon = idx === 0 ? '👑 ' : '';
        tbody.innerHTML += `
            <tr>
                <td class="text-center ${cl}">${icon}${idx + 1}º</td>
                <td class="${cl}">${d.name} ${d.surname}</td>
                <td class="text-center text-muted">${d.races}</td>
                <td class="text-center fw-bold fs-5">${d.total}</td>
            </tr>`;
    });
}

function fillRaceSelect() {
    const sel = document.getElementById('raceSelect');
    const sorted = [...appData.races].sort((a,b) => new Date(a.date) - new Date(b.date));
    sel.innerHTML = '<option value="">-- Selecione a Etapa --</option>' + 
        sorted.map(r => `<option value="${r.id}">${r.flag} ${r.name} (${new Date(r.date).toLocaleDateString('pt-BR')})</option>`).join('');
}

function renderRaceRank() {
    const rId = document.getElementById('raceSelect').value;
    if(!rId) { document.getElementById('raceResultArea').style.display='none'; return; }

    const race = appData.races.find(r => r.id === rId);
    const results = appData.results.filter(r => r.raceId === rId).sort((a,b) => a.position - b.position);

    document.getElementById('raceTitle').innerHTML = `${race.flag} ${race.name}`;
    const tbody = document.getElementById('raceTable'); tbody.innerHTML = '';

    if(results.length === 0) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Ainda não há resultados.</td></tr>';
    
    results.forEach(r => {
        const d = appData.drivers.find(drv => drv.id === r.driverId);
        const lap = r.fastestLap ? '<i class="fas fa-bolt text-warning ms-2"></i>' : '';
        let cl = r.position === 1 ? 'pos-1' : (r.position === 2 ? 'pos-2' : (r.position === 3 ? 'pos-3' : ''));
        
        tbody.innerHTML += `
            <tr>
                <td class="text-center ${cl}">${r.position}º</td>
                <td class="${cl}">${d.name} ${d.surname} ${lap}</td>
                <td class="text-center fw-bold">${r.totalPoints}</td>
            </tr>`;
    });
    document.getElementById('raceResultArea').style.display = 'block';
}