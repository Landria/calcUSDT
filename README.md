# Калькулятор для переводов EUR -> RUB

## Backend -> AWS Lambda

<https://e7g46byx6xcd5d5pf3f4lrfzzy0ossuk.lambda-url.eu-north-1.on.aws>

### Build the code

```console
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip deployment.zip bootstrap
// в поле handler указываем bootstrap
```

## Frontend -> Cloudflare pages

<https://calculator-1e3.pages.dev>
