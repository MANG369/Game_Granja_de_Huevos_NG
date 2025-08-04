document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES Y CONFIGURACIÓN ---
    const COIN_SYMBOL = '$EC';
    const MAX_ENERGY = 1000;
    const BASE_CLICK_VALUE = 0.000001;
    const BASE_CLICK_UPGRADE_COST = 0.000010;

    // --- VARIABLES DEL JUEGO ---
    let score = 0;
    let productionPerHour = 0;
    let energy = MAX_ENERGY;
    let clickLevel = 1;
    let currentClickValue = BASE_CLICK_VALUE;

    // --- ELEMENTOS DEL DOM ---
    const scoreDisplay = document.getElementById('score');
    const mainEgg = document.getElementById('main-egg');
    const productionRateDisplay = document.getElementById('production-rate');
    const energyLevelDisplay = document.getElementById('energy-level');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const clickValueDisplay = document.getElementById('click-value-display');
    const shopItemsContainer = document.getElementById('shop-items');
    const toggleShopButton = document.getElementById('toggle-shop-button');
    const sideShop = document.getElementById('side-shop');
    const closeSideShopButton = document.getElementById('close-side-shop');
    const sideShopItemsContainer = document.getElementById('side-shop-items');
    
    // --- LÓGICA DE TON CONNECT ---
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json',
    });
    const walletButton = document.getElementById('wallet-button');
    tonConnectUI.onStatusChange(wallet => {
        if (wallet) {
            const address = wallet.account.address;
            const friendlyAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            walletButton.textContent = `Billetera: ${friendlyAddress}`;
            walletButton.style.backgroundColor = '#4CAF50';
        } else {
            walletButton.textContent = 'Conectar Billetera 💎';
            walletButton.style.backgroundColor = '#0088cc';
        }
        // Actualizar la tienda lateral si está abierta cuando cambia el estado de la billetera
        if (sideShop.classList.contains('active')) {
            renderSideShop();
        }
    });
    walletButton.addEventListener('click', () => {
        tonConnectUI.connected ? tonConnectUI.disconnect() : tonConnectUI.openModal();
    });

    // --- MEJORAS DE LA GRANJA Y TIENDA DE TON ---
    const upgrades = [
        { id: 1, name: '🐣 Gallina Ponedora', cost: 0.0002, production: 1 },
        { id: 2, name: '🏡 Nido Mejorado', cost: 0.001, production: 8 },
        { id: 3, name: '🌽 Alimentador Automático', cost: 0.01, production: 55 },
        { id: 4, name: '🚜 Tractor Pequeño', cost: 0.1, production: 377 },
        { id: 5, name: '🚚 Camión de Reparto', cost: 1, production: 2584 }
    ];
    const shopProducts = [
        { ecAmount: 10000, tonPrice: 0.1 },
        { ecAmount: 60000, tonPrice: 0.5 },
        { ecAmount: 125000, tonPrice: 1.0 },
    ];

    // --- FUNCIÓN FIBONACCI ---
    const fibMemo = { 0: 1, 1: 1, 2: 2 };
    function fibonacci(n) {
        if (n in fibMemo) return fibMemo[n];
        fibMemo[n] = fibonacci(n - 1) + fibonacci(n - 2);
        return fibMemo[n];
    }

    // --- LÓGICA CENTRAL DEL JUEGO ---
    mainEgg.addEventListener('click', () => {
        if (energy >= 1) {
            score += currentClickValue;
            energy -= 1;
            updateUI();
        }
    });
    setInterval(() => {
        if (energy < MAX_ENERGY) {
            energy = Math.min(MAX_ENERGY, energy + 2);
            updateUI();
        }
    }, 2000);
    setInterval(() => {
        if (productionPerHour > 0) {
            score += productionPerHour / 3600;
            updateUI();
        }
    }, 1000);

    // --- MANEJO DE MODALES Y TIENDA LATERAL ---
    const modals = {
        shop: { button: document.getElementById('shop-button'), modal: document.getElementById('shop-modal'), render: renderShop },
        boost: { button: document.getElementById('boost-button'), modal: document.getElementById('boost-modal'), render: renderBoost }
    };
    Object.values(modals).forEach(item => {
        item.button.addEventListener('click', () => {
            item.render();
            item.modal.style.display = 'block';
        });
        item.modal.querySelector('.close-button').addEventListener('click', () => {
            item.modal.style.display = 'none';
        });
    });
    window.addEventListener('click', (event) => {
        Object.values(modals).forEach(item => {
            if (event.target === item.modal) item.modal.style.display = 'none';
        });
    });

    // Abrir/Cerrar Tienda Lateral de TON
    toggleShopButton.addEventListener('click', () => {
        renderSideShop();
        sideShop.classList.add('active');
    });
    closeSideShopButton.addEventListener('click', () => {
        sideShop.classList.remove('active');
    });

    // --- LÓGICA DE RENDERIZADO Y COMPRAS ---

    // Renderizar Mejoras de Granja
    function renderShop() {
        shopItemsContainer.innerHTML = '';
        upgrades.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <img src="hen_upgrade.png" alt="${item.name}">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>+${item.production.toLocaleString()} ${COIN_SYMBOL}/hr | Costo: ${item.cost.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})} ${COIN_SYMBOL}</small>
                </div>
                <button class="buy-upgrade-btn" data-id="${item.id}" ${score < item.cost ? 'disabled' : ''}>Comprar</button>
            `;
            shopItemsContainer.appendChild(itemDiv);
        });
    }

    // Comprar Mejoras de Granja (Delegación de Eventos)
    shopItemsContainer.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('buy-upgrade-btn')) {
            const upgradeId = parseInt(e.target.dataset.id);
            const item = upgrades.find(u => u.id === upgradeId);
            if (item && score >= item.cost) {
                score -= item.cost;
                productionPerHour += item.production;
                item.cost *= 1.8;
                renderShop();
                updateUI();
            }
        }
    });
    
    // Renderizar Tienda de TON
    function renderSideShop() {
        sideShopItemsContainer.innerHTML = '';
        const isWalletConnected = tonConnectUI.connected;
        shopProducts.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.className = 'purchase-option';
            productDiv.innerHTML = `
                <div class="ec-amount">${product.ecAmount.toLocaleString()} ${COIN_SYMBOL}</div>
                <div class="ton-price">por ${product.tonPrice.toFixed(1)} TON</div>
                <button class="buy-ton-button" data-ton-amount="${product.tonPrice}" data-ec-amount="${product.ecAmount}" ${!isWalletConnected ? 'disabled' : ''}>Comprar</button>
            `;
            sideShopItemsContainer.appendChild(productDiv);
        });
        if (!isWalletConnected) {
            sideShopItemsContainer.innerHTML += `<p style="text-align: center; font-size: 14px;">Conecta tu billetera para comprar.</p>`;
        }
    }

    // Comprar en Tienda de TON (Delegación de Eventos)
    sideShopItemsContainer.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('buy-ton-button')) {
            if (!tonConnectUI.connected) {
                alert('Por favor, conecta tu billetera primero.');
                return;
            }
            const tonAmount = e.target.dataset.tonAmount;
            const ecAmount = parseInt(e.target.dataset.ecAmount, 10);
            
            // ¡¡¡IMPORTANTE!!! CAMBIA ESTA DIRECCIÓN POR LA DE TU BILLETERA TON
            const myWalletAddress = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAB';

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [{ address: myWalletAddress, amount: (tonAmount * 1_000_000_000).toString() }]
            };

            try {
                await tonConnectUI.sendTransaction(transaction);
                alert('¡Transacción enviada! Recibirás tus Egg Coins en breve.');
                score += ecAmount;
                updateUI();
            } catch (error) {
                console.error('Transacción cancelada o fallida:', error);
                alert('La transacción fue cancelada o falló.');
            }
        }
    });

    // Renderizar y Comprar Potenciador de Clic
    function renderBoost() {
        const cost = BASE_CLICK_UPGRADE_COST * fibonacci(clickLevel + 1);
        document.getElementById('click-level').textContent = clickLevel;
        document.getElementById('click-value').textContent = `${currentClickValue.toFixed(6)} ${COIN_SYMBOL}`;
        document.getElementById('boost-cost').textContent = `${cost.toFixed(6)} ${COIN_SYMBOL}`;
        document.getElementById('buy-boost-button').disabled = score < cost;
    }
    document.getElementById('buy-boost-button').addEventListener('click', () => {
        const cost = BASE_CLICK_UPGRADE_COST * fibonacci(clickLevel + 1);
        if (score >= cost) {
            score -= cost;
            clickLevel++;
            currentClickValue = BASE_CLICK_VALUE * fibonacci(clickLevel);
            renderBoost();
            updateUI();
        }
    });

    // --- FUNCIÓN CENTRAL DE ACTUALIZACIÓN DE UI ---
    function updateUI() {
        scoreDisplay.textContent = score.toFixed(6);
        productionRateDisplay.textContent = `${productionPerHour.toLocaleString()} ${COIN_SYMBOL}`;
        energyLevelDisplay.textContent = `${energy} / ${MAX_ENERGY}`;
        energyBarFill.style.width = `${(energy / MAX_ENERGY) * 100}%`;
        clickValueDisplay.textContent = `+${currentClickValue.toFixed(6)}`;
    }

    // --- INICIALIZACIÓN DEL JUEGO ---
    currentClickValue = BASE_CLICK_VALUE * fibonacci(clickLevel);
    updateUI();
});