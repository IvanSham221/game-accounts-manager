// firebase.js - ПОЛНОСТЬЮ ОТКЛЮЧАЕМ ПРОДАЖИ И АККАУНТЫ НА MANAGER.HTML

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

// ============================================================
// ★★★ ОПРЕДЕЛЯЕМ СТРАНИЦУ ★★★
// ============================================================
const currentPage = window.location.pathname.split('/').pop();
const isLoginPage = currentPage === 'login.html' || currentPage === 'index.html';
const isManagerPage = currentPage === 'manager.html';
const isWorkersPage = currentPage === 'workers.html';
const needsSales = ['reports.html'].includes(currentPage);
const needsAllAccounts = ['accounts.html', 'free-accounts.html', 'add-account.html', 'reports.html'].includes(currentPage);

console.log(`📄 Текущая страница: ${currentPage}`);
console.log(`📊 Продажи нужны: ${needsSales ? 'ДА' : 'НЕТ'}`);
console.log(`👨‍💼 Manager page: ${isManagerPage ? 'ДА' : 'НЕТ'}`);
console.log(`📋 Все аккаунты нужны: ${needsAllAccounts ? 'ДА' : 'НЕТ'}`);

// Проверяем Firebase
if (typeof firebase !== 'undefined') {
    console.log('Версия Firebase:', firebase.SDK_VERSION);
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
// БЕЗОПАСНОЕ СОХРАНЕНИЕ ПРОДАЖ В LOCALSTORAGE
// ============================================================
function safeSaveSales(salesArray) {
    try {
        if (!salesArray || salesArray.length === 0) {
            localStorage.setItem('sales', JSON.stringify([]));
            return true;
        }
        
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
        try {
            const emergency = salesArray.slice(-100);
            localStorage.setItem('sales', JSON.stringify(emergency));
        } catch (e2) {
            localStorage.removeItem('sales');
        }
        return false;
    }
}

// ============================================================
// КЛАСС FIREBASE SYNC
// ============================================================
class FirebaseSync {
    constructor() {
        this.db = firebase.database();
        this.salesUpdateTimeout = null;
        this.initAllSync();
        this.setupSalesProtection();
    }

    setupSalesProtection() {
        console.log('🛡️ Активирую защиту продаж...');
        this.lastSalesUpdate = Date.now();
        this.salesUpdateQueue = [];
        this.isProcessingQueue = false;
    }

    // ============================================================
    // ИНИЦИАЛИЗАЦИЯ СЛУШАТЕЛЕЙ
    // ============================================================
    initAllSync() {
        // ---- ИГРЫ (всегда) ----
        this.db.ref('games').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const gamesObj = snapshot.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('🔄 Игры синхронизированы:', gamesArray.length);
            }
        });

        // ============================================================
        // ★★★ АККАУНТЫ — ЗАПУСКАЕМ ТОЛЬКО ГДЕ НУЖНЫ ★★★
        // ============================================================
        if (needsAllAccounts) {
            console.log('📋 ЗАПУСКАЕМ слушатель аккаунтов (нужно для этой страницы)');
            
            // ---- ОСНОВНОЙ СЛУШАТЕЛЬ АККАУНТОВ ----
            this.db.ref('accounts').on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const accountsObj = snapshot.val();
                    const accountsArray = Object.values(accountsObj || {});
                    localStorage.setItem('accounts', JSON.stringify(accountsArray));
                    if (typeof window.accounts !== 'undefined') window.accounts = accountsArray;
                    if (typeof accounts !== 'undefined') accounts = accountsArray;
                    console.log('🔄 Аккаунты синхронизированы:', accountsArray.length);
                }
            }, this);
            
            // ---- НОВЫЕ АККАУНТЫ ----
            this.db.ref('accounts').on('child_added', (snapshot) => {
                const newAccount = snapshot.val();
                console.log(`🆕 Новый аккаунт в Firebase: ${newAccount.psnLogin}`);
                
                const localAccounts = JSON.parse(localStorage.getItem('accounts')) || [];
                if (!localAccounts.some(acc => acc.id == snapshot.key)) {
                    localAccounts.push(newAccount);
                    localStorage.setItem('accounts', JSON.stringify(localAccounts));
                    if (typeof window.accounts !== 'undefined') window.accounts = localAccounts;
                    if (typeof accounts !== 'undefined') accounts = localAccounts;
                }
            });

            // ---- ИЗМЕНЕНИЯ АККАУНТОВ ----
            this.db.ref('accounts').on('child_changed', (snapshot) => {
                const updatedAccount = snapshot.val();
                const localAccounts = JSON.parse(localStorage.getItem('accounts')) || [];
                const index = localAccounts.findIndex(acc => acc.id == snapshot.key);
                if (index !== -1) {
                    localAccounts[index] = updatedAccount;
                    localStorage.setItem('accounts', JSON.stringify(localAccounts));
                    if (typeof window.accounts !== 'undefined') window.accounts = localAccounts;
                    if (typeof accounts !== 'undefined') accounts = localAccounts;
                }
            });

            // ---- УДАЛЕНИЕ АККАУНТОВ ----
            this.db.ref('accounts').on('child_removed', (snapshot) => {
                const localAccounts = JSON.parse(localStorage.getItem('accounts')) || [];
                const filtered = localAccounts.filter(acc => acc.id != snapshot.key);
                localStorage.setItem('accounts', JSON.stringify(filtered));
                if (typeof window.accounts !== 'undefined') window.accounts = filtered;
                if (typeof accounts !== 'undefined') accounts = filtered;
            });
            
        } else {
            console.log('⏭️ ПРОПУСКАЕМ слушатель аккаунтов (не нужно для этой страницы)');
            
            // ============================================================
            // ★★★ ДЛЯ MANAGER.HTML — ЗАГРУЖАЕМ АККАУНТЫ ТОЛЬКО ПО ЗАПРОСУ ★★★
            // ============================================================
            if (isManagerPage) {
                console.log('👨‍💼 Manager page — аккаунты будут загружены при поиске');
                
                const self = this;
                
                // Метод для загрузки аккаунтов по запросу
                window.loadAccountsOnDemand = async function() {
                    console.log('📥 Загружаем аккаунты...');
                    try {
                        const snapshot = await self.db.ref('accounts').once('value');
                        if (snapshot.exists()) {
                            const accountsObj = snapshot.val();
                            const accountsArray = Object.values(accountsObj || {});
                            localStorage.setItem('accounts', JSON.stringify(accountsArray));
                            if (typeof window.accounts !== 'undefined') window.accounts = accountsArray;
                            if (typeof accounts !== 'undefined') accounts = accountsArray;
                            console.log(`✅ Загружено ${accountsArray.length} аккаунтов`);
                            return accountsArray;
                        }
                        return [];
                    } catch (error) {
                        console.error('❌ Ошибка загрузки аккаунтов:', error);
                        const cached = JSON.parse(localStorage.getItem('accounts')) || [];
                        if (typeof window.accounts !== 'undefined') window.accounts = cached;
                        if (typeof accounts !== 'undefined') accounts = cached;
                        return cached;
                    }
                };
            }
        }

        // ============================================================
        // ★★★ ПРОДАЖИ — ЗАПУСКАЕМ ТОЛЬКО НА СТРАНИЦАХ, ГДЕ ОНИ НУЖНЫ ★★★
        // ============================================================
        if (needsSales) {
            console.log('📊 ЗАПУСКАЕМ слушатель продаж (нужно для этой страницы)');
            
            // ---- ОСНОВНОЙ СЛУШАТЕЛЬ ----
            this.db.ref('sales').on('value', (snapshot) => {
                if (snapshot.exists()) {
                    try {
                        const salesObj = snapshot.val();
                        const salesArray = Object.values(salesObj || {});
                        
                        if (typeof window.sales !== 'undefined') window.sales = salesArray;
                        if (typeof sales !== 'undefined') sales = salesArray;
                        
                        safeSaveSales(salesArray);
                        console.log(`🔄 Продажи синхронизированы: ${salesArray.length}`);
                        
                        clearTimeout(this.salesUpdateTimeout);
                        this.salesUpdateTimeout = setTimeout(() => {
                            const page = window.location.pathname.split('/').pop();
                            if (page === 'reports.html' && typeof generateReport === 'function') {
                                generateReport();
                            }
                            if (page === 'workers-stats.html' && typeof generateWorkersStats === 'function') {
                                generateWorkersStats();
                            }
                        }, 500);
                    } catch (error) {
                        console.error('❌ Ошибка синхронизации продаж:', error);
                    }
                }
            }, this);
            
            // ---- НОВЫЕ ПРОДАЖИ ----
            this.db.ref('sales').on('child_added', (snapshot) => {
                const newSale = snapshot.val();
                console.log(`🆕 Новая продажа: ${newSale.accountLogin || 'Свободная'} за ${newSale.price} ₽`);
                const localSales = JSON.parse(localStorage.getItem('sales')) || [];
                if (!localSales.find(s => s.id === snapshot.key)) {
                    localSales.push(newSale);
                    safeSaveSales(localSales);
                    if (typeof window.sales !== 'undefined') window.sales = localSales;
                    if (typeof sales !== 'undefined') sales = localSales;
                }
            });

            // ---- ИЗМЕНЕНИЯ ПРОДАЖ ----
            this.db.ref('sales').on('child_changed', (snapshot) => {
                const updatedSale = snapshot.val();
                const localSales = JSON.parse(localStorage.getItem('sales')) || [];
                const index = localSales.findIndex(s => s.id === snapshot.key);
                if (index !== -1) {
                    localSales[index] = updatedSale;
                    safeSaveSales(localSales);
                    if (typeof window.sales !== 'undefined') window.sales = localSales;
                    if (typeof sales !== 'undefined') sales = localSales;
                }
            });

            // ---- УДАЛЕНИЕ ПРОДАЖ ----
            this.db.ref('sales').on('child_removed', (snapshot) => {
                const localSales = JSON.parse(localStorage.getItem('sales')) || [];
                const filtered = localSales.filter(s => s.id !== snapshot.key);
                safeSaveSales(filtered);
                if (typeof window.sales !== 'undefined') window.sales = filtered;
                if (typeof sales !== 'undefined') sales = filtered;
            });
            
        } else {
            console.log('⏭️ ПРОПУСКАЕМ слушатель продаж (не нужно для этой страницы)');
            
            // ============================================================
            // ★★★ ДЛЯ MANAGER.HTML — ЗАГРУЖАЕМ ПРОДАЖИ ТОЛЬКО ПО ЗАПРОСУ ★★★
            // ============================================================
            if (isManagerPage) {
                console.log('👨‍💼 Manager page — продажи будут загружены при поиске');
                
                const self = this;
                
                // Метод для загрузки продаж по запросу
                window.loadSalesOnDemand = async function(gameId) {
                    console.log(`📥 Загружаем продажи для игры ${gameId}...`);
                    
                    try {
                        const db = self ? self.db : firebase.database();
                        const snapshot = await db.ref('sales').once('value');
                        
                        if (snapshot.exists()) {
                            const salesObj = snapshot.val();
                            const allSales = Object.values(salesObj || {});
                            
                            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
                            const accountIds = gameAccounts.map(acc => acc.id);
                            const gameSales = allSales.filter(sale => accountIds.includes(sale.accountId));
                            
                            window.sales = gameSales;
                            sales = gameSales;
                            
                            console.log(`✅ Загружено ${gameSales.length} продаж для игры`);
                            return gameSales;
                        }
                        return [];
                    } catch (error) {
                        console.error('❌ Ошибка загрузки продаж:', error);
                        return [];
                    }
                };
            }
        }

        // ---- ЦЕННИКИ (всегда) ----
        this.db.ref('gamePrices').on('value', (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const pricesObj = snapshot.val();
                    const pricesArray = Object.values(pricesObj || {});
                    localStorage.setItem('gamePrices', JSON.stringify(pricesArray));
                    console.log('🔄 Ценники синхронизированы:', pricesArray.length);
                } catch (error) {
                    console.error('❌ Ошибка синхронизации ценников:', error);
                }
            }
        });
    }

    // ============================================================
    // ПОЛНАЯ СИНХРОНИЗАЦИЯ
    // ============================================================
    async forceFullSync() {
        try {
            console.log('🔄 Начинаем полную синхронизацию...');
            
            // Игры
            const gamesSnap = await this.db.ref('games').once('value');
            if (gamesSnap.exists()) {
                const gamesObj = gamesSnap.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                if (typeof games !== 'undefined') games = gamesArray;
                console.log('✅ Игры синхронизированы:', gamesArray.length);
            }
            
            // Аккаунты — только если нужно
            if (needsAllAccounts || !isManagerPage) {
                const accountsSnap = await this.db.ref('accounts').once('value');
                if (accountsSnap.exists()) {
                    const accountsObj = accountsSnap.val();
                    const accountsArray = Object.values(accountsObj || {});
                    localStorage.setItem('accounts', JSON.stringify(accountsArray));
                    if (typeof accounts !== 'undefined') accounts = accountsArray;
                    console.log('✅ Аккаунты синхронизированы:', accountsArray.length);
                }
            } else {
                console.log('⏭️ Пропускаем загрузку аккаунтов (будут загружены при поиске)');
            }
            
            // Продажи — только если нужно
            if (needsSales) {
                const salesSnap = await this.db.ref('sales').once('value');
                if (salesSnap.exists()) {
                    const salesObj = salesSnap.val();
                    const salesArray = Object.values(salesObj || {});
                    safeSaveSales(salesArray);
                    if (typeof window.sales !== 'undefined') window.sales = salesArray;
                    if (typeof sales !== 'undefined') sales = salesArray;
                    console.log('✅ Продажи синхронизированы:', salesArray.length);
                }
            } else {
                console.log('⏭️ Пропускаем загрузку продаж (будут загружены при поиске)');
            }

            // Ценники
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

    // ============================================================
    // СОХРАНЕНИЕ ДАННЫХ В FIREBASE
    // ============================================================
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
            return { success: true, local: true, error: error.message, synced: false };
        }
    }
    
    // ============================================================
    // БЕЗОПАСНОЕ СОХРАНЕНИЕ ПРОДАЖ
    // ============================================================
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
            safeSaveSales(salesArray);
            
            return { success: true, synced: true, local: true, saved: successCount, errors: errorCount };
            
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

    // ============================================================
    // СОХРАНЕНИЕ ОДНОЙ ПРОДАЖИ
    // ============================================================
    async saveSingleSale(sale) {
        console.log('💾 Сохраняем одну продажу:', sale.id);
        if (!sale || !sale.id) throw new Error('Продажа должна иметь ID');
        
        try {
            await this.db.ref('sales/' + sale.id).set(sale);
            console.log(`✅ Продажа ${sale.id} сохранена в Firebase`);
            
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
            if (typeof sales !== 'undefined') {
                const saleIndex = sales.findIndex(s => s.id === sale.id);
                if (saleIndex !== -1) {
                    sales[saleIndex] = sale;
                } else {
                    sales.push(sale);
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

    // ============================================================
    // ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
    // ============================================================
    async loadDataFromFirebase(dataType) {
        try {
            const snapshot = await this.db.ref(dataType).once('value');
            if (snapshot.exists()) {
                const dataObj = snapshot.val();
                const dataArray = Object.values(dataObj || {});
                
                if (dataType === 'sales') {
                    safeSaveSales(dataArray);
                    if (typeof window.sales !== 'undefined') window.sales = dataArray;
                    if (typeof sales !== 'undefined') sales = dataArray;
                } else {
                    localStorage.setItem(dataType, JSON.stringify(dataArray));
                    if (dataType === 'accounts' && typeof accounts !== 'undefined') accounts = dataArray;
                    if (dataType === 'games' && typeof games !== 'undefined') games = dataArray;
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
    
    // ============================================================
    // ИСПРАВЛЕНИЕ КОНФЛИКТОВ ПРОДАЖ
    // ============================================================
    async fixSalesConflicts() {
        console.log('🔄 Исправление конфликтов продаж...');
        try {
            const snapshot = await this.db.ref('sales').once('value');
            const firebaseSales = snapshot.exists() ? snapshot.val() : {};
            const firebaseArray = Object.values(firebaseSales || {});
            
            safeSaveSales(firebaseArray);
            
            if (typeof window.sales !== 'undefined') window.sales = firebaseArray;
            if (typeof sales !== 'undefined') sales = firebaseArray;
            
            console.log(`✅ Конфликты исправлены. Всего продаж: ${firebaseArray.length}`);
            return { success: true, count: firebaseArray.length };
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
        if (firebaseSync) return await firebaseSync.forceFullSync();
        console.log('⚠️ Firebase не подключен, используется локальное хранилище');
        return { success: true, local: true };
    },
    
    saveData: async (dataType, data) => {
        if (firebaseSync) return await firebaseSync.saveDataToFirebase(dataType, data);
        localStorage.setItem(dataType, JSON.stringify(data));
        return { success: true, local: true };
    },
    
    saveSale: async (sale) => {
        if (firebaseSync) return await firebaseSync.saveSingleSale(sale);
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        const existingIndex = localSales.findIndex(s => s.id === sale.id);
        if (existingIndex !== -1) {
            localSales[existingIndex] = sale;
        } else {
            localSales.push(sale);
        }
        safeSaveSales(localSales);
        return { success: true, local: true };
    },
    
    loadData: async (dataType) => {
        if (firebaseSync) return await firebaseSync.loadDataFromFirebase(dataType);
        const data = localStorage.getItem(dataType);
        return data ? JSON.parse(data) : [];
    },

    savePrices: async (prices) => {
        if (firebaseSync) return await firebaseSync.saveDataToFirebase('gamePrices', prices);
        localStorage.setItem('gamePrices', JSON.stringify(prices));
        return { success: true, local: true };
    },
    
    loadPrices: async () => {
        if (firebaseSync) return await firebaseSync.loadDataFromFirebase('gamePrices');
        const data = localStorage.getItem('gamePrices');
        return data ? JSON.parse(data) : [];
    },
    
    saveWorkers: async (workers) => window.dataSync.saveData('workers', workers),
    loadWorkers: async () => window.dataSync.loadData('workers'),
    forceSyncWorkers: async () => window.dataSync.loadData('workers'),
    fixSalesConflicts: async () => {
        if (firebaseSync) return await firebaseSync.fixSalesConflicts();
        console.log('⚠️ Firebase не подключен');
        return { success: true, local: true };
    }
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
try {
    console.log('🔄 Инициализация FirebaseSync...');
    if (typeof firebase === 'undefined') throw new Error('Firebase не загружен!');
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    
    firebaseSync = new FirebaseSync();
    console.log('✅ FirebaseSync создан');
    
    // Тест подключения
    setTimeout(testFirebaseConnection, 1000);
    
} catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
}

// ============================================================
// ТЕСТ ПОДКЛЮЧЕНИЯ
// ============================================================
async function testFirebaseConnection() {
    try {
        console.log('🔍 Тестируем подключение...');
        const db = firebase.database();
        const testRef = db.ref('connection_test');
        await testRef.set({ timestamp: Date.now(), test: true });
        const snapshot = await testRef.once('value');
        console.log('✅ Чтение из Firebase успешно');
        await testRef.remove();
        console.log('🎉 Firebase полностью работоспособен!');
    } catch (error) {
        console.error('❌ Тест подключения провален:', error);
    }
}

// ============================================================
// ОЧИСТКА СТАРОГО КЛЮЧА
// ============================================================
try {
    if (localStorage.getItem('sales_firebase')) {
        localStorage.removeItem('sales_firebase');
        console.log('🧹 Удалён проблемный ключ sales_firebase');
    }
} catch (e) {}

console.log('✅ Firebase.js загружен');
console.log(`📊 Режим продаж: ${needsSales ? 'ПОЛНЫЙ' : 'ПО ЗАПРОСУ'}`);
console.log(`📋 Режим аккаунтов: ${needsAllAccounts ? 'ПОЛНЫЙ' : 'ПО ЗАПРОСУ'}`);