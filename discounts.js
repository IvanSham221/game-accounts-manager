
class DiscountsManager {
    constructor() {
        console.log('🆕 Создаем DiscountsManager');
        this.api = new PSStoreAPI('https://ps-store-api.onrender.com'); 
        this.cacheDuration = 30 * 60 * 1000;
    }
    async checkDiscounts(forceRefresh = false) {
        console.log('🔍 Начинаем проверку скидок');
        
        try {
            const myGames = JSON.parse(localStorage.getItem('games')) || [];
            console.log(`🎮 Всего игр для проверки: ${myGames.length}`);
            
            if (myGames.length === 0) {
                throw new Error('Нет игр для проверки');
            }
            const gamesToCheck = [];
            
            myGames.forEach(game => {
                if (game.productIds?.TR) {
                    gamesToCheck.push({
                        productId: game.productIds.TR,
                        region: 'TR'
                    });
                }
                
                if (game.productIds?.UA) {
                    gamesToCheck.push({
                        productId: game.productIds.UA,
                        region: 'UA'
                    });
                }
            });

            console.log(`🔄 Проверяем ${gamesToCheck.length} товаров...`);
            this.showProgress(0, gamesToCheck.length);

            const results = [];
            let gamesWithDiscounts = 0;
            if (this.api.getBatchGamesInfo) {
                console.log('🚀 Использую массовую проверку');
                
                const batchResults = await this.api.getBatchGamesInfo(gamesToCheck);
                
                batchResults.forEach((result, index) => {
                    this.showProgress(index + 1, gamesToCheck.length);
                    
                    const game = myGames.find(g => 
                        g.productIds?.TR === result.productId || 
                        g.productIds?.UA === result.productId
                    );
                    
                    if (game && result.data) {
                        const discountData = result.data;
                        
                        if (discountData.discount > 0 || discountData.isOnSale) {
                            const formattedData = this.formatDiscountData(discountData, result.region, game);
                            let gameResult = results.find(r => r.game.id === game.id);
                            if (!gameResult) {
                                gameResult = {
                                    game: game,
                                    discounts: {},
                                    checkedAt: new Date().toISOString()
                                };
                                results.push(gameResult);
                            }
                            
                            gameResult.discounts[result.region] = formattedData;
                            
                            if (discountData.discount > 0) {
                                console.log(`✅ ${game.name} - ${result.region}: -${discountData.discount}%`);
                                gamesWithDiscounts++;
                            }
                        }
                    }
                });
                
            } else {
                for (let i = 0; i < gamesToCheck.length; i++) {
                    const item = gamesToCheck[i];
                    const game = myGames.find(g => 
                        g.productIds?.TR === item.productId || 
                        g.productIds?.UA === item.productId
                    );
                    
                    if (game) {
                        this.showProgress(i + 1, gamesToCheck.length, game.name);
                        
                        try {
                            const discountData = await this.api.getGameInfo(item.productId, item.region);
                            if (discountData && discountData.discount > 0) {
                                const formattedData = this.formatDiscountData(discountData, item.region, game);
                                let gameResult = results.find(r => r.game.id === game.id);
                                if (!gameResult) {
                                    gameResult = {
                                        game: game,
                                        discounts: {},
                                        checkedAt: new Date().toISOString()
                                    };
                                    results.push(gameResult);
                                }
                                
                                gameResult.discounts[item.region] = formattedData;
                                
                                gamesWithDiscounts++;
                                console.log(`✅ ${game.name} - ${item.region}: -${discountData.discount}%`);
                            }
                        } catch (error) {
                            console.error(`Ошибка ${game.name} (${item.region}):`, error);
                        }
                        
                        await this.sleep(500);
                    }
                }
            }
            this.saveResults(results);
            this.hideProgress();
            
            console.log(`📊 Итог: ${gamesWithDiscounts} игр со скидками`);
            
            this.displayDiscounts(results);
            
            return results;

        } catch (error) {
            console.error('❌ Ошибка проверки скидок:', error);
            this.hideProgress();
            const container = document.getElementById('discountsList');
            if (container) {
                container.innerHTML = `
                    <div class="no-discounts">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Ошибка соединения</h3>
                        <p>Сервер скидок временно недоступен</p>
                        <button onclick="location.reload()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Попробовать снова
                        </button>
                    </div>
                `;
            }
            
            throw error;
        }
    }

    async checkGameDiscounts(game, forceRefresh = false) {
        const result = { TR: null, UA: null };

        if (game.productIds?.TR) {
            try {
                console.log(`🇹🇷 Проверяем Турцию для ${game.name}`);
                const trData = await this.api.getGameInfo(game.productIds.TR, 'TR');
                
                if (trData && trData.discount > 0) {
                    result.TR = this.formatDiscountData(trData, 'TR', game);
                } else {
                    console.log(`ℹ️ ${game.name} - Турция: без скидки (${trData?.discount || 0}%)`);
                }
            } catch (error) {
                console.error(`❌ Ошибка Турции для ${game.name}:`, error);
            }
        }

        if (game.productIds?.UA) {
            try {
                console.log(`🇺🇦 Проверяем Украину для ${game.name}`);
                const uaData = await this.api.getGameInfo(game.productIds.UA, 'UA');
                
                if (uaData && uaData.discount > 0) {
                    result.UA = this.formatDiscountData(uaData, 'UA', game);
                } else {
                    console.log(`ℹ️ ${game.name} - Украина: без скидки (${uaData?.discount || 0}%)`);
                }
            } catch (error) {
                console.error(`❌ Ошибка Украины для ${game.name}:`, error);
            }
        }

        return result;
    }

