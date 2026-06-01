const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Настройки для Render
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (опционально, если хочешь хостить фронтенд на том же сервере)
app.use(express.static(path.join(__dirname, '../')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Тестовый эндпоинт
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'PS Store API сервер работает',
        time: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Проверка здоровья сервера (для Render)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Получение информации об игре
app.get('/api/game/:productId/:region', async (req, res) => {
    const { productId, region } = req.params;
    
    console.log(`🎮 Запрос игры: ${productId} (${region})`);
    
    try {
        // Добавляем задержку для избежания бана
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const gameData = await fetchGameData(productId, region);
        res.json(gameData);
        
    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
        
        // Возвращаем демо-данные с информацией об ошибке
        res.json({
            ...getDemoData(productId, region),
            error: error.message,
            success: false
        });
    }
});

// Массовая проверка игр (новый эндпоинт)
app.post('/api/games/batch', async (req, res) => {
    const { games } = req.body;
    
    if (!games || !Array.isArray(games)) {
        return res.status(400).json({ 
            error: 'Неверный формат запроса. Ожидается массив games' 
        });
    }
    
    console.log(`🔄 Массовая проверка ${games.length} игр`);
    
    try {
        const results = [];
        
        for (const game of games) {
            try {
                const data = await fetchGameData(game.productId, game.region);
                results.push({
                    productId: game.productId,
                    region: game.region,
                    success: true,
                    data: data
                });
                
                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 800));
                
            } catch (error) {
                results.push({
                    productId: game.productId,
                    region: game.region,
                    success: false,
                    error: error.message,
                    data: getDemoData(game.productId, game.region)
                });
            }
        }
        
        res.json({ results });
        
    } catch (error) {
        console.error('❌ Ошибка массовой проверки:', error);
        res.status(500).json({ error: 'Ошибка массовой проверки' });
    }
});

