// firebase.js - ПОЛНАЯ СИНХРОНИЗАЦИЯ
const firebaseConfig = {
    apiKey: "AIzaSyCYTyHQ6B6WovINxyI1R8Qnn7JXS8WnnE8",
    authDomain: "crm-pshub.firebaseapp.com",
    databaseURL: "https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "crm-pshub",
    storageBucket: "crm-pshub.firebasestorage.app",
    messagingSenderId: "720773477998",
    appId: "1:720773477998:web:3d3c61747c42833f7f987f"
};
// firebase.js - В НАЧАЛЕ ФАЙЛА ПОСЛЕ firebaseConfig
console.log('🛠️ Инициализация Firebase...');

// Проверяем доступность Firebase
console.log('Firebase доступен?', typeof firebase !== 'undefined');
if (typeof firebase !== 'undefined') {
    console.log('Версия Firebase:', firebase.SDK_VERSION);
    console.log('Приложение инициализировано:', firebase.apps.length > 0);
}
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('✅ Firebase подключен');
} catch (error) {
    console.error('❌ Ошибка Firebase:', error);
}

class FirebaseSync {
    constructor() {
        this.db = firebase.database();
        this.initAllSync();
    }

    // ИНИЦИАЛИЗАЦИЯ ВСЕХ СЛУШАТЕЛЕЙ
    initAllSync() {
        // Слушатель для работников
        /*
        this.db.ref('workers').on('value', (snapshot) => {
    if (snapshot.exists()) {
        try {
            const workersObj = snapshot.val();
            const firebaseWorkers = Object.values(workersObj || {});
            
            // Получаем текущих локальных работников
            const localWorkersStr = localStorage.getItem('workers');
            const localWorkers = localWorkersStr ? JSON.parse(localWorkersStr) : [];
            
            console.log('🔄 Получены работники из Firebase:', firebaseWorkers.length);
            console.log('📁 Локальные работники:', localWorkers.length);
            
            // СЛИЯНИЕ данных, а не перезапись!
            const mergedWorkers = mergeWorkers(localWorkers, firebaseWorkers);
            
            // Сохраняем объединенный список
            localStorage.setItem('workers', JSON.stringify(mergedWorkers));
            
            // Обновляем UI если на странице работников
            if (window.location.pathname.includes('workers.html')) {
                setTimeout(() => {
                    if (typeof loadWorkers === 'function') {
                        loadWorkers();
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации работников:', error);
        }
    }
    });
    */

        // Слушатель для игр
        this.db.ref('games').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const gamesObj = snapshot.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('🔄 Игры синхронизированы');
            }
        });

        // Слушатель для аккаунтов
        this.db.ref('accounts').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const accountsObj = snapshot.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('🔄 Аккаунты синхронизированы');
            }
        });

        // Слушатель для продаж
        this.db.ref('sales').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const salesObj = snapshot.val();
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                console.log('🔄 Продажи синхронизированы');
            }
        });
        this.db.ref('gamePrices').on('value', (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const pricesObj = snapshot.val();
                    const pricesArray = Object.values(pricesObj || {});
                    localStorage.setItem('gamePrices', JSON.stringify(pricesArray));
                    console.log('🔄 Ценники синхронизированы:', pricesArray.length);
                    
                    // Обновляем UI если на странице ценников
                    if (window.location.pathname.includes('prices.html')) {
                        setTimeout(() => {
                            if (window.pricesManager) {
                                window.pricesManager.refreshFromFirebase();
                            }
                        }, 500);
                    }
                } catch (error) {
                    console.error('❌ Ошибка синхронизации ценников:', error);
                }
            }
        });
    }

    // СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ ПРИ ЗАГРУЗКЕ
    async forceFullSync() {
        try {
            console.log('🔄 Начинаем полную синхронизацию...');
            
            // Синхронизируем работников
            const workersSnap = await this.db.ref('workers').once('value');
            if (workersSnap.exists()) {
                const workersObj = workersSnap.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                console.log('✅ Работники синхронизированы:', workersArray.length);
            }
            
            // Синхронизируем игры
            const gamesSnap = await this.db.ref('games').once('value');
            if (gamesSnap.exists()) {
                const gamesObj = gamesSnap.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('✅ Игры синхронизированы:', gamesArray.length);
            }
            
            // Синхронизируем аккаунты
            const accountsSnap = await this.db.ref('accounts').once('value');
            if (accountsSnap.exists()) {
                const accountsObj = accountsSnap.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('✅ Аккаунты синхронизированы:', accountsArray.length);
            }
            
            // Синхронизируем продажи
            const salesSnap = await this.db.ref('sales').once('value');
            if (salesSnap.exists()) {
                const salesObj = salesSnap.val();
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                console.log('✅ Продажи синхронизированы:', salesArray.length);
            }

            const pricesSnap = await this.db.ref('gamePrices').once('value');
            if (pricesSnap.exists()) {
                const pricesObj = pricesSnap.val();
                const pricesArray = Object.values(pricesObj || {});
                localStorage.setItem('gamePrices', JSON.stringify(pricesArray));
                console.log('✅ Ценники синхронизированы:', pricesArray.length);
            }
            
            console.log('✅ Полная синхронизация завершена');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Ошибка полной синхронизации:', error);
            return { success: false, error: error.message };
        }
    }

    // СОХРАНЕНИЕ ДАННЫХ В FIREBASE
    async saveDataToFirebase(dataType, data) {
    console.log(`💾 СОХРАНЕНИЕ в Firebase: ${dataType}`, data.length || data);
    
    // Проверяем подключение
    if (!this.db) {
        console.error('❌ Firebase Database не доступен');
        throw new Error('Firebase Database не инициализирован');
    }
    
    try {
        const dataObj = {};
        
        if (Array.isArray(data)) {
            // Преобразуем массив в объект для Firebase
            data.forEach(item => {
                const key = item.id || item.username || Date.now() + Math.random();
                dataObj[key] = item;
            });
        } else if (typeof data === 'object') {
            // Уже объект
            Object.assign(dataObj, data);
        } else {
            throw new Error('Неподдерживаемый формат данных');
        }
        
        console.log(`📤 Отправляем в Firebase (${dataType}):`, Object.keys(dataObj).length, 'записей');
        
        // Сохраняем в Firebase
        const startTime = Date.now();
        await this.db.ref(dataType).set(dataObj);
        const endTime = Date.now();
        
        console.log(`✅ Данные "${dataType}" сохранены в Firebase за ${endTime - startTime}ms`);
        
        // Также сохраняем локально
        localStorage.setItem(dataType, JSON.stringify(data));
        
        return { success: true, synced: true, local: true };
        
    } catch (error) {
        console.error(`❌ ОШИБКА сохранения "${dataType}" в Firebase:`, error);
        
        // Подробная диагностика ошибки
        if (error.code) {
            console.error(`Код ошибки Firebase: ${error.code}`, error.message);
            
            // Распространенные ошибки Firebase
            if (error.code === 'PERMISSION_DENIED') {
                console.error('❌ НЕТ ПРАВ ДОСТУПА к Firebase. Проверьте правила базы данных!');
            } else if (error.code === 'NETWORK_ERROR') {
                console.error('🌐 ОШИБКА СЕТИ. Проверьте подключение к интернету.');
            }
        }
        
        // Сохраняем локально как запасной вариант
        localStorage.setItem(dataType, JSON.stringify(data));
        
        return { 
            success: true, 
            local: true, 
            error: error.message,
            code: error.code,
            synced: false
        };
    }
}

    // ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
    async loadDataFromFirebase(dataType) {
        try {
            const snapshot = await this.db.ref(dataType).once('value');
            if (snapshot.exists()) {
                const dataObj = snapshot.val();
                const dataArray = Object.values(dataObj || {});
                localStorage.setItem(dataType, JSON.stringify(dataArray));
                console.log(`✅ Данные "${dataType}" загружены из Firebase`);
                return dataArray;
            }
            return [];
        } catch (error) {
            console.error(`❌ Ошибка загрузки "${dataType}" из Firebase:`, error);
            const local = localStorage.getItem(dataType);
            return local ? JSON.parse(local) : [];
        }
    }
}

