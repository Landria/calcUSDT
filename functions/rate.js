export async function onRequest(context) {
  // Получаем ключи из переменных окружения
  const API_KEY = context.env.BYBIT_API_KEY;
  const API_SECRET = context.env.BYBIT_API_SECRET;

  // Параметры запроса
  const params = 'coin=USDT&currency=RUB&type=SELL';
  const url = `https://api.bybit.com/v5/p2p/item/online?${params}`;
  const timestamp = Date.now().toString();
  const recvWindow = '5000';

  // Формируем строку для подписи
  const signPayload = `${timestamp}${API_KEY}${recvWindow}${params}`;

  // Функция для HMAC SHA256 (Cloudflare Workers API)
  async function sign(secret, payload) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    const signature = await sign(API_SECRET, signPayload);

    // Делаем запрос к Bybit API
    const response = await fetch(url, {
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Bybit API error: ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json;charset=utf-8' }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json;charset=utf-8' }
    });
  }
}
