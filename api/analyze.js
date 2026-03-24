export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productName, ingredients, mode } = req.body;

  const SYSTEM = `Sei un assistente nutrizionale italiano. L'utente ha queste sensibilità alimentari (test Foodplan):
- Grano duro e grano tenero (frumento) e derivati: farina di frumento, semola, cruschello, amido di frumento. Orzo e segale NON sono nella lista.
- Arachidi
- Latticini: latte, latte di mucca, latte di capra, mozzarella, gorgonzola, grana padano, parmigiano, pecorino, ricotta, burro, panna, crema di latte, caseina, siero di latte, formaggi freschi e stagionati in generale (es. stracchino, crescenza, brie, camembert, ecc.)
- Lievito di birra (lievito chimico e lievito in polvere NON sono problematici)
- Uova (uovo, albume, tuorlo, lecitina d'uovo)

Rispondi SOLO con JSON valido su una riga senza markdown né backtick:
{"safe":true/false/null,"verdict":"max 5 parole","explanation":"2-3 frasi esplicative in italiano che dicono SEMPRE perché il prodotto è ok o non ok","problematic":["lista ingredienti problematici trovati"]}`;

  const userMsg = mode === 'name_only'
    ? `Prodotto: "${productName}"\nNon ho la lista ingredienti. Analizza dal nome.`
    : `Prodotto: "${productName}"\nIngredienti: ${ingredients}`;

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
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json({ safe: null, verdict: 'Errore', explanation: 'Risposta AI non valida. Riprova.', problematic: [] });
    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ safe: null, verdict: 'Errore', explanation: 'Errore: ' + e.message, problematic: [] });
  }
}
