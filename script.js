/**
 * Galactic Diplomacy - v3.2 Master A1
 * Auditoría forense completada. Código refactorizado para máxima robustez y rendimiento.
 */
class GameEngine {
    constructor(config) {
        this.config = config;
        this.state = this.getInitialState();
        this.tonConnectUI = null;
        this.dom = {
            root: document.getElementById('game-container'),
            loadingScreen: document.getElementById('loading-screen'),
        };
        // Referencias a elementos que se actualizan frecuentemente para evitar búsquedas repetidas en el DOM
        this.ui_refs = {};
        this.init();
    }

    // --- 1. INICIALIZACIÓN Y CICLO DE VIDA ---
    init() {
        this.initializeTonConnect();
        this.loadGame();
        this.bindEventListeners();
        
        setTimeout(() => {
            this.dom.loadingScreen.classList.add('hidden');
            this.renderFullUI(); // Renderizado inicial completo
            this.startPassiveIncome();
            this.startAutoSave();
        }, 1500);
    }

    initializeTonConnect() {
        const manifestUrl = 'https://mang369.github.io/peace-kombat/tonconnect-manifest.json';
        this.tonConnectUI = new TonConnectUI({ manifestUrl });
        this.tonConnectUI.onStatusChange(wallet => {
            this.state.wallet.connected = !!wallet;
            this.state.wallet.address = wallet ? TonConnectSDK.toUserFriendlyAddress(wallet.account.address) : null;
            this.renderHeader(); // Solo renderiza el header al cambiar la billetera
        });
    }

    getInitialState() {
        return {
            totalInfluence: 0, influencePerHour: 0, influencePerTap: 1, totalTaps: 0,
            totalInfluenceGenerated: 0, startDate: new Date().toISOString(), lastSaved: new Date().toISOString(),
            upgrades: {}, wallet: { connected: false, address: null }, activeView: 'tapper'
        };
    }

    bindEventListeners() {
        this.dom.root.addEventListener('click', this.handleGlobalClick.bind(this));
        window.addEventListener('beforeunload', () => this.saveGame());
    }

    startPassiveIncome() { setInterval(() => this.passiveIncomeTick(), 1000); }
    startAutoSave() { setInterval(() => this.saveGame(), 15000); }

    // --- 2. MANEJO DE EVENTOS ---
    handleGlobalClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;
        const { action, payload } = actionTarget.dataset;

