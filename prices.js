// prices.js - РАБОЧАЯ ВЕРСИЯ БЕЗ ПИЗДЕЦА
class PricesManager {
    constructor() {
        this.gamePrices = [];
        this.languageNames = {
            'russian_voice': '🎤 Русская озвучка',
            'russian_subs': '📝 Русские субтитры', 
            'english': '🇬🇧 Английский язык'
        };
        this.currentFilterLanguage = 'all';
        this.init();
    }

    async init() {
        console.log('💰 Инициализация менеджера ценников...');
        
        await this.loadData();
        this.initPage();
        this.updateStats();
        
        setTimeout(() => {
            this.setupAutocomplete();
        }, 500);
    }

    async loadData() {
        try {
            const savedPrices = localStorage.getItem('gamePrices');
            if (savedPrices) {
                this.gamePrices = JSON.parse(savedPrices);
                console.log(`💰 Загружено ${this.gamePrices.length} ценников`);
            } else {
                this.gamePrices = [];
            }
            
            this.loadGameSelect();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            showNotification('Ошибка загрузки данных', 'error');
        }
    }

    async saveData() {
        try {
            localStorage.setItem('gamePrices', JSON.stringify(this.gamePrices));
            console.log(`💾 Сохранено ${this.gamePrices.length} ценников`);
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return { success: false };
        }
    }

    initPage() {
        this.displayPrices();
        this.setupEventListeners();
        this.updateStats();
    }

