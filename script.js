// script.js - ПОЛНАЯ ВЕРСИЯ с Firebase и синхронизацией

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И НАСТРОЙКИ
// ============================================

let games = [];
let accounts = [];
let sales = [];
let currentUser = null;

// ============================================
// СИСТЕМА АВТОРИЗАЦИИ И НАВИГАЦИИ
// ============================================

// Проверка авторизации
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        return false;
    }
    
    // Проверяем, активен ли пользователь (для работников)
    if (currentUser.role === 'worker') {
        const workers = JSON.parse(localStorage.getItem('workers')) || [];
        const worker = workers.find(w => w.username === currentUser.username);
        if (!worker || !worker.active) {
            localStorage.removeItem('currentUser');
            return false;
        }
    }
    
    return true;
}

// ==================== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ МОДАЛЬНЫХ ОКОН ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.add('fade-out');
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (content) {
                content.classList.remove('fade-out');
            }
        }, 300);
    }
}

// Обновленные функции закрытия
function closeModal() {
    closeModal('editModal');
}

function closeFreeModal() {
    closeModal('editFreeModal');
}

function closeSaleModal() {
    closeModal('saleModal');
}

// Обработчик клика вне модального окна
window.onclick = function(event) {
    const modals = ['editModal', 'editFreeModal', 'saleModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && event.target === modal) {
            closeModal(modalId);
        }
    });
}

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('editModal');
        closeModal('editFreeModal');
        closeModal('saleModal');
    }
});

// Выход из системы
function logout() {
    if (security && security.logout) {
        security.logout();
    } else {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

function updateActivity() {
    if (security && security.updateSession) {
        security.updateSession();
    }
}

document.addEventListener('click', updateActivity);
document.addEventListener('keypress', updateActivity);

// ==================== ОБНОВЛЕНИЕ НАВИГАЦИИ ====================
function updateNavigation() {
    const nav = document.querySelector('.nav-buttons');
    if (!nav) return;
    
    const user = security.getCurrentUser();
    if (!user) return;
    
    let navButtons = `
        <button onclick="security.updateSession(); location.href='manager.html'" class="btn ${location.pathname.includes('manager.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🎮</span>
            <span class="nav-text">Панель менеджера</span>
        </button>
        <button onclick="security.updateSession(); location.href='add-account.html'" class="btn ${location.pathname.includes('add-account.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>➕</span>
            <span class="nav-text">Добавить аккаунт</span>
        </button>
        <button onclick="security.updateSession(); location.href='accounts.html'" class="btn ${location.pathname.includes('accounts.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>📋</span>
            <span class="nav-text">Список аккаунтов</span>
        </button>
        <button onclick="security.updateSession(); location.href='free-accounts.html'" class="btn ${location.pathname.includes('free-accounts.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🆓</span>
            <span class="nav-text">Свободные аккаунты</span>
        </button>
        <button onclick="security.updateSession(); location.href='games.html'" class="btn ${location.pathname.includes('games.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🎯</span>
            <span class="nav-text">Управление играми</span>
        </button>
        <button onclick="security.updateSession(); location.href='reports.html'" class="btn ${location.pathname.includes('reports.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>📊</span>
            <span class="nav-text">Отчеты</span>
        </button>
    `;
    
    // Только администратор видит кнопку "Работники"
    if (user.role === 'admin') {
        navButtons += `
            <button onclick="security.updateSession(); location.href='workers.html'" class="btn ${location.pathname.includes('workers.html') ? 'btn-primary' : 'btn-secondary'}">
                <span>👑</span>
                <span class="nav-text">Работники</span>
            </button>
        `;
    }
    
    // Кнопка экспорта
    navButtons += `
        <button onclick="security.updateSession(); exportToCSV()" class="btn btn-success">
            <span>📁</span>
            <span class="nav-text">Экспорт CSV</span>
        </button>
    `;
    
    // Информация о пользователе и выход
    navButtons += `
        <div class="user-info">
            <span>${user.role === 'admin' ? '👑' : '👷'} ${user.name}</span>
            <button onclick="security.logout()" class="btn btn-small btn-danger">Выйти</button>
        </div>
    `;
    
    nav.innerHTML = navButtons;
    
    // Добавляем кнопку синхронизации
    setTimeout(addSyncButton, 100);
}

// КНОПКА ПРИНУДИТЕЛЬНОЙ СИНХРОНИЗАЦИИ
function addSyncButton() {
    const nav = document.querySelector('.nav-buttons');
    if (nav && !document.querySelector('#syncButton')) {
        const syncBtn = document.createElement('button');
        syncBtn.id = 'syncButton';
        syncBtn.className = 'btn btn-success';
        syncBtn.innerHTML = '🔄 Синхронизировать';
        syncBtn.onclick = async function() {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '🔄 Синхронизация...';
            
            if (window.dataSync && window.dataSync.forceFullSync) {
                const result = await dataSync.forceFullSync();
                
                if (result.success) {
                    // Обновляем глобальные переменные
                    games = JSON.parse(localStorage.getItem('games')) || [];
                    accounts = JSON.parse(localStorage.getItem('accounts')) || [];
                    sales = JSON.parse(localStorage.getItem('sales')) || [];
                    
                    // Обновляем текущую страницу
                    const currentPage = window.location.pathname.split('/').pop();
                    if (currentPage === 'accounts.html') {
                        displayAccounts();
                        loadGamesForFilter();
                    } else if (currentPage === 'games.html') {
                        displayGames();
                    } else if (currentPage === 'manager.html') {
                        loadGamesForManager();
                    } else if (currentPage === 'free-accounts.html') {
                        displayFreeAccounts();
                    } else if (currentPage === 'reports.html') {
                        // Если на странице отчетов, обновляем отчет
                        if (typeof generateFullReport === 'function') {
                            generateFullReport();
                        }
                    }
                    
                    showNotification('Все данные синхронизированы! ✅', 'success');
                } else {
                    showNotification('Ошибка синхронизации ❌', 'error');
                }
            }
            
            syncBtn.disabled = false;
            syncBtn.innerHTML = '🔄 Синхронизировать';
        };
        
        // Добавляем кнопку перед кнопкой выхода
        const userInfo = nav.querySelector('.user-info');
        if (userInfo) {
            nav.insertBefore(syncBtn, userInfo);
        } else {
            nav.appendChild(syncBtn);
        }
    }
}

const originalSaveToStorage = saveToStorage;
window.saveToStorage = function(dataType, data) {
    security.updateSession(); // Обновляем сессию при действиях
    return originalSaveToStorage(dataType, data);
};

const originalSaveToFirebase = saveToFirebase;
window.saveToFirebase = function() {
    security.updateSession();
    return originalSaveToFirebase();
};

// Защита от XSS в полях ввода
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'`]/g, '');
}

// ============================================
// МОБИЛЬНОЕ МЕНЮ И UI УЛУЧШЕНИЯ
// ============================================

// Мобильное меню
function initMobileMenu() {
    const navElement = document.querySelector('.nav-buttons');
    if (!navElement || document.querySelector('.mobile-menu-toggle')) return;
    
    // Создаем кнопку переключения меню
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.innerHTML = '☰ Меню навигации';
    toggleBtn.type = 'button';
    
    toggleBtn.onclick = function() {
        navElement.classList.toggle('active');
        this.innerHTML = navElement.classList.contains('active') 
            ? '✕ Закрыть меню' 
            : '☰ Меню навигации';
    };
    
    // Вставляем кнопку перед навигацией
    navElement.parentNode.insertBefore(toggleBtn, navElement);
    
    // Автоматически скрываем меню на мобильных
    if (window.innerWidth <= 768) {
        navElement.classList.remove('active');
    }
    
    // Обновляем при изменении размера окна
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navElement.classList.add('active');
        } else {
            navElement.classList.remove('active');
        }
        toggleBtn.innerHTML = '☰ Меню навигации';
    });
}

