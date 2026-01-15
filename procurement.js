// procurement.js - логика для страницы закупа

let gamesStats = [];
let criticalThreshold = 2; // Порог критичности (меньше этого числа - критично)

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    if (!security || !security.isSessionValid()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Обновляем навигацию
    updateNavigation();
    
    // Инициализируем мобильное меню
    initMobileMenu();
    
    // Загружаем данные и обновляем статистику
    loadAllDataWithSync().then(() => {
        calculateProcurementStats();
        displayCriticalPositions();
        displayProcurementRecommendations();
        displayGamesStats();
    });
});

// Расчет статистики для закупа
function calculateProcurementStats() {
    gamesStats = [];
    
    // Для каждой игры считаем статистику
    games.forEach(game => {
        const gameAccounts = accounts.filter(acc => acc.gameId === game.id);
        
        if (gameAccounts.length === 0) return;
        
        let stats = {
            gameId: game.id,
            gameName: game.name,
            totalAccounts: gameAccounts.length,
            totalPositions: 0,
            freePositions: 0,
            soldPositions: 0,
            criticalPositions: 0,
            positionsByType: {
                p2_ps4: { total: 0, free: 0, sold: 0, demandScore: 0 },
                p3_ps4: { total: 0, free: 0, sold: 0, demandScore: 0 },
                p2_ps5: { total: 0, free: 0, sold: 0, demandScore: 0 },
                p3_ps5: { total: 0, free: 0, sold: 0, demandScore: 0 }
            },
            purchaseAmount: 0,
            revenue: 0,
            // Новые метрики
            salesLast30Days: 0,
            salesLast7Days: 0,
            salesVelocity: 0, // Скорость продаж (продаж/день)
            turnoverRate: 0,  // Оборачиваемость
            riskScore: 0,     // Общий риск
            priority: 'low'   // Приоритет закупа
        };
        
        // Получаем продажи за последние 30 и 7 дней
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        
        // Считаем позиции и продажи
        gameAccounts.forEach(account => {
            stats.purchaseAmount += account.purchaseAmount || 0;
            
            ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
                const count = account.positions[posType] || 0;
                stats.positionsByType[posType].total += count;
                stats.totalPositions += count;
                
                for (let i = 1; i <= count; i++) {
                    const saleInfo = getPositionSaleInfo(account.id, posType, i);
                    if (saleInfo) {
                        stats.positionsByType[posType].sold++;
                        stats.soldPositions++;
                        stats.revenue += saleInfo.price || 0;
                        
                        // Считаем продажи за последние периоды
                        const saleDate = new Date(saleInfo.timestamp || saleInfo.datetime);
                        if (saleDate >= thirtyDaysAgo) {
                            stats.salesLast30Days++;
                            if (saleDate >= sevenDaysAgo) {
                                stats.salesLast7Days++;
                            }
                        }
                    } else {
                        stats.positionsByType[posType].free++;
                        stats.freePositions++;
                    }
                }
            });
        });
        
        // Рассчитываем "скорость продаж" и "спрос" для каждой позиции
        Object.keys(stats.positionsByType).forEach(posType => {
            const position = stats.positionsByType[posType];
            if (position.total > 0) {
                // Оборачиваемость позиции (сколько % продано за всё время)
                const turnover = (position.sold / position.total) * 100;
                
                // Расчет спроса на позицию:
                // 1. Чем выше оборачиваемость - тем выше спрос (вес 40%)
                // 2. Чем меньше свободных позиций - тем выше спрос (вес 30%)
                // 3. Если позиции закончились - максимальный спрос (вес 30%)
                let demandScore = 0;
                
                // Фактор оборачиваемости
                demandScore += Math.min(40, turnover * 0.4);
                
                // Фактор доступности
                const availability = (position.free / position.total) * 100;
                demandScore += Math.min(30, (100 - availability) * 0.3);
                
                // Фактор критичности
                if (position.free === 0) demandScore += 30;
                else if (position.free <= criticalThreshold) demandScore += 20;
                
                position.demandScore = Math.min(100, demandScore);
                
                // Определяем критические позиции с учетом спроса
                if (position.free <= criticalThreshold && position.total > 0) {
                    // Если позиция популярная (спрос > 50%) и закончилась - это высокий риск
                    if (position.demandScore > 50) {
                        stats.criticalPositions++;
                    }
                }
            }
        });
        
        // Рассчитываем общую скорость продаж игры
        if (stats.soldPositions > 0) {
            // Предполагаем, что первая продажа была давно
            const daysSinceFirstSale = 90; // 90 дней по умолчанию
            stats.salesVelocity = stats.soldPositions / daysSinceFirstSale;
            
            // Более точная скорость за последние 30 дней
            const recentSalesVelocity = stats.salesLast30Days / 30;
            
            // Комбинируем долгосрочную и краткосрочную скорость
            stats.salesVelocity = (stats.salesVelocity * 0.3 + recentSalesVelocity * 0.7) * 1.5; // Коэффициент
        }
        
        // Рассчитываем оборачиваемость запасов
        stats.turnoverRate = stats.totalPositions > 0 ? 
            (stats.soldPositions / stats.totalPositions) * 100 : 0;
        
        // Рассчитываем риск-скор для игры
        stats.riskScore = calculateGameRiskScore(stats);
        
        // Определяем приоритет закупа
        stats.priority = determineProcurementPriority(stats);
        
        gamesStats.push(stats);
    });
    
    console.log('📊 Рассчитана статистика для', gamesStats.length, 'игр');
}

