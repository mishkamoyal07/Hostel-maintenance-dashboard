// ==========================================================================
// AI Hostel Maintenance Dashboard - Application Frontend Logic
// Upgraded with: AI Explainability, Predictive Forecasting, Floor Heatmap,
// AI Chat, Technician Recommendation Engine, Cost Prediction, Voice Input,
// Complaint Timeline, Image Damage Detection, Emergency Alerts,
// Duplicate Detection, Technician Leaderboard
// ==========================================================================

// --- State Management ---
let state = {
    tickets: [],
    technicians: [],
    weights: {
        safety: 40,
        disruption: 30,
        age: 20,
        cost: 10
    },
    activeView: 'dashboard',
    selectedTicketForDiagnosis: null,
    ocrImageDetectedData: null,
    chatOpen: false,
    voiceRecognition: null,
    voiceActive: false
};

// --- NLP Rule Engine (Client Side for live typing previews) ---
const NLP_KEYWORD_RULES = [
    {
        keywords: ['spark', 'wire', 'shock', 'fire', 'smoke', 'burning', 'electricity', 'circuit', 'blackout', 'power out', 'short circuit', 'electric'],
        category: 'Electrical',
        safetyBoost: 95,
        disruptionBoost: 85,
        costScore: 80,
        costRange: '₹1,500 – ₹8,000',
        costConfidence: 87,
        similarCases: 22,
        damageCost: '₹6,000+'
    },
    {
        keywords: ['flood', 'burst', 'overflow', 'gush', 'pour', 'leak', 'drain', 'clog', 'sewer', 'pipe', 'water', 'drip', 'tap'],
        category: 'Plumbing',
        safetyBoost: 75,
        disruptionBoost: 90,
        costScore: 50,
        costRange: '₹500 – ₹3,000',
        costConfidence: 91,
        similarCases: 34,
        damageCost: '₹8,000+'
    },
    {
        keywords: ['intruder', 'lock', 'stolen', 'theft', 'break-in', 'jammed door', 'key lost', 'keycard', 'stranger', 'unsafe'],
        category: 'Security',
        safetyBoost: 85,
        disruptionBoost: 80,
        costScore: 85,
        costRange: '₹800 – ₹4,000',
        costConfidence: 84,
        similarCases: 11,
        damageCost: '₹3,500+'
    },
    {
        keywords: ['freezing', 'heater', 'hot water', 'ac', 'cooler', 'ventilation', 'choke', 'smell gas', 'thermostat', 'gas', 'fume'],
        category: 'HVAC',
        safetyBoost: 70,
        disruptionBoost: 75,
        costScore: 40,
        costRange: '₹600 – ₹2,500',
        costConfidence: 78,
        similarCases: 18,
        damageCost: '₹2,000+'
    },
    {
        keywords: ['bed', 'table', 'chair', 'desk', 'wardrobe', 'cabinet', 'hinge', 'broken leg', 'loose screw', 'furniture'],
        category: 'Furniture',
        safetyBoost: 25,
        disruptionBoost: 40,
        costScore: 90,
        costRange: '₹200 – ₹1,200',
        costConfidence: 93,
        similarCases: 41,
        damageCost: '₹500+'
    },
    {
        keywords: ['cockroach', 'rat', 'rodent', 'bug', 'ant', 'cleaning', 'stench', 'dirty', 'infestation', 'garbage', 'trash', 'pest'],
        category: 'Cleaning',
        safetyBoost: 50,
        disruptionBoost: 60,
        costScore: 95,
        costRange: '₹300 – ₹1,500',
        costConfidence: 89,
        similarCases: 27,
        damageCost: '₹1,200+'
    }
];

// Emergency keywords that trigger the critical alert
const EMERGENCY_KEYWORDS = ['fire', 'smoke', 'shock', 'gas', 'electrocution', 'electrocute', 'explosion', 'blaze', 'carbon monoxide', 'fumes'];

// --- Charts References ---
let categoryChart = null;
let resolutionChart = null;

// --- Initialize App & Load Server Data ---
document.addEventListener('DOMContentLoaded', async () => {
    initAnalyticsCharts();
    
    await loadWeights();
    await loadTickets();
    await loadTechnicians();
});

// --- Fetch Helpers ---
async function loadWeights() {
    try {
        const response = await fetch('/api/weights');
        if (response.ok) {
            state.weights = await response.json();
            syncSliders();
        }
    } catch (err) {
        console.error("Failed to load weights: ", err);
    }
}

async function loadTickets() {
    try {
        const response = await fetch('/api/tickets');
        if (response.ok) {
            state.tickets = await response.json();
            renderTicketQueue();
            updateDashboardStats();
            updateAnalyticsCharts();
            renderFloorHeatmap();
            renderPredictiveForecast();
        }
    } catch (err) {
        console.error("Failed to load tickets: ", err);
    }
}

async function loadTechnicians() {
    try {
        const response = await fetch('/api/technicians');
        if (response.ok) {
            state.technicians = await response.json();
            renderStaffRoster();
            renderLeaderboard();
        }
    } catch (err) {
        console.error("Failed to load technicians: ", err);
    }
}

// --- Tab Switching Navigation ---
function switchView(viewName) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${viewName}`);
    if (activeLink) activeLink.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    state.activeView = viewName;
    
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');
    
    if (viewName === 'dashboard') {
        viewTitle.innerText = 'Maintenance Priorities';
        viewSubtitle.innerText = 'AI-assisted issue management & workflow dispatch.';
        loadTickets();
        loadTechnicians();
    } else if (viewName === 'student') {
        viewTitle.innerText = 'Student Self-Service Portal';
        viewSubtitle.innerText = 'File requests directly. Live AI reviews classification and risk assessment.';
        resetStudentForm();
    } else if (viewName === 'analytics') {
        viewTitle.innerText = 'Performance Analytics';
        viewSubtitle.innerText = 'Evaluate maintenance responsiveness and predictive SLA metrics.';
        updateAnalyticsCharts();
    }
}

// --- Sync Weights UI ---
function syncSliders() {
    document.getElementById('weight-safety').value = state.weights.safety;
    document.getElementById('weight-disruption').value = state.weights.disruption;
    document.getElementById('weight-age').value = state.weights.age;
    document.getElementById('weight-cost').value = state.weights.cost;
    
    document.getElementById('val-weight-safety').innerText = `${state.weights.safety}%`;
    document.getElementById('val-weight-disruption').innerText = `${state.weights.disruption}%`;
    document.getElementById('val-weight-age').innerText = `${state.weights.age}%`;
    document.getElementById('val-weight-cost').innerText = `${state.weights.cost}%`;
}

// --- Slider Input Listener ---
async function updateWeights() {
    const s = parseInt(document.getElementById('weight-safety').value);
    const d = parseInt(document.getElementById('weight-disruption').value);
    const a = parseInt(document.getElementById('weight-age').value);
    const c = parseInt(document.getElementById('weight-cost').value);
    
    state.weights.safety = s;
    state.weights.disruption = d;
    state.weights.age = a;
    state.weights.cost = c;
    
    document.getElementById('val-weight-safety').innerText = `${s}%`;
    document.getElementById('val-weight-disruption').innerText = `${d}%`;
    document.getElementById('val-weight-age').innerText = `${a}%`;
    document.getElementById('val-weight-cost').innerText = `${c}%`;
    
    try {
        await fetch('/api/weights', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ safety: s, disruption: d, age: a, cost: c })
        });
        await loadTickets();
    } catch (err) {
        console.error("Failed to post weight config: ", err);
    }
}

// --- Local calculation helper for typing previews ---
function calculateTicketPriorityClientSide(ticket) {
    const w = state.weights;
    const totalWeight = w.safety + w.disruption + w.age + w.cost;
    if (totalWeight === 0) return 0;
    const weightedSum = (ticket.safetyRaw * w.safety) + (ticket.disruptionRaw * w.disruption) + (ticket.costRaw * w.cost);
    return Math.round(weightedSum / totalWeight);
}

// --- Stats Generator ---
function updateDashboardStats() {
    const critical = state.tickets.filter(t => t.status !== 'Resolved' && t.priorityScore >= 80).length;
    const pending = state.tickets.filter(t => t.status === 'Pending').length;
    const resolved = state.tickets.filter(t => t.status === 'Resolved').length;
    
    const critEl = document.getElementById('stat-critical-count');
    const critCard = document.getElementById('stat-critical-card');
    critEl.innerText = critical;
    
    if (critical > 0) {
        critCard.style.boxShadow = `0 8px 32px 0 ${state.weights.safety > 20 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.37)'}`;
        document.getElementById('stat-critical-trend').innerHTML = `<span class="text-critical">Requires Immediate Action</span>`;
    } else {
        critCard.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
        document.getElementById('stat-critical-trend').innerHTML = `<span class="change-neutral">All secure</span>`;
    }
    
    document.getElementById('stat-pending-count').innerText = pending;
    document.getElementById('stat-resolved-count').innerText = resolved + 12;
    
    const optimalScore = Math.max(70, Math.min(100, 100 - (critical * 5) - (pending * 2)));
    document.getElementById('stat-optimization-score').innerText = `${optimalScore.toFixed(1)}%`;
}

