package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
)

// Простая перекодировка cp1251 -> utf8 (только для русских букв и базовых символов)

func getBestChangeUSDTtoRUB_2() (string, error) {
	url := "https://www.bestchange.ru/tether-bep20-to-sbp.html"
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("ошибка при запросе: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка при чтении ответа: %v", err)
	}

	utf8Body := cp1251ToUTF8(body)

	// Ищем строку с "Средневзвешенный курс"
	lines := strings.Split(utf8Body, "\n")
	for _, line := range lines {
		if strings.Contains(line, "Средневзвешенный курс") {
			re := regexp.MustCompile(`([0-9]+\.[0-9]+)`)
			match := re.FindStringSubmatch(line)
			if len(match) >= 2 {
				return match[1], nil
			}
		}
	}
	return "", fmt.Errorf("курс не найден на странице")
}

func main2() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		course, err := getBestChangeUSDTtoRUB_2()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Fprintln(w, course)
	})

	port := "8080"
	fmt.Printf("Сервер запущен на http://localhost:%s/\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
