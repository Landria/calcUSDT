// functions/rate.js
export async function onRequest(context) {
  try {
    console.log('Начинаем получение курса USDT/RUB...');
    
    const url = "https://www.bestchange.ru/tether-bep20-to-sbp.html";
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!resp.ok) {
      console.log('Ошибка HTTP:', resp.status);
      return new Response("Ошибка загрузки страницы", { status: 500 });
    }
    
    const text = await resp.text();
    console.log('Получен HTML, размер:', text.length, 'байт');
    
    // Несколько вариантов регулярных выражений для поиска курса
    const patterns = [
      // Основной паттерн - точная структура из вашего HTML
      /<span title="Средний арифметический взвешенный курс"[^>]*>[\s\S]*?Средневзвешенный курс обмена:[\s\S]*?<span class="bt">([0-9]+\.[0-9]+)<\/span>[\s\S]*?<\/span>/i,
      
      // Упрощенный вариант - ищем span с title и потом span class="bt"
      /<span title="Средний арифметический взвешенный курс"[^>]*>[\s\S]*?<span class="bt">([0-9]+\.[0-9]+)<\/span>/i,
      
      // Еще более простой - просто ищем span class="bt" после упоминания курса
      /Средневзвешенный курс обмена:[\s\S]*?<span class="bt">([0-9]+\.[0-9]+)<\/span>/i,
      
      // Резервный вариант - любой span с классом bt
      /<span class="bt">([0-9]+\.[0-9]+)<\/span>/i,
      
      // Альтернативный поиск - число после двоеточия
      /:\s*([0-9]+\.[0-9]+)/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        
        // Проверяем, что это разумный курс для USDT/RUB (обычно 60-150)
        if (rate >= 50 && rate <= 200) {
          console.log(`Курс найден паттерном ${i + 1}:`, match[1]);
          return new Response(match[1], {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        }
      }
    }
    
    // Если ничего не найдено, покажем фрагмент для отладки
    console.log('Поиск строки с курсом...');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Средневзвешенный курс') || line.includes('class="bt"')) {
        console.log(`Строка ${i}:`, line.trim());
      }
    }
    
    return new Response("курс не найден", { status: 500 });
    
  } catch (e) {
    console.log('Ошибка:', e.message);
    return new Response("ошибка: " + e.message, { status: 500 });
  }
}
