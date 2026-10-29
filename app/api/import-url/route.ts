import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'
import { AIError, extractRecipes } from '@/lib/import-ai'
import { analysePage, chunkText, fetchUrl, pdfText, type WebRecipe } from '@/lib/web-recipes'

// Importa ricettari da un link: pagina di una ricetta, indice di un ricettario/blog, PDF, Google Doc.
export const runtime = 'nodejs'
export const maxDuration = 60

type Body = { action: 'scan' | 'recipe'; url: string; sections?: string[] }

const asText = (r: WebRecipe) =>
  `${r.name}\n${r.yield_note ? `Resa: ${r.yield_note}\n` : ''}\nIngredienti:\n${r.ingredients.map((i) => `${i.quantity ?? ''} ${i.unit === 'q.b.' ? 'q.b.' : i.unit} ${i.name}${i.note ? ` (${i.note})` : ''}`.trim()).join('\n')}\n\nProcedimento:\n${r.steps.map((s) => s.body).join('\n')}`

/** ricette in altre lingue (o con unità americane) passano dall'AI per traduzione e conversione */
async function localise(recipes: WebRecipe[], lang: string, sections: string[]) {
  const foreign = lang && !lang.startsWith('it')
  const odd = (r: WebRecipe) => r.ingredients.some((i) => /cup|tbsp|tsp|oz|lb/i.test(`${i.name} ${i.note}`))
  if (!process.env.GROQ_API_KEY || (!foreign && !recipes.some(odd))) return recipes.map((r) => ({ ...r, ai: false }))
  const out: any[] = []
  for (const r of recipes) {
    if (!foreign && !odd(r)) { out.push({ ...r, ai: false }); continue }
    try {
      const [x] = await extractRecipes({ text: asText(r), sections })
      out.push(x ? { ...x, notes: [x.notes, `Fonte: ${r.source_url}`].filter(Boolean).join('\n'), source_url: r.source_url, ai: true } : { ...r, ai: false })
    } catch { out.push({ ...r, ai: false }) }
  }
  return out
}

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!s.canEdit) return NextResponse.json({ error: 'Serve il ruolo chef o admin' }, { status: 403 })
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 }) }
  const sections = (body.sections ?? []).slice(0, 60)

  try {
    const page = await fetchUrl(body.url)

    // PDF e testo: si divide in blocchi che il browser fa leggere all'AI uno per volta
    if (page.type === 'pdf' || page.type === 'text') {
      let text = page.text ?? ''
      let pages = 0
      if (page.type === 'pdf') {
        const r = await pdfText(page.buf!)
        text = r.text; pages = r.pages
        if (text.replace(/\s/g, '').length < 200) throw new Error('Il PDF sembra fatto di immagini scansionate: fai degli screenshot delle pagine e usa «Screenshot».')
      }
      const name = decodeURIComponent(page.url.pathname.split('/').pop() || page.url.hostname).replace(/\.(pdf|txt)$/i, '').replace(/[-_]+/g, ' ')
      return NextResponse.json({ kind: 'document', title: name, pages, chunks: chunkText(text), recipes: [], links: [] })
    }

    const a = analysePage(page.html!, page.url)
    if (body.action === 'recipe') {
      let recipes: any[] = await localise(a.recipes, a.lang, sections)
      if (!recipes.length) {
        if (a.text.length < 150) throw new Error('Pagina senza testo leggibile (forse serve il login o è caricata da app)')
        const raw = await extractRecipes({ text: `${a.pageTitle}\n\n${a.text}`.slice(0, 24000), sections })
        recipes = raw.map((r: any) => ({ ...r, notes: [r.notes, `Fonte: ${page.url.href}`].filter(Boolean).join('\n'), source_url: page.url.href, ai: true }))
      }
      return NextResponse.json({ recipes })
    }

    // scan: cosa c'è a questo link?
    const recipes = await localise(a.recipes, a.lang, sections)
    const isRecipe = recipes.length > 0 && a.links.length < 8
    return NextResponse.json({
      kind: recipes.length && !a.links.length ? 'recipe' : a.links.length ? 'index' : 'page',
      title: a.title, pageTitle: a.pageTitle, url: page.url.href,
      recipes, links: a.links, next: a.next, preselectLinks: !isRecipe,
      // nessun dato strutturato e nessun link: il testo della pagina va all'AI
      chunks: !recipes.length && !a.links.length ? chunkText(`${a.pageTitle}\n\n${a.text}`) : [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Errore' }, { status: e instanceof AIError ? e.status : 400 })
  }
}