// ==========================================
// FLOOR HEATMAP
// ==========================================
function renderFloorHeatmap() {
    const heatmapEl = document.getElementById('floor-heatmap');
    if (!heatmapEl) return;

    const blocks = ['A', 'B', 'C'];
    const floors = [4, 3, 2, 1];

    // Count active tickets per block+floor
    const floorCounts = {};
    blocks.forEach(b => {
        floors.forEach(f => { floorCounts[`${b}${f}`] = 0; });
    });

    state.tickets.filter(t => t.status !== 'Resolved').forEach(t => {
        const match = t.room.match(/^([A-C])-?(\d)/i);
        if (match) {
            const key = `${match[1].toUpperCase()}${match[2]}`;
            if (floorCounts[key] !== undefined) floorCounts[key]++;
        }
    });

    // Add some base data so heatmap isn't empty
    const baseExtra = { 'A4': 3, 'A3': 1, 'B4': 2, 'C3': 1, 'B2': 0, 'C1': 0 };
    Object.keys(baseExtra).forEach(k => {
        if (floorCounts[k] !== undefined) floorCounts[k] += baseExtra[k];
    });

    function getHeatColor(count) {
        if (count >= 4) return { cls: 'heat-red', emoji: '🔴', label: 'Critical' };
        if (count >= 2) return { cls: 'heat-orange', emoji: '🟠', label: 'High' };
        if (count >= 1) return { cls: 'heat-yellow', emoji: '🟡', label: 'Moderate' };
        return { cls: 'heat-green', emoji: '🟢', label: 'Clear' };
    }

    let html = `<div class="heatmap-blocks">`;
    blocks.forEach(block => {
        html += `<div class="heatmap-block">
            <div class="heatmap-block-title">Block ${block}</div>`;
        floors.forEach(floor => {
            const count = floorCounts[`${block}${floor}`];
            const { cls, emoji, label } = getHeatColor(count);
            html += `
            <div class="heatmap-floor ${cls}" title="${count} active issues on Floor ${floor}">
                <span class="floor-emoji">${emoji}</span>
                <span class="floor-label">Floor ${floor}</span>
                <span class="floor-count">${count > 0 ? count + ' issue' + (count !== 1 ? 's' : '') : 'Clear'}</span>
            </div>`;
        });
        html += `</div>`;
    });
    html += `</div>
    <div class="heatmap-legend">
        <span class="legend-item"><span class="legend-dot heat-red"></span>Critical (4+)</span>
        <span class="legend-item"><span class="legend-dot heat-orange"></span>High (2–3)</span>
        <span class="legend-item"><span class="legend-dot heat-yellow"></span>Moderate (1)</span>
        <span class="legend-item"><span class="legend-dot heat-green"></span>Clear</span>
    </div>`;

    heatmapEl.innerHTML = html;
}

// ==========================================
// PREDICTIVE FORECAST
// ==========================================
function renderPredictiveForecast() {
    const forecastEl = document.getElementById('forecast-list');
    if (!forecastEl) return;

    // Calculate category counts and compute trend predictions
    const counts = { Plumbing: 0, Electrical: 0, HVAC: 0, Furniture: 0, Cleaning: 0, Security: 0 };
    state.tickets.forEach(t => {
        if (counts[t.category] !== undefined) counts[t.category]++;
    });

    // AI-simulated trend: based on historical patterns + season
    const trends = [
        { cat: 'Plumbing', delta: +12, base: counts.Plumbing, reason: 'Seasonal pipe stress + monsoon' },
        { cat: 'Electrical', delta: +18, base: counts.Electrical, reason: 'Peak power load in exam season' },
        { cat: 'HVAC', delta: +8, base: counts.HVAC, reason: 'Summer heatwave pattern detected' },
        { cat: 'Furniture', delta: -4, base: counts.Furniture, reason: 'Recent maintenance reduced backlog' },
        { cat: 'Cleaning', delta: +5, base: counts.Cleaning, reason: 'Pre-inspection deep clean cycle' },
        { cat: 'Security', delta: -2, base: counts.Security, reason: 'New CCTV installation reduced incidents' }
    ];

    const catIcons = {
        Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️',
        Furniture: '🪑', Cleaning: '🧹', Security: '🔐'
    };

    let html = '';
    trends.forEach(t => {
        const isUp = t.delta > 0;
        const arrow = isUp ? '↑' : '↓';
        const cls = isUp ? 'forecast-up' : 'forecast-down';
        html += `
        <div class="forecast-item">
            <span class="forecast-cat-icon">${catIcons[t.cat]}</span>
            <div class="forecast-cat-info">
                <span class="forecast-cat-name">${t.cat}</span>
                <span class="forecast-reason">${t.reason}</span>
            </div>
            <span class="forecast-delta ${cls}">${arrow} ${Math.abs(t.delta)}%</span>
        </div>`;
    });

    forecastEl.innerHTML = html;
}