        switch (action) {
            case 'handle-tap': this.handleTap(); break;
            case 'purchase-upgrade': this.purchaseUpgrade(payload); break;
            case 'switch-view': this.switchView(payload); break;
        }
    }

    // --- 3. LÓGICA DEL JUEGO (MODIFICADORES DE ESTADO) ---
    handleTap() {
        this.state.totalInfluence += this.state.influencePerTap;
        this.state.totalTaps++;
        this.state.totalInfluenceGenerated += this.state.influencePerTap;
        this.showFloatingNumber(this.state.influencePerTap);
        this.updateUICounters(); // Actualización ligera, sin re-renderizar todo
    }

    passiveIncomeTick() {
        if (this.state.influencePerHour > 0) {
            const influenceFromPassive = this.state.influencePerHour / 3600;
            this.state.totalInfluence += influenceFromPassive;
            this.state.totalInfluenceGenerated += influenceFromPassive;
            this.updateUICounters(); // Actualización ligera
        }
    }

    purchaseUpgrade(id) {
        if (!id) return;
        const upgradeInfo = this.config.upgrades[id];
        const level = this.state.upgrades[id] || 0;
        const cost = this.calculateCost(upgradeInfo.baseCost, level);
        if (this.state.totalInfluence >= cost) {
            this.state.totalInfluence -= cost;
            this.state.upgrades[id] = level + 1;
            this.recalculateInfluencePerHour();
            this.renderMainContent(); // Re-renderiza la vista de mejoras
        }
    }

    switchView(view) {
        if (view && this.state.activeView !== view) {
            this.state.activeView = view;
            this.renderMainContent();
            this.renderNav();
        }
    }

    // --- 4. RENDERIZADO (MANIPULACIÓN DE VISTA) ---
    renderFullUI() {
        this.dom.root.innerHTML = `<div id="header-container"></div><div class="main-content" id="main-content-container"></div><nav class="game-nav" id="nav-container"></nav>`;
        this.renderHeader();
        this.renderMainContent();
        this.renderNav();
    }
    
    renderHeader() { /* ... Contenido idéntico a la versión anterior ... */ }
    renderMainContent() { /* ... Contenido idéntico a la versión anterior ... */ }
    renderNav() { /* ... Contenido idéntico a la versión anterior ... */ }
    getTapperViewHTML() { /* ... Contenido idéntico a la versión anterior ... */ }
    getUpgradesViewHTML() { /* ... Contenido idéntico a la versión anterior ... */ }
    getStatsViewHTML() { /* ... Contenido idéntico a la versión anterior ... */ }

    // Función de actualización ligera para contadores
    updateUICounters() {
        if (this.ui_refs.totalInfluenceDisplay) {
            this.ui_refs.totalInfluenceDisplay.textContent = this.formatNumber(this.state.totalInfluence);
        }
        if (this.ui_refs.influencePerHourDisplay) {
            this.ui_refs.influencePerHourDisplay.textContent = this.formatNumber(this.state.influencePerHour);
        }
    }

    // --- 5. UTILIDADES Y CÁLCULOS ---
    calculateCost = (baseCost, level) => Math.floor(baseCost * Math.pow(1.18, level));
    recalculateInfluencePerHour() { this.state.influencePerHour = Object.keys(this.state.upgrades).reduce((t, id) => t + ((this.state.upgrades[id] || 0) * this.config.upgrades[id].baseInfluence), 0); }
    formatNumber(n = 0) { if (n < 1e3) return n.toFixed(0); const s = ["", "K", "M", "B", "T"], i = Math.floor(Math.log10(n) / 3); return `${(n / 1e3 ** i).toFixed(2).replace(/\.00$|\.0$/, "")}${s[i]}`; }
    showFloatingNumber(v) { const t = document.getElementById("tapper-zone"); if (!t) return; const e = document.createElement("div"); e.className = "floating-number"; e.textContent = `+${this.formatNumber(v)}`; t.appendChild(e); setTimeout(() => e.remove(), 1500); }

    // --- 6. PERSISTENCIA DE DATOS (REFORZADA) ---
    saveGame() {
        this.state.lastSaved = new Date().toISOString();
        try { localStorage.setItem('galacticDiplomacySave_v1', JSON.stringify(this.state)); } catch (e) { console.error("Error al guardar la partida:", e); }
    }
    loadGame() {
        try {
            const savedData = localStorage.getItem('galacticDiplomacySave_v1');
            if (!savedData) return;
            const loadedState = JSON.parse(savedData);
            const lastSaved = loadedState.lastSaved || loadedState.startDate;
            const offlineSeconds = Math.max(0, (new Date().getTime() - new Date(lastSaved).getTime()) / 1000);
            const offlineInfluence = ((loadedState.influencePerHour || 0) / 3600) * offlineSeconds;
            
            loadedState.totalInfluence = (loadedState.totalInfluence || 0) + offlineInfluence;
            loadedState.totalInfluenceGenerated = (loadedState.totalInfluenceGenerated || 0) + offlineInfluence;
            
            this.state = { ...this.getInitialState(), ...loadedState };
        } catch (e) {
            console.error("Error al cargar la partida. Empezando de nuevo.", e);
            localStorage.removeItem('galacticDiplomacySave_v1');
        }
        this.recalculateInfluencePerHour();
    }
}

