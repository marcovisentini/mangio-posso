export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { barcode, name } = req.query;

  try {
    let url = barcode
      ? `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&lc=it`;

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MangioPosso/1.0', 'Accept': 'application/json' },
      signal: controller.signal
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({ status: 0, products: [] });
  }
}
