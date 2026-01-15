// totp.js - Библиотека для генерации TOTP кодов (как Google Authenticator)

class TOTP {
    // Преобразование base32 в байты
    static base32toBytes(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        base32 = base32.replace(/=+$/, '').toUpperCase();
        
        let bytes = [];
        let buffer = 0;
        let bitsLeft = 0;
        
        for (let i = 0; i < base32.length; i++) {
            const ch = base32.charAt(i);
            const value = alphabet.indexOf(ch);
            
            if (value === -1) {
                console.error('Некорректный символ base32:', ch);
                return new Uint8Array(0);
            }
            
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            
            if (bitsLeft >= 8) {
                bytes.push(buffer >>> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        
        return new Uint8Array(bytes);
    }
    
    // Генерация HMAC-SHA1 через Web Crypto API
    static async hmacSHA1(keyBytes, message) {
        try {
            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'HMAC', hash: { name: 'SHA-1' } },
                false,
                ['sign']
            );
            
            const signature = await window.crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                message
            );
            
            return new Uint8Array(signature);
        } catch (error) {
            console.error('Ошибка Web Crypto API:', error);
            throw new Error('HMAC-SHA1 не поддерживается в этом браузере');
        }
    }
    
    // Генерация TOTP кода
    static async generateTOTP(secretBase32, timestamp = Date.now()) {
        try {
            // 1. Конвертируем секрет из base32
            const keyBytes = this.base32toBytes(secretBase32);
            
            if (keyBytes.length === 0) {
                return 'INVALID SECRET';
            }
            
            // 2. Вычисляем временной интервал (30 секунд)
            const timeStep = 30 * 1000; // 30 секунд в миллисекундах
            const counter = Math.floor(timestamp / timeStep);
            
            // 3. Конвертируем counter в 8-байтовый массив (big-endian)
            const counterBytes = new Uint8Array(8);
            let tempCounter = counter;
            for (let i = 7; i >= 0; i--) {
                counterBytes[i] = tempCounter & 0xff;
                tempCounter >>>= 8;
            }
            
            // 4. Генерируем HMAC-SHA1
            const hmac = await this.hmacSHA1(keyBytes, counterBytes);
            
            // 5. Получаем смещение
            const offset = hmac[hmac.length - 1] & 0xf;
            
            // 6. Извлекаем 4 байта
            const code = 
                ((hmac[offset] & 0x7f) << 24) |
                ((hmac[offset + 1] & 0xff) << 16) |
                ((hmac[offset + 2] & 0xff) << 8) |
                (hmac[offset + 3] & 0xff);
            
            // 7. Приводим к 6 цифрам
            const otp = code % 1000000;
            
            // 8. Добавляем ведущие нули
            return otp.toString().padStart(6, '0');
            
        } catch (error) {
            console.error('Ошибка генерации TOTP:', error);
            return 'ERROR';
        }
    }
    
    // Получение оставшегося времени в секундах
    static getRemainingSeconds(timestamp = Date.now()) {
        const timeStep = 30 * 1000; // 30 секунд
        const remaining = timeStep - (timestamp % timeStep);
        return Math.floor(remaining / 1000);
    }
    
    // Проверка валидности TOTP кода
    static async verifyTOTP(secretBase32, code, window = 1) {
        const timestamp = Date.now();
        
        for (let i = -window; i <= window; i++) {
            const testTime = timestamp + (i * 30 * 1000);
            const testCode = await this.generateTOTP(secretBase32, testTime);
            
            if (testCode === code) {
                return true;
            }
        }
        
        return false;
    }
    
    // Проверка формата ключа
    static isValidSecret(secret) {
        if (!secret || typeof secret !== 'string') return false;
        
        // Проверяем base32 формат
        const base32Regex = /^[A-Z2-7]+=*$/i;
        if (!base32Regex.test(secret)) return false;
        
        // Проверяем минимальную длину
        const cleanSecret = secret.replace(/=/g, '');
        return cleanSecret.length >= 16;
    }
    
    // Генерация случайного секрета
    static generateSecret(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < length; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }
    
    // Создание QR-кода URL для Google Authenticator
    static generateGoogleAuthURL(secret, accountName, issuer = 'PSN Account') {
        return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
    }
}

// Экспортируем для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOTP;
} else {
    window.TOTP = TOTP;
}