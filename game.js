document.addEventListener('DOMContentLoaded', () => {
    // --- ESTRUCTURA DE MONEDA ---
    const COIN_NAME = 'Egg Coin';
    const COIN_SYMBOL = '$EC';

    // --- VARIABLES DEL JUEGO ---
    let score = 0;
    let productionPerHour = 0;
    let energy = 1000;
    const maxEnergy = 1000;

    // --- VARIABLES DE PROGRESIÓN FIBONACCI ---
    let clickLevel = 1;
    const baseClickValue = 0.000001;
    const baseClickUpgradeCost = 0.000010;
    let currentClickValue = baseClickValue;

    // --- ELEMENTOS DEL DOM ---
    const scoreDisplay = document.getElementById('score');
    const mainEgg = document.getElementById('main-egg');
    const productionRateDisplay = document.getElementById('production-rate');
    const energyLevelDisplay = document.getElementById('energy-level');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const clickValueDisplay = document.getElementById('click-value-display');

    // Botones de Navegación
    const shopButton = document.getElementById('shop-button');
    const boostButton = document.getElementById('boost-button');
    const walletButton = document.getElementById('wallet-button');

    // Modales
    const shopModal = document.getElementById('shop-modal');
    const boostModal = document.getElementById('boost-modal');
    const shopItemsContainer = document.getElementById('shop-items');

    // --- MEJORAS DE LA GRANJA (costos ajustados para la nueva progresión) ---
    const upgrades = [
        { id: 1, name: '🐣 Gallina Ponedora', cost: 0.0002, production: 1, purchased: 0 },
        { id: 2, name: '🏡 Nido Mejorado', cost: 0.001, production: 8, purchased: 0 },
        { id: 3, name: '🌽 Alimentador Automático', cost: 0.01, production: 55, purchased: 0 },
        { id: 4, name: '🚜 Tractor Pequeño', cost: 0.1, production: 377, purchased: 0 },
        { id: 5, name: '🚚 Camión de Reparto', cost: 1, production: 2584, purchased: 0 }
    ];

    // --- FUNCIÓN FIBONACCI ---
    // Memoization para calcular Fibonacci de forma eficiente
    const fibMemo = {};
    function fibonacci(n) {
        if (n in fibMemo) return fibMemo[n];
        if (n <= 1) return n;
        fibMemo[n] = fibonacci(n - 1) + fibonacci(n - 2);
        return fibMemo[n];
    }
    // Inicializamos con algunos valores para que no sea 0 al principio
    fibMemo[0] = 1; fibMemo[1] = 1; fibMemo[2] = 2;

    // --- LÓGICA DEL JUEGO ---

    // Función de Clic en el Huevo
    mainEgg.addEventListener('click', () => {
        if (energy >= 1) {
            score += currentClickValue;
            energy -= 1;
            updateUI();
        }
    });

    // Regeneración de Energía
    setInterval(() => {
        if (energy < maxEnergy) {
            energy += 2;
            if (energy > maxEnergy) energy = maxEnergy;
            updateUI();
        }
    }, 2000);

    // Generación de Ingresos Pasivos
    setInterval(() => {
        score += productionPerHour / 3600;
        updateUI();
    }, 1000);

    // --- LÓGICA DE LA BILLETERA TON ---
    walletButton.addEventListener('click', () => {
        // ABRIR API DE BILLETERA TON
        // Esto crea un link de transacción. Debes cambiar la dirección y el monto.
        const tonWalletAddress = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // Dirección de ejemplo
        const amountNanoTon = '10000000'; // Monto en nanotons (0.01 TON)
        window.location.href = `ton://transfer/${tonWalletAddress}?amount=${amountNanoTon}`;
    });

    // --- LÓGICA DE POTENCIAR CLIC (FIBONACCI) ---
    function openBoostModal() {
        const cost = baseClickUpgradeCost * fibonacci(clickLevel + 1);
        document.getElementById('click-level').textContent = clickLevel;
        document.getElementById('click-value').textContent = `${currentClickValue.toFixed(6)} ${COIN_SYMBOL}`;
        document.getElementById('boost-cost').textContent = `${cost.toFixed(6)} ${COIN_SYMBOL}`;
        document.getElementById('buy-boost-button').disabled = score < cost;
        boostModal.style.display = 'block';
    }

    document.getElementById('buy-boost-button').addEventListener('click', () => {
        const cost = baseClickUpgradeCost * fibonacci(clickLevel + 1);
        if (score >= cost) {
            score -= cost;
            clickLevel++;
            currentClickValue = baseClickValue * fibonacci(clickLevel);
            updateUI();
            openBoostModal(); // Refrescar el modal con los nuevos valores
        }
    });

    // --- LÓGICA DE LA TIENDA ---
    function renderShop() {
        shopItemsContainer.innerHTML = '';
        upgrades.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <img src="hen_upgrade.png" alt="${item.name}">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>+${item.production.toLocaleString()} ${COIN_SYMBOL}/hr | Costo: ${item.cost.toLocaleString()} ${COIN_SYMBOL}</small>
                </div>
                <button id="buy-${item.id}" ${score < item.cost ? 'disabled' : ''}>Comprar</button>
            `;
            shopItemsContainer.appendChild(itemDiv);

            document.getElementById(`buy-${item.id}`).addEventListener('click', () => {
                if (score >= item.cost) {
                    score -= item.cost;
                    productionPerHour += item.production;
                    item.cost = Math.floor(item.cost * 1.8); // Aumentar costo para la siguiente compra
                    updateUI();
                    renderShop();
                }
            });
        });
    }

    // --- CONTROL DE MODALES ---
    function setupModal(button, modal) {
        button.addEventListener('click', () => {
            if (modal.id === 'shop-modal') renderShop();
            if (modal.id === 'boost-modal') openBoostModal();
            modal.style.display = 'block';
        });
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    setupModal(shopButton, shopModal);
    setupModal(boostButton, boostModal);
    window.addEventListener('click', (event) => {
        if (event.target == shopModal) shopModal.style.display = 'none';
        if (event.target == boostModal) boostModal.style.display = 'none';
    });
    
    // --- FUNCIÓN DE ACTUALIZACIÓN DE UI ---
    function updateUI() {
        scoreDisplay.textContent = score.toFixed(6);
        productionRateDisplay.textContent = `${productionPerHour.toLocaleString()} ${COIN_SYMBOL}`;
        energyLevelDisplay.textContent = `${energy} / ${maxEnergy}`;
        energyBarFill.style.width = `${(energy / maxEnergy) * 100}%`;
        clickValueDisplay.textContent = `+${currentClickValue.toFixed(6)}`;
    }

    // Inicializar UI
    currentClickValue = baseClickValue * fibonacci(clickLevel);
    updateUI();
});