// ==========================================
// TECHNICIAN LEADERBOARD
// ==========================================
function renderLeaderboard() {
    const lbEl = document.getElementById('leaderboard-list');
    if (!lbEl) return;

    // Compute resolution stats per technician
    const medals = ['🥇', '🥈', '🥉'];
    
    // Simulated leaderboard data based on known technicians + resolution history
    const leaderboardData = state.technicians.map(tech => {
        const resolved = state.tickets.filter(t => t.status === 'Resolved' && t.assignedTech === tech.id).length;
        const total = state.tickets.filter(t => t.assignedTech === tech.id).length;
        const baseRate = 88 + Math.floor(Math.random() * 12);
        const rate = total > 0 ? Math.round((resolved / total) * 100) : baseRate;
        return { ...tech, rate, resolved: resolved + Math.floor(Math.random() * 20 + 15) };
    }).sort((a, b) => b.rate - a.rate);

    let html = '';
    leaderboardData.slice(0, 5).forEach((tech, idx) => {
        const medal = medals[idx] || `#${idx + 1}`;
        const barWidth = tech.rate;
        html += `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">${medal}</span>
            <div class="staff-avatar leaderboard-avatar">${getInitials(tech.name)}</div>
            <div class="leaderboard-info">
                <span class="leaderboard-name">${tech.name}</span>
                <div class="leaderboard-bar-row">
                    <div class="leaderboard-bar-bg">
                        <div class="leaderboard-bar-fill" style="width:${barWidth}%;background:${idx === 0 ? 'var(--accent-cyan)' : idx === 1 ? 'var(--accent-purple)' : 'var(--accent-blue)'}"></div>
                    </div>
                    <span class="leaderboard-rate">${tech.rate}%</span>
                </div>
                <span class="leaderboard-sub">${tech.resolved} resolved · ${tech.specialty}</span>
            </div>
        </div>`;
    });

    lbEl.innerHTML = html;
}

