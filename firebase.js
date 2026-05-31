
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
        this.setupSalesProtection();
    }
    setupSalesProtection() {
        console.log('🛡️ Активирую защиту продаж...');
        this.lastSalesUpdate = Date.now();
        this.salesUpdateQueue = [];
        this.isProcessingQueue = false;
    }
    initAllSync() {
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

        // Слушатель для продаж С ЗАЩИТОЙ ОТ ПЕРЕЗАПИСИ
        this.db.ref('sales').on('value', (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const salesObj = snapshot.val();
                    localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                    const salesArray = Object.values(salesObj || {});
                    localStorage.setItem('sales', JSON.stringify(salesArray));
                    
                    console.log('🔄 Продажи синхронизированы из Firebase:', salesArray.length);
                    if (typeof window.sales !== 'undefined') {
                        window.sales = salesArray;
                        console.log('📊 Продажи обновлены в памяти:', window.sales.length);
                    }
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
                            const searchInput = document.getElementById('managerGameSearch');
                            if (searchInput && searchInput.value.trim()) {
                                setTimeout(() => {
                                    searchByGame();
                                }, 500);
                            }
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
                localStorage.setItem('sales_firebase', JSON.stringify({}));
                if (typeof window.sales !== 'undefined') {
                    window.sales = [];
                }
            }
        });
        this.db.ref('sales').on('child_added', (snapshot) => {
            const newSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`🆕 Новая продажа в Firebase: ${saleId} - ${newSale.accountLogin} за ${newSale.price} ₽`);
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const exists = localSales.find(s => s.id === saleId);
            if (!exists) {
                localSales.push(newSale);
                localStorage.setItem('sales', JSON.stringify(localSales));
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        this.db.ref('sales').on('child_changed', (snapshot) => {
            const updatedSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`✏️ Продажа обновлена в Firebase: ${saleId} - ${updatedSale.accountLogin}`);
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const saleIndex = localSales.findIndex(s => s.id === saleId);
            if (saleIndex !== -1) {
                localSales[saleIndex] = updatedSale;
                localStorage.setItem('sales', JSON.stringify(localSales));
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            } else {
                localSales.push(updatedSale);
                localStorage.setItem('sales', JSON.stringify(localSales));
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        this.db.ref('sales').on('child_removed', (snapshot) => {
            const removedSaleId = snapshot.key;
            console.log(`🗑️ Продажа удалена из Firebase: ${removedSaleId}`);
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const filteredSales = localSales.filter(s => s.id !== removedSaleId);
            localStorage.setItem('sales', JSON.stringify(filteredSales));
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

    // СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ ПРИ ЗАГРУЗКЕ
    async forceFullSync() {
        try {
            console.log('🔄 Начинаем полную синхронизацию...');
            const workersSnap = await this.db.ref('workers').once('value');
            if (workersSnap.exists()) {
                const workersObj = workersSnap.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                console.log('✅ Работники синхронизированы:', workersArray.length);
            }
            const gamesSnap = await this.db.ref('games').once('value');
            if (gamesSnap.exists()) {
                const gamesObj = gamesSnap.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('✅ Игры синхронизированы:', gamesArray.length);
            }
            const accountsSnap = await this.db.ref('accounts').once('value');
            if (accountsSnap.exists()) {
                const accountsObj = accountsSnap.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('✅ Аккаунты синхронизированы:', accountsArray.length);
            }
            const salesSnap = await this.db.ref('sales').once('value');
            if (salesSnap.exists()) {
                const salesObj = salesSnap.val();
                localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                
                console.log('✅ Продажи синхронизированы:', salesArray.length);
            } else {
                console.log('📊 Нет продаж в Firebase');
                localStorage.setItem('sales', JSON.stringify([]));
                localStorage.setItem('sales_firebase', JSON.stringify({}));
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
    async saveDataToFirebase(dataType, data) {
        console.log(`💾 СОХРАНЕНИЕ в Firebase: ${dataType}`, data.length || data);
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
            
            console.log(`📤 Отправляем в Firebase (${dataType}):`, Object.keys(dataObj).length, 'записей');
            const startTime = Date.now();
            await this.db.ref(dataType).update(dataObj); 
            const endTime = Date.now();
            
            console.log(`✅ Данные "${dataType}" сохранены в Firebase за ${endTime - startTime}ms`);
            localStorage.setItem(dataType, JSON.stringify(data));
            
            return { success: true, synced: true, local: true };
            
        } catch (error) {
            console.error(`❌ ОШИБКА сохранения "${dataType}" в Firebase:`, error);
            if (error.code) {
                console.error(`Код ошибки Firebase: ${error.code}`, error.message);
                if (error.code === 'PERMISSION_DENIED') {
                    console.error('❌ НЕТ ПРАВ ДОСТУПА к Firebase. Проверьте правила базы данных!');
                } else if (error.code === 'NETWORK_ERROR') {
                    console.error('🌐 ОШИБКА СЕТИ. Проверьте подключение к интернету.');
                } else if (error.code === 'DATA_STALE') {
                    console.error('🔄 ДАННЫЕ УСТАРЕЛИ. Нужно обновить данные перед сохранением.');
                }
            }
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
    async saveSalesSafely(salesArray) {
        console.log('🛡️ Безопасное сохранение продаж...');
        
        try {
            const now = Date.now();
            if (now - this.lastSalesUpdate < 2000) { 
                console.log('⏳ Слишком частая запись продаж, добавляем в очередь');
                this.salesUpdateQueue.push(salesArray);
                
                if (!this.isProcessingQueue) {
                    this.processSalesQueue();
                }
                
                return { success: true, queued: true, queueSize: this.salesUpdateQueue.length };
            }
            
            this.lastSalesUpdate = now;
            const results = [];
            let successCount = 0;
            let errorCount = 0;
            
            for (const sale of salesArray) {
                if (!sale || !sale.id) {
                    console.warn('⚠️ Пропускаем продажу без ID:', sale);
                    continue;
                }
                
                try {
                    await this.db.ref('sales/' + sale.id).set(sale);
                    successCount++;
                    results.push({ id: sale.id, success: true });
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Ошибка сохранения продажи ${sale.id}:`, error);
                    results.push({ id: sale.id, error: error.message });
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            console.log(`✅ Продажи сохранены безопасно: ${successCount} успешно, ${errorCount} с ошибкой`);
            
            localStorage.setItem('sales', JSON.stringify(salesArray));
            
            return { 
                success: true, 
                synced: true, 
                local: true,
                results: results,
                saved: successCount,
                errors: errorCount
            };
            
        } catch (error) {
            console.error('❌ Критическая ошибка при безопасном сохранении продаж:', error);
            localStorage.setItem('sales', JSON.stringify(salesArray));
            
            return { 
                success: true, 
                local: true, 
                error: error.message,
                synced: false
            };
        }
    }
    async processSalesQueue() {
        if (this.isProcessingQueue || this.salesUpdateQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        console.log(`🔄 Обрабатываю очередь продаж: ${this.salesUpdateQueue.length} в очереди`);
        
        while (this.salesUpdateQueue.length > 0) {
            const salesArray = this.salesUpdateQueue.shift();
            
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                await this.saveSalesSafely(salesArray);
                console.log(`✅ Элемент из очереди обработан. Осталось: ${this.salesUpdateQueue.length}`);
            } catch (error) {
                console.error('❌ Ошибка обработки очереди продаж:', error);
            }
        }
        
        this.isProcessingQueue = false;
        console.log('✅ Очередь продаж полностью обработана');
    }
    async saveSingleSale(sale) {
        console.log('💾 Сохраняем одну продажу:', sale.id);
        
        if (!sale || !sale.id) {
            console.error('❌ Продажа не имеет ID');
            throw new Error('Продажа должна иметь ID');
        }
        
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
            
            localStorage.setItem('sales', JSON.stringify(localSales));
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
            console.error(`❌ Ошибка сохранения одной продажи ${sale.id}:`, error);
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const existingIndex = localSales.findIndex(s => s.id === sale.id);
            
            if (existingIndex !== -1) {
                localSales[existingIndex] = sale;
            } else {
                localSales.push(sale);
            }
            
            localStorage.setItem('sales', JSON.stringify(localSales));
            
            return { 
                success: true, 
                local: true, 
                error: error.message,
                synced: false,
                saleId: sale.id
            };
        }
    }
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
    async fixSalesConflicts() {
        console.log('🔄 Исправление конфликтов продаж...');
        
        try {
            const snapshot = await this.db.ref('sales').once('value');
            const firebaseSales = snapshot.exists() ? snapshot.val() : {};
            const localSalesStr = localStorage.getItem('sales_firebase') || '{}';
            const localSales = JSON.parse(localSalesStr);
            const mergedSales = { ...localSales, ...firebaseSales };
            await this.db.ref('sales').update(mergedSales);
            localStorage.setItem('sales_firebase', JSON.stringify(mergedSales));
            
            const mergedArray = Object.values(mergedSales || {});
            localStorage.setItem('sales', JSON.stringify(mergedArray));
            if (typeof window.sales !== 'undefined') {
                window.sales = mergedArray;
            }
            
            console.log(`✅ Конфликты исправлены. Всего продаж: ${mergedArray.length}`);
            
            return { 
                success: true, 
                count: mergedArray.length,
                firebaseCount: Object.keys(firebaseSales).length,
                localCount: Object.keys(localSales).length
            };
            
        } catch (error) {
            console.error('❌ Ошибка исправления конфликтов:', error);
            return { success: false, error: error.message };
        }
    }
}
class ChangeMonitor {
    constructor() {
        this.db = firebase.database();
        this.setupChangeMonitoring();
    }
    
    setupChangeMonitoring() {
        this.db.ref('accounts').on('child_changed', (snapshot) => {
            const changedAccount = snapshot.val();
            const accountId = snapshot.key;
            
            console.log(`🔄 Аккаунт изменен в Firebase: ${accountId}`);
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const accountIndex = localAccounts.findIndex(acc => acc.id == accountId);
            
            if (accountIndex !== -1) {
                localAccounts[accountIndex] = {
                    ...localAccounts[accountIndex],
                    ...changedAccount
                };
                localStorage.setItem('accounts', JSON.stringify(localAccounts));
                if (typeof window.onAccountsChanged === 'function') {
                    window.onAccountsChanged(localAccounts);
                }
            }
        });
        this.db.ref('accounts').on('child_added', (snapshot) => {
            const newAccount = snapshot.val();
            console.log(`➕ Новый аккаунт в Firebase: ${newAccount.psnLogin}`);
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            if (!localAccounts.some(acc => acc.id == snapshot.key)) {
                localAccounts.push(newAccount);
                localStorage.setItem('accounts', JSON.stringify(localAccounts));
            }
        });
        this.db.ref('accounts').on('child_removed', (snapshot) => {
            const removedAccountId = snapshot.key;
            console.log(`🗑️ Аккаунт удален из Firebase: ${removedAccountId}`);
            const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const filteredAccounts = localAccounts.filter(acc => acc.id != removedAccountId);
            localStorage.setItem('accounts', JSON.stringify(filteredAccounts));
        });
    }
}
try {
    const changeMonitor = new ChangeMonitor();
} catch (error) {
    console.error('Ошибка инициализации мониторинга изменений:', error);
}

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
            
            localStorage.setItem('sales', JSON.stringify(localSales));
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
    
    forceSyncWorkers: async () => {
        return await window.dataSync.loadData('workers');
    },
    fixSalesConflicts: async () => {
        if (firebaseSync) {
            return await firebaseSync.fixSalesConflicts();
        } else {
            console.log('⚠️ Firebase не подключен, нечего исправлять');
            return { success: true, local: true };
        }
    }
};
function mergeWorkers(localWorkers, firebaseWorkers) {
    const mergedMap = new Map();
    localWorkers.forEach(worker => {
        if (worker.username) {
            mergedMap.set(worker.username, worker);
        }
    });
    firebaseWorkers.forEach(fbWorker => {
        if (fbWorker.username) {
            const existingWorker = mergedMap.get(fbWorker.username);
            
            if (existingWorker) {
                mergedMap.set(fbWorker.username, {
                    ...fbWorker,
                    password: existingWorker.password || fbWorker.password,
                    active: existingWorker.active !== undefined ? existingWorker.active : fbWorker.active,
                    lastSynced: new Date().toISOString()
                });
            } else {
                mergedMap.set(fbWorker.username, {
                    ...fbWorker,
                    lastSynced: new Date().toISOString()
                });
            }
        }
    });
    
    return Array.from(mergedMap.values());
}
function setupDataListeners() {
    if (!firebaseSync) return;
    firebaseSync.db.ref('games').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const gamesObj = snapshot.val();
            const gamesArray = Object.values(gamesObj || {});
            localStorage.setItem('games', JSON.stringify(gamesArray));
            if (typeof window.games !== 'undefined') {
                window.games = gamesArray;
            }
            
            console.log('🔄 Игры синхронизированы:', gamesArray.length);
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
    firebaseSync.db.ref('accounts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const accountsObj = snapshot.val();
            const accountsArray = Object.values(accountsObj || {});
            localStorage.setItem('accounts', JSON.stringify(accountsArray));
            if (typeof window.accounts !== 'undefined') {
                window.accounts = accountsArray;
            }
            
            console.log('🔄 Аккаунты синхронизированы:', accountsArray.length);
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
                        const game = gamesArray ? gamesArray.find(g => g.id === gameId) : null;
                        if (game) {
                            displaySearchResults(gameAccounts, game.name);
                        }
                    }
                }
            }, 100);
        }
    });
    firebaseSync.db.ref('sales').on('value', (snapshot) => {
        if (snapshot.exists()) {
            try {
                const salesObj = snapshot.val();
                localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
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
window.firebaseDebug = {
    isInitialized: false,
    lastError: null,
    syncStatus: 'pending',
    salesStatus: 'unknown'
};

try {
    console.log('🔄 Инициализация FirebaseSync...');
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase не загружен! Проверьте подключение скриптов.');
    }
    if (!firebase.apps.length) {
        console.log('⚠️ Приложение Firebase не инициализировано, инициализируем...');
        firebase.initializeApp(firebaseConfig);
    }
    
    console.log('✅ Firebase приложение инициализировано');
    firebaseSync = new FirebaseSync();
    window.firebaseDebug.isInitialized = true;
    window.firebaseDebug.syncStatus = 'active';
    
    console.log('✅ FirebaseSync создан');
    setTimeout(() => {
        setupDataListeners();
        setTimeout(() => {
            if (window.dataSync && window.dataSync.fixSalesConflicts) {
                console.log('🔄 Автоматическая проверка конфликтов продаж...');
                window.dataSync.fixSalesConflicts().then(result => {
                    if (result.success) {
                        window.firebaseDebug.salesStatus = 'fixed';
                        console.log('✅ Конфликты продаж проверены:', result);
                    }
                });
            }
        }, 3000);
        
    }, 1000);
    testFirebaseConnection();
    
} catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА инициализации Firebase:', error);
    window.firebaseDebug.lastError = error.message;
    window.firebaseDebug.syncStatus = 'error';
    if (typeof showNotification === 'function') {
        setTimeout(() => {
            showNotification(`Firebase ошибка: ${error.message}`, 'error', 5000);
        }, 1000);
    }
}
async function testFirebaseConnection() {
    try {
        console.log('🔍 Тестируем подключение к Firebase...');
        
        const db = firebase.database();
        const testRef = db.ref('connection_test');
        await testRef.set({
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            test: true
        });
        
        console.log('✅ Запись в Firebase успешна');
        const snapshot = await testRef.once('value');
        console.log('✅ Чтение из Firebase успешно:', snapshot.val());
        await testRef.remove();
        
        window.firebaseDebug.connectionTest = 'passed';
        console.log('🎉 Firebase полностью работоспособен!');
        
    } catch (error) {
        console.error('❌ Тест подключения к Firebase провален:', error);
        window.firebaseDebug.connectionTest = 'failed';
        window.firebaseDebug.connectionError = error.message;
    }
}
if (typeof window !== 'undefined') {
    window.firebaseDebug = window.firebaseDebug || {
        isInitialized: false,
        lastError: null,
        syncStatus: 'unknown',
        salesStatus: 'unknown'
    };
}
function checkSalesHealth() {
    console.log('🏥 Проверка здоровья данных продаж...');
    
    // 1. Проверяем локальный массив
    const localSales = JSON.parse(localStorage.getItem('sales')) || [];
    console.log(`📊 Локальный массив sales: ${localSales.length} записей`);
    
    // 2. Проверяем localStorage
    const localStorageSales = JSON.parse(localStorage.getItem('sales_firebase')) || {};
    console.log(`💾 localStorage sales_firebase: ${Object.keys(localStorageSales).length} записей`);
    
    // 3. Проверяем глобальную переменную
    if (typeof window.sales !== 'undefined') {
        console.log(`🌐 Глобальная переменная sales: ${window.sales.length} записей`);
    }
    
    // 4. Проверяем дубликаты ID
    const ids = localSales.map(s => s.id);
    const uniqueIds = [...new Set(ids)];
    
    if (ids.length !== uniqueIds.length) {
        console.warn(`⚠️ Найдены дубликаты ID: ${ids.length - uniqueIds.length} дубликатов`);
    } else {
        console.log('✅ Дубликатов ID не найдено');
    }
    let invalidCount = 0;
    localSales.forEach((sale, index) => {
        if (!sale.id || !sale.accountId || sale.price === undefined) {
            invalidCount++;
            console.warn(`❌ Неполная запись ${index}:`, sale);
        }
    });
    
    if (invalidCount > 0) {
        console.warn(`⚠️ Найдено неполных записей: ${invalidCount}`);
    } else {
        console.log('✅ Все записи корректны');
    }
    
    return {
        localCount: localSales.length,
        storageCount: Object.keys(localStorageSales).length,
        globalCount: window.sales ? window.sales.length : 0,
        duplicates: ids.length - uniqueIds.length,
        invalid: invalidCount
    };
}
setInterval(() => {
    if (window.firebaseDebug && window.firebaseDebug.isInitialized) {
        const health = checkSalesHealth();
        if (health.duplicates > 0 || health.invalid > 0) {
            console.log('🔄 Автоматическое исправление проблем...');
            if (window.dataSync && window.dataSync.fixSalesConflicts) {
                window.dataSync.fixSalesConflicts();
            }
        }
    }
}, 10 * 60 * 1000); 
window.checkSalesConflicts = function() {
    return checkSalesHealth();
};
window.forceSalesSync = async function() {
    console.log('🚀 Принудительная синхронизация продаж...');
    
    if (window.dataSync && window.dataSync.saveData) {
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        const result = await window.dataSync.saveData('sales', localSales);
        
        if (result.success && result.synced) {
            console.log('✅ Продажи синхронизированы');
            showNotification('Продажи успешно синхронизированы! ✅', 'success');
        } else {
            console.warn('⚠️ Синхронизация прошла с проблемами:', result);
            showNotification('Синхронизация завершена с предупреждениями ⚠️', 'warning');
        }
        
        return result;
    } else {
        console.error('❌ dataSync не доступен');
        showNotification('Ошибка синхронизации ❌', 'error');
        return { success: false, error: 'dataSync не доступен' };
    }
};

console.log('✅ Firebase.js загружен с защитой от исчезновения продаж');