// === CÓDIGO RESTANTE DEL SCRIPT (Renderizado, Config, etc. Idéntico a la versión anterior) ===
GameEngine.prototype.renderHeader = function() { const c=document.getElementById("header-container"); if(!c)return; const {wallet:w}=this.state,a=w.address,t=w.connected?`${a.substring(0,4)}...${a.substring(a.length-4)}`:"Desconectado"; c.innerHTML=`<header class="game-header"><div class="player-info"><span class="header-icon">🧑‍🚀</span><div class="player-details"><span>Diplomático Galáctico</span><span class="wallet-info ${w.connected?"connected":""}">${t}</span></div></div><div id="ton-connect-wallet-btn"></div></header>`, this.tonConnectUI.setTargetElement(document.getElementById("ton-connect-wallet-btn")) };
GameEngine.prototype.renderMainContent = function() { const c=document.getElementById("main-content-container"); if(!c)return; switch(this.state.activeView){case"upgrades":c.innerHTML=this.getUpgradesViewHTML();break;case"stats":c.innerHTML=this.getStatsViewHTML();break;default:c.innerHTML=this.getTapperViewHTML()} this.cacheUIRefs() };
GameEngine.prototype.renderNav = function() { const c=document.getElementById("nav-container"); c&&(c.innerHTML=this.config.navItems.map(t=>`<button class="nav-button ${this.state.activeView===t.id?"active":""}" data-action="switch-view" data-payload="${t.id}"><span class="icon">${t.icon}</span> <span>${t.name}</span></button>`).join("")) };
GameEngine.prototype.getTapperViewHTML = function() { return `<main class="tapper-section"><div class="passive-income-display"><span class="label">Influencia / Hora</span><div class="value"><span class="icon">✨</span><span id="influence-per-hour-display">${this.formatNumber(this.state.influencePerHour)}</span></div></div><div class="total-influence-display"><span id="total-influence-value">${this.formatNumber(this.state.totalInfluence)}</span></div><div id="tapper-zone" data-action="handle-tap"><div id="galaxy-container"><span id="galaxy-icon">💫</span></div></div></main>` };
GameEngine.prototype.getUpgradesViewHTML = function() { const t=Object.keys(this.config.upgrades).map(e=>{const s=this.config.upgrades[e],i=this.state.upgrades[e]||0,n=this.calculateCost(s.baseCost,i);return`<div class="upgrade-card ${this.state.totalInfluence>=n?"can-afford":""}" data-action="purchase-upgrade" data-payload="${e}"><span class="upgrade-icon">${s.icon}</span><div class="upgrade-info"><h4>${s.name}</h4><p>+${s.baseInfluence} Influencia/Hora</p></div><div class="upgrade-details"><span class="upgrade-level">Nivel ${i}</span><div class="upgrade-cost"><span class="icon">💠</span><span>${this.formatNumber(n)}</span></div></div></div>`}).join("");return`<section class="game-view"><h2>🛰️ Proyectos Galácticos 🛰️</h2><div id="upgrades-list">${t}</div></section>` };
GameEngine.prototype.getStatsViewHTML = function() { const t=Math.max(1,Math.floor((new Date-new Date(this.state.startDate))/864e5)),e=[{i:"👆",t:"Interacciones Totales",v:this.formatNumber(this.state.totalTaps)},{i:"✨",t:"Influencia Generada",v:this.formatNumber(this.state.totalInfluenceGenerated)},{i:"🗓️",t:"Ciclos Galácticos",v:t}];return`<section class="game-view"><h2>📈 Registros de la Flota 📈</h2><div class="stats-container">${e.map(t=>`<div class="stat-card"><h3><span class="icon">${t.i}</span> ${t.t}</h3><p>${t.v}</p></div>`).join("")}</div></section>` };
GameEngine.prototype.cacheUIRefs = function() { this.ui_refs.totalInfluenceDisplay=document.getElementById("total-influence-value"), this.ui_refs.influencePerHourDisplay=document.getElementById("influence-per-hour-display") };

const gameConfig={upgrades:{treaties:{name:"Tratados Interstelares",baseInfluence:1,baseCost:50,icon:"📜"},xenolinguistics:{name:"Academias de Idiomas",baseInfluence:5,baseCost:250,icon:"👽"},networks:{name:"Red de Hiper-relés",baseInfluence:20,baseCost:1e3,icon:"🛰️"},biotech:{name:"Clínicas de Bio-Regeneración",baseInfluence:80,baseCost:5e3,icon:"🧬"},robotics:{name:"Enviados Robóticos",baseInfluence:300,baseCost:2e4,icon:"🤖"},artifacts:{name:"Estudio de Artefactos",baseInfluence:1200,baseCost:1e5,icon:"🛸"}},navItems:[{id:"tapper",name:"Galaxia",icon:"🌌"},{id:"upgrades",name:"Proyectos",icon:"🚀"},{id:"stats",name:"Registros",icon:"📊"}]};
document.addEventListener("DOMContentLoaded",()=>new GameEngine(gameConfig));