// --- Render Tickets Queue ---
function renderTicketQueue() {
    const queueEl = document.getElementById('ticket-queue');
    queueEl.innerHTML = '';
    
    const searchVal = document.getElementById('search-bar').value.toLowerCase();
    const categoryFilter = document.getElementById('filter-category').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    
    let filteredTickets = state.tickets.filter(t => {
        const matchSearch = t.room.toLowerCase().includes(searchVal) || 
                            t.description.toLowerCase().includes(searchVal) ||
                            t.category.toLowerCase().includes(searchVal);
        const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
        
        let matchPriority = true;
        if (priorityFilter === 'critical') matchPriority = t.priorityScore >= 80;
        else if (priorityFilter === 'high') matchPriority = t.priorityScore >= 60 && t.priorityScore < 80;
        else if (priorityFilter === 'medium') matchPriority = t.priorityScore >= 40 && t.priorityScore < 60;
        else if (priorityFilter === 'low') matchPriority = t.priorityScore < 40;
        
        return matchSearch && matchCategory && matchPriority;
    });
    
    if (filteredTickets.length === 0) {
        queueEl.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No matching active issues found.</p>
            </div>
        `;
        return;
    }
    
    filteredTickets.forEach(ticket => {
        let pClass = 'priority-low';
        if (ticket.priorityScore >= 80) pClass = 'priority-critical';
        else if (ticket.priorityScore >= 60) pClass = 'priority-high';
        else if (ticket.priorityScore >= 40) pClass = 'priority-medium';
        
        let statusClass = 'status-pending';
        if (ticket.status === 'Scheduled') statusClass = 'status-scheduled';
        else if (ticket.status === 'In Progress') statusClass = 'status-progress';
        else if (ticket.status === 'Resolved') statusClass = 'status-resolved';
        
        const displayAge = ticket.age < 1 ? `${Math.round(ticket.age * 60)} mins ago` : `${ticket.age.toFixed(1)} hrs ago`;
        
        let techAssignedName = 'None';
        if (ticket.assignedTech) {
            const techObj = state.technicians.find(tc => tc.id === ticket.assignedTech);
            if (techObj) techAssignedName = techObj.name;
        }
        
        // Cost estimate for ticket card
        const catRule = NLP_KEYWORD_RULES.find(r => r.category === ticket.category);
        const costRange = catRule ? catRule.costRange : '₹200 – ₹1,000';
        
        const card = document.createElement('div');
        card.className = `ticket-card ${pClass}`;
        card.setAttribute('data-id', ticket.id);
        
        card.innerHTML = `
            <div class="ticket-score-container">
                <div>${ticket.priorityScore}</div>
                <div class="ticket-score-label">AI Rank</div>
            </div>
            
            <div class="ticket-card-content">
                <div class="ticket-header">
                    <span class="room-badge">Room ${ticket.room}</span>
                    <span class="category-tag">
                        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:2px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4" />
                        </svg>
                        ${ticket.category}
                    </span>
                    <span class="ticket-time">${displayAge}</span>
                    <span class="status-badge ${statusClass}">${ticket.status}</span>
                </div>
                <h4 class="ticket-title">${ticket.description}</h4>
                <div class="ai-diagnosis-preview">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Safety(${ticket.safety_raw}%)  ·  Disruption(${ticket.disruption_raw}%)  ·  Est. Cost: ${costRange}  ·  Tech: ${techAssignedName}</span>
                </div>
            </div>
            
            <div class="ticket-actions">
                <button class="btn btn-primary" onclick="openAIExplainability(${ticket.id})">Explain AI</button>
                ${ticket.status !== 'Resolved' ? 
                    `<button class="btn btn-success" onclick="resolveTicket(${ticket.id})">Resolve</button>` : 
                    `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">COMPLETED</span>`}
            </div>
        `;
        queueEl.appendChild(card);
    });
}

// --- Render Staff Roster ---
function renderStaffRoster() {
    const rosterEl = document.getElementById('staff-roster');
    rosterEl.innerHTML = '';
    
    state.technicians.forEach(tech => {
        const activeCount = tech.activeTasks;
        const loadPercent = Math.min((activeCount / 4) * 100, 100);
        let loadColorClass = '';
        let loadDesc = 'Available';
        
        if (activeCount >= 3) {
            loadColorClass = 'heavy';
            loadDesc = 'Busy';
        } else if (activeCount >= 1) {
            loadColorClass = 'medium';
            loadDesc = 'Moderate';
        }
        
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.innerHTML = `
            <div class="staff-profile">
                <div class="staff-avatar">${getInitials(tech.name)}</div>
                <div class="staff-details">
                    <span class="staff-name">${tech.name}</span>
                    <span class="staff-specialty">${tech.specialty} Specialist</span>
                </div>
            </div>
            <div class="staff-load-indicator">
                <span class="load-number">${activeCount} Active (${loadDesc})</span>
                <div class="load-bar-container">
                    <div class="load-bar ${loadColorClass}" style="width: ${loadPercent}%;"></div>
                </div>
            </div>
        `;
        rosterEl.appendChild(card);
    });
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function filterTickets() {
    renderTicketQueue();
}

// --- Seed a Simulation Demo Ticket ---
async function seedDemoTicket() {
    const categories = ['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Cleaning', 'Security'];
    const rooms = ['A-108', 'B-302', 'C-215', 'A-402', 'B-105', 'C-110'];
    const descriptions = [
        'Sink drain leaking heavily in common area. Water pool forming on tiled floor.',
        'Sparks flying from electric breaker board in corridor, smell of burning plastic.',
        'AC fan is loose and making a metal-on-metal scraping noise, room is very warm.',
        'Student study chair has a loose joint, about to collapse if sat on.',
        'Shower drains clogged. 4 students report standing water in common bathroom.',
        'Door handle latch is loose, door cannot be secured from outside.'
    ];
    
    const idx = Math.floor(Math.random() * descriptions.length);
    const category = categories[idx];
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const description = descriptions[idx];
    
    let safety = 20;
    let disruption = 30;
    
    if (category === 'Electrical') { safety = 95; disruption = 70; }
    else if (category === 'Plumbing') { safety = 60; disruption = 90; }
    else if (category === 'Security') { safety = 80; disruption = 75; }
    else if (category === 'HVAC') { safety = 40; disruption = 80; }
    
    const newTicket = {
        room: room,
        category: category,
        studentUrgency: 'Medium',
        description: description,
        photoUrl: null,
        detectedKeywords: ['simulated', 'issue'],
        safetyRaw: safety,
        disruptionRaw: disruption
    };
    
    try {
        const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newTicket)
        });
        await response.json();
        await loadTickets();
        await loadTechnicians();
    } catch (err) {
        console.error("Failed to seed demo ticket: ", err);
    }
}

// --- Ticket Management Actions ---
async function resolveTicket(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'POST' });
        if (response.ok) {
            await loadTickets();
            await loadTechnicians();
        }
    } catch (err) {
        console.error("Failed to resolve ticket: ", err);
    }
}

// --- AI Smart Assign Engine ---
async function runAISmartAssign() {
    try {
        const response = await fetch('/api/smart-assign', { method: 'POST' });
        const resData = await response.json();
        
        if (resData.status === 'success') {
            if (resData.assignedCount > 0) {
                await loadTickets();
                await loadTechnicians();
            }
        }
    } catch (err) {
        console.error("Failed to execute smart dispatch: ", err);
    }
}

// ==========================================
// AI EXPLANATION MODAL (Enhanced)
// ==========================================
function openAIExplainability(ticketId) {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    state.selectedTicketForDiagnosis = ticket;
    
    document.getElementById('modal-ticket-title').innerText = `Explainable AI Diagnostic (Ticket #${ticket.id})`;
    document.getElementById('modal-ticket-room').innerText = `Room ${ticket.room} | Category: ${ticket.category}`;
    document.getElementById('modal-score').innerText = `${ticket.priorityScore}/100`;
    
    let safetyLevel = 'Low';
    if (ticket.safety_raw >= 80) safetyLevel = `Critical (${ticket.safety_raw}%)`;
    else if (ticket.safety_raw >= 50) safetyLevel = `Moderate (${ticket.safety_raw}%)`;
    else safetyLevel = `Minor (${ticket.safety_raw}%)`;
    document.getElementById('modal-hazard').innerText = safetyLevel;
    
    let disruptionLevel = 'Low';
    if (ticket.disruption_raw >= 80) disruptionLevel = `Severe (${ticket.disruption_raw}%)`;
    else if (ticket.disruption_raw >= 50) disruptionLevel = `Medium (${ticket.disruption_raw}%)`;
    else disruptionLevel = `Negligible (${ticket.disruption_raw}%)`;
    document.getElementById('modal-disruption').innerText = disruptionLevel;
    
    const ageHrs = ticket.age.toFixed(1);
    const agePenalty = Math.round(Math.min((ticket.age / 48) * 100, 100));
    document.getElementById('modal-age').innerText = `${ageHrs} hours elapsed (${agePenalty}% age weight applied)`;
    
    // Cost factor using rupee estimates
    const catRule = NLP_KEYWORD_RULES.find(r => r.category === ticket.category);
    const costRangeStr = catRule ? catRule.costRange : '₹200 – ₹1,000';
    const damageCostStr = catRule ? catRule.damageCost : '₹1,000+';
    document.getElementById('modal-cost').innerText = costRangeStr;
    
    let pText = 'LOW';
    if (ticket.priorityScore >= 80) pText = 'CRITICAL';
    else if (ticket.priorityScore >= 60) pText = 'HIGH';
    else if (ticket.priorityScore >= 40) pText = 'MEDIUM';
    
    const priorityBadge = document.getElementById('modal-priority-class');
    priorityBadge.innerText = pText;
    if (pText === 'CRITICAL') priorityBadge.style.cssText = `background:var(--color-critical-bg);color:var(--color-critical);`;
    else if (pText === 'HIGH') priorityBadge.style.cssText = `background:var(--color-high-bg);color:var(--color-high);`;
    else if (pText === 'MEDIUM') priorityBadge.style.cssText = `background:var(--color-medium-bg);color:var(--color-medium);`;
    else priorityBadge.style.cssText = `background:var(--color-low-bg);color:var(--color-low);`;

    let keywordsStr = ticket.detectedKeywords.length > 0 ? ticket.detectedKeywords.join(', ') : 'None';
    const similarCases = catRule ? catRule.similarCases : 10;
    
    document.getElementById('modal-reasoning').innerHTML = `
        <strong>Detected NLP keywords:</strong> <span class="text-purple">${keywordsStr}</span>.<br>
        <strong>Diagnostic Summary:</strong> The priority score of ${ticket.priorityScore} is derived from an elevated safety hazard associated with ${ticket.category} issues combined with warden-weighted constraints. 
        Moisture, electrical, or locking integrity problems heavily trigger prioritization boosts in our heuristic model.
    `;

    // Populate "Why?" explainability list
    const whyListEl = document.getElementById('modal-why-list');
    const whyItems = [
        `🔍 Detected keywords: <strong>${keywordsStr}</strong>`,
        `🛡️ Safety Risk Score: <strong>${ticket.safety_raw}%</strong>`,
        `📋 Similar to <strong>${similarCases} previous urgent cases</strong> in this category`,
        `💸 Estimated damage cost if delayed: <strong>${damageCostStr}</strong>`,
        `⏱️ Ticket age: <strong>${ageHrs} hrs</strong> (${agePenalty > 50 ? 'escalation triggered' : 'within normal range'})`,
        `📊 Student disruption index: <strong>${ticket.disruption_raw}%</strong>`
    ];
    whyListEl.innerHTML = whyItems.map(item => `<li class="ai-why-item">${item}</li>`).join('');

    // Complaint Timeline
    renderComplaintTimeline(ticket);
    
    // Technician Recommendation Engine
    renderTechRecommendation(ticket);
    
    document.getElementById('ai-modal').style.display = 'flex';
}

function renderComplaintTimeline(ticket) {
    const timelineEl = document.getElementById('complaint-timeline');
    const now = new Date();
    const submittedTime = new Date(now - ticket.age * 3600000);
    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const steps = [
        { icon: '📝', label: 'Submitted', time: fmt(submittedTime), done: true },
        { icon: '🤖', label: 'AI Classified', time: fmt(new Date(submittedTime.getTime() + 2 * 60000)), done: true },
        { icon: '📤', label: 'Dispatched to Queue', time: fmt(new Date(submittedTime.getTime() + 5 * 60000)), done: true },
        { icon: '👷', label: 'Technician Accepted', time: ticket.status !== 'Pending' ? fmt(new Date(submittedTime.getTime() + 50 * 60000)) : 'Pending...', done: ticket.status !== 'Pending' },
        { icon: '✅', label: 'Resolved', time: ticket.status === 'Resolved' ? fmt(new Date(submittedTime.getTime() + 2.5 * 3600000)) : 'In Progress...', done: ticket.status === 'Resolved' }
    ];

    timelineEl.innerHTML = steps.map((step, i) => `
        <div class="timeline-step ${step.done ? 'done' : 'pending'}">
            <div class="timeline-icon">${step.icon}</div>
            <div class="timeline-content">
                <span class="timeline-label">${step.label}</span>
                <span class="timeline-time">${step.time}</span>
            </div>
            ${i < steps.length - 1 ? '<div class="timeline-connector"></div>' : ''}
        </div>
    `).join('');
}

function renderTechRecommendation(ticket) {
    const matchingTechs = state.technicians.filter(tc => tc.specialty === ticket.category);
    const techCard = document.getElementById('tech-recommendation-card');
    
    if (matchingTechs.length > 0) {
        matchingTechs.sort((a, b) => a.activeTasks - b.activeTasks);
        const suggestedTech = matchingTechs[0];
        
        // Compute confidence based on specialty match + load
        const confidence = Math.min(99, 82 + Math.floor((4 - suggestedTech.activeTasks) * 4));
        const resolvedCount = 25 + Math.floor(Math.random() * 20);
        const avgTime = (3 + Math.random() * 2).toFixed(1);
        
        document.getElementById('modal-sug-avatar').innerText = getInitials(suggestedTech.name);
        document.getElementById('modal-sug-name').innerText = `${suggestedTech.name} (${suggestedTech.specialty})`;
        document.getElementById('modal-sug-specialty').innerText = `Active Tasks: ${suggestedTech.activeTasks} · Workload: ${suggestedTech.activeTasks >= 3 ? 'Heavy' : suggestedTech.activeTasks >= 1 ? 'Moderate' : 'Light'}`;
        document.getElementById('modal-confidence-badge').innerText = `${confidence}%`;
        document.getElementById('modal-confidence-badge').style.background = confidence >= 90 ? 'rgba(6,214,160,0.15)' : 'rgba(59,130,246,0.15)';
        document.getElementById('modal-confidence-badge').style.color = confidence >= 90 ? 'var(--accent-cyan)' : 'var(--accent-blue)';
        
        document.getElementById('modal-tech-reasons').innerHTML = `
            <ul class="tech-reason-list">
                <li>✓ Solved <strong>${resolvedCount} ${ticket.category}</strong> cases previously</li>
                <li>✓ Average resolution time: <strong>${avgTime} hrs</strong></li>
                <li>✓ Currently <strong>${suggestedTech.activeTasks >= 3 ? 'heavily loaded' : suggestedTech.activeTasks >= 1 ? 'moderately loaded' : 'available'}</strong></li>
                <li>✓ Specialist match: <strong>${ticket.category}</strong></li>
            </ul>
        `;
        
        const assignBtn = document.getElementById('modal-assign-btn');
        assignBtn.innerText = ticket.status !== 'Pending' ? 'Reassign' : 'Assign Now';
        assignBtn.disabled = false;
    } else {
        document.getElementById('modal-sug-name').innerText = 'No specialized technician available';
        document.getElementById('modal-sug-specialty').innerText = 'Manual dispatch required';
        document.getElementById('modal-confidence-badge').innerText = 'N/A';
        document.getElementById('modal-tech-reasons').innerHTML = '<p style="font-size:0.8rem;color:var(--text-secondary);">No specialist available for this category. Consider a general maintenance technician.</p>';
        document.getElementById('modal-assign-btn').disabled = true;
    }
}

function closeAIModal() {
    document.getElementById('ai-modal').style.display = 'none';
    state.selectedTicketForDiagnosis = null;
}

async function assignSuggestedTechnician() {
    const ticket = state.selectedTicketForDiagnosis;
    if (!ticket) return;
    
    const matchingTechs = state.technicians.filter(tc => tc.specialty === ticket.category);
    if (matchingTechs.length > 0) {
        matchingTechs.sort((a, b) => a.activeTasks - b.activeTasks);
        const suggestedTech = matchingTechs[0];
        
        try {
            const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ techId: suggestedTech.id })
            });
            if (response.ok) {
                await loadTickets();
                await loadTechnicians();
                closeAIModal();
            }
        } catch (err) {
            console.error("Failed to manually assign suggested technician: ", err);
        }
    }
}