// UI улучшения (тема, уведомления)
function initUIEnhancements() {
    // Переключатель темы
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
        <button class="theme-btn" onclick="toggleTheme()">
            <span id="themeIcon">🌙</span>
        </button>
    `;
    document.body.appendChild(themeToggle);
    
    // Проверяем сохраненную тему
    if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.textContent = '☀️';
}
    
    // Плавное появление
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease-in';
        
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 100);
    });
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        if (themeIcon) themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Система уведомлений
function showNotification(message, type = 'info', duration = 3000) {
    // Проверяем, есть ли уже уведомление
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.innerHTML = `
        <span style="font-size: 1.2em;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Скрываем через duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }, duration);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация мобильного меню
    initMobileMenu();
    
    // Проверка сессии
    if (!security || !security.isSessionValid()) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'index.html') {
            console.log('Сессия недействительна, перенаправление на вход');
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Обновление навигации
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
    
    // Загрузка данных
    if (typeof loadAllDataWithSync === 'function') {
        loadAllDataWithSync().then(() => {
            console.log('✅ Все данные загружены');
            
            // Инициализация страниц
            const currentPage = window.location.pathname.split('/').pop();
            
            if (currentPage === 'add-account.html' && typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            } else if (currentPage === 'accounts.html' && typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
                displayAccounts();
            } else if (currentPage === 'games.html' && typeof displayGames === 'function') {
                displayGames();
            } else if (currentPage === 'manager.html' && typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            } else if (currentPage === 'free-accounts.html' && typeof displayFreeAccounts === 'function') {
                displayFreeAccounts();
            } else if (currentPage === 'reports.html') {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                const startInput = document.getElementById('startDate');
                const endInput = document.getElementById('endDate');
                if (startInput && endInput) {
                    startInput.value = startDate.toISOString().split('T')[0];
                    endInput.value = endDate.toISOString().split('T')[0];
                }
            }
            
            // Показываем уведомление приветствия
            const user = security.getCurrentUser();
            if (user && typeof showNotification === 'function') {
                setTimeout(() => {
                    showNotification(`Добро пожаловать, ${user.name}! 👋`, 'info', 2000);
                }, 1000);
            }
        });
    }
});

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ВСЕХ ДАННЫХ С СИНХРОНИЗАЦИЕЙ
async function loadAllDataWithSync() {
    try {
        console.log('🔄 Загружаем данные с синхронизацией...');
        
        // Используем forceFullSync для первоначальной загрузки
        if (window.dataSync && window.dataSync.forceFullSync) {
            await dataSync.forceFullSync();
        }
        
        // Обновляем глобальные переменные из localStorage
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
        
        console.log(`📊 Данные загружены: ${games.length} игр, ${accounts.length} аккаунтов, ${sales.length} продаж`);
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных:', error);
        
        // Загружаем из localStorage как запасной вариант
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
    }
}

function initApp() {
    const currentPage = window.location.pathname.split('/').pop();
    const user = security.getCurrentUser();
    
    if (user) {
        console.log('👤 Пользователь:', user.name);
        
        // Обновляем навигацию
        if (typeof updateNavigation === 'function') {
            updateNavigation();
        }
        
        // Загружаем данные с синхронизацией
        loadAllDataWithSync().then(() => {
            console.log('✅ Все данные загружены и синхронизированы');
            
            // Инициализация страниц
            if (currentPage === 'add-account.html' && typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            } else if (currentPage === 'accounts.html' && typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
                displayAccounts();
            } else if (currentPage === 'games.html' && typeof displayGames === 'function') {
                displayGames();
            } else if (currentPage === 'manager.html' && typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            } else if (currentPage === 'free-accounts.html' && typeof displayFreeAccounts === 'function') {
                displayFreeAccounts();
            } else if (currentPage === 'reports.html') {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                const startInput = document.getElementById('startDate');
                const endInput = document.getElementById('endDate');
                if (startInput && endInput) {
                    startInput.value = startDate.toISOString().split('T')[0];
                    endInput.value = endDate.toISOString().split('T')[0];
                }
            }
            
            // Инициализация UI улучшений (ДОБАВЬТЕ ЭТУ СТРОЧКУ!)
            initUIEnhancements();
            
            // Запускаем проверку обновлений
            startSyncChecker();
            
        }).catch(error => {
            console.error('❌ Ошибка загрузки данных:', error);
        });
        
        // Показываем уведомление
        if (typeof showNotification === 'function') {
            showNotification(`Добро пожаловать, ${user.name}! 👋`, 'info', 2000);
        }
    }
}

// ============================================
// СИСТЕМА СОХРАНЕНИЯ И СИНХРОНИЗАЦИИ
// ============================================

// Функция сохранения данных с синхронизацией
async function saveToStorage(dataType, data) {
    console.log(`💾 Сохранение ${dataType}...`);
    
    // Сохраняем в локальное хранилище для быстрого доступа
    localStorage.setItem(dataType, JSON.stringify(data));
    
    // Обновляем глобальные переменные
    switch(dataType) {
        case 'games': games = data; break;
        case 'accounts': accounts = data; break;
        case 'sales': sales = data; break;
    }
    
    // Синхронизируем с Firebase
    if (window.dataSync && window.dataSync.saveData) {
        const result = await dataSync.saveData(dataType, data);
        
        if (result.synced) {
            console.log(`✅ ${dataType} синхронизированы с Firebase`);
            if (typeof showNotification === 'function') {
                showNotification(`${dataType} сохранены и синхронизированы`, 'success', 1500);
            }
        } else if (result.local) {
            console.log(`⚠️ ${dataType} сохранены локально (Firebase недоступен)`);
        }
        
        return result;
    }
    
    return { success: true, local: true };
}

// Совместимость со старым кодом
async function saveToFirebase() {
    const results = [];
    
    results.push(await saveToStorage('games', games));
    results.push(await saveToStorage('accounts', accounts));
    results.push(await saveToStorage('sales', sales));
    
    return results;
}

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ДАННЫХ ПРИ РЕДАКТИРОВАНИИ
async function refreshData(dataType) {
    try {
        if (window.dataSync && window.dataSync.loadData) {
            const freshData = await dataSync.loadData(dataType);
            
            switch(dataType) {
                case 'games':
                    games = freshData;
                    localStorage.setItem('games', JSON.stringify(games));
                    if (typeof displayGames === 'function') displayGames();
                    if (typeof loadGamesForSelect === 'function') loadGamesForSelect();
                    if (typeof loadGamesForFilter === 'function') loadGamesForFilter();
                    if (typeof loadGamesForManager === 'function') loadGamesForManager();
                    break;
                    
                case 'accounts':
                    accounts = freshData;
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                    if (typeof displayAccounts === 'function') displayAccounts();
                    if (typeof displayFreeAccounts === 'function') displayFreeAccounts();
                    break;
                    
                case 'sales':
                    sales = freshData;
                    localStorage.setItem('sales', JSON.stringify(sales));
                    break;
            }
            
            console.log(`✅ Данные "${dataType}" обновлены`);
            return freshData;
        }
    } catch (error) {
        console.error(`❌ Ошибка обновления данных "${dataType}":`, error);
    }
    
    return null;
}

// ============================================
// ФУНКЦИИ ДЛЯ ИГР
// ============================================

async function addGame() {
    const gameName = document.getElementById('gameName').value.trim();
    if (!gameName) {
        showNotification('Введите название игры', 'warning');
        return;
    }
    
    // Проверяем на дубликаты среди уже загруженных игр
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        showNotification('Игра с таким названием уже существует', 'error');
        return;
    }
    
    // Сначала показываем уведомление о начале сохранения
    showNotification(`Добавляем игру "${gameName}"...`, 'info', 1000);
    
    const newGame = {
        id: Date.now(),
        name: gameName,
        created: new Date().toLocaleDateString('ru-RU'),
        addedBy: security.getCurrentUser()?.name || 'Неизвестно'
    };
    
    games.push(newGame);
    const result = await saveToStorage('games', games);
    
    document.getElementById('gameName').value = '';
    
    // Принудительно обновляем все страницы
    if (result.synced) {
        showNotification(`Игра "${gameName}" успешно добавлена и синхронизирована! 🎮`, 'success');
        
        // Запускаем принудительную синхронизацию на всех устройствах
        if (window.dataSync && window.dataSync.forceFullSync) {
            setTimeout(() => {
                dataSync.forceFullSync().then(() => {
                    console.log('✅ Принудительная синхронизация запущена');
                });
            }, 1000);
        }
    } else {
        showNotification(`Игра "${gameName}" добавлена локально 🎮`, 'warning');
    }
}

