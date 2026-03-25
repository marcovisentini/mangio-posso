export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productName, ingredients, mode } = req.body;

  function cleanText(text) {
    if (!text) return '';
    return text
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&apos;/gi, "'")
      .replace(/&#\d+;/gi, '')
      .replace(/[^\x20-\x7E\u00C0-\u024F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cleanName = cleanText(productName);
  const cleanIngredients = cleanText(ingredients);

  const SYSTEM = `Sei un assistente nutrizionale italiano. L'utente ha queste sensibilità alimentari (test Foodplan):
- Grano duro e grano tenero (frumento) e derivati: farina di frumento, farina di grano tenero, semola, cruschello, amido di frumento, glutine di frumento. Orzo e segale NON sono nella lista.
- Arachidi
- Latticini: latte, latte di mucca, latte di capra, latte in polvere, latte intero, mozzarella, gorgonzola, grana padano, parmigiano, pecorino, ricotta, burro, panna, crema di latte, caseina, siero di latte, formaggi in generale, stracchino, crescenza, proteine del latte
- Lievito di birra (lievito chimico, lievito in polvere, agenti lievitanti NON sono problematici)
- Uova: uova fresche, uovo, albume, tuorlo, lecitina d'uovo

Rispondi SOLO con JSON minificato su una riga, nessun testo prima o dopo, nessun markdown:
{"safe":true,"verdict":"Puoi mangiarlo!","explanation":"Spiegazione in 2-3 frasi.","problematic":[]}`;

  const userMsg = mode === 'name_only'
    ? `Prodotto: ${cleanName}\nNon ho gli ingredienti, analizza dal nome.`
    : `Prodotto: ${cleanName}\nIngredienti: ${cleanIngredients}`;

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
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ safe: null, verdict: 'Errore API', explanation: data.error.message || 'Errore Anthropic', problematic: [] });
    }

    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[^{}]*\}/);
    if (!match) {
      const hasProblems = /frumento|latte|uov|arachid|lievito di birra/i.test(cleanIngredients + cleanName);
      return res.status(200).json({
        safe: hasProblems ? false : null,
        verdict: hasProblems ? 'Non puoi mangiarlo' : 'Verifica manuale',
        explanation: text.substring(0, 200) || 'Impossibile analizzare. Riprova.',
        problematic: []
      });
    }

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(200).json({
      safe: null,
      verdict: 'Errore',
      explanation: 'Errore di connessione: ' + e.message,
      problematic: []
    });
  }
}
