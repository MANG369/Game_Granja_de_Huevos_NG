document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES Y CONFIGURACIÓN ---
    const COIN_SYMBOL = '$EC';
    const MAX_ENERGY = 1000;
    const BASE_CLICK_VALUE = 0.000001;
    const BASE_CLICK_UPGRADE_COST = 0.000010;

    // --- ESTADO DEL JUEGO (se inicializará desde LocalStorage) ---
    let gameState = {};

    // --- ELEMENTOS DEL DOM ---
    const scoreDisplay = document.getElementById('score');
    const mainEgg = document.getElementById('main-egg');
    const productionRateDisplay = document.getElementById('production-rate');
    const energyLevelDisplay = document.getElementById('energy-level');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const clickValueDisplay = document.getElementById('click-value-display');
    const shopItemsContainer = document.getElementById('shop-items');
    const buyBoostButton = document.getElementById('buy-boost-button');
    const clickSound = document.getElementById('click-sound');
    const buySound = document.getElementById('buy-sound');
    const claimDailyRewardButton = document.getElementById('claim-daily-reward');

    // --- LÓGICA DE GUARDADO Y CARGA ---
    function saveGame() {
        localStorage.setItem('eggEmpireSave', JSON.stringify(gameState));
    }

    function loadGame() {
        const savedGame = JSON.parse(localStorage.getItem('eggEmpireSave'));
        const defaultState = {
            score: 0,
            productionPerHour: 0,
            energy: MAX_ENERGY,
            clickLevel: 1,
            upgrades: [
                { id: 1, name: '🐣 Gallina Ponedora', cost: 0.0002, production: 1 },
                { id: 2, name: '🏡 Nido Mejorado', cost: 0.001, production: 8 },
                { id: 3, name: '🌽 Alimentador Automático', cost: 0.01, production: 55 },
                { id: 4, name: '🚜 Tractor Pequeño', cost: 0.1, production: 377 },
                { id: 5, name: '🚚 Camión de Reparto', cost: 1, production: 2584 }
            ],
            lastDailyReward: null
        };
        gameState = { ...defaultState, ...savedGame };
        gameState.currentClickValue = BASE_CLICK_VALUE * fibonacci(gameState.clickLevel);
    }

    // --- LÓGICA DE TON CONNECT ---
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json',
    });
    const walletButton = document.getElementById('wallet-button');
    tonConnectUI.onStatusChange(wallet => {
        const isWalletConnected = !!wallet;
        walletButton.textContent = isWalletConnected ? `Billetera: ${wallet.account.address.slice(0, 4)}...${wallet.account.address.slice(-4)}` : 'Conectar Billetera 💎';
        walletButton.style.backgroundColor = isWalletConnected ? '#4CAF50' : '#0088cc';
        if (document.getElementById('side-shop').classList.contains('active')) {
            renderSideShop();
        }
    });
    walletButton.addEventListener('click', () => {
        tonConnectUI.connected ? tonConnectUI.disconnect() : tonConnectUI.openModal();
    });
    
    // --- DATOS DE LA TIENDA DE TON ---
    const shopProducts = [
        { ecAmount: 10, tonPrice: 1 },
        { ecAmount: 50, tonPrice: 5 },
        { ecAmount: 1000, tonPrice: 70 },
    ];

    // --- FUNCIÓN HELPER ---
    const fibMemo = { 0: 1, 1: 1, 2: 2 };
    function fibonacci(n) {
        if (n in fibMemo) return fibMemo[n];
        fibMemo[n] = fibonacci(n - 1) + fibonacci(n - 2);
        return fibMemo[n];
    }
    
    // --- SONIDOS ---
    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("La interacción del usuario es necesaria para reproducir el sonido."));
    }

    // --- LÓGICA CENTRAL Y TIMERS ---
    mainEgg.addEventListener('click', () => {
        if (gameState.energy >= 1) {
            gameState.score += gameState.currentClickValue;
            gameState.energy -= 1;
            playSound(clickSound);
            updateUI();
        }
    });
    
    setInterval(() => {
        if (gameState.energy < MAX_ENERGY) {
            gameState.energy = Math.min(MAX_ENERGY, gameState.energy + 2);
            updateUI();
        }
    }, 2000);
    
    setInterval(() => {
        if (gameState.productionPerHour > 0) {
            gameState.score += gameState.productionPerHour / 3600;
            updateUI();
        }
    }, 1000);
    
    // Guardar progreso cada 10 segundos
    setInterval(saveGame, 10000);

    // --- MANEJO DE INTERFAZ ---
    document.querySelectorAll('.modal').forEach(modal => {
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });
    document.getElementById('shop-button').addEventListener('click', () => {
        renderShop();
        document.getElementById('shop-modal').style.display = 'block';
    });
    document.getElementById('boost-button').addEventListener('click', () => {
        renderBoost();
        document.getElementById('boost-modal').style.display = 'block';
    });
    const sideShop = document.getElementById('side-shop');
    document.getElementById('toggle-shop-button').addEventListener('click', () => {
        renderSideShop();
        sideShop.classList.add('active');
    });
    document.getElementById('close-side-shop').addEventListener('click', () => {
        sideShop.classList.remove('active');
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) event.target.style.display = 'none';
    });

    // --- RENDERIZADO Y COMPRAS ---
    function renderShop() {
        shopItemsContainer.innerHTML = '';
        gameState.upgrades.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `<img src="hen_upgrade.png" alt="${item.name}"><div><strong>${item.name}</strong><br><small>+${item.production.toLocaleString()} ${COIN_SYMBOL}/hr | Costo: ${item.cost.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})} ${COIN_SYMBOL}</small></div><button class="buy-upgrade-btn" data-id="${item.id}" ${gameState.score < item.cost ? 'disabled' : ''}>Comprar</button>`;
            shopItemsContainer.appendChild(itemDiv);
        });
    }

    shopItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('buy-upgrade-btn')) {
            const upgradeId = parseInt(e.target.dataset.id);
            const item = gameState.upgrades.find(u => u.id === upgradeId);
            if (item && gameState.score >= item.cost) {
                gameState.score -= item.cost;
                gameState.productionPerHour += item.production;
                item.cost *= 1.8;
                playSound(buySound);
                renderShop();
                updateUI();
            }
        }
    });

    function renderSideShop() {
        const container = document.getElementById('side-shop-items');
        container.innerHTML = '';
        shopProducts.forEach(product => {
            container.innerHTML += `<div class="purchase-option"><div class="ec-amount">${product.ecAmount.toLocaleString()} ${COIN_SYMBOL}</div><div class="ton-price">por ${product.tonPrice.toLocaleString()} TON</div><button class="buy-ton-button" data-ton-amount="${product.tonPrice}" data-ec-amount="${product.ecAmount}" ${!tonConnectUI.connected ? 'disabled' : ''}>Comprar</button></div>`;
        });
        if (!tonConnectUI.connected) container.innerHTML += `<p style="text-align: center; font-size: 14px;">Conecta tu billetera para comprar.</p>`;
    }

    document.getElementById('side-shop-items').addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-ton-button')) {
            if (!tonConnectUI.connected) return alert('Por favor, conecta tu billetera primero.');
            const tonAmount = e.target.dataset.tonAmount;
            const ecAmount = parseInt(e.target.dataset.ecAmount, 10);
            const myWalletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAB'; // ¡¡¡CAMBIA ESTA DIRECCIÓN!!!
            try {
                await tonConnectUI.sendTransaction({
                    validUntil: Math.floor(Date.now() / 1000) + 600,
                    messages: [{ address: myWalletAddress, amount: (tonAmount * 1_000_000_000).toString() }]
                });
                alert('¡Transacción enviada! Recibirás tus Egg Coins en breve.');
                gameState.score += ecAmount;
                playSound(buySound);
                updateUI();
            } catch (error) {
                console.error('Transacción fallida:', error);
                alert('La transacción fue cancelada o falló.');
            }
        }
    });

    function renderBoost() {
        const cost = BASE_CLICK_UPGRADE_COST * fibonacci(gameState.clickLevel + 1);
        document.getElementById('click-level').textContent = gameState.clickLevel;
        document.getElementById('click-value').textContent = `${gameState.currentClickValue.toFixed(6)} ${COIN_SYMBOL}`;
        document.getElementById('boost-cost').textContent = `${cost.toFixed(6)} ${COIN_SYMBOL}`;
        buyBoostButton.disabled = gameState.score < cost;
        renderDailyReward();
    }

    buyBoostButton.addEventListener('click', () => {
        const cost = BASE_CLICK_UPGRADE_COST * fibonacci(gameState.clickLevel + 1);
        if (gameState.score >= cost) {
            gameState.score -= cost;
            gameState.clickLevel++;
            gameState.currentClickValue = BASE_CLICK_VALUE * fibonacci(gameState.clickLevel);
            playSound(buySound);
            renderBoost();
            updateUI();
        }
    });
    
    // --- LÓGICA DE RECOMPENSA DIARIA ---
    function renderDailyReward() {
        const now = new Date();
        const lastClaim = gameState.lastDailyReward ? new Date(gameState.lastDailyReward) : null;
        let canClaim = false;
        if (!lastClaim || now.getDate() !== lastClaim.getDate() || now.getMonth() !== lastClaim.getMonth() || now.getFullYear() !== lastClaim.getFullYear()) {
            canClaim = true;
        }
        claimDailyRewardButton.disabled = !canClaim;
    }
    
    claimDailyRewardButton.addEventListener('click', () => {
        const reward = (gameState.productionPerHour + 100) * 2; // Recompensa = 2 horas de producción (+100 de base)
        gameState.score += reward;
        gameState.lastDailyReward = new Date().toISOString();
        alert(`¡Has reclamado tu recompensa diaria de ${reward.toLocaleString()} $EC!`);
        playSound(buySound);
        renderDailyReward();
        updateUI();
    });

    // --- FUNCIÓN DE ACTUALIZACIÓN DE UI ---
    function updateUI() {
        scoreDisplay.textContent = gameState.score.toFixed(6);
        productionRateDisplay.textContent = `${gameState.productionPerHour.toLocaleString()} ${COIN_SYMBOL}`;
        energyLevelDisplay.textContent = `${Math.floor(gameState.energy)} / ${MAX_ENERGY}`;
        energyBarFill.style.width = `${(gameState.energy / MAX_ENERGY) * 100}%`;
        clickValueDisplay.textContent = `+${gameState.currentClickValue.toFixed(6)}`;
    }

    // --- INICIALIZACIÓN DEL JUEGO ---
    loadGame();
    updateUI();
});