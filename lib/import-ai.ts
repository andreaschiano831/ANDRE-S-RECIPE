// Estrazione ricette con Groq (testo o immagine), condivisa da /api/import e /api/import-url
import { CATEGORIES } from '@/lib/recipes'

import { groqChat } from './groq'

export function recipePrompt(sections: string[]) {
  return `Sei l'assistente di uno chef stellato. Estrai TUTTE le ricette presenti nel materiale e restituisci SOLO un oggetto JSON, senza testo fuori dal JSON, in questo formato:
{"recipes":[{"name":"","section":"","category":"","dish_group":"","yield_note":"","ingredients":[{"name":"","quantity":0,"unit":"g","note":""}],"steps":[{"body":"","duration_min":null,"temperature":""}],"notes":""}]}
REGOLE:
1. Ogni preparazione con un proprio titolo (es. "Massa macaron", "Cremoso pesca", "Glassa") è una ricetta SEPARATA nell'array. Se fanno parte dello stesso piatto o dolce, metti il nome del piatto in "dish_group".
2. Leggi ogni riga: non saltare ingredienti. "quantity" è un numero (usa il punto come decimale) oppure null se q.b.
3. Unità ammesse: g, kg, ml, l, cl, n°, q.b., foglio, bacca, %. Converti "gr" in "g", uova/tuorli contati in "n°". Se le quantità sono in once/cup/cucchiai convertile in g/ml.
4. Traduci tutto in italiano professionale di cucina.
5. "steps": dividi il procedimento in passaggi brevi e ordinati, uno per azione. Se un passaggio indica un tempo, metti i minuti in "duration_min" (numero intero); se indica una temperatura di forno/abbattitore/cottura scrivila in "temperature" (es. "170°C ventilato", "82°C").
6. "section": ${sections.length ? `scegli il più adatto tra ${sections.map((x) => `"${x}"`).join(', ')}; se nessuno è adatto proponi un nome breve di sezione (es. "Primi", "Gelateria").` : 'proponi un nome breve di sezione (es. "Antipasti", "Primi", "Pasticceria").'}
7. "category" deve essere una di: ${CATEGORIES.join(', ')}.
8. "yield_note" è la resa se indicata (es. "per 60 pezzi", "4 persone"), altrimenti "".
9. Non inventare ingredienti o quantità che non vedi. Ignora pubblicità, commenti, menu del sito e ricette solo citate senza ingredienti.`
}

function extractJson(text: string): any {
  const clean = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const obj = clean.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  const arr = clean.match(/\[[\s\S]*\]/)
  if (arr) { try { return { recipes: JSON.parse(arr[0]) } } catch {} }
  return null
}

export { GroqError as AIError } from './groq'

export async function extractRecipes(input: { text?: string; image?: string; sections: string[] }): Promise<any[]> {
  const sys = recipePrompt(input.sections)
  const out = input.image
    ? await groqChat({ system: sys, user: 'Estrai le ricette da questa immagine e rispondi solo con il JSON.', images: [input.image], json: true })
    : await groqChat({ system: sys, user: String(input.text ?? '').slice(0, 24000), json: true })
  const parsed = extractJson(out)
  return Array.isArray(parsed?.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : parsed?.name ? [parsed] : []
}
