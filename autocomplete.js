// autocomplete.js - Исправленная версия
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
    }

    loadGames() {
        const gamesData = localStorage.getItem('games');
        if (gamesData) {
            this.games = JSON.parse(gamesData);
            console.log(`🎮 Загружено ${this.games.length} игр для автодополнения`);
        }
    }

    setupAllSelects() {
        // Находим все селекты с играми
        const selectIds = [
            'accountGame',
            'filterGame', 
            'managerGame',
            'editGame',
            'editFreeGame'
        ];

        // Ищем все селекты
        const selects = document.querySelectorAll('select');
        
        selects.forEach(select => {
            if (selectIds.includes(select.id) || select.id.includes('Game') || select.id.includes('game')) {
                if (!select.classList.contains('autocomplete-initialized')) {
                    this.convertToAutocomplete(select);
                    select.classList.add('autocomplete-initialized');
                }
            }
        });
    }

    convertToAutocomplete(selectElement) {
        // Создаем контейнер
        const container = document.createElement('div');
        container.className = 'autocomplete-wrapper';
        container.style.position = 'relative';
        container.style.width = '100%';
        
        // Копируем стили оригинального select
        const originalStyles = window.getComputedStyle(selectElement);
        
        // Создаем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'autocomplete-input';
        input.placeholder = 'Начните вводить название игры...';
        input.style.width = '100%';
        input.style.padding = originalStyles.padding;
        input.style.fontSize = originalStyles.fontSize;
        input.style.border = originalStyles.border;
        input.style.borderRadius = originalStyles.borderRadius;
        input.style.backgroundColor = originalStyles.backgroundColor;
        input.style.color = originalStyles.color;
        input.style.cursor = 'text';
        
        // Создаем выпадающий список
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        dropdown.style.zIndex = '9999';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #e2e8f0';
        dropdown.style.borderRadius = '0 0 8px 8px';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        dropdown.style.maxHeight = '300px';
        dropdown.style.overflowY = 'auto';
        
        // Сохраняем оригинальный select (скрываем)
        const originalSelectId = selectElement.id;
        const hiddenSelect = selectElement.cloneNode(true);
        hiddenSelect.id = originalSelectId + '_hidden';
        hiddenSelect.style.display = 'none';
        
        // Устанавливаем начальное значение
        if (selectElement.value) {
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            if (selectedOption) {
                input.value = selectedOption.textContent;
            }
        } else {
            input.value = '';
        }
        
        // Добавляем элементы в контейнер
        container.appendChild(input);
        container.appendChild(dropdown);
        
        // Заменяем оригинальный select
        selectElement.parentNode.insertBefore(container, selectElement);
        selectElement.parentNode.insertBefore(hiddenSelect, selectElement.nextSibling);
        selectElement.style.display = 'none';
        
        // Настраиваем обработчики
        this.setupInputHandlers(input, dropdown, hiddenSelect);
        
        return { input, dropdown, hiddenSelect };
    }

    setupInputHandlers(input, dropdown, hiddenSelect) {
        let isOpen = false;
        let selectedIndex = -1;
        
        // Фокус на поле ввода
        input.addEventListener('focus', () => {
            if (input.value.trim() === '') {
                this.showAllGames(dropdown);
            } else {
                this.searchGames(input.value, dropdown);
            }
            dropdown.style.display = 'block';
            isOpen = true;
            input.style.borderBottomLeftRadius = '0';
            input.style.borderBottomRightRadius = '0';
        });
        
        // Ввод текста
        input.addEventListener('input', (e) => {
            this.searchGames(e.target.value, dropdown);
            dropdown.style.display = 'block';
            isOpen = true;
            selectedIndex = -1;
            
            // Очищаем скрытый select если поле пустое
            if (e.target.value.trim() === '') {
                hiddenSelect.value = '';
                hiddenSelect.dispatchEvent(new Event('change'));
            }
        });
        
        // Клик вне элемента
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.style.display = 'none';
                isOpen = false;
                input.style.borderBottomLeftRadius = '';
                input.style.borderBottomRightRadius = '';
                
                // Если поле пустое, но был выбран элемент - восстанавливаем
                if (input.value.trim() === '' && hiddenSelect.value) {
                    const selectedOption = hiddenSelect.options[hiddenSelect.selectedIndex];
                    if (selectedOption) {
                        input.value = selectedOption.textContent;
                    }
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
                        this.selectGame(items[selectedIndex], input, hiddenSelect);
                    }
                    dropdown.style.display = 'none';
                    isOpen = false;
                    input.style.borderBottomLeftRadius = '';
                    input.style.borderBottomRightRadius = '';
                    break;
                    
                case 'Escape':
                    dropdown.style.display = 'none';
                    isOpen = false;
                    input.style.borderBottomLeftRadius = '';
                    input.style.borderBottomRightRadius = '';
                    break;
            }
        });
        
        // Ссылка на контейнер
        const container = input.parentElement;
    }

    searchGames(searchTerm, dropdown) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.showAllGames(dropdown);
            return;
        }
        
        const term = searchTerm.toLowerCase().trim();
        const results = this.performSearch(term);
        this.displayResults(results, dropdown);
    }

    performSearch(term) {
        const results = [];
        const words = term.split(' ').filter(w => w.length > 0);
        
        this.games.forEach(game => {
            const gameName = game.name.toLowerCase();
            let score = 0;
            
            // 1. Точное совпадение
            if (gameName === term) {
                score = 100;
            }
            // 2. Начинается с
            else if (gameName.startsWith(term)) {
                score = 90;
            }
            // 3. Содержит все слова
            else if (words.every(word => gameName.includes(word))) {
                score = 80;
            }
            // 4. Содержит хотя бы одно слово
            else if (words.some(word => gameName.includes(word))) {
                score = 70;
            }
            // 5. Нечеткое совпадение
            else if (this.fuzzyMatch(gameName, term)) {
                score = 60;
            }
            
            if (score > 0) {
                results.push({ game, score });
            }
        });
        
        // Сортируем по релевантности
        results.sort((a, b) => b.score - a.score);
        return results.map(r => r.game).slice(0, 15);
    }

    fuzzyMatch(str, search) {
        let searchIndex = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === search[searchIndex]) {
                searchIndex++;
            }
            if (searchIndex === search.length) return true;
        }
        return false;
    }

    showAllGames(dropdown) {
        // Показываем популярные игры (с аккаунтами) и недавние
        const gamesWithAccounts = this.games.filter(game => {
            const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
            return accounts.some(acc => acc.gameId === game.id);
        });
        
        const otherGames = this.games
            .filter(game => !gamesWithAccounts.some(g => g.id === game.id))
            .slice(0, 10);
        
        const allGames = [...gamesWithAccounts, ...otherGames];
        this.displayResults(allGames, dropdown);
    }

    displayResults(games, dropdown) {
        if (!games || games.length === 0) {
            dropdown.innerHTML = `
                <div class="autocomplete-item" style="padding: 15px; color: #64748b; text-align: center;">
                    🎮 Игры не найдены
                </div>
            `;
            return;
        }
        
        dropdown.innerHTML = games.map(game => {
            const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
            const gameAccounts = accounts.filter(acc => acc.gameId === game.id);
            
            return `
                <div class="autocomplete-item" 
                     data-game-id="${game.id}"
                     data-game-name="${game.name}"
                     style="
                        padding: 12px 15px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                     "
                     onmouseenter="this.style.background='#f1f5f9'"
                     onmouseleave="this.style.background='white'">
                     
                    ${game.imageUrl ? `
                        <img src="${game.imageUrl}" 
                             style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
                    ` : `
                        <div style="
                            width: 40px; height: 40px;
                            background: linear-gradient(135deg, #4361ee, #3a56d4);
                            border-radius: 6px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 18px;
                        ">🎮</div>
                    `}
                    
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1e293b;">${game.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            ${gameAccounts.length > 0 ? `📊 ${gameAccounts.length} акк. • ` : ''}
                            ${game.storeLinks?.TR ? '🇹🇷' : ''} ${game.storeLinks?.UA ? '🇺🇦' : ''}
                        </div>
                    </div>
                    
                    ${gameAccounts.length > 0 ? `
                        <span style="
                            font-size: 10px;
                            padding: 2px 8px;
                            background: #dcfce7;
                            color: #166534;
                            border-radius: 10px;
                            font-weight: 600;
                        ">Есть аккаунты</span>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики клика
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const input = dropdown.previousElementSibling;
                const hiddenSelect = document.getElementById(input.parentElement.nextElementSibling.id);
                this.selectGame(item, input, hiddenSelect);
                
                dropdown.style.display = 'none';
                input.style.borderBottomLeftRadius = '';
                input.style.borderBottomRightRadius = '';
            });
        });
    }

    selectGame(item, input, hiddenSelect) {
        const gameId = item.getAttribute('data-game-id');
        const gameName = item.getAttribute('data-game-name');
        
        // Устанавливаем значение в input
        input.value = gameName;
        
        // Устанавливаем значение в скрытый select
        if (hiddenSelect) {
            hiddenSelect.value = gameId;
            
            // Ищем опцию с таким значением
            const option = Array.from(hiddenSelect.options).find(opt => opt.value === gameId);
            if (option) {
                hiddenSelect.selectedIndex = option.index;
            }
            
            // Триггерим событие изменения
            const changeEvent = new Event('change', { bubbles: true });
            hiddenSelect.dispatchEvent(changeEvent);
            
            // Также триггерим на оригинальном select если он есть
            const originalId = hiddenSelect.id.replace('_hidden', '');
            const originalSelect = document.getElementById(originalId);
            if (originalSelect) {
                originalSelect.value = gameId;
                originalSelect.dispatchEvent(changeEvent);
            }
        }
        
        console.log(`✅ Выбрана игра: ${gameName} (ID: ${gameId})`);
    }

    highlightItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = '#4361ee';
                item.style.color = 'white';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'white';
                item.style.color = '#1e293b';
            }
        });
    }
}

// Инициализируем
window.autoComplete = new AutoComplete();