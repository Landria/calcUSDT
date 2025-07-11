// export async function onRequest(context) {
//     // Пример: получить курс с BestChange через парсинг
//     const url = "https://www.bestchange.ru/tether-bep20-to-sbp.html";
//     const resp = await fetch(url);
//     const text = await resp.text();

//     // Ищем число в <span class="bt">...</span> после "Средневзвешенный курс"
//     const match = text.match(/Средневзвешенный курс.*?<span class="bt">([0-9.]+)<\/span>/s);
//     if (match && match[1]) {
//         return new Response(match[1], {
//             headers: { "Content-Type": "text/plain; charset=utf-8" }
//         });
//     }
//     return new Response("курс не найден", { status: 500 });
// }

// functions/rate.js
export async function onRequest(context) {
  return new Response("42", {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
