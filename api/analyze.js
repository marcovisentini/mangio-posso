export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productName, ingredients, mode } = req.body;

  const SYSTEM = `Sei un assistente nutrizionale italiano. L'utente ha queste sensibilità alimentari (test Foodplan):
- Grano duro e grano tenero (frumento) e derivati: farina di frumento, semola, cruschello, amido di frumento. ATTENZIONE: orzo e segale NON sono nella sua lista.
- Arachidi
- Latticini: latte di mucca, latte di capra, mozzarella, gorgonzola, grana padano, parmigiano reggiano, pecorino, ricotta, burro, panna, caseina, siero di latte
- Lievito di birra (il lievito chimico/lievito in polvere NON è problematico)
- Uova (uovo, albume, tuorlo, lecitina d'uovo)

Analizza e rispondi ESCLUSIVAMENTE con JSON valido senza markdown né backtick:
{"safe":true/false/null,"verdict":"testo breve max 5 parole","explanation":"2-3 frasi chiare in italiano","problematic":["ingrediente1"]}

safe=true se può mangiarlo, false se no, null se dati insufficienti.`;

  let userMsg = '';
  if (mode === 'name_only') {
    userMsg = `Prodotto: "${productName}"\nNon ho la lista ingredienti. Basati sul nome per una valutazione di massima, specificando che è una stima.`;
  } else {
    userMsg = `Prodotto: "${productName}"\nIngredienti: ${ingredients}`;
  }

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
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Errore AI', detail: e.message });
  }
}