// В firebase.js после класса FirebaseSync добавьте:

class ChangeMonitor {
    constructor() {
        this.db = firebase.database();
        this.setupChangeMonitoring();
    }
    
    setupChangeMonitoring() {
        // Мониторим изменения аккаунтов
        this.db.ref('accounts').on('child_changed', (snapshot) => {
            const changedAccount = snapshot.val();
            const accountId = snapshot.key;
            
            console.log(`🔄 Аккаунт изменен в Firebase: ${accountId}`);
            
            // Обновляем локальный кеш
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const accountIndex = localAccounts.findIndex(acc => acc.id == accountId);
            
            if (accountIndex !== -1) {
                localAccounts[accountIndex] = {
                    ...localAccounts[accountIndex],
                    ...changedAccount
                };
                localStorage.setItem('accounts', JSON.stringify(localAccounts));
                
                // Уведомляем UI если нужно
                if (typeof window.onAccountsChanged === 'function') {
                    window.onAccountsChanged(localAccounts);
                }
            }
        });
        
        // Мониторим добавление новых аккаунтов
        this.db.ref('accounts').on('child_added', (snapshot) => {
            const newAccount = snapshot.val();
            console.log(`➕ Новый аккаунт в Firebase: ${newAccount.psnLogin}`);
            
            // Обновляем локальный кеш
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            if (!localAccounts.some(acc => acc.id == snapshot.key)) {
                localAccounts.push(newAccount);
                localStorage.setItem('accounts', JSON.stringify(localAccounts));
            }
        });
        
        // Мониторим удаление аккаунтов
        this.db.ref('accounts').on('child_removed', (snapshot) => {
            const removedAccountId = snapshot.key;
            console.log(`🗑️ Аккаунт удален из Firebase: ${removedAccountId}`);
            
            // Удаляем из локального кеша
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const filteredAccounts = localAccounts.filter(acc => acc.id != removedAccountId);
            localStorage.setItem('accounts', JSON.stringify(filteredAccounts));
        });

        // firebase.js - ДОБАВЬТЕ этот код после других слушателей

// СЛУШАТЕЛЬ ДЛЯ ПРОДАЖ С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ
this.db.ref('sales').on('value', (snapshot) => {
    if (snapshot.exists()) {
        try {
            const salesObj = snapshot.val();
            const salesArray = Object.values(salesObj || {});
            
            console.log('🔄 Продажи синхронизированы из Firebase:', salesArray.length);
            
            // Сохраняем локально
            localStorage.setItem('sales', JSON.stringify(salesArray));
            
            // Обновляем глобальную переменную
            if (typeof window.sales !== 'undefined') {
                window.sales = salesArray;
                console.log('📊 Продажи обновлены в памяти:', window.sales.length);
            }
            
            // Если мы на странице отчетов или менеджера - обновляем UI
            setTimeout(() => {
                const currentPage = window.location.pathname.split('/').pop();
                
                if (currentPage === 'reports.html') {
                    if (typeof generateFullReport === 'function') {
                        generateFullReport();
                    }
                    if (typeof showNotification === 'function') {
                        showNotification('Отчет обновлен с сервера', 'info', 2000);
                    }
                }
                
                if (currentPage === 'manager.html') {
                    // Обновляем результаты поиска если что-то искали
                    const searchInput = document.getElementById('managerGameSearch');
                    if (searchInput && searchInput.value.trim()) {
                        setTimeout(() => {
                            searchByGame();
                        }, 500);
                    }
                    
                    // Обновляем статистику если открыта
                    const statsSection = document.getElementById('statsSection');
                    if (statsSection && statsSection.style.display !== 'none') {
                        setTimeout(() => {
                            if (typeof showGameStats === 'function') {
                                showGameStats();
                            }
                        }, 500);
                    }
                }
                
                if (currentPage === 'workers-stats.html') {
                    if (typeof generateWorkersStats === 'function') {
                        setTimeout(() => {
                            generateWorkersStats();
                        }, 500);
                    }
                }
                
            }, 300);
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации продаж:', error);
        }
    } else {
        console.log('📊 Нет продаж в Firebase');
        localStorage.setItem('sales', JSON.stringify([]));
        if (typeof window.sales !== 'undefined') {
            window.sales = [];
        }
    }
});

// МОНИТОРИНГ ИЗМЕНЕНИЙ ПРОДАЖ В РЕАЛЬНОМ ВРЕМЕНИ
this.db.ref('sales').on('child_added', (snapshot) => {
    const newSale = snapshot.val();
    console.log(`🆕 Новая продажа в Firebase: ${newSale.accountLogin} за ${newSale.price} ₽`);
});

this.db.ref('sales').on('child_changed', (snapshot) => {
    const updatedSale = snapshot.val();
    console.log(`✏️ Продажа обновлена в Firebase: ${updatedSale.accountLogin}`);
});

this.db.ref('sales').on('child_removed', (snapshot) => {
    console.log(`🗑️ Продажа удалена из Firebase: ${snapshot.key}`);
});
    }
}

