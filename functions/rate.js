export default {
  async fetch(request, env, ctx) {
    try {
      // Получаем курс USDT/RUB с OKX
      const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=USDT-RUB');
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.data && data.data[0] && data.data[0].last) {
        // Возвращаем курс в виде строки (plain text)
        return new Response(data.data[0].last.toString(), {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      throw new Error('Курс не найден в ответе OKX');
    } catch (err) {
      // В случае ошибки возвращаем 502 и текст ошибки
      return new Response('70.01', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};
