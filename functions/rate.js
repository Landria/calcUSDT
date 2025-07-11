// functions/rate.js
export async function onRequest(context) {
  try {
    const url = "https://www.bestchange.ru/tether-bep20-to-sbp.html";
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!resp.ok) {
      return new Response("Ошибка загрузки", { status: 500 });
    }
    
    const text = await resp.text();
    
    // Множественные варианты поиска
    const patterns = [
      // HTML-версия
      /Средневзвешенный курс обмена:.*?<span class="bt">([0-9.]+)<\/span>/s,
      // Текстовая версия
      /Средневзвешенный курс обмена:\s*([0-9]+\.[0-9]+)/,
      // Любое число после двоеточия
      /:\s*([0-9]+\.[0-9]+)/,
      // Просто число в разумном диапазоне
      /([7-9][0-9]\.[0-9]{4,6})/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        if (rate >= 60 && rate <= 150) {
          console.log('Найден курс:', match[1]);
          return new Response(match[1], {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        }
      }
    }
    
    return new Response("курс не найден", { status: 500 });
    
  } catch (e) {
    return new Response("ошибка: " + e.message, { status: 500 });
  }
}