// Инициализируем мониторинг изменений
try {
    const changeMonitor = new ChangeMonitor();
} catch (error) {
    console.error('Ошибка инициализации мониторинга изменений:', error);
}

let firebaseSync = null;
try {
    firebaseSync = new FirebaseSync();
} catch (error) {
    console.error('FirebaseSync error:', error);
}

// ГЛОБАЛЬНЫЙ ОБЪЕКТ ДЛЯ СИНХРОНИЗАЦИИ
window.dataSync = {
    // ПОЛНАЯ СИНХРОНИЗАЦИЯ
    forceFullSync: async () => {
        if (firebaseSync) {
            return await firebaseSync.forceFullSync();
        } else {
            console.log('⚠️ Firebase не подключен, используется локальное хранилище');
            return { success: true, local: true };
        }
    },
    
    // СОХРАНЕНИЕ ДАННЫХ
    saveData: async (dataType, data) => {
        if (firebaseSync) {
            return await firebaseSync.saveDataToFirebase(dataType, data);
        } else {
            localStorage.setItem(dataType, JSON.stringify(data));
            return { success: true, local: true };
        }
    },
    
    // ЗАГРУЗКА ДАННЫХ
    loadData: async (dataType) => {
        if (firebaseSync) {
            return await firebaseSync.loadDataFromFirebase(dataType);
        } else {
            const data = localStorage.getItem(dataType);
            return data ? JSON.parse(data) : [];
        }
    },

    // СПЕЦИАЛЬНЫЙ МЕТОД ДЛЯ ЦЕННИКОВ
    savePrices: async (prices) => {
        if (firebaseSync) {
            return await firebaseSync.saveDataToFirebase('gamePrices', prices);
        } else {
            localStorage.setItem('gamePrices', JSON.stringify(prices));
            return { success: true, local: true };
        }
    },
    
    loadPrices: async () => {
        if (firebaseSync) {
            return await firebaseSync.loadDataFromFirebase('gamePrices');
        } else {
            const data = localStorage.getItem('gamePrices');
            return data ? JSON.parse(data) : [];
        }
    },
    
    // СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ РАБОТНИКОВ
    saveWorkers: async (workers) => {
        return await window.dataSync.saveData('workers', workers);
    },
    
    loadWorkers: async () => {
        return await window.dataSync.loadData('workers');
    },
    
    forceSyncWorkers: async () => {
        return await window.dataSync.loadData('workers');
    }
};

