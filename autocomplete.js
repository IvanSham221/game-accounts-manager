// autocomplete.js - УНИВЕРСАЛЬНЫЙ ПОИСК (только игры в предложениях)
class AutoComplete {
    constructor() {
        this.games = [];
        this.accounts = [];
        this.init();
    }

    init() {
        console.log('🚀 Инициализация универсального поиска...');
        this.loadData();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupUnifiedSearch();
            });
        } else {
            this.setupUnifiedSearch();
        }
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'games' || e.key === 'accounts') {
                this.loadData();
            }
        });
    }

    loadData() {
        const gamesData = localStorage.getItem('games');
        if (gamesData) {
            this.games = JSON.parse(gamesData);
            console.log(`🎮 Загружено ${this.games.length} игр`);
        }
        
        const accountsData = localStorage.getItem('accounts');
        if (accountsData) {
            this.accounts = JSON.parse(accountsData);
            console.log(`👤 Загружено ${this.accounts.length} аккаунтов`);
        }
    }

    setupUnifiedSearch() {
        const searchInput = document.getElementById('managerGameSearch');
        if (!searchInput) {
            console.log('❌ Поле поиска не найдено');
            return;
        }
        
        console.log('🔧 Настройка универсального поиска для:', searchInput);
        
        // Создаем dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'unifiedSearchDropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 300px;
            overflow-y: auto;
            z-index: 999999;
            min-width: 300px;
        `;
        
        document.body.appendChild(dropdown);
        
        let hideTimeout;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(hideTimeout);
            const value = searchInput.value.trim();
            
            if (value === '') {
                this.showRecentGames(dropdown); // Только игры
            } else {
                this.searchGames(value, dropdown); // Только игры
            }
            
            this.positionDropdown(searchInput, dropdown);
            dropdown.style.display = 'block';
        });
        
        searchInput.addEventListener('focus', () => {
            clearTimeout(hideTimeout);
            const value = searchInput.value.trim();
            
            if (value === '') {
                this.showRecentGames(dropdown); // Только игры
            } else {
                this.searchGames(value, dropdown); // Только игры
            }
            
            this.positionDropdown(searchInput, dropdown);
            dropdown.style.display = 'block';
        });
        
        searchInput.addEventListener('blur', () => {
            hideTimeout = setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });
        
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });
        
        dropdown.addEventListener('mouseleave', () => {
            dropdown.style.display = 'none';
        });
        
        // Обработка клика по игре
        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('[data-game-id]');
            if (!item) return;
            
            const gameName = item.dataset.gameName;
            searchInput.value = gameName;
            dropdown.style.display = 'none';
            
            // Запускаем поиск по игре
            setTimeout(() => searchByGame(), 100);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            } else if (e.key === 'Enter') {
                // Если нажали Enter, запускаем универсальный поиск
                dropdown.style.display = 'none';
                performUnifiedSearch();
            }
        });
        
        window.addEventListener('scroll', () => {
            if (dropdown.style.display === 'block') {
                this.positionDropdown(searchInput, dropdown);
            }
        });
        
        window.addEventListener('resize', () => {
            if (dropdown.style.display === 'block') {
                this.positionDropdown(searchInput, dropdown);
            }
        });
        
        // Скрываем старое поле для логина
        const loginSearch = document.getElementById('managerLogin');
        if (loginSearch) {
            const loginGroup = loginSearch.closest('.search-group');
            if (loginGroup) {
                loginGroup.style.display = 'none';
            }
        }
    }

    positionDropdown(input, dropdown) {
        const rect = input.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        dropdown.style.left = (rect.left + window.scrollX) + 'px';
        dropdown.style.width = rect.width + 'px';
    }

    // ПОИСК ТОЛЬКО ИГР
    searchGames(searchTerm, dropdown) {
        const term = searchTerm.toLowerCase().trim();
        
        const gameResults = this.games
            .filter(game => game.name.toLowerCase().includes(term))
            .slice(0, 12)
            .map(game => ({
                id: game.id,
                name: game.name,
                accountsCount: this.accounts.filter(acc => acc.gameId === game.id).length
            }));
        
        if (gameResults.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 15px; color: #64748b; text-align: center;">
                    🎮 Игры не найдены
                </div>
            `;
        } else {
            this.renderGames(gameResults, dropdown);
        }
    }

    // ПОКАЗ ПОПУЛЯРНЫХ ИГР (только игры)
    showRecentGames(dropdown) {
        // Игры, у которых есть аккаунты
        const gamesWithAccounts = this.games
            .filter(game => this.accounts.some(acc => acc.gameId === game.id))
            .slice(0, 8)
            .map(game => ({
                id: game.id,
                name: game.name,
                accountsCount: this.accounts.filter(acc => acc.gameId === game.id).length
            }));
        
        // Добавляем немного игр без аккаунтов (для разнообразия)
        const gamesWithoutAccounts = this.games
            .filter(game => !this.accounts.some(acc => acc.gameId === game.id))
            .slice(0, 3)
            .map(game => ({
                id: game.id,
                name: game.name,
                accountsCount: 0
            }));
        
        const recentGames = [...gamesWithAccounts, ...gamesWithoutAccounts].slice(0, 10);
        
        if (recentGames.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 15px; color: #64748b; text-align: center;">
                    🎮 Начните вводить название игры
                </div>
            `;
        } else {
            this.renderGames(recentGames, dropdown);
        }
    }

    // ОТОБРАЖЕНИЕ ИГР
    renderGames(games, dropdown) {
        dropdown.innerHTML = games.map(game => {
            const hasAccounts = game.accountsCount > 0;
            
            return `
                <div data-game-id="${game.id}"
                     data-game-name="${game.name}"
                     style="
                        padding: 12px 15px;
                        cursor: pointer;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        transition: background 0.2s;
                        ${!hasAccounts ? 'opacity: 0.8;' : ''}
                     "
                     onmouseover="this.style.background='#f1f5f9'"
                     onmouseout="this.style.background='white'">
                     
                    <div style="
                        width: 40px; height: 40px;
                        background: ${hasAccounts ? 
                            'linear-gradient(135deg, #4361ee, #3a56d4)' : 
                            'linear-gradient(135deg, #94a3b8, #64748b)'};
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 18px;
                        flex-shrink: 0;
                    ">🎮</div>
                    
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1e293b;">${game.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            📊 ${game.accountsCount} аккаунтов
                        </div>
                    </div>
                    
                    ${hasAccounts ? `
                        <div style="font-size: 11px; color: #4361ee; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">
                            есть аккаунты
                        </div>
                    ` : `
                        <div style="font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
                            нет аккаунтов
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }
}

// Инициализируем
if (!window.autoComplete) {
    window.autoComplete = new AutoComplete();
}