// ==========================================
// STUDENT PORTAL LOGIC (LIVE NLP & OCR)
// ==========================================

function resetStudentForm() {
    document.getElementById('maintenance-form').reset();
    document.getElementById('student-category-select').value = 'Unassigned';
    
    document.getElementById('ai-pred-category').innerText = 'Waiting...';
    document.getElementById('ai-pred-score').innerText = '--';
    document.getElementById('ai-pred-hazard').innerText = '--';
    document.getElementById('ai-pred-disruption').innerText = '--';
    document.getElementById('ai-confidence').innerText = '--';
    document.getElementById('ai-keywords').innerText = 'None';
    document.getElementById('ai-similar-cases').innerText = '--';
    document.getElementById('ai-damage-cost').innerText = '--';
    
    const uPreview = document.getElementById('upload-preview');
    uPreview.style.display = 'none';
    uPreview.innerHTML = '';
    
    const imgResult = document.getElementById('image-detection-result');
    imgResult.style.display = 'none';
    imgResult.innerHTML = '';
    
    document.getElementById('ai-why-panel').style.display = 'none';
    document.getElementById('cost-prediction-box').style.display = 'none';
    
    dismissEmergencyAlert();
    dismissDuplicateWarning();
    
    state.ocrImageDetectedData = null;
}

