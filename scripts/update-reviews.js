// Script para atualizar reviews automaticamente via GitHub Actions
// Este é um exemplo - conectar com Google Local Services API quando disponível

const fs = require('fs');
const path = require('path');

const clientsDir = path.join(__dirname, '..', 'clients');

// Função para atualizar timestamp
function updateReviewsTimestamp(clientPath) {
  const reviewsFile = path.join(clientPath, 'reviews.json');
  
  if (fs.existsSync(reviewsFile)) {
    const data = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
    data.last_updated = new Date().toISOString();
    fs.writeFileSync(reviewsFile, JSON.stringify(data, null, 2));
    console.log(`✓ Atualizado: ${path.basename(clientPath)}`);
  }
}

// Atualizar todos os clientes
const clients = fs.readdirSync(clientsDir);
clients.forEach(client => {
  const clientPath = path.join(clientsDir, client);
  if (fs.statSync(clientPath).isDirectory()) {
    updateReviewsTimestamp(clientPath);
  }
});

console.log('✓ Reviews atualizados com sucesso');
