# 📋 Médicos Reviews — Sistema Centralizado de Avaliações

Repositório centralizado para gerenciar reviews dinâmicos de múltiplos clientes médicos via GitHub + GitHub Actions.

## 🎯 Como Funciona

1. **GitHub Actions** roda automaticamente **1x por dia** (09:00 UTC)
2. Script busca/atualiza reviews de cada cliente
3. Faz commit automático das mudanças
4. Sites dos clientes fazem **fetch do JSON** via URL direta

## 📁 Estrutura

```
medicos-reviews/
├── clients/
│   ├── dra-sarah-blunck/
│   │   ├── reviews.json (dados dos reviews)
│   │   └── config.json  (configuração do cliente)
│   ├── dr-joao-cardiologista/
│   │   ├── reviews.json
│   │   └── config.json
│   └── [novo-cliente]/
├── .github/workflows/
│   └── update-reviews.yml (orquestra as atualizações)
├── scripts/
│   └── update-reviews.js (script de atualização)
└── README.md
```

## 🚀 Próximos Passos

### 1. Fazer Push para GitHub

```bash
cd medicos-reviews
git remote add origin https://github.com/arnbarbosa/medicos-reviews.git
git branch -M main
git push -u origin main
```

### 2. Integrar no Site da Dra. Sarah

Adicione este código no `index.html` (na seção de depoimentos):

```html
<script>
  // Carregar reviews dinamicamente
  fetch('https://raw.githubusercontent.com/arnbarbosa/medicos-reviews/main/clients/dra-sarah-blunck/reviews.json')
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('reviews-carousel');
      const reviews = data.reviews;
      
      let html = `<div class="reviews-wrapper">`;
      reviews.forEach(review => {
        html += `
          <div class="review-card">
            <div class="review-header">
              <strong>${review.name}</strong>
              <span class="stars">${'★'.repeat(review.rating)}</span>
            </div>
            <p class="review-text">${review.text}</p>
            <small class="review-date">${new Date(review.date).toLocaleDateString('pt-BR')}</small>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;
    });
</script>

<div id="reviews-carousel"></div>
```

### 3. CSS para Estilo

```css
.reviews-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 40px 0;
}

.review-card {
  padding: 20px;
  border: 1px solid #e0d4c9;
  border-radius: 8px;
  background: #fafaf8;
}

.review-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stars {
  color: #d4af37;
  font-size: 14px;
}

.review-text {
  margin: 10px 0;
  font-size: 14px;
  line-height: 1.6;
}

.review-date {
  color: #999;
  font-size: 12px;
}
```

## 🔄 Adicionar Novo Cliente

### 1. Criar pasta

```bash
mkdir clients/dr-novo-cliente
```

### 2. Criar `reviews.json`

```json
{
  "professional": {
    "name": "Dr. Nome Completo",
    "specialty": "Especialidade",
    "crm": "CRM-UF 123456",
    "rating": 5.0,
    "total_reviews": 5
  },
  "reviews": [
    {
      "id": 1,
      "name": "Paciente Name",
      "rating": 5,
      "date": "2026-11-18",
      "text": "Review text aqui",
      "verified": true
    }
  ],
  "last_updated": "2026-11-18T13:48:00Z",
  "source": "Google Reviews"
}
```

### 3. Adicionar ao `.github/workflows/update-reviews.yml`

A workflow já funciona para todos os clientes! Sem mudanças necessárias.

### 4. Fazer Push

```bash
git add clients/dr-novo-cliente/
git commit -m "feat: add Dr. Novo Cliente"
git push
```

## 📊 URL de Acesso

Cada cliente acessa seus reviews em:

```
https://raw.githubusercontent.com/arnbarbosa/medicos-reviews/main/clients/[cliente]/reviews.json
```

Exemplo:
- Dra. Sarah: `https://raw.githubusercontent.com/arnbarbosa/medicos-reviews/main/clients/dra-sarah-blunck/reviews.json`
- Dr. João: `https://raw.githubusercontent.com/arnbarbosa/medicos-reviews/main/clients/dr-joao-cardiologista/reviews.json`

## ⚙️ Configuração Automática

O GitHub Actions roda automaticamente:
- **Horário:** 09:00 UTC (todos os dias)
- **Ação:** Atualiza `last_updated` em cada `reviews.json`
- **Commit:** Automático se houver mudanças

## 💡 Próximos Passos Profissionais

1. **Integrar com Google Local Services API** (autenticado, dados reais)
2. **Adicionar webhook** para atualizar on-demand
3. **Dashboard** para gerenciar clientes
4. **Cache invalidation** para sites dos clientes

---

**Criado com ❤️ para escalabilidade**
