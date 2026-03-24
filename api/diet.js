export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pantry, request } = req.body;

  const SYSTEM = `Sei un nutrizionista italiano. L'utente ha queste sensibilità alimentari (test Foodplan):
- Grano duro e grano tenero (frumento) e derivati. Orzo e segale NON sono nella lista.
- Arachidi
- Latticini: latte di mucca, latte di capra, mozzarella, gorgonzola, grana padano, parmigiano reggiano, pecorino, ricotta, burro, panna, caseina, siero di latte
- Lievito di birra
- Uova

Rispondi ESCLUSIVAMENTE con JSON valido senza markdown né backtick:
{
  "intro": "breve introduzione in italiano",
  "meals": [
    {
      "name": "nome piatto",
      "type": "colazione/pranzo/cena/spuntino",
      "ingredients": ["ingrediente1", "ingrediente2"],
      "instructions": "istruzioni brevi in 2-3 frasi",
      "safe": true
    }
  ]
}`;

  const userMsg = `Prodotti disponibili in dispensa: ${pantry.join(', ')}\n\nRichiesta: ${request || 'Suggerisci un piano pasti per oggi (colazione, pranzo, cena) usando questi ingredienti. Assicurati che tutto sia compatibile con le mie sensibilità.'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Errore AI', detail: e.message });
  }
}
