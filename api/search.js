export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { barcode, name } = req.query;

  try {
    let url = '';
    if (barcode) {
      url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    } else if (name) {
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&lc=it`;
    } else {
      return res.status(400).json({ error: 'Parametro mancante' });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'MangioPosso/1.0 (personal food app)' }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Errore ricerca', detail: e.message });
  }
}