    loadGameSelect() {
        const gameSelect = document.getElementById('gameSelect');
        if (!gameSelect) return;
        
        const games = JSON.parse(localStorage.getItem('games')) || [];
        
        gameSelect.innerHTML = '<option value="">Выберите игру...</option>';
        
        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = game.name;
            gameSelect.appendChild(option);
        });
    }

    displayPrices(pricesToShow = null) {
        const pricesList = document.getElementById('pricesList');
        if (!pricesList) return;
        
        const prices = pricesToShow || this.gamePrices;
        
        if (prices.length === 0) {
            pricesList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4em; margin-bottom: 20px;">💰</div>
                    <h3>Нет добавленных ценников</h3>
                    <p>Добавьте первую игру, чтобы создать ценник</p>
                    <button onclick="toggleAddGameForm()" class="btn btn-primary" style="margin-top: 20px;">
                        ➕ Добавить первую игру
                    </button>
                </div>
            `;
            return;
        }
        
        pricesList.innerHTML = prices.map(price => this.generatePriceCard(price)).join('');
    }

    generatePriceCard(price) {
        const hasPS4 = (price.prices.p2_ps4 || 0) > 0 || (price.prices.p3_ps4 || 0) > 0;
        const hasPS5 = (price.prices.p2_ps5 || 0) > 0 || (price.prices.p3_ps5 || 0) > 0;
        const languageDisplay = this.languageNames[price.language] || 'Не указан';
        
        // ВАЖНО: Используем price.id для всех кнопок
        const priceId = price.id.toString();
        
        return `
            <div class="price-card">
                <div class="price-card-header">
                    <div class="game-title">
                        <h3>${price.name}</h3>
                        <div class="game-language">${languageDisplay}</div>
                    </div>
                    <div class="price-actions">
                        <button class="btn btn-small btn-primary" onclick="pricesManager.editPrice('${priceId}')">
                            ✏️ Изменить
                        </button>
                        <button class="btn btn-small btn-danger" onclick="pricesManager.deletePrice('${priceId}')">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
                
                <div class="price-details">
                    ${hasPS4 ? `
                        <div class="platform-prices ps4">
                            <div class="platform-header">
                                <span class="platform-icon">🎮</span>
                                <span class="platform-name">PS4</span>
                            </div>
                            <div class="position-prices">
                                ${price.prices.p2_ps4 ? `
                                    <div class="position-price">
                                        <span class="position-name">П2 PS4:</span>
                                        <span class="position-value">${price.prices.p2_ps4} ₽</span>
                                    </div>
                                ` : ''}
                                ${price.prices.p3_ps4 ? `
                                    <div class="position-price">
                                        <span class="position-name">П3 PS4:</span>
                                        <span class="position-value">${price.prices.p3_ps4} ₽</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${hasPS5 ? `
                        <div class="platform-prices ps5">
                            <div class="platform-header">
                                <span class="platform-icon">🎮</span>
                                <span class="platform-name">PS5</span>
                            </div>
                            <div class="position-prices">
                                ${price.prices.p2_ps5 ? `
                                    <div class="position-price">
                                        <span class="position-name">П2 PS5:</span>
                                        <span class="position-value">${price.prices.p2_ps5} ₽</span>
                                    </div>
                                ` : ''}
                                ${price.prices.p3_ps5 ? `
                                    <div class="position-price">
                                        <span class="position-name">П3 PS5:</span>
                                        <span class="position-value">${price.prices.p3_ps5} ₽</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="copy-buttons">
                    <button class="btn btn-success btn-block" 
                            onclick="pricesManager.copyPriceText('${priceId}', 'full')">
                        📋 Полный ценник
                    </button>
                    
                    <div class="copy-options">
                        ${hasPS4 ? `
                            <button class="btn btn-small btn-outline" 
                                    onclick="pricesManager.copyPriceText('${priceId}', 'ps4')">
                                Только PS4
                            </button>
                        ` : ''}
                        ${hasPS5 ? `
                            <button class="btn btn-small btn-outline" 
                                    onclick="pricesManager.copyPriceText('${priceId}', 'ps5')">
                                Только PS5
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupAutocomplete() {
        const searchInput = document.getElementById('searchPrices');
        if (!searchInput) return;
        
        const container = document.createElement('div');
        container.className = 'autocomplete-container';
        container.style.position = 'relative';
        
        searchInput.parentNode.insertBefore(container, searchInput);
        container.appendChild(searchInput);
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.id = 'pricesAutocompleteDropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 1000;
            background: white;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 8px 8px;
            max-height: 300px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        
        container.appendChild(dropdown);
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            if (term.length >= 2) {
                this.showAutocompleteResults(term, dropdown);
            } else {
                dropdown.style.display = 'none';
                this.filterPrices();
            }
        });
        
        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const gameName = item.dataset.gameName;
                searchInput.value = gameName;
                dropdown.style.display = 'none';
                this.filterByGameName(gameName);
            }
        });
    }

    showAutocompleteResults(searchTerm, dropdown) {
        const term = searchTerm.toLowerCase();
        const results = this.gamePrices.filter(price => 
            price.name.toLowerCase().includes(term)
        ).slice(0, 10);
        
        if (results.length === 0) {
            dropdown.innerHTML = `<div style="padding: 15px; color: #64748b; text-align: center;">🎮 Игры не найдены</div>`;
            dropdown.style.display = 'block';
            return;
        }
        
        dropdown.innerHTML = results.map(price => {
            return `
                <div class="autocomplete-item" data-game-name="${price.name}">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; cursor: pointer;">
                        <div style="width: 40px; height: 40px; background: #4361ee; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white;">🎮</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${price.name}</div>
                            <div style="font-size: 12px; color: #64748b;">${this.languageNames[price.language]}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        dropdown.style.display = 'block';
    }

    filterByGameName(gameName) {
        const filteredPrices = this.gamePrices.filter(price => 
            price.name.toLowerCase().includes(gameName.toLowerCase())
        );
        this.displayPrices(filteredPrices);
        this.updateStats(filteredPrices);
    }

    updatePriceInputs() {
        const container = document.getElementById('priceInputsContainer');
        const positionCount = document.getElementById('positionCount').value;
        
        let html = '<div style="grid-column: 1/-1; font-weight: 600; margin-bottom: 10px;">Введите цены:</div>';
        
        if (positionCount === '4') {
            html += `
                <div class="form-group">
                    <label>П2 PS4 (₽):</label>
                    <input type="number" id="priceP2PS4" class="input" placeholder="299" min="0">
                </div>
                <div class="form-group">
                    <label>П3 PS4 (₽):</label>
                    <input type="number" id="priceP3PS4" class="input" placeholder="399" min="0">
                </div>
                <div class="form-group">
                    <label>П2 PS5 (₽):</label>
                    <input type="number" id="priceP2PS5" class="input" placeholder="399" min="0">
                </div>
                <div class="form-group">
                    <label>П3 PS5 (₽):</label>
                    <input type="number" id="priceP3PS5" class="input" placeholder="499" min="0">
                </div>
            `;
        } else if (positionCount === 'ps4_only') {
            html += `
                <div class="form-group">
                    <label>П2 PS4 (₽):</label>
                    <input type="number" id="priceP2PS4" class="input" placeholder="299" min="0">
                </div>
                <div class="form-group">
                    <label>П3 PS4 (₽):</label>
                    <input type="number" id="priceP3PS4" class="input" placeholder="399" min="0">
                </div>
            `;
        } else if (positionCount === 'ps5_only') {
            html += `
                <div class="form-group">
                    <label>П2 PS5 (₽):</label>
                    <input type="number" id="priceP2PS5" class="input" placeholder="399" min="0">
                </div>
                <div class="form-group">
                    <label>П3 PS5 (₽):</label>
                    <input type="number" id="priceP3PS5" class="input" placeholder="499" min="0">
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    async addGameToPrices() {
        const gameSelect = document.getElementById('gameSelect');
        const gameLanguage = document.getElementById('gameLanguage');
        const positionCount = document.getElementById('positionCount').value;
        
        const gameId = parseInt(gameSelect.value);
        if (!gameId) {
            showNotification('Выберите игру', 'warning');
            return;
        }
        
        const games = JSON.parse(localStorage.getItem('games')) || [];
        const game = games.find(g => g.id === gameId);
        if (!game) {
            showNotification('Игра не найдена', 'error');
            return;
        }
        
        // Проверяем дубликаты
        const existing = this.gamePrices.find(p => 
            p.gameId === gameId && p.language === gameLanguage.value
        );
        if (existing) {
            showNotification('Эта игра с таким языком уже есть', 'error');
            return;
        }
        
        // Собираем цены
        const prices = { p2_ps4: 0, p3_ps4: 0, p2_ps5: 0, p3_ps5: 0 };
        
        if (positionCount === '4') {
            prices.p2_ps4 = parseInt(document.getElementById('priceP2PS4').value) || 0;
            prices.p3_ps4 = parseInt(document.getElementById('priceP3PS4').value) || 0;
            prices.p2_ps5 = parseInt(document.getElementById('priceP2PS5').value) || 0;
            prices.p3_ps5 = parseInt(document.getElementById('priceP3PS5').value) || 0;
        } else if (positionCount === 'ps4_only') {
            prices.p2_ps4 = parseInt(document.getElementById('priceP2PS4').value) || 0;
            prices.p3_ps4 = parseInt(document.getElementById('priceP3PS4').value) || 0;
        } else if (positionCount === 'ps5_only') {
            prices.p2_ps5 = parseInt(document.getElementById('priceP2PS5').value) || 0;
            prices.p3_ps5 = parseInt(document.getElementById('priceP3PS5').value) || 0;
        }
        
        // Проверяем что есть хотя бы одна цена
        if (!prices.p2_ps4 && !prices.p3_ps4 && !prices.p2_ps5 && !prices.p3_ps5) {
            showNotification('Укажите хотя бы одну цену', 'warning');
            return;
        }
        
        // СОЗДАЕМ ЦЕННИК С ПРАВИЛЬНЫМ ID
        const newPrice = {
            id: Date.now().toString(), // ВАЖНО: строка, не число!
            gameId: gameId,
            name: game.name,
            language: gameLanguage.value,
            prices: prices,
            currency: '₽',
            lastUpdated: new Date().toISOString(),
            created: new Date().toISOString(),
            addedBy: security.getCurrentUser()?.name || 'Неизвестно'
        };
        
        this.gamePrices.push(newPrice);
        await this.saveData();
        
        // Очищаем форму
        gameSelect.value = '';
        this.loadGameSelect();
        this.displayPrices();
        this.updateStats();
        
        toggleAddGameForm();
        showNotification(`Ценник добавлен!`, 'success');
    }

    editPrice(priceId) {
        console.log('EDIT ID:', priceId, 'Type:', typeof priceId);
        console.log('All prices:', this.gamePrices);
        
        // Ищем по строке, потому что все ID хранятся как строки
        const price = this.gamePrices.find(p => p.id.toString() === priceId.toString());
        
        if (!price) {
            console.error('Price not found for ID:', priceId);
            showNotification('Ценник не найден', 'error');
            return;
        }
        
        const modalContent = document.getElementById('editPriceContent');
        modalContent.innerHTML = `
            <h2>✏️ Редактировать ценник</h2>
            
            <div class="edit-price-form">
                <div class="form-group">
                    <label>Игра:</label>
                    <input type="text" class="input" value="${price.name}" disabled>
                </div>
                
                <div class="form-group">
                    <label>Язык:</label>
                    <select id="editGameLanguage" class="input">
                        <option value="russian_voice" ${price.language === 'russian_voice' ? 'selected' : ''}>🎤 Русская озвучка</option>
                        <option value="russian_subs" ${price.language === 'russian_subs' ? 'selected' : ''}>📝 Русские субтитры</option>
                        <option value="english" ${price.language === 'english' ? 'selected' : ''}>🇬🇧 Английский язык</option>
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div class="form-group">
                        <label>П2 PS4 (₽):</label>
                        <input type="number" id="editP2_ps4" class="input" value="${price.prices.p2_ps4 || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>П3 PS4 (₽):</label>
                        <input type="number" id="editP3_ps4" class="input" value="${price.prices.p3_ps4 || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>П2 PS5 (₽):</label>
                        <input type="number" id="editP2_ps5" class="input" value="${price.prices.p2_ps5 || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>П3 PS5 (₽):</label>
                        <input type="number" id="editP3_ps5" class="input" value="${price.prices.p3_ps5 || 0}" min="0">
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button onclick="pricesManager.savePriceChanges('${price.id}')" class="btn btn-success" style="flex: 1;">
                        💾 Сохранить
                    </button>
                    <button onclick="closeEditModal()" class="btn btn-secondary" style="flex: 1;">
                        Отмена
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('editPriceModal').style.display = 'block';
    }

    async savePriceChanges(priceId) {
        const priceIndex = this.gamePrices.findIndex(p => p.id.toString() === priceId.toString());
        
        if (priceIndex === -1) {
            showNotification('Ценник не найден', 'error');
            return;
        }
        
        this.gamePrices[priceIndex] = {
            ...this.gamePrices[priceIndex],
            language: document.getElementById('editGameLanguage').value,
            prices: {
                p2_ps4: parseInt(document.getElementById('editP2_ps4').value) || 0,
                p3_ps4: parseInt(document.getElementById('editP3_ps4').value) || 0,
                p2_ps5: parseInt(document.getElementById('editP2_ps5').value) || 0,
                p3_ps5: parseInt(document.getElementById('editP3_ps5').value) || 0
            },
            lastUpdated: new Date().toISOString()
        };
        
        await this.saveData();
        closeEditModal();
        this.displayPrices();
        showNotification('Ценник обновлен!', 'success');
    }

    async deletePrice(priceId) {
        console.log('DELETE ID:', priceId);
        
        const price = this.gamePrices.find(p => p.id.toString() === priceId.toString());
        
        if (!price) {
            showNotification('Ценник не найден', 'error');
            return;
        }
        
        if (!confirm(`Удалить ценник для "${price.name}"?`)) {
            return;
        }
        
        this.gamePrices = this.gamePrices.filter(p => p.id.toString() !== priceId.toString());
        await this.saveData();
        
        this.displayPrices();
        this.updateStats();
        showNotification('Ценник удален', 'info');
    }

    generateCopyText(price, mode = 'full') {
        const languageText = this.languageNames[price.language];
        const lines = [];
        
        lines.push(`🎮 ${price.name} (${languageText})`);
        lines.push('');
        
        if ((mode === 'full' || mode === 'ps4') && (price.prices.p2_ps4 || price.prices.p3_ps4)) {
            lines.push('🎮 PS4:');
            if (price.prices.p2_ps4) lines.push(`   П2 PS4 - ${price.prices.p2_ps4} ₽`);
            if (price.prices.p3_ps4) lines.push(`   П3 PS4 - ${price.prices.p3_ps4} ₽`);
            if (mode === 'full') lines.push('');
        }
        
        if ((mode === 'full' || mode === 'ps5') && (price.prices.p2_ps5 || price.prices.p3_ps5)) {
            lines.push('🎮 PS5:');
            if (price.prices.p2_ps5) lines.push(`   П2 PS5 - ${price.prices.p2_ps5} ₽`);
            if (price.prices.p3_ps5) lines.push(`   П3 PS5 - ${price.prices.p3_ps5} ₽`);
        }
        
        return lines.join('\n');
    }

    async copyPriceText(priceId, mode = 'full') {
        console.log('COPY ID:', priceId);
        
        const price = this.gamePrices.find(p => p.id.toString() === priceId.toString());
        
        if (!price) {
            console.error('Price not found for copying:', priceId);
            showNotification('Ценник не найден', 'error');
            return;
        }
        
        const copyText = this.generateCopyText(price, mode);
        console.log('Copy text:', copyText);
        
        try {
            await navigator.clipboard.writeText(copyText);
            showNotification('Ценник скопирован! ✅', 'success');
        } catch (err) {
            console.error('Copy error:', err);
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = copyText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Ценник скопирован! ✅', 'success');
        }
    }

    filterPrices() {
        const searchInput = document.getElementById('searchPrices');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let filteredPrices = this.gamePrices;
        
        if (this.currentFilterLanguage !== 'all') {
            filteredPrices = filteredPrices.filter(price => price.language === this.currentFilterLanguage);
        }
        
        if (searchTerm) {
            filteredPrices = filteredPrices.filter(price => 
                price.name.toLowerCase().includes(searchTerm)
            );
        }
        
        this.displayPrices(filteredPrices);
        this.updateStats(filteredPrices);
    }

    filterByLanguage(language) {
        this.currentFilterLanguage = language;
        
        document.querySelectorAll('.language-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[onclick="filterByLanguage('${language}')"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.filterPrices();
    }

    updateStats(prices = this.gamePrices) {
        const totalGames = prices.length;
        let totalPS4 = 0, totalPS5 = 0;
        
        prices.forEach(price => {
            if (price.prices.p2_ps4 || price.prices.p3_ps4) totalPS4++;
            if (price.prices.p2_ps5 || price.prices.p3_ps5) totalPS5++;
        });
        
        const totalGamesEl = document.getElementById('totalGames');
        const totalPS4El = document.getElementById('totalPS4');
        const totalPS5El = document.getElementById('totalPS5');
        
        if (totalGamesEl) totalGamesEl.textContent = totalGames;
        if (totalPS4El) totalPS4El.textContent = totalPS4;
        if (totalPS5El) totalPS5El.textContent = totalPS5;
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchPrices');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterPrices());
        }
    }
}

// Глобальные функции
function toggleAddGameForm() {
    const formSection = document.getElementById('addGameFormSection');
    formSection.style.display = formSection.style.display === 'none' ? 'block' : 'none';
    if (formSection.style.display === 'block') {
        setTimeout(() => updatePriceInputs(), 100);
    }
}

function closeEditModal() {
    document.getElementById('editPriceModal').style.display = 'none';
}

function filterPrices() {
    if (window.pricesManager) window.pricesManager.filterPrices();
}

function filterByLanguage(language) {
    if (window.pricesManager) window.pricesManager.filterByLanguage(language);
}

function refreshPrices() {
    if (window.pricesManager) window.pricesManager.loadData().then(() => {
        window.pricesManager.displayPrices();
        window.pricesManager.updateStats();
        showNotification('Обновлено!', 'success');
    });
}

function addGameToPrices() {
    if (window.pricesManager) window.pricesManager.addGameToPrices();
}

function updatePriceInputs() {
    if (window.pricesManager) window.pricesManager.updatePriceInputs();
}

function showAllPrices() {
    const searchInput = document.getElementById('searchPrices');
    if (searchInput) searchInput.value = '';
    
    if (window.pricesManager) {
        window.pricesManager.currentFilterLanguage = 'all';
        window.pricesManager.displayPrices();
        window.pricesManager.updateStats();
        
        document.querySelectorAll('.language-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const allBtn = document.querySelector('[onclick="filterByLanguage(\'all\')"]');
        if (allBtn) allBtn.classList.add('active');
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (!window.pricesManager) {
        window.pricesManager = new PricesManager();
    }
    if (typeof initMobileMenu === 'function') {
        initMobileMenu();
    }
});