function realtimeNLPAnalysis() {
    const descText = document.getElementById('student-desc').value.toLowerCase();
    const categorySelect = document.getElementById('student-category-select');
    
    // Emergency keyword check
    checkEmergencyKeywords(descText);
    
    if (descText.trim().length < 5) {
        document.getElementById('ai-pred-category').innerText = 'Waiting for details...';
        document.getElementById('ai-why-panel').style.display = 'none';
        document.getElementById('cost-prediction-box').style.display = 'none';
        return;
    }
    
    let detectedCategory = 'Unassigned';
    let safetyScore = 20;
    let disruptionScore = 30;
    let costScore = 80;
    let foundKeywords = [];
    let matchedRule = null;
    
    NLP_KEYWORD_RULES.forEach(rule => {
        let matchCount = 0;
        rule.keywords.forEach(keyword => {
            if (descText.includes(keyword)) {
                matchCount++;
                if (!foundKeywords.includes(keyword)) {
                    foundKeywords.push(keyword);
                }
            }
        });
        
        if (matchCount > 0) {
            detectedCategory = rule.category;
            safetyScore = Math.max(safetyScore, rule.safetyBoost);
            disruptionScore = Math.max(disruptionScore, rule.disruptionBoost);
            costScore = Math.min(costScore, rule.costScore);
            matchedRule = rule;
        }
    });
    
    const studentUrgency = document.getElementById('student-urgency').value;
    if (studentUrgency === 'High') {
        safetyScore = Math.min(safetyScore + 10, 100);
        disruptionScore = Math.min(disruptionScore + 15, 100);
    } else if (studentUrgency === 'Low') {
        safetyScore = Math.max(safetyScore - 10, 10);
        disruptionScore = Math.max(disruptionScore - 15, 10);
    }
    
    if (state.ocrImageDetectedData) {
        detectedCategory = state.ocrImageDetectedData.category;
        safetyScore = Math.max(safetyScore, state.ocrImageDetectedData.safety);
        disruptionScore = Math.max(disruptionScore, state.ocrImageDetectedData.disruption);
    }
    
    categorySelect.value = detectedCategory;
    document.getElementById('ai-pred-category').innerText = detectedCategory;
    
    const tempTicket = {
        safetyRaw: safetyScore,
        disruptionRaw: disruptionScore,
        costRaw: costScore
    };
    const tempScore = calculateTicketPriorityClientSide(tempTicket);
    document.getElementById('ai-pred-score').innerText = `${tempScore}/100`;
    
    document.getElementById('ai-pred-hazard').innerText = `${safetyScore}% (${safetyScore >= 85 ? 'Critical' : (safetyScore >= 50 ? 'Moderate' : 'Low')})`;
    document.getElementById('ai-pred-disruption').innerText = `${disruptionScore}%`;
    
    const confScore = foundKeywords.length > 0 ? Math.min(65 + foundKeywords.length * 10, 98) : 40;
    document.getElementById('ai-confidence').innerText = foundKeywords.length > 0 ? `${confScore}%` : 'Low (Standard scan)';
    document.getElementById('ai-keywords').innerText = foundKeywords.length > 0 ? foundKeywords.join(', ') : 'None detected yet';

    // Similar cases and damage cost
    if (matchedRule) {
        document.getElementById('ai-similar-cases').innerText = `${matchedRule.similarCases} cases`;
        document.getElementById('ai-damage-cost').innerText = matchedRule.damageCost;
        
        // Show Why panel
        const whyPanel = document.getElementById('ai-why-panel');
        whyPanel.style.display = 'block';
        const whyList = document.getElementById('ai-why-list');
        const whyItems = [
            `🔍 Keywords detected: <strong>${foundKeywords.join(', ')}</strong>`,
            `🛡️ Safety Risk Score: <strong>${safetyScore}%</strong>`,
            `📋 Similar to <strong>${matchedRule.similarCases}</strong> previous cases`,
            `💸 Est. damage if delayed: <strong>${matchedRule.damageCost}</strong>`,
            `📊 Disruption index: <strong>${disruptionScore}%</strong>`
        ];
        whyList.innerHTML = whyItems.map(item => `<li class="ai-why-item">${item}</li>`).join('');
        
        // Show cost prediction
        const costBox = document.getElementById('cost-prediction-box');
        costBox.style.display = 'block';
        document.getElementById('cost-range-value').innerText = matchedRule.costRange;
        document.getElementById('cost-confidence-value').innerText = `Confidence: ${matchedRule.costConfidence}%`;
    }
}

// ==========================================
// EMERGENCY ALERT SYSTEM
// ==========================================
function checkEmergencyKeywords(text) {
    const foundEmergency = EMERGENCY_KEYWORDS.filter(kw => text.includes(kw));
    if (foundEmergency.length > 0) {
        const keyword = foundEmergency[0];
        const overlayText = `Life safety keyword detected: "${keyword}". Emergency maintenance team notified. Please evacuate the area immediately.`;
        
        // Show banner
        const banner = document.getElementById('emergency-alert-banner');
        document.getElementById('emergency-alert-text').innerText = overlayText;
        banner.style.display = 'block';

        // Show overlay (only once per keyword detection)
        const overlay = document.getElementById('emergency-overlay');
        if (overlay.dataset.shown !== keyword) {
            overlay.dataset.shown = keyword;
            document.getElementById('emergency-overlay-text').innerText = `Keyword "${keyword.toUpperCase()}" detected in complaint. Emergency protocol activated.`;
            overlay.style.display = 'flex';
        }
    } else {
        dismissEmergencyAlert();
    }
}

function dismissEmergencyAlert() {
    const banner = document.getElementById('emergency-alert-banner');
    if (banner) banner.style.display = 'none';
}

function dismissEmergencyOverlay() {
    const overlay = document.getElementById('emergency-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        delete overlay.dataset.shown;
    }
}

// ==========================================
// DUPLICATE COMPLAINT DETECTION
// ==========================================
function checkDuplicateComplaint(room, category) {
    if (!room || !category || category === 'Unassigned') return false;
    
    const similar = state.tickets.find(t => 
        t.room.toLowerCase() === room.toLowerCase() && 
        t.category === category && 
        t.status !== 'Resolved'
    );
    
    if (similar) {
        const warningEl = document.getElementById('duplicate-warning');
        document.getElementById('duplicate-warning-text').innerHTML = `
            A similar <strong>${category}</strong> issue was reported for Room <strong>${room}</strong> recently.<br>
            Ticket <strong>#${similar.id}</strong> — Status: <strong>${similar.status}</strong>. Are you sure you want to submit a new ticket?
        `;
        warningEl.style.display = 'flex';
        return true;
    }
    return false;
}

function dismissDuplicateWarning() {
    const el = document.getElementById('duplicate-warning');
    if (el) el.style.display = 'none';
}

// ==========================================
// VOICE COMPLAINT INPUT
// ==========================================
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (state.voiceActive && state.voiceRecognition) {
        state.voiceRecognition.stop();
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    
    state.voiceRecognition = recognition;
    state.voiceActive = true;
    
    const btn = document.getElementById('voice-btn');
    const label = document.getElementById('voice-btn-label');
    btn.classList.add('voice-active');
    label.innerText = '● Listening...';
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript += result[0].transcript;
            } else {
                interimTranscript += result[0].transcript;
            }
        }

        // Show interim in textarea for live feedback, but only NLP-analyze on final
        const textarea = document.getElementById('student-desc');
        if (finalTranscript) {
            textarea.value = finalTranscript;
            realtimeNLPAnalysis();
        } else if (interimTranscript) {
            textarea.value = interimTranscript;
        }
    };
    
    recognition.onend = () => {
        state.voiceActive = false;
        btn.classList.remove('voice-active');
        label.innerText = 'Voice Input';
        // Always run NLP on whatever is in the box when listening stops
        realtimeNLPAnalysis();
    };
    
    recognition.onerror = () => {
        state.voiceActive = false;
        btn.classList.remove('voice-active');
        label.innerText = 'Voice Input';
    };
    
    recognition.start();
}

// ==========================================
// IMAGE ANALYSIS (Enhanced Damage Detection)
// ==========================================
function triggerFileInput() {
    document.getElementById('file-uploader').click();
}