// firebase.js - ДОБАВЬТЕ эту функцию в конец файла после window.dataSync


function mergeWorkers(localWorkers, firebaseWorkers) {
    const mergedMap = new Map();
    
    // Сначала добавляем всех локальных работников
    localWorkers.forEach(worker => {
        if (worker.username) {
            mergedMap.set(worker.username, worker);
        }
    });
    
    // Затем добавляем/обновляем из Firebase
    firebaseWorkers.forEach(fbWorker => {
        if (fbWorker.username) {
            const existingWorker = mergedMap.get(fbWorker.username);
            
            if (existingWorker) {
                // Объединяем данные, сохраняя локальные изменения
                mergedMap.set(fbWorker.username, {
                    ...fbWorker,
                    // Сохраняем локальный пароль если он есть
                    password: existingWorker.password || fbWorker.password,
                    // Сохраняем локальный статус если он есть
                    active: existingWorker.active !== undefined ? existingWorker.active : fbWorker.active,
                    // Обновляем метку времени
                    lastSynced: new Date().toISOString()
                });
            } else {
                // Добавляем нового работника из Firebase
                mergedMap.set(fbWorker.username, {
                    ...fbWorker,
                    lastSynced: new Date().toISOString()
                });
            }
        }
    });
    
    return Array.from(mergedMap.values());
}
// Функция для обновления UI при изменении данных
function setupDataListeners() {
    if (!firebaseSync) return;
    
    // Слушатель для игр с обновлением UI
    firebaseSync.db.ref('games').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const gamesObj = snapshot.val();
            const gamesArray = Object.values(gamesObj || {});
            localStorage.setItem('games', JSON.stringify(gamesArray));
            
            // Обновляем глобальную переменную
            if (typeof window.games !== 'undefined') {
                window.games = gamesArray;
            }
            
            console.log('🔄 Игры синхронизированы:', gamesArray.length);
            
            // Если мы на странице игр - обновляем интерфейс
            if (window.location.pathname.includes('games.html')) {
                setTimeout(() => {
                    if (typeof displayGames === 'function') {
                        displayGames();
                    }
                }, 100);
            }
            
            // Обновляем все селекты с играми
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
            }, 200);
        }
    });
    
    // Слушатель для аккаунтов с обновлением UI
    firebaseSync.db.ref('accounts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const accountsObj = snapshot.val();
            const accountsArray = Object.values(accountsObj || {});
            localStorage.setItem('accounts', JSON.stringify(accountsArray));
            
            // Обновляем глобальную переменную
            if (typeof window.accounts !== 'undefined') {
                window.accounts = accountsArray;
            }
            
            console.log('🔄 Аккаунты синхронизированы:', accountsArray.length);
            
            // Обновляем интерфейс если на соответствующих страницах
            setTimeout(() => {
                if (window.location.pathname.includes('accounts.html') && typeof displayAccounts === 'function') {
                    displayAccounts();
                }
                if (window.location.pathname.includes('free-accounts.html') && typeof displayFreeAccounts === 'function') {
                    displayFreeAccounts();
                }
                if (window.location.pathname.includes('manager.html') && typeof displaySearchResults === 'function') {
                    // Обновляем результаты поиска если они есть
                    const gameSelect = document.getElementById('managerGame');
                    if (gameSelect && gameSelect.value) {
                        const gameId = parseInt(gameSelect.value);
                        const gameAccounts = accountsArray.filter(acc => acc.gameId === gameId);
                        const game = gamesArray ? gamesArray.find(g => g.id === gameId) : null;
                        if (game) {
                            displaySearchResults(gameAccounts, game.name);
                        }
                    }
                }
            }, 100);
        }
    });
    
    // Слушатель для продаж с обновлением UI
    firebaseSync.db.ref('sales').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const salesObj = snapshot.val();
            const salesArray = Object.values(salesObj || {});
            localStorage.setItem('sales', JSON.stringify(salesArray));
            
            // Обновляем глобальную переменную
            if (typeof window.sales !== 'undefined') {
                window.sales = salesArray;
            }
            
            console.log('🔄 Продажи синхронизированы:', salesArray.length);
        }
    });
}

