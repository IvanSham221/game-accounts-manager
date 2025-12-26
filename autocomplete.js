// autocomplete.js - РАБОЧАЯ ВЕРСИЯ БЕЗ ДУБЛИРОВАНИЯ
class AutoComplete {
    constructor() {
        this.games = [];
        this.cache = new Map();
        this.init();
    }

    init() {
        console.log('🚀 Инициализация автодополнения...');
        this.loadGames();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAllSelects();
            });
        } else {
            this.setupAllSelects();
        }
    }

    loadGames() {
        const gamesData = localStorage.getItem('games');
        if (gamesData) {
            this.games = JSON.parse(gamesData);
            console.log(`🎮 Загружено ${this.games.length} игр для автодополнения`);
        }
    }

    setupAllSelects() {
        console.log('🔧 Настройка автодополнения для полей...');
        
        // Ждем полной загрузки DOM
        setTimeout(() => {
            this.convertSelects();
        }, 100);
    }

    convertSelects() {
        // Преобразуем ТОЛЬКО основные select которые еще не были преобразованы
        const selectIds = ['managerGame', 'accountGame', 'filterGame', 'editGame', 'editFreeGame'];
        
        selectIds.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select && !select.classList.contains('autocomplete-converted')) {
                this.convertToAutocomplete(select);
                select.classList.add('autocomplete-converted');
            }
        });
    }

    convertToAutocomplete(selectElement) {
        if (!selectElement) return;
        
        console.log(`🔧 Преобразование select: ${selectElement.id}`);
        
        // Проверяем, не было ли уже создано автодополнение для этого поля
        const existingInput = document.getElementById(`${selectElement.id}_input`);
        if (existingInput) {
            console.log(`⚠️ Автодополнение уже создано для ${selectElement.id}`);
            return;
        }
        
        // Создаем контейнер
        const container = document.createElement('div');
        container.className = 'autocomplete-wrapper';
        container.style.position = 'relative';
        container.style.width = '100%';
        
        // Создаем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'autocomplete-input';
        input.id = `${selectElement.id}_input`;
        input.placeholder = 'Начните вводить название игры...';
        
        // Копируем стили оригинального select
        const originalStyles = window.getComputedStyle(selectElement);
        Object.assign(input.style, {
            width: '100%',
            padding: originalStyles.padding,
            fontSize: originalStyles.fontSize,
            border: originalStyles.border,
            borderRadius: originalStyles.borderRadius,
            backgroundColor: originalStyles.backgroundColor,
            color: originalStyles.color,
            cursor: 'text',
            boxSizing: 'border-box'
        });
        
        // Создаем выпадающий список
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.id = `${selectElement.id}_dropdown`;
        
        Object.assign(dropdown.style, {
            display: 'none',
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            zIndex: '9999',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            boxSizing: 'border-box'
        });
        
        // Сохраняем оригинальный select (скрываем)
        const hiddenSelect = selectElement.cloneNode(true);
        hiddenSelect.id = `${selectElement.id}_hidden`;
        hiddenSelect.style.display = 'none';
        
        // Устанавливаем начальное значение
        if (selectElement.value) {
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            if (selectedOption) {
                input.value = selectedOption.textContent;
            }
        }
        
        // Добавляем элементы в контейнер
        container.appendChild(input);
        container.appendChild(dropdown);
        
        // Заменяем оригинальный select
        selectElement.parentNode.insertBefore(container, selectElement);
        selectElement.parentNode.insertBefore(hiddenSelect, selectElement.nextSibling);
        selectElement.style.display = 'none';
        
        // Настраиваем обработчики
        this.setupHandlers(input, dropdown, hiddenSelect, selectElement);
    }

    setupHandlers(input, dropdown, hiddenSelect, originalSelect) {
        // Фокус на поле ввода
        input.addEventListener('focus', () => {
            if (input.value.trim() === '' && this.games.length > 0) {
                this.showAllGames(dropdown);
            }
            dropdown.style.display = 'block';
            input.style.borderBottomLeftRadius = '0';
            input.style.borderBottomRightRadius = '0';
        });
        
        // Ввод текста
        input.addEventListener('input', (e) => {
            this.searchGames(e.target.value, dropdown);
            dropdown.style.display = 'block';
        });
        
        // Клик на элемент автодополнения
        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const gameId = item.dataset.gameId;
                const gameName = item.dataset.gameName;
                
                input.value = gameName;
                
                if (hiddenSelect) {
                    hiddenSelect.value = gameId;
                    const event = new Event('change', { bubbles: true });
                    hiddenSelect.dispatchEvent(event);
                    
                    if (originalSelect) {
                        originalSelect.value = gameId;
                        originalSelect.dispatchEvent(event);
                    }
                }
                
                dropdown.style.display = 'none';
                input.style.borderBottomLeftRadius = '';
                input.style.borderBottomRightRadius = '';
                
                // Если это поле поиска в менеджере, запускаем поиск
                if (input.id.includes('managerGame')) {
                    setTimeout(() => searchByGame(), 100);
                }
            }
        });
        
        // Закрытие по клику вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-wrapper')) {
                dropdown.style.display = 'none';
                input.style.borderBottomLeftRadius = '';
                input.style.borderBottomRightRadius = '';
            }
        });
    }

    searchGames(searchTerm, dropdown) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.showAllGames(dropdown);
            return;
        }
        
        const term = searchTerm.toLowerCase().trim();
        const results = this.games.filter(game => 
            game.name.toLowerCase().includes(term)
        ).slice(0, 15);
        
        this.displayResults(results, dropdown);
    }

    showAllGames(dropdown) {
        if (this.games.length === 0) return;
        
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
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                     "
                     onmouseenter="this.style.background='#f1f5f9'"
                     onmouseleave="this.style.background='white'">
                     
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
                    
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1e293b;">${game.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            ${gameAccounts.length > 0 ? `📊 ${gameAccounts.length} акк.` : 'Нет аккаунтов'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Инициализируем только один раз
if (!window.autoComplete) {
    window.autoComplete = new AutoComplete();
}