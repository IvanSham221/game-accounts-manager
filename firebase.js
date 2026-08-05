// firebase.js - ПОЛНОСТЬЮ ОТКЛЮЧАЕМ ПРОДАЖИ НА MANAGER.HTML

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
const needsSales = ['reports.html', 'workers-stats.html'].includes(currentPage);

console.log(`📄 Текущая страница: ${currentPage}`);
console.log(`📊 Продажи нужны: ${needsSales ? 'ДА' : 'НЕТ'}`);
console.log(`👨‍💼 Manager page: ${isManagerPage ? 'ДА' : 'НЕТ'}`);

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

        // ---- АККАУНТЫ (всегда) ----
        this.db.ref('accounts').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const accountsObj = snapshot.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('🔄 Аккаунты синхронизированы:', accountsArray.length);
            }
        });

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
                // Обновляем кеш
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
                
                // Создаем метод для загрузки продаж по запросу
                window.loadSalesOnDemand = async function(gameId) {
    console.log(`📥 Загружаем продажи для игры ${gameId}...`);
    
    try {
        // Используем firebaseSync.db вместо this.db
        const db = firebaseSync ? firebaseSync.db : firebase.database();
        const snapshot = await db.ref('sales').once('value');
        
        if (snapshot.exists()) {
            const salesObj = snapshot.val();
            const allSales = Object.values(salesObj || {});
            
            // Фильтруем только по этой игре
            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
            const accountIds = gameAccounts.map(acc => acc.id);
            const gameSales = allSales.filter(sale => accountIds.includes(sale.accountId));
            
            // Сохраняем в память только продажи по этой игре
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
    // ПОЛНАЯ СИНХРОНИЗАЦИЯ (БЕЗ ПРОДАЖ ДЛЯ MANAGER.HTML)
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
            
            // Аккаунты
            const accountsSnap = await this.db.ref('accounts').once('value');
            if (accountsSnap.exists()) {
                const accountsObj = accountsSnap.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                if (typeof accounts !== 'undefined') accounts = accountsArray;
                console.log('✅ Аккаунты синхронизированы:', accountsArray.length);
            }
            
            // ===== ПРОДАЖИ — ЗАГРУЖАЕМ ТОЛЬКО ЕСЛИ НУЖНО =====
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
                console.log('⏭️ Пропускаем загрузку продаж (не нужно)');
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

    // ... остальные методы (saveDataToFirebase, saveSalesSafely, etc.) остаются без изменений ...
    // (они нужны для сохранения продаж, но не для загрузки)
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
let firebaseSync = null;

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