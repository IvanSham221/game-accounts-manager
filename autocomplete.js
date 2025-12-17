// autocomplete.js - Умный поиск с автодополнением
class AutoComplete {
    constructor() {
        this.games = [];
        this.cache = new Map();
        this.init();
    }

    init() {
        this.loadGames();
        
        // Инициализируем при загрузке DOM
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                this.setupAllSelects();
            }, 1000);
        });
        
        // Обновляем при изменении игр
        if (window.dataSync) {
            // Слушаем изменения в играх
            this.setupGamesListener();
        }
    }

    loadGames() {
        const gamesData = localStorage.getItem('games');
        if (gamesData) {
            this.games = JSON.parse(gamesData);
            console.log(`🎮 Загружено ${this.games.length} игр для автодополнения`);
        }
    }

    setupGamesListener() {
        // Обновляем список игр при изменениях
        const originalLoadGames = window.loadGamesForSelect;
        window.loadGamesForSelect = function() {
            if (originalLoadGames) originalLoadGames();
            setTimeout(() => {
                window.autoComplete?.setupAllSelects();
            }, 500);
        };

        const originalDisplayGames = window.displayGames;
        window.displayGames = function() {
            if (originalDisplayGames) originalDisplayGames();
            setTimeout(() => {
                window.autoComplete?.loadGames();
                window.autoComplete?.setupAllSelects();
            }, 500);
        };
    }

    setupAllSelects() {
        // Все селекты с играми на сайте
        const selectIds = [
            'accountGame',     // Добавление аккаунта
            'filterGame',      // Фильтр аккаунтов
            'managerGame',     // Менеджер продаж
            'editGame',        // Редактирование аккаунта
            'editFreeGame',    // Привязка игры к аккаунту
            'filterGame',      // Отчеты
            'filterGame'       // Фильтр в различных местах
        ];

        const selects = document.querySelectorAll('select[id*="Game"], select[id*="game"]');
        
        selects.forEach(select => {
            if (!select.classList.contains('autocomplete-initialized')) {
                this.convertToAutocomplete(select);
                select.classList.add('autocomplete-initialized');
            }
        });
    }

    convertToAutocomplete(selectElement) {
        const container = document.createElement('div');
        container.className = 'autocomplete-container';
        container.style.position = 'relative';
        
        // Создаем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.className = selectElement.className;
        input.placeholder = 'Начните вводить название игры...';
        input.style.width = '100%';
        input.style.cursor = 'text';
        
        // Сохраняем оригинальные стили
        const originalStyles = window.getComputedStyle(selectElement);
        input.style.padding = originalStyles.padding;
        input.style.fontSize = originalStyles.fontSize;
        input.style.border = originalStyles.border;
        input.style.borderRadius = originalStyles.borderRadius;
        input.style.backgroundColor = originalStyles.backgroundColor;
        
        // Создаем контейнер для выпадающего списка
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        dropdown.style.maxHeight = '300px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.zIndex = '1000';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #e2e8f0';
        dropdown.style.borderRadius = '0 0 8px 8px';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        
        // Скрываем оригинальный select
        selectElement.style.display = 'none';
        selectElement.id = selectElement.id + '_hidden';
        
        // Вставляем новую структуру
        container.appendChild(input);
        container.appendChild(dropdown);
        selectElement.parentNode.insertBefore(container, selectElement.nextSibling);
        
        // Устанавливаем начальное значение
        if (selectElement.value) {
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            if (selectedOption) {
                input.value = selectedOption.textContent;
            }
        }
        
        // Обработчики событий
        this.setupInputHandlers(input, dropdown, selectElement);
        
        return { input, dropdown, container };
    }

    setupInputHandlers(input, dropdown, originalSelect) {
        let isOpen = false;
        let selectedIndex = -1;
        let filteredGames = [];
        
        // Фокус на поле
        input.addEventListener('focus', () => {
            if (input.value.trim() === '') {
                this.showAllGames(dropdown);
            } else {
                this.searchGames(input.value, dropdown);
            }
            dropdown.style.display = 'block';
            isOpen = true;
        });
        
        // Ввод текста
        input.addEventListener('input', (e) => {
            this.searchGames(e.target.value, dropdown);
            dropdown.style.display = 'block';
            isOpen = true;
            selectedIndex = -1;
        });
        
        // Клик вне элемента
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                isOpen = false;
                
                // Если поле пустое, очищаем select
                if (input.value.trim() === '') {
                    originalSelect.value = '';
                }
            }
        });
        
        // Навигация клавишами
        input.addEventListener('keydown', (e) => {
            if (!isOpen) return;
            
            const items = dropdown.querySelectorAll('.autocomplete-item');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                    this.highlightItem(items, selectedIndex);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.highlightItem(items, selectedIndex);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && items[selectedIndex]) {
                        items[selectedIndex].click();
                    } else if (items.length > 0) {
                        items[0].click();
                    }
                    break;
                    
                case 'Escape':
                    dropdown.style.display = 'none';
                    isOpen = false;
                    break;
            }
        });
    }

    searchGames(searchTerm, dropdown) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.showAllGames(dropdown);
            return;
        }
        
        const term = searchTerm.toLowerCase().trim();
        
        // Проверяем кэш
        const cacheKey = `search_${term}`;
        if (this.cache.has(cacheKey)) {
            this.displayResults(this.cache.get(cacheKey), dropdown);
            return;
        }
        
        // Умный поиск с несколькими стратегиями
        const results = this.performSearch(term);
        
        // Сохраняем в кэш
        this.cache.set(cacheKey, results);
        
        // Показываем результаты
        this.displayResults(results, dropdown);
    }

    performSearch(term) {
        const exactMatch = [];
        const startsWith = [];
        const includes = [];
        const similar = [];
        
        const words = term.split(' ').filter(w => w.length > 0);
        
        this.games.forEach(game => {
            const gameName = game.name.toLowerCase();
            const gameNameLower = gameName;
            
            // 1. Точное совпадение
            if (gameNameLower === term) {
                exactMatch.push({ game, score: 100 });
                return;
            }
            
            // 2. Начинается с поискового запроса
            if (gameNameLower.startsWith(term)) {
                startsWith.push({ game, score: 90 - (gameName.length - term.length) });
                return;
            }
            
            // 3. Содержит все слова поискового запроса
            const containsAllWords = words.every(word => gameNameLower.includes(word));
            if (containsAllWords) {
                // Вычисляем релевантность по позиции слов
                let score = 80;
                words.forEach(word => {
                    const position = gameNameLower.indexOf(word);
                    if (position === 0) score += 5;
                });
                includes.push({ game, score });
                return;
            }
            
            // 4. Частичное совпадение (хотя бы одно слово)
            const containsSomeWords = words.some(word => gameNameLower.includes(word));
            if (containsSomeWords) {
                let score = 70;
                const matchedWords = words.filter(word => gameNameLower.includes(word)).length;
                score += (matchedWords / words.length) * 10;
                includes.push({ game, score });
                return;
            }
            
            // 5. Похожие названия (нечеткий поиск)
            if (this.fuzzyMatch(gameNameLower, term)) {
                const similarity = this.calculateSimilarity(gameNameLower, term);
                if (similarity > 0.6) {
                    similar.push({ game, score: Math.round(similarity * 100) });
                }
            }
        });
        
        // Объединяем и сортируем результаты
        const allResults = [...exactMatch, ...startsWith, ...includes, ...similar];
        allResults.sort((a, b) => b.score - a.score);
        
        return allResults.map(r => r.game).slice(0, 15); // Ограничиваем 15 результатами
    }

    fuzzyMatch(str, search) {
        // Простой нечеткий поиск
        let searchIndex = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === search[searchIndex]) {
                searchIndex++;
            }
            if (searchIndex === search.length) return true;
        }
        return false;
    }

    calculateSimilarity(str1, str2) {
        // Простая метрика сходства
        const set1 = new Set(str1);
        const set2 = new Set(str2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }

    showAllGames(dropdown) {
        const recentGames = this.getRecentGames();
        const otherGames = this.games
            .filter(game => !recentGames.some(r => r.id === game.id))
            .slice(0, 20); // Показываем только 20 игр
        
        const allGames = [...recentGames, ...otherGames];
        this.displayResults(allGames, dropdown);
    }

    getRecentGames() {
        try {
            const sales = JSON.parse(localStorage.getItem('sales')) || [];
            const recentSales = sales.slice(-10); // Последние 10 продаж
            
            const gameIds = [...new Set(recentSales.map(sale => {
                const account = window.accounts?.find(acc => acc.id === sale.accountId);
                return account?.gameId;
            }).filter(id => id))];
            
            return gameIds.map(id => 
                this.games.find(game => game.id === id)
            ).filter(game => game);
        } catch (e) {
            return [];
        }
    }

    displayResults(games, dropdown) {
        if (!games || games.length === 0) {
            dropdown.innerHTML = `
                <div class="autocomplete-item" style="padding: 12px; color: #64748b; text-align: center;">
                    🎮 Игры не найдены
                </div>
            `;
            return;
        }
        
        dropdown.innerHTML = games.map((game, index) => {
            const isRecent = this.getRecentGames().some(g => g.id === game.id);
            
            return `
                <div class="autocomplete-item" 
                     data-game-id="${game.id}"
                     data-game-name="${game.name}"
                     style="
                        padding: 12px 15px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border-bottom: 1px solid #f1f5f9;
                        background: ${isRecent ? '#f8fafc' : 'white'};
                        display: flex;
                        align-items: center;
                        gap: 10px;
                     "
                     onmouseover="this.style.background='#f1f5f9'"
                     onmouseout="this.style.background='${isRecent ? '#f8fafc' : 'white'}'">
                     
                    ${game.imageUrl ? `
                        <img src="${game.imageUrl}" 
                             style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;">
                    ` : `
                        <div style="
                            width: 30px; height: 30px; 
                            background: linear-gradient(135deg, #4361ee, #3a56d4);
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 12px;
                        ">🎮</div>
                    `}
                    
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1e293b;">${game.name}</div>
                        ${game.storeLinks?.TR || game.storeLinks?.UA ? `
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                ${game.storeLinks.TR ? '🇹🇷' : ''} ${game.storeLinks.UA ? '🇺🇦' : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${isRecent ? `
                        <span style="
                            font-size: 10px;
                            padding: 2px 6px;
                            background: #dcfce7;
                            color: #166534;
                            border-radius: 10px;
                        ">Недавно</span>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики клика
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const gameId = item.getAttribute('data-game-id');
                const gameName = item.getAttribute('data-game-name');
                
                // Находим связанный input и select
                const input = dropdown.previousElementSibling;
                const originalSelect = document.getElementById(input.parentElement.nextElementSibling.id + '_hidden');
                
                if (originalSelect) {
                    // Устанавливаем значение в select
                    originalSelect.value = gameId;
                    
                    // Ищем опцию с таким значением
                    const option = Array.from(originalSelect.options).find(opt => opt.value === gameId);
                    if (option) {
                        originalSelect.selectedIndex = option.index;
                    }
                    
                    // Обновляем значение в input
                    input.value = gameName;
                    
                    // Триггерим событие изменения
                    originalSelect.dispatchEvent(new Event('change'));
                    input.dispatchEvent(new Event('change'));
                }
                
                // Закрываем выпадающий список
                dropdown.style.display = 'none';
                
                // Добавляем в историю поиска
                this.addToSearchHistory(gameId);
            });
        });
    }

    addToSearchHistory(gameId) {
        try {
            const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
            const now = Date.now();
            
            // Удаляем старые записи (старше 30 дней)
            const recentHistory = history.filter(h => now - h.timestamp < 30 * 24 * 60 * 60 * 1000);
            
            // Добавляем новую запись или обновляем время
            const existingIndex = recentHistory.findIndex(h => h.gameId === gameId);
            if (existingIndex >= 0) {
                recentHistory[existingIndex].timestamp = now;
            } else {
                recentHistory.push({ gameId, timestamp: now });
            }
            
            // Сортируем по времени (новые в начале)
            recentHistory.sort((a, b) => b.timestamp - a.timestamp);
            
            // Сохраняем только последние 50 записей
            localStorage.setItem('searchHistory', JSON.stringify(recentHistory.slice(0, 50)));
        } catch (e) {
            console.error('Ошибка сохранения истории поиска:', e);
        }
    }

    highlightItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = '#4361ee';
                item.style.color = 'white';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                const isRecent = item.style.background.includes('f8fafc');
                item.style.background = isRecent ? '#f8fafc' : 'white';
                item.style.color = '#1e293b';
            }
        });
    }
}

// Инициализируем глобально
window.autoComplete = new AutoComplete();