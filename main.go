package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// cp1251ToUTF8 — простая перекодировка Windows-1251 в UTF-8
func cp1251ToUTF8(input []byte) string {
	var table = [...]rune{
		0x0402, 0x0403, 0x201A, 0x0453, 0x201E, 0x2026, 0x2020, 0x2021,
		0x20AC, 0x2030, 0x0409, 0x2039, 0x040A, 0x040C, 0x040B, 0x040F,
		0x0452, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
		0x0098, 0x2122, 0x0459, 0x203A, 0x045A, 0x045C, 0x045B, 0x045F,
		0x00A0, 0x040E, 0x045E, 0x0408, 0x00A4, 0x0490, 0x00A6, 0x00A7,
		0x0401, 0x00A9, 0x0404, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x0407,
		0x00B0, 0x00B1, 0x0406, 0x0456, 0x0491, 0x00B5, 0x00B6, 0x00B7,
		0x0451, 0x2116, 0x0454, 0x00BB, 0x0458, 0x0405, 0x0455, 0x0457,
	}
	var out []rune
	for _, c := range input {
		switch {
		case c < 0x80:
			out = append(out, rune(c))
		case c >= 0xC0:
			out = append(out, 0x0410+rune(c-0xC0))
		case c >= 0x80 && c < 0xC0:
			out = append(out, table[c-0x80])
		default:
			out = append(out, rune(c))
		}
	}
	return string(out)
}

func getBestChangeUSDTtoRUB() (string, error) {
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

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	origin := request.Headers["origin"]
	allowOrigin := "https://calculator-1e3.pages.dev"
	if origin == allowOrigin {
		allowOrigin = origin
	}

	// Обработка preflight (OPTIONS) запроса для CORS
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  allowOrigin,
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
			Body: "",
		}, nil
	}

	course, err := getBestChangeUSDTtoRUB()
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       err.Error(),
			Headers: map[string]string{
				"Content-Type":                 "text/plain; charset=utf-8",
				"Access-Control-Allow-Origin":  allowOrigin,
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}, nil
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       course,
		Headers: map[string]string{
			"Content-Type":                 "text/plain; charset=utf-8",
			"Access-Control-Allow-Origin":  allowOrigin,
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	}, nil
}

func main() {
	lambda.Start(handler)
}