    formatDiscountData(apiData, region, game) {
        return {
            name: apiData.name || game.name,
            discount: apiData.discount || 0,
            price: apiData.price || { amount: 0, formatted: 'Цена не найдена' },
            oldPrice: apiData.originalPrice || apiData.price,
            currency: region === 'TR' ? '₺' : '₴',
            region: region,
            image: apiData.image || game.imageUrl,
            isOnSale: apiData.isOnSale || false,
            url: apiData.url || game.storeLinks?.[region],
            isDemo: apiData.isDemo || false
        };
    }

    showProgress(current, total, currentGame = '') {
        const progressEl = document.getElementById('discountsProgress');
        if (!progressEl) return;

        const percent = Math.round((current / total) * 100);
        progressEl.innerHTML = `
            <div style="text-align: center;">
                <div class="loading" style="display: inline-block; width: 40px; height: 40px;"></div>
                <p style="margin-top: 15px; color: #64748b;">
                    Проверяю: <strong>${currentGame}</strong><br>
                    ${current} из ${total} товаров (${percent}%)
                </p>
            </div>
        `;
        progressEl.style.display = 'block';
    }

    hideProgress() {
        const progressEl = document.getElementById('discountsProgress');
        if (progressEl) progressEl.style.display = 'none';
    }

    saveResults(results) {
        localStorage.setItem('discountsResults', JSON.stringify(results));
        localStorage.setItem('lastDiscountCheck', new Date().toISOString());
    }

