export default {
  /**
   * Основная точка входа Cloudflare Worker
   * @param {Request} request
   * @param {Env} env          – переменные окружения (не используем)
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    try {
      // 1. Загружаем HTML-страницу BestChange
      const resp = await fetch(
        'https://www.bestchange.ru/tether-bep20-to-sbp.html',
        {
          // BestChange может блокировать «пустой» User-Agent,
          // поэтому добавим минимальный заголовок
          headers: { 'User-Agent': 'Mozilla/5.0 (Cloudflare Worker)' },
        },
      );

      if (!resp.ok) {
        // Пробрасываем, чтобы уйти в catch и отдать 502
        throw new Error(`BestChange ответил HTTP ${resp.status}`);
      }

      // 2. Получаем тело ответа как текст (UTF-8 уже по умолчанию)
      const body = await resp.text();

      // 3. Ищем строку со средневзвешенным курсом
      const rate = extractRate(body);

      // 4. Возвращаем результат
      return new Response(JSON.stringify({ rate }), {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
      });
    } catch (err) {
      // Любая ошибка → 502 Bad Gateway
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
      });
    }
  },
};

/**
 * Извлекает первое число вида 123.45 после строки «Средневзвешенный курс».
 * @param {string} html – полный HTML документ
 * @returns {string}    – курс, например "93.12"
 * @throws {Error}      – если курс не найден
 */
function extractRate(html) {
  // Разбиваем на строки для упрощения поиска
  const lines = html.split('\n');

  for (const line of lines) {
    if (line.includes('Средневзвешенный курс')) {
      const match = line.match(/([0-9]+\.[0-9]+)/);
      if (match && match[1]) return match[1];
    }
  }

  throw new Error('Курс не найден на странице');
}