// Расчет риска для игры
function calculateGameRiskScore(stats) {
    let riskScore = 0;
    
    // 1. Риск из-за критических позиций (макс 40 баллов)
    const criticalPercentage = stats.criticalPositions / Object.keys(stats.positionsByType).length * 100;
    riskScore += Math.min(40, criticalPercentage * 0.4);
    
    // 2. Риск из-за скорости продаж (макс 30 баллов)
    // Если скорость продаж высокая, но запасов мало - высокий риск
    if (stats.salesVelocity > 0.1) { // > 0.1 продаж в день
        const freePercentage = stats.freePositions / stats.totalPositions * 100;
        riskScore += Math.min(30, (100 - freePercentage) * stats.salesVelocity * 3);
    }
    
    // 3. Риск из-за популярности позиций (макс 20 баллов)
    const totalDemand = Object.values(stats.positionsByType)
        .reduce((sum, pos) => sum + pos.demandScore, 0);
    const avgDemand = totalDemand / Object.keys(stats.positionsByType).length;
    riskScore += Math.min(20, avgDemand * 0.2);
    
    // 4. Риск из-за полного истощения (макс 10 баллов)
    const exhaustedPositions = Object.values(stats.positionsByType)
        .filter(pos => pos.free === 0 && pos.total > 0).length;
    riskScore += Math.min(10, exhaustedPositions * 5);
    
    return Math.min(100, Math.round(riskScore));
}

function determineProcurementPriority(stats) {
    if (stats.riskScore >= 80) return 'critical';
    if (stats.riskScore >= 60) return 'high';
    if (stats.riskScore >= 40) return 'medium';
    return 'low';
}

