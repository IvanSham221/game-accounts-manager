// firebase.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (БЕЗ ОШИБКИ QuotaExceededError)

const firebaseConfig = {
    apiKey: "AIzaSyCYTyHQ6B6WovINxyI1R8Qnn7JXS8WnnE8",
    authDomain: "crm-pshub.firebaseapp.com",
    databaseURL: "https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "crm-pshub",
    storageBucket: "crm-pshub.firebasestorage.app",
    messagingSenderId: "720773477998",
    appId: "1:720773477998:web:3d3c61747c42833f7f987f"
};

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

// ============================================================
// БЕЗОПАСНОЕ СОХРАНЕНИЕ ПРОДАЖ В LOCALSTORAGE (ТОЛЬКО КЕШ)
// ============================================================
function safeSaveSales(salesArray) {
    try {
        // Храним только последние 500 продаж в localStorage
        const MAX_CACHE = 500;
        let toSave = salesArray;
        if (salesArray.length > MAX_CACHE) {
            toSave = salesArray.slice(-MAX_CACHE);
            console.log(`📦 Кеш: ${toSave.length} из ${salesArray.length} продаж`);
        }
        localStorage.setItem('sales', JSON.stringify(toSave));
        return true;
    } catch (e) {
        console.warn('⚠️ Не удалось сохранить кеш продаж:', e);
        // Пробуем сохранить 100 продаж
        try {
            const emergency = salesArray.slice(-100);
            localStorage.setItem('sales', JSON.stringify(emergency));
            console.log('⚠️ Экстренный кеш: 100 продаж');
            return true;
        } catch (e2) {
            console.error('❌ Не удалось сохранить даже экстренный кеш');
            localStorage.removeItem('sales');
            return false;
        }
    }
}

class FirebaseSync {
    constructor() {
        this.db = firebase.database();
        this.initAllSync();
        this.setupSalesProtection();
    }

    // Защита от исчезновения продаж
    setupSalesProtection() {
        console.log('🛡️ Активирую защиту продаж...');
        this.lastSalesUpdate = Date.now();
        this.salesUpdateQueue = [];
        this.isProcessingQueue = false;
    }

    // ИНИЦИАЛИЗАЦИЯ ВСЕХ СЛУШАТЕЛЕЙ
    initAllSync() {
        // Слушатель для игр
        this.db.ref('games').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const gamesObj = snapshot.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('🔄 Игры синхронизированы:', gamesArray.length);
            }
        });

        // Слушатель для аккаунтов
        this.db.ref('accounts').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const accountsObj = snapshot.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('🔄 Аккаунты синхронизированы:', accountsArray.length);
            }
        });

