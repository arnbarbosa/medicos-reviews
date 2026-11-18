# Médicos Reviews

Avaliações do Google de vários clientes médicos, atualizadas automaticamente 1x por dia e servidas como JSON para os sites.

## Como funciona

1. O GitHub Actions roda todo dia às 06:00 (Brasília). Também dá para rodar manualmente: aba **Actions → Update Reviews → Run workflow**.
2. `scripts/update-reviews.js` consulta o **Google Places API (New)** de cada cliente em `clients/`.
3. As avaliações recebidas são **mescladas** com as já salvas. O Google devolve no máximo 5 por consulta, então as antigas continuam no arquivo.
4. Se algo mudou, o robô faz commit do `reviews.json`. Os sites leem direto:

```
https://raw.githubusercontent.com/arnbarbosa/medicos-reviews/main/clients/<cliente>/reviews.json
```

Custo: 1 consulta por cliente por dia (~30/mês), dentro da cota gratuita mensal do Places API.

## Configuração (uma vez)

1. Google Cloud Console: num projeto com faturamento ativo, ative **Places API (New)** e crie uma **chave de API**. Restrinja a chave a essa API.
2. Neste repositório: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `GOOGLE_PLACES_API_KEY`
   - Valor: a chave
3. Rode o workflow manualmente uma vez e confira o log.

## Adicionar cliente

Crie `clients/<slug>/config.json`:

```json
{
  "place_id": "",
  "search_query": "Nome do médico, especialidade, endereço, cidade - UF",
  "max_reviews": 10
}
```

Com `place_id` vazio, a primeira execução busca o local pelo `search_query` e grava o `place_id` encontrado. Confira no log se o local está certo.

## Formato do `reviews.json`

```json
{
  "professional": { "name": "...", "rating": 5, "total_reviews": 5, "google_place_id": "...", "google_reviews_url": "..." },
  "reviews": [
    { "id": "places/.../reviews/...", "name": "Autor", "rating": 5, "date": "2026-11-10",
      "text": "Texto original", "photo": "https://lh3.googleusercontent.com/...", "author_url": "...", "source": "google" }
  ],
  "last_updated": "2026-11-18T09:00:00Z"
}
```

Avaliações sem texto ficam no arquivo, mas o carrossel do site não as exibe.

## Testar sem chave

```
PLACES_MOCK=resposta.json CLIENT=dra-sarah-blunck node scripts/update-reviews.js
```
