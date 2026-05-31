class PSStoreAPI {
    constructor(serverUrl = 'https://ps-store-api.onrender.com') {
        if (serverUrl) {
            this.serverUrl = serverUrl;
        } else {
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
            
            if (isLocalhost) {
                this.serverUrl = 'http://localhost:3001';
            } else {
                this.serverUrl = 'https://ps-store-api.onrender.com';
            }
        }
        
        console.log(`🌐 API настроен на: ${this.serverUrl}`);
        this.testConnection();
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/test`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                timeout: 5000
            });
            
            if (response.ok) {
                console.log(`✅ Сервер API доступен`);
            } else {
                console.warn(`⚠️ Сервер API недоступен (статус: ${response.status})`);
            }
        } catch (error) {
            console.warn(`⚠️ Не удалось подключиться к API серверу:`, error.message);
            console.log(`ℹ️ Используется демо-режим`);
        }
    }

    async getGameInfo(productId, region = 'TR') {
        console.log(`🎮 Запрос игры ${productId} (${region})`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(
                `${this.serverUrl}/api/game/${productId}/${region}`,
                {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors',
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Данные получены для ${productId}`);
            return data;
            
        } catch (error) {
            console.error(`❌ Ошибка запроса ${productId}:`, error.message);
            return this.getFallbackData(productId, region);
        }
    }
    async getBatchGamesInfo(gamesList) {
        console.log(`🔄 Массовая проверка ${gamesList.length} игр`);
        
        try {
            const response = await fetch(`${this.serverUrl}/api/games/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ games: gamesList }),
                timeout: 30000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Массовая проверка завершена`);
            return data.results;
            
        } catch (error) {
            console.error('❌ Ошибка массовой проверки:', error);
            return gamesList.map(game => ({
                productId: game.productId,
                region: game.region,
                success: false,
                error: error.message,
                data: this.getFallbackData(game.productId, game.region)
            }));
        }
    }

    getFallbackData(productId, region) {
        const discount = Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : 0;
        const basePrice = region === 'TR' ? 
            Math.floor(Math.random() * 300) + 200 : 
            Math.floor(Math.random() * 500) + 300;
        
        const price = discount > 0 ? Math.round(basePrice * (1 - discount/100)) : basePrice;
        
        return {
            name: `Игра ${productId}`,
            price: { 
                amount: price, 
                formatted: `${price} ${region === 'TR' ? '₺' : '₴'}` 
            },
            originalPrice: { 
                amount: basePrice, 
                formatted: `${basePrice} ${region === 'TR' ? '₺' : '₴'}` 
            },
            discount: discount,
            isOnSale: discount > 0,
            isDemo: true,
            note: 'Демо-данные (сервер недоступен)'
        };
    }
}