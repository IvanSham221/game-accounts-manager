# PSHub Inbox (Avito → CRM)

Сервис входящих чатов Авито для CRM 3.0.

## На VPS

```bash
cd /var/www/pshub-inbox
# скопировать эту папку inbox-server
cp .env.example .env
# заполнить AVITO_* и INBOX_API_KEY
npm i
pm2 start ecosystem.config.cjs
```

Nginx (пример):

```nginx
location /inbox/ {
  proxy_pass http://127.0.0.1:3010/inbox/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

Подписка webhook:

```bash
cd /var/www/pshub-inbox && node src/subscribe.js
```

В CRM → Чаты → «Настройка подключения»:  
URL `https://147.45.149.39.sslip.io/inbox`, ключ = `INBOX_API_KEY`.
