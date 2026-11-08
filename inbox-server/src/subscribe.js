require('dotenv').config();
const avito = require('./avito');

async function main() {
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const base = (process.env.BASE_PATH || '/inbox').replace(/\/$/, '');
  const url = process.argv[2] || `${publicUrl}${base}/api/avito/webhook`;
  console.log('Subscribe webhook:', url);
  const result = await avito.subscribeWebhook(url);
  console.log('OK', result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