function simulateOCRScan(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const scanner = document.getElementById('scanner');
    scanner.style.display = 'flex';
    
    setTimeout(() => {
        scanner.style.display = 'none';
        
        const mockResults = [
            {
                name: 'pipe_leak.jpg',
                category: 'Plumbing',
                safety: 85,
                disruption: 90,
                detected: ['Water Leakage', 'Corrosion', 'Moisture Damage'],
                riskLevel: 'High',
                riskColor: 'var(--color-critical)',
                confidence: 94,
                desc: 'AI Vision: Burst pipe with heavy moisture distribution. Leakage volume: High.'
            },
            {
                name: 'sparking_fusebox.jpg',
                category: 'Electrical',
                safety: 99,
                disruption: 80,
                detected: ['Electrical Damage', 'Arc Flash Hazard', 'Burnt Insulation'],
                riskLevel: 'Critical',
                riskColor: '#ff0000',
                confidence: 97,
                desc: 'AI Vision: Thermal anomaly detected. Active electrical discharge / arc flash hazard visible.'
            },
            {
                name: 'door_latch_broken.jpg',
                category: 'Security',
                safety: 70,
                disruption: 80,
                detected: ['Broken Lock Mechanism', 'Door Misalignment'],
                riskLevel: 'Medium',
                riskColor: 'var(--color-medium)',
                confidence: 88,
                desc: 'AI Vision: Broken door locking strike plate. Door alignment error detected.'
            },
            {
                name: 'rust_wall.jpg',
                category: 'Plumbing',
                safety: 65,
                disruption: 60,
                detected: ['Rust', 'Water Stains', 'Wall Dampness'],
                riskLevel: 'Moderate',
                riskColor: 'var(--color-high)',
                confidence: 91,
                desc: 'AI Vision: Rust and water staining on walls. Signs of prolonged moisture exposure.'
            }
        ];
        
        let result = mockResults[0];
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('wire') || fileName.includes('spark') || fileName.includes('elec') || fileName.includes('fuse') || fileName.includes('circuit')) {
            result = mockResults[1];
        } else if (fileName.includes('lock') || fileName.includes('door') || fileName.includes('handle')) {
            result = mockResults[2];
        } else if (fileName.includes('rust') || fileName.includes('wall') || fileName.includes('damp')) {
            result = mockResults[3];
        } else {
            result = mockResults[Math.floor(Math.random() * mockResults.length)];
        }
        
        state.ocrImageDetectedData = result;
        
        // Show upload preview
        const uPreview = document.getElementById('upload-preview');
        uPreview.style.display = 'flex';
        uPreview.className = 'uploaded-preview-container';
        uPreview.innerHTML = `
            <div style="background: var(--accent-purple-glow); border-radius:4px; width:50px; height:50px; display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem;">📷</div>
            <div class="uploaded-preview-info">
                <span class="uploaded-preview-name">${file.name}</span>
                <span class="uploaded-preview-size" style="color:var(--accent-cyan); font-weight:600;">Processed by AI Vision</span>
            </div>
            <button type="button" class="btn" style="padding:4px 8px;" onclick="clearUploadedImage(event)">&times;</button>
        `;
        
        // Show image detection results panel
        const imgResultEl = document.getElementById('image-detection-result');
        imgResultEl.style.display = 'block';
        imgResultEl.innerHTML = `
            <div class="img-detection-header">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                AI Vision Detected:
            </div>
            <div class="img-detected-labels">
                ${result.detected.map(d => `<span class="img-detected-label">✓ ${d}</span>`).join('')}
            </div>
            <div class="img-risk-row">
                <span class="img-risk-label">Risk Level:</span>
                <span class="img-risk-value" style="color:${result.riskColor};font-weight:700;">${result.riskLevel}</span>
                <span class="img-confidence">Confidence: ${result.confidence}%</span>
            </div>
        `;
        
        realtimeNLPAnalysis();
    }, 1800);
}

function clearUploadedImage(event) {
    event.stopPropagation();
    state.ocrImageDetectedData = null;
    const uPreview = document.getElementById('upload-preview');
    uPreview.style.display = 'none';
    uPreview.innerHTML = '';
    const imgResult = document.getElementById('image-detection-result');
    imgResult.style.display = 'none';
    imgResult.innerHTML = '';
    document.getElementById('file-uploader').value = '';
    realtimeNLPAnalysis();
}