// Функция получения данных
async function fetchGameData(productId, region) {
    const storeUrl = `https://store.playstation.com/${region === 'TR' ? 'tr-tr' : 'uk-ua'}/product/${productId}`;
    
    console.log(`🔄 Запрашиваю: ${storeUrl}`);
    
    try {
        const response = await axios.get(storeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': region === 'TR' ? 'tr-TR,tr;q=0.9,en;q=0.8' : 'uk-UA,uk;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        return parseHTML(response.data, region, productId, storeUrl);
        
    } catch (error) {
        console.error(`❌ Ошибка запроса ${productId}:`, error.message);
        
        // Пробуем альтернативный URL
        try {
            const altUrl = `https://store.playstation.com/${region === 'TR' ? 'tr-tr' : 'uk-ua'}/concept/${productId}`;
            console.log(`🔄 Пробую альтернативный URL: ${altUrl}`);
            
            const altResponse = await axios.get(altUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            
            return parseHTML(altResponse.data, region, productId, altUrl);
            
        } catch (altError) {
            console.error(`❌ Ошибка альтернативного запроса: ${altError.message}`);
            throw new Error(`Не удалось получить данные: ${error.message}`);
        }
    }
}

// Парсинг HTML
function parseHTML(html, region, productId, url) {
    const $ = cheerio.load(html);
    
    let price = 0, originalPrice = 0, name = '', discount = 0, image = '';
    
    // 1. Ищем в JSON-LD
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
        try {
            const data = JSON.parse(jsonLd);
            if (data.name) name = data.name;
            if (data.offers && data.offers.price) {
                price = parseFloat(data.offers.price);
            }
            if (data.image) {
                image = Array.isArray(data.image) ? data.image[0] : data.image;
            }
        } catch (e) {
            console.log('Ошибка парсинга JSON-LD:', e.message);
        }
    }
    
    // 2. Ищем в мета-тегах
    if (!price) {
        const metaPrice = $('meta[property="product:price:amount"]').attr('content');
        if (metaPrice) price = parseFloat(metaPrice);
    }
    
    if (!originalPrice) {
        const metaOriginal = $('meta[property="product:original_price:amount"]').attr('content');
        if (metaOriginal) originalPrice = parseFloat(metaOriginal);
    }
    
    if (!name) {
        const metaName = $('meta[property="og:title"]').attr('content');
        if (metaName) name = metaName.replace(' - PlayStation Store', '');
    }
    
    // 3. Ищем в HTML
    if (!name) {
        name = $('h1').first().text() || 
               $('title').text().replace(' - PlayStation Store', '') ||
               `Игра ${productId}`;
    }
    
    if (!image) {
        const metaImage = $('meta[property="og:image"]').attr('content');
        if (metaImage) image = metaImage;
    }
    
    // 4. Ищем скидку
    const discountElement = $('[data-qa="mfeCtaMain#offer0#discountInfo"], .discount-info, .discount-percentage, .psw-fill-xsmall');
    if (discountElement.length > 0) {
        const discountText = discountElement.text();
        const match = discountText.match(/(\d+)%/);
        if (match) discount = parseInt(match[1]);
    }
    
    // 5. Ищем цену в различных элементах
    if (!price || price === 0) {
        const priceElement = $('[data-qa="mfeCtaMain#offer0#finalPrice"], .price, .psw-price');
        if (priceElement.length > 0) {
            const priceText = priceElement.first().text();
            const priceMatch = priceText.match(/[\d,]+/);
            if (priceMatch) {
                price = parseFloat(priceMatch[0].replace(',', '.'));
            }
        }
    }
    
    // 6. Ищем старую цену
    if ((!originalPrice || originalPrice === 0) && discount > 0) {
        const originalElement = $('[data-qa="mfeCtaMain#offer0#originalPrice"], .original-price, .psw-strike-price');
        if (originalElement.length > 0) {
            const originalText = originalElement.first().text();
            const originalMatch = originalText.match(/[\d,]+/);
            if (originalMatch) {
                originalPrice = parseFloat(originalMatch[0].replace(',', '.'));
            }
        }
    }
    
    // Если не нашли скидку, но есть старая цена
    if (!discount && originalPrice > 0 && price > 0) {
        discount = Math.round((1 - price / originalPrice) * 100);
    }
    
    // Если не нашли цену, используем демо
    if (!price || price === 0) {
        console.log(`⚠️ Цена не найдена для ${productId}, возвращаю демо-данные`);
        return getDemoData(productId, region);
    }
    
    const currencySymbol = region === 'TR' ? '₺' : '₴';
    
    return {
        success: true,
        name: name.trim(),
        price: {
            amount: price,
            formatted: `${price} ${currencySymbol}`
        },
        originalPrice: {
            amount: originalPrice || price,
            formatted: `${originalPrice || price} ${currencySymbol}`
        },
        discount: discount,
        currency: currencySymbol,
        region: region,
        productId: productId,
        url: url,
        image: image,
        isOnSale: discount > 0,
        isDemo: false,
        scrapedAt: new Date().toISOString()
    };
}

// Демо-данные
function getDemoData(productId, region) {
    const discount = Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : 0;
    const basePrice = region === 'TR' ? 
        Math.floor(Math.random() * 300) + 200 : 
        Math.floor(Math.random() * 500) + 300;
    
    const price = discount > 0 ? Math.round(basePrice * (1 - discount/100)) : basePrice;
    const currencySymbol = region === 'TR' ? '₺' : '₴';
    
    return {
        success: false,
        name: `Игра ${productId} (Демо)`,
        price: { 
            amount: price, 
            formatted: `${price} ${currencySymbol}` 
        },
        originalPrice: { 
            amount: basePrice, 
            formatted: `${basePrice} ${currencySymbol}` 
        },
        discount: discount,
        currency: currencySymbol,
        region: region,
        productId: productId,
        url: `https://store.playstation.com/${region === 'TR' ? 'tr-tr' : 'uk-ua'}/product/${productId}`,
        image: '',
        isOnSale: discount > 0,
        isDemo: true,
        note: 'Демо-данные (реальные данные не найдены)'
    };
}

// Обработка 404
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        path: req.url,
        method: req.method
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err.stack);
    
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'production' ? 'Ошибка сервера' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 PS Store API Server запущен`);
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Время запуска: ${new Date().toISOString()}`);
    console.log('='.repeat(50) + '\n');
    
    // Проверяем доступность
    console.log(`✅ Сервер доступен по адресу:`);
    console.log(`   http://localhost:${PORT}/api/test`);
    console.log(`   http://localhost:${PORT}/health\n`);
});

// Обработка graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Получен SIGTERM, завершаю работу...');
    server.close(() => {
        console.log('👋 Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Получен SIGINT, завершаю работу...');
    server.close(() => {
        console.log('👋 Сервер остановлен');
        process.exit(0);
    });
});

module.exports = app;