// firebase.js - ЗАМЕНИТЕ КОНЕЧНЫЙ БЛОК

// Глобальный объект для отладки
window.firebaseDebug = {
    isInitialized: false,
    lastError: null,
    syncStatus: 'pending'
};

try {
    console.log('🔄 Инициализация FirebaseSync...');
    
    // Проверяем, что Firebase загружен
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase не загружен! Проверьте подключение скриптов.');
    }
    
    // Проверяем, что приложение инициализировано
    if (!firebase.apps.length) {
        console.log('⚠️ Приложение Firebase не инициализировано, инициализируем...');
        firebase.initializeApp(firebaseConfig);
    }
    
    console.log('✅ Firebase приложение инициализировано');
    
    // Инициализируем синхронизацию
    firebaseSync = new FirebaseSync();
    window.firebaseDebug.isInitialized = true;
    window.firebaseDebug.syncStatus = 'active';
    
    console.log('✅ FirebaseSync создан');
    
    // Тест подключения
    testFirebaseConnection();
    
} catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА инициализации Firebase:', error);
    window.firebaseDebug.lastError = error.message;
    window.firebaseDebug.syncStatus = 'error';
    
    // Показываем ошибку пользователю
    if (typeof showNotification === 'function') {
        setTimeout(() => {
            showNotification(`Firebase ошибка: ${error.message}`, 'error', 5000);
        }, 1000);
    }
}

// Функция тестирования подключения
async function testFirebaseConnection() {
    try {
        console.log('🔍 Тестируем подключение к Firebase...');
        
        const db = firebase.database();
        const testRef = db.ref('connection_test');
        
        // Пробуем записать тестовые данные
        await testRef.set({
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            test: true
        });
        
        console.log('✅ Запись в Firebase успешна');
        
        // Читаем обратно
        const snapshot = await testRef.once('value');
        console.log('✅ Чтение из Firebase успешно:', snapshot.val());
        
        // Удаляем тестовые данные
        await testRef.remove();
        
        window.firebaseDebug.connectionTest = 'passed';
        console.log('🎉 Firebase полностью работоспособен!');
        
    } catch (error) {
        console.error('❌ Тест подключения к Firebase провален:', error);
        window.firebaseDebug.connectionTest = 'failed';
        window.firebaseDebug.connectionError = error.message;
    }
}

// Экспортируем объект для отладки
if (typeof window !== 'undefined') {
    window.firebaseDebug = window.firebaseDebug || {
        isInitialized: false,
        lastError: null,
        syncStatus: 'unknown'
    };
}

// Запускаем слушатели после инициализации
if (firebaseSync) {
    setTimeout(setupDataListeners, 1000);
}