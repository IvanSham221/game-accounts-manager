// psstore-api.js
class PSStoreAPI {
    constructor() {
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/'; // Или ваш прокси
        this.baseUrl = 'https://store.playstation.com/store/api/chihiro/00_09_000';
    }

    async getGameInfo(productId, region = 'TR') {
        try {
            const url = this.getApiUrl(productId, region);
            const response = await fetch(url, {
                headers: this.getHeaders(region),
                referrerPolicy: 'no-referrer'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data, region);

        } catch (error) {
            console.error(`API Error (${region}):`, error);
            
            // Фоллбэк: пробуем через прокси если прямой запрос не работает
            return this.getGameInfoFallback(productId, region);
        }
    }

    getApiUrl(productId, region) {
        const lang = region === 'TR' ? 'tr/tr' : 'ua/uk';
        return `${this.baseUrl}/${lang}/999/${productId}`;
    }

    getHeaders(region) {
        return {
            'Accept': 'application/json',
            'Accept-Language': region === 'TR' ? 'tr-TR' : 'uk-UA',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://store.playstation.com',
            'Referer': 'https://store.playstation.com/'
        };
    }

    parseResponse(data, region) {
        if (!data || !data.default_sku) return null;

        const sku = data.default_sku;
        const price = this.parsePrice(sku.display_price || sku.price || '0');
        const originalPrice = sku.original_price ? 
            this.parsePrice(sku.original_price) : price;

        const discount = originalPrice.amount > 0 && price.amount < originalPrice.amount ?
            Math.round((1 - price.amount / originalPrice.amount) * 100) : 0;

        return {
            name: data.name || '',
            price: price,
            originalPrice: originalPrice,
            discount: discount,
            currency: region === 'TR' ? '₺' : '₴',
            image: this.getBestImage(data.images),
            url: `https://store.playstation.com/${region === 'TR' ? 'tr-tr' : 'uk-ua'}/product/${data.id}`,
            isOnSale: discount > 0 || sku.is_plus || sku.rewards,
            validUntil: sku.availability?.to_date ? 
                new Date(sku.availability.to_date) : null,
            productId: data.id
        };
    }

    parsePrice(priceStr) {
        if (!priceStr) return { amount: 0, formatted: 'N/A' };
        
        // Удаляем всё кроме цифр и запятой/точки
        const cleanStr = priceStr.replace(/[^\d,.]/g, '');
        const amount = parseFloat(cleanStr.replace(',', '.'));
        
        return {
            amount: isNaN(amount) ? 0 : amount,
            formatted: priceStr.trim()
        };
    }

    getBestImage(images) {
        if (!images || !images.length) return '';
        
        // Ищем большое изображение
        const largeImage = images.find(img => 
            img.type === 'MASTER' || img.type === 'BIG_IMAGE'
        );
        
        if (largeImage) return largeImage.url;
        
        // Или первое доступное
        const firstImage = images.find(img => img.url);
        return firstImage ? firstImage.url : '';
    }

    async getGameInfoFallback(productId, region) {
        try {
            // Альтернативный метод: парсинг HTML страницы
            const storeUrl = `https://store.playstation.com/${region === 'TR' ? 'tr-tr' : 'uk-ua'}/product/${productId}`;
            const html = await this.fetchWithProxy(storeUrl);
            
            return this.parseFromHTML(html, region);
        } catch (error) {
            console.error('Fallback also failed:', error);
            return null;
        }
    }

    async fetchWithProxy(url) {
        const proxyUrl = `${this.corsProxy}${url}`;
        const response = await fetch(proxyUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
        return await response.text();
    }

    parseFromHTML(html, region) {
        // Парсим HTML для извлечения данных
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Ищем мета-теги с информацией
        const priceMeta = doc.querySelector('meta[property="product:price:amount"]');
        const oldPriceMeta = doc.querySelector('meta[property="product:original_price:amount"]');
        const imageMeta = doc.querySelector('meta[property="og:image"]');
        const titleMeta = doc.querySelector('meta[property="og:title"]');
        
        const price = priceMeta ? parseFloat(priceMeta.content) : 0;
        const oldPrice = oldPriceMeta ? parseFloat(oldPriceMeta.content) : price;
        const discount = oldPrice > 0 && price < oldPrice ?
            Math.round((1 - price / oldPrice) * 100) : 0;
        
        return {
            name: titleMeta ? titleMeta.content.replace(' - PlayStation Store', '') : '',
            price: { amount: price, formatted: `${price} ${region === 'TR' ? '₺' : '₴'}` },
            originalPrice: { amount: oldPrice, formatted: `${oldPrice} ${region === 'TR' ? '₺' : '₴'}` },
            discount: discount,
            currency: region === 'TR' ? '₺' : '₴',
            image: imageMeta ? imageMeta.content : '',
            isOnSale: discount > 0,
            validUntil: null
        };
    }
}