function displayGames() {
    const list = document.getElementById('gamesList');
    if (games.length === 0) {
        list.innerHTML = '<div class="empty">Нет добавленных игр</div>';
        return;
    }
    
    list.innerHTML = games.map(game => `
        <div class="item">
            <div class="account-info">
                <strong>${game.name}</strong>
                <div><small>Добавлена: ${game.created}</small></div>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteGame(${game.id})">🗑️ Удалить</button>
        </div>
    `).join('');
}

async function deleteGame(gameId) {
    const accountsWithThisGame = accounts.filter(acc => acc.gameId === gameId);
    const game = games.find(g => g.id === gameId);
    
    if (accountsWithThisGame.length > 0) {
        if (!confirm(`Удалить игру "${game.name}"? ${accountsWithThisGame.length} аккаунт(ов) с этой игрой останутся без привязки.`)) {
            return;
        }
    } else {
        if (!confirm(`Удалить игру "${game.name}"?`)) {
            return;
        }
    }
    
    games = games.filter(game => game.id !== gameId);
    await saveToStorage('games', games);
    displayGames();
    loadGamesForSelect();
    loadGamesForFilter();
    
    showNotification(`Игра "${game.name}" удалена`, 'info');
}

// ============================================
// ФУНКЦИИ ДЛЯ АККАУНТОВ
// ============================================

async function addAccount() {
    const formData = getAccountFormData();
    if (!formData) {
        return;
    }
    
    const newAccount = {
        id: Date.now(),
        ...formData,
        created: new Date().toLocaleDateString('ru-RU'),
        timestamp: new Date().toISOString()
    };

    accounts.push(newAccount);
    await saveToStorage('accounts', accounts);
    clearAccountForm();
    
    showNotification('Аккаунт успешно добавлен и синхронизирован! 🎮', 'success');
}

function getAccountFormData() {
    const gameSelect = document.getElementById('accountGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    const psnLogin = document.getElementById('psnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
        return null;
    }
    
    const gameData = game ? {
        gameId: gameId,
        gameName: game.name
    } : {
        gameId: 0,
        gameName: 'Свободный'
    };

    return {
        ...gameData,
        purchaseAmount: parseFloat(document.getElementById('purchaseAmount').value) || 0,
        psnLogin: psnLogin,
        psnPassword: document.getElementById('psnPassword').value,
        email: document.getElementById('email').value.trim(),
        emailPassword: document.getElementById('emailPassword').value,
        backupEmail: document.getElementById('backupEmail').value.trim(),
        birthDate: document.getElementById('birthDate').value.trim(),
        psnCodes: document.getElementById('psnCodes').value.trim(),
        psnAuthenticator: document.getElementById('psnAuthenticator').value.trim(),
        positions: {
            p2_ps4: parseInt(document.getElementById('p2_ps4').value) || 0,
            p3_ps4: parseInt(document.getElementById('p3_ps4').value) || 0,
            p2_ps5: parseInt(document.getElementById('p2_ps5').value) || 0,
            p3_ps5: parseInt(document.getElementById('p3_ps5').value) || 0
        }
    };
}

function clearAccountForm() {
    document.getElementById('accountGame').selectedIndex = 0;
    document.getElementById('purchaseAmount').value = '';
    document.getElementById('psnLogin').value = '';
    document.getElementById('psnPassword').value = '';
    document.getElementById('email').value = '';
    document.getElementById('emailPassword').value = '';
    document.getElementById('backupEmail').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('psnCodes').value = '';
    document.getElementById('psnAuthenticator').value = '';
    document.getElementById('p2_ps4').value = '0';
    document.getElementById('p3_ps4').value = '0';
    document.getElementById('p2_ps5').value = '0';
    document.getElementById('p3_ps5').value = '0';
}

// ============================================
// ОТОБРАЖЕНИЕ АККАУНТОВ
// ============================================

