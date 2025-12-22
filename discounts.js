// discounts.js - НОВАЯ ВЕРСИЯ (реальная проверка цен)
class DiscountsManager {
    constructor() {
        this.api = new PSStoreAPI(); // Будем использовать реальный API
        this.cacheDuration = 30 * 60 * 1000; // 30 минут кэш
    }

    // Основная функция проверки скидок
    async checkDiscounts(forceRefresh = false) {
        const myGames = JSON.parse(localStorage.getItem('games')) || [];
        
        if (myGames.length === 0) {
            showNotification('❌ Нет игр для проверки. Добавьте игры в разделе "Управление играми"', 'error');
            return [];
        }

        const results = [];
        const checkedGames = [];

        // Показываем прогресс
        this.showProgress(0, myGames.length);

        for (let i = 0; i < myGames.length; i++) {
            const game = myGames[i];
            
            // Обновляем прогресс
            this.showProgress(i + 1, myGames.length, game.name);
            
            try {
                const discounts = await this.checkGameDiscounts(game, forceRefresh);
                
                if (discounts.TR || discounts.UA) {
                    results.push({
                        game: game,
                        discounts: discounts,
                        checkedAt: new Date().toISOString()
                    });
                }

                checkedGames.push({
                    game: game.name,
                    hasDiscounts: !!(discounts.TR || discounts.UA),
                    trDiscount: discounts.TR?.discount || 0,
                    uaDiscount: discounts.UA?.discount || 0
                });

                // Задержка между запросами чтобы не спамить сервер
                await this.sleep(500);

            } catch (error) {
                console.error(`Ошибка проверки игры ${game.name}:`, error);
                checkedGames.push({
                    game: game.name,
                    error: error.message
                });
            }
        }

        // Сохраняем результаты
        this.saveResults(results, checkedGames);
        
        // Скрываем прогресс
        this.hideProgress();
        
        return results;
    }

    // Проверка скидок для одной игры
    async checkGameDiscounts(game, forceRefresh = false) {
        const result = { TR: null, UA: null };
        
        // Проверяем кэш
        const cacheKey = `discount_${game.id}`;
        const cached = this.getFromCache(cacheKey);
        
        if (!forceRefresh && cached) {
            console.log(`📦 Используем кэш для ${game.name}`);
            return cached;
        }

        // Проверяем Турцию
        if (game.productIds?.TR) {
            try {
                const trData = await this.api.getGameInfo(game.productIds.TR, 'TR');
                if (trData && (trData.discount > 0 || trData.isOnSale)) {
                    result.TR = this.formatDiscountData(trData, 'TR', game);
                }
            } catch (error) {
                console.error(`Ошибка Турции для ${game.name}:`, error);
            }
        }

        // Проверяем Украину
        if (game.productIds?.UA) {
            try {
                const uaData = await this.api.getGameInfo(game.productIds.UA, 'UA');
                if (uaData && (uaData.discount > 0 || uaData.isOnSale)) {
                    result.UA = this.formatDiscountData(uaData, 'UA', game);
                }
            } catch (error) {
                console.error(`Ошибка Украины для ${game.name}:`, error);
            }
        }

        // Сохраняем в кэш
        if (result.TR || result.UA) {
            this.saveToCache(cacheKey, result);
        }

        return result;
    }

    formatDiscountData(apiData, region, game) {
        return {
            name: apiData.name || game.name,
            discount: apiData.discount || 0,
            oldPrice: apiData.originalPrice || apiData.price,
            newPrice: apiData.price,
            currency: region === 'TR' ? '₺' : '₴',
            region: region,
            image: apiData.image,
            url: apiData.url || game.storeLinks?.[region],
            validUntil: apiData.validUntil,
            checkedAt: new Date().toISOString(),
            isOnSale: apiData.isOnSale || false,
            isNew: (apiData.discount || 0) > 50 // Скидка больше 50% = новая
        };
    }

    // Функции для работы с прогрессом
    showProgress(current, total, currentGame = '') {
        const progressEl = document.getElementById('discountsProgress');
        if (!progressEl) return;

        const percent = Math.round((current / total) * 100);
        progressEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading" style="display: inline-block; width: 40px; height: 40px;"></div>
                <p style="margin-top: 15px; color: #64748b;">
                    Проверяю: <strong>${currentGame}</strong><br>
                    ${current} из ${total} игр (${percent}%)
                </p>
                <div style="width: 300px; height: 8px; background: #e2e8f0; 
                     border-radius: 4px; margin: 15px auto; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; 
                         background: linear-gradient(90deg, #4361ee, #3a56d4); 
                         transition: width 0.3s;"></div>
                </div>
            </div>
        `;
    }

    hideProgress() {
        const progressEl = document.getElementById('discountsProgress');
        if (progressEl) progressEl.innerHTML = '';
    }

    // Кэширование
    getFromCache(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const { data, expiry } = JSON.parse(cached);
            if (Date.now() < expiry) return data;
        } catch (error) {
            console.error('Ошибка чтения кэша:', error);
        }
        return null;
    }

    saveToCache(key, data) {
        try {
            const cacheItem = {
                data: data,
                expiry: Date.now() + this.cacheDuration
            };
            localStorage.setItem(key, JSON.stringify(cacheItem));
        } catch (error) {
            console.error('Ошибка сохранения в кэш:', error);
        }
    }

    saveResults(discountResults, checkHistory) {
        localStorage.setItem('discountsResults', JSON.stringify(discountResults));
        
        // Сохраняем историю
        const history = JSON.parse(localStorage.getItem('discountsHistory')) || [];
        history.unshift({
            date: new Date().toISOString(),
            totalChecked: checkHistory.length,
            foundDiscounts: discountResults.length,
            details: checkHistory
        });
        history.splice(20); // Храним последние 20 проверок
        localStorage.setItem('discountsHistory', JSON.stringify(history));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Получение изображений для игр
    async fetchGameImages() {
        const games = JSON.parse(localStorage.getItem('games')) || [];
        const updatedGames = [...games];

        for (let i = 0; i < updatedGames.length; i++) {
            const game = updatedGames[i];
            
            // Если уже есть изображение, пропускаем
            if (game.imageUrl) continue;
            
            // Пробуем получить изображение из турецкого магазина
            if (game.productIds?.TR) {
                try {
                    const gameData = await this.api.getGameInfo(game.productIds.TR, 'TR');
                    if (gameData && gameData.image) {
                        updatedGames[i].imageUrl = gameData.image;
                        console.log(`✅ Получено изображение для ${game.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Ошибка получения изображения для ${game.name}:`, error);
                }
                
                await this.sleep(300); // Задержка между запросами
            }
        }

        localStorage.setItem('games', JSON.stringify(updatedGames));
        return updatedGames;
    }
}