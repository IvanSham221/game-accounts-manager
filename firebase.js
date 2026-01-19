// firebase.js - ПОЛНАЯ СИНХРОНИЗАЦИЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
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
        this.setupSalesProtection(); // Защита от исчезновения продаж
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
        // Слушатель для работников (закомментирован как у вас)
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

        // Слушатель для продаж С ЗАЩИТОЙ ОТ ПЕРЕЗАПИСИ
        this.db.ref('sales').on('value', (snapshot) => {
            if (snapshot.exists()) {
                try {
                    const salesObj = snapshot.val();
                    
                    // Сохраняем как объект с ключами-ID (ВАЖНО!)
                    localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                    
                    // Преобразуем в массив для совместимости
                    const salesArray = Object.values(salesObj || {});
                    localStorage.setItem('sales', JSON.stringify(salesArray));
                    
                    console.log('🔄 Продажи синхронизированы из Firebase:', salesArray.length);
                    
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
                localStorage.setItem('sales_firebase', JSON.stringify({}));
                if (typeof window.sales !== 'undefined') {
                    window.sales = [];
                }
            }
        });
        
        // МОНИТОРИНГ ИЗМЕНЕНИЙ ПРОДАЖ В РЕАЛЬНОМ ВРЕМЕНИ
        this.db.ref('sales').on('child_added', (snapshot) => {
            const newSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`🆕 Новая продажа в Firebase: ${saleId} - ${newSale.accountLogin} за ${newSale.price} ₽`);
            
            // Добавляем в локальный массив если его там нет
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const exists = localSales.find(s => s.id === saleId);
            if (!exists) {
                localSales.push(newSale);
                localStorage.setItem('sales', JSON.stringify(localSales));
                
                // Обновляем глобальную переменную
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        this.db.ref('sales').on('child_changed', (snapshot) => {
            const updatedSale = snapshot.val();
            const saleId = snapshot.key;
            console.log(`✏️ Продажа обновлена в Firebase: ${saleId} - ${updatedSale.accountLogin}`);
            
            // Обновляем локальную копию
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const saleIndex = localSales.findIndex(s => s.id === saleId);
            if (saleIndex !== -1) {
                localSales[saleIndex] = updatedSale;
                localStorage.setItem('sales', JSON.stringify(localSales));
                
                // Обновляем глобальную переменную
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            } else {
                // Если продажи нет в массиве - добавляем
                localSales.push(updatedSale);
                localStorage.setItem('sales', JSON.stringify(localSales));
                
                // Обновляем глобальную переменную
                if (typeof window.sales !== 'undefined') {
                    window.sales = localSales;
                }
            }
        });

        this.db.ref('sales').on('child_removed', (snapshot) => {
            const removedSaleId = snapshot.key;
            console.log(`🗑️ Продажа удалена из Firebase: ${removedSaleId}`);
            
            // Удаляем из локального массива
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const filteredSales = localSales.filter(s => s.id !== removedSaleId);
            localStorage.setItem('sales', JSON.stringify(filteredSales));
            
            // Обновляем глобальную переменную
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
            
            // Синхронизируем продажи (ОСОБЕННЫЙ СЛУЧАЙ)
            const salesSnap = await this.db.ref('sales').once('value');
            if (salesSnap.exists()) {
                const salesObj = salesSnap.val();
                
                // Сохраняем как объект для точного восстановления
                localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                
                // И как массив для совместимости
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                
                console.log('✅ Продажи синхронизированы:', salesArray.length);
            } else {
                console.log('📊 Нет продаж в Firebase');
                localStorage.setItem('sales', JSON.stringify([]));
                localStorage.setItem('sales_firebase', JSON.stringify({}));
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

    // СОХРАНЕНИЕ ДАННЫХ В FIREBASE (ОБНОВЛЕННАЯ ВЕРСИЯ)
    async saveDataToFirebase(dataType, data) {
        console.log(`💾 СОХРАНЕНИЕ в Firebase: ${dataType}`, data.length || data);
        
        // Проверяем подключение
        if (!this.db) {
            console.error('❌ Firebase Database не доступен');
            throw new Error('Firebase Database не инициализирован');
        }
        
        try {
            // ОСОБЫЙ СЛУЧАЙ: ПРОДАЖИ
            if (dataType === 'sales') {
                return await this.saveSalesSafely(data);
            }
            
            // Для остальных типов данных - стандартная логика
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
            
            // Сохраняем в Firebase с использованием update для частичных обновлений
            const startTime = Date.now();
            await this.db.ref(dataType).update(dataObj); // ИЗМЕНЕНИЕ: update вместо set
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
                } else if (error.code === 'DATA_STALE') {
                    console.error('🔄 ДАННЫЕ УСТАРЕЛИ. Нужно обновить данные перед сохранением.');
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
    
    // БЕЗОПАСНОЕ СОХРАНЕНИЕ ПРОДАЖ (ОТДЕЛЬНАЯ ФУНКЦИЯ ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ)
    async saveSalesSafely(salesArray) {
        console.log('🛡️ Безопасное сохранение продаж...');
        
        try {
            // Проверяем, не слишком ли часто сохраняем продажи
            const now = Date.now();
            if (now - this.lastSalesUpdate < 2000) { // 2 секунды задержки
                console.log('⏳ Слишком частая запись продаж, добавляем в очередь');
                this.salesUpdateQueue.push(salesArray);
                
                if (!this.isProcessingQueue) {
                    this.processSalesQueue();
                }
                
                return { success: true, queued: true, queueSize: this.salesUpdateQueue.length };
            }
            
            this.lastSalesUpdate = now;
            
            // Сохраняем каждую продажу ОТДЕЛЬНО с её ID как ключ
            const results = [];
            let successCount = 0;
            let errorCount = 0;
            
            for (const sale of salesArray) {
                if (!sale || !sale.id) {
                    console.warn('⚠️ Пропускаем продажу без ID:', sale);
                    continue;
                }
                
                try {
                    // Сохраняем продажу под её собственным ID
                    await this.db.ref('sales/' + sale.id).set(sale);
                    successCount++;
                    results.push({ id: sale.id, success: true });
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Ошибка сохранения продажи ${sale.id}:`, error);
                    results.push({ id: sale.id, error: error.message });
                }
                
                // Небольшая задержка между сохранениями
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            console.log(`✅ Продажи сохранены безопасно: ${successCount} успешно, ${errorCount} с ошибкой`);
            
            // Сохраняем локально
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
            
            // Сохраняем локально при ошибке
            localStorage.setItem('sales', JSON.stringify(salesArray));
            
            return { 
                success: true, 
                local: true, 
                error: error.message,
                synced: false
            };
        }
    }
    
    // Обработка очереди продаж
    async processSalesQueue() {
        if (this.isProcessingQueue || this.salesUpdateQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        console.log(`🔄 Обрабатываю очередь продаж: ${this.salesUpdateQueue.length} в очереди`);
        
        while (this.salesUpdateQueue.length > 0) {
            const salesArray = this.salesUpdateQueue.shift();
            
            try {
                // Ждем перед обработкой следующего элемента
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
    
    // СОХРАНЕНИЕ ОДНОЙ ПРОДАЖИ (ДЛЯ ФУНКЦИИ confirmSaleAndShowData)
    async saveSingleSale(sale) {
        console.log('💾 Сохраняем одну продажу:', sale.id);
        
        if (!sale || !sale.id) {
            console.error('❌ Продажа не имеет ID');
            throw new Error('Продажа должна иметь ID');
        }
        
        try {
            // 1. Сохраняем в Firebase под уникальным ID
            await this.db.ref('sales/' + sale.id).set(sale);
            console.log(`✅ Продажа ${sale.id} сохранена в Firebase`);
            
            // 2. Обновляем локальный массив
            const localSales = JSON.parse(localStorage.getItem('sales')) || [];
            const existingIndex = localSales.findIndex(s => s.id === sale.id);
            
            if (existingIndex !== -1) {
                // Обновляем существующую
                localSales[existingIndex] = sale;
            } else {
                // Добавляем новую
                localSales.push(sale);
            }
            
            localStorage.setItem('sales', JSON.stringify(localSales));
            
            // 3. Обновляем глобальную переменную
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
            
            // Сохраняем локально
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
    
    // ФИКСАЦИЯ КОНФЛИКТОВ ПРОДАЖ
    async fixSalesConflicts() {
        console.log('🔄 Исправление конфликтов продаж...');
        
        try {
            // 1. Загружаем продажи из Firebase
            const snapshot = await this.db.ref('sales').once('value');
            const firebaseSales = snapshot.exists() ? snapshot.val() : {};
            
            // 2. Загружаем продажи из localStorage
            const localSalesStr = localStorage.getItem('sales_firebase') || '{}';
            const localSales = JSON.parse(localSalesStr);
            
            // 3. Объединяем (Firebase имеет приоритет)
            const mergedSales = { ...localSales, ...firebaseSales };
            
            // 4. Сохраняем обратно в Firebase
            await this.db.ref('sales').update(mergedSales);
            
            // 5. Сохраняем локально
            localStorage.setItem('sales_firebase', JSON.stringify(mergedSales));
            
            const mergedArray = Object.values(mergedSales || {});
            localStorage.setItem('sales', JSON.stringify(mergedArray));
            
            // 6. Обновляем глобальную переменную
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

// Класс мониторинга изменений
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
    }
}

// Инициализируем мониторинг изменений
try {
    const changeMonitor = new ChangeMonitor();
} catch (error) {
    console.error('Ошибка инициализации мониторинга изменений:', error);
}

let firebaseSync = null;

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
    
    // СОХРАНЕНИЕ ОДНОЙ ПРОДАЖИ (ВАЖНО ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ)
    saveSale: async (sale) => {
        if (firebaseSync) {
            return await firebaseSync.saveSingleSale(sale);
        } else {
            // Локальное сохранение
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
    },
    
    // ИСПРАВЛЕНИЕ КОНФЛИКТОВ ПРОДАЖ
    fixSalesConflicts: async () => {
        if (firebaseSync) {
            return await firebaseSync.fixSalesConflicts();
        } else {
            console.log('⚠️ Firebase не подключен, нечего исправлять');
            return { success: true, local: true };
        }
    }
};

// Функция для слияния работников
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
    
    // Слушатель для продаж с обновлением UI (УЛУЧШЕННЫЙ)
    firebaseSync.db.ref('sales').on('value', (snapshot) => {
        if (snapshot.exists()) {
            try {
                const salesObj = snapshot.val();
                
                // Сохраняем как объект с ключами-ID
                localStorage.setItem('sales_firebase', JSON.stringify(salesObj));
                
                // И как массив для совместимости
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                
                // Обновляем глобальную переменную
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

// Глобальный объект для отладки
window.firebaseDebug = {
    isInitialized: false,
    lastError: null,
    syncStatus: 'pending',
    salesStatus: 'unknown'
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
    
    // Запускаем слушатели после инициализации
    setTimeout(() => {
        setupDataListeners();
        
        // Автоматически исправляем конфликты при загрузке
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
        syncStatus: 'unknown',
        salesStatus: 'unknown'
    };
}

// Функция для ручной проверки состояния продаж
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
    
    // 5. Проверяем целостность данных
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

// Автоматическая проверка каждые 10 минут
setInterval(() => {
    if (window.firebaseDebug && window.firebaseDebug.isInitialized) {
        const health = checkSalesHealth();
        
        // Если есть проблемы, пытаемся исправить
        if (health.duplicates > 0 || health.invalid > 0) {
            console.log('🔄 Автоматическое исправление проблем...');
            if (window.dataSync && window.dataSync.fixSalesConflicts) {
                window.dataSync.fixSalesConflicts();
            }
        }
    }
}, 10 * 60 * 1000); // 10 минут

// Глобальная функция для проверки конфликтов
window.checkSalesConflicts = function() {
    return checkSalesHealth();
};

// Глобальная функция для принудительной синхронизации продаж
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