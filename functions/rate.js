export async function onRequest(context) {
  const API_KEY = context.env.BYBIT_API_KEY;
  const API_SECRET = context.env.BYBIT_API_SECRET;

  // https://bybit-exchange.github.io/docs/p2p/ad/online-ad-list#request-parameters 
  // Параметры запроса
  const paramsObj = {
    tokenId: "USDT",
    currencyId: "RUB",
    side: 1,   // 0 - Покупка, 1- Продажа
  };
  const body = JSON.stringify(paramsObj);

  const url = "https://api.bybit.com/v5/p2p/item/online";
  const timestamp = Date.now().toString();
  const recvWindow = "5000";

  // Формируем строку для подписи: timestamp + api_key + recvWindow + body
  const signPayload = `${timestamp}${API_KEY}${recvWindow}${body}`;

  // // HMAC SHA256 через Web Crypto API
  // async function sign(secret, payload) {
  //   const enc = new TextEncoder();
  //   const key = await crypto.subtle.importKey(
  //     'raw',
  //     enc.encode(secret),
  //     { name: 'HMAC', hash: 'SHA-256' },
  //     false,
  //     ['sign']
  //   );
  //   const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  //   return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  // }

  try {
    //const signature = await sign(API_SECRET, signPayload);
    const signature = await getSignature(signPayload, API_SECRET);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BAPI-API-KEY": API_KEY,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recvWindow,
        "X-BAPI-SIGN": signature
      },
      body: body
    });

    const data = await response.json();
    const items = data.result?.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      // Возвращаем полный объект data, если нет офферов
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Ищем минимальную цену
    const minPrice = items
      .map(item => parseFloat(item.price))
      .filter(price => !isNaN(price))
      .reduce((min, price) => (price < min ? price : min), Infinity);

    if (!isFinite(minPrice)) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Возвращаем минимальный курс как строку
    return new Response(minPrice.toString(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });

  } catch (err) {
    return new Response('Ошибка сервера' + err, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

function getSignature(parameters, secret) {
    return crypto.createHmac('sha256', secret).update(timestamp + API_KEY + recvWindow + parameters).digest('hex');
}