// Отображение критических позиций
function displayCriticalPositions() {
    const criticalContainer = document.getElementById('criticalPositions');
    const criticalList = document.getElementById('criticalList');
    
    if (!criticalContainer || !criticalList) return;
    
    // Находим все критические позиции с учетом риска
    let totalCritical = 0;
    let criticalGames = [];
    
    gamesStats.forEach(stats => {
        // Считаем только критические позиции с высоким спросом
        let gameCriticalPositions = 0;
        const criticalPositionsList = [];
        
        ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
            const position = stats.positionsByType[posType];
            
            // Если позиций нет или они не в дефиците - пропускаем
            if (position.total === 0) return;
            
            // Критичная позиция = мало осталось И высокий спрос
            if (position.free <= criticalThreshold && position.demandScore > 40) {
                gameCriticalPositions++;
                criticalPositionsList.push({
                    type: posType,
                    free: position.free,
                    total: position.total,
                    sold: position.sold,
                    demandScore: position.demandScore,
                    isExhausted: position.free === 0
                });
            }
        });
        
        if (gameCriticalPositions > 0) {
            totalCritical += gameCriticalPositions;
            criticalGames.push({
                ...stats,
                criticalPositions: gameCriticalPositions,
                criticalPositionsList: criticalPositionsList.sort((a, b) => b.demandScore - a.demandScore)
            });
        }
    });
    
    // Сортируем игры по риску и приоритету
    criticalGames.sort((a, b) => {
        // Сначала по приоритету
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Затем по риску
        return b.riskScore - a.riskScore;
    });
    
    // Общая статистика
    criticalContainer.innerHTML = `
        <div class="stat-card small critical">
            <div class="stat-value">${totalCritical}</div>
            <div class="stat-label">Критических позиций</div>
            <div class="stat-sub">с учетом спроса</div>
        </div>
        
        <div class="stat-card small warning">
            <div class="stat-value">${criticalGames.length}</div>
            <div class="stat-label">Игр в приоритете</div>
            <div class="stat-sub">по риску и спросу</div>
        </div>
        
        <div class="stat-card small">
            <div class="stat-value">${criticalThreshold}</div>
            <div class="stat-label">Порог + спрос</div>
            <div class="stat-sub">>40% спрос</div>
        </div>
    `;
    
    // Список критических позиций
    if (criticalGames.length === 0) {
        criticalList.innerHTML = `
            <div class="empty">
                <div style="font-size: 3em; margin-bottom: 15px;">✅</div>
                <h3>Нет критических позиций</h3>
                <p>Все позиции в достаточном количестве</p>
            </div>
        `;
        return;
    }
    
    criticalList.innerHTML = `
        <div class="critical-games-list">
            ${criticalGames.map(game => {
                // Группируем позиции
                const ps4Positions = game.criticalPositionsList.filter(p => p.type.includes('ps4'));
                const ps5Positions = game.criticalPositionsList.filter(p => p.type.includes('ps5'));
                
                // Цвет приоритета
                const priorityColors = {
                    'critical': '#dc2626',
                    'high': '#ea580c',
                    'medium': '#d97706',
                    'low': '#65a30d'
                };
                
                return `
                <div class="critical-game-card" onclick="showGameProcurementDetails(${game.gameId})" 
                     style="border-left: 4px solid ${priorityColors[game.priority] || '#dc2626'}">
                    <div class="critical-game-header">
                        <div>
                            <h3>${game.gameName}</h3>
                            <div class="game-meta">
                                <span title="Скорость продаж">📈 ${game.salesVelocity.toFixed(2)}/день</span>
                                <span title="Оборачиваемость">🔄 ${Math.round(game.turnoverRate)}%</span>
                                <span title="Риск">⚠️ ${game.riskScore}%</span>
                            </div>
                        </div>
                        <div class="game-priority">
                            <span class="priority-badge ${game.priority}" style="background: ${priorityColors[game.priority]}">
                                ${game.priority === 'critical' ? '🔥 КРИТИЧЕСКИ' : 
                                  game.priority === 'high' ? '🚨 ВЫСОКИЙ' :
                                  game.priority === 'medium' ? '⚠️ СРЕДНИЙ' : '📊 НИЗКИЙ'}
                            </span>
                            <span class="critical-count">${game.criticalPositions} позиц.</span>
                        </div>
                    </div>
                    
                    <div class="critical-positions">
                        ${ps4Positions.length > 0 ? `
                            <div class="platform-section">
                                <div class="platform-label">
                                    <span class="platform-badge ps4">PS4</span>
                                </div>
                                ${ps4Positions.map(pos => `
                                    <div class="critical-position ps4 ${pos.isExhausted ? 'exhausted' : ''}">
                                        <div class="position-info">
                                            <span class="position-name">${getPositionName(pos.type)}</span>
                                            <span class="demand-score" title="Уровень спроса">
                                                ${Math.round(pos.demandScore)}% спрос
                                            </span>
                                        </div>
                                        <div class="position-stats">
                                            <span class="free-count ${pos.isExhausted ? 'exhausted' : ''}">
                                                ${pos.isExhausted ? '🛑 ЗАКОНЧИЛИСЬ' : `${pos.free} свободно`}
                                            </span>
                                            <span class="total-count">из ${pos.total}</span>
                                            <span class="sales-count">продано: ${pos.sold}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        ${ps5Positions.length > 0 ? `
                            <div class="platform-section">
                                <div class="platform-label">
                                    <span class="platform-badge ps5">PS5</span>
                                </div>
                                ${ps5Positions.map(pos => `
                                    <div class="critical-position ps5 ${pos.isExhausted ? 'exhausted' : ''}">
                                        <div class="position-info">
                                            <span class="position-name">${getPositionName(pos.type)}</span>
                                            <span class="demand-score" title="Уровень спроса">
                                                ${Math.round(pos.demandScore)}% спрос
                                            </span>
                                        </div>
                                        <div class="position-stats">
                                            <span class="free-count ${pos.isExhausted ? 'exhausted' : ''}">
                                                ${pos.isExhausted ? '🛑 ЗАКОНЧИЛИСЬ' : `${pos.free} свободно`}
                                            </span>
                                            <span class="total-count">из ${pos.total}</span>
                                            <span class="sales-count">продано: ${pos.sold}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="risk-analysis">
                        <div class="risk-bar">
                            <div class="risk-fill" style="width: ${game.riskScore}%"></div>
                        </div>
                        <div class="risk-labels">
                            <span>Низкий риск</span>
                            <span>Уровень риска: ${game.riskScore}%</span>
                            <span>Высокий риск</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div class="critical-summary">
            <div class="summary-stats">
                <span><strong>${criticalGames.filter(g => g.priority === 'critical').length}</strong> критических</span>
                <span><strong>${criticalGames.filter(g => g.priority === 'high').length}</strong> высокого приоритета</span>
                <span><strong>${criticalGames.filter(g => g.priority === 'medium').length}</strong> среднего</span>
            </div>
            <div class="priority-legend">
                <span class="legend-item critical">🔥 Критический</span>
                <span class="legend-item high">🚨 Высокий</span>
                <span class="legend-item medium">⚠️ Средний</span>
                <span class="legend-item low">📊 Низкий</span>
            </div>
        </div>
    `;
}
// Отображение рекомендаций по закупу
function displayProcurementRecommendations() {
    const container = document.getElementById('procurementRecommendations');
    if (!container) return;
    
    // Рекомендации по каждой игре
    const recommendations = gamesStats.map(stats => {
        const rec = {
            gameId: stats.gameId,
            gameName: stats.gameName,
            recommendations: []
        };
        
        // Для каждого типа позиций проверяем, нужно ли докупать
        Object.keys(stats.positionsByType).forEach(posType => {
            const position = stats.positionsByType[posType];
            
            // Если позиций вообще нет в игре - НЕ рекомендуем их добавлять
            // (возможно, их просто не существует для этой игры)
            if (position.total === 0) {
                return; // Пропускаем, не рекомендуем
            }
            
            if (position.free <= criticalThreshold) {
                // Если позиций мало - рекомендуем докупить
                const need = Math.max(3, position.total * 0.5); // Докупить 50% или минимум 3
                rec.recommendations.push({
                    type: posType,
                    action: 'restock',
                    quantity: Math.ceil(need - position.free),
                    reason: `Осталось мало (${position.free} из ${position.total})`
                });
            } else if (position.sold / position.total > 0.7) {
                // Если продано больше 70% - рекомендовать докупить для поддержания запаса
                rec.recommendations.push({
                    type: posType,
                    action: 'maintain',
                    quantity: Math.ceil(position.total * 0.3),
                    reason: `Продано ${Math.round((position.sold / position.total) * 100)}%`
                });
            }
        });
        
        return rec;
    }).filter(rec => rec.recommendations.length > 0);
    
    if (recommendations.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-thumbs-up fa-3x"></i>
                <h3>Все в порядке!</h3>
                <p>Рекомендации по закупу не требуются</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="recommendations-grid">
            ${recommendations.map(rec => `
                <div class="recommendation-card">
                    <div class="recommendation-header">
                        <h3>${rec.gameName}</h3>
                        <span class="recommendations-count">${rec.recommendations.length} реком.</span>
                    </div>
                    
                    <div class="recommendation-list">
                        ${rec.recommendations.map(recItem => `
                            <div class="recommendation-item ${recItem.action}">
                                <div class="recommendation-type">
                                    <i class="fas fa-${getRecommendationIcon(recItem.action)}"></i>
                                    ${getPositionName(recItem.type)}
                                </div>
                                <div class="recommendation-details">
                                    <span class="recommendation-quantity">${recItem.quantity} шт.</span>
                                    <span class="recommendation-reason">${recItem.reason}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Отображение статистики по играм
function displayGamesStats() {
    const container = document.getElementById('gamesStats');
    if (!container) return;
    
    if (gamesStats.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-gamepad fa-3x"></i>
                <h3>Нет данных по играм</h3>
                <p>Добавьте игры и аккаунты для отображения статистики</p>
            </div>
        `;
        return;
    }
    
    // Сортируем по умолчанию по названию
    const sortedStats = [...gamesStats].sort((a, b) => a.gameName.localeCompare(b.gameName));
    
    container.innerHTML = `
        <div class="games-stats-table">
            <table>
                <thead>
                    <tr>
                        <th>Игра</th>
                        <th>Аккаунты</th>
                        <th>Позиции</th>
                        <th>Свободно</th>
                        <th>Продано</th>
                        <th>Критич.</th>
                        <th>Прибыль</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedStats.map(stats => `
                        <tr class="${stats.criticalPositions > 0 ? 'critical-row' : ''}">
                            <td>
                                <strong>${stats.gameName}</strong>
                                ${stats.criticalPositions > 0 ? 
                                    '<span class="critical-badge"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                            </td>
                            <td>${stats.totalAccounts}</td>
                            <td>${stats.totalPositions}</td>
                            <td>
                                <span class="free-positions">${stats.freePositions}</span>
                                <span class="percentage">(${Math.round((stats.freePositions / stats.totalPositions) * 100)}%)</span>
                            </td>
                            <td>
                                <span class="sold-positions">${stats.soldPositions}</span>
                                <span class="percentage">(${stats.soldPercentage}%)</span>
                            </td>
                            <td>
                                <span class="critical-count ${stats.criticalPositions > 0 ? 'highlight' : ''}">
                                    ${stats.criticalPositions}
                                </span>
                            </td>
                            <td>
                                <span class="profit ${stats.profit >= 0 ? 'positive' : 'negative'}">
                                    ${stats.profit.toLocaleString('ru-RU')} ₽
                                </span>
                            </td>
                            <td>
                                <button onclick="showGameProcurementDetails(${stats.gameId})" 
                                        class="btn btn-small btn-primary">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                                <button onclick="addAccountsForGame(${stats.gameId})" 
                                        class="btn btn-small btn-success">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="stats-summary">
            <div class="summary-item">
                <span>Всего игр:</span>
                <strong>${gamesStats.length}</strong>
            </div>
            <div class="summary-item">
                <span>Всего позиций:</span>
                <strong>${gamesStats.reduce((sum, s) => sum + s.totalPositions, 0)}</strong>
            </div>
            <div class="summary-item">
                <span>Свободно:</span>
                <strong>${gamesStats.reduce((sum, s) => sum + s.freePositions, 0)}</strong>
            </div>
            <div class="summary-item">
                <span>Критических:</span>
                <strong class="critical">${gamesStats.reduce((sum, s) => sum + s.criticalPositions, 0)}</strong>
            </div>
        </div>
    `;
}

// Фильтрация и сортировка статистики
function filterGamesStats() {
    const searchTerm = document.getElementById('gameSearch').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;
    
    let filtered = gamesStats;
    
    // Фильтрация по поиску
    if (searchTerm) {
        filtered = filtered.filter(stats => 
            stats.gameName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Сортировка
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.gameName.localeCompare(b.gameName);
            case 'free':
                return b.freePositions - a.freePositions;
            case 'sold':
                return b.soldPercentage - a.soldPercentage;
            case 'critical':
                return b.criticalPositions - a.criticalPositions;
            default:
                return 0;
        }
    });
    
    // Обновляем отображение
    updateGamesStatsDisplay(filtered);
}

function updateGamesStatsDisplay(filteredStats) {
    const container = document.getElementById('gamesStats');
    if (!container) return;
    
    // Находим таблицу и обновляем только тело таблицы
    const tbody = container.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = filteredStats.map(stats => `
            <tr class="${stats.criticalPositions > 0 ? 'critical-row' : ''}">
                <td>
                    <strong>${stats.gameName}</strong>
                    ${stats.criticalPositions > 0 ? 
                        '<span class="critical-badge"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                </td>
                <td>${stats.totalAccounts}</td>
                <td>${stats.totalPositions}</td>
                <td>
                    <span class="free-positions">${stats.freePositions}</span>
                    <span class="percentage">(${Math.round((stats.freePositions / stats.totalPositions) * 100)}%)</span>
                </td>
                <td>
                    <span class="sold-positions">${stats.soldPositions}</span>
                    <span class="percentage">(${stats.soldPercentage}%)</span>
                </td>
                <td>
                    <span class="critical-count ${stats.criticalPositions > 0 ? 'highlight' : ''}">
                        ${stats.criticalPositions}
                    </span>
                </td>
                <td>
                    <span class="profit ${stats.profit >= 0 ? 'positive' : 'negative'}">
                        ${stats.profit.toLocaleString('ru-RU')} ₽
                    </span>
                </td>
                <td>
                    <button onclick="showGameProcurementDetails(${stats.gameId})" 
                            class="btn btn-small btn-primary">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button onclick="addAccountsForGame(${stats.gameId})" 
                            class="btn btn-small btn-success">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Показать детали по игре
// Показать детали по игре
function showGameProcurementDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    const stats = gamesStats.find(s => s.gameId === gameId);
    
    if (!game || !stats) return;
    
    const modalContent = document.getElementById('gameDetailsContent');
    
    // Проверяем, есть ли вообще PS4 позиции
    const hasPS4Positions = stats.positionsByType.p2_ps4.total > 0 || stats.positionsByType.p3_ps4.total > 0;
    const hasPS5Positions = stats.positionsByType.p2_ps5.total > 0 || stats.positionsByType.p3_ps5.total > 0;
    
    modalContent.innerHTML = `
        <h2>📊 Статистика: ${game.name}</h2>
        
        <div class="game-stats-overview">
            <div class="stat-card">
                <div class="stat-value">${stats.totalAccounts}</div>
                <div class="stat-label">Аккаунтов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalPositions}</div>
                <div class="stat-label">Всего позиций</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.freePositions}</div>
                <div class="stat-label">Свободно</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.criticalPositions}</div>
                <div class="stat-label">Критических</div>
            </div>
        </div>
        
        <h3>📈 Детализация по позициям</h3>
        <div class="positions-details">
            ${hasPS4Positions ? `
                <div class="platform-section">
                    <h4 style="color: #4361ee; margin-bottom: 10px;">
                        <i class="fab fa-playstation"></i> PS4 Позиции
                    </h4>
                    ${Object.keys(stats.positionsByType)
                        .filter(posType => posType.includes('ps4') && stats.positionsByType[posType].total > 0)
                        .map(posType => {
                            const pos = stats.positionsByType[posType];
                            const isCritical = pos.free <= criticalThreshold;
                            
                            return `
                                <div class="position-detail ${isCritical ? 'critical' : ''}">
                                    <div class="position-header">
                                        <span class="position-name">${getPositionName(posType)}</span>
                                        <span class="position-status ${isCritical ? 'critical' : 'ok'}">
                                            ${isCritical ? '⚠️ Критично' : '✅ Норма'}
                                        </span>
                                    </div>
                                    <div class="position-stats-bar">
                                        <div class="stats-bar">
                                            <div class="sold-bar" style="width: ${pos.total > 0 ? (pos.sold / pos.total) * 100 : 0}%">
                                                <span>Продано: ${pos.sold}</span>
                                            </div>
                                            <div class="free-bar" style="width: ${pos.total > 0 ? (pos.free / pos.total) * 100 : 0}%">
                                                <span>Свободно: ${pos.free}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="position-recommendation">
                                        ${getProcurementRecommendation(posType, pos)}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            ` : ''}
            
            ${hasPS5Positions ? `
                <div class="platform-section">
                    <h4 style="color: #f72585; margin-bottom: 10px;">
                        <i class="fab fa-playstation"></i> PS5 Позиции
                    </h4>
                    ${Object.keys(stats.positionsByType)
                        .filter(posType => posType.includes('ps5') && stats.positionsByType[posType].total > 0)
                        .map(posType => {
                            const pos = stats.positionsByType[posType];
                            const isCritical = pos.free <= criticalThreshold;
                            
                            return `
                                <div class="position-detail ${isCritical ? 'critical' : ''}">
                                    <div class="position-header">
                                        <span class="position-name">${getPositionName(posType)}</span>
                                        <span class="position-status ${isCritical ? 'critical' : 'ok'}">
                                            ${isCritical ? '⚠️ Критично' : '✅ Норма'}
                                        </span>
                                    </div>
                                    <div class="position-stats-bar">
                                        <div class="stats-bar">
                                            <div class="sold-bar" style="width: ${pos.total > 0 ? (pos.sold / pos.total) * 100 : 0}%">
                                                <span>Продано: ${pos.sold}</span>
                                            </div>
                                            <div class="free-bar" style="width: ${pos.total > 0 ? (pos.free / pos.total) * 100 : 0}%">
                                                <span>Свободно: ${pos.free}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="position-recommendation">
                                        ${getProcurementRecommendation(posType, pos)}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            ` : ''}
            
            ${!hasPS4Positions && !hasPS5Positions ? `
                <div class="empty" style="padding: 20px; text-align: center;">
                    <i class="fas fa-info-circle fa-2x" style="color: #94a3b8;"></i>
                    <p style="margin-top: 10px; color: #64748b;">Нет данных по позициям</p>
                </div>
            ` : ''}
        </div>
        
        <h3>💰 Финансы</h3>
        <div class="financial-stats">
            <div class="financial-item">
                <span>Затраты на закуп:</span>
                <strong class="expense">${stats.purchaseAmount.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div class="financial-item">
                <span>Выручка:</span>
                <strong class="revenue">${stats.revenue.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div class="financial-item">
                <span>Прибыль:</span>
                <strong class="profit ${stats.profit >= 0 ? 'positive' : 'negative'}">
                    ${stats.profit.toLocaleString('ru-RU')} ₽
                </strong>
            </div>
        </div>
        
        <div class="modal-actions">
            <button onclick="addAccountsForGame(${gameId})" class="btn btn-success">
                <i class="fas fa-plus"></i> Добавить аккаунты
            </button>
            <button onclick="generateProcurementPlan(${gameId})" class="btn btn-primary">
                <i class="fas fa-clipboard-list"></i> План закупа
            </button>
            <button onclick="closeModal('gameDetailsModal')" class="btn btn-secondary">
                Закрыть
            </button>
        </div>
    `;
    
    openModal('gameDetailsModal');
}

// Получить рекомендацию по закупу
function getProcurementRecommendation(posType, position) {
    // Если позиций вообще нет в игре (и они не нужны)
    if (position.total === 0) {
        return ""; // Пустая строка - не показываем рекомендацию
    }
    
    if (position.free === 0) {
        return `🛑 Закончились! Срочно докупить ${Math.max(3, position.total)} позиций`;
    }
    
    if (position.free <= criticalThreshold) {
        const need = Math.max(3, Math.ceil(position.total * 0.5));
        return `⚠️ Мало позиций (${position.free} из ${position.total}). Докупить ${need} шт.`;
    }
    
    if (position.sold / position.total > 0.8) {
        return `📈 Хорошо продается (${Math.round((position.sold / position.total) * 100)}%). Можно докупить 2-3 шт.`;
    }
    
    return `✅ Норма (${position.free} свободно из ${position.total})`;
}

// Добавить аккаунты для игры
function addAccountsForGame(gameId) {
    window.location.href = `add-account.html?game=${gameId}`;
}

// Добавить рекомендованные позиции
function addRecommendedPositions(gameId) {
    if (confirm('Перейти к добавлению аккаунтов для этой игры?')) {
        addAccountsForGame(gameId);
    }
}

// Создать план закупа
function generateProcurementPlan(gameId) {
    const game = games.find(g => g.id === gameId);
    const stats = gamesStats.find(s => s.gameId === gameId);
    
    if (!game || !stats) return;
    
    let plan = `План закупа для игры: ${game.name}\n\n`;
    plan += `Дата создания: ${new Date().toLocaleDateString('ru-RU')}\n`;
    plan += `========================================\n\n`;
    
    Object.keys(stats.positionsByType).forEach(posType => {
        const pos = stats.positionsByType[posType];
        const rec = getProcurementRecommendation(posType, pos);
        
        plan += `${getPositionName(posType)}:\n`;
        plan += `  Текущее состояние: ${pos.free} свободно из ${pos.total}\n`;
        plan += `  Рекомендация: ${rec}\n`;
        plan += `  Статус: ${pos.free <= criticalThreshold ? 'Требуется закуп' : 'Запас достаточный'}\n\n`;
    });
    
    // Копируем в буфер обмена
    navigator.clipboard.writeText(plan).then(() => {
        showNotification('План закупа скопирован в буфер обмена 📋', 'success');
    }).catch(() => {
        // Fallback для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = plan;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('План закупа скопирован в буфер обмена 📋', 'success');
    });
}

// Вспомогательные функции
function getPositionName(posType) {
    const names = {
        'p2_ps4': 'П2 PS4',
        'p3_ps4': 'П3 PS4',
        'p2_ps5': 'П2 PS5',
        'p3_ps5': 'П3 PS5'
    };
    return names[posType] || posType;
}

function getRecommendationIcon(action) {
    const icons = {
        'add': 'plus-circle',
        'restock': 'shopping-cart',
        'maintain': 'boxes'
    };
    return icons[action] || 'info-circle';
}

// Обновление данных
function refreshProcurementData() {
    calculateProcurementStats();
    displayCriticalPositions();
    displayProcurementRecommendations();
    displayGamesStats();
    showNotification('Данные по закупу обновлены 🔄', 'info');
}

// Обновление при изменении данных в реальном времени
setInterval(() => {
    if (window.location.pathname.includes('procurement.html')) {
        refreshProcurementData();
    }
}, 30000); // Обновлять каждые 30 секунд