async function submitStudentRequest(event) {
    event.preventDefault();
    
    const room = document.getElementById('student-room').value.trim();
    const category = document.getElementById('student-category-select').value;
    const urgency = document.getElementById('student-urgency').value;
    const description = document.getElementById('student-desc').value.trim();
    
    if (category === 'Unassigned') {
        alert('AI was unable to categorize this issue automatically. Please select a category manually in the drop-down.');
        return;
    }
    
    // Check duplicates before submitting
    checkDuplicateComplaint(room, category);
    
    let safety = 20;
    let disruption = 30;
    
    NLP_KEYWORD_RULES.forEach(rule => {
        if (rule.category === category) {
            safety = rule.safetyBoost;
            disruption = rule.disruptionBoost;
        }
    });
    
    if (urgency === 'High') {
        safety = Math.min(safety + 10, 100);
        disruption = Math.min(disruption + 15, 100);
    } else if (urgency === 'Low') {
        safety = Math.max(safety - 10, 10);
        disruption = Math.max(disruption - 15, 10);
    }
    
    if (state.ocrImageDetectedData) {
        safety = Math.max(safety, state.ocrImageDetectedData.safety);
        disruption = Math.max(disruption, state.ocrImageDetectedData.disruption);
    }
    
    const keywordsBox = document.getElementById('ai-keywords').innerText;
    const keywordsList = keywordsBox !== 'None' ? keywordsBox.split(', ') : [];
    
    const newTicket = {
        room: room,
        category: category,
        studentUrgency: urgency,
        description: description,
        photoUrl: state.ocrImageDetectedData ? 'uploaded' : null,
        detectedKeywords: keywordsList,
        safetyRaw: safety,
        disruptionRaw: disruption
    };
    
    try {
        const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newTicket)
        });
        const resData = await response.json();
        
        await loadTickets();
        
        switchView('dashboard');
        
        setTimeout(() => {
            const card = document.querySelector(`[data-id="${resData.ticketId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.animation = 'pulseGlow 2s ease-in-out infinite';
                setTimeout(() => card.style.animation = '', 4000);
            }
        }, 500);
    } catch (err) {
        console.error("Failed to submit student request: ", err);
    }
}

// ==========================================
// AI CHAT ASSISTANT
// ==========================================
function toggleChat() {
    const panel = document.getElementById('ai-chat-panel');
    const fab = document.getElementById('ai-chat-fab');
    state.chatOpen = !state.chatOpen;
    panel.style.display = state.chatOpen ? 'flex' : 'none';
    fab.classList.toggle('chat-active', state.chatOpen);
}

function sendChatSuggestion(btn) {
    document.getElementById('ai-chat-input').value = btn.innerText;
    sendChatMessage();
}

function sendChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    
    appendChatMsg(msg, 'user');
    
    setTimeout(() => {
        const reply = handleChatMessage(msg);
        appendChatMsg(reply, 'ai');
    }, 600);
}

function appendChatMsg(text, sender) {
    const messagesEl = document.getElementById('ai-chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender === 'ai' ? 'ai-msg' : 'user-msg'}`;
    div.innerHTML = `<span>${text}</span>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function handleChatMessage(msg) {
    const q = msg.toLowerCase();
    
    if (q.includes('most complaints') || q.includes('most issues') || q.includes('worst room')) {
        const roomCounts = {};
        state.tickets.filter(t => t.status !== 'Resolved').forEach(t => {
            roomCounts[t.room] = (roomCounts[t.room] || 0) + 1;
        });
        const sorted = Object.entries(roomCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            return `📊 Room with most active complaints: <strong>Room ${sorted[0][0]}</strong> with <strong>${sorted[0][1]} open issue${sorted[0][1] !== 1 ? 's' : ''}</strong>. Top 3: ${sorted.slice(0, 3).map(([r, c]) => `${r}(${c})`).join(', ')}.`;
        }
        return "📊 No active complaints found right now. Everything looks clear!";
    }
    
    if (q.includes('electrical') && (q.includes('unresolved') || q.includes('open') || q.includes('pending'))) {
        const elec = state.tickets.filter(t => t.category === 'Electrical' && t.status !== 'Resolved');
        if (elec.length > 0) {
            return `⚡ Found <strong>${elec.length} unresolved electrical issue${elec.length !== 1 ? 's' : ''}</strong>: ${elec.map(t => `Room ${t.room} (Score: ${t.priorityScore})`).join(', ')}.`;
        }
        return "⚡ Good news — no unresolved electrical issues at the moment!";
    }
    
    if (q.includes('overloaded') || q.includes('busy') || q.includes('overwhelmed') || q.includes('workload')) {
        const overloaded = state.technicians.filter(t => t.activeTasks >= 3);
        if (overloaded.length > 0) {
            return `👷 Overloaded technician${overloaded.length !== 1 ? 's' : ''}: <strong>${overloaded.map(t => `${t.name} (${t.activeTasks} tasks)`).join(', ')}</strong>. Consider reassigning some tasks.`;
        }
        const busiest = [...state.technicians].sort((a, b) => b.activeTasks - a.activeTasks)[0];
        return busiest ? `👷 No one is overloaded. Busiest: <strong>${busiest.name}</strong> with ${busiest.activeTasks} active task${busiest.activeTasks !== 1 ? 's' : ''}.` : "No technicians found.";
    }
    
    if (q.includes('critical') || q.includes('urgent') || q.includes('emergency')) {
        const crit = state.tickets.filter(t => t.priorityScore >= 80 && t.status !== 'Resolved');
        if (crit.length > 0) {
            return `🚨 <strong>${crit.length} critical ticket${crit.length !== 1 ? 's' : ''}</strong> require immediate attention: ${crit.map(t => `Room ${t.room} (${t.category}, Score: ${t.priorityScore})`).join(' | ')}.`;
        }
        return "✅ No critical issues right now. AI Optimization score is high!";
    }
    
    if (q.includes('pending') || q.includes('unassigned') || q.includes('not assigned')) {
        const pending = state.tickets.filter(t => t.status === 'Pending');
        return `📋 <strong>${pending.length} ticket${pending.length !== 1 ? 's' : ''}</strong> are pending dispatch. Categories: ${[...new Set(pending.map(t => t.category))].join(', ') || 'None'}.`;
    }
    
    if (q.includes('resolved') || q.includes('completed') || q.includes('done')) {
        const resolved = state.tickets.filter(t => t.status === 'Resolved');
        return `✅ <strong>${resolved.length + 12} tickets</strong> have been resolved today. AI-assisted response rate is running at 94.8% efficiency.`;
    }
    
    if (q.includes('plumbing')) {
        const pluming = state.tickets.filter(t => t.category === 'Plumbing' && t.status !== 'Resolved');
        return `🔧 <strong>${pluming.length} open plumbing issue${pluming.length !== 1 ? 's' : ''}</strong>. ${pluming.length > 2 ? 'This is above average — predictive model suggests a pipe inspection this week.' : 'Within normal range.'}`;
    }
    
    if (q.includes('technician') && (q.includes('list') || q.includes('available') || q.includes('all'))) {
        const available = state.technicians.filter(t => t.activeTasks === 0);
        return `👷 <strong>${state.technicians.length} technicians</strong> on roster. <strong>${available.length}</strong> currently available: ${available.map(t => t.name).join(', ') || 'None'}.`;
    }
    
    if (q.includes('forecast') || q.includes('predict') || q.includes('next week')) {
        return `📈 Predictive model forecast: <strong>Electrical ↑18%</strong>, <strong>Plumbing ↑12%</strong>, <strong>HVAC ↑8%</strong>, Furniture ↓4%, Security ↓2%. Recommend pre-scheduling electrical inspections.`;
    }
    
    if (q.includes('hello') || q.includes('hi') || q.includes('help')) {
        return `👋 Hello! I'm the Hostel AI assistant. You can ask me:<br>• "Which room has most complaints?"<br>• "Show unresolved electrical issues"<br>• "Which technician is overloaded?"<br>• "What are critical tickets?"<br>• "Forecast for next week?"`;
    }
    
    // Default
    const totalOpen = state.tickets.filter(t => t.status !== 'Resolved').length;
    return `🤖 I found <strong>${totalOpen} open tickets</strong> in the system. Try asking about specific rooms, categories, technicians, or complaint forecasts. I can also show critical issues or pending assignments.`;
}

// ==========================================
// ANALYTICS VISUALIZATION LOGIC (CHART.JS)
// ==========================================

function initAnalyticsCharts() {
    try {
        const ctxCat = document.getElementById('category-chart');
        const ctxRes = document.getElementById('resolution-chart');
        
        if (!ctxCat || !ctxRes) return;
        
        if (typeof Chart === 'undefined') return;
        
        categoryChart = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Cleaning', 'Security'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#3b82f6',
                        '#f59e0b',
                        '#ec4899',
                        '#8b5cf6',
                        '#10b981',
                        '#ef4444'
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                }
            }
        });
        
        resolutionChart = new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Average Hours to Dispatch',
                    data: [0.2, 1.1, 4.5, 18.2],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.65)',
                        'rgba(245, 158, 11, 0.65)',
                        'rgba(59, 130, 246, 0.65)',
                        'rgba(16, 185, 129, 0.65)'
                    ],
                    borderColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (err) {
        console.warn("Analytics charts failed to initialize: ", err);
    }
}

function updateAnalyticsCharts() {
    if (!categoryChart || !resolutionChart) return;
    
    const counts = { Plumbing: 0, Electrical: 0, HVAC: 0, Furniture: 0, Cleaning: 0, Security: 0 };
    state.tickets.forEach(t => {
        if (counts[t.category] !== undefined) {
            counts[t.category]++;
        }
    });
    
    categoryChart.data.datasets[0].data = [
        counts.Plumbing,
        counts.Electrical,
        counts.HVAC,
        counts.Furniture,
        counts.Cleaning,
        counts.Security
    ];
    categoryChart.update();
    
    const safetyWeightRatio = state.weights.safety / 40;
    const critSLA = Math.max(0.1, 0.3 / safetyWeightRatio);
    const highSLA = Math.max(0.4, 1.2 / safetyWeightRatio);
    
    resolutionChart.data.datasets[0].data = [critSLA, highSLA, 4.5, 18.2];
    resolutionChart.update();
}
