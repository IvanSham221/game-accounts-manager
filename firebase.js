// firebase.js - ТОЛЬКО ДЛЯ ХРАНЕНИЯ ДАННЫХ (без авторизации)

const firebaseConfig = {
  apiKey: "AIzaSyCYTyHQ6B6WovINxyI1R8Qnn7JXS8WnnE8",
  authDomain: "crm-pshub.firebaseapp.com",
  databaseURL: "https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "crm-pshub",
  storageBucket: "crm-pshub.firebasestorage.app",
  messagingSenderId: "720773477998",
  appId: "1:720773477998:web:3d3c61747c42833f7f987f"
};

// Firebase только для данных, авторизация локальная
class DataSync {
    constructor() {
        this.userId = null;
        this.init();
    }
    
    init() {
        // Получаем ID пользователя из localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            this.userId = currentUser.username; // Используем логин как ID
        }
        
        console.log('📡 Firebase синхронизация инициализирована');
    }
    
    // Сохранить данные
    async saveData(dataType, data) {
        try {
            // Сначала сохраняем локально
            localStorage.setItem(dataType, JSON.stringify(data));
            
            // Потом пытаемся сохранить в Firebase (если есть userId)
            if (this.userId && window.firebase) {
                // Используем window.firebase для обратной совместимости
                const database = window.firebase.database();
                await database.ref(`users/${this.userId}/${dataType}`).set(data);
                console.log(`✅ ${dataType} сохранены в Firebase`);
                return { success: true, synced: true };
            }
            
            return { success: true, local: true };
        } catch (error) {
            console.error(`❌ Ошибка сохранения ${dataType}:`, error);
            // Все равно сохраняем локально
            localStorage.setItem(dataType, JSON.stringify(data));
            return { success: true, local: true };
        }
    }
    
    // Загрузить данные
    async loadData(dataType) {
        try {
            // Сначала пробуем Firebase
            if (this.userId && window.firebase) {
                const database = window.firebase.database();
                const snapshot = await database.ref(`users/${this.userId}/${dataType}`).once('value');
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    localStorage.setItem(dataType, JSON.stringify(data));
                    console.log(`✅ ${dataType} загружены из Firebase`);
                    return data;
                }
            }
            
            // Если нет в Firebase, берем локальные
            const localData = localStorage.getItem(dataType);
            return localData ? JSON.parse(localData) : [];
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки ${dataType}:`, error);
            const localData = localStorage.getItem(dataType);
            return localData ? JSON.parse(localData) : [];
        }
    }
    
    // Загрузить всех работников
    async loadWorkers() {
        try {
            if (window.firebase) {
                const database = window.firebase.database();
                const snapshot = await database.ref('workers').once('value');
                
                if (snapshot.exists()) {
                    const workers = snapshot.val();
                    localStorage.setItem('workers', JSON.stringify(workers));
                    return workers;
                }
            }
            
            const localWorkers = localStorage.getItem('workers');
            return localWorkers ? JSON.parse(localWorkers) : [];
            
        } catch (error) {
            console.error('❌ Ошибка загрузки работников:', error);
            const localWorkers = localStorage.getItem('workers');
            return localWorkers ? JSON.parse(localWorkers) : [];
        }
    }
    
    // Сохранить работников
    async saveWorkers(workers) {
        try {
            // Локально
            localStorage.setItem('workers', JSON.stringify(workers));
            
            // В Firebase
            if (window.firebase) {
                const database = window.firebase.database();
                await database.ref('workers').set(workers);
                console.log('✅ Работники сохранены в Firebase');
                return { success: true, synced: true };
            }
            
            return { success: true, local: true };
        } catch (error) {
            console.error('❌ Ошибка сохранения работников:', error);
            localStorage.setItem('workers', JSON.stringify(workers));
            return { success: true, local: true };
        }
    }
}

// Создаем экземпляр
const dataSync = new DataSync();
window.dataSync = dataSync;