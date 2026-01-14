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
        try {
            const dataObj = {};
            
            if (Array.isArray(data)) {
                // Если массив, преобразуем в объект с ключами по id
                data.forEach(item => {
                    if (item.id) {
                        dataObj[item.id] = item;
                    } else if (item.username) { // для работников
                        dataObj[item.username] = item;
                    } else {
                        // Генерируем ключ если нет id
                        const key = Date.now() + Math.random();
                        dataObj[key] = item;
                    }
                });
            } else if (typeof data === 'object') {
                // Если объект, используем как есть
                Object.assign(dataObj, data);
            }
            
            // Сохраняем в Firebase
            await this.db.ref(dataType).set(dataObj);
            
            // Также сохраняем локально
            localStorage.setItem(dataType, JSON.stringify(data));
            
            console.log(`✅ Данные "${dataType}" сохранены в Firebase`);
            return { success: true, synced: true };
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения "${dataType}" в Firebase:`, error);
            
            // Сохраняем локально как запасной вариант
            localStorage.setItem(dataType, JSON.stringify(data));
            
            return { success: true, local: true, error: error.message };
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

// Запускаем слушатели после инициализации
if (firebaseSync) {
    setTimeout(setupDataListeners, 1000);
}