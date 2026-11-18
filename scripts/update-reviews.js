// Atualiza os depoimentos de cada cliente a partir do Google Places API (New).
// Roda 1x/dia pelo GitHub Actions. Requer Node 18+ (fetch nativo).
//
// Por cliente (clients/<slug>/):
//   config.json  -> { "place_id": "ChIJ...", "search_query": "...", "max_reviews": 10 }
//                   Sem place_id, o script busca pelo search_query e grava o place_id encontrado.
//   reviews.json -> lido pelos sites. Só é reescrito quando algo mudou.
//
// O Google devolve no máximo 5 avaliações por consulta ("mais relevantes").
// Por isso o script MESCLA com as já salvas: avaliações antigas continuam no arquivo.
//
// Chave: variável GOOGLE_PLACES_API_KEY (secret do repositório).
// Teste sem chave: PLACES_MOCK=caminho/resposta.json node scripts/update-reviews.js

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || '';
const MOCK = process.env.PLACES_MOCK || '';
const ONLY = process.env.CLIENT || '';          // opcional: atualizar só um cliente
const STORE_LIMIT = 50;                         // quantas avaliações guardar por cliente
const clientsDir = path.join(__dirname, '..', 'clients');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function places(url, { method = 'GET', fieldMask, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function findPlaceId(query) {
  const data = await places('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    fieldMask: 'places.id,places.displayName,places.formattedAddress',
    body: { textQuery: query, languageCode: 'pt-BR', regionCode: 'BR' }
  });
  const first = (data.places || [])[0];
  if (!first) throw new Error(`Nenhum local encontrado para "${query}"`);
  console.log(`  place_id encontrado: ${first.id} (${first.displayName?.text} — ${first.formattedAddress})`);
  return first.id;
}

async function fetchPlace(placeId) {
  if (MOCK) return readJSON(MOCK, {});
  return places(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`, {
    fieldMask: 'displayName,rating,userRatingCount,reviews,googleMapsUri'
  });
}

// Converte uma avaliação da API para o formato do reviews.json
function mapReview(r) {
  const a = r.authorAttribution || {};
  return {
    id: r.name || '',                                            // places/<id>/reviews/<id>
    name: a.displayName || 'Usuário Google',
    rating: Number(r.rating) || 0,
    date: String(r.publishTime || '').slice(0, 10),
    text: (r.originalText && r.originalText.text) || (r.text && r.text.text) || '',
    photo: a.photoUri || '',
    author_url: a.uri || '',
    source: 'google'
  };
}

// Mescla: atualiza as que já existem (mesmo id, ou mesmo autor), adiciona as novas, mantém as antigas.
function merge(existing, incoming) {
  const out = existing.map(r => ({ ...r }));
  for (const n of incoming) {
    const i = out.findIndex(o => (n.id && o.id === n.id) || norm(o.name) === norm(n.name));
    if (i >= 0) {
      const { date_approx, ...rest } = out[i];
      out[i] = { ...rest, ...n, text: n.text || rest.text || '' };
    } else {
      out.push(n);
    }
  }
  return out
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, STORE_LIMIT);
}

async function updateClient(slug) {
  const dir = path.join(clientsDir, slug);
  const cfgFile = path.join(dir, 'config.json');
  const revFile = path.join(dir, 'reviews.json');
  const cfg = readJSON(cfgFile, null);
  if (!cfg) { console.log(`- ${slug}: sem config.json, pulando`); return false; }

  console.log(`- ${slug}`);
  if (!cfg.place_id) {
    if (!cfg.search_query) throw new Error('config.json precisa de place_id ou search_query');
    cfg.place_id = await findPlaceId(cfg.search_query);
    writeJSON(cfgFile, cfg);
  }

  const place = await fetchPlace(cfg.place_id);
  const current = readJSON(revFile, { professional: {}, reviews: [] });
  const incoming = (place.reviews || []).map(mapReview);
  const reviews = merge(current.reviews || [], incoming);

  const next = {
    ...current,
    professional: {
      ...(current.professional || {}),
      rating: place.rating ?? current.professional?.rating ?? null,
      total_reviews: place.userRatingCount ?? current.professional?.total_reviews ?? reviews.length,
      google_place_id: cfg.place_id,
      google_reviews_url: place.googleMapsUri || current.professional?.google_reviews_url || ''
    },
    reviews,
    source: 'Google Places API'
  };

  const changed = JSON.stringify({ ...current, last_updated: null }) !== JSON.stringify({ ...next, last_updated: null });
  if (!changed) { console.log('  sem mudanças'); return false; }
  next.last_updated = new Date().toISOString();
  writeJSON(revFile, next);
  console.log(`  atualizado: ${incoming.length} recebidas do Google, ${reviews.length} no arquivo, nota ${next.professional.rating} (${next.professional.total_reviews})`);
  return true;
}

(async () => {
  if (!API_KEY && !MOCK) {
    console.error('ERRO: defina o secret GOOGLE_PLACES_API_KEY no repositório.');
    process.exit(1);
  }
  const slugs = fs.readdirSync(clientsDir)
    .filter(s => fs.statSync(path.join(clientsDir, s)).isDirectory())
    .filter(s => !ONLY || s === ONLY);

  let failures = 0;
  for (const slug of slugs) {
    try { await updateClient(slug); }
    catch (err) { failures++; console.error(`  ERRO em ${slug}: ${err.message}`); }
  }
  if (failures) process.exit(1);   // falha visível no Actions; os arquivos dos outros clientes já foram salvos
})();