    displayDiscounts(results) {
        const container = document.getElementById('discountsList');
        if (!container) return;

        const gamesWithDiscounts = results.filter(item => {
            const discounts = item.discounts || {};
            return (discounts.TR && discounts.TR.discount > 0) || 
                   (discounts.UA && discounts.UA.discount > 0);
        });

        if (gamesWithDiscounts.length === 0) {
            container.innerHTML = `
                <div class="no-discounts">
                    <i class="fas fa-search"></i>
                    <h3>Скидок не найдено</h3>
                    <p>На ваши игры сейчас нет скидок</p>
                    <button onclick="updateDiscounts(true)" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Проверить снова
                    </button>
                </div>
            `;
            return;
        }
        const sortedGames = gamesWithDiscounts.sort((a, b) => {
            const aDiscount = Math.max(
                a.discounts?.TR?.discount || 0,
                a.discounts?.UA?.discount || 0
            );
            const bDiscount = Math.max(
                b.discounts?.TR?.discount || 0,
                b.discounts?.UA?.discount || 0
            );
            return bDiscount - aDiscount;
        });
        container.innerHTML = sortedGames.map(item => {
            const game = item.game || {};
            const discounts = item.discounts || {};
            
            const trData = discounts.TR || {};
            const uaData = discounts.UA || {};
            
            const hasTR = trData.discount > 0;
            const hasUA = uaData.discount > 0;
            
            const maxDiscount = Math.max(trData.discount || 0, uaData.discount || 0);
            
            return `
                <div class="discount-card ${maxDiscount >= 70 ? 'high-discount' : ''}">
                    <div style="padding: 20px;">
                        <div style="display: flex; align-items: center; margin-bottom: 20px;">
                            ${game.imageUrl ? `
                                <img src="${game.imageUrl}" class="game-image" 
                                     style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                            ` : `
                                <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%); 
                                     border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                                     color: white; font-size: 2em; margin-right: 15px;">
                                    ${maxDiscount >= 70 ? '🔥' : '🎮'}
                                </div>
                            `}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <h3 style="margin: 0 0 5px 0; color: #1e293b;">${game.name}</h3>
                                    ${maxDiscount >= 50 ? `
                                        <div style="background: #ef4444; color: white; padding: 4px 12px; 
                                             border-radius: 20px; font-weight: 800; font-size: 1.1em;">
                                            🔥 -${maxDiscount}%
                                        </div>
                                    ` : ''}
                                </div>
                                <div style="color: #64748b; font-size: 0.9em;">
                                    Обновлено: ${new Date(item.checkedAt).toLocaleTimeString('ru-RU')}
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            ${hasTR ? `
                                <div style="background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                        <span class="region-badge region-tr">🇹🇷 Турция</span>
                                        <div class="discount-percent">-${trData.discount}%</div>
                                    </div>
                                    <div>
                                        ${trData.oldPrice?.amount > trData.price.amount ? `
                                            <div class="price-old">${trData.oldPrice.formatted}</div>
                                        ` : ''}
                                        <div class="price-new">${trData.price.formatted}</div>
                                    </div>
                                    ${trData.discount >= 60 ? `
                                        <div style="margin-top: 10px; padding: 5px 10px; background: #fecaca; 
                                             border-radius: 6px; font-size: 0.85em; color: #991b1b;">
                                            <i class="fas fa-bolt"></i> Выгодно!
                                        </div>
                                    ` : ''}
                                    ${trData.isDemo ? `
                                        <div style="margin-top: 10px; padding: 5px 10px; background: #fef3c7; 
                                             border-radius: 6px; font-size: 0.85em; color: #92400e;">
                                            <i class="fas fa-exclamation-triangle"></i> Демо-данные
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            ${hasUA ? `
                                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                        <span class="region-badge region-ua">🇺🇦 Украина</span>
                                        <div class="discount-percent">-${uaData.discount}%</div>
                                    </div>
                                    <div>
                                        ${uaData.oldPrice?.amount > uaData.price.amount ? `
                                            <div class="price-old">${uaData.oldPrice.formatted}</div>
                                        ` : ''}
                                        <div class="price-new">${uaData.price.formatted}</div>
                                    </div>
                                    ${uaData.discount >= 60 ? `
                                        <div style="margin-top: 10px; padding: 5px 10px; background: #bfdbfe; 
                                             border-radius: 6px; font-size: 0.85em; color: #1e40af;">
                                            <i class="fas fa-bolt"></i> Выгодно!
                                        </div>
                                    ` : ''}
                                    ${uaData.isDemo ? `
                                        <div style="margin-top: 10px; padding: 5px 10px; background: #fef3c7; 
                                             border-radius: 6px; font-size: 0.85em; color: #92400e;">
                                            <i class="fas fa-exclamation-triangle"></i> Демо-данные
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            ${trData.url && hasTR ? `
                                <a href="${trData.url}" target="_blank" style="flex: 1; text-decoration: none;">
                                    <button class="btn btn-small" style="width: 100%; background: #dc2626; color: white;">
                                        <i class="fas fa-external-link-alt"></i> Купить в Турции
                                    </button>
                                </a>
                            ` : ''}
                            
                            ${uaData.url && hasUA ? `
                                <a href="${uaData.url}" target="_blank" style="flex: 1; text-decoration: none;">
                                    <button class="btn btn-small" style="width: 100%; background: #2563eb; color: white;">
                                        <i class="fas fa-external-link-alt"></i> Купить в Украине
                                    </button>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function updateDiscounts(force = false) {
    try {
        console.log('🔄 Запуск проверки скидок');
        
        const loadingEl = document.getElementById('discountsLoading');
        const discountsList = document.getElementById('discountsList');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (discountsList) discountsList.innerHTML = '';
        
        if (!window.discountsManager) {
            window.discountsManager = new DiscountsManager();
        }
        
        const results = await window.discountsManager.checkDiscounts(force);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (results && results.length > 0) {
            localStorage.setItem('discountsResults', JSON.stringify(results));
            showNotification(`✅ Найдено скидок: ${results.length}`);
        } else {
            showNotification('ℹ️ Скидки не найдены');
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки:', error);
        
        const discountsList = document.getElementById('discountsList');
        if (discountsList) {
            discountsList.innerHTML = `
                <div class="no-discounts">
                    <i class="fas fa-bug"></i>
                    <h3>Ошибка проверки</h3>
                    <p>${error.message || 'Неизвестная ошибка'}</p>
                    <button onclick="location.reload()" class="btn btn-danger">
                        <i class="fas fa-redo"></i> Перезагрузить
                    </button>
                </div>
            `;
        }
        
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

function showNotification(message, type = 'info') {
    alert(type === 'error' ? '❌ ' + message : '✅ ' + message);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Страница скидок загружена');

    const myGames = JSON.parse(localStorage.getItem('games')) || [];
    console.log(`📂 Игр в базе: ${myGames.length}`);
    
    const loadingEl = document.getElementById('discountsLoading');
    const noGamesAlert = document.getElementById('noGamesAlert');
    
    if (myGames.length === 0) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (noGamesAlert) noGamesAlert.style.display = 'block';
        return;
    }

    if (loadingEl) loadingEl.style.display = 'none';
    
    window.discountsManager = new DiscountsManager();
    
    const cachedDiscounts = JSON.parse(localStorage.getItem('discountsResults')) || [];
    const lastCheck = localStorage.getItem('lastDiscountCheck');
    
    if (cachedDiscounts.length > 0 && lastCheck) {
        const lastCheckDate = new Date(lastCheck);
        const now = new Date();
        const diffHours = (now - lastCheckDate) / (1000 * 60 * 60);
        if (diffHours < 1) {
            console.log('📦 Использую кэшированные данные');
            window.discountsManager.displayDiscounts(cachedDiscounts);
            return;
        }
    }
    console.log('🔄 Кэш устарел или отсутствует, проверяем скидки...');
    updateDiscounts();
});