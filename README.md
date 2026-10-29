# Ricettario

App base per gestire **più ricettari** (di uno chef, di un ristorante, di una stagione, personale…): inserimento a mano o da screenshot con AI, procedimento a passaggi, dosi, modalità cucina e documenti di stampa.
Nome e sottotitolo dell’app si impostano da ⚙ Impostazioni; nessun marchio è scritto nel codice.
Stack: **Next.js 16 + Supabase**, deploy su **Vercel**.

## Cosa fa

- **Ricettari multipli**: l’admin crea quanti ricettari vuole (pagina *Ricettari*), ognuno con colore e **sezioni** proprie (preset Pasticceria, Cucina o vuoto; sezioni aggiungibili, rinominabili, riordinabili). Una ricetta passa da un ricettario all’altro cambiando la sezione.
- **Elenco** filtrabile per ricettario, sezione e categoria, con ricerca per nome, gruppo **o ingrediente** e ordinamento per gruppo / A→Z / più recenti.
- **Scheda ricetta**: dosi moltiplicabili, totale peso, procedimento numerato con tempi e temperature, note, resa.
- **Editor**: ingredienti riordinabili con autocompletamento, «Incolla elenco» (righe tipo `250 g burro`), passaggi con timer e temperatura, ✂ per dividere un testo lungo in passaggi.
- **Importa con AI**: carica, trascina o **incolla (Ctrl/⌘+V)** uno o più screenshot, oppure incolla testo. L’AI separa le preparazioni (es. massa + cremoso + glassa di un dolce, raggruppate con lo stesso «Piatto»), divide il procedimento e propone sezione e categoria. Controlli e correggi tutto prima di salvare.
- **Modalità cucina**: schermo sempre acceso, spunta degli ingredienti pesati, un passaggio alla volta, timer con suono.
- **Documenti di stampa**: raccogli più ricette con la loro dose e stampa o salva in PDF.
- **Ruoli**: Admin, Chef (modifica), Brigata (sola lettura). Il primo account creato è admin.
- **Gestione cucina (Kitchen Pro integrato)**: più cucine separate, ognuna con brigata, codice d’invito e ruoli propri (Admin, Chef, Sous-chef, Capo partita, Commis…). Dentro c’è tutta Kitchen Pro: giacenze con lotti e scadenze, preparazioni/MEP per partita, spesa e fornitori, economato, servizio e piatti, HACCP, food cost, pannelli AI.

La chiave Groq resta sul server (non è più visibile nel browser come nella versione HTML) e i permessi sono verificati dal database con le Row Level Security.

## Gestione cucina — com’è collegata (fase 1)

- Menu **Cucina** → crea una cucina (serve il ruolo Chef o Admin dell’app) oppure entra con il **codice d’invito**: si entra come commis, poi un Admin/Chef/Sous-chef della cucina assegna il ruolo.
- **Condiviso in tempo reale tra i telefoni della brigata**: giacenze (frigo, freezer, dispensa, banco) con lotti, scadenze e movimenti; preparazioni e MEP; lista spesa; ordini ed economato; piatti del servizio; calendario; sprechi; livelli PAR.
  Ogni modifica viene salvata a versioni: se due persone modificano insieme, le modifiche si uniscono; senza rete si continua a lavorare e i dati partono quando torna la connessione (pallino nell’intestazione: verde sincronizzato, giallo salvataggio, rosso offline).
- **Collegamento con i ricettari** (scelti in *Brigata e impostazioni* della cucina):
  - le ricette compaiono nell’autocompletamento delle preparazioni;
  - nei **piatti del servizio** «📖 Aggiungi da ricettario» inserisce gli ingredienti alla dose scelta e lega la ricetta al piatto (link diretto alla scheda);
  - nel **food cost** «📖 Da ricettario» importa gli ingredienti (convertiti in kg/l) e prende il prezzo dalle giacenze quando c’è.
- **Ancora sul singolo dispositivo** (da portare su database nella fase 2): registri e checklist HACCP, schede food cost e sprechi, semilavorati, task MEP, storico fatture, fine turno SPTTP.
- **Portare i dati dalla vecchia Kitchen Pro**: copia `extra/esporta-dati.html` nella cartella `public/` del vecchio repository e pubblicalo; aprilo dal telefono dove usi Kitchen Pro e scarica il file. Nella nuova app, alla prima apertura della cucina, scegli «Importa da file»: arrivano giacenze, MEP, piatti ecc. e, su quel telefono, anche i dati dei moduli ancora locali.
- L’AI di Kitchen Pro passa da `/api/ai` (stessa chiave `GROQ_API_KEY`), ora protetta dal login e capace di leggere le foto.