function displayAccounts(accountsToShow = accounts) {
    const list = document.getElementById('accountsList');
    
    if (accountsToShow.length === 0) {
        list.innerHTML = '<div class="empty">Аккаунты не найдены</div>';
        return;
    }
    
    list.innerHTML = accountsToShow.map(account => `
        <div class="account-card">
            <div class="account-header">
                <div class="account-game">${account.gameName}</div>
                <div class="account-price">${account.purchaseAmount} ₽</div>
            </div>
            
            <div class="account-info">
                <div class="info-row">
                    <span class="info-label">Логин PSN:</span>
                    <span class="info-value">${account.psnLogin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль PSN:</span>
                    <span class="info-value">${account.psnPassword || 'Не указан'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Коды PSN:</span>
                    <span class="info-value">${account.psnCodes || 'Не указаны'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Почта:</span>
                    <span class="info-value">${account.email || 'Не указана'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль почты:</span>
                    <span class="info-value">${account.emailPassword || 'Не указан'}</span>
                </div>
                ${account.birthDate ? `<div class="info-row"><span class="info-label">Дата рождения:</span><span class="info-value">${account.birthDate}</span></div>` : ''}
                ${account.backupEmail ? `<div class="info-row"><span class="info-label">Резервная почта:</span><span class="info-value">${account.backupEmail}</span></div>` : ''}
                ${account.psnAuthenticator ? `<div class="info-row"><span class="info-label">PSN Аутентификатор:</span><span class="info-value">${account.psnAuthenticator}</span></div>` : ''}
            </div>
            
            <div class="positions-info">
                <h4>Позиции:</h4>
                <div class="positions-grid">
                    <div class="position-item"><span>П2 PS4:</span><strong>${account.positions.p2_ps4}</strong></div>
                    <div class="position-item"><span>П3 PS4:</span><strong>${account.positions.p3_ps4}</strong></div>
                    <div class="position-item"><span>П2 PS5:</span><strong>${account.positions.p2_ps5}</strong></div>
                    <div class="position-item"><span>П3 PS5:</span><strong>${account.positions.p3_ps5}</strong></div>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="btn btn-primary btn-small" onclick="editAccount(${account.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteAccount(${account.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Свободные аккаунты
function displayFreeAccounts() {
    const freeAccounts = accounts.filter(acc => !acc.gameId || acc.gameId === 0);
    const list = document.getElementById('freeAccountsList');
    
    if (freeAccounts.length === 0) {
        list.innerHTML = '<div class="empty">Нет свободных аккаунтов</div>';
        return;
    }
    
    list.innerHTML = freeAccounts.map(account => `
        <div class="account-card">
            <div class="account-header">
                <div class="account-game" style="color: #e74c3c;">🆓 Свободный</div>
                <div class="account-price">${account.purchaseAmount} ₽</div>
            </div>
            
            <div class="account-info">
                <div class="info-row">
                    <span class="info-label">Логин PSN:</span>
                    <span class="info-value">${account.psnLogin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль PSN:</span>
                    <span class="info-value">${account.psnPassword || 'Не указан'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Коды PSN:</span>
                    <span class="info-value">${account.psnCodes || 'Не указаны'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Почта:</span>
                    <span class="info-value">${account.email || 'Не указана'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль почты:</span>
                    <span class="info-value">${account.emailPassword || 'Не указан'}</span>
                </div>
                ${account.birthDate ? `<div class="info-row"><span class="info-label">Дата рождения:</span><span class="info-value">${account.birthDate}</span></div>` : ''}
                ${account.backupEmail ? `<div class="info-row"><span class="info-label">Резервная почта:</span><span class="info-value">${account.backupEmail}</span></div>` : ''}
                ${account.psnAuthenticator ? `<div class="info-row"><span class="info-label">PSN Аутентификатор:</span><span class="info-value">${account.psnAuthenticator}</span></div>` : ''}
            </div>
            
            <div class="positions-info">
                <h4>Позиции:</h4>
                <div class="positions-grid">
                    <div class="position-item"><span>П2 PS4:</span><strong>${account.positions.p2_ps4}</strong></div>
                    <div class="position-item"><span>П3 PS4:</span><strong>${account.positions.p3_ps4}</strong></div>
                    <div class="position-item"><span>П2 PS5:</span><strong>${account.positions.p2_ps5}</strong></div>
                    <div class="position-item"><span>П3 PS5:</span><strong>${account.positions.p3_ps5}</strong></div>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="btn btn-success btn-small" onclick="attachGameToAccount(${account.id})">🎮 Привязать игру</button>
                <button class="btn btn-primary btn-small" onclick="editAccount(${account.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteAccount(${account.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

function refreshGamesPage() {
    if (!window.location.pathname.includes('games.html')) return;
    
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    if (JSON.stringify(freshGames) !== JSON.stringify(games)) {
        games = freshGames;
        if (typeof displayGames === 'function') {
            displayGames();
            console.log('🔄 UI игр обновлен');
        }
    }
}

// Функция для обновления страницы аккаунтов
function refreshAccountsPage() {
    const freshAccounts = JSON.parse(localStorage.getItem('accounts')) || [];
    if (JSON.stringify(freshAccounts) !== JSON.stringify(accounts)) {
        accounts = freshAccounts;
        
        if (window.location.pathname.includes('accounts.html') && typeof displayAccounts === 'function') {
            displayAccounts();
            console.log('🔄 UI аккаунтов обновлен');
        }
        
        if (window.location.pathname.includes('free-accounts.html') && typeof displayFreeAccounts === 'function') {
            displayFreeAccounts();
            console.log('🔄 UI свободных аккаунтов обновлен');
        }
    }
}

// Функция для обновления всех селектов с играми
function refreshAllGameSelects() {
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    if (JSON.stringify(freshGames) !== JSON.stringify(games)) {
        games = freshGames;
        
        setTimeout(() => {
            if (typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            }
            if (typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
            }
            if (typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            }
            console.log('🔄 Все селекты с играми обновлены');
        }, 100);
    }
}

// Проверка обновлений каждые 3 секунды
function startSyncChecker() {
    setInterval(() => {
        refreshGamesPage();
        refreshAccountsPage();
        refreshAllGameSelects();
    }, 3000);
}

// ============================================
// ФИЛЬТРАЦИЯ И ПОИСК
// ============================================

function filterAccounts() {
    const gameFilter = document.getElementById('filterGame').value;
    const searchText = document.getElementById('searchAccount').value.toLowerCase();
    
    let filteredAccounts = accounts;
    
    if (gameFilter) {
        filteredAccounts = filteredAccounts.filter(acc => acc.gameId === parseInt(gameFilter));
    }
    
    if (searchText) {
        filteredAccounts = filteredAccounts.filter(acc => 
            acc.psnLogin.toLowerCase().includes(searchText) ||
            (acc.email && acc.email.toLowerCase().includes(searchText))
        );
    }
    
    displayAccounts(filteredAccounts);
    
    if (filteredAccounts.length === 0) {
        showNotification('Аккаунты не найдены', 'info');
    }
}

function clearFilters() {
    document.getElementById('filterGame').selectedIndex = 0;
    document.getElementById('searchAccount').value = '';
    displayAccounts();
    showNotification('Фильтры сброшены', 'info');
}

// ============================================
// РЕДАКТИРОВАНИЕ АККАУНТОВ
// ============================================

function editAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('Аккаунт не найден', 'error');
        return;
    }
    
    const editForm = document.getElementById('editForm');
    editForm.innerHTML = `
        <input type="hidden" id="editAccountId" value="${account.id}">
        
        <div style="grid-column: 1 / -1;">
            <label for="editGame" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Игра:</label>
            <select id="editGame" class="input" required>
                <option value="">Выберите игру</option>
                ${games.map(game => `
                    <option value="${game.id}" ${game.id === account.gameId ? 'selected' : ''}>
                        ${game.name}
                    </option>
                `).join('')}
                <option value="0" ${account.gameId === 0 ? 'selected' : ''}>Свободный</option>
            </select>
        </div>
        
        <div>
            <label for="editPurchaseAmount" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Сумма закупа (₽):</label>
            <input type="number" id="editPurchaseAmount" value="${account.purchaseAmount}" 
                   placeholder="Сумма закупа" class="input" step="0.01">
        </div>
        
        <div>
            <label for="editPsnLogin" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Логин PSN:</label>
            <input type="text" id="editPsnLogin" value="${account.psnLogin}" 
                   placeholder="Логин PSN" class="input" required>
        </div>
        
        <div>
            <label for="editPsnPassword" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Пароль PSN:</label>
            <input type="text" id="editPsnPassword" value="${account.psnPassword || ''}" 
                   placeholder="Пароль PSN" class="input">
        </div>
        
        <div>
            <label for="editEmail" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Почта:</label>
            <input type="email" id="editEmail" value="${account.email || ''}" 
                   placeholder="Почта" class="input">
        </div>
        
        <div>
            <label for="editEmailPassword" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Пароль от почты:</label>
            <input type="text" id="editEmailPassword" value="${account.emailPassword || ''}" 
                   placeholder="Пароль от почты" class="input">
        </div>
        
        <div>
            <label for="editBackupEmail" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Резервная почта:</label>
            <input type="email" id="editBackupEmail" value="${account.backupEmail || ''}" 
                   placeholder="Резервная почта" class="input">
        </div>
        
        <div>
            <label for="editBirthDate" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Дата рождения:</label>
            <input type="text" id="editBirthDate" value="${account.birthDate || ''}" 
                   placeholder="Дата рождения" class="input">
        </div>
        
        <div>
            <label for="editPsnCodes" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Коды PSN:</label>
            <input type="text" id="editPsnCodes" value="${account.psnCodes || ''}" 
                   placeholder="Коды PSN (через запятую)" class="input">
        </div>
        
        <div>
            <label for="editPsnAuthenticator" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">PSN Аутентификатор:</label>
            <input type="text" id="editPsnAuthenticator" value="${account.psnAuthenticator || ''}" 
                   placeholder="PSN Аутентификатор" class="input">
        </div>
        
        <div class="positions-section">
            <h3 style="margin-bottom: 20px; color: #2d3748; font-size: 1.2rem;">🎮 Количество позиций:</h3>
            <div class="positions-grid">
                <div>
                    <label for="editP2_ps4" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П2 PS4:</label>
                    <input type="number" id="editP2_ps4" value="${account.positions.p2_ps4}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP3_ps4" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П3 PS4:</label>
                    <input type="number" id="editP3_ps4" value="${account.positions.p3_ps4}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP2_ps5" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П2 PS5:</label>
                    <input type="number" id="editP2_ps5" value="${account.positions.p2_ps5}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP3_ps5" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П3 PS5:</label>
                    <input type="number" id="editP3_ps5" value="${account.positions.p3_ps5}" 
                           class="input" min="0" style="width: 100%;">
                </div>
            </div>
        </div>
        
        <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeModal()" style="padding: 12px 24px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveAccountChanges()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">💾</span>
                Сохранить изменения
            </button>
        </div>
    `;
    
    openModal('editModal');
    
    // Автофокус на первом поле
    setTimeout(() => {
        const firstInput = editForm.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function saveAccountChanges() {
    const accountId = parseInt(document.getElementById('editAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
        showNotification('Выберите игру', 'warning');
        return;
    }
    
    const psnLogin = document.getElementById('editPsnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
        return;
    }
    
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        gameId: gameId,
        gameName: game.name,
        purchaseAmount: parseFloat(document.getElementById('editPurchaseAmount').value) || 0,
        psnLogin: psnLogin,
        psnPassword: document.getElementById('editPsnPassword').value,
        email: document.getElementById('editEmail').value.trim(),
        emailPassword: document.getElementById('editEmailPassword').value,
        backupEmail: document.getElementById('editBackupEmail').value.trim(),
        birthDate: document.getElementById('editBirthDate').value.trim(),
        psnCodes: document.getElementById('editPsnCodes').value.trim(),
        psnAuthenticator: document.getElementById('editPsnAuthenticator').value.trim(),
        positions: {
            p2_ps4: parseInt(document.getElementById('editP2_ps4').value) || 0,
            p3_ps4: parseInt(document.getElementById('editP3_ps4').value) || 0,
            p2_ps5: parseInt(document.getElementById('editP2_ps5').value) || 0,
            p3_ps5: parseInt(document.getElementById('editP3_ps5').value) || 0
        }
    };
    
    await saveToStorage('accounts', accounts);
    closeModal();
    displayAccounts();
    showNotification('Изменения сохранены и синхронизированы! ✅', 'success');
}

async function deleteAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    if (confirm(`Удалить аккаунт "${account.psnLogin}"? Это действие нельзя отменить.`)) {
        accounts = accounts.filter(acc => acc.id !== accountId);
        await saveToStorage('accounts', accounts);
        displayAccounts();
        showNotification(`Аккаунт "${account.psnLogin}" удален`, 'info');
    }
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function attachGameToAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    const editForm = document.getElementById('editFreeForm');
    editForm.innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748; text-align: center;">
            <span style="display: inline-block; margin-right: 10px;">🎮</span>
            Привязать игру к аккаунту
        </h2>
        
        <input type="hidden" id="editFreeAccountId" value="${account.id}">
        
        <div style="grid-column: 1 / -1;">
            <label for="editFreeGame" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Игра:</label>
            <select id="editFreeGame" class="input" required>
                <option value="">Выберите игру</option>
                ${games.map(game => `<option value="${game.id}">${game.name}</option>`).join('')}
            </select>
        </div>
        
        <div>
            <label for="editFreePurchaseAmount" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Сумма закупа (₽):</label>
            <input type="number" id="editFreePurchaseAmount" value="${account.purchaseAmount}" 
                   placeholder="Сумма закупа" class="input" step="0.01">
        </div>
        
        <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeFreeModal()" style="padding: 12px 24px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveFreeAccountChanges()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">💾</span>
                Привязать игру
            </button>
        </div>
    `;
    
    openModal('editFreeModal');
}

async function saveFreeAccountChanges() {
    const accountId = parseInt(document.getElementById('editFreeAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editFreeGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
        showNotification('Выберите игру', 'warning');
        return;
    }
    
    const purchaseAmount = parseFloat(document.getElementById('editFreePurchaseAmount').value) || 0;
    
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        gameId: gameId,
        gameName: game.name,
        purchaseAmount: purchaseAmount
    };
    
    await saveToStorage('accounts', accounts);
    closeFreeModal();
    
    if (window.location.pathname.includes('free-accounts.html')) {
        displayFreeAccounts();
    } else {
        displayAccounts();
    }
    
    showNotification(`Игра "${game.name}" успешно привязана к аккаунту!`, 'success');
}

function closeFreeModal() {
    document.getElementById('editFreeModal').style.display = 'none';
}

// ============================================
// МЕНЕДЖЕР ПРОДАЖ
// ============================================

function loadGamesForManager() {
    const select = document.getElementById('managerGame');
    if (select) {
        select.innerHTML = '<option value="">Выберите игру</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
}

function searchByGame() {
    const gameSelect = document.getElementById('managerGame');
    const gameId = parseInt(gameSelect.value);
    
    if (!gameId) {
        showNotification('Выберите игру для поиска', 'warning');
        return;
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
    displaySearchResults(gameAccounts, game.name);
}

function searchByLogin() {
    const loginSearch = document.getElementById('managerLogin').value.trim().toLowerCase();
    
    if (!loginSearch) {
        showNotification('Введите логин для поиска', 'warning');
        return;
    }
    
    const foundAccounts = accounts.filter(acc => 
        acc.psnLogin.toLowerCase().includes(loginSearch)
    );
    
    if (foundAccounts.length === 0) {
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('searchResults').innerHTML = `
            <div class="empty">
                <h3>Аккаунты с логином "${loginSearch}" не найдены</h3>
            </div>
        `;
        showNotification(`Аккаунты с логином "${loginSearch}" не найдены`, 'info');
        return;
    }
    
    const gamesMap = {};
    foundAccounts.forEach(acc => {
        if (!gamesMap[acc.gameName]) {
            gamesMap[acc.gameName] = [];
        }
        gamesMap[acc.gameName].push(acc);
    });
    
    const statsSection = document.getElementById('statsSection');
    statsSection.style.display = 'block';
    statsSection.innerHTML = `
        <div class="stats-header">
            <h3>🔍 Результаты поиска по логину: "${loginSearch}"</h3>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${foundAccounts.length}</div>
                <div class="stat-label">Найдено аккаунтов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(gamesMap).length}</div>
                <div class="stat-label">Игр</div>
            </div>
        </div>
        ${Object.keys(gamesMap).length > 1 ? `
            <div class="games-breakdown">
                <h4>Распределение по играм:</h4>
                <div class="games-list">
                    ${Object.entries(gamesMap).map(([gameName, gameAccounts]) => `
                        <div class="game-item">
                            <span class="game-name">${gameName}</span>
                            <span class="game-count">${gameAccounts.length} акк.</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    displaySearchResults(foundAccounts, `по логину "${loginSearch}"`);
}

// ============================================
// СИСТЕМА ПРОДАЖ
// ============================================

function getPositionSaleInfo(accountId, positionType, positionIndex) {
    const positionId = `${accountId}_${positionType}_${positionIndex}`;
    return sales.find(sale => sale.id === positionId);
}

function displaySearchResults(accountsList, gameName) {
    const resultsContainer = document.getElementById('searchResults');
    const statsSection = document.getElementById('statsSection');
    
    if (accountsList.length === 0) {
        statsSection.style.display = 'none';
        resultsContainer.innerHTML = '<div class="empty">По игре "' + gameName + '" не найдено аккаунтов</div>';
        return;
    }
    
    const totalAccounts = accountsList.length;
    const totalInvestment = accountsList.reduce((sum, acc) => sum + (acc.purchaseAmount || 0), 0);
    const totalPositions = accountsList.reduce((sum, acc) => 
        sum + acc.positions.p2_ps4 + acc.positions.p3_ps4 + acc.positions.p2_ps5 + acc.positions.p3_ps5, 0
    );
    
    const p2_ps4 = accountsList.reduce((sum, acc) => sum + acc.positions.p2_ps4, 0);
    const p3_ps4 = accountsList.reduce((sum, acc) => sum + acc.positions.p3_ps4, 0);
    const p2_ps5 = accountsList.reduce((sum, acc) => sum + acc.positions.p2_ps5, 0);
    const p3_ps5 = accountsList.reduce((sum, acc) => sum + acc.positions.p3_ps5, 0);
    
    statsSection.style.display = 'block';
    statsSection.innerHTML = `
        <div class="stats-header">
            <h3>🎮 Статистика: ${gameName}</h3>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${totalAccounts}</div><div class="stat-label">Аккаунтов</div></div>
            <div class="stat-card"><div class="stat-value">${totalInvestment} ₽</div><div class="stat-label">Сумма закупа</div></div>
            <div class="stat-card"><div class="stat-value">${totalPositions}</div><div class="stat-label">Всего позиций</div></div>
            <div class="stat-card"><div class="stat-value">${p2_ps4}</div><div class="stat-label">П2 PS4</div></div>
            <div class="stat-card"><div class="stat-value">${p3_ps4}</div><div class="stat-label">П3 PS4</div></div>
            <div class="stat-card"><div class="stat-value">${p2_ps5}</div><div class="stat-label">П2 PS5</div></div>
            <div class="stat-card"><div class="stat-value">${p3_ps5}</div><div class="stat-label">П3 PS5</div></div>
        </div>
    `;
    
    resultsContainer.innerHTML = accountsList.map(account => `
        <div class="account-card-manager">
            <div class="account-main">
                <div class="account-login">${account.psnLogin}</div>
                <div class="account-meta">
                    <span class="account-price-manager">${account.purchaseAmount} ₽</span>
                    <span class="account-game-manager">${account.gameName}</span>
                </div>
            </div>
            
            <div class="platforms-container">
                <!-- PS4 -->
                <div class="platform-section">
                    <div class="platform-title">PS4</div>
                    <div class="positions-container">
                        <!-- П2 PS4 -->
                        ${account.positions.p2_ps4 > 0 ? `
                            <div class="position-group">
                                <div class="position-label">П2:</div>
                                <div class="position-buttons">
                                    ${Array(account.positions.p2_ps4).fill().map((_, index) => {
                                        const saleInfo = getPositionSaleInfo(account.id, 'p2_ps4', index + 1);
                                        const isSold = !!saleInfo;
                                        const displayDate = saleInfo ? (saleInfo.datetime || saleInfo.date || '') : '';
                                        return `
                                            <div class="position-single ${isSold ? 'sold' : ''}" 
                                                 onclick="handlePositionClick(${account.id}, 'p2_ps4', 'П2 PS4', ${index + 1})">
                                                ${index + 1}
                                                ${isSold ? `<div class="position-sale-date">${displayDate}</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- П3 PS4 -->
                        ${account.positions.p3_ps4 > 0 ? `
                            <div class="position-group">
                                <div class="position-label">П3:</div>
                                <div class="position-buttons">
                                    ${Array(account.positions.p3_ps4).fill().map((_, index) => {
                                        const saleInfo = getPositionSaleInfo(account.id, 'p3_ps4', index + 1);
                                        const isSold = !!saleInfo;
                                        const displayDate = saleInfo ? (saleInfo.datetime || saleInfo.date || '') : '';
                                        return `
                                            <div class="position-single ${isSold ? 'sold' : ''}" 
                                                 onclick="handlePositionClick(${account.id}, 'p3_ps4', 'П3 PS4', ${index + 1})">
                                                ${index + 1}
                                                ${isSold ? `<div class="position-sale-date">${displayDate}</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${account.positions.p2_ps4 === 0 && account.positions.p3_ps4 === 0 ? 
                            '<div class="position-empty">Нет позиций</div>' : ''
                        }
                    </div>
                </div>
                
                <!-- PS5 -->
                <div class="platform-section">
                    <div class="platform-title">PS5</div>
                    <div class="positions-container">
                        <!-- П2 PS5 -->
                        ${account.positions.p2_ps5 > 0 ? `
                            <div class="position-group">
                                <div class="position-label">П2:</div>
                                <div class="position-buttons">
                                    ${Array(account.positions.p2_ps5).fill().map((_, index) => {
                                        const saleInfo = getPositionSaleInfo(account.id, 'p2_ps5', index + 1);
                                        const isSold = !!saleInfo;
                                        const displayDate = saleInfo ? (saleInfo.datetime || saleInfo.date || '') : '';
                                        return `
                                            <div class="position-single ${isSold ? 'sold' : ''}" 
                                                 onclick="handlePositionClick(${account.id}, 'p2_ps5', 'П2 PS5', ${index + 1})">
                                                ${index + 1}
                                                ${isSold ? `<div class="position-sale-date">${displayDate}</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- П3 PS5 -->
                        ${account.positions.p3_ps5 > 0 ? `
                            <div class="position-group">
                                <div class="position-label">П3:</div>
                                <div class="position-buttons">
                                    ${Array(account.positions.p3_ps5).fill().map((_, index) => {
                                        const saleInfo = getPositionSaleInfo(account.id, 'p3_ps5', index + 1);
                                        const isSold = !!saleInfo;
                                        const displayDate = saleInfo ? (saleInfo.datetime || saleInfo.date || '') : '';
                                        return `
                                            <div class="position-single ${isSold ? 'sold' : ''}" 
                                                 onclick="handlePositionClick(${account.id}, 'p3_ps5', 'П3 PS5', ${index + 1})">
                                                ${index + 1}
                                                ${isSold ? `<div class="position-sale-date">${displayDate}</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${account.positions.p2_ps5 === 0 && account.positions.p3_ps5 === 0 ? 
                            '<div class="position-empty">Нет позиций</div>' : ''
                        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function handlePositionClick(accountId, positionType, positionName, positionIndex) {
    const existingSale = getPositionSaleInfo(accountId, positionType, positionIndex);
    if (existingSale) {
        showSaleDetails(existingSale);
    } else {
        openSaleModal(accountId, positionType, positionName, positionIndex);
    }
}

// ============================================
// ОФОРМЛЕНИЕ ПРОДАЖ
// ============================================

function openSaleModal(accountId, positionType, positionName, positionIndex) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    window.currentSaleAccount = accountId;
    window.currentSalePosition = positionType;
    window.currentSalePositionIndex = positionIndex;
    
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748; text-align: center;">
            <span style="display: inline-block; margin-right: 10px;">💰</span>
            Оформить продажу
        </h2>
        
        <div class="sale-info">
            <div class="sale-info-item">
                <strong>Аккаунт:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.psnLogin}</span>
            </div>
            <div class="sale-info-item">
                <strong>Игра:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.gameName}</span>
            </div>
            <div class="sale-info-item">
                <strong>Позиция:</strong>
                <span style="
                    font-weight: 600; 
                    color: white;
                    background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-size: 0.9em;
                ">${positionName}</span>
            </div>
        </div>
        
        <div class="sale-form">
            <div>
                <label for="salePrice" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Цена продажи (₽):</label>
                <input type="number" id="salePrice" class="sale-input" 
                       placeholder="Введите цену" required 
                       style="font-size: 18px; font-weight: 600; text-align: center;">
            </div>
            
            <div class="datetime-group">
                <div>
                    <label for="saleDate" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Дата продажи:</label>
                    <input type="date" id="saleDate" class="sale-input" value="${currentDate}">
                </div>
                <div>
                    <label for="saleTime" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Время продажи:</label>
                    <input type="time" id="saleTime" class="sale-input" value="${currentTime}">
                </div>
            </div>
            
            <div>
                <label for="saleNotes" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Примечания:</label>
                <input type="text" id="saleNotes" class="sale-input" 
                       placeholder="Дополнительная информация (необязательно)">
            </div>
        </div>
        
        <div class="sale-buttons">
            <button class="btn btn-secondary" onclick="closeSaleModal()" 
                    style="padding: 12px 24px; min-width: 120px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="confirmSaleAndShowData()"
                    style="padding: 12px 24px; min-width: 180px; font-weight: 600;">
                <span style="margin-right: 8px;">✅</span>
                Подтвердить продажу
            </button>
        </div>
    `;
    
    openModal('saleModal');
    
    // Автофокус на поле цены
    setTimeout(() => {
        const priceInput = document.getElementById('salePrice');
        if (priceInput) priceInput.focus();
    }, 100);
}

async function confirmSaleAndShowData() {
    const salePrice = document.getElementById('salePrice').value;
    const saleDate = document.getElementById('saleDate').value;
    const saleTime = document.getElementById('saleTime').value;
    const saleNotes = document.getElementById('saleNotes').value;
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : new Date().toLocaleString('ru-RU');
    
    const accountIndex = accounts.findIndex(acc => acc.id === window.currentSaleAccount);
    if (accountIndex === -1) return;
    
    const positionId = `${window.currentSaleAccount}_${window.currentSalePosition}_${window.currentSalePositionIndex}`;
    
    const newSale = {
        id: positionId,
        accountId: window.currentSaleAccount,
        accountLogin: accounts[accountIndex].psnLogin,
        gameName: accounts[accountIndex].gameName,
        positionType: window.currentSalePosition,
        positionName: getPositionName(window.currentSalePosition),
        price: parseFloat(salePrice),
        date: saleDate || new Date().toISOString().split('T')[0],
        time: saleTime || new Date().toTimeString().slice(0, 5),
        datetime: saleDateTime,
        notes: saleNotes,
        timestamp: new Date().toISOString(),
        sold: true,
        positionIndex: window.currentSalePositionIndex
    };
    
    sales.push(newSale);
    await saveToStorage('sales', sales);
    
    showAccountDataAfterSale(window.currentSaleAccount);
}

function getPositionName(positionType) {
    const names = {
        'p2_ps4': 'П2 PS4',
        'p3_ps4': 'П3 PS4', 
        'p2_ps5': 'П2 PS5',
        'p3_ps5': 'П3 PS5'
    };
    return names[positionType] || positionType;
}

function showAccountDataAfterSale(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const psnCodesArray = account.psnCodes ? account.psnCodes.split(',').map(code => code.trim()).filter(code => code !== '') : [];
    const currentCode = psnCodesArray.length > 0 ? psnCodesArray[0] : 'По запросу';
    
    if (psnCodesArray.length > 0) {
        psnCodesArray.shift();
        const updatedCodes = psnCodesArray.join(', ');
        
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].psnCodes = updatedCodes;
            saveToStorage('accounts', accounts);
        }
    }

    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2>✅ Продажа оформлена!</h2>
        
        <div class="order-info">
            <h3>Данные для клиента:</h3>
            <div class="order-data">
                <pre>Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}</pre>
            </div>
            
            ${psnCodesArray.length > 0 ? `
                <div class="remaining-codes">
                    <h4>📋 Оставшиеся коды (${psnCodesArray.length}):</h4>
                    <div class="codes-list">
                        ${psnCodesArray.map(code => `
                            <div class="code-item">${code}</div>
                        `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="order-buttons">
            <button class="btn btn-success" onclick="copyAccountData()">📋 Скопировать данные</button>
            <button class="btn btn-primary" onclick="closeSaleModalAndRefresh()">Готово</button>
        </div>
    `;
    
    window.currentOrderData = `Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}`;
}

function copyAccountData() {
    if (!window.currentOrderData) return;
    
    navigator.clipboard.writeText(window.currentOrderData).then(() => {
        showNotification('Данные скопированы в буфер обмена! 📋', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = window.currentOrderData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Данные скопированы в буфер обмена! 📋', 'success');
    });
}

function closeSaleModalAndRefresh() {
    closeSaleModal();
    
    const gameSelect = document.getElementById('managerGame');
    const gameId = parseInt(gameSelect.value);
    if (gameId) {
        const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
        const game = games.find(g => g.id === gameId);
        if (game) {
            displaySearchResults(gameAccounts, game.name);
        }
    }
}

function showSaleDetails(sale) {
    const modalContent = document.getElementById('saleModalContent');
    
    const saleDate = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
    const saleTime = sale.time || new Date(sale.timestamp).toTimeString().slice(0, 5);
    
    modalContent.innerHTML = `
        <h2>💰 Информация о продаже</h2>
        
        <div class="sale-info">
            <div class="sale-info-item"><strong>Аккаунт:</strong><span>${sale.accountLogin}</span></div>
            <div class="sale-info-item"><strong>Игра:</strong><span>${sale.gameName}</span></div>
            <div class="sale-info-item"><strong>Позиция:</strong><span>${sale.positionName}</span></div>
        </div>
        
        <div class="sale-form">
            <div><label for="editSalePrice">Цена продажи (₽):</label><input type="number" id="editSalePrice" class="sale-input" value="${sale.price}" required></div>
            <div class="datetime-group">
                <div>
                    <label for="editSaleDate">Дата продажи:</label>
                    <input type="date" id="editSaleDate" class="sale-input" value="${saleDate}">
                </div>
                <div>
                    <label for="editSaleTime">Время продажи:</label>
                    <input type="time" id="editSaleTime" class="sale-input" value="${saleTime}">
                </div>
            </div>
            <div><label for="editSaleNotes">Примечания:</label><input type="text" id="editSaleNotes" class="sale-input" value="${sale.notes || ''}" placeholder="Дополнительная информация"></div>
        </div>
        
        <div class="sale-buttons">
            <button class="btn btn-secondary" onclick="closeSaleModal()">Отмена</button>
            <button class="btn btn-primary" onclick="updateSaleDetails('${sale.id}')">💾 Сохранить изменения</button>
            <button class="btn btn-danger" onclick="deleteSale('${sale.id}')">🗑️ Удалить продажу</button>
        </div>
    `;
    
    document.getElementById('saleModal').style.display = 'block';
}

async function updateSaleDetails(saleId) {
    const salePrice = document.getElementById('editSalePrice').value;
    const saleDate = document.getElementById('editSaleDate').value;
    const saleTime = document.getElementById('editSaleTime').value;
    const saleNotes = document.getElementById('editSaleNotes').value;
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : '';
    
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex !== -1) {
        sales[saleIndex] = {
            ...sales[saleIndex],
            price: parseFloat(salePrice),
            date: saleDate,
            time: saleTime,
            datetime: saleDateTime,
            notes: saleNotes
        };
        
        await saveToStorage('sales', sales);
        closeSaleModal();
        
        const gameSelect = document.getElementById('managerGame');
        const gameId = parseInt(gameSelect.value);
        if (gameId) {
            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
            const game = games.find(g => g.id === gameId);
            if (game) {
                displaySearchResults(gameAccounts, game.name);
            }
        }
        
        showNotification('Данные продажи обновлены и синхронизированы! 💾', 'success');
    }
}

async function deleteSale(saleId) {
    if (confirm('Удалить запись о продаже? Это действие нельзя отменить.')) {
        sales = sales.filter(sale => sale.id !== saleId);
        await saveToStorage('sales', sales);
        closeSaleModal();
        
        const gameSelect = document.getElementById('managerGame');
        const gameId = parseInt(gameSelect.value);
        if (gameId) {
            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
            const game = games.find(g => g.id === gameId);
            if (game) {
                displaySearchResults(gameAccounts, game.name);
            }
        }
        
        showNotification('Продажа удалена! 🗑️', 'info');
    }
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function closeSaleModal() {
    const modal = document.getElementById('saleModal');
    const content = modal.querySelector('.modal-content');
    
    content.classList.add('fade-out');
    
    setTimeout(() => {
        modal.style.display = 'none';
        content.classList.remove('fade-out');
    }, 300);
}

function clearManagerSearch() {
    document.getElementById('managerGame').selectedIndex = 0;
    document.getElementById('managerLogin').value = '';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    showNotification('Поиск очищен', 'info');
}

// ============================================
// ОТЧЕТЫ И СТАТИСТИКА
// ============================================

function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Выберите начальную и конечную дату', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        showNotification('Начальная дата не может быть больше конечной', 'error');
        return;
    }
    
    const periodSales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= start && saleDate <= end;
    });
    
    displayReportResults(periodSales, startDate, endDate);
}

function generateFullReport() {
    displayReportResults(sales, 'все время', 'все время');
}

function displayReportResults(salesData, startDate, endDate) {
    const reportResults = document.getElementById('reportResults');
    
    if (salesData.length === 0) {
        reportResults.innerHTML = `
            <div class="section">
                <h2>📊 Отчет за период: ${startDate} - ${endDate}</h2>
                <div class="empty">Нет продаж за выбранный период</div>
            </div>
        `;
        return;
    }
    
    const salesWithProfit = salesData.map(sale => {
        const account = accounts.find(acc => acc.id === sale.accountId);
        if (!account) {
            return { ...sale, cost: 0, profit: sale.price, profitMargin: 100 };
        }
        
        const totalPositions = account.positions.p2_ps4 + account.positions.p3_ps4 + 
                              account.positions.p2_ps5 + account.positions.p3_ps5;
        
        const costPerPosition = totalPositions > 0 ? (account.purchaseAmount || 0) / totalPositions : 0;
        const cost = costPerPosition;
        const profit = sale.price - cost;
        const profitMargin = sale.price > 0 ? (profit / sale.price) * 100 : 0;
        
        return {
            ...sale,
            cost: cost,
            profit: profit,
            profitMargin: profitMargin
        };
    });
    
    const totalRevenue = salesWithProfit.reduce((sum, sale) => sum + sale.price, 0);
    const totalCost = salesWithProfit.reduce((sum, sale) => sum + sale.cost, 0);
    const totalProfit = salesWithProfit.reduce((sum, sale) => sum + sale.profit, 0);
    const totalSales = salesWithProfit.length;
    const avgSale = totalRevenue / totalSales;
    const avgProfit = totalProfit / totalSales;
    const totalProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    const gamesStats = {};
    salesWithProfit.forEach(sale => {
        if (!gamesStats[sale.gameName]) {
            gamesStats[sale.gameName] = {
                revenue: 0,
                cost: 0,
                profit: 0,
                sales: 0
            };
        }
        gamesStats[sale.gameName].revenue += sale.price;
        gamesStats[sale.gameName].cost += sale.cost;
        gamesStats[sale.gameName].profit += sale.profit;
        gamesStats[sale.gameName].sales += 1;
    });
    
    const dailyStats = {};
    salesWithProfit.forEach(sale => {
        const saleDate = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
        if (!dailyStats[saleDate]) {
            dailyStats[saleDate] = {
                revenue: 0,
                cost: 0,
                profit: 0,
                sales: 0
            };
        }
        dailyStats[saleDate].revenue += sale.price;
        dailyStats[saleDate].cost += sale.cost;
        dailyStats[saleDate].profit += sale.profit;
        dailyStats[saleDate].sales += 1;
    });
    
    const sortedGames = Object.entries(gamesStats)
        .sort(([,a], [,b]) => b.profit - a.profit);
    
    const sortedDays = Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(b) - new Date(a));
    
    reportResults.innerHTML = `
        <div class="section">
            <h2>📊 Отчет за период: ${startDate} - ${endDate}</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalRevenue.toFixed(0)} ₽</div>
                    <div class="stat-label">Общая выручка</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalCost.toFixed(0)} ₽</div>
                    <div class="stat-label">Себестоимость</div>
                </div>
                <div class="stat-card ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    <div class="stat-value">${totalProfit.toFixed(0)} ₽</div>
                    <div class="stat-label">Чистая прибыль</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalProfitMargin.toFixed(1)}%</div>
                    <div class="stat-label">Рентабельность</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSales}</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgSale.toFixed(0)} ₽</div>
                    <div class="stat-label">Средний чек</div>
                </div>
                <div class="stat-card ${avgProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    <div class="stat-value">${avgProfit.toFixed(0)} ₽</div>
                    <div class="stat-label">Средняя прибыль</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3>🎮 Статистика по играм</h3>
            <div class="games-report">
                ${sortedGames.map(([gameName, stats]) => {
                    const gameProfitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
                    return `
                    <div class="game-report-card">
                        <div class="game-report-header">
                            <div class="game-name">${gameName}</div>
                            <div class="game-revenue ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}">${stats.profit.toFixed(0)} ₽</div>
                        </div>
                        <div class="game-report-details">
                            <div class="game-stat">
                                <span class="stat-label">Выручка:</span>
                                <span class="stat-value">${stats.revenue.toFixed(0)} ₽</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Себестоимость:</span>
                                <span class="stat-value">${stats.cost.toFixed(0)} ₽</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Прибыль:</span>
                                <span class="stat-value ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}">${stats.profit.toFixed(0)} ₽</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Рентабельность:</span>
                                <span class="stat-value">${gameProfitMargin.toFixed(1)}%</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Продажи:</span>
                                <span class="stat-value">${stats.sales}</span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="section">
            <h3>📅 Ежедневная статистика</h3>
            <div class="daily-report">
                ${sortedDays.map(([date, stats]) => {
                    const dailyProfitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
                    return `
                    <div class="daily-report-card">
                        <div class="daily-date">${date}</div>
                        <div class="daily-stats">
                            <div class="daily-stat">
                                <span>Выручка:</span>
                                <strong>${stats.revenue.toFixed(0)} ₽</strong>
                            </div>
                            <div class="daily-stat">
                                <span>Себестоимость:</span>
                                <strong>${stats.cost.toFixed(0)} ₽</strong>
                            </div>
                            <div class="daily-stat ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                                <span>Прибыль:</span>
                                <strong>${stats.profit.toFixed(0)} ₽</strong>
                            </div>
                            <div class="daily-stat">
                                <span>Рентабельность:</span>
                                <strong>${dailyProfitMargin.toFixed(1)}%</strong>
                            </div>
                            <div class="daily-stat">
                                <span>Продажи:</span>
                                <strong>${stats.sales}</strong>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="section">
            <h3>💰 Все продажи</h3>
            <div class="sales-list">
                ${salesWithProfit.map(sale => `
                    <div class="sale-item ${sale.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        <div class="sale-header">
                            <div class="sale-game">${sale.gameName} - ${sale.positionName}</div>
                            <div class="sale-price">${sale.price} ₽</div>
                        </div>
                        <div class="sale-details">
                            <div class="sale-info">
                                <span class="info-label">Аккаунт:</span>
                                <span class="info-value">${sale.accountLogin}</span>
                            </div>
                            <div class="sale-info">
                                <span class="info-label">Себестоимость:</span>
                                <span class="info-value">${sale.cost.toFixed(0)} ₽</span>
                            </div>
                            <div class="sale-info ${sale.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                                <span class="info-label">Прибыль:</span>
                                <span class="info-value">${sale.profit.toFixed(0)} ₽ (${sale.profitMargin.toFixed(1)}%)</span>
                            </div>
                            <div class="sale-info">
                                <span class="info-label">Дата:</span>
                                <span class="info-value">${sale.datetime || sale.date || ''}</span>
                            </div>
                            ${sale.notes ? `
                                <div class="sale-info">
                                    <span class="info-label">Примечания:</span>
                                    <span class="info-value">${sale.notes}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    showNotification(`Отчет за ${startDate} - ${endDate} сгенерирован 📊`, 'success');
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function loadGamesForSelect() {
    const select = document.getElementById('accountGame');
    if (select) {
        select.innerHTML = '<option value="">Выберите игру</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
}

function loadGamesForFilter() {
    const filter = document.getElementById('filterGame');
    if (filter) {
        filter.innerHTML = '<option value="">Все игры</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
}

// Экспорт данных
function exportToCSV() {
    if (accounts.length === 0) {
        showNotification('Нет данных для экспорта', 'warning');
        return;
    }
    
    const headers = ['Игра', 'Логин PSN', 'Пароль PSN', 'Почта', 'Пароль почты', 'Сумма закупа', 'Коды PSN', 'Дата добавления'];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    accounts.forEach(account => {
        const row = [
            `"${account.gameName}"`,
            `"${account.psnLogin}"`,
            `"${account.psnPassword || ''}"`,
            `"${account.email || ''}"`,
            `"${account.emailPassword || ''}"`,
            account.purchaseAmount || 0,
            `"${account.psnCodes || ''}"`,
            `"${account.created}"`
        ];
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, 'accounts.csv');
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = 'accounts.csv';
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showNotification('Данные экспортированы в CSV 📁', 'success');
}

// Обработчики кликов вне модальных окон
window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    const saleModal = document.getElementById('saleModal');
    const editFreeModal = document.getElementById('editFreeModal');
    
    if (event.target === editModal) closeModal();
    if (event.target === saleModal) closeSaleModal();
    if (event.target === editFreeModal) closeFreeModal();
}

// Горячие клавиши
document.addEventListener('keydown', function(e) {
    // ESC закрывает модальные окна
    if (e.key === 'Escape') {
        closeModal();
        closeSaleModal();
        closeFreeModal();
    }
    
    // Ctrl+S - сохранить
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (document.getElementById('editAccountId')) {
            saveAccountChanges();
        }
    }
    
    // F5 - синхронизировать
    if (e.key === 'F5') {
        e.preventDefault();
        const syncBtn = document.getElementById('syncButton');
        if (syncBtn) syncBtn.click();
    }
});

// ==================== ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ====================

// Автоматическое создание кнопки темы
(function() {
    // Проверяем сохраненную тему
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Ждем полной загрузки страницы
    window.addEventListener('load', function() {
        // Создаем кнопку если её нет
        if (!document.querySelector('.theme-toggle')) {
            const themeToggle = document.createElement('div');
            themeToggle.className = 'theme-toggle';
            themeToggle.innerHTML = `
                <button class="theme-btn" onclick="toggleTheme()">
                    <span id="themeIcon">${document.body.classList.contains('dark-theme') ? '☀️' : '🌙'}</span>
                </button>
            `;
            document.body.appendChild(themeToggle);
        }
    });
    
    // Глобальная функция переключения темы
    window.toggleTheme = function() {
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');
        
        body.classList.toggle('dark-theme');
        
        if (body.classList.contains('dark-theme')) {
            if (themeIcon) themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
    };
})();