// Слушатель для продаж (ВСЕ ПРОДАЖИ В ПАМЯТИ)
this.db.ref('sales').on('value', (snapshot) => {
    if (snapshot.exists()) {
        try {
            const salesObj = snapshot.val();
            const salesArray = Object.values(salesObj || {});
            
            // ===== СОХРАНЯЕМ ВСЕ ПРОДАЖИ В ПАМЯТЬ =====
            if (typeof window.sales !== 'undefined') {
                window.sales = salesArray;
                console.log(`📊 В памяти: ${window.sales.length} продаж`);
            }
            
            // Обновляем глобальную переменную
            sales = salesArray;
            
            // ===== КЕШИРУЕМ В localStorage (опционально, для быстрого доступа) =====
            try {
                // Пытаемся сохранить все продажи в localStorage
                localStorage.setItem('sales', JSON.stringify(salesArray));
                console.log('📦 Все продажи сохранены в кеш');
            } catch (cacheError) {
                // Если не влезает - сохраняем только последние 500 для кеша
                const cached = salesArray.slice(-500);
                localStorage.setItem('sales', JSON.stringify(cached));
                console.log(`📦 Кеш: ${cached.length} из ${salesArray.length} продаж`);
            }
            
            console.log(`🔄 Продажи синхронизированы из Firebase: ${salesArray.length}`);
            
            // ===== ОБНОВЛЯЕМ UI =====
            setTimeout(() => {
                const currentPage = window.location.pathname.split('/').pop();
                
                if (currentPage === 'reports.html') {
                    if (typeof generateFullReport === 'function') {
                        generateFullReport();
                    }
                    if (typeof showNotification === 'function') {
                        showNotification(`Отчет обновлен: ${salesArray.length} продаж`, 'info', 2000);
                    }
                }
                
                if (currentPage === 'manager.html') {
                    const searchInput = document.getElementById('managerGameSearch');
                    if (searchInput && searchInput.value.trim()) {
                        setTimeout(() => {
                            if (typeof searchByGame === 'function') {
                                searchByGame();
                            }
                        }, 500);
                    }
                }
                
                if (currentPage === 'workers-stats.html') {
                    if (typeof generateWorkersStats === 'function') {
                        setTimeout(generateWorkersStats, 500);
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
        sales = [];
    }
});
        
        // Мониторинг добавления новых продаж
        this.db.ref('sales').on('child_added', (snapshot) => {
            const newSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`🆕 Новая продажа в Firebase: ${saleId} - ${newSale.accountLogin} за ${newSale.price} ₽`);
            
            // Добавляем в локальный массив если его там нет
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const exists = localSales.find(s => s.id === saleId);
            if (!exists) {
                localSales.push(newSale);
                safeSaveSales(localSales);
                
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        // Мониторинг изменения продаж
        this.db.ref('sales').on('child_changed', (snapshot) => {
            const updatedSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`✏️ Продажа обновлена в Firebase: ${saleId} - ${updatedSale.accountLogin}`);
            
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const saleIndex = localSales.findIndex(s => s.id === saleId);
            if (saleIndex !== -1) {
                localSales[saleIndex] = updatedSale;
                safeSaveSales(localSales);
                
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            } else {
                localSales.push(updatedSale);
                safeSaveSales(localSales);
                
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        // Мониторинг удаления продаж
        this.db.ref('sales').on('child_removed', (snapshot) => {
            const removedSaleId = snapshot.key;
            console.log(`🗑️ Продажа удалена из Firebase: ${removedSaleId}`);
            
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const filteredSales = localSales.filter(s => s.id !== removedSaleId);
            safeSaveSales(filteredSales);
            
            if (typeof window.sales !== 'undefined') {
                window.sales = filteredSales;
            }
        });

        // Слушатель для ценников
        this.db.ref('gamePrices').on('value', (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const pricesObj = snapshot.val();
                    const pricesArray = Object.values(pricesObj || {});
                    localStorage.setItem('gamePrices', JSON.stringify(pricesArray));
                    console.log('🔄 Ценники синхронизированы:', pricesArray.length);
                    
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

    // ПОЛНАЯ СИНХРОНИЗАЦИЯ (ИСПРАВЛЕНА)
    async forceFullSync() {
        try {
            console.log('🔄 Начинаем полную синхронизацию...');
            
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
            
            // Синхронизируем продажи (ИСПРАВЛЕНО)
            const salesSnap = await this.db.ref('sales').once('value');
            if (salesSnap.exists()) {
                const salesObj = salesSnap.val();
                
                const salesArray = Object.values(salesObj || {});
                
                // Сохраняем ТОЛЬКО кеш (последние 500)
                safeSaveSales(salesArray);
                
                if (typeof window.sales !== 'undefined') {
                    window.sales = salesArray;
                }
                
                console.log('✅ Продажи синхронизированы:', salesArray.length);
            } else {
                console.log('📊 Нет продаж в Firebase');
                localStorage.setItem('sales', JSON.stringify([]));
                if (typeof window.sales !== 'undefined') {
                    window.sales = [];
                }
            }

            // Синхронизируем ценники
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
        console.log(`💾 СОХРАНЕНИЕ в Firebase: ${dataType}`);
        
        if (!this.db) {
            console.error('❌ Firebase Database не доступен');
            throw new Error('Firebase Database не инициализирован');
        }
        
        try {
            if (dataType === 'sales') {
                return await this.saveSalesSafely(data);
            }
            
            const dataObj = {};
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const key = item.id || item.username || Date.now() + Math.random();
                    dataObj[key] = item;
                });
            } else if (typeof data === 'object') {
                Object.assign(dataObj, data);
            } else {
                throw new Error('Неподдерживаемый формат данных');
            }
            
            await this.db.ref(dataType).update(dataObj);
            localStorage.setItem(dataType, JSON.stringify(data));
            
            return { success: true, synced: true, local: true };
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения "${dataType}":`, error);
            localStorage.setItem(dataType, JSON.stringify(data));
            return { 
                success: true, 
                local: true, 
                error: error.message,
                synced: false
            };
        }
    }
    
    // БЕЗОПАСНОЕ СОХРАНЕНИЕ ПРОДАЖ
    async saveSalesSafely(salesArray) {
        console.log('🛡️ Безопасное сохранение продаж...');
        
        try {
            const now = Date.now();
            if (now - this.lastSalesUpdate < 2000) {
                console.log('⏳ Слишком частая запись, добавляем в очередь');
                this.salesUpdateQueue.push(salesArray);
                if (!this.isProcessingQueue) {
                    this.processSalesQueue();
                }
                return { success: true, queued: true };
            }
            
            this.lastSalesUpdate = now;
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const sale of salesArray) {
                if (!sale || !sale.id) continue;
                
                try {
                    await this.db.ref('sales/' + sale.id).set(sale);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Ошибка сохранения продажи ${sale.id}:`, error);
                }
                
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            console.log(`✅ Продажи сохранены: ${successCount} успешно, ${errorCount} с ошибкой`);
            
            // Обновляем кеш
            safeSaveSales(salesArray);
            
            return { 
                success: true, 
                synced: true, 
                local: true,
                saved: successCount,
                errors: errorCount
            };
            
        } catch (error) {
            console.error('❌ Ошибка сохранения продаж:', error);
            safeSaveSales(salesArray);
            return { success: true, local: true, error: error.message, synced: false };
        }
    }
    
    async processSalesQueue() {
        if (this.isProcessingQueue || this.salesUpdateQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        console.log(`🔄 Обрабатываю очередь: ${this.salesUpdateQueue.length}`);
        
        while (this.salesUpdateQueue.length > 0) {
            const salesArray = this.salesUpdateQueue.shift();
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.saveSalesSafely(salesArray);
            } catch (error) {
                console.error('❌ Ошибка очереди:', error);
            }
        }
        
        this.isProcessingQueue = false;
        console.log('✅ Очередь обработана');
    }

    // СОХРАНЕНИЕ ОДНОЙ ПРОДАЖИ
    async saveSingleSale(sale) {
        console.log('💾 Сохраняем одну продажу:', sale.id);
        
        if (!sale || !sale.id) {
            throw new Error('Продажа должна иметь ID');
        }
        
        try {
            await this.db.ref('sales/' + sale.id).set(sale);
            console.log(`✅ Продажа ${sale.id} сохранена в Firebase`);
            
            // Обновляем кеш
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const existingIndex = localSales.findIndex(s => s.id === sale.id);
            
            if (existingIndex !== -1) {
                localSales[existingIndex] = sale;
            } else {
                localSales.push(sale);
            }
            
            safeSaveSales(localSales);
            
            if (typeof window.sales !== 'undefined') {
                const saleIndex = window.sales.findIndex(s => s.id === sale.id);
                if (saleIndex !== -1) {
                    window.sales[saleIndex] = sale;
                } else {
                    window.sales.push(sale);
                }
            }
            
            return { success: true, synced: true, local: true, saleId: sale.id };
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения продажи:`, error);
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const existingIndex = localSales.findIndex(s => s.id === sale.id);
            
            if (existingIndex !== -1) {
                localSales[existingIndex] = sale;
            } else {
                localSales.push(sale);
            }
            
            safeSaveSales(localSales);
            
            return { success: true, local: true, error: error.message, synced: false };
        }
    }

    // ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
    async loadDataFromFirebase(dataType) {
        try {
            const snapshot = await this.db.ref(dataType).once('value');
            if (snapshot.exists()) {
                const dataObj = snapshot.val();
                const dataArray = Object.values(dataObj || {});
                
                if (dataType === 'sales') {
                    safeSaveSales(dataArray);
                    if (typeof window.sales !== 'undefined') {
                        window.sales = dataArray;
                    }
                } else {
                    localStorage.setItem(dataType, JSON.stringify(dataArray));
                }
                
                console.log(`✅ Данные "${dataType}" загружены: ${dataArray.length}`);
                return dataArray;
            }
            return [];
        } catch (error) {
            console.error(`❌ Ошибка загрузки "${dataType}":`, error);
            const local = localStorage.getItem(dataType);
            return local ? JSON.parse(local) : [];
        }
    }
    
    // ИСПРАВЛЕНИЕ КОНФЛИКТОВ ПРОДАЖ (ИСПРАВЛЕНО)
    async fixSalesConflicts() {
        console.log('🔄 Исправление конфликтов продаж...');
        
        try {
            const snapshot = await this.db.ref('sales').once('value');
            const firebaseSales = snapshot.exists() ? snapshot.val() : {};
            
            // Убираем сохранение sales_firebase - оно вызывает переполнение localStorage
            // localStorage.setItem('sales_firebase', JSON.stringify(firebaseSales)); // ← УДАЛЕНО
            
            const firebaseArray = Object.values(firebaseSales || {});
            
            // Обновляем кеш (последние 500)
            safeSaveSales(firebaseArray);
            
            if (typeof window.sales !== 'undefined') {
                window.sales = firebaseArray;
            }
            
            console.log(`✅ Конфликты исправлены. Всего продаж: ${firebaseArray.length}`);
            
            return { 
                success: true, 
                count: firebaseArray.length,
                firebaseCount: Object.keys(firebaseSales).length
            };
            
        } catch (error) {
            console.error('❌ Ошибка исправления конфликтов:', error);
            return { success: false, error: error.message };
        }
    }
}

// ============================================================
// ГЛОБАЛЬНЫЙ ОБЪЕКТ ДЛЯ СИНХРОНИЗАЦИИ
// ============================================================
let firebaseSync = null;

window.dataSync = {
    forceFullSync: async () => {
        if (firebaseSync) {
            return await firebaseSync.forceFullSync();
        } else {
            console.log('⚠️ Firebase не подключен, используется локальное хранилище');
            return { success: true, local: true };
        }
    },
    
    saveData: async (dataType, data) => {
        if (firebaseSync) {
            return await firebaseSync.saveDataToFirebase(dataType, data);
        } else {
            localStorage.setItem(dataType, JSON.stringify(data));
            return { success: true, local: true };
        }
    },
    
    saveSale: async (sale) => {
        if (firebaseSync) {
            return await firebaseSync.saveSingleSale(sale);
        } else {
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const existingIndex = localSales.findIndex(s => s.id === sale.id);
            if (existingIndex !== -1) {
                localSales[existingIndex] = sale;
            } else {
                localSales.push(sale);
            }
            safeSaveSales(localSales);
            return { success: true, local: true };
        }
    },
    
    loadData: async (dataType) => {
        if (firebaseSync) {
            return await firebaseSync.loadDataFromFirebase(dataType);
        } else {
            const data = localStorage.getItem(dataType);
            return data ? JSON.parse(data) : [];
        }
    },

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
    
    saveWorkers: async (workers) => {
        return await window.dataSync.saveData('workers', workers);
    },
    
    loadWorkers: async () => {
        return await window.dataSync.loadData('workers');
    },
    
    fixSalesConflicts: async () => {
        if (firebaseSync) {
            return await firebaseSync.fixSalesConflicts();
        } else {
            console.log('⚠️ Firebase не подключен');
            return { success: true, local: true };
        }
    }
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
try {
    console.log('🔄 Инициализация FirebaseSync...');
    
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase не загружен!');
    }
    
    if (!firebase.apps.length) {
        console.log('⚠️ Приложение Firebase не инициализировано, инициализируем...');
        firebase.initializeApp(firebaseConfig);
    }
    
    console.log('✅ Firebase приложение инициализировано');
    
    firebaseSync = new FirebaseSync();
    console.log('✅ FirebaseSync создан');
    
    // Тест подключения
    setTimeout(testFirebaseConnection, 1000);
    
} catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА инициализации Firebase:', error);
    
    if (typeof showNotification === 'function') {
        setTimeout(() => {
            showNotification(`Firebase ошибка: ${error.message}`, 'error', 5000);
        }, 1000);
    }
}

// ============================================================
// ТЕСТ ПОДКЛЮЧЕНИЯ
// ============================================================
async function testFirebaseConnection() {
    try {
        console.log('🔍 Тестируем подключение к Firebase...');
        const db = firebase.database();
        const testRef = db.ref('connection_test');
        
        await testRef.set({ timestamp: Date.now(), test: true });
        const snapshot = await testRef.once('value');
        console.log('✅ Чтение из Firebase успешно:', snapshot.val());
        await testRef.remove();
        
        console.log('🎉 Firebase полностью работоспособен!');
    } catch (error) {
        console.error('❌ Тест подключения провален:', error);
    }
}

// ============================================================
// ОЧИСТКА СТАРОГО ПРОБЛЕМНОГО КЛЮЧА
// ============================================================
try {
    if (localStorage.getItem('sales_firebase')) {
        console.log('🧹 Удаляю проблемный ключ sales_firebase...');
        localStorage.removeItem('sales_firebase');
    }
} catch (e) {
    console.warn('Не удалось удалить sales_firebase:', e);
}

console.log('✅ Firebase.js загружен (исправленная версия)');

// ============================================================
// НАСТРОЙКА СЛУШАТЕЛЕЙ ДЛЯ UI (ИСПРАВЛЕНО)
// ============================================================
function setupDataListeners() {
    if (!firebaseSync) return;
    
    // Слушатель для игр
    firebaseSync.db.ref('games').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const gamesObj = snapshot.val();
            const gamesArray = Object.values(gamesObj || {});
            localStorage.setItem('games', JSON.stringify(gamesArray));
            
            if (typeof window.games !== 'undefined') {
                window.games = gamesArray;
            }
            
            console.log('🔄 Игры синхронизированы (UI):', gamesArray.length);
            
            if (window.location.pathname.includes('games.html')) {
                setTimeout(() => {
                    if (typeof displayGames === 'function') {
                        displayGames();
                    }
                }, 100);
            }
            
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
    
    // Слушатель для аккаунтов
    firebaseSync.db.ref('accounts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const accountsObj = snapshot.val();
            const accountsArray = Object.values(accountsObj || {});
            localStorage.setItem('accounts', JSON.stringify(accountsArray));
            
            if (typeof window.accounts !== 'undefined') {
                window.accounts = accountsArray;
            }
            
            console.log('🔄 Аккаунты синхронизированы (UI):', accountsArray.length);
            
            setTimeout(() => {
                if (window.location.pathname.includes('accounts.html') && typeof displayAccounts === 'function') {
                    displayAccounts();
                }
                if (window.location.pathname.includes('free-accounts.html') && typeof displayFreeAccounts === 'function') {
                    displayFreeAccounts();
                }
                if (window.location.pathname.includes('manager.html') && typeof displaySearchResults === 'function') {
                    const gameSelect = document.getElementById('managerGame');
                    if (gameSelect && gameSelect.value) {
                        const gameId = parseInt(gameSelect.value);
                        const gameAccounts = accountsArray.filter(acc => acc.gameId === gameId);
                        const gamesArray = JSON.parse(localStorage.getItem('games')) || [];
                        const game = gamesArray.find(g => g.id === gameId);
                        if (game) {
                            displaySearchResults(gameAccounts, game.name);
                        }
                    }
                }
            }, 100);
        }
    });
    
    // Слушатель для продаж (ИСПРАВЛЕНО - УБРАН sales_firebase)
    firebaseSync.db.ref('sales').on('value', (snapshot) => {
        if (snapshot.exists()) {
            try {
                const salesObj = snapshot.val();
                
                const salesArray = Object.values(salesObj || {});
                
                // Сохраняем ТОЛЬКО кеш (последние 500)
                safeSaveSales(salesArray);
                
                if (typeof window.sales !== 'undefined') {
                    window.sales = salesArray;
                }
                
                console.log('🔄 Продажи синхронизированы (UI):', salesArray.length);
                
            } catch (error) {
                console.error('❌ Ошибка синхронизации продаж для UI:', error);
            }
        }
    });
}

// Запускаем слушатели
setTimeout(setupDataListeners, 500);

console.log('✅ Все готово!');