---

## Messa online (circa 15 minuti)

### 1. Supabase — nuovo progetto
1. [supabase.com](https://supabase.com) → **New project** (regione: *Central EU – Frankfurt*).
2. **SQL Editor → New query**: incolla tutto `supabase/schema.sql` e premi **Run**.
3. **Authentication → Sign In / Providers → Email**: per un uso interno puoi disattivare *Confirm email*, così gli account funzionano subito.
4. **Project Settings → API**: copia *Project URL*, *anon public key* e (solo per la migrazione) *service_role key*.

### 2. GitHub
Carica questa cartella in un nuovo repository privato (dalla pagina del repo: *Add file → Upload files*, oppure con `git push`).

### 3. Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → importa il repository.
2. In **Environment Variables** aggiungi:

   | Nome | Valore |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL di Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `GROQ_API_KEY` | la tua chiave `gsk_…` da console.groq.com |

3. **Deploy**. Poi in Supabase → **Authentication → URL Configuration** imposta *Site URL* con l’indirizzo Vercel (es. `https://ricettario-mdl.vercel.app`).
4. Apri l’app e **registrati per primo**: diventi admin.
5. In ⚙ Impostazioni dai un nome all’app, poi in **Ricettari** crea il primo ricettario. Promuovi a *Chef* chi deve inserire ricette.

### 4. Importare le ricette della vecchia app
Sul tuo computer (serve Node.js 20+), nella cartella del progetto:

```bash
cp .env.example .env.local      # poi compila i valori
npm install
npm run migrate -- --ricettario "Michele Di Leva" --dry   # prova
npm run migrate -- --ricettario "Michele Di Leva"         # importa davvero
```

Crea (se non esiste) il ricettario indicato con le sezioni Colazioni, Fine Dining, Gelateria, Torte & Pasticceria e ci importa le 181 ricette scritte nel vecchio HTML (`data/legacy-builtin.json`) e, se imposti `OLD_SUPABASE_URL` / `OLD_SUPABASE_ANON_KEY`, anche quelle salvate nel vecchio Supabase (che vincono sulle omonime). È rieseguibile: salta quelle già presenti. Se il vecchio Supabase è in pausa, riattivalo dalla dashboard prima di lanciarlo.

La `service_role key` serve solo qui: **non metterla su Vercel**.

---

## Sviluppo in locale
```bash
npm install
npm run dev     # http://localhost:3000
```

## Struttura
```
app/                 pagine (ricette, ricettari, cucine, importa, documenti, impostazioni, login)
app/api/             import (ricette da screenshot) e ai (pannelli Kitchen Pro)
app/api/import       chiamata a Groq lato server
components/          RecipeList, RecipeView, DraftFields (editor), ImportClient, CookMode…
components/kitchen/  Kitchen Pro (KitchenPro.tsx) e il ponte di sincronizzazione (KitchenApp.tsx)
extra/               esporta-dati.html per la vecchia Kitchen Pro
lib/recipes.ts       tipi, dosi, conversione bozza ↔ database
lib/catalog.ts       nome app, ricettari e sezioni
supabase/schema.sql  tabelle, ruoli, sicurezza, funzione save_recipe
scripts/migrate.mjs  migrazione dal vecchio ricettario
```

## Database
- `recipes` → `recipe_ingredients` (quantità `null` = q.b.) e `recipe_steps` (con `duration_min`, `temperature`)
- `app_settings` (nome e sottotitolo dell’app)
- `books` (i ricettari) → `sections` (le loro sezioni) → `recipes`
- `print_documents` / `print_document_items` (personali per utente)
- `profiles` (ruolo di ogni utente nell’app)
- `kitchens`, `kitchen_members` (brigata e ruoli per cucina), `kitchen_books` (ricettari collegati)
- `kitchen_state` (stato condiviso di Kitchen Pro, salvato con `save_kitchen_state` a versioni, aggiornamenti in realtime)
