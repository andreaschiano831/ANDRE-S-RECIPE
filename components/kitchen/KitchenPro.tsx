// @ts-nocheck
"use client";
import React from "react";
import {
  useState, useEffect, useCallback, useRef, useMemo,
  useReducer, createContext, useContext,
} from "react";
import PiattiView from "./hub/Piatti";
import LineaView from "./hub/Linea";
import PreparazioniHub from "./hub/Preparazioni";
import Panoramica from "./hub/Panoramica";
import ServizioHub from "./hub/Servizio";
import HaccpHub from "./haccp/Haccp";
import Economia from "./econ/Economia";
import MagazzinoHub from "./hub/Magazzino";
import BadgeEmitter from "./hub/Badges";

/* ════ useIsMobile — JS-based reactive, mai window.innerWidth diretto ════ */
function useIsMobile(bp=768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", fn, { passive:true });
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}

/* ════════════════════════════════════════════════════════
   THEME SYSTEM — 4 curated palettes
   ════════════════════════════════════════════════════════ */
const THEMES = {
  carta: {
    name:"Carta Antica", icon:"📜",
    bg:"#F2EDE4", bgAlt:"#EBE4D8", bgCard:"#FFFFFF", bgCardAlt:"#FAF7F2", bgGlass:"rgba(242,237,228,0.90)",
    ink:"#151210", inkSoft:"#3D3530", inkMuted:"#7A7168", inkFaint:"#B0A899", inkGhost:"#D5CFC6",
    accent:"#8B1E2F", accentDeep:"#6A1525", accentGlow:"rgba(139,30,47,0.10)",
    secondary:"#182040", secondaryDeep:"#0F1530",
    gold:"#C19A3E", goldBright:"#D9B44A", goldDim:"rgba(193,154,62,0.30)", goldFaint:"rgba(193,154,62,0.08)",
    success:"#3D7A4A", warning:"#C19A3E", danger:"#8B1E2F",
    div:"rgba(21,18,16,0.07)", divStrong:"rgba(21,18,16,0.14)",
    shadow:"rgba(0,0,0,0.06)", shadowStrong:"rgba(0,0,0,0.12)", grain:0.30,
  },
  ardesia: {
    name:"Ardesia", icon:"🪨",
    bg:"#1A1D24", bgAlt:"#22262F", bgCard:"#262A34", bgCardAlt:"#2C313C", bgGlass:"rgba(26,29,36,0.92)",
    ink:"#E8E4DD", inkSoft:"#C5C0B8", inkMuted:"#8A857D", inkFaint:"#5C5850", inkGhost:"#3A3833",
    accent:"#C75B5B", accentDeep:"#A04040", accentGlow:"rgba(199,91,91,0.15)",
    secondary:"#4A6FA5", secondaryDeep:"#3A5A8A",
    gold:"#D4A843", goldBright:"#E8BC55", goldDim:"rgba(212,168,67,0.30)", goldFaint:"rgba(212,168,67,0.10)",
    success:"#5B9E6F", warning:"#D4A843", danger:"#C75B5B",
    div:"rgba(255,255,255,0.06)", divStrong:"rgba(255,255,255,0.12)",
    shadow:"rgba(0,0,0,0.25)", shadowStrong:"rgba(0,0,0,0.45)", grain:0.15,
  },
  notte: {
    name:"Blu Notte", icon:"🌙",
    bg:"#0D1117", bgAlt:"#151B26", bgCard:"#1A2233", bgCardAlt:"#1F2940", bgGlass:"rgba(13,17,23,0.92)",
    ink:"#E6E1D6", inkSoft:"#B8B3A8", inkMuted:"#6E6A62", inkFaint:"#484540", inkGhost:"#2E2C28",
    accent:"#E85D5D", accentDeep:"#C04040", accentGlow:"rgba(232,93,93,0.12)",
    secondary:"#5B8DD9", secondaryDeep:"#4070B8",
    gold:"#F0C050", goldBright:"#FFD466", goldDim:"rgba(240,192,80,0.28)", goldFaint:"rgba(240,192,80,0.08)",
    success:"#60B878", warning:"#F0C050", danger:"#E85D5D",
    div:"rgba(255,255,255,0.05)", divStrong:"rgba(255,255,255,0.10)",
    shadow:"rgba(0,0,0,0.35)", shadowStrong:"rgba(0,0,0,0.55)", grain:0.12,
  },
  display: {
    name:"Kitchen Display", icon:"📺",
    bg:"#000000", bgAlt:"#111111", bgCard:"#1A1A1A", bgCardAlt:"#222222", bgGlass:"rgba(0,0,0,0.95)",
    ink:"#FFFFFF", inkSoft:"#EEEEEE", inkMuted:"#AAAAAA", inkFaint:"#666666", inkGhost:"#333333",
    accent:"#FF3333", accentDeep:"#CC0000", accentGlow:"rgba(255,51,51,0.20)",
    secondary:"#FFD700", secondaryDeep:"#CCA800",
    gold:"#FFD700", goldBright:"#FFE033", goldDim:"rgba(255,215,0,0.30)", goldFaint:"rgba(255,215,0,0.10)",
    success:"#00CC44", warning:"#FFD700", danger:"#FF3333",
    div:"rgba(255,255,255,0.10)", divStrong:"rgba(255,255,255,0.20)",
    shadow:"rgba(0,0,0,0.60)", shadowStrong:"rgba(0,0,0,0.90)", grain:0,
  },
  avorio: {
    name:"Avorio Reale", icon:"👑",
    bg:"#FDFBF7", bgAlt:"#F5F1EA", bgCard:"#FFFFFF", bgCardAlt:"#FEFCF8", bgGlass:"rgba(253,251,247,0.90)",
    ink:"#1C1810", inkSoft:"#3E3A30", inkMuted:"#807A6E", inkFaint:"#ADA798", inkGhost:"#D8D2C8",
    accent:"#7A2842", accentDeep:"#5C1830", accentGlow:"rgba(122,40,66,0.08)",
    secondary:"#2A3F6A", secondaryDeep:"#1C2E52",
    gold:"#B08A30", goldBright:"#CCA040", goldDim:"rgba(176,138,48,0.28)", goldFaint:"rgba(176,138,48,0.06)",
    success:"#3A7848", warning:"#B08A30", danger:"#7A2842",
    div:"rgba(28,24,16,0.06)", divStrong:"rgba(28,24,16,0.12)",
    shadow:"rgba(0,0,0,0.04)", shadowStrong:"rgba(0,0,0,0.10)", grain:0.25,
  },
};

/* ════════════════════════════════════════════════════════
   STORE — useReducer + localStorage
   ════════════════════════════════════════════════════════ */
const STORAGE_KEY = "kitchen-pro-v4";

/* ════════════════════════════════════════════════════════
   BRIDGE — collegamento con l'app Ricettario (Supabase)
   Impostato dal componente esterno prima del render.
   ════════════════════════════════════════════════════════ */
let BRIDGE = null;

/* Tema: Kitchen Pro usa i colori dell'app (variabili CSS del tema scelto) */
function _hex(v, fb) {
  v = (v || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return "#" + v.slice(1).split("").map(c => c + c).join("");
  return fb;
}
function _rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function _rgba(h, a) { const [r, g, b] = _rgb(h); return `rgba(${r},${g},${b},${a})`; }
function _mix(h, to, k) { const a = _rgb(h), b = _rgb(to); return "#" + a.map((x, i) => Math.round(x + (b[i] - x) * k).toString(16).padStart(2, "0")).join(""); }
function _lum(h) { const [r, g, b] = _rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function appTheme() {
  if (typeof window === "undefined") return THEMES.carta;
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fb) => _hex(cs.getPropertyValue(n), fb);
  const paper = v("--paper", "#F7F2E8"), dark = _lum(paper) < 0.35;
  const ink = v("--ink", "#1C2135"), accent = v("--accent", "#A47A2C"), nav = v("--nav", "#1C2135");
  const primary = dark ? _mix(accent, "#000000", 0.38) : (_lum(nav) > 0.8 ? _mix(accent, "#000000", 0.15) : nav);
  return {
    name: "App", icon: "🎨",
    bg: paper, bgAlt: v("--sunk", "#F2ECDF"), bgCard: v("--card", "#FFFDF8"), bgCardAlt: v("--paper-2", "#EFE7D7"), bgGlass: _rgba(paper, 0.9),
    ink, inkSoft: v("--ink-2", "#4A4F63"), inkMuted: v("--muted", "#857F70"), inkFaint: v("--faint", "#B5AE9E"), inkGhost: v("--line-2", "#D4C7AE"),
    accent: primary, accentDeep: _mix(primary, "#000000", 0.25), accentGlow: _rgba(accent, 0.14),
    secondary: dark ? _mix(accent, "#000000", 0.5) : (_lum(nav) > 0.8 ? "#2E3A5C" : nav), secondaryDeep: dark ? _mix(accent, "#000000", 0.65) : _mix(_lum(nav) > 0.8 ? "#2E3A5C" : nav, "#000000", 0.3),
    gold: accent, goldBright: _mix(accent, "#ffffff", 0.18), goldDim: _rgba(accent, 0.3), goldFaint: _rgba(accent, 0.1),
    success: v("--ok", "#4E7458"), warning: v("--warn", "#B7791F"), danger: v("--danger", "#9B2C3F"),
    div: _rgba(ink, 0.08), divStrong: _rgba(ink, 0.15),
    shadow: dark ? "rgba(0,0,0,0.3)" : "rgba(28,33,53,0.06)", shadowStrong: dark ? "rgba(0,0,0,0.55)" : "rgba(28,33,53,0.14)", grain: 0,
  };
}
function useAppTheme() {
  const [t, setT] = useState(() => appTheme());
  useEffect(() => {
    const h = () => setT(appTheme());
    h(); window.addEventListener("rc-theme", h);
    return () => window.removeEventListener("rc-theme", h);
  }, []);
  return t;
}
const syncEmit = (status) => { try { window.dispatchEvent(new CustomEvent("kp-sync", { detail: status })); } catch {} };
function stateFromData(data) {
  const b = BRIDGE;
  const has = data && typeof data === "object" && Object.keys(data).length > 0;
  const base = has ? data : mkKitchen(b.kitchenName, "Admin");
  const k = ensureKitchen({
    ...base,
    id: b.kitchenId, name: b.kitchenName, code: b.code,
    members: b.members,
    externalAppUrl: base.externalAppUrl || (typeof location !== "undefined" ? location.origin + "/ricette" : ""),
  });
  return { kitchens: [k], selectedKitchenId: b.kitchenId, selectedMemberId: b.userId };
}
function dataFromState(st) {
  const k = st.kitchens.find(x => x.id === BRIDGE.kitchenId) || st.kitchens[0];
  const { members, code, ...rest } = k;
  return rest;
}
const pendingKey = () => "kp-pending-" + BRIDGE.kitchenId;
function loadPending() { try { const a = JSON.parse(localStorage.getItem(pendingKey()) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } }
function savePending(a) { try { if (a.length) localStorage.setItem(pendingKey(), JSON.stringify(a)); else localStorage.removeItem(pendingKey()); } catch {} }
const nowISO  = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0,10);
const genId   = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);

function mapStock(k, loc) {
  if (loc==="freezer") return k.freezer;
  if (loc==="fridge")  return k.fridge;
  if (loc==="dry")     return k.dry;
  return k.counter;
}
function setStock(k, loc, next) {
  if (loc==="freezer") return {...k, freezer:next};
  if (loc==="fridge")  return {...k, fridge:next};
  if (loc==="dry")     return {...k, dry:next};
  return {...k, counter:next};
}
function findLoc(k, id) {
  if (k.freezer.some(x=>x.id===id)) return "freezer";
  if (k.fridge.some(x=>x.id===id))  return "fridge";
  if (k.dry.some(x=>x.id===id))     return "dry";
  if (k.counter.some(x=>x.id===id)) return "counter";
  return null;
}
function mkKitchen(name, ownerName="Admin") {
  const owner = { id:genId(), name:ownerName.trim()||"Admin", role:"admin", joinedAt:nowISO() };
  return {
    id:genId(), name:name.trim(), ownerName:owner.name, createdAt:nowISO(),
    code:(Math.random().toString(36).slice(2,5)+"-"+Math.floor(1000+Math.random()*9000)).toUpperCase(),
    members:[owner], freezer:[], fridge:[], dry:[], counter:[],
    parByCategory:{}, shopping:[], ledger:[],
  };
}
function ensureKitchen(k) {
  return {
    ledger:[], shopping:[], parByCategory:{},
    freezer:[], fridge:[], dry:[], counter:[],
    members:[],
    // v3 — nuovi array
    preparazioni:[], mepItems:[],
    ordini:[], spesaV2:[],
    tempLogs:[], lots:[], ricette:[], ingredienti:[],
    wasteLog:[], tickets:[],
    service:null,
    piatti:[], calendarNotes:[], servizioLog:[],
    listino:[], servizioPiano:{coperti:40, perPiatto:{}}, fcTarget:30,
    externalAppUrl:"",
    ...k
  };
}

function reducer(state, action) {
  const { kitchens } = state;
  const mapK = (id, fn) => kitchens.map(k => k.id!==id ? k : fn(ensureKitchen(k)));

  switch (action.type) {
    case "__REPLACE__":
      return action.state;
    case "KITCHEN_CREATE":
      return { ...state, kitchens:[...kitchens, action.kitchen], selectedKitchenId:action.kitchen.id, selectedMemberId:action.kitchen.members[0]?.id };
    case "KITCHEN_SELECT":
      return { ...state, selectedKitchenId:action.id };
    case "MEMBER_SELECT":
      return { ...state, selectedMemberId:action.id };
    case "MEMBER_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, members:[...k.members, action.member]})) };
    case "MEMBER_ROLE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, members:k.members.map(m=>m.id!==action.memberId?m:{...m,role:action.role})})) };
    case "MEMBER_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, members:k.members.filter(m=>m.id!==action.memberId)})), selectedMemberId: state.selectedMemberId===action.memberId?undefined:state.selectedMemberId };
    case "PAR_CATEGORY":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, parByCategory:{...k.parByCategory,[action.key]:action.par}})) };
    case "INGREDIENTE_ADD": {
      const k2=state.kitchens.find(k=>k.id===action.kitchenId);
      return {...state, kitchens:state.kitchens.map(k=>k.id===action.kitchenId
        ? {...k, ingredienti:[action.item,...(k.ingredienti||[])]}
        : k)};
    }
    case "INGREDIENTE_REMOVE": {
      return {...state, kitchens:state.kitchens.map(k=>k.id===action.kitchenId
        ? {...k, ingredienti:(k.ingredienti||[]).filter((x:any)=>x.id!==action.id)}
        : k)};
    }
    case "STOCK_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => { const loc=action.item.location; return setStock(k,loc,[action.item,...mapStock(k,loc)]); }) };
    case "ITEM_ADJUST":
      return { ...state, kitchens: mapK(action.kitchenId, k => { const loc=findLoc(k,action.id); if(!loc)return k; return setStock(k,loc,mapStock(k,loc).map(x=>x.id!==action.id?x:{...x,quantity:Math.max(0,(x.quantity||0)+action.delta)}).filter(x=>x.quantity>0)); }) };
    case "ITEM_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => { const loc=findLoc(k,action.id); if(!loc)return k; return setStock(k,loc,mapStock(k,loc).filter(x=>x.id!==action.id)); }) };
    case "ITEM_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k => { const loc=findLoc(k,action.id); if(!loc)return k; return setStock(k,loc,mapStock(k,loc).map(x=>x.id===action.id?{...x,...action.patch}:x)); }) };
    case "ITEM_PAR":
      return { ...state, kitchens: mapK(action.kitchenId, k => { const loc=findLoc(k,action.id); if(!loc)return k; return setStock(k,loc,mapStock(k,loc).map(x=>x.id!==action.id?x:{...x,parLevel:action.par})); }) };
    case "ITEM_EXTEND_EXPIRY": {
      return { ...state, kitchens: mapK(action.kitchenId, k => {
        const loc=findLoc(k,action.id); if(!loc)return k;
        return setStock(k,loc,mapStock(k,loc).map(x=>{
          if(x.id!==action.id) return x;
          const base = x.expiresAt ? new Date(x.expiresAt) : new Date();
          base.setDate(base.getDate() + action.days);
          return {...x, expiresAt: base.toISOString()};
        }));
      })};
    }
    case "ITEM_SET_EXPIRY": {
      return { ...state, kitchens: mapK(action.kitchenId, k => {
        const loc=findLoc(k,action.id); if(!loc)return k;
        return setStock(k,loc,mapStock(k,loc).map(x=>
          x.id!==action.id ? x : {...x, expiresAt: action.iso}
        ));
      })};
    }
    case "STOCK_MOVE": {
      return { ...state, kitchens: mapK(action.kitchenId, k => {
        const fromLoc = findLoc(k,action.id); if(!fromLoc)return k;
        const src = mapStock(k,fromLoc).find(x=>x.id===action.id); if(!src)return k;
        const qty = Math.min(Number(action.qty)||0, src.quantity); if(qty<=0)return k;
        const remaining = src.quantity - qty;
        const moved = {...src, id:genId(), location:action.to, quantity:qty, insertedAt:nowISO(), insertedDate:todayDate()};
        const ledgerRow = {id:genId(), at:nowISO(), itemId:src.id, name:src.name, qty, unit:src.unit, from:fromLoc, to:action.to, lot:src.lot};
        let upd = setStock(k, fromLoc, mapStock(k,fromLoc).map(x=>x.id!==action.id?x:{...x,quantity:remaining}).filter(x=>x.quantity>0));
        upd = setStock(upd, action.to, [moved, ...mapStock(upd,action.to)]);
        return {...upd, ledger:[ledgerRow, ...upd.ledger]};
      })};
    }
    case "SHOP_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, shopping:[action.item,...k.shopping]})) };
    case "SHOP_TOGGLE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, shopping:k.shopping.map(x=>x.id!==action.id?x:{...x,checked:!x.checked})})) };
    case "SHOP_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, shopping:k.shopping.filter(x=>x.id!==action.id)})) };
    case "SHOP_CLEAR":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({...k, shopping:k.shopping.filter(x=>!x.checked || (action.cat && x.category!==action.cat))})) };

    /* ── PREPARAZIONI ─────────────────────────────── */
    case "PREP_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, preparazioni:[action.prep, ...(k.preparazioni||[])]
      }))};
    case "PREP_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, preparazioni:(k.preparazioni||[]).map(p=>p.id!==action.id?p:{...p,...action.patch})
      }))};
    case "PREP_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, preparazioni:(k.preparazioni||[]).filter(p=>p.id!==action.id)
      }))};
    case "PREP_STATUS": {
      const now = nowISO();
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, preparazioni:(k.preparazioni||[]).map(p=>p.id!==action.id?p:{
          ...p, status:action.status,
          svoltaIl: action.status==="svolta"&&!p.svoltaIl ? now : p.svoltaIl,
          smistataIl: action.status==="smistata" ? now : p.smistataIl,
        })
      }))};
    }
    /* ── MEP ITEMS ─────────────────────────────────── */
    case "MEP_ITEM_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, mepItems:[action.item, ...(k.mepItems||[])]
      }))};
    case "MEP_ITEM_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, mepItems:(k.mepItems||[]).map(x=>x.id!==action.id?x:{...x,...action.patch})
      }))};
    case "MEP_ITEM_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, mepItems:(k.mepItems||[]).filter(x=>x.id!==action.id)
      }))};
    case "MEP_SERVICE_LEVEL":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, mepItems:(k.mepItems||[]).map(x=>x.id!==action.id?x:{...x,livelloServizio:action.level})
      }))};
    /* ── ECONOMATO ─────────────────────────────────── */
    case "ORDINE_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, ordini:[action.ordine, ...(k.ordini||[])]
      }))};
    case "ORDINE_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, ordini:(k.ordini||[]).map(o=>o.id!==action.id?o:{...o,...action.patch})
      }))};
    case "RICEZIONE_CONFERMATA": {
      // UNICO punto che aggiorna stock da economato
      const ordine = state.kitchens.find(k=>k.id===action.kitchenId)?.ordini?.find(o=>o.id===action.ordineId);
      if(!ordine) return state;
      const nuoveGiacenze = (action.ricezioni||[]).map(r=>({
        id:genId(), name:r.nome, quantity:r.quantitaRicevuta, unit:r.unitaMisura,
        location:"dry", category:"economato",
        parLevel:0, expiresAt:r.scadeIl||null, lot:r.codiceLotto||null,
        prezzoUnitario:r.prezzoUnitario||null, // SOLO su questo oggetto in economato
        insertedAt:nowISO(), insertedDate:todayDate(),
        notes:`Ordine ${ordine.id.slice(-4)} · ${r.fornitore||""}`,
      }));
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k,
        dry:[...nuoveGiacenze, ...(k.dry||[])],
        ordini:(k.ordini||[]).map(o=>o.id!==action.ordineId?o:{
          ...o, status:"ricevuto", ricezioneConfermataIl:nowISO(),
        }),
      }))};
    }
    /* ── LISTA SPESA V2 (tipologia × frequenza) ─────── */
    case "SPESA_V2_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, spesaV2:[action.item, ...(k.spesaV2||[])]
      }))};
    case "SPESA_V2_TOGGLE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, spesaV2:(k.spesaV2||[]).map(x=>x.id!==action.id?x:{...x,checked:!x.checked})
      }))};
    case "SPESA_V2_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, spesaV2:(k.spesaV2||[]).map(x=>x.id!==action.id?x:{...x,...action.patch})
      }))};
    case "SPESA_V2_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, spesaV2:(k.spesaV2||[]).filter(x=>x.id!==action.id)
      }))};
    case "SPESA_V2_CLEAR":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, spesaV2:(k.spesaV2||[]).filter(x=>!x.checked)
      }))};
    /* ── WASTE LOG ──────────────────────────────────── */
    case "WASTE_LOG":
      return { ...state, kitchens: mapK(action.kitchenId, k => ({
        ...k, wasteLog:[action.entry, ...(k.wasteLog||[])]
      }))};
    /* ── PIATTI ─────────────────────────────────────── */
    case "PIATTO_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, piatti:[action.piatto,...(k.piatti||[])]}))};
    case "PIATTO_UPDATE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, piatti:(k.piatti||[]).map(p=>p.id!==action.id?p:{...p,...action.patch})}))};
    case "PIATTO_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, piatti:(k.piatti||[]).filter(p=>p.id!==action.id)}))};
    case "PIATTO_TOGGLE_ACTIVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, piatti:(k.piatti||[]).map(p=>p.id!==action.id?p:{...p,attivo:!p.attivo})}))};
    case "CALENDAR_NOTE_ADD":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, calendarNotes:[action.note,...(k.calendarNotes||[])]}))};
    case "CALENDAR_NOTE_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, calendarNotes:(k.calendarNotes||[]).filter(n=>n.id!==action.id)}))};
    /* ── LISTINO PREZZI, PIANO DI SERVIZIO ──────────── */
    case "LISTINO_UPSERT":
      return { ...state, kitchens: mapK(action.kitchenId, k=>{
        const list = k.listino||[];
        const has = list.some(x=>x.id===action.item.id);
        return {...k, listino: has ? list.map(x=>x.id===action.item.id?{...x,...action.item}:x) : [action.item, ...list]};
      })};
    case "LISTINO_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, listino:(k.listino||[]).filter(x=>x.id!==action.id)}))};
    /* ── HACCP: impostazioni (frighi, attrezzature, friggitrici, scadenze) ── */
    case "HACCP_CFG_UPSERT":
      return { ...state, kitchens: mapK(action.kitchenId, k=>{
        const h = k.haccp||{}; const list = h[action.key]||[];
        const has = list.some(x=>x.id===action.item.id);
        return {...k, haccp:{...h, [action.key]: has ? list.map(x=>x.id===action.item.id?{...x,...action.item}:x) : [...list, action.item]}};
      })};
    case "HACCP_CFG_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>{ const h=k.haccp||{}; return {...k, haccp:{...h, [action.key]:(h[action.key]||[]).filter(x=>x.id!==action.id)}}; })};
    case "KITCHEN_PATCH": {
      const allowed = ["servizioPiano","fcTarget"];
      const patch = Object.fromEntries(Object.entries(action.patch||{}).filter(([key])=>allowed.includes(key)));
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, ...patch}))};
    }
    /* ── MOVIMENTI DI GIACENZA (servizio, smistamento, rifornimento) ──
       Un'unica azione con variazioni relative: si riapplica bene sopra i dati
       di un altro dispositivo e si può annullare. */
    case "STOCK_OPS":
      return { ...state, kitchens: mapK(action.kitchenId, k=>{
        let kk = k;
        for (const op of action.ops||[]) {
          if (op.add) {
            if (findLoc(kk, op.add.id)) continue;
            const loc = op.add.location||"fridge";
            kk = setStock(kk, loc, [op.add, ...mapStock(kk,loc)]);
            continue;
          }
          const loc = findLoc(kk, op.id); if(!loc) continue;
          kk = setStock(kk, loc, mapStock(kk,loc)
            .map(x=>x.id!==op.id?x:{...x, ...(op.patch||{}), quantity: Math.max(0, Math.round(((x.quantity||0)+(op.delta||0))*1000)/1000)})
            .filter(x=>x.id!==op.id || op.keep || x.quantity>0));
        }
        if (action.log) kk = {...kk, servizioLog:[action.log, ...(kk.servizioLog||[])].slice(0,300)};
        if (action.undoLogId) kk = {...kk, servizioLog:(kk.servizioLog||[]).map(l=>l.id===action.undoLogId?{...l,undone:true}:l)};
        if (action.prep) kk = {...kk, preparazioni:(kk.preparazioni||[]).map(p=>p.id!==action.prep.id?p:{...p, ...action.prep.patch})};
        return kk;
      })};
    case "WASTE_REMOVE":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, wasteLog:(k.wasteLog||[]).filter(x=>x.id!==action.id)}))};
    case "KITCHEN_SET_EXTERNAL_URL":
      return { ...state, kitchens: mapK(action.kitchenId, k=>({...k, externalAppUrl:action.url}))};
    default: return state;
  }
}

function loadState() {
  try {
    // Migration: normalizza reparto cucina_calda → antipasti
    try {
      const raw0 = localStorage.getItem(STORAGE_KEY);
      if(raw0 && raw0.includes('"cucina_calda"')) {
        const fixed = raw0.replace(/"cucina_calda"/g, '"antipasti"');
        localStorage.setItem(STORAGE_KEY, fixed);
      }
    } catch {}
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kitchens:[] };
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.kitchens)) return { kitchens:[] };
    p.kitchens = p.kitchens.map(ensureKitchen);
    return p;
  } catch { return { kitchens:[] }; }
}

const KCtx = createContext(null);

function KitchenProvider({ children }) {
  // Stato condiviso: parte dal database, le modifiche locali sono azioni del reducer
  // che vengono salvate a versioni; in caso di conflitto si ricaricano i dati remoti
  // e si riapplicano sopra le azioni non ancora salvate.
  const pendingRef = useRef(null);
  if (pendingRef.current === null) pendingRef.current = loadPending();
  const stateRef = useRef(null);
  if (stateRef.current === null) stateRef.current = pendingRef.current.reduce(reducer, stateFromData(BRIDGE.initialData));
  const [state, setState] = useState(stateRef.current);
  const versionRef = useRef(BRIDGE.initialVersion || 0);
  const flushingRef = useRef(false);
  const timerRef = useRef(null);

  const replace = (next) => { stateRef.current = next; setState(next); };
  const schedule = (ms = 700) => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => flush(), ms); };

  async function flush() {
    if (flushingRef.current || !pendingRef.current.length) return;
    flushingRef.current = true;
    syncEmit("saving");
    let retry = false;
    try {
      const n = pendingRef.current.length;
      const res = await BRIDGE.sync.save(dataFromState(stateRef.current), versionRef.current);
      versionRef.current = res.version;
      if (res.ok) {
        pendingRef.current = pendingRef.current.slice(n);
        savePending(pendingRef.current);
        syncEmit(pendingRef.current.length ? "saving" : "saved");
      } else {
        // qualcuno ha salvato prima: riparto dai suoi dati e riapplico le mie modifiche
        replace(pendingRef.current.reduce(reducer, stateFromData(res.data)));
        retry = true;
      }
    } catch (e) {
      console.warn("Sync cucina:", e);
      syncEmit("offline");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(), 8000);
    } finally {
      flushingRef.current = false;
    }
    if (retry || pendingRef.current.length) schedule(retry ? 0 : 700);
  }

  async function refreshFromRemote() {
    if (pendingRef.current.length || flushingRef.current) return;
    try {
      const v = await BRIDGE.sync.version();
      if (v <= versionRef.current) return;
      const remote = await BRIDGE.sync.load();
      if (pendingRef.current.length || flushingRef.current || remote.version <= versionRef.current) return;
      versionRef.current = remote.version;
      replace(stateFromData(remote.data));
      syncEmit("saved");
    } catch { syncEmit("offline"); }
  }

  useEffect(() => {
    if (pendingRef.current.length) schedule(300); else syncEmit("saved");
    const unsub = BRIDGE.sync.subscribe(() => refreshFromRemote());
    const poll = setInterval(refreshFromRemote, 20000);
    const onOnline = () => { if (pendingRef.current.length) flush(); else refreshFromRemote(); };
    const onVis = () => { if (document.visibilityState === "visible") onOnline(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => { unsub && unsub(); clearInterval(poll); clearTimeout(timerRef.current);
      window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const dispatch = useCallback((action) => {
    if (["KITCHEN_CREATE","KITCHEN_SELECT","MEMBER_SELECT","MEMBER_ADD","MEMBER_ROLE","MEMBER_REMOVE"].includes(action.type)) return; // gestiti dall'app
    stateRef.current = reducer(stateRef.current, action);
    pendingRef.current.push(action);
    savePending(pendingRef.current);
    setState(stateRef.current);
    schedule();
  }, []);

  const api = useMemo(() => {
    const kid = () => state.selectedKitchenId || state.kitchens[0]?.id;
    const curKitchen = () => state.kitchens.find(k=>k.id===kid());

    return {
      state,
      kitchen: curKitchen(),
      currentRole: () => { const k=curKitchen(); if(!k)return"admin"; const m=k.members.find(x=>x.id===state.selectedMemberId)||k.members[0]; return m?.role||"admin"; },
      allItems: () => { const k=curKitchen(); if(!k)return[]; return [...k.freezer,...k.fridge,...k.dry,...k.counter]; },

      createKitchen: (name, owner) => { if(!(name||"").trim())return; dispatch({type:"KITCHEN_CREATE", kitchen:mkKitchen(name,owner)}); },
      selectKitchen: (id) => dispatch({type:"KITCHEN_SELECT",id}),
      selectMember: (id) => dispatch({type:"MEMBER_SELECT",id}),

      addMember: (name, role="staff") => { const k=kid(); if(!k||!(name||"").trim())return; dispatch({type:"MEMBER_ADD",kitchenId:k,member:{id:genId(),name:name.trim(),role,joinedAt:nowISO()}}); },
      updateRole: (memberId, role) => { const k=kid(); if(k)dispatch({type:"MEMBER_ROLE",kitchenId:k,memberId,role}); },
      removeMember: (memberId) => { const k=kid(); if(k)dispatch({type:"MEMBER_REMOVE",kitchenId:k,memberId}); },

      setParCategory: (key, par) => { const k=kid(); if(k)dispatch({type:"PAR_CATEGORY",kitchenId:k,key,par:Math.max(0,Number(par)||0)}); },

      ingredienteAdd: (item:any) => { const k=kid(); if(k) dispatch({type:"INGREDIENTE_ADD",kitchenId:k,item:{...item,id:genId(),createdAt:nowISO()}}); },
      ingredienteRemove: (id:string) => { const k=kid(); if(k) dispatch({type:"INGREDIENTE_REMOVE",kitchenId:k,id}); },
      stockAdd: (item) => {
        if(API_URL && getToken()) apiFetch("/stock",{method:"POST",body:JSON.stringify(item)}).catch(console.warn);
        const k=kid(); if(!k)return;
        const name=(item.name||"").trim(); const qty=Number(item.quantity);
        if(!name||!isFinite(qty)||qty<=0)return;
        dispatch({type:"STOCK_ADD",kitchenId:k,item:{
          id:genId(),name,quantity:qty,unit:item.unit||"pz",location:item.location||"fridge",
          insertedAt:item.insertedAt||nowISO(),insertedDate:item.insertedDate||todayDate(),
          expiresAt:item.expiresAt,lot:item.lot,notes:item.notes,category:item.category,
          parLevel:item.parLevel, partita:item.partita||undefined,
          recipeId:item.recipeId||undefined, prezzoUnitario:item.prezzoUnitario||undefined,
        }});
      },
      adjustItem: (id, delta) => { const k=kid(); if(k)dispatch({type:"ITEM_ADJUST",kitchenId:k,id,delta:Number(delta)||0}); },
      removeItem: (id) => { const k=kid(); if(k)dispatch({type:"ITEM_REMOVE",kitchenId:k,id}); if(API_URL && getToken()) apiFetch(`/stock/${id}`,{method:"DELETE"}).catch(console.warn); },
      itemUpdate: (id, patch) => { const k=kid(); if(k)dispatch({type:"ITEM_UPDATE",kitchenId:k,id,patch}); },
      setItemPar: (id, par) => { const k=kid(); if(k)dispatch({type:"ITEM_PAR",kitchenId:k,id,par}); },
      moveStock: (id, qty, to) => { const k=kid(); if(k)dispatch({type:"STOCK_MOVE",kitchenId:k,id,qty,to}); },
      extendExpiry: (id, days) => { const k=kid(); if(k)dispatch({type:"ITEM_EXTEND_EXPIRY",kitchenId:k,id,days:Number(days)||0}); },
      setExpiry: (id, iso) => { const k=kid(); if(k)dispatch({type:"ITEM_SET_EXPIRY",kitchenId:k,id,iso}); },

      shopAdd: (name, qty, unit, category, notes) => {
        const k=kid(); if(!k)return;
        const n=(name||"").trim(); const q=Number(qty);
        if(!n||!isFinite(q)||q<=0)return;
        dispatch({type:"SHOP_ADD",kitchenId:k,item:{id:genId(),name:n,quantity:q,unit,category,notes:(notes||"").trim()||undefined,checked:false,createdAt:nowISO()}});
      },
      
      // ── PREPARAZIONI ──────────────────────────────
      prepAdd: (nome, qty, unit, categoria, reparto, turno, note, scadeIl=null) => {
        if(API_URL && getToken()) apiFetch("/prep",{method:"POST",body:JSON.stringify({nome,qty,unit,categoriaKey:categoria,reparto,turno,note,scadeIl})}).catch(console.warn);
        const k=kid(); if(!k||!nome.trim()) return;
        dispatch({type:"PREP_ADD", kitchenId:k, prep:{
          id:genId(), nome:nome.trim(), categoriaKey:categoria||"antipasti",
          reparto:reparto||"antipasti", partita:reparto||"antipasti", turno:turno||"mattina", station:reparto||"antipasti",
          quantita:Number(qty)||1, unitaMisura:unit||"pz",
          status:"da_fare", destinazione:null,
          svoltaIl:null, smistataIl:null,
          scadeIl:scadeIl||null, note:note||null,
          createdAt:nowISO(),
        }});
      },
      prepAddFull: (prep) => { const k=kid(); if(!k||!(prep.nome||"").trim()) return;
        dispatch({type:"PREP_ADD", kitchenId:k, prep:{
          categoriaKey:prep.partita||"antipasti", reparto:prep.partita||"antipasti", partita:prep.partita||"antipasti",
          station:prep.partita||"antipasti", turno:"mattina", status:"da_fare", destinazione:null, svoltaIl:null, smistataIl:null,
          scadeIl:null, note:null, ...prep, id:genId(), nome:prep.nome.trim(), createdAt:nowISO(),
        }}); },
      prepUpdate: (id, patch) => { const k=kid(); if(k)dispatch({type:"PREP_UPDATE",kitchenId:k,id,patch}); },
      prepRemove: (id) => { const k=kid(); if(k)dispatch({type:"PREP_REMOVE",kitchenId:k,id}); },
      prepStatus: (id, status) => { const k=kid(); if(k)dispatch({type:"PREP_STATUS",kitchenId:k,id,status}); },
      // ── MEP ITEMS ─────────────────────────────────
      mepItemAdd: (item) => { const k=kid(); if(k)dispatch({type:"MEP_ITEM_ADD",kitchenId:k,item:{...item,id:genId(),createdAt:nowISO(),livelloServizio:4}}); },
      mepItemUpdate: (id, patch) => { const k=kid(); if(k)dispatch({type:"MEP_ITEM_UPDATE",kitchenId:k,id,patch}); },
      mepItemRemove: (id) => { const k=kid(); if(k)dispatch({type:"MEP_ITEM_REMOVE",kitchenId:k,id}); },
      mepServiceLevel: (id, level) => { const k=kid(); if(k)dispatch({type:"MEP_SERVICE_LEVEL",kitchenId:k,id,level}); },
      // ── ECONOMATO ─────────────────────────────────
      ordineAdd: (fornitore, items) => {
        const k=kid(); if(!k) return;
        dispatch({type:"ORDINE_ADD", kitchenId:k, ordine:{
          id:genId(), data:todayDate(), fornitore:fornitore||"",
          items:items||[], status:"bozza",
          inviatoIl:null, ricezioneConfermataIl:null, note:null,
        }});
      },
      ordineUpdate: (id, patch) => { const k=kid(); if(k)dispatch({type:"ORDINE_UPDATE",kitchenId:k,id,patch}); },
      confermRicezione: (ordineId, ricezioni) => { const k=kid(); if(k)dispatch({type:"RICEZIONE_CONFERMATA",kitchenId:k,ordineId,ricezioni}); },
      // ── SPESA V2 ──────────────────────────────────
      spesaV2Add: (nome, qty, unit, tipologia, frequenza, note, fornitore="") => {
        const k=kid(); if(!k||!nome.trim()) return;
        dispatch({type:"SPESA_V2_ADD", kitchenId:k, item:{
          id:genId(), nome:nome.trim(), quantita:Number(qty)||1, unitaMisura:unit||"pz",
          tipologia:tipologia||"alimenti", frequenza:frequenza||"giornaliero",
          note:note||null, fornitore:fornitore||null, checked:false, createdAt:nowISO(),
        }});
      },
      spesaV2Update: (id,patch) => { const k=kid(); if(k)dispatch({type:"SPESA_V2_UPDATE",kitchenId:k,id,patch}); },
      spesaV2Toggle: (id) => { const k=kid(); if(k)dispatch({type:"SPESA_V2_TOGGLE",kitchenId:k,id}); },
      spesaV2Remove: (id) => { const k=kid(); if(k)dispatch({type:"SPESA_V2_REMOVE",kitchenId:k,id}); },
      spesaV2Clear: () => { const k=kid(); if(k)dispatch({type:"SPESA_V2_CLEAR",kitchenId:k}); },
      // ── WASTE ─────────────────────────────────────
      logWaste: (entry) => { const k=kid(); if(k)dispatch({type:"WASTE_LOG",kitchenId:k,entry:{...entry,id:genId(),at:nowISO()}}); },
      shopToggle: (id) => { const k=kid(); if(k)dispatch({type:"SHOP_TOGGLE",kitchenId:k,id}); },
      shopRemove: (id) => { const k=kid(); if(k)dispatch({type:"SHOP_REMOVE",kitchenId:k,id}); },
      shopClear: (cat) => { const k=kid(); if(k)dispatch({type:"SHOP_CLEAR",kitchenId:k,cat}); },
      // ── PIATTI ────────────────────────────────────
      piattoAdd: (piatto) => { const k=kid(); if(!k) return; dispatch({type:"PIATTO_ADD",kitchenId:k,piatto:{...piatto,id:genId(),createdAt:nowISO(),attivo:true}}); },
      piattoUpdate: (id,patch) => { const k=kid(); if(k)dispatch({type:"PIATTO_UPDATE",kitchenId:k,id,patch}); },
      piattoRemove: (id) => { const k=kid(); if(k)dispatch({type:"PIATTO_REMOVE",kitchenId:k,id}); },
      piattoToggleActive: (id) => { const k=kid(); if(k)dispatch({type:"PIATTO_TOGGLE_ACTIVE",kitchenId:k,id}); },
      addCalendarNote: (note) => { const k=kid(); if(k)dispatch({type:"CALENDAR_NOTE_ADD",kitchenId:k,note:{...note,id:genId(),createdAt:nowISO()}}); },
      removeCalendarNote: (id) => { const k=kid(); if(k)dispatch({type:"CALENDAR_NOTE_REMOVE",kitchenId:k,id}); },
      listinoUpsert: (item) => { const k=kid(); if(k)dispatch({type:"LISTINO_UPSERT",kitchenId:k,item:{...item,id:item.id||genId(),aggiornatoIl:nowISO()}}); },
      listinoRemove: (id) => { const k=kid(); if(k)dispatch({type:"LISTINO_REMOVE",kitchenId:k,id}); },
      kitchenPatch: (patch) => { const k=kid(); if(k)dispatch({type:"KITCHEN_PATCH",kitchenId:k,patch}); },
      stockOps: (ops, extra={}) => { const k=kid(); if(k && (ops?.length || extra.prep || extra.log || extra.undoLogId)) dispatch({type:"STOCK_OPS",kitchenId:k,ops:ops||[],...extra}); },
      haccpUpsert: (key, item) => { const k=kid(); if(k && item?.id) dispatch({type:"HACCP_CFG_UPSERT",kitchenId:k,key,item}); },
      haccpRemove: (key, id) => { const k=kid(); if(k) dispatch({type:"HACCP_CFG_REMOVE",kitchenId:k,key,id}); },
      wasteRemove: (id) => { const k=kid(); if(k)dispatch({type:"WASTE_REMOVE",kitchenId:k,id}); },
      canEdit: () => { const k=curKitchen(); const m=k?.members.find(x=>x.id===state.selectedMemberId)||k?.members[0]; return CAN_EDIT.includes(m?.role||"admin"); },
      setExternalAppUrl: (url) => { const k=kid(); if(k)dispatch({type:"KITCHEN_SET_EXTERNAL_URL",kitchenId:k,url}); },
    };
  }, [state]);
  useEffect(() => { if (BRIDGE.onApi) BRIDGE.onApi(api); }, [api]);

  return <KCtx.Provider value={api}>{children}</KCtx.Provider>;
}
export const useK = () => useContext(KCtx);
export const getBridge = () => BRIDGE;

/* ════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════ */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type="info") => {
    const id = genId();
    setToasts(p=>[...p, {id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3000);
  },[]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{position:"fixed",bottom:"calc(96px + env(safe-area-inset-bottom))",left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",gap:8,pointerEvents:"none",width:"max-content",maxWidth:"calc(100vw - 32px)"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{
            padding:"10px 18px",borderRadius:10,fontSize:12,fontFamily:"var(--mono)",fontWeight:500,
            letterSpacing:"0.04em",
            background: t.type==="success"?"#3D7A4A": t.type==="error"?"#8B1E2F":"#C19A3E",
            color:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
            animation:"toastIn 0.3s cubic-bezier(0.4,0,0.2,1) both",
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ════════════════════════════════════════════════════════
   SPEECH HOOK
   ════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ════════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return {hasError:true,error:e};}
  componentDidCatch(e,info){console.error("KP ErrorBoundary:",e,info);}
  render(){
    if(this.state.hasError){
      return(
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0d0d0d",flexDirection:"column",gap:16,padding:24}}>
          <div style={{color:"#C19A3E",fontFamily:"Georgia,serif",fontSize:24,fontStyle:"italic"}}>Qualcosa è andato storto</div>
          <div style={{color:"#666",fontFamily:"monospace",fontSize:11,maxWidth:400,textAlign:"center"}}>{String(this.state.error)}</div>
          <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",borderRadius:8,border:"none",cursor:"pointer",background:"#C19A3E",color:"#fff",fontFamily:"monospace",fontSize:11}}>Ricarica</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ════════════════════════════════════════════════════════
   PRODUCT CATALOG — 120+ prodotti con shelf life
   ════════════════════════════════════════════════════════ */
export const PRODUCT_CATALOG = [
  {n:"Filetto manzo",c:"proteine",u:"kg",macro:"alimenti",shelf:4},
  {n:"Costata di manzo",c:"proteine",u:"kg",macro:"alimenti",shelf:4},
  {n:"Controfiletto",c:"proteine",u:"kg",macro:"alimenti",shelf:4},
  {n:"Petto di pollo",c:"proteine",u:"kg",macro:"alimenti",shelf:3},
  {n:"Coscia di pollo",c:"proteine",u:"kg",macro:"alimenti",shelf:3},
  {n:"Pancetta tesa",c:"proteine",u:"kg",macro:"alimenti",shelf:7},
  {n:"Guanciale",c:"proteine",u:"kg",macro:"alimenti",shelf:14},
  {n:"Lonza di maiale",c:"proteine",u:"kg",macro:"alimenti",shelf:4},
  {n:"Coniglio",c:"proteine",u:"kg",macro:"alimenti",shelf:3},
  {n:"Agnello",c:"proteine",u:"kg",macro:"alimenti",shelf:3},
  {n:"Anatra",c:"proteine",u:"kg",macro:"alimenti",shelf:3},
  {n:"Foie gras",c:"proteine",u:"kg",macro:"alimenti",shelf:5},
  {n:"Wagyu",c:"proteine",u:"kg",macro:"alimenti",shelf:4},
  {n:"Branzino fresco",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Orata fresca",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Tonno rosso",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Salmone fresco",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Gamberi rossi",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Capesante",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Astice",c:"pesce",u:"pz",macro:"alimenti",shelf:1},
  {n:"Polpo",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Seppie",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Vongole",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Cozze",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Ricci di mare",c:"pesce",u:"kg",macro:"alimenti",shelf:1},
  {n:"Acciughe",c:"pesce",u:"kg",macro:"alimenti",shelf:3},
  {n:"Dentice",c:"pesce",u:"kg",macro:"alimenti",shelf:2},
  {n:"Asparagi",c:"verdure",u:"kg",macro:"alimenti",shelf:4},
  {n:"Carciofi",c:"verdure",u:"pz",macro:"alimenti",shelf:5},
  {n:"Pomodori San Marzano",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Pomodori ciliegino",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Rucola",c:"verdure",u:"kg",macro:"alimenti",shelf:3},
  {n:"Spinaci",c:"verdure",u:"kg",macro:"alimenti",shelf:3},
  {n:"Zucchine",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Melanzane",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Peperoni",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Cipolla bianca",c:"verdure",u:"kg",macro:"alimenti",shelf:14},
  {n:"Cipolla di Tropea",c:"verdure",u:"kg",macro:"alimenti",shelf:10},
  {n:"Aglio",c:"verdure",u:"kg",macro:"alimenti",shelf:30},
  {n:"Carote",c:"verdure",u:"kg",macro:"alimenti",shelf:10},
  {n:"Sedano",c:"verdure",u:"kg",macro:"alimenti",shelf:7},
  {n:"Topinambur",c:"verdure",u:"kg",macro:"alimenti",shelf:7},
  {n:"Tartufo nero",c:"verdure",u:"g",macro:"alimenti",shelf:7},
  {n:"Tartufo bianco",c:"verdure",u:"g",macro:"alimenti",shelf:5},
  {n:"Funghi porcini",c:"verdure",u:"kg",macro:"alimenti",shelf:3},
  {n:"Funghi champignon",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Patate",c:"verdure",u:"kg",macro:"alimenti",shelf:21},
  {n:"Cavolo nero",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Radicchio",c:"verdure",u:"kg",macro:"alimenti",shelf:5},
  {n:"Basilico",c:"erbe",u:"kg",macro:"alimenti",shelf:3},
  {n:"Prezzemolo",c:"erbe",u:"kg",macro:"alimenti",shelf:4},
  {n:"Rosmarino",c:"erbe",u:"kg",macro:"alimenti",shelf:7},
  {n:"Timo",c:"erbe",u:"kg",macro:"alimenti",shelf:7},
  {n:"Salvia",c:"erbe",u:"kg",macro:"alimenti",shelf:7},
  {n:"Dragoncello",c:"erbe",u:"kg",macro:"alimenti",shelf:5},
  {n:"Erba cipollina",c:"erbe",u:"kg",macro:"alimenti",shelf:5},
  {n:"Menta",c:"erbe",u:"kg",macro:"alimenti",shelf:4},
  {n:"Cerfoglio",c:"erbe",u:"kg",macro:"alimenti",shelf:3},
  {n:"Burro francese",c:"dairy",u:"kg",macro:"alimenti",shelf:21},
  {n:"Parmigiano 36 mesi",c:"dairy",u:"kg",macro:"alimenti",shelf:30},
  {n:"Pecorino romano",c:"dairy",u:"kg",macro:"alimenti",shelf:21},
  {n:"Burrata fresca",c:"dairy",u:"pz",macro:"alimenti",shelf:3},
  {n:"Mozzarella di bufala",c:"dairy",u:"kg",macro:"alimenti",shelf:5},
  {n:"Stracciatella",c:"dairy",u:"kg",macro:"alimenti",shelf:4},
  {n:"Mascarpone",c:"dairy",u:"kg",macro:"alimenti",shelf:7},
  {n:"Ricotta fresca",c:"dairy",u:"kg",macro:"alimenti",shelf:4},
  {n:"Uova fresche",c:"dairy",u:"pz",macro:"alimenti",shelf:21},
  {n:"Tuorli pastorizzati",c:"dairy",u:"kg",macro:"alimenti",shelf:14},
  {n:"Panna fresca",c:"dairy",u:"l",macro:"alimenti",shelf:7},
  {n:"Farina 00",c:"cereali",u:"kg",macro:"alimenti",shelf:180},
  {n:"Farina di semola rimacinata",c:"cereali",u:"kg",macro:"alimenti",shelf:180},
  {n:"Riso Carnaroli",c:"cereali",u:"kg",macro:"alimenti",shelf:365},
  {n:"Pasta Gragnano",c:"cereali",u:"kg",macro:"alimenti",shelf:365},
  {n:"Pane",c:"cereali",u:"kg",macro:"alimenti",shelf:2},
  {n:"Olio EVO DOP",c:"grassi",u:"l",macro:"alimenti",shelf:365},
  {n:"Olio di semi girasole",c:"grassi",u:"l",macro:"alimenti",shelf:180},
  {n:"Strutto",c:"grassi",u:"kg",macro:"alimenti",shelf:60},
  {n:"Aceto balsamico IGP",c:"acidi",u:"l",macro:"alimenti",shelf:365},
  {n:"Aceto di vino bianco",c:"acidi",u:"l",macro:"alimenti",shelf:365},
  {n:"Limoni Amalfi",c:"acidi",u:"kg",macro:"alimenti",shelf:14},
  {n:"Lime",c:"acidi",u:"kg",macro:"alimenti",shelf:14},
  {n:"Sale Maldon",c:"spezie",u:"kg",macro:"alimenti",shelf:730},
  {n:"Pepe nero Sarawak",c:"spezie",u:"kg",macro:"alimenti",shelf:365},
  {n:"Zafferano",c:"spezie",u:"g",macro:"alimenti",shelf:365},
  {n:"Vaniglia Bourbon",c:"spezie",u:"pz",macro:"alimenti",shelf:365},
  {n:"Paprika affumicata",c:"spezie",u:"kg",macro:"alimenti",shelf:365},
  {n:"Noce moscata",c:"spezie",u:"kg",macro:"alimenti",shelf:365},
  {n:"Fondo bruno vitello",c:"fondi",u:"l",macro:"alimenti",shelf:5},
  {n:"Fumetto di pesce",c:"fondi",u:"l",macro:"alimenti",shelf:3},
  {n:"Bisque gamberi",c:"fondi",u:"l",macro:"alimenti",shelf:3},
  {n:"Demi-glace",c:"fondi",u:"l",macro:"alimenti",shelf:5},
  {n:"Brodo di pollo",c:"fondi",u:"l",macro:"alimenti",shelf:4},
  {n:"Fondo bianco",c:"fondi",u:"l",macro:"alimenti",shelf:4},
  {n:"Vino bianco secco",c:"beverage",u:"l",macro:"alimenti",shelf:7},
  {n:"Vino rosso",c:"beverage",u:"l",macro:"alimenti",shelf:5},
  {n:"Champagne",c:"beverage",u:"l",macro:"alimenti",shelf:30},
  {n:"Cognac",c:"beverage",u:"l",macro:"alimenti",shelf:365},
  {n:"Marsala",c:"beverage",u:"l",macro:"alimenti",shelf:180},
  {n:"Pellicola alimentare",c:"packaging",u:"box",macro:"economato",shelf:365},
  {n:"Carta forno",c:"carta",u:"box",macro:"economato",shelf:365},
  {n:"Sacchetti sottovuoto",c:"packaging",u:"box",macro:"economato",shelf:365},
  {n:"Guanti monouso",c:"pulizia",u:"box",macro:"economato",shelf:365},
  {n:"Detergente sgrassatore",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Sanificante alimentare",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Etichette HACCP",c:"carta",u:"box",macro:"economato",shelf:365},
  {n:"Contenitori GN 1/1",c:"attrezzatura",u:"pz",macro:"economato",shelf:3650},
  {n:"Sac-à-poche",c:"carta",u:"box",macro:"economato",shelf:365},
];

const PREP_CATALOG = [
  "Fondo bruno","Demi-glace","Fumetto di pesce","Bisque","Brodo di pollo","Fondo bianco",
  "Salsa béarnaise","Salsa olandese","Salsa beurre blanc","Jus de veau","Salsa al tartufo",
  "Salsa verde","Romesco","Pesto alla genovese","Maionese","Aioli",
  "Pasta fresca all'uovo","Pasta fresca spinaci","Gnocchi di patate","Pasta sfoglia",
  "Pasta frolla","Pasta brisée","Pasta choux",
  "Crema pasticciera","Crema chantilly","Crema diplomatica","Crema al burro",
  "Mousse al cioccolato","Ganache fondente","Caramello","Crème brûlée base",
  "Tartare di manzo","Carpaccio","Vitello tonnato base","Battuta al coltello",
  "Polpo lessato","Baccalà mantecato","Salmone marinato","Gamberi sgusciati",
  "Brunoise cipolla","Mirepoix","Julienne carote","Chiffonade basilico",
  "Brunoise sedano","Battuto aglio-prezzemolo","Concassé pomodoro",
  "Chips di radici","Crostini","Grissini","Focaccia",
  "Gelato alla crema","Sorbetto limone","Semifreddo","Pâté en croûte",
  "Terrina di foie gras","Crudo di pesce","Insalata di polpo",
  "Risotto base","Battuto soffritto","Olio al basilico","Olio al tartufo",
];
/* ── ECONOMO CATALOG — prodotti non-food ── */
const ECONOMO_CATALOG = [
  // Detersivi e pulizia
  {n:"Detersivo piatti",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Sgrassatore professionale",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Disinfettante superfici",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Candeggina",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Detersivo lavastoviglie",c:"pulizia",u:"kg",macro:"economato",shelf:365},
  {n:"Brillantante lavastoviglie",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Detergente forno",c:"pulizia",u:"l",macro:"economato",shelf:365},
  {n:"Spugne da cucina",c:"pulizia",u:"pz",macro:"economato",shelf:30},
  {n:"Carta assorbente",c:"carta",u:"pz",macro:"economato",shelf:365},
  {n:"Guanti in nitrile",c:"pulizia",u:"pz",macro:"economato",shelf:365},
  // Packaging
  {n:"Pellicola trasparente",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Carta da forno",c:"carta",u:"pz",macro:"economato",shelf:365},
  {n:"Alluminio alimentare",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Sacchetti sottovuoto",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Contenitori gastronorm",c:"packaging",u:"pz",macro:"economato",shelf:1825},
  {n:"Coperchi gastronorm",c:"packaging",u:"pz",macro:"economato",shelf:1825},
  {n:"Vaschette monouso",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Pirottini carta",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Sacchetti bio compostabili",c:"packaging",u:"pz",macro:"economato",shelf:365},
  {n:"Etichette adesive",c:"ufficio",u:"pz",macro:"economato",shelf:365},
  // Carta & U.G.
  {n:"Tovaglioli di carta",c:"carta",u:"pz",macro:"economato",shelf:365},
  {n:"Rotoli carta igienica",c:"carta",u:"pz",macro:"economato",shelf:365},
  {n:"Carta mani",c:"carta",u:"pz",macro:"economato",shelf:365},
  {n:"Sacchi spazzatura",c:"pulizia",u:"pz",macro:"economato",shelf:365},
  // Divise
  {n:"Grembiuli cucina",c:"divise",u:"pz",macro:"economato",shelf:1825},
  {n:"Cappelli brigata",c:"divise",u:"pz",macro:"economato",shelf:1825},
  {n:"Facciali monouso",c:"divise",u:"pz",macro:"economato",shelf:365},
  // Attrezzatura piccola
  {n:"Guanti forno",c:"attrezzatura",u:"pz",macro:"economato",shelf:365},
  {n:"Stuzzicadenti",c:"carta",u:"pz",macro:"economato",shelf:1825},
  {n:"Fiammiferi",c:"attrezzatura",u:"pz",macro:"economato",shelf:1825},
];


/* ════════════════════════════════════════════════════════
   useCustomMemory — localStorage per suggerimenti custom
   ════════════════════════════════════════════════════════ */
function useCustomMemory(namespace) {
  const key = `kp-custom-${namespace}`;
  const [list, setList] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; }
  });
  const save = React.useCallback((item) => {
    setList(prev => {
      if(prev.includes(item)) return prev;
      const next = [item, ...prev].slice(0, 40);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [list, save];
}

/* ════════════════════════════════════════════════════════
   AutocompleteInput — input con suggerimenti catalogo
   ════════════════════════════════════════════════════════ */
function AutocompleteInput({ value, onChange, onSelect, placeholder, t, style={}, catalog=[], extraSuggestions=[], filterMacro="" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = (value||"").toLowerCase();
  const extra = extraSuggestions.map(s => typeof s === "string" ? {n:s,c:"custom",u:"pz",macro:"custom"} : s);
  const norm = catalog.map(s => typeof s === "string" ? {n:s,c:"prep",u:"pz",macro:"custom"} : s);
  const isPrep = catalog === PREP_CATALOG || catalog.includes(PREP_CATALOG[0]);
  const fromBook = isPrep && BRIDGE ? (BRIDGE.recipes||[]).map(r => ({n:r.name,c:"📖 "+(r.section||"ricettario"),u:"g",macro:"custom",recipeId:r.id})) : [];
  const pool = [...extra, ...fromBook, ...norm];
  const filtered = q.length < 1 ? [] : pool.filter(p => {
    if(filterMacro && p.macro !== filterMacro && p.macro !== "custom") return false;
    return !!(p.n) && p.n.toLowerCase().includes(q);
  }).slice(0, 10);
  return (
    <div ref={ref} style={{position:"relative", ...style}}>
      <input
        value={value} onChange={e=>{onChange(e);setOpen(true);}}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder}
        style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
          background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:13,outline:"none"}}
      />
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,
          background:t.bgCard,border:`1px solid ${t.div}`,borderRadius:10,
          boxShadow:`0 8px 32px ${t.shadowStrong}`,maxHeight:220,overflowY:"auto",marginTop:4}}>
          {filtered.map((p,i)=>(
            <div key={i} onClick={()=>{onSelect(p);setOpen(false);}}
              style={{padding:"9px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",
                borderBottom:i<filtered.length-1?`1px solid ${t.div}`:"none"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.bgAlt}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{flex:1,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{p.n}</span>
              <span style={{fontFamily:"var(--mono)",fontSize:9,color:t.inkFaint}}>{p.c} · {p.u}</span>
              {p.shelf&&<span style={{fontFamily:"var(--mono)",fontSize:9,color:t.gold}}>sl:{p.shelf}d</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const recRef = useRef<any>(null);
  const supported = typeof window!=="undefined" && ("SpeechRecognition" in (window as any) || "webkitSpeechRecognition" in (window as any));

  function doStart() {
    setErrMsg("");
    const SR = (window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang="it-IT"; r.interimResults=false; r.maxAlternatives=1; r.continuous=false;
    r.onresult = (e:any) => { try { onResult(e.results[0][0].transcript); } catch{} };
    r.onerror = (e:any) => {
      setListening(false);
      if(e.error==="not-allowed") setErrMsg("Permesso microfono negato. Impostazioni Safari > Microfono.");
      else if(e.error==="no-speech") setErrMsg("Nessun audio rilevato.");
      else setErrMsg("Errore microfono: "+e.error);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); setErrMsg("Impossibile avviare il microfono."); }
  }

  const start = useCallback(()=>{
    if(listening) return;
    if(navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({audio:true}).then(()=>doStart()).catch(()=>setErrMsg("Permesso microfono negato."));
    } else { doStart(); }
  },[listening,onResult]);

  const stop = useCallback(()=>{ recRef.current?.stop(); setListening(false); },[]);
  useEffect(()=>()=>recRef.current?.abort(),[]);
  return { listening, start, stop, supported, errMsg };
}



/* ════════════════════════════════════════════════════════
   CATEGORIE_MENU — fonte unica di verità per MEP + Preparazioni
   Tutte le etichette in italiano · ordine di servizio
   ════════════════════════════════════════════════════════ */
const CATEGORIE_MENU = [
  {key:"antipasti",   label:"Antipasti",   icon:"🫕",  reparto:"cucina",      ord:1},
  {key:"primi",       label:"Primi",       icon:"🍝",  reparto:"cucina",      ord:2},
  {key:"secondi",     label:"Secondi",     icon:"🥩",  reparto:"cucina",      ord:3},
  {key:"pasticceria", label:"Pasticceria", icon:"🍮",  reparto:"pasticceria", ord:4},
  {key:"colazioni",   label:"Colazioni",   icon:"☕",  reparto:"pasticceria", ord:5},
  {key:"buffet",      label:"Buffet",      icon:"🎪",  reparto:"cucina",      ord:6},
  {key:"eventi",      label:"Eventi",      icon:"🎊",  reparto:"cucina",      ord:7},
  {key:"svolte",      label:"Svolte",      icon:"✅",  reparto:"cucina",      ord:8}, // auto-populated
];

/* ════════════════════════════════════════════════════════
   TIPOLOGIE SPESA + FREQUENZE
   ════════════════════════════════════════════════════════ */
const SPESA_TIPOLOGIE  = ["alimenti","economato","altro"];
const SPESA_FREQUENZE  = ["giornaliero","settimanale"];
const SPESA_TIP_ICONS  = {alimenti:"🥩", economato:"📦", altro:"📋"};
const SPESA_TIP_LABELS = {alimenti:"Alimenti", economato:"Economato", altro:"Altro"};
const SPESA_FREQ_LABELS= {giornaliero:"Giornaliero", settimanale:"Settimanale"};

/* ════════════════════════════════════════════════════════
   callAI v4 — WORKER_URL · cache 5min · retry ×2 · timeout 25s
   userMessages: array [{type:"image"|"document",source:{...}}]
   ════════════════════════════════════════════════════════ */

/* ── Configura il tuo Cloudflare Worker dopo il deploy ──
   Lascia "" per API diretta (key nel browser, solo dev)
   Esempio: "https://kitchen-pro-ai.tuonome.workers.dev"  */
const WORKER_URL = "/api";

const _AI_CACHE = new Map<string,{result:any;ts:number}>();
const _AI_CACHE_TTL = 5 * 60 * 1000;


const API_URL = ""; // dati condivisi tramite Supabase (vedi BRIDGE)

function getToken() { return localStorage.getItem("kp-token") || ""; }
function setToken(t: string) { localStorage.setItem("kp-token", t); }
function clearToken() { localStorage.removeItem("kp-token"); }

async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  if (!API_URL) throw new Error("API_URL non configurato");
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

function BackendAuthScreen({ t, onAuth }: { t: any; onAuth: (data: any) => void }) {
  const [mode, setMode] = React.useState<"join"|"create">("join");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [kitchenName, setKitchenName] = React.useState("");
  const [role, setRole] = React.useState("commis");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [created, setCreated] = React.useState<any>(null);
  const toast = useToast();

  async function handleJoin() {
    if (!code.trim() || !name.trim()) { setError("Inserisci codice e nome"); return; }
    setLoading(true); setError("");
    try {
      const d = await apiFetch("/auth/join", {
        method: "POST", body: JSON.stringify({ code: code.trim().toUpperCase(), memberName: name.trim(), role })
      });
      setToken(d.token);
      toast(`Benvenuto in ${d.kitchen.name}!`, "success");
      onAuth(d);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!kitchenName.trim() || !name.trim()) { setError("Inserisci nome cucina e il tuo nome"); return; }
    setLoading(true); setError("");
    try {
      const d = await apiFetch("/auth/create", {
        method: "POST", body: JSON.stringify({ name: kitchenName.trim(), ownerName: name.trim() })
      });
      setToken(d.token);
      setCreated({ ...d, kitchenName, ownerName: name.trim() });
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (created) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg,padding:24}}>
      <div style={{maxWidth:440,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🎉</div>
        <div style={{fontFamily:"var(--serif)",fontSize:22,fontStyle:"italic",color:t.ink,marginBottom:8}}>Cucina creata!</div>
        <div style={{fontFamily:"var(--mono)",fontSize:11,color:t.inkMuted,marginBottom:24}}>Condividi questo codice con la brigata:</div>
        <div style={{padding:"20px 32px",borderRadius:16,background:`linear-gradient(135deg,${t.gold}20,${t.bgCard})`,border:`2px solid ${t.gold}`,marginBottom:24}}>
          <div style={{fontFamily:"var(--mono)",fontSize:32,fontWeight:700,letterSpacing:"0.2em",color:t.gold}}>{created.code}</div>
        </div>
        <button onClick={()=>onAuth({token:created.token,kitchen:{id:created.kitchenId,name:created.kitchenName,code:created.code},member:{role:"admin",name:created.ownerName}})}
          style={{padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:12}}>
          Entra in cucina →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg,padding:24}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"var(--serif)",fontSize:28,fontStyle:"italic",color:t.ink}}>Kitchen Pro</div>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.18em",marginTop:4}}>GESTIONE CUCINA PROFESSIONALE</div>
        </div>
        <div style={{display:"flex",gap:6,padding:4,background:"#C19A3E",borderRadius:12,marginBottom:20}}>
          {[{k:"join",l:"Entra con codice"},{k:"create",l:"Crea cucina"}].map((m)=>(
            <button key={m.k} onClick={()=>setMode(m.k as any)} style={{flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",
              background:mode===m.k?"#C19A3E":"transparent",color:"#fff",fontWeight:700,
              fontFamily:"var(--mono)",fontSize:10,boxShadow:mode===m.k?`0 2px 8px ${t.shadow}`:"none",transition:"all 0.2s"}}>{m.l}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {mode==="join" ? (<>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>CODICE CUCINA</div>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="es. LUNA-4821"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${t.div}`,background:t.bgCard,
                  color:t.ink,fontFamily:"var(--mono)",fontSize:16,letterSpacing:"0.15em",outline:"none",
                  boxSizing:"border-box",textAlign:"center"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>IL TUO NOME</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Es. Marco Chef"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${t.div}`,background:t.bgCard,
                  color:t.ink,fontFamily:"var(--mono)",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>RUOLO</div>
              <select value={role} onChange={e=>setRole(e.target.value)}
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${t.div}`,
                  background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:13,outline:"none"}}>
                {["admin","chef","sous-chef","capo-partita","commis","stagista","staff","fb","mm"].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </>) : (<>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>NOME CUCINA / RISTORANTE</div>
              <input value={kitchenName} onChange={e=>setKitchenName(e.target.value)} placeholder="Es. Ristorante Da Mario"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${t.div}`,background:t.bgCard,
                  color:t.ink,fontFamily:"var(--mono)",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>IL TUO NOME (Admin)</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Es. Chef Andrea"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${t.div}`,background:t.bgCard,
                  color:t.ink,fontFamily:"var(--mono)",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </>)}
          {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"rgba(139,30,47,0.1)",color:"#8B1E2F",fontFamily:"var(--mono)",fontSize:11}}>⚠ {error}</div>}
          <button onClick={mode==="join"?handleJoin:handleCreate} disabled={loading}
            style={{padding:"14px",borderRadius:12,border:"none",cursor:"pointer",
              background:loading?t.bgAlt:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
              color:loading?t.inkFaint:"#fff",fontFamily:"var(--mono)",fontSize:12,transition:"all 0.2s",marginTop:4}}>
            {loading?"⏳ Caricamento...":(mode==="join"?"→ Entra in Cucina":"✦ Crea Cucina")}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={()=>onAuth(null)} style={{background:"none",border:"none",cursor:"pointer",
            color:t.inkFaint,fontFamily:"var(--mono)",fontSize:9}}>
            Continua senza account (solo locale)
          </button>
        </div>
      </div>
    </div>
  );
}

function BackendInfoCard({ t }) {
  const token = getToken();
  const [me, setMe] = React.useState<any>(null);
  React.useEffect(() => {
    if(!API_URL||!token) return;
    apiFetch("/auth/me").then(d=>setMe(d)).catch(()=>{});
  }, []);
  if(!API_URL) return null;
  return (
    <div style={{borderRadius:14,border:`1px solid ${t.div}`,background:t.bgCard,padding:20}}>
      <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>🌐 CUCINA CONNESSA</div>
      {me ? (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>CUCINA</div>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>{me.kitchen?.name}</div></div>
            <div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>CODICE</div>
              <div style={{fontFamily:"var(--mono)",fontSize:18,letterSpacing:"0.2em",color:t.gold}}>{me.kitchen?.code}</div></div>
            <div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>BRIGATA</div>
              <div style={{fontFamily:"var(--mono)",fontSize:12,color:t.ink}}>{me.members?.length||1} membri</div></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {(me.members||[]).map((m:any)=>(
              <span key={m.id} style={{padding:"4px 10px",borderRadius:8,background:t.bgAlt,
                border:`1px solid ${t.div}`,fontFamily:"var(--mono)",fontSize:9,color:t.inkMuted}}>
                {m.name} · {m.role}
              </span>
            ))}
          </div>
          <button onClick={()=>{clearToken();window.location.reload();}}
            style={{alignSelf:"flex-start",padding:"8px 16px",borderRadius:8,border:`1px solid ${t.div}`,
              cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>
            Esci / Cambia cucina
          </button>
        </div>
      ) : (
        <div className="mono" style={{fontSize:10,color:t.inkFaint}}>Connessione in corso…</div>
      )}
    </div>
  );
}

function SetupScreen({ t }) {
  const { createKitchen, joinKitchen } = useK();
  const [mode, setMode] = useState<"create"|"join">("create");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("commis");
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg}}>
      <Card t={t} style={{width:440,padding:40}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:64,height:64,borderRadius:"50%",margin:"0 auto 16px",
            background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,
            border:`2px solid ${t.goldBright}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span className="mono" style={{fontSize:11,color:t.goldBright}}>★★★</span>
          </div>
          <div style={{fontFamily:"var(--serif)",fontSize:26,fontWeight:500,color:t.ink,marginBottom:6}}>Kitchen Pro</div>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.2em",color:t.inkFaint}}>GESTIONE CUCINA PROFESSIONALE</div>
        </div>
        <div style={{display:"flex",gap:6,padding:4,background:t.bgAlt,borderRadius:12,marginBottom:20}}>
          {([{k:"create",l:"Crea cucina"},{k:"join",l:"Entra con codice"}] as const).map(m=>(
            <button key={m.k} onClick={()=>setMode(m.k)} style={{flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",
              background:mode===m.k?t.gold:"transparent",
              color:mode===m.k?"#fff":t.inkMuted,
              fontWeight:mode===m.k?700:400,
              fontFamily:"var(--mono)",fontSize:10,transition:"all 0.2s"}}>{m.l}</button>
          ))}
        </div>
        {mode==="create" ? (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <LuxInput value={name} onChange={e=>setName(e.target.value)} placeholder="Nome cucina / ristorante" t={t}/>
            <LuxInput value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Tuo nome (admin)" t={t}/>
            <Btn t={t} onClick={()=>createKitchen(name,owner)} disabled={!name.trim()} variant="primary" sx={{marginTop:8}}>
              ✦ Crea Cucina
            </Btn>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <LuxInput value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="es. LUNA-4821" t={t}/>
            <LuxInput value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Il tuo nome" t={t}/>
            <LuxSelect value={role} onChange={e=>setRole(e.target.value)} t={t}>
              {["admin","chef","sous-chef","capo-partita","commis","stagista","staff","fb","mm"].map(r=><option key={r} value={r}>{r}</option>)}
            </LuxSelect>
            <Btn t={t} onClick={()=>joinKitchen&&joinKitchen(code,owner,role)} disabled={!code.trim()||!owner.trim()} variant="gold" sx={{marginTop:8}}>
              → Entra in Cucina
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
}



async function callAI({ systemPrompt, userContext=null, maxTokens=1024,
  expectJSON=false, _attempt=0, userMessages=null, noCache=false }: {
  systemPrompt:string; userContext?:any; maxTokens?:number;
  expectJSON?:boolean; _attempt?:number; userMessages?:any[]|null; noCache?:boolean;
}):Promise<any> {
  const ctx = typeof userContext==="string"
    ? userContext.slice(0,3000)
    : userContext ? JSON.stringify(userContext).slice(0,3000) : "";

  const cacheKey = (!userMessages && !noCache)
    ? (systemPrompt.slice(0,60)+"::"+ctx.slice(0,100)) : null;
  if(cacheKey){
    const hit = _AI_CACHE.get(cacheKey);
    if(hit && Date.now()-hit.ts < _AI_CACHE_TTL) return hit.result;
  }

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 25_000);

  const endpoint = (API_URL && getToken()) ? `${API_URL}/ai` : WORKER_URL ? `${WORKER_URL}/ai` : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${localStorage.getItem("kp-api-key")||""}`;

  const isGemini = !API_URL && !WORKER_URL;
  const headers: Record<string,string> = {"Content-Type":"application/json"};
  if(API_URL && getToken()) {
    headers["Authorization"] = `Bearer ${getToken()}`;
  } else if(!WORKER_URL) {
    const sk = typeof localStorage!=="undefined" ? localStorage.getItem("kp-api-key")||"" : "";
    if(!sk) throw new Error("Configura API key Gemini nelle Impostazioni → 🤖 AI");
  }

  const body: any = {
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: userMessages
      ? [{role:"user", content:userMessages}]
      : [{role:"user", content:ctx||"Analizza e rispondi."}],
  };

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal, method:"POST", headers,
      body: JSON.stringify(body),
    });
    clearTimeout(timer);

    if(!res.ok) {
      if((res.status===429||res.status>=500) && _attempt<2){
        await new Promise(r=>setTimeout(r, 1800*(1+_attempt)));
        return callAI({systemPrompt,userContext,maxTokens,expectJSON,_attempt:_attempt+1,userMessages,noCache});
      }
      if(res.status===401) throw new Error("Chiave API non valida o scaduta. Vai in Impostazioni → 🤖 AI per aggiornarla.");
      if(res.status===400) { const eb=await res.json().catch(()=>{}); throw new Error("400: "+(eb?.error?.message||JSON.stringify(eb)||"formato errato")); }
      if(res.status===403) throw new Error("Accesso AI negato (403). Verifica la chiave API.");
      throw new Error(`Errore AI (${res.status}). Riprova tra qualche secondo.`);
    }

    const data = await res.json();
    console.log("AI raw response:", JSON.stringify(data).slice(0,300));
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text||"";
    const content = data.content || data.result?.content || [];
    const text = (geminiText || content.map((b:any)=>b.text||"").join("")).trim();
    if(!text) throw new Error("AI: risposta vuota");

    const result = expectJSON
      ? (()=>{ try { const c=text.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"").trim(); const s=c.indexOf("{"); const e=c.lastIndexOf("}"); return JSON.parse(s>=0&&e>s?c.slice(s,e+1):c); } catch { return text; } })()
      : text;
    if(cacheKey) _AI_CACHE.set(cacheKey, {result, ts:Date.now()});
    return result;
  } catch(e:any) {
    clearTimeout(timer);
    if(e.name==="AbortError" && _attempt<2)
      return callAI({systemPrompt,userContext,maxTokens,expectJSON,_attempt:_attempt+1,userMessages,noCache});
    throw e;
  }
}

/* fileToBase64 — utility per SmartDocImport */
async function fileToBase64(file: File): Promise<{base64:string;mimeType:string;name:string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1], mimeType: file.type||"image/jpeg", name: file.name });
    };
    reader.onerror = () => reject(new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
}

/* ════════════════════════════════════════════════════════
   ALERT SELECTORS — stati derivati, mai salvati in store
   ════════════════════════════════════════════════════════ */
function computeStatoScadenza(scadeIl) {
  if(!scadeIl) return "nessuna";
  const ore = (new Date(scadeIl)-Date.now())/3_600_000;
  if(ore<=0)  return "scaduta";
  if(ore<=12) return "critica";
  if(ore<=48) return "in_scadenza";
  return "ok";
}
function computeStatoQuantita(qty, min) {
  if((qty||0)<=0)          return "esaurita";
  if(min>0 && qty<=min)    return "bassa";
  return "ok";
}
function selectAlertCritici(kitchen) {
  if(!kitchen) return [];
  const tutti = [...(kitchen.freezer||[]),...(kitchen.fridge||[]),...(kitchen.dry||[]),...(kitchen.counter||[])];
  const alerts = [];
  tutti.forEach(g=>{
    const sc = computeStatoScadenza(g.expiresAt);
    const sq = computeStatoQuantita(g.quantity, g.parLevel||0);
    if(sc==="scaduta")      alerts.push({id:g.id+"_sc0", tipo:"scaduta",      priorita:0, nome:g.name, location:g.location, valore:"SCADUTO"});
    else if(sc==="critica") alerts.push({id:g.id+"_sc1", tipo:"critica",      priorita:1, nome:g.name, location:g.location, valore:Math.round((new Date(g.expiresAt)-Date.now())/3_600_000)+"h"});
    else if(sc==="in_scadenza") alerts.push({id:g.id+"_sc2", tipo:"in_scadenza", priorita:2, nome:g.name, location:g.location, valore:Math.round((new Date(g.expiresAt)-Date.now())/3_600_000)+"h"});
    if(sq==="esaurita")     alerts.push({id:g.id+"_sq0", tipo:"scorta_zero",  priorita:0, nome:g.name, location:g.location, valore:"ESAURITO"});
    else if(sq==="bassa")   alerts.push({id:g.id+"_sq3", tipo:"scorta_bassa", priorita:3, nome:g.name, location:g.location, valore:g.quantity+" "+g.unit});
  });
  return alerts.sort((a,b)=>a.priorita-b.priorita);
}

/* ════════════════════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════════════════════ */
const MACRO = { alimenti:"🥩 Alimenti", economato:"🧴 Economato" };
const CATEGORIES = {
  proteine:  {label:"Proteine",   icon:"🥩", macro:"alimenti"},
  pesce:     {label:"Pesce",      icon:"🐟", macro:"alimenti"},
  verdure:   {label:"Verdure",    icon:"🥦", macro:"alimenti"},
  erbe:      {label:"Erbe",       icon:"🌿", macro:"alimenti"},
  dairy:     {label:"Latticini",  icon:"🧀", macro:"alimenti"},
  cereali:   {label:"Cereali",    icon:"🍞", macro:"alimenti"},
  grassi:    {label:"Grassi",     icon:"🫒", macro:"alimenti"},
  acidi:     {label:"Acidi",      icon:"🍋", macro:"alimenti"},
  spezie:    {label:"Spezie",     icon:"🧂", macro:"alimenti"},
  fondi:     {label:"Fondi",      icon:"🍲", macro:"alimenti"},
  beverage:  {label:"Beverage",   icon:"🍷", macro:"alimenti"},
  secco:     {label:"Secco",      icon:"🏺", macro:"alimenti"},
  pulizia:   {label:"Pulizia",    icon:"🧹", macro:"economato"},
  carta:     {label:"Carta",      icon:"📄", macro:"economato"},
  attrezzatura:{label:"Attr.",    icon:"🔧", macro:"economato"},
  packaging: {label:"Packaging",  icon:"📦", macro:"economato"},
};
const catLabel = (c) => CATEGORIES[c]?.label||c;
const catIcon  = (c) => CATEGORIES[c]?.icon||"📦";
const PAR_PRESET = {proteine:6,pesce:4,verdure:8,erbe:12,dairy:6,cereali:3,grassi:4,acidi:6,spezie:10,fondi:4,beverage:6,secco:5,pulizia:2,carta:3,attrezzatura:1,packaging:3};
const UNITS = ["pz","g","kg","ml","l","vac","busta","brik","latta","box","vasch"];
const ROLES = ["admin","chef","sous-chef","capo-partita","commis","stagista","staff","fb","mm"];
const CAN_EDIT = ["admin","chef","sous-chef","capo-partita"];

function hoursUntil(iso) {
  if(!iso) return null;
  return (new Date(iso)-new Date())/3600000;
}
function expiryBadge(iso) {
  const h = hoursUntil(iso);
  if(h===null) return null;
  if(h<=0)  return {label:"SCADUTO",  color:"#fff", bg:"#8B1E2F"};
  if(h<=24) return {label:"≤24h",     color:"#fff", bg:"#8B1E2F"};
  if(h<=72) return {label:"≤72h",     color:"#fff", bg:"#C19A3E"};
  return null;
}
function stepFor(unit) {
  if(["g","ml"].includes(unit)) return [100,500];
  if(["kg","l"].includes(unit)) return [0.5,1];
  return [1,5];
}
function fmtDate(iso) { return iso ? iso.slice(0,10) : "—"; }

/* ════════════════════════════════════════════════════════
   MICRO-COMPONENTS
   ════════════════════════════════════════════════════════ */
function LiveClock({ t, short=false }) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(i);},[]);
  const fmt = short
    ? now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})
    : now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  return (
    <span className="mono" style={{fontSize:short?13:13,color:t.gold,letterSpacing:"0.06em",fontWeight:short?600:400}}>
      {fmt}
    </span>
  );
}

function BarMini({ value, max, t, color }) {
  const pct = Math.min((value/max)*100,100);
  const isLow = value/max < 0.25;
  const c = color||(isLow?t.danger:pct<50?t.warning:t.success);
  return (
    <div style={{height:4,background:t.div,borderRadius:2,overflow:"hidden",flex:1}}>
      <div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:2,transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)"}}/>
    </div>
  );
}

function Badge({ label, color, bg, style:sx={} }) {
  return (
    <span className="mono" style={{fontSize:8,letterSpacing:"0.1em",fontWeight:500,padding:"3px 9px",borderRadius:4,color,background:bg,whiteSpace:"nowrap",...sx}}>
      {label}
    </span>
  );
}

function Btn({ onClick, disabled, children, variant="primary", t, style:sx={} }) {
  const variants = {
    primary:{ background:`linear-gradient(135deg, ${t.secondary}, ${t.secondaryDeep})`, color:"#fff", border:"none" },
    danger: { background:`linear-gradient(135deg, ${t.accent}, ${t.accentDeep})`, color:"#fff", border:"none" },
    ghost:  { background:"transparent", color:t.inkMuted, border:`1px solid ${t.div}` },
    gold:   { background:`linear-gradient(135deg, ${t.gold}, ${t.goldBright})`, color:"#fff", border:"none" },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding:"8px 18px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",
      fontSize:10,fontFamily:"var(--mono)",fontWeight:500,letterSpacing:"0.08em",
      opacity:disabled?0.45:1,transition:"all 0.2s",...variants[variant],...sx,
    }}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.08)";}}
    onMouseLeave={e=>{e.currentTarget.style.filter="none";}}
    >{children}</button>
  );
}

function LuxInput({ value, onChange, placeholder, type="text", t, style:sx={} }) {
  return (
    <input value={value} onChange={onChange} type={type} placeholder={placeholder}
      style={{
        width:"100%",padding:"9px 14px",borderRadius:8,fontSize:12,fontFamily:"var(--serif)",
        background:t.bgCardAlt,color:t.ink,border:`1px solid ${t.div}`,outline:"none",
        transition:"border-color 0.2s",...sx,
      }}
      onFocus={e=>e.target.style.borderColor=t.gold}
      onBlur={e=>e.target.style.borderColor=t.div}
    />
  );
}

function LuxSelect({ value, onChange, children, t, style:sx={} }) {
  return (
    <select value={value} onChange={onChange} style={{
      width:"100%",padding:"9px 14px",borderRadius:8,fontSize:12,fontFamily:"var(--mono)",
      background:t.bgCardAlt,color:t.ink,border:`1px solid ${t.div}`,outline:"none",cursor:"pointer",...sx,
    }}>{children}</select>
  );
}

function VoiceBtn({ t, onResult }) {
  const speech = useSpeech(onResult);
  if(!speech.supported) return <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",padding:"0 4px",cursor:"not-allowed"}} title="Audio non supportato su questo browser">🎤✕</span>;
  return (
  <div style={{position:"relative",display:"inline-flex"}}>
    <button onClick={speech.listening?speech.stop:speech.start} style={{
      width:34,height:34,borderRadius:"50%",border:"none",cursor:"pointer",
      background:speech.listening?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:`${t.div}`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
      flexShrink:0,transition:"all 0.2s",
      animation:speech.listening?"pulse 1s ease-in-out infinite":"none",
    }} title={speech.listening?"Stop":"Parla"}>🎤</button>
  {speech.errMsg&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",right:0,background:"#b00",color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:10,fontFamily:"var(--mono)",whiteSpace:"nowrap",zIndex:9999,maxWidth:280,wordBreak:"break-word"}}>{speech.errMsg}</div>}
  </div>
  );
}

function Card({ children, t, style:sx={}, glow=false }) {
  return (
    <div style={{
      background:t.bgCard,borderRadius:14,border:`1px solid ${glow?t.accent+"30":t.div}`,
      boxShadow:glow?`0 4px 20px ${t.accentGlow}`:`0 2px 12px ${t.shadow}`,
      overflow:"hidden",transition:"all 0.3s",...sx,
    }}>{children}</div>
  );
}

function CardHeader({ title, right, t }) {
  return (
    <div style={{padding:"16px 22px",borderBottom:`1px solid ${t.div}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span className="mono" style={{fontSize:9,letterSpacing:"0.14em",color:t.inkMuted,fontWeight:500,textTransform:"uppercase"}}>{title}</span>
      {right}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SETUP SCREEN
   ════════════════════════════════════════════════════════ */
function ApiKeySetup({ t }) {
  const [key, setKey] = React.useState(()=>localStorage.getItem("kp-api-key")||"");
  const [saved, setSaved] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<null|"testing"|"ok"|"fail">(null);
  const [testMsg, setTestMsg] = React.useState("");
  if(API_URL && getToken()) return null; // backend attivo, key gestita dal worker
  function save() {
    if(key.trim()) localStorage.setItem("kp-api-key", key.trim());
    else localStorage.removeItem("kp-api-key");
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
    setTestStatus(null);
  }
  async function testKey() {
    const k = key.trim();
    if(!k){ setTestStatus("fail"); setTestMsg("Inserisci prima una chiave."); return; }
    localStorage.setItem("kp-api-key", k);
    setTestStatus("testing"); setTestMsg("Test in corso…");
    try {
      const res = await fetch("/api/ai", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          system:"Rispondi solo con: ok",
          messages:[{role:"user",content:"ping"}],
          max_tokens:10,
        })
      });
      const data = await res.json();
      if(res.ok && data?.content?.[0]?.text){ setTestStatus("ok"); setTestMsg("✓ AI funzionante! Gemini risponde."); }
      else if(data?.error?.includes("API_KEY")){ setTestStatus("fail"); setTestMsg("✗ GEMINI_API_KEY non configurata su Vercel."); }
      else { setTestStatus("fail"); setTestMsg("✗ Errore: "+(data?.error||res.status)); }
    } catch(e:any){
      setTestStatus("fail"); setTestMsg("✗ Errore rete: "+e.message);
    }
  }
  return (
    <div style={{borderRadius:14,border:`1px solid ${t.div}`,background:t.bgCard,padding:20,marginBottom:16}}>
      <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:10}}>
        🤖 CONFIGURAZIONE AI
      </div>
      <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkMuted,marginBottom:12}}>
        Inserisci la tua Gemini API key (gratuita) per abilitare tutte le funzioni AI.
        La key è salvata solo sul tuo browser.
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200,position:"relative"}}>
          <input
            type={show?"text":"password"}
            value={key}
            onChange={e=>{setKey(e.target.value);setTestStatus(null);}}
            onKeyDown={e=>{if(e.key==="Enter")testKey();}}
            placeholder="sk-ant-api03-..."
            style={{width:"100%",padding:"10px 40px 10px 14px",borderRadius:8,
              border:`1px solid ${testStatus==="ok"?t.success:testStatus==="fail"?t.danger:key.startsWith("sk-ant")?t.gold:t.div}`,
              background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12,
              outline:"none",boxSizing:"border-box"}}
          />
          <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",
            transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",
            color:t.inkFaint,fontSize:14}}>{show?"🙈":"👁"}</button>
        </div>
        <button onClick={testKey} disabled={testStatus==="testing"} style={{
          padding:"10px 16px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
          background:testStatus==="ok"?t.success+"20":testStatus==="fail"?t.danger+"20":t.bgAlt,
          color:testStatus==="ok"?t.success:testStatus==="fail"?t.danger:t.inkMuted,
          fontFamily:"var(--mono)",fontSize:10,whiteSpace:"nowrap",transition:"all 0.2s"}}>
          {testStatus==="testing"?"⏳ Test…":"🔬 Testa"}
        </button>
        <button onClick={save} style={{padding:"10px 20px",borderRadius:8,border:"none",
          cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
          color:"#fff",fontFamily:"var(--mono)",fontSize:10,whiteSpace:"nowrap"}}>
          {saved?"✓ Salvata!":"💾 Salva"}
        </button>
      </div>
      {testMsg && (
        <div className="mono" style={{fontSize:9,marginTop:8,padding:"6px 10px",borderRadius:6,
          background:testStatus==="ok"?t.success+"15":t.danger+"15",
          color:testStatus==="ok"?t.success:t.danger}}>
          {testMsg}
        </div>
      )}
      {key.startsWith("sk-ant")&&(
        <div className="mono" style={{fontSize:9,color:"#3D7A4A",marginTop:8}}>✓ API key configurata</div>
      )}
      <div style={{marginTop:10,fontFamily:"var(--mono)",fontSize:8,color:t.inkFaint}}>
        Ottieni la key su aistudio.google.com · Non viene mai inviata a server terzi
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   BACKEND API — Cloudflare Workers
   ═══════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════
   ALERT BANNER — sistema a priorità, si attiva on mount Preparazioni
   P0=rosso lampeggiante · P1=rosso · P2=arancio · P3=giallo
   ════════════════════════════════════════════════════════ */
const ALERT_COLORS = {
  scaduta:      {bg:"#8B1E2F", border:"#FF3333", label:"SCADUTO"},
  critica:      {bg:"rgba(139,30,47,0.15)", border:"#8B1E2F", label:"CRITICO"},
  in_scadenza:  {bg:"rgba(193,154,62,0.15)", border:"#C19A3E", label:"IN SCADENZA"},
  scorta_zero:  {bg:"rgba(139,30,47,0.15)", border:"#8B1E2F", label:"ESAURITO"},
  scorta_bassa: {bg:"rgba(193,154,62,0.10)", border:"#C19A3E", label:"SCORTA BASSA"},
};
const LOCATION_ICONS = {freezer:"❄️", fridge:"🧊", dry:"🏺", counter:"🔲", economato:"📦"};

function AlertBanner({ alerts, t, onDismiss }) {
  const [dismissed, setDismissed] = useState(new Set());
  const visible = alerts.filter(a=>!dismissed.has(a.id));
  if(!visible.length) return null;

  const critici    = visible.filter(a=>a.priorita<=1);
  const attenzione = visible.filter(a=>a.priorita===2);
  const info       = visible.filter(a=>a.priorita===3);

  return (
    <div style={{marginBottom:20,display:"flex",flexDirection:"column",gap:8}}>
      {critici.map(a=>{
        const style = ALERT_COLORS[a.tipo]||ALERT_COLORS.critica;
        return (
          <div key={a.id} style={{
            display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
            borderRadius:10,border:`1.5px solid ${style.border}`,background:style.bg,
            animation:a.priorita===0?"pulse 1.5s ease-in-out infinite":undefined,
          }}>
            <span style={{fontSize:18,flexShrink:0}}>{LOCATION_ICONS[a.location]||"⚠️"}</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,fontWeight:500}}>
                {a.nome}
              </div>
              <div className="mono" style={{fontSize:9,color:style.border,marginTop:2}}>
                {style.label} · {(a.location||"").toUpperCase()} · {a.valore}
              </div>
            </div>
            <button onClick={()=>setDismissed(p=>new Set([...p,a.id]))} style={{
              background:"none",border:"none",color:t.inkFaint,cursor:"pointer",fontSize:16,padding:4,
              minWidth:32,minHeight:32,display:"flex",alignItems:"center",justifyContent:"center",
            }}>✕</button>
          </div>
        );
      })}

      {attenzione.length>0&&(
        <details style={{background:ALERT_COLORS.in_scadenza.bg,border:`1px solid ${ALERT_COLORS.in_scadenza.border}`,borderRadius:10,padding:"10px 14px"}}>
          <summary style={{cursor:"pointer",fontFamily:"var(--mono)",fontSize:10,color:t.warning||"#C19A3E",letterSpacing:"0.08em",listStyle:"none"}}>
            ⚠ {attenzione.length} prodotti in scadenza (espandi)
          </summary>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            {attenzione.map(a=>(
              <div key={a.id} style={{fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",color:t.ink,padding:"3px 0"}}>
                · {a.nome} — {a.valore} · {(a.location||"").toUpperCase()}
              </div>
            ))}
          </div>
        </details>
      )}

      {info.length>0&&(
        <details style={{background:ALERT_COLORS.scorta_bassa.bg,border:`1px solid ${ALERT_COLORS.scorta_bassa.border}`,borderRadius:10,padding:"10px 14px"}}>
          <summary style={{cursor:"pointer",fontFamily:"var(--mono)",fontSize:10,color:t.warning||"#C19A3E",letterSpacing:"0.08em",listStyle:"none"}}>
            📉 {info.length} scorte basse (espandi)
          </summary>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            {info.map(a=>(
              <div key={a.id} style={{fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",color:t.ink,padding:"3px 0"}}>
                · {a.nome} — {a.valore}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   PREPARAZIONI VIEW v3
   Tab: Tutte | Per categoria | Svolte (auto) | Congelatore
   Alert on mount: scadenze + scorte basse
   ════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════
   AI_PROMPTS — 12 reparti professionali
   ════════════════════════════════════════════════════════ */
const AI_PROMPTS = {
  cucina_calda: { label:"Cucina Calda",     icon:"🔥",
    system:"Sei uno chef saucier di ristorante Michelin con 20 anni di esperienza. Analizza le preparazioni e suggerisci la lista spesa ottimale considerando stagionalità, resa e costo. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,nota,fornitore_suggerito}]}." },
  pesce:        { label:"Pesce & Pescato",  icon:"🐟",
    system:"Sei uno chef poissonnier esperto con competenza HACCP per prodotti ittici. Valuta freschezza, stagionalità e conformità normativa. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,nota,shelf_life_atteso}]}." },
  verdura:      { label:"Verdura & Orto",   icon:"🥬",
    system:"Sei responsabile acquisti ortofrutta premium per ristorante stellato. Privilegia KM0 e biologico. Considera stagionalità e resa effettiva. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,provenienza_ideale,nota}]}." },
  pasticceria:  { label:"Pasticceria",      icon:"🎂",
    system:"Sei un pastry chef executive con specializzazione in dolci francesi e italiani. Analizza le prep e suggerisci ingredienti con precisione al grammo. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,nota,grade}]}." },
  cantina:      { label:"Cantina & Bev.",   icon:"🍷",
    system:"Sei un sommelier AIS con esperienza in gestione cantina ristorante. Suggerisci acquisti bilanciando abbinamenti, rotazione e budget. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,abbinamento,nota}]}." },
  economato:    { label:"Economato",        icon:"🧴",
    system:"Sei responsabile economato di ristorazione professionale. Ottimizza acquisti non-food rispettando normativa HACCP e budget. Rispondi SOLO in JSON {items:[{nome,qty,unit,urgenza,nota}]}." },
  haccp:        { label:"HACCP & CCP",      icon:"🛡",
    system:"Sei un consulente HACCP certificato per ristorazione professionale (Reg. CE 852/2004). Analizza dati di temperatura, scadenze e procedure. Identifica deviazioni dai CCP e suggerisci azioni correttive IMMEDIATE. Rispondi SOLO in JSON {anomalie:[{zona,valore,limite,gravita,azione_correttiva,tempo_massimo}], conformita_globale:boolean, note_ispettore:string}." },
  waste:        { label:"Analisi Spreco",   icon:"♻️",
    system:"Sei un esperto di food waste management e sostenibilità in ristorazione. Analizza il log sprechi, identifica pattern e suggerisci azioni concrete. Rispondi SOLO in JSON {pattern:[{categoria,frequenza,impatto_euro,causa_probabile}], azioni:[{titolo,descrizione,risparmio_stimato,priorita}], indice_spreco:number, benchmark_settore:string}." },
  menu_expiry:  { label:"Menu Scadenze",    icon:"🍽",
    system:"Sei uno chef creativo specializzato in zero-waste cooking. Dato un elenco di prodotti in scadenza, suggerisci preparazioni e piatti per valorizzarli. Rispondi SOLO in JSON {suggerimenti:[{nome_piatto,ingredienti_usati:[{nome,qty,unit}],tecnica,tempo_prep_min,note_chef,urgenza}]}." },
  briefing:     { label:"Briefing Brigata", icon:"📢",
    system:"Sei uno chef executive che prepara il briefing mattutino della brigata. Analizza giacenze, preparazioni, scadenze critiche. Genera un briefing professionale. Rispondi SOLO in JSON {intestazione:string, priorita_giornaliere:[string], mep_urgente:[{nome,da_fare_entro}], allerte_haccp:[string], nota_chef:string}." },
  par_optimizer:{ label:"Par Level AI",    icon:"📊",
    system:"Sei un esperto di supply chain per ristorazione stellata. Analizza consumo storico e menu. Suggerisci par level ottimali. Rispondi SOLO in JSON {raccomandazioni:[{nome,par_attuale,par_suggerito,motivazione,categoria}], risparmio_stimato_pct:number}." },
  mep_planner:  { label:"MEP Planner",     icon:"⏱",
    system:"Sei un chef de partie esperto in MEP professionale. Ottimizza la mise en place data la lista prep, i coperti e il tempo disponibile. Rispondi SOLO in JSON {mep:[{nome,quantita,unit,tempo_min,priorita,note_tecnica,chi}], tempo_totale_stimato:number, note_organizzazione:string}." },
};

/* PrepToShoppingPanel — converte preparazioni in lista spesa via AI */
function PrepToShoppingPanel({ preps, kitchen, t, onImport, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [reparto, setReparto] = React.useState("cucina_calda");
  const [selected, setSelected] = React.useState({});
  const SHOP_REPARTI = ["cucina_calda","pesce","verdura","pasticceria","cantina","economato"];

  async function generate() {
    setLoading(true); setResult(null);
    const ctx = {
      preparazioni: preps.slice(0,20).map(p=>({nome:p.nome,qty:p.quantita,unit:p.unitaMisura})),
      giacenze: [...(kitchen?.fridge||[]),...(kitchen?.freezer||[]),...(kitchen?.dry||[])].slice(0,40).map(i=>({nome:i.name,qty:i.quantity,unit:i.unit})),
    };
    const prompt = `Preparazioni da eseguire: ${JSON.stringify(ctx.preparazioni)}
Giacenze disponibili: ${JSON.stringify(ctx.giacenze)}
Rispondi SOLO con il JSON richiesto, nessun altro testo.`;
    try {
      const res = await callAI({ systemPrompt: AI_PROMPTS[reparto].system, userContext: prompt, expectJSON:true, maxTokens:900 });
      const items = res?.items||[];
      const sel = {}; items.forEach((_,i)=>{ sel[i]=true; });
      setResult(items); setSelected(sel);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function importSelected() {
    if(!result) return;
    result.filter((_,i)=>selected[i]).forEach(it=>{
      onImport(it.nome, parseFloat(it.qty)||1, it.unit||"pz", "alimenti", it.nota||"");
    });
    onClose();
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:600,maxHeight:"80vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="mono" style={{fontSize:9,letterSpacing:"0.14em",color:t.inkFaint}}>PREP → LISTA SPESA (AI)</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:18}}>×</button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {SHOP_REPARTI.map(k=>(
            <button key={k} onClick={()=>setReparto(k)} style={{
              padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:10,fontFamily:"var(--mono)",
              background:reparto===k?`linear-gradient(135deg,${t.gold},${t.goldBright})`:t.bgAlt,
              color:reparto===k?"#fff":t.inkMuted,
            }}>{AI_PROMPTS[k].icon} {AI_PROMPTS[k].label}</button>
          ))}
        </div>
        {!result&&!loading&&(
          <button onClick={generate} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>
            ✨ Genera lista spesa con AI
          </button>
        )}
        {loading&&<div style={{textAlign:"center",padding:32,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint}}>Analisi AI in corso…</div>}
        {result&&(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {result.map((it,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:t.bgAlt}}>
                  <input type="checkbox" checked={!!selected[i]} onChange={e=>setSelected(s=>({...s,[i]:e.target.checked}))}
                    style={{width:16,height:16,accentColor:t.gold,flexShrink:0}}/>
                  <span style={{flex:1,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{it.nome}</span>
                  <span className="mono" style={{fontSize:10,color:t.gold}}>{it.qty} {it.unit}</span>
                  {it.urgenza&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)"}}>{it.urgenza}</span>}
                </div>
              ))}
            </div>
            <button onClick={importSelected} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:"pointer",
              background:t.success,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>
              ✓ Importa {Object.values(selected).filter(Boolean).length} articoli in lista spesa
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   WasteAnalysisPanel — AI analisi spreco professionale
   ════════════════════════════════════════════════════════ */
function WasteAnalysisPanel({ kitchen, t, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState(null);

  async function analyze() {
    setLoading(true); setResult(null); setError(null);
    const wasteLog = kitchen?.wasteLog || [];
    if (!wasteLog.length) {
      setError("Nessun dato spreco registrato. Registra gli scarti per ottenere analisi AI."); setLoading(false); return;
    }
    const ctx = {
      waste: wasteLog.slice(0,60).map(w=>({nome:w.nome||w.name,categoria:w.categoria||w.category,qty:w.qty||w.quantity,unit:w.unit,motivo:w.motivo||w.reason,data:(w.at||w.date||"").slice(0,10),valore_euro:w.valorePerduto||0})),
      totale_voci: wasteLog.length,
    };
    try {
      const res = await callAI({ systemPrompt:AI_PROMPTS.waste.system, userContext:`Analizza log spreco: ${JSON.stringify(ctx)}`, maxTokens:1200, expectJSON:true });
      setResult(res);
    } catch(e) { setError("Errore: "+e.message); }
    setLoading(false);
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,maxHeight:"85vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>♻️ Analisi Spreco AI</div>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginTop:2}}>FOOD WASTE INTELLIGENCE — HACCP PROFESSIONAL</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
        </div>
        {!result&&!loading&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.inkMuted,marginBottom:20,lineHeight:1.6}}>Analizza pattern di spreco, cause e suggerisce azioni di riduzione.</div>
          <button onClick={analyze} style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>✨ Avvia Analisi AI</button>
        </div>}
        {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint,animation:"pulse 1.5s ease-in-out infinite"}}>Analisi in corso…</div>}
        {error&&<div style={{padding:16,borderRadius:10,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>{error}</div>}
        {result&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{padding:"14px 16px",borderRadius:10,background:t.bgAlt,border:`1px solid ${t.div}`}}>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>INDICE SPRECO</div>
                <div style={{fontFamily:"var(--serif)",fontSize:28,color:result.indice_spreco>15?t.danger:result.indice_spreco>8?t.warning:t.success}}>{result.indice_spreco?.toFixed(1)||"—"}%</div>
              </div>
              <div style={{padding:"14px 16px",borderRadius:10,background:t.bgAlt,border:`1px solid ${t.div}`}}>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>BENCHMARK</div>
                <div style={{fontFamily:"var(--serif)",fontSize:12,color:t.ink,marginTop:4,fontStyle:"italic"}}>{result.benchmark_settore||"—"}</div>
              </div>
            </div>
            {result.pattern?.length>0&&<div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>PATTERN RILEVATI</div>
              {result.pattern.map((p,i)=>(
                <div key={i} style={{padding:"12px 16px",borderRadius:10,background:t.bgAlt,borderLeft:`3px solid ${t.warning}`,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{p.categoria}</span>
                    <span className="mono" style={{fontSize:10,color:t.gold}}>€ {p.impatto_euro||"—"}</span>
                  </div>
                  <div className="mono" style={{fontSize:9,color:t.inkMuted}}>{p.causa_probabile}</div>
                </div>
              ))}
            </div>}
            {result.azioni?.length>0&&<div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>AZIONI CONSIGLIATE</div>
              {result.azioni.map((a,i)=>(
                <div key={i} style={{padding:"12px 16px",borderRadius:10,background:t.bgAlt,borderLeft:`3px solid ${a.priorita==="alta"?t.danger:a.priorita==="media"?t.warning:t.success}`,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:"var(--serif)",fontSize:13,fontWeight:500,color:t.ink}}>{a.titolo}</span>
                    {a.risparmio_stimato&&<span className="mono" style={{fontSize:9,color:t.success}}>-€{a.risparmio_stimato}/mese</span>}
                  </div>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkMuted,lineHeight:1.5}}>{a.descrizione}</div>
                </div>
              ))}
            </div>}
            <button onClick={analyze} style={{padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>↺ Ri-analizza</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* MenuFromExpiryPanel — zero-waste AI recipe suggester */
function MenuFromExpiryPanel({ kitchen, t, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState(null);

  async function generate() {
    setLoading(true); setResult(null); setError(null);
    const now = Date.now();
    const allItems = [...(kitchen?.freezer||[]),...(kitchen?.fridge||[]),...(kitchen?.dry||[]),...(kitchen?.counter||[])];
    const expiring = allItems.filter(x=>x.expiresAt&&new Date(x.expiresAt)>new Date()&&(new Date(x.expiresAt)-now)<72*3600000).sort((a,b)=>new Date(a.expiresAt)-new Date(b.expiresAt));
    if(!expiring.length){setError("Nessun articolo in scadenza nelle prossime 72h.");setLoading(false);return;}
    const ctx = {in_scadenza:expiring.slice(0,20).map(x=>({nome:x.name,qty:x.quantity,unit:x.unit,scade_in_ore:Math.round((new Date(x.expiresAt)-now)/3600000)}))};
    try {
      const res = await callAI({systemPrompt:AI_PROMPTS.menu_expiry.system,userContext:`Articoli in scadenza: ${JSON.stringify(ctx)}`,maxTokens:1400,expectJSON:true});
      setResult(res);
    } catch(e){setError("Errore: "+e.message);}
    setLoading(false);
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,maxHeight:"85vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>🍽 Menu dalle Scadenze</div>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginTop:2}}>ZERO-WASTE AI — VALORIZZIAMO PRIMA CHE SCADA</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
        </div>
        {!result&&!loading&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.inkMuted,marginBottom:20,lineHeight:1.6}}>Suggerisce piatti e preparazioni per valorizzare gli articoli in scadenza entro 72h.</div>
          <button onClick={generate} style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>🍽 Genera suggerimenti</button>
        </div>}
        {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint,animation:"pulse 1.5s ease-in-out infinite"}}>Lo chef AI sta pensando…</div>}
        {error&&<div style={{padding:16,borderRadius:10,background:t.accentGlow,color:t.accent,fontFamily:"var(--mono)",fontSize:11}}>{error}</div>}
        {result?.suggerimenti?.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {result.suggerimenti.map((s,i)=>(
              <div key={i} style={{padding:"16px 18px",borderRadius:12,background:t.bgAlt,border:`1px solid ${t.div}`,borderLeft:`4px solid ${s.urgenza==="alta"?t.danger:t.gold}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontFamily:"var(--serif)",fontSize:15,fontStyle:"italic",fontWeight:500,color:t.ink}}>{s.nome_piatto}</div>
                  {s.urgenza==="alta"&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)"}}>URGENTE</span>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                  {(s.ingredienti_usati||[]).map((ing,j)=>(
                    <span key={j} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:t.goldFaint,color:t.gold,fontFamily:"var(--mono)"}}>{ing.nome} {ing.qty}{ing.unit}</span>
                  ))}
                </div>
                <div className="mono" style={{fontSize:9,color:t.inkMuted}}>🔪 {s.tecnica} · ⏱ {s.tempo_prep_min}min</div>
                {s.note_chef&&<div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11,color:t.inkFaint,borderTop:`1px solid ${t.div}`,paddingTop:6,marginTop:4}}>{s.note_chef}</div>}
              </div>
            ))}
            <button onClick={generate} style={{padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>↺ Rigenera</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* BriefingPanel — briefing mattutino brigata via AI */
function BriefingPanel({ kitchen, t, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState(null);
  const [editMode, setEditMode] = React.useState(false);
  const [editText, setEditText] = React.useState("");
  function generate() {
    setLoading(true); setResult(null); setError(null);
    try {
      const now = Date.now();
      const allItems = [...(kitchen?.freezer||[]),...(kitchen?.fridge||[]),...(kitchen?.dry||[]),...(kitchen?.counter||[])];
      const scaduti = allItems.filter(x=>x.expiresAt&&new Date(x.expiresAt)<new Date());
      const in72h = allItems.filter(x=>x.expiresAt&&new Date(x.expiresAt)>new Date()&&(new Date(x.expiresAt)-now)<72*3600000).sort((a,b)=>new Date(a.expiresAt).getTime()-new Date(b.expiresAt).getTime());
      const sottoPar = allItems.filter(x=>x.parLevel>0&&x.quantity<x.parLevel);
      const preps = (kitchen?.preparazioni||[]).filter(p=>p.status!=="smistata"&&p.status!=="svolta");
      const data = new Date().toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long"});
      const priorita = [];
      if(scaduti.length>0) priorita.push(scaduti.length+" prodotti scaduti da rimuovere: "+scaduti.slice(0,3).map(x=>x.name).join(", ")+(scaduti.length>3?" e altri":""));
      if(in72h.length>0) priorita.push(in72h.length+" articoli in scadenza entro 72h: "+in72h.slice(0,3).map(x=>x.name).join(", "));
      if(sottoPar.length>0) priorita.push("Scorte basse: "+sottoPar.slice(0,4).map(x=>x.name+" ("+x.quantity+"/"+x.parLevel+" "+x.unit+")").join(", "));
      if(preps.filter(p=>p.status==="da_fare").length>0) priorita.push(preps.filter(p=>p.status==="da_fare").length+" preparazioni da avviare");
      if(priorita.length===0) priorita.push("Cucina in ordine — nessuna criticita urgente");
      const mep_urgente = preps.slice(0,8).map(p=>({nome:p.nome+(p.quantita?" x"+p.quantita+(p.unitaMisura?" "+p.unitaMisura:""):""),da_fare_entro:p.scadeIl?new Date(p.scadeIl).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}):'oggi'}));
      const allerte_haccp = [];
      if(scaduti.length>0) allerte_haccp.push("Rimuovere prodotti scaduti: "+scaduti.map(x=>x.name).join(", "));
      if(in72h.length>0) allerte_haccp.push("Verificare rotazione FIFO: "+in72h.slice(0,3).map(x=>x.name).join(", "));
      const nota_chef = preps.length===0 ? "Tutte le preparazioni completate. Ottimo lavoro." : "Priorita: "+preps.slice(0,2).map(p=>p.nome).join(" e ")+(preps.length>2?" e altre "+(preps.length-2)+" prep":"");
      setResult({intestazione:"Briefing "+kitchen?.name+" "+data+" - "+(kitchen?.members?.length||1)+" in brigata",priorita_giornaliere:priorita,mep_urgente,allerte_haccp,nota_chef});
    } catch(e){setError("Errore: "+e.message);}
    setLoading(false);
  }
  React.useEffect(()=>{generate();},[]);

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,maxHeight:"85vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>📢 Briefing Brigata</div>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginTop:2}}>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).toUpperCase()}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint,animation:"pulse 1.5s ease-in-out infinite"}}>Generazione briefing…</div>}
        {error&&<div style={{padding:16,borderRadius:10,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>{error}</div>}
        {result&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:"16px 20px",borderRadius:12,background:`linear-gradient(135deg,${t.secondary}22,${t.bgAlt})`,border:`1px solid ${t.secondary}44`}}>
              <input value={result.intestazione||""} onChange={e=>setResult((r:any)=>({...r,intestazione:e.target.value}))}
                style={{width:"100%",fontFamily:"var(--serif)",fontSize:15,fontStyle:"italic",color:t.ink,lineHeight:1.5,background:"transparent",border:"none",outline:"none"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>PRIORITA DEL GIORNO</div>
              {(result.priorita_giornaliere||[]).map((p:any,i:number)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
                  <span className="mono" style={{color:t.gold,flexShrink:0,minWidth:18}}>{i+1}.</span>
                  <input value={p} onChange={e=>{const arr=[...(result.priorita_giornaliere||[])];arr[i]=e.target.value;setResult((r:any)=>({...r,priorita_giornaliere:arr}));}}
                    style={{flex:1,padding:"6px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,outline:"none"}}/>
                  <button onClick={()=>{const arr=(result.priorita_giornaliere||[]).filter((_:any,j:number)=>j!==i);setResult((r:any)=>({...r,priorita_giornaliere:arr}));}} style={{padding:"2px 8px",borderRadius:5,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontSize:10}}>x</button>
                </div>
              ))}
              <button onClick={()=>setResult((r:any)=>({...r,priorita_giornaliere:[...(r.priorita_giornaliere||[]),""]}))}
                style={{padding:"4px 12px",borderRadius:7,border:`1px dashed ${t.div}`,background:"transparent",color:t.inkFaint,fontFamily:"var(--mono)",fontSize:9,cursor:"pointer",marginTop:4}}>+ Aggiungi priorita</button>
            </div>
            {(result.mep_urgente||[]).length>0&&<div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>MEP URGENTE</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(result.mep_urgente||[]).map((m:any,i:number)=>(
                  <div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input value={m.nome||""} onChange={e=>{const arr=[...(result.mep_urgente||[])];arr[i]={...arr[i],nome:e.target.value};setResult((r:any)=>({...r,mep_urgente:arr}));}}
                      style={{flex:2,padding:"5px 8px",borderRadius:7,border:`1px solid ${t.goldDim}`,background:t.goldFaint,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,outline:"none"}}/>
                    <input value={m.da_fare_entro||""} onChange={e=>{const arr=[...(result.mep_urgente||[])];arr[i]={...arr[i],da_fare_entro:e.target.value};setResult((r:any)=>({...r,mep_urgente:arr}));}}
                      style={{flex:1,padding:"5px 8px",borderRadius:7,border:`1px solid ${t.goldDim}`,background:t.goldFaint,color:t.gold,fontFamily:"var(--mono)",fontSize:9,outline:"none"}}/>
                    <button onClick={()=>{const arr=(result.mep_urgente||[]).filter((_:any,j:number)=>j!==i);setResult((r:any)=>({...r,mep_urgente:arr}));}} style={{padding:"2px 8px",borderRadius:5,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontSize:10}}>x</button>
                  </div>
                ))}
              </div>
            </div>}
            {(result.allerte_haccp||[]).length>0&&<div style={{padding:"12px 16px",borderRadius:10,background:t.accentGlow,border:`1px solid ${t.danger}44`}}>
              <div className="mono" style={{fontSize:9,color:t.danger,marginBottom:6}}>ALLERTE HACCP</div>
              {(result.allerte_haccp||[]).map((a:any,i:number)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <input value={a} onChange={e=>{const arr=[...(result.allerte_haccp||[])];arr[i]=e.target.value;setResult((r:any)=>({...r,allerte_haccp:arr}));}}
                    style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.danger}44`,background:"transparent",color:t.danger,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,outline:"none"}}/>
                  <button onClick={()=>{const arr=(result.allerte_haccp||[]).filter((_:any,j:number)=>j!==i);setResult((r:any)=>({...r,allerte_haccp:arr}));}} style={{padding:"2px 8px",borderRadius:5,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontSize:10}}>x</button>
                </div>
              ))}
            </div>}
            <div style={{padding:"14px 18px",borderRadius:10,background:t.bgAlt,borderLeft:`4px solid ${t.gold}`}}>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>NOTA CHEF</div>
              <textarea value={result.nota_chef||""} onChange={e=>setResult((r:any)=>({...r,nota_chef:e.target.value}))}
                style={{width:"100%",fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,lineHeight:1.6,background:"transparent",border:"none",outline:"none",resize:"none",minHeight:60}}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={generate} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>↺ Rigenera</button>
              <button onClick={()=>{
                function buildText(r){
                  const rows=[r.intestazione,"","PRIORITA:",...(r.priorita_giornaliere||[]).map((p,i)=>(i+1)+". "+p)];
                  if(r.mep_urgente?.length){rows.push("","MEP URGENTE:");r.mep_urgente.forEach(m=>rows.push("- "+m.nome+(m.da_fare_entro?" -> "+m.da_fare_entro:"")));}
                  if(r.allerte_haccp?.length){rows.push("","HACCP:");r.allerte_haccp.forEach(a=>rows.push("- "+a));}
                  if(r.nota_chef){rows.push("","NOTA CHEF:",r.nota_chef);}
                  return rows.join("\n");
                }
                navigator.clipboard?.writeText(buildText(result)).then(()=>alert("Briefing copiato!"));
              }} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Copia</button>
              <button onClick={()=>{
                function buildText(r){
                  const rows=[r.intestazione,"","PRIORITA:",...(r.priorita_giornaliere||[]).map((p,i)=>(i+1)+". "+p)];
                  if(r.mep_urgente?.length){rows.push("","MEP URGENTE:");r.mep_urgente.forEach(m=>rows.push("- "+m.nome+(m.da_fare_entro?" -> "+m.da_fare_entro:"")));}
                  if(r.allerte_haccp?.length){rows.push("","HACCP:");r.allerte_haccp.forEach(a=>rows.push("- "+a));}
                  if(r.nota_chef){rows.push("","NOTA CHEF:",r.nota_chef);}
                  return rows.join("\n");
                }
                window.open("https://wa.me/?text="+encodeURIComponent(buildText(result)),"_blank");
              }} style={{padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",background:"#25D36620",color:"#25D366",fontFamily:"var(--mono)",fontSize:10}}>WhatsApp</button>
              <button onClick={()=>{const r=result;const rows=[r.intestazione,"","PRIORITA:",...(r.priorita_giornaliere||[]).map((p,i)=>(i+1)+". "+p)];if(r.mep_urgente&&r.mep_urgente.length){rows.push("","MEP URGENTE:");r.mep_urgente.forEach(m=>rows.push("- "+m.nome+(m.da_fare_entro?" -> "+m.da_fare_entro:"")));}if(r.allerte_haccp&&r.allerte_haccp.length){rows.push("","HACCP:");r.allerte_haccp.forEach(a=>rows.push("- "+a));}if(r.nota_chef){rows.push("","NOTA CHEF:",r.nota_chef);}setEditText(rows.join("\n"));setEditMode(e=>!e);}} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:editMode?t.gold+"20":"transparent",color:editMode?t.gold:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>{editMode?"x Vista":"Edit"}</button>
              <button onClick={()=>window.print()} style={{padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",background:t.bgAlt,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Stampa</button>
            </div>
            {editMode&&<textarea value={editText} onChange={e=>setEditText(e.target.value)} style={{width:"100%",minHeight:280,padding:"12px",borderRadius:10,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none",marginTop:8}}/>}
          </div>
        )}
      </div>
    </div>
  );
}

/* HACCPAIPanel — analisi temperatura + azioni correttive AI */
function HACCPAIPanel({ kitchen, logs, t, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState(null);

  async function analyze() {
    setLoading(true); setResult(null); setError(null);
    const allItems = [...(kitchen?.freezer||[]),...(kitchen?.fridge||[]),...(kitchen?.dry||[]),...(kitchen?.counter||[])];
    const ctx = {
      temp_logs_non_conformi: (logs||[]).filter(l=>!l.ok).slice(0,20).map(l=>({zona:l.zona,temp:l.temp,data:l.at?.slice(0,16),operatore:l.op,note:l.note})),
      totale_log: (logs||[]).length,
      scaduti: allItems.filter(x=>x.expiresAt&&new Date(x.expiresAt)<new Date()).map(x=>({nome:x.name,scaduto_il:x.expiresAt?.slice(0,10),location:x.location})),
    };
    try {
      const res = await callAI({systemPrompt:AI_PROMPTS.haccp.system,userContext:`Valuta conformità HACCP: ${JSON.stringify(ctx)}`,maxTokens:1200,expectJSON:true});
      setResult(res);
    } catch(e){setError("Errore: "+e.message);}
    setLoading(false);
  }

  const GRAV = {alta:{color:"#E85D5D",bg:"rgba(232,93,93,0.1)"},media:{color:"#F0C050",bg:"rgba(240,192,80,0.1)"},bassa:{color:"#60B878",bg:"rgba(96,184,120,0.1)"}};

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,maxHeight:"88vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>🛡 Analisi HACCP AI</div>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginTop:2}}>CCP COMPLIANCE — REG. CE 852/2004</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
        </div>
        {!result&&!loading&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.inkMuted,marginBottom:20,lineHeight:1.7}}>Analisi completa conformità HACCP: temperature, scaduti, CCP e azioni correttive.</div>
          <button onClick={analyze} style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>🛡 Esegui Verifica HACCP</button>
        </div>}
        {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint,animation:"pulse 1.5s ease-in-out infinite"}}>Verifica CCP in corso…</div>}
        {error&&<div style={{padding:16,borderRadius:10,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>{error}</div>}
        {result&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:"14px 18px",borderRadius:12,background:result.conformita_globale?"rgba(96,184,120,0.1)":"rgba(232,93,93,0.1)",border:`1.5px solid ${result.conformita_globale?t.success:t.danger}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{result.conformita_globale?"✅":"⚠️"}</span>
                <div>
                  <div style={{fontFamily:"var(--serif)",fontSize:14,fontStyle:"italic",color:result.conformita_globale?t.success:t.danger}}>{result.conformita_globale?"Cucina Conforme HACCP":"Non Conformità Rilevate"}</div>
                  {result.note_ispettore&&<div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkMuted,marginTop:4}}>{result.note_ispettore}</div>}
                </div>
              </div>
            </div>
            {result.anomalie?.length>0&&<div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>DEVIAZIONI CCP — AZIONI CORRETTIVE</div>
              {result.anomalie.map((a,i)=>{const g=GRAV[a.gravita]||GRAV.media;return(
                <div key={i} style={{padding:"14px 16px",borderRadius:10,background:g.bg,border:`1px solid ${g.color}44`,borderLeft:`4px solid ${g.color}`,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span className="mono" style={{fontSize:10,color:g.color}}>{a.zona?.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:g.color,color:"#fff",fontFamily:"var(--mono)"}}>{a.gravita?.toUpperCase()}</span>
                  </div>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,marginBottom:6}}>{a.valore} vs limite {a.limite}</div>
                  <div style={{padding:"8px 12px",borderRadius:6,background:"rgba(0,0,0,0.08)"}}>
                    <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:3}}>AZIONE CORRETTIVA</div>
                    <div style={{fontFamily:"var(--serif)",fontSize:12,color:t.ink}}>{a.azione_correttiva}</div>
                    {a.tempo_massimo&&<div className="mono" style={{fontSize:9,color:g.color,marginTop:4}}>⏱ Entro: {a.tempo_massimo}</div>}
                  </div>
                </div>
              );})}
            </div>}
            <button onClick={analyze} style={{padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>↺ Ri-verifica</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* MEPPlannerAI — pianificazione MEP da coperti + prep */
function MEPPlannerAI({ kitchen, t, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState(null);
  const [coperti, setCoperti] = React.useState("50");
  const [turno,   setTurno]   = React.useState("pranzo");

  async function generate() {
    setLoading(true); setResult(null); setError(null);
    const ctx = {
      coperti:parseInt(coperti)||50, turno,
      preparazioni:(kitchen?.preparazioni||[]).filter(p=>p.status!=="smistata").slice(0,15).map(p=>({nome:p.nome,qty:p.quantita,unit:p.unitaMisura,reparto:p.reparto})),
      brigata:(kitchen?.members||[]).map(m=>({nome:m.name,ruolo:m.role})),
    };
    try {
      const res = await callAI({systemPrompt:AI_PROMPTS.mep_planner.system,userContext:JSON.stringify(ctx),maxTokens:1400,expectJSON:true});
      setResult(res);
    } catch(e){setError("Errore: "+e.message);}
    setLoading(false);
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,maxHeight:"88vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>⏱ MEP Planner AI</div>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginTop:2}}>MISE EN PLACE OTTIMIZZATA</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
        </div>
        {!result&&!loading&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>COPERTI PREVISTI</div>
                <input value={coperti} onChange={e=>setCoperti(e.target.value)} type="number" min="1"
                  style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:14}}/>
              </div>
              <div>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>TURNO</div>
                <select value={turno} onChange={e=>setTurno(e.target.value)}
                  style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}>
                  <option value="colazione">🌅 Colazione</option>
                  <option value="pranzo">☀️ Pranzo</option>
                  <option value="aperitivo">🥂 Aperitivo</option>
                  <option value="cena">🌙 Cena</option>
                </select>
              </div>
            </div>
            <button onClick={generate} style={{padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>⏱ Genera MEP Ottimizzato</button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkFaint,animation:"pulse 1.5s ease-in-out infinite"}}>Ottimizzazione MEP…</div>}
        {error&&<div style={{padding:16,borderRadius:10,background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>{error}</div>}
        {result&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {result.note_organizzazione&&<div style={{padding:"12px 16px",borderRadius:10,background:t.bgAlt,borderLeft:`4px solid ${t.gold}`}}>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{result.note_organizzazione}</div>
              {result.tempo_totale_stimato&&<div className="mono" style={{fontSize:9,color:t.gold,marginTop:4}}>Totale: {result.tempo_totale_stimato} min</div>}
            </div>}
            {(result.mep||[]).map((m,i)=>{const priColor=m.priorita==="alta"?t.danger:m.priorita==="media"?t.warning:t.success;return(
              <div key={i} style={{padding:"12px 16px",borderRadius:10,background:t.bgAlt,display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:4,flexShrink:0,alignSelf:"stretch",borderRadius:2,background:priColor}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{m.nome}</span>
                    <span className="mono" style={{fontSize:9,color:t.gold}}>{m.quantita} {m.unit}</span>
                  </div>
                  {m.note_tecnica&&<div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11,color:t.inkMuted,marginTop:2}}>{m.note_tecnica}</div>}
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    {m.tempo_min&&<span className="mono" style={{fontSize:9,color:t.inkFaint}}>⏱ {m.tempo_min}min</span>}
                    {m.chi&&<span className="mono" style={{fontSize:9,color:t.secondary}}>👤 {m.chi}</span>}
                  </div>
                </div>
              </div>
            );})}
            <button onClick={()=>setResult(null)} style={{padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>← Modifica parametri</button>
          </div>
        )}
      </div>
    </div>
  );
}


function QuickPrepFAB({ t }) {
  const { prepAdd, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [qty,  setQty]  = React.useState("1");
  const [unit, setUnit] = React.useState("pz");
  const [customPrepsL, saveCustomPrep] = useCustomMemory("preparazioni");
  if(!canEdit) return null;
  function handleAdd() {
    if(!nome.trim()){toast("Inserisci un nome","error");return;}
    prepAdd(nome.trim(),parseFloat(qty)||1,unit,"antipasti","antipasti","mattina","");
    toast(`${nome} aggiunta`,"success"); setNome(""); setQty("1"); setOpen(false);
  }
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{
        position:"fixed",bottom:"calc(72px + env(safe-area-inset-bottom,0px))",right:16,
        width:52,height:52,borderRadius:"50%",border:"none",cursor:"pointer",zIndex:300,
        background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontSize:22,
        boxShadow:`0 4px 20px rgba(0,0,0,0.45)`,display:"flex",alignItems:"center",justifyContent:"center",
        transition:"transform 0.2s",transform:open?"rotate(45deg)":"rotate(0deg)",
      }}>+</button>
      {open&&(
        <div style={{position:"fixed",bottom:"calc(132px + env(safe-area-inset-bottom,0px))",right:12,left:12,
          zIndex:299,background:t.bgCard,borderRadius:16,boxShadow:`0 8px 40px rgba(0,0,0,0.5)`,
          border:`1px solid ${t.div}`,padding:"16px 18px"}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:10}}>PREP RAPIDA</div>
          <AutocompleteInput value={nome} onChange={e=>setNome(e.target.value)}
            onSelect={p=>{setNome(p.n);}} placeholder="Nome preparazione (autocomplete)…"
            t={t} catalog={PREP_CATALOG} extraSuggestions={customPrepsL}/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="0.1" step="0.5"
              style={{width:60,padding:"8px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:13}}/>
            <select value={unit} onChange={e=>setUnit(e.target.value)}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}>
              {["pz","kg","g","l","vasch","busta"].map(u=><option key={u}>{u}</option>)}
            </select>
            <button onClick={handleAdd} style={{flex:1,padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>✓ Aggiungi</button>
          </div>
        </div>
      )}
    </>
  );
}

function PreparazioniView({ t, hideForm=false }) {
  const { kitchen, prepAdd, prepUpdate, prepRemove, prepStatus, allItems, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [customPrepsL, saveCustomPrep] = useCustomMemory("preparazioni");

  const preps     = kitchen?.preparazioni||[];
  const oggi      = todayDate();
  const [tab,     setTab]      = useState("tutte");
  const [catFil,  setCatFil]   = useState("tutti");
  const [prepCatFil, setPrepCatFil] = useState("tutti");
  const [partitaFil, setPartitaFil] = useState("tutti");
  const [showForm,setShowForm]=useState(false);
  const [form, setForm] = useState({
    nome:"", qty:"1", unit:"pz",
    categoria:"antipasti", note:"",
    scadeIl:"", partita:"antipasti",
  });

  // ── Alert on mount ─────────────────────────────────
  const [alerts, setAlerts] = useState([]);
  useEffect(()=>{
    const a = selectAlertCritici(kitchen);
    setAlerts(a);
    if(a.length>0) toast(`${a.length} alert attivi — controlla frigo e congelatore`,"error");
  }, []);

  // ── Svolte oggi (auto) ─────────────────────────────
  const svolteOggi = useMemo(()=>
    preps.filter(p=>p.status==="svolta"&&(p.svoltaIl||"").startsWith(oggi)),
    [preps, oggi]
  );

  // ── Congelatore ────────────────────────────────────
  const inCongelatore = kitchen?.freezer||[];

  function save() {
    if(!form.nome.trim()) { toast("Inserisci il nome","error"); return; }
    prepAdd(form.nome,form.qty,form.unit,form.categoria,form.categoria,"mattina",form.note,form.scadeIl||null);
    saveCustomPrep(form.nome);
    toast(`${form.nome} aggiunta`,"success");
    setForm({nome:"",qty:"1",unit:"pz",categoria:"antipasti",note:"",scadeIl:"",partita:"antipasti"});
    setShowForm(false);
  }

  const [searchPrep, setSearchPrep] = useState("");
  const [statusFil, setStatusFil] = useState("all"); // all | da_fare | in_corso | svolta | smistata | scadente
  const [sortPrep, setSortPrep] = useState("default"); // default | nome | scadenza | qty

  const filteredPreps = useMemo(()=>{
    let p: any[];
    if(tab==="svolte") p=[...svolteOggi];
    else if(tab==="congelatore"||tab==="calendario") p=[];
    else { p=[...preps]; if(tab==="categoria"&&catFil!=="tutti") p=p.filter(x=>x.categoriaKey===catFil); }
    if(prepCatFil!=="tutti") p=p.filter(x=>x.categoriaKey===prepCatFil);
    if(partitaFil!=="tutti") p=p.filter(x=>(x.categoriaKey||x.reparto||x.partita||"antipasti")===partitaFil);
    // search
    if(searchPrep.trim()) p=p.filter(x=>x.nome.toLowerCase().includes(searchPrep.toLowerCase()));
    // status
    if(statusFil!=="all") {
      if(statusFil==="scadente") {
        const now=Date.now();
        p=p.filter(x=>x.scadeIl&&Math.round((new Date(x.scadeIl)-now)/86400000)<=2);
      } else {
        p=p.filter(x=>x.status===statusFil);
      }
    }
    // sort
    if(sortPrep==="nome") p.sort((a,b)=>a.nome.localeCompare(b.nome,"it"));
    if(sortPrep==="scadenza") p.sort((a,b)=>{
      if(!a.scadeIl&&!b.scadeIl)return 0;if(!a.scadeIl)return 1;if(!b.scadeIl)return -1;
      return new Date(a.scadeIl)-new Date(b.scadeIl);
    });
    if(sortPrep==="qty") p.sort((a,b)=>(b.quantita||0)-(a.quantita||0));
    return p;
  },[preps,tab,catFil,svolteOggi,searchPrep,statusFil,sortPrep]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Alert banner — priorità massima */}
      {alerts.length>0&&<AlertBanner alerts={alerts} t={t} onDismiss={id=>setAlerts(p=>p.filter(a=>a.id!==id))}/>}

      {/* Header actions */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[
          {k:"tutte",   l:"📋 Tutte"},
          {k:"categoria",l:"🗂 Categoria"},
          {k:"calendario",l:"📅 Calendario"},
          {k:"svolte",  l:`✅ Svolte oggi (${svolteOggi.length})`},
          {k:"congelatore",l:`❄️ Congelatore (${inCongelatore.length})`},
          {k:"partita",l:"👨‍🍳 Partita"},
        ].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
            background:tab===k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:t.bgCard,
            color:tab===k?"#fff":t.inkMuted,boxShadow:`0 1px 4px ${t.shadow}`,transition:"all 0.2s",
          }}>{l}</button>
        ))}
        {canEdit&&!hideForm&&(
          <button onClick={()=>setShowForm(f=>!f)} style={{
            marginLeft:"auto",padding:"8px 18px",borderRadius:10,cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
          }}>+ Nuova Prep</button>
        )}
      </div>

      {/* STATUS + SEARCH + SORT FILTERS */}
      {(tab==="tutte"||tab==="categoria")&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input value={searchPrep} onChange={e=>setSearchPrep(e.target.value)}
              placeholder="Cerca preparazione…" style={{
              flex:1,minWidth:160,padding:"7px 14px",borderRadius:20,
              border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,
              fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12}}/>
            {[
              {k:"all",l:"Tutte",col:t.inkFaint},
              {k:"da_fare",l:"⬜ Da fare",col:t.warning},
              {k:"in_corso",l:"🔄 In corso",col:t.secondary},
              {k:"svolta",l:"✓ Svolta",col:t.success},
              {k:"smistata",l:"✅ Smistata",col:"#6EA86E"},
              {k:"scadente",l:"⚠ Scadenti",col:t.danger},
            ].map(({k,l,col})=>(
              <button key={k} onClick={()=>setStatusFil(k)} style={{
                padding:"5px 12px",borderRadius:20,cursor:"pointer",
                border:`1px solid ${statusFil===k?col:t.div}`,
                background:statusFil===k?col+"20":"transparent",
                color:statusFil===k?col:t.inkMuted,fontFamily:"var(--mono)",fontSize:9,transition:"all 0.15s",
              }}>{l}</button>
            ))}
            <select value={sortPrep} onChange={e=>setSortPrep(e.target.value)} style={{
              padding:"5px 10px",borderRadius:8,border:`1px solid ${t.div}`,
              background:t.bgAlt,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9,cursor:"pointer"}}>
              <option value="default">Ordine default</option>
              <option value="nome">Nome A→Z</option>
              <option value="scadenza">Prima scadenza</option>
              <option value="qty">Quantità desc</option>
            </select>
          </div>
          {(statusFil!=="all"||searchPrep||sortPrep!=="default")&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{filteredPreps.length} risultati</span>
              <button onClick={()=>{setStatusFil("all");setSearchPrep("");setSortPrep("default");}} style={{
                padding:"3px 10px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
                background:"transparent",color:t.inkFaint,fontFamily:"var(--mono)",fontSize:9}}>✕ Reset</button>
            </div>
          )}
        </div>
      )}

      {/* Filtro categoria */}
      {(tab==="categoria"||tab==="tutte")&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span className="mono" style={{fontSize:8,color:"#999",letterSpacing:"0.1em"}}>CATEGORIA:</span>
          {[{key:"tutti",label:"Tutte",icon:"⭐"},...CATEGORIE_MENU.filter(c=>c.key!=="svolte")].map(c=>(
            <button key={c.key}
              onClick={()=>tab==="categoria"?setCatFil(c.key):setPrepCatFil(c.key)}
              style={{
                padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",
                fontFamily:"var(--mono)",fontSize:9,
                background:(tab==="categoria"?catFil:prepCatFil)===c.key?t.accent:t.bgCard,
                color:(tab==="categoria"?catFil:prepCatFil)===c.key?"#fff":t.inkMuted,
                transition:"all 0.15s",
              }}>{c.icon||""} {c.label}</button>
          ))}
        </div>
      )}

      {/* Filtro partita */}
      {tab==="partita"&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span className="mono" style={{fontSize:8,color:"#999",letterSpacing:"0.1em"}}>PARTITA:</span>
          {[{key:"tutti",label:"Tutte",icon:"⭐"},...STATIONS.filter(s=>s.key!=="all")].map(s=>(
            <button key={s.key} onClick={()=>setPartitaFil(s.key)} style={{
              padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",
              fontFamily:"var(--mono)",fontSize:9,
              background:partitaFil===s.key?t.accent:t.bgCard,
              color:partitaFil===s.key?"#fff":t.inkMuted,transition:"all 0.15s",
            }}>{s.icon||""} {s.label}</button>
          ))}
        </div>
      )}
      {/* Form nuova prep */}
      {showForm&&canEdit&&!hideForm&&(
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>NUOVA PREPARAZIONE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <AutocompleteInput value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}
              onSelect={p=>{setForm(q=>({...q,nome:p.n,unit:p.u||q.unit}));saveCustomPrep(p.n);}}
              placeholder="Nome preparazione (autocomplete)" t={t} style={{gridColumn:"1/-1"}}
              catalog={PREP_CATALOG} extraSuggestions={[...(customPrepsL||[]),...(kitchen?.ingredienti||[]).map((i:any)=>i.nome).filter(Boolean),...(JSON.parse(localStorage.getItem("semilav-"+kitchen?.id)||"[]")).map((s:any)=>s.nome).filter(Boolean)]}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <LuxInput value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} type="number" placeholder="Qtà" t={t}/>
              <LuxSelect value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} t={t}>
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </LuxSelect>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <span className="mono" style={{fontSize:8,color:"#999",letterSpacing:"0.1em"}}>CATEGORIA MENU</span>
              <LuxSelect value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} t={t}>
                {CATEGORIE_MENU.filter(c=>c.key!=="svolte").map(c=>(
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </LuxSelect>
            </div>

            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>SCADENZA PREP</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                {[1,2,3,5,7,10,14,21,31].map(d=>{
                  const dt=new Date();dt.setDate(dt.getDate()+d);
                  const iso=dt.toISOString().slice(0,10);
                  return <button key={d} onClick={()=>setForm(p=>({...p,scadeIl:iso}))} style={{
                    padding:"3px 8px",borderRadius:6,border:"1px solid rgba(193,154,62,0.4)",
                    background:form.scadeIl===iso?"#C19A3E":"rgba(193,154,62,0.08)",
                    color:form.scadeIl===iso?"#fff":"#C19A3E",
                    fontFamily:"var(--mono)",fontSize:9,cursor:"pointer",
                  }}>+{d}gg</button>;
                })}
              </div>
              <LuxInput value={form.scadeIl} onChange={e=>setForm(p=>({...p,scadeIl:e.target.value}))} type="date" t={t}/>
            </div>
            <LuxInput value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Note tecniche" t={t} style={{gridColumn:"1/-1"}}/>
          </div>
          <Btn t={t} variant="gold" onClick={save} disabled={!form.nome.trim()}>+ Aggiungi Preparazione</Btn>
        </Card>
      )}

      {/* Vista Congelatore */}
      {tab==="congelatore"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {inCongelatore.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint,fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic"}}>
              Congelatore vuoto
            </div>
          )}
          {inCongelatore.map(item=>{
            const badge=expiryBadge(item.expiresAt);
            return (
              <Card key={item.id} t={t} style={{padding:"14px 20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:20}}>❄️</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>{item.name}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
                      {item.quantity} {item.unit}
                      {item.expiresAt&&` · Scad. ${fmtDate(item.expiresAt)}`}
                      {item.lot&&` · Lotto: ${item.lot}`}
                    </div>
                  </div>
                  {badge&&<span style={{padding:"3px 8px",borderRadius:6,background:badge.bg,color:badge.color,fontFamily:"var(--mono)",fontSize:9}}>{badge.label}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista Svolte */}
      {tab==="svolte"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {svolteOggi.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}>
              <div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic",marginBottom:8}}>Nessuna preparazione svolta oggi</div>
              <div className="mono" style={{fontSize:9}}>SI POPOLA AUTOMATICAMENTE</div>
            </div>
          )}
          {svolteOggi.map(prep=>(
            <PrepCard key={prep.id} prep={prep} t={t} canEdit={canEdit}
              onStatus={prepStatus} onRemove={prepRemove}/>
          ))}
        </div>
      )}

      {/* Vista Calendario */}
      {tab==="calendario"&&(()=>{
        // Raggruppa prep per data o per categoria menu
        const oggi2 = new Date();
        const giorni = Array.from({length:7},(_,i)=>{
          const d=new Date(oggi2); d.setDate(d.getDate()+i);
          return d;
        });
        return (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:"10px 14px",background:t.bgAlt,borderRadius:10,fontFamily:"var(--mono)",fontSize:9,color:t.inkFaint}}>
              📅 Vista 7 giorni — prep con scadenza assegnata · clicca su un giorno per aggiungerne una
            </div>
            {giorni.map(giorno=>{
              const label = giorno.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"short"});
              const iso   = giorno.toISOString().slice(0,10);
              const prepGiorno = preps.filter(p=>p.scadeIl&&p.scadeIl.startsWith(iso));
              const isOggi = iso===oggi;
              return (
                <div key={iso} style={{borderRadius:12,border:`1px solid ${isOggi?t.gold:t.div}`,overflow:"hidden",
                  boxShadow:isOggi?`0 0 0 2px ${t.gold}30`:"none"}}>
                  <div style={{padding:"10px 16px",background:isOggi?t.goldFaint:t.bgAlt,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:isOggi?t.gold:t.inkMuted,letterSpacing:"0.06em",textTransform:"capitalize"}}>
                      {isOggi?"OGGI — ":""}{label}
                    </span>
                    <span style={{fontFamily:"var(--mono)",fontSize:9,color:t.inkFaint}}>{prepGiorno.length} prep</span>
                  </div>
                  {prepGiorno.length===0 ? (
                    <div style={{padding:"12px 16px",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12}}>— nessuna preparazione</div>
                  ) : prepGiorno.map(p=>{
                    const cat2=CATEGORIE_MENU.find(c=>c.key===p.categoriaKey);
                    const sc2=p.status||"da_fare";
                    const SC={da_fare:"#7A7168",in_corso:"#C19A3E",svolta:"#3D7A4A",smistata:"#182040"};
                    const SL={da_fare:"Da fare",in_corso:"In corso",svolta:"Svolta",smistata:"Smistata"};
                    return (
                      <div key={p.id} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderTop:`1px solid ${t.div}`}}>
                        <span style={{fontSize:18}}>{cat2?.icon||"📋"}</span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{p.nome}</div>
                          <div className="mono" style={{fontSize:8,color:t.inkFaint}}>{p.quantita} {p.unitaMisura}</div>
                        </div>
                        <span style={{padding:"3px 8px",borderRadius:6,fontSize:8,fontFamily:"var(--mono)",
                          background:SC[sc2]+"22",color:SC[sc2],border:`1px solid ${SC[sc2]}44`}}>
                          {SL[sc2]}
                        </span>
                        {canEdit&&<button onClick={()=>prepStatus(p.id,"svolta")} style={{
                          ...btnSmall(t),background:"#3D7A4A20",color:"#3D7A4A",fontSize:8,
                        }}>✓ Svolta</button>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Vista principale (Tutte / Categoria) */}
      {tab==="categoria"&&catFil==="tutti"&&(
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {CATEGORIE_MENU.filter(c=>c.key!=="svolte").map(catMenu=>{
            const catPreps = filteredPreps.filter((p:any)=>p.categoriaKey===catMenu.key);
            if(!catPreps.length) return null;
            return (
              <div key={catMenu.key} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,
                  padding:"8px 14px",borderRadius:10,
                  background:`linear-gradient(135deg,${t.accent}12,${t.bgAlt})`,
                  border:`1px solid ${t.accent}30`}}>
                  <span style={{fontSize:18}}>{catMenu.icon}</span>
                  <span className="mono" style={{fontSize:9,letterSpacing:"0.14em",color:t.accent,flex:1}}>
                    {catMenu.label.toUpperCase()}
                  </span>
                  <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{catPreps.length} prep</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {catPreps.map((prep:any)=>(
                    <PrepCard key={prep.id} prep={prep} t={t} canEdit={canEdit}
                      onStatus={prepStatus} onRemove={prepRemove}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(tab==="tutte"||(tab==="categoria"&&catFil!=="tutti"))&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filteredPreps.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}>
              <div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic",marginBottom:8}}>Nessuna preparazione</div>
              {canEdit&&<div className="mono" style={{fontSize:9}}>USA IL PULSANTE + PER AGGIUNGERNE UNA</div>}
            </div>
          )}
          {filteredPreps.map(prep=>(
            <PrepCard key={prep.id} prep={prep} t={t} canEdit={canEdit}
              onStatus={prepStatus} onRemove={prepRemove}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── PrepCard ── */
function PrepCard({ prep, t, canEdit, onStatus, onRemove }) {
  const { stockAdd } = useK();
  const toast = useToast();
  const [exp, setExp] = useState(false);
  const [showSmista, setShowSmista] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editNome, setEditNome] = useState(prep.nome||"");
  const [editQty, setEditQty] = useState(String(prep.quantita||1));
  const [editUnit, setEditUnit] = useState(prep.unitaMisura||"pz");
  const [editNote, setEditNote] = useState(prep.note||"");
  const [editScade, setEditScade] = useState(prep.scadeIl||"");
  const [editPartita, setEditPartita] = useState(prep.partita||prep.reparto||"antipasti");
  const { prepUpdate } = useK();
  function saveEdit() {
    prepUpdate(prep.id,{nome:editNome,quantita:parseFloat(editQty)||1,unitaMisura:editUnit,note:editNote,scadeIl:editScade||null,partita:editPartita});
    toast("Prep aggiornata","success");
    setEditMode(false);
  }
  const [smistaLoc, setSmistaLoc] = useState("fridge");
  const [smistaQty, setSmistaQty] = useState(String(prep.quantita||1));
  const [smistaExpiry, setSmistaExpiry] = useState("");
  const cat = CATEGORIE_MENU.find(c=>c.key===prep.categoriaKey);
  const STATUS_COLORS:any = {da_fare:"#7A7168",in_corso:"#C19A3E",svolta:"#3D7A4A",smistata:"#182040"};
  const STATUS_LABELS:any = {da_fare:"Da fare",in_corso:"In corso",svolta:"Svolta",smistata:"Smistata"};
  const sc = prep.status||"da_fare";

  function doSmista() {
    const qty=parseFloat(smistaQty);
    if(!isFinite(qty)||qty<=0){toast("Quantità non valida","error");return;}
    stockAdd({
      name: prep.nome,
      quantity: qty,
      unit: prep.unitaMisura||"pz",
      location: smistaLoc,
      category: prep.categoriaKey||"preparazioni",
      lot: `PREP-${todayDate()}`,
      expiresAt: smistaExpiry ? new Date(smistaExpiry).toISOString() : undefined,
      notes: `Preparazione smistata · ${prep.note||""}`
    });
    onStatus(prep.id,"smistata");
    toast(`${prep.nome} → ${smistaLoc}`,"success");
    setShowSmista(false);
  }

  return (
    <Card t={t} style={{padding:0}}>
      <div style={{padding:"13px 18px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
        onClick={()=>setExp(e=>!e)}>
        <span style={{fontSize:18,flexShrink:0}}>{cat?.icon||"📋"}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink,fontWeight:500}}>{prep.nome}</div>
          <div className="mono" style={{fontSize:8,color:t.inkFaint,marginTop:2}}>
            {prep.quantita} {prep.unitaMisura}
            {prep.scadeIl&&` · Scad. ${fmtDate(prep.scadeIl)}`}
            {prep.note&&` · ${prep.note}`}
          </div>
        </div>
        <span style={{padding:"3px 10px",borderRadius:6,fontSize:9,fontFamily:"var(--mono)",
          background:STATUS_COLORS[sc]+"22",border:`1px solid ${STATUS_COLORS[sc]}44`,color:STATUS_COLORS[sc]}}>
          {STATUS_LABELS[sc]}
        </span>
        <span style={{color:t.inkFaint,fontSize:12}}>{exp?"▲":"▼"}</span>
      </div>

      {exp&&canEdit&&(
        <div style={{padding:"0 18px 14px",borderTop:`1px solid ${t.div}`}}>
          {prep.note&&<div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkSoft,padding:"8px 0"}}>· {prep.note}</div>}

          {/* Edit inline */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
            <button onClick={()=>setEditMode(e=>!e)} style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${t.div}`,cursor:"pointer",background:editMode?t.gold:"transparent",color:editMode?"#fff":t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>
              {editMode?"× Annulla":"✏ Modifica"}
            </button>
          </div>
          {editMode&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,padding:"12px",borderRadius:10,background:t.bgAlt,border:`1px solid ${t.div}`,marginBottom:10}}>
              <div style={{display:"flex",gap:6}}>
                <input value={editNome} onChange={e=>setEditNome(e.target.value)} placeholder="Nome"
                  style={{flex:2,padding:"5px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic"}}/>
                <input value={editQty} onChange={e=>setEditQty(e.target.value)} type="number" min="0" step="0.1" placeholder="Qty"
                  style={{width:60,padding:"5px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}/>
                <select value={editUnit} onChange={e=>setEditUnit(e.target.value)}
                  style={{padding:"5px 6px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
                  {["pz","kg","g","l","ml","porz"].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:6}}>
                <select value={editPartita} onChange={e=>setEditPartita(e.target.value)}
                  style={{flex:1,padding:"5px 6px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
                  {STATIONS.filter(s=>s.key!=="all").map(s=><option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
                <input value={editScade} onChange={e=>setEditScade(e.target.value)} type="date"
                  style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}/>
              </div>
              <input value={editNote} onChange={e=>setEditNote(e.target.value)} placeholder="Note…"
                style={{padding:"5px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:12}}/>
              <button onClick={saveEdit} style={{padding:"7px",borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10}}>✓ Salva modifiche</button>
            </div>
          )}
          {/* Status rapido */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {Object.entries(STATUS_LABELS).filter(([k])=>k!=="smistata").map(([k,l]:any)=>(
              <button key={k} onClick={()=>onStatus(prep.id,k)} style={{
                padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:10,
                background:sc===k?STATUS_COLORS[k]:t.bgAlt,
                color:sc===k?"#fff":t.inkMuted,transition:"all 0.15s",fontFamily:"var(--mono)",
              }}>{l}</button>
            ))}
          </div>

          {/* SMISTAMENTO — bottone principale quando svolta */}
          {sc==="svolta"&&!showSmista&&(
            <button onClick={()=>setShowSmista(true)} style={{
              width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:8,
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",
              fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
            }}>📦 Smista → Giacenze</button>
          )}

          {/* Form smistamento */}
          {showSmista&&(
            <div style={{background:t.bgAlt,borderRadius:12,padding:14,marginBottom:8}}>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:10,letterSpacing:"0.12em"}}>DOVE METTERE LA PREPARAZIONE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {[{k:"fridge",l:"❄️ Frigo"},{k:"freezer",l:"🧊 Congelatore"},{k:"counter",l:"🍽️ Banco"},{k:"dry",l:"🏺 Dispensa"}].map(d=>(
                  <button key={d.k} onClick={()=>setSmistaLoc(d.k)} style={{
                    padding:"8px 4px",borderRadius:8,border:"none",cursor:"pointer",
                    fontFamily:"var(--mono)",fontSize:9,
                    background:smistaLoc===d.k?`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`:t.bgCard,
                    color:smistaLoc===d.k?"#fff":t.inkMuted,
                  }}>{d.l}</button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>QUANTITÀ</div>
                  <input value={smistaQty} onChange={e=>setSmistaQty(e.target.value)} type="number"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${t.div}`,
                      background:t.bgCard,color:t.ink,fontSize:14,fontFamily:"var(--serif)"}}/>
                </div>
                <div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>SCADENZA (opz.)</div>
                  <input value={smistaExpiry} onChange={e=>setSmistaExpiry(e.target.value)} type="date"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${t.div}`,
                      background:t.bgCard,color:t.ink,fontSize:13}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn t={t} variant="gold" onClick={doSmista}>✓ Conferma smistamento</Btn>
                <button onClick={()=>setShowSmista(false)} style={{padding:"8px 14px",borderRadius:8,
                  border:`1px solid ${t.div}`,cursor:"pointer",background:"none",color:t.inkMuted,
                  fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
              </div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>onRemove(prep.id)} style={{
              padding:"5px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:9,
              fontFamily:"var(--mono)",background:t.accentGlow,color:t.danger,
            }}>✕ Rimuovi</button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════ */
function DashboardView({ t }) {
  const { kitchen, allItems } = useK();
  const [showAICmd, setShowAICmd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const isMobile2 = useIsMobile();

  // NOTE: hooks must be called before any early return
  const items = kitchen ? allItems() : [];
  if (!kitchen) return null;
  const now = new Date();
  const expired  = items.filter(x=>x.expiresAt && new Date(x.expiresAt)<now);
  const urgent   = items.filter(x=>{ const h=hoursUntil(x.expiresAt); return h!==null&&h>0&&h<=72; });
  const k = kitchen;
  const parKeys  = Object.keys(PAR_PRESET);
  const lowItems = items.filter(x=>{
    const par = x.parLevel ?? (x.category ? PAR_PRESET[x.category] : null) ?? (k.parByCategory[x.category]||0);
    return par>0 && x.quantity<par;
  });

  const kpis = [
    {label:"REFERENZE",  val:items.length,   sub:"totali",   icon:"◆", sec:"giacenze"},
    {label:"SCADUTI",    val:expired.length, sub:"articoli", icon:"⚠",  sec:"haccp",    hi:expired.length>0},
    {label:"URGENTI ≤72h",val:urgent.length,sub:"articoli",icon:"⏱", sec:"giacenze",hi:urgent.length>0},
    {label:"SOTTO PAR",  val:lowItems.length,sub:"articoli", icon:"↓",  sec:"giacenze",hi:lowItems.length>0},
  ];

  const isMD = isMobile2;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:isMD?14:24}}>

      {/* ── Quick Actions — mobile + desktop ── */}
      <div style={{display:"grid",gridTemplateColumns:isMD?"repeat(3,1fr)":"repeat(6,1fr)",gap:isMD?8:10}}>
        {[
          {label:"Stock",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>, sec:"giacenze",     col:"#8B1E2F"},
          {label:"Prep",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>, sec:"preparazioni", col:"#182040"},
          {label:"Servizio", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>, sec:"servizio",  col:"#3D7A4A"},
          {label:"HACCP",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, sec:"haccp",     col:"#182040"},
          {label:"Spesa",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>, sec:"spesa",    col:"#5A7A9A"},
          {label:"FoodCost", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, sec:"foodcost",col:"#8B1E2F"},
        ].map(qa=>(
          <button key={qa.sec} onClick={()=>window.dispatchEvent(new CustomEvent("kp-nav",{detail:qa.sec}))}
            style={{padding:"14px 8px 12px",borderRadius:14,border:`1px solid ${qa.col}33`,cursor:"pointer",
              background:`linear-gradient(145deg,${qa.col}16,${qa.col}08)`,
              display:"flex",flexDirection:"column",alignItems:"center",gap:7,minHeight:82,transition:"all 0.2s"}}>
            <div style={{color:qa.col,opacity:0.9}}>{qa.icon}</div>
            <span style={{fontFamily:"var(--mono)",fontSize:9,color:qa.col,letterSpacing:"0.06em",textAlign:"center",lineHeight:1.3}}>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Onboarding se vuoto */}
      {items.length===0&&(
        <div style={{borderRadius:16,border:`1px dashed ${t.gold}60`,padding:"28px 32px",
          background:`linear-gradient(135deg,rgba(193,154,62,0.07),${t.bgCard})`,textAlign:"center"}}>
          <div style={{fontFamily:"var(--serif)",fontSize:22,fontStyle:"italic",color:t.ink,marginBottom:8}}>Benvenuto in Kitchen Pro</div>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.1em",marginBottom:20}}>INIZIA CARICANDO LE TUE GIACENZE</div>
          <button onClick={()=>window.dispatchEvent(new CustomEvent("kp-nav",{detail:"giacenze"}))} style={{
            padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
            color:"#fff",fontFamily:"var(--mono)",fontSize:10,
          }}>→ Aggiungi il primo articolo</button>
        </div>
      )}

      {showAICmd && <AICommandCenter t={t} onClose={()=>setShowAICmd(false)}/>}
      {/* AI Intelligence Hub */}
      <div style={{borderRadius:14,border:`1px solid ${t.goldDim}`,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",background:`linear-gradient(135deg,${t.gold}18,${t.bgCard})`,borderBottom:`1px solid ${t.div}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:t.ink}}>✨ AI Intelligence</span>
          <span className="mono" style={{fontSize:7,color:t.inkFaint,letterSpacing:"0.1em"}}>KITCHEN PRO AI — HACCP & OPERATIONS</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMD?"repeat(2,1fr)":"repeat(6,1fr)",gap:0}}>
          {[
            {label:"Briefing",  icon:"📢",sub:"Mattutino AI",   panel:"briefing", col:t.secondary},
            {label:"Menu",      icon:"🍽", sub:"Zero-waste AI", panel:"menu",     col:t.accent},
            {label:"Spreco",    icon:"♻️", sub:"Food waste AI", panel:"waste",    col:t.success},
            {label:"MEP AI",    icon:"⏱", sub:"Ottimizza MEP", panel:"mep",      col:t.gold},
            {label:"Importa",   icon:"📄", sub:"Da doc/foto AI", panel:"import",  col:"#5A7A9A"},
            {label:"AI Comandi", icon:"🤖", sub:"Voce/foto/testo", panel:"ai_cmd",   col:t.accent, onClickFn:()=>setShowAICmd(true)},
          ].map((ai,i)=>(
            <button key={ai.panel} onClick={ai.onClickFn || (()=>window.dispatchEvent(new CustomEvent("kp-ai",{detail:{panel:ai.panel}})))}
              style={{padding:"14px 10px",border:"none",borderRight:i<4?`1px solid ${t.div}`:"none",
                cursor:"pointer",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:5,transition:"background 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background=ai.col+"15"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:20}}>{ai.icon}</span>
              <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11,color:t.ink}}>{ai.label}</span>
              <span className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.04em"}}>{ai.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:isMD?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMD?10:14}}>
        {kpis.map((kpi,i)=>(
          <Card key={i} t={t} glow={kpi.hi}
            style={{padding:"20px 22px",cursor:kpi.sec?"pointer":"default",transition:"transform 0.2s"}}
            onClick={kpi.sec?()=>window.dispatchEvent(new CustomEvent("kp-nav",{detail:kpi.sec})):undefined}
            onMouseEnter={kpi.sec?e=>{e.currentTarget.style.transform="translateY(-2px)"}:undefined}
            onMouseLeave={kpi.sec?e=>{e.currentTarget.style.transform="translateY(0)"}:undefined}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <span className="mono" style={{fontSize:8,letterSpacing:"0.16em",color:t.inkFaint}}>{kpi.label}</span>
              <span style={{fontSize:16,color:kpi.hi?t.accent:t.goldDim,lineHeight:1}}>{kpi.icon}</span>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:32,fontWeight:400,fontFamily:"var(--serif)",color:kpi.hi?t.accent:t.ink,lineHeight:1}}>{kpi.val}</span>
              <span className="mono" style={{fontSize:10,color:t.inkFaint}}>{kpi.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Urgenti + Shopping preview */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Scadenze urgenti */}
        <Card t={t}>
          <CardHeader t={t} title="Scadenze urgenti"
            right={<Badge label={`${urgent.length+expired.length}`} color={t.danger} bg={t.accentGlow}/>}/>
          <div style={{padding:"8px 0"}}>
            {[...expired,...urgent].length===0 ? (
              <div style={{padding:"20px 22px",color:t.inkFaint,fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic"}}>✓ Nessun articolo in scadenza</div>
            ) : [...expired,...urgent].slice(0,6).map((item,i)=>{
              const badge = expiryBadge(item.expiresAt);
              return (
                <div key={item.id} style={{padding:"11px 22px",display:"flex",alignItems:"center",gap:12,borderBottom:i<5?`1px solid ${t.div}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontFamily:"var(--serif)",color:t.ink,fontWeight:500}}>{item.name}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint}}>{item.location} · {item.quantity} {item.unit}</div>
                  </div>
                  {badge&&<Badge label={badge.label} color={badge.color} bg={badge.bg}/>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sotto par */}
        <Card t={t}>
          <CardHeader t={t} title="Sotto livello PAR"
            right={<Badge label={`${lowItems.length}`} color={t.warning} bg={t.goldFaint}/>}/>
          <div style={{padding:"8px 0"}}>
            {lowItems.length===0 ? (
              <div style={{padding:"20px 22px",color:t.inkFaint,fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic"}}>✓ Tutti i livelli nella norma</div>
            ) : lowItems.slice(0,6).map((item,i)=>{
              const par = item.parLevel ?? PAR_PRESET[item.category] ?? 0;
              return (
                <div key={item.id} style={{padding:"11px 22px",display:"flex",alignItems:"center",gap:12,borderBottom:i<5?`1px solid ${t.div}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontFamily:"var(--serif)",color:t.ink,fontWeight:500}}>{item.name}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint}}>{item.quantity}/{par} {item.unit}</div>
                  </div>
                  <BarMini value={item.quantity} max={par||1} t={t}/>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Shopping list preview */}
      {(kitchen.shopping||[]).length>0 && (
        <Card t={t}>
          <CardHeader t={t} title="Lista della spesa"
            right={<Badge label={`${kitchen.shopping.filter(x=>!x.checked).length} da fare`} color={t.secondary} bg={t.goldFaint}/>}/>
          <div style={{padding:"12px 22px",display:"flex",flexWrap:"wrap",gap:8}}>
            {kitchen.shopping.filter(x=>!x.checked).slice(0,12).map(x=>(
              <Badge key={x.id} label={`${x.name} ×${x.quantity}${x.unit}`} color={t.inkSoft} bg={t.bgAlt}/>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   INVENTORY VIEW
   ════════════════════════════════════════════════════════ */
function InventoryView({ t }) {
  const { kitchen, stockAdd, adjustItem, removeItem, setItemPar, extendExpiry, setExpiry, moveStock, currentRole, itemUpdate } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());

  const [loc,    setLoc]      = useState("fridge");
  const [search, setSearch]   = useState("");
  const [macroFilter, setMacroFilter] = useState("all");
  const [partitaFilter, setPartitaFilter] = useState("tutti");
  const [groupByCat, setGroupByCat] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // all | ok | low | expiring | critical
  const [sortBy, setSortBy] = useState("default"); // default | name | expiry | qty_asc | qty_desc
  const [showForm, setShowForm] = useState(false);
  const [customProdsL, saveCustomProd] = useCustomMemory("prodotti");
  const [editPar, setEditPar] = useState(null);
  const [editParVal, setEditParVal] = useState("");
  const [editExpiry, setEditExpiry] = useState(null);
  const [editExpiryVal, setEditExpiryVal] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [editLot, setEditLot] = useState({});
  const [moveModal, setMoveModal] = useState(null);
  const [moveQty, setMoveQty] = useState("");
  const [moveDest, setMoveDest] = useState("fridge");

  // Form state
  const [fName,     setFName]     = useState("");
  const [fQty,      setFQty]      = useState("1");
  const [fUnit,     setFUnit]     = useState("pz");
  const [fCat,      setFCat]      = useState("proteine");
  const [fPartita,  setFPartita]  = useState("");
  const [fLot,      setFLot]      = useState("");
  const [fExpiry,   setFExpiry]   = useState("");
  const [fNotes,    setFNotes]    = useState("");

  const speech = useSpeech(t=>setFName(t));

  const LOCS = [
    {key:"fridge",   label:"Frigo",       icon:"❄️", temp:"2-4°C"},
    {key:"freezer",  label:"Congelatore", icon:"🧊", temp:"-18°C"},
    {key:"dry",      label:"Dispensa",    icon:"🏺", temp:"Ambiente"},
    {key:"counter",  label:"Banco",       icon:"🍽️", temp:"Servizio"},
  ];

  const todayMs = Date.now();
  const itemsRaw = ((kitchen||{})[loc]||[]).filter(item=>{
    if(macroFilter!=="all") { const mc=CATEGORIES[item.category]?.macro||"alimenti"; if(mc!==macroFilter) return false; }
    if(partitaFilter!=="tutti" && (item.partita||"")!==partitaFilter) return false;
    if(search && !item.name.toLowerCase().includes(search.toLowerCase()) && !(item.lot||"").toLowerCase().includes(search.toLowerCase())) return false;
    // Status filter
    if(statusFilter!=="all") {
      const daysLeft = item.expiresAt ? Math.round((new Date(item.expiresAt)-todayMs)/86400000) : null;
      const isLow = item.parLevel && item.quantity < item.parLevel;
      if(statusFilter==="ok" && (isLow || (daysLeft!=null&&daysLeft<=3))) return false;
      if(statusFilter==="low" && !isLow) return false;
      if(statusFilter==="expiring" && !(daysLeft!=null&&daysLeft>0&&daysLeft<=3)) return false;
      if(statusFilter==="critical" && !(daysLeft!=null&&daysLeft<=0)) return false;
    }
    return true;
  });
  const items = [...itemsRaw].sort((a,b)=>{
    if(sortBy==="name") return a.name.localeCompare(b.name,"it");
    if(sortBy==="qty_asc") return (a.quantity||0)-(b.quantity||0);
    if(sortBy==="qty_desc") return (b.quantity||0)-(a.quantity||0);
    if(sortBy==="expiry") {
      if(!a.expiresAt&&!b.expiresAt) return 0;
      if(!a.expiresAt) return 1; if(!b.expiresAt) return -1;
      return new Date(a.expiresAt)-new Date(b.expiresAt);
    }
    return 0;
  });

  function submitStock() {
    saveCustomProd(fName.trim());
    const qty=parseFloat(fQty);
    if(!fName.trim()||!isFinite(qty)||qty<=0) { toast("Compila nome e quantità","error"); return; }
    stockAdd({
      name:fName,quantity:qty,unit:fUnit,location:loc,category:fCat,
      partita:fPartita.trim()||undefined,
      lot:fLot||undefined,expiresAt:fExpiry?new Date(fExpiry).toISOString():undefined,
      notes:fNotes||undefined,insertedDate:todayDate(),
    });
    toast(`${fName} aggiunto/a`,"success");
    setFName(""); setFQty("1"); setFLot(""); setFExpiry(""); setFNotes("");
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Location tabs */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {LOCS.map(l=>(
          <button key={l.key} onClick={()=>setLoc(l.key)} style={{
            padding:"10px 20px",borderRadius:12,cursor:"pointer",
            display:"flex",alignItems:"center",gap:8,fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.08em",
            background:loc===l.key?`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`:t.bgCard,
            color:loc===l.key?"#fff":t.inkMuted,
            boxShadow:loc===l.key?`0 4px 20px ${t.shadow}`:`0 1px 4px ${t.shadow}`,
            border:loc===l.key?"none":`1px solid ${t.div}`,
            transform:loc===l.key?"scale(1.02)":"scale(1)",transition:"all 0.3s",
          }}>
            <span style={{fontSize:16}}>{l.icon}</span>{l.label}
            <span style={{fontSize:8,opacity:0.7}}>{l.temp}</span>
            <span style={{background:loc===l.key?"rgba(255,255,255,0.2)":t.div,padding:"2px 8px",borderRadius:10,fontSize:9}}>
              {(kitchen?.[loc]||[]).length}
            </span>
          </button>
        ))}
      </div>

      {/* Macro filter + Partita filter */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <span className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.1em",alignSelf:"center"}}>MACRO:</span>
        {Object.entries({all:"Tutti",...MACRO}).map(([k,l])=>(
          <button key={k} onClick={()=>setMacroFilter(k)} style={{
            padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.06em",
            background:macroFilter===k?`linear-gradient(135deg,${t.gold},${t.goldBright})`:t.bgCard,
            color:macroFilter===k?"#fff":t.inkMuted,
          }}>{l}</button>
        ))}
        <div style={{width:1,height:16,background:t.div,margin:"0 4px"}}/>
        <span className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.1em",alignSelf:"center"}}>PARTITA:</span>
        {[{key:"tutti",label:"Tutte",icon:"⭐"},...STATIONS.filter(s=>s.key!=="all")].map(s=>(
          <button key={s.key} onClick={()=>setPartitaFilter(s.key)} style={{
            padding:"5px 11px",borderRadius:8,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:9,
            background:partitaFilter===s.key?s.color:t.bgCard,
            color:partitaFilter===s.key?"#fff":t.inkMuted,transition:"all 0.15s",
          }}>{s.icon} {s.label}</button>
        ))}
        <button onClick={()=>setGroupByCat(g=>!g)} title="Raggruppa per categoria" style={{
          marginLeft:"auto",padding:"5px 10px",borderRadius:8,border:`1px solid ${t.div}`,
          cursor:"pointer",fontFamily:"var(--mono)",fontSize:9,
          background:groupByCat?t.bgAlt:"transparent",color:t.inkMuted,
        }}>⊞ {groupByCat?"Gruppi":"Flat"}</button>
      </div>

      {/* STATUS + SORT FILTERS */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.1em",alignSelf:"center"}}>STATO:</span>
        {[
          {k:"all",l:"Tutti",col:t.inkFaint},
          {k:"ok",l:"✓ OK",col:t.success},
          {k:"low",l:"↓ Sotto par",col:t.warning},
          {k:"expiring",l:"⏱ Scadono ≤3gg",col:t.accent},
          {k:"critical",l:"⚠ Scaduti",col:t.danger},
        ].map(({k,l,col})=>(
          <button key={k} onClick={()=>setStatusFilter(k)} style={{
            padding:"4px 12px",borderRadius:20,cursor:"pointer",
            border:`1px solid ${statusFilter===k?col:t.div}`,
            background:statusFilter===k?col+"20":"transparent",
            color:statusFilter===k?col:t.inkMuted,fontFamily:"var(--mono)",fontSize:9,transition:"all 0.15s",
          }}>{l}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <span className="mono" style={{fontSize:8,color:t.inkFaint}}>ORDINA:</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
            padding:"4px 10px",borderRadius:8,border:`1px solid ${t.div}`,
            background:t.bgAlt,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>
            <option value="default">Default</option>
            <option value="name">Nome A→Z</option>
            <option value="expiry">Prima scadenza</option>
            <option value="qty_asc">Qtà crescente</option>
            <option value="qty_desc">Qtà decrescente</option>
          </select>
        </div>
      </div>
      {/* Active filter summary */}
      {(statusFilter!=="all"||macroFilter!=="all"||partitaFilter!=="tutti"||sortBy!=="default")&&(
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span className="mono" style={{fontSize:9,color:t.inkFaint}}>
            {items.length} risultati
            {statusFilter!=="all"&&` · stato:${statusFilter}`}
            {macroFilter!=="all"&&` · tipo:${macroFilter}`}
          </span>
          <button onClick={()=>{setStatusFilter("all");setMacroFilter("all");setPartitaFilter("tutti");setSortBy("default");setSearch("");}} style={{
            padding:"3px 10px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
            background:"transparent",color:t.inkFaint,fontFamily:"var(--mono)",fontSize:9}}>
            ✕ Reset filtri
          </button>
        </div>
      )}

      <div style={{display:"flex",gap:10}}>
        <LuxInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca per nome o lotto…" t={t} style={{flex:1}}/>
        <Btn t={t} variant="ghost" onClick={()=>window.dispatchEvent(new CustomEvent("kp-ai",{detail:{panel:"import"}}))}>
          📄 Da Documento
        </Btn>
        {canEdit&&<Btn t={t} variant={showForm?"ghost":"primary"} onClick={()=>setShowForm(!showForm)}>
          {showForm?"✕ Chiudi":"+ Aggiungi"}
        </Btn>}
      </div>

      {/* Add form */}
      {showForm&&canEdit&&(
        <Card t={t} style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{display:"flex",gap:8}}>
              <AutocompleteInput value={fName} onChange={e=>setFName(e.target.value)}
                onSelect={p=>{setFName(p.n);setFCat(p.c||fCat);setFUnit(p.u||fUnit);
                  if(p.shelf){const d=new Date();d.setDate(d.getDate()+p.shelf);setFExpiry(d.toISOString().slice(0,10));}
                  saveCustomProd(p.n);}}
                placeholder="Nome prodotto (autocomplete)" t={t} style={{flex:1}}
                catalog={PRODUCT_CATALOG} extraSuggestions={[...customProdsL,...(kitchen?.ingredienti||[]).map((i:any)=>i.nome).filter(Boolean),...(JSON.parse(localStorage.getItem("semilav-"+kitchen?.id)||"[]")).map((s:any)=>s.nome).filter(Boolean)]}
                filterMacro={macroFilter==="all"?"":macroFilter}/>
              <VoiceBtn t={t} onResult={r=>setFName(r)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <LuxInput value={fQty} onChange={e=>setFQty(e.target.value)} type="number" placeholder="Qtà" t={t}/>
              <LuxSelect value={fUnit} onChange={e=>setFUnit(e.target.value)} t={t}>
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </LuxSelect>
            </div>
            <LuxSelect value={fCat} onChange={e=>setFCat(e.target.value)} t={t}>
              {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v?.label||k}</option>)}
            </LuxSelect>
            <LuxSelect value={fPartita} onChange={e=>setFPartita(e.target.value)} t={t}>
              <option value="">— Nessuna partita —</option>
              {STATIONS.filter(s=>s.key!=="all").map(s=>(
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </LuxSelect>
            <input value={fLot} onChange={e=>setFLot(e.target.value)}
              list="lotti-arch-inv" placeholder="Lotto (HACCP)"
              style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            <datalist id="lotti-arch-inv">
              {(kitchen?.ingredienti||[]).filter((x:any)=>x.lotto).map((ing:any)=>(
                <option key={ing.id} value={ing.lotto}>{ing.nome} — {ing.fornitore}</option>
              ))}
              {(kitchen?.semiLav||kitchen?.semilavorati||[]).filter((s:any)=>s.lotto).map((s:any)=>(
                <option key={s.id} value={s.lotto}>{s.nome} (semilavorato)</option>
              ))}
            </datalist>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
              {[1,2,3,5,7,10,14,21,31].map(d=>{
                const dt=new Date();dt.setDate(dt.getDate()+d);
                const iso=dt.toISOString().slice(0,10);
                return <button key={d} onClick={()=>setFExpiry(iso)} style={{
                  padding:'3px 8px',borderRadius:6,border:'1px solid rgba(193,154,62,0.4)',
                  background:fExpiry===iso?'#C19A3E':'rgba(193,154,62,0.08)',
                  color:fExpiry===iso?'#fff':'#C19A3E',
                  fontFamily:'var(--mono)',fontSize:9,cursor:'pointer',whiteSpace:'nowrap',
                }}>+{d}gg</button>;
              })}
            </div>
            <LuxInput value={fExpiry} onChange={e=>setFExpiry(e.target.value)} type="date" t={t}/>
            <LuxInput value={fNotes} onChange={e=>setFNotes(e.target.value)} placeholder="Note" t={t}/>
          </div>
          <Btn t={t} variant="gold" onClick={submitStock} disabled={!fName.trim()}>Carica in {LOCS.find(l=>l.key===loc)?.label}</Btn>
        </Card>
      )}

      {/* Items grid */}
      {items.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}>
          <div style={{fontFamily:"var(--serif)",fontSize:20,fontStyle:"italic",marginBottom:8}}>Nessun articolo</div>
          <div className="mono" style={{fontSize:9,letterSpacing:"0.14em"}}>
            {search?"NESSUN RISULTATO PER LA RICERCA":"SEZIONE VUOTA — AGGIUNGI PRODOTTI"}
          </div>
        </div>
      ) : (
        groupByCat ? (
          /* ── Vista raggruppata ── */
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {(()=>{
              const grouped = Object.entries(
                items.reduce((acc:any,item:any)=>{
                  const cat=item.category||"secco";
                  if(!acc[cat]) acc[cat]=[];
                  acc[cat].push(item); return acc;
                },{})
              ).sort(([a],[b])=>(Object.keys(CATEGORIES).indexOf(a)||99)-(Object.keys(CATEGORIES).indexOf(b)||99));
              return grouped.map(([cat,catItems]:any)=>(
                <div key={cat} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,
                    padding:"8px 12px",borderRadius:10,
                    background:`linear-gradient(135deg,${t.gold}10,${t.bgAlt})`,
                    border:`1px solid ${t.gold}30`}}>
                    <span style={{fontSize:18}}>{CATEGORIES[cat]?.icon||"·"}</span>
                    <span className="mono" style={{fontSize:9,letterSpacing:"0.14em",color:t.gold,flex:1}}>
                      {(CATEGORIES[cat]?.label||cat).toUpperCase()}
                    </span>
                    <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{(catItems as any[]).length} art.</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {(catItems as any[]).map((item:any,idx:number)=>{
            const badge  = expiryBadge(item.expiresAt);
            const par    = item.parLevel ?? PAR_PRESET[item.category] ?? 0;
            const isLow  = par>0 && item.quantity<par;
            const [sm,lg] = stepFor(item.unit);
            return (
              <div key={item.id} style={{
                background:t.bgCard,borderRadius:12,overflow:"hidden",
                border:`1px solid ${badge&&badge.bg==="#8B1E2F"?t.accent+"40":t.div}`,
                boxShadow:badge?`0 4px 20px ${t.accentGlow}`:`0 1px 6px ${t.shadow}`,
                animation:`cardIn 0.4s cubic-bezier(0.4,0,0.2,1) ${idx*0.04}s both`,
                transition:"all 0.3s",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                {/* time progress bar at top */}
                {item.expiresAt&&(()=>{
                  const h=hoursUntil(item.expiresAt);
                  const maxH=72;
                  const pct = h===null?100:Math.min(Math.max((1-h/maxH)*100,0),100);
                  const barColor = !h||h<=0?t.danger:h<=24?t.danger:h<=72?t.warning:t.success;
                  return <div style={{height:3,background:t.bgAlt}}><div style={{height:"100%",width:`${pct}%`,background:barColor,transition:"width 1s"}}/></div>;
                })()}

                <div style={{padding:"16px 20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div onClick={()=>setExpandedCard(expandedCard===item.id?null:item.id)} style={{fontSize:14,fontWeight:500,fontFamily:"var(--serif)",color:t.ink,marginBottom:3,fontStyle:"italic",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{item.name}<span style={{fontSize:9,color:t.inkFaint,fontStyle:"normal"}}>{expandedCard===item.id?"▲":"▼"}</span></div>
                      <div className="mono" style={{fontSize:9,color:t.inkFaint}}>
                        {(CATEGORIES[item.category]?.label||item.category||"—")}
                        {item.lot&&` · ${item.lot}`}
                        {item.expiresAt&&` · Scad. ${fmtDate(item.expiresAt)}`}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                      <span style={{fontSize:24,fontWeight:300,fontFamily:"var(--serif)",color:isLow?t.danger:t.ink,lineHeight:1}}>{item.quantity}</span>
                      <span className="mono" style={{fontSize:9,color:t.inkFaint,display:"block"}}>{item.unit}</span>
                    </div>
                  </div>

                  {par>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <BarMini value={item.quantity} max={par} t={t}/>
                    <span className="mono" style={{fontSize:8,color:t.inkFaint,minWidth:48,textAlign:"right"}}>par {par}</span>
                  </div>}

                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {badge&&<Badge label={badge.label} color={badge.color} bg={badge.bg}/>}
                    {isLow&&<Badge label="↓ SCORTA" color={t.warning} bg={t.goldFaint}/>}
                  </div>

                  {/* +giorni scadenza */}
                  {canEdit&&(
                    <div style={{marginBottom:8}}>
                      {item.expiresAt ? (
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                          <span className="mono" style={{fontSize:8,color:t.inkFaint,marginRight:2}}>+gg scad:</span>
                          {[3,5,7,10,14,21,31].map(d=>(
                            <button key={d} onClick={()=>{extendExpiry(item.id,d);toast(`+${d}gg scadenza`,"success");}} style={{
                              padding:"3px 7px",borderRadius:6,border:`1px solid ${t.gold}40`,
                              background:t.goldFaint,color:t.gold,fontSize:8,fontFamily:"var(--mono)",
                              cursor:"pointer",minHeight:24,
                            }}>+{d}</button>
                          ))}
                        </div>
                      ) : editExpiry===item.id ? (
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input type="date" value={editExpiryVal} onChange={e=>setEditExpiryVal(e.target.value)}
                            style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.gold}`,
                              background:t.bgCard,color:t.ink,fontSize:10,fontFamily:"var(--mono)"}}/>
                          <button onClick={()=>{
                            if(editExpiryVal){setExpiry(item.id,new Date(editExpiryVal).toISOString());toast("Scadenza impostata","success");}
                            setEditExpiry(null); setEditExpiryVal("");
                          }} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontSize:9,fontFamily:"var(--mono)"}}>✓</button>
                          <button onClick={()=>{setEditExpiry(null);setEditExpiryVal("");}} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${t.div}`,cursor:"pointer",background:"none",color:t.inkMuted,fontSize:9}}>×</button>
                        </div>
                      ) : (
                        <button onClick={()=>setEditExpiry(item.id)} style={{
                          padding:"3px 10px",borderRadius:6,border:`1px dashed ${t.div}`,
                          background:"none",color:t.inkFaint,fontSize:8,fontFamily:"var(--mono)",cursor:"pointer",
                        }}>📅 Imposta scadenza</button>
                      )}
                    </div>
                  )}
                  {expandedCard===item.id&&canEdit&&(
                    <div style={{padding:"10px 12px",borderRadius:10,background:t.bgAlt,border:`1px solid ${t.div}`,marginBottom:8,display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint,minWidth:40}}>NOME</span>
                        <input
                          defaultValue={item.name}
                          id={`edit-name-${item.id}`}
                          style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",outline:"none"}}/>
                        <button onClick={()=>{
                          const el=document.getElementById(`edit-name-${item.id}`) as HTMLInputElement;
                          if(el?.value?.trim()) itemUpdate(item.id,{name:el.value.trim()});
                          toast("Nome aggiornato","success");
                        }} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontSize:9,fontFamily:"var(--mono)"}}>✓</button>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint,minWidth:40}}>LOTTO</span>
                        <input value={editLot[item.id]??item.lot??""} onChange={e=>setEditLot(p=>({...p,[item.id]:e.target.value}))}
                          placeholder="es. L2024-03"
                          style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10,outline:"none"}}/>
                        <button onClick={()=>{
                          const nl=editLot[item.id]??item.lot??"";
                          adjustItem(item.id,0);
                          itemUpdate(item.id,{lot:nl});
                          toast("Lotto aggiornato","success");
                        }} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontSize:9,fontFamily:"var(--mono)"}}>✓</button>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint,minWidth:40}}>POS.</span>
                        <select defaultValue={item.location} onChange={e=>{
                          const newLoc=e.target.value;
                          removeItem(item.id);
                          stockAdd({...item,location:newLoc});
                          setExpandedCard(null);
                          toast(`Spostato → ${newLoc}`,"success");
                        }} style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
                          <option value="fridge">🧊 Frigo</option>
                          <option value="freezer">❄️ Congelatore</option>
                          <option value="dry">🏺 Dispensa</option>
                          <option value="counter">🔲 Banco</option>
                        </select>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint,minWidth:40}}>PARTITA</span>
                        <select defaultValue={item.categoria||item.partita||"antipasti"} onChange={e=>{
                          itemUpdate(item.id,{categoria:e.target.value,partita:e.target.value});
                          toast(`Partita → ${e.target.value}`,"success");
                        }} style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
                          <option value="antipasti">🍽 Antipasti</option>
                          <option value="primi">🍝 Primi</option>
                          <option value="secondi">🥩 Secondi</option>
                          <option value="pasticceria">🍰 Pasticceria</option>
                          <option value="colazioni">☕ Colazioni</option>
                          <option value="buffet">🪭 Buffet</option>
                          <option value="eventi">🎉 Eventi</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {canEdit&&(
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button onClick={()=>adjustItem(item.id,-sm)} style={btnSmall(t)}>−{sm}</button>
                      <button onClick={()=>adjustItem(item.id,-lg)} style={btnSmall(t)}>−{lg}</button>
                      <button onClick={()=>adjustItem(item.id,+sm)} style={{...btnSmall(t),background:t.success+"20",color:t.success}}>+{sm}</button>
                      <button onClick={()=>adjustItem(item.id,+lg)} style={{...btnSmall(t),background:t.success+"20",color:t.success}}>+{lg}</button>
                      {/* Sposta rapido */}
                      <button onClick={()=>{setMoveModal(item);setMoveQty(String(item.quantity));setMoveDest(item.location==="freezer"?"fridge":"counter");}} style={{...btnSmall(t),background:"#2A4FA520",color:"#2A4FA5",fontSize:8}}>↗ Sposta</button>
                      <button onClick={()=>{setFName(item.name);setFCat(item.category||"proteine");setFPartita(item.partita||"");setFUnit(item.unit||"pz");setFQty("1");setFLot("");setFExpiry("");setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}} style={{...btnSmall(t),background:t.gold+"20",color:t.gold,fontSize:8}}>+ Lotto</button>
                      <div style={{flex:1}}/>
                      <button onClick={()=>{setEditPar(item.id);setEditParVal(item.parLevel||"");}} style={{...btnSmall(t),fontSize:8}}>Giacenza min.</button>
                      <button onClick={()=>{ if(confirm(`Rimuovi ${item.name}?`))removeItem(item.id); }} style={{...btnSmall(t),background:t.accentGlow,color:t.danger}}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          /* Vista flat */
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
            {items.map((item,idx)=>{
              const badge  = expiryBadge(item.expiresAt);
              const par    = item.parLevel ?? PAR_PRESET[item.category] ?? 0;
              const isLow  = par>0 && item.quantity<par;
              const [sm,lg] = stepFor(item.unit);
              return (
                <div key={item.id} style={{
                  background:t.bgCard,borderRadius:12,overflow:"hidden",
                  border:`1px solid ${badge&&badge.bg==="#8B1E2F"?t.accent+"40":t.div}`,
                  boxShadow:badge?`0 4px 20px ${t.accentGlow}`:`0 1px 6px ${t.shadow}`,
                }}>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>{item.name}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
                      {item.quantity} {item.unit}
                      {item.lot&&` · ${item.lot}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      {/* Modal PAR */}
      {editPar&&(()=>{
        const item=[...(kitchen?.fridge||[]),...(kitchen?.freezer||[]),...(kitchen?.dry||[]),...(kitchen?.counter||[])].find(x=>x.id===editPar);
        return item?(<div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditPar(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,borderRadius:16,padding:24,width:300,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>PAR LEVEL — {item.name.toUpperCase()}</div>
            <input autoFocus value={editParVal} onChange={e=>setEditParVal(e.target.value)} type="number" placeholder="0 = disabilitato"
              style={{width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgCardAlt,color:t.ink,fontSize:16,outline:"none",marginBottom:16}}
              onKeyDown={e=>{if(e.key==="Enter"){setItemPar(editPar,editParVal===""?null:Number(editParVal));setEditPar(null);}}}/>
            <div style={{display:"flex",gap:8}}>
              <Btn t={t} variant="gold" onClick={()=>{setItemPar(editPar,editParVal===""?null:Number(editParVal));setEditPar(null);}}>Salva</Btn>
              <button onClick={()=>setEditPar(null)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",background:"none",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
            </div>
          </div>
        </div>):null;
      })()}

      {/* Modal SPOSTA */}
      {moveModal&&(
        <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setMoveModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,borderRadius:16,padding:24,width:320,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:4}}>SPOSTA ARTICOLO</div>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink,marginBottom:16}}>{moveModal.name}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>QUANTITÀ DA SPOSTARE</div>
                <input value={moveQty} onChange={e=>setMoveQty(e.target.value)} type="number" max={moveModal.quantity}
                  style={{width:"100%",padding:"10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgCardAlt,color:t.ink,fontSize:15}}/>
              </div>
              <div>
                <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>DESTINAZIONE</div>
                <select value={moveDest} onChange={e=>setMoveDest(e.target.value)}
                  style={{width:"100%",padding:"10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgCardAlt,color:t.ink,fontSize:13}}>
                  {[{k:"fridge",l:"❄️ Frigo"},{k:"freezer",l:"🧊 Congelatore"},{k:"dry",l:"🏺 Dispensa"},{k:"counter",l:"🍽️ Banco"}]
                    .filter(d=>d.k!==moveModal.location)
                    .map(d=><option key={d.k} value={d.k}>{d.l}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn t={t} variant="gold" onClick={()=>{
                const q=parseFloat(moveQty);
                if(!isFinite(q)||q<=0){toast("Quantità non valida","error");return;}
                moveStock(moveModal.id,q,moveDest);
                toast(`${moveModal.name} → ${moveDest}`,"success");
                setMoveModal(null);
              }}>↗ Sposta</Btn>
              <button onClick={()=>setMoveModal(null)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",background:"none",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnSmall(t) {
  return {
    padding:"4px 10px",borderRadius:6,border:`1px solid ${t.div}`,cursor:"pointer",
    fontSize:10,fontFamily:"var(--mono)",background:t.bgAlt,color:t.inkMuted,
    transition:"all 0.15s",
  };
}

/* ════════════════════════════════════════════════════════
   STATIONS — partite di cucina
   ════════════════════════════════════════════════════════ */
const STATIONS = [
  {key:"antipasti",  label:"Antipasti",       icon:"🫕", color:"#8B1E2F"},
  {key:"primi",      label:"Primi",           icon:"🍝", color:"#2A4FA5"},
  {key:"secondi",    label:"Secondi",         icon:"🥩", color:"#8B4A1E"},
  {key:"pasticceria",label:"Pasticceria",     icon:"🍮", color:"#7A5A1E"},
  {key:"colazioni",  label:"Colazioni",       icon:"☕", color:"#7A5A3A"},
  {key:"buffet",     label:"Buffet",          icon:"🎪", color:"#3D7A4A"},
  {key:"eventi",     label:"Eventi",          icon:"🎊", color:"#555"},
  {key:"all",        label:"Tutta la brigata",icon:"⭐", color:"#C19A3E"},
];

/* ════════════════════════════════════════════════════════
   MEP VIEW — AI-powered: foto / file / voce → tasks per partita
   ════════════════════════════════════════════════════════ */
function MepView({ t }) {
  const { kitchen, stockAdd, prepAdd, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [customPrepsL, saveCustomPrep] = useCustomMemory("preparazioni");
  const kid = kitchen?.id;

  // ── Persistent task list ──────────────────────────────
  const STORAGE = `mep-tasks-${kid}`;
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(tasks)); }, [tasks, STORAGE]);

  // ── Filters ───────────────────────────────────────────
  const [filterStation, setFilterStation] = useState("all");
  const [filterDone,    setFilterDone]    = useState(false);

  // ── Manual add ────────────────────────────────────────
  const [manualText,    setManualText]    = useState("");
  const [manualStation, setManualStation] = useState("antipasti");
  const [manualQty,     setManualQty]     = useState("1");
  const [manualUnit,    setManualUnit]    = useState("pz");
  const [manualCat,     setManualCat]     = useState("antipasti");
  const [manualLot,     setManualLot]     = useState("");
  const [manualScadeIl, setManualScadeIl] = useState("");
  const speech = useSpeech(r => setManualText(r));

  // ── Load-in modal ─────────────────────────────────────
  const [moveModal, setMoveModal] = useState(null);
  const [moveQty,   setMoveQty]   = useState("1");
  const [moveDest,  setMoveDest]  = useState("fridge");

  // ── AI import panel ───────────────────────────────────
  const [showAIImport,  setShowAIImport]  = useState(false);
  const [aiMode,        setAiMode]        = useState("voice"); // voice | file | text
  const [aiText,        setAiText]        = useState("");
  const [aiFile,        setAiFile]        = useState(null);   // {name, base64, mimeType}
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiPreview,     setAiPreview]     = useState(null);   // [{station, text}] after parse
  const [aiPreviewSel,  setAiPreviewSel]  = useState({});     // id → bool for selection
  const fileInputRef = useRef(null);
  const voiceSpeech  = useSpeech(r => setAiText(prev => (prev ? prev + " " + r : r)));

  // ── Task helpers ──────────────────────────────────────
  function addTask(text, station) {
    const tx = text.trim(); if (!tx) return;
    setTasks(p => [...p, { id:genId(), text:tx, station:station||"all", done:false, createdAt:nowISO() }]);
  }
  function toggleTask(id) { setTasks(p => p.map(x => x.id !== id ? x : {...x, done:!x.done})); }
  function removeTask(id) { setTasks(p => p.filter(x => x.id !== id)); }

  function doManualAdd() {
    if (!manualText.trim()) { toast("Scrivi la preparazione","error"); return; }
    addTask(manualText, manualStation);
    prepAdd(manualText, manualQty, manualUnit, manualCat, manualStation, "mattina", "", manualScadeIl||null);
    saveCustomPrep && saveCustomPrep(manualText);
    toast(`Aggiunto a ${STATIONS.find(s=>s.key===manualStation)?.label||manualCat}`,"success");
    setManualText(""); setManualQty("1"); setManualUnit("pz");
    setManualLot(""); setManualScadeIl(""); setManualCat("antipasti");
  }

  function doLoadIn() {
    if (!moveModal) return;
    const qty = parseFloat(moveQty);
    if (!isFinite(qty) || qty <= 0) { toast("Inserisci quantità valida","error"); return; }
    stockAdd({ name:moveModal.text, quantity:qty, unit:"pz", location:moveDest, lot:`MEP-${todayDate()}` });
    setTasks(p => p.map(x => x.id !== moveModal.id ? x : {...x, done:true}));
    setMoveModal(null);
    toast(`${moveModal.text} → ${moveDest}`,"success");
  }

  // ── File → base64 ─────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","application/pdf","text/plain","text/csv"];
    if (!allowed.includes(file.type)) { toast("Formato non supportato. Usa: foto, PDF, testo","error"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target.result.split(",")[1];
      setAiFile({ name:file.name, base64:b64, mimeType:file.type });
      toast(`File caricato: ${file.name}`,"success");
    };
    reader.readAsDataURL(file);
  }

  // ── AI parse ──────────────────────────────────────────
  async function runAI() {
    const hasInput = (aiMode==="file" && aiFile) || (aiMode!=="file" && aiText.trim());
    if (!hasInput) { toast("Inserisci contenuto da analizzare","error"); return; }

    setAiLoading(true);
    setAiPreview(null);

    const brigataContext = (kitchen?.members||[])
      .map(m => `${m.name} (${m.role})`).join(", ");

    const systemPrompt = `Sei un assistente per cucine professionali Michelin. Il tuo compito è analizzare documenti (ricette, piani di produzione, foglietti interni, menu, appunti scritti a mano) ed estrarre le preparazioni MEP (mise en place) per ogni partita.

Brigata attuale: ${brigataContext || "non specificata"}.
Partite disponibili: ${STATIONS.filter(s=>s.key!=="all").map(s=>s.label).join(", ")}.

Rispondi SOLO con un JSON array, senza markdown, senza testo extra. Formato:
[
  {"station": "saucier", "tasks": ["Fondo bruno ridotto", "Salsa Périgueux"]},
  {"station": "poissonnier", "tasks": ["Sfilettare rombo", "Pulire vongole"]},
  ...
]

Usa i valori di station: saucier, poissonnier, rotisseur, garde, patissier, communard.
Se non riesci ad assegnare una stazione, usa "all".
Se non trovi preparazioni, rispondi [].
Non inventare nulla che non sia nel documento.`;

    try {
      let userContent;

      if (aiMode === "file" && aiFile) {
        if (aiFile.mimeType.startsWith("image/")) {
          userContent = [
            { type:"image", source:{ type:"base64", media_type:aiFile.mimeType, data:aiFile.base64 } },
            { type:"text",  text:"Analizza questa immagine ed estrai le preparazioni MEP per partita." },
          ];
        } else if (aiFile.mimeType === "application/pdf") {
          userContent = [
            { type:"document", source:{ type:"base64", media_type:"application/pdf", data:aiFile.base64 } },
            { type:"text", text:"Analizza questo documento ed estrai le preparazioni MEP per partita." },
          ];
        } else {
          // plain text file
          const decoded = atob(aiFile.base64);
          userContent = `Analizza questo documento ed estrai le preparazioni MEP per partita:\n\n${decoded}`;
        }
      } else {
        userContent = `Analizza questo testo ed estrai le preparazioni MEP per partita:\n\n${aiText.trim()}`;
      }

      let parsed:any;
      try {
        const isMulti = Array.isArray(userContent);
        parsed = await callAI({
          systemPrompt,
          ...(isMulti ? {userMessages:userContent} : {userContext:userContent as string}),
          maxTokens: 1000,
          expectJSON: true,
        });
      } catch(err:any) {
        toast("AI: "+err.message,"error");
        setAiLoading(false); return;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast("Nessuna preparazione trovata nel documento","error");
        setAiLoading(false); return;
      }

      // Flatten to preview items with selection state
      const items = [];
      parsed.forEach(group => {
        const stationKey = STATIONS.find(s=>s.key===group.station||s.label.toLowerCase()===group.station?.toLowerCase())?.key || "all";
        (group.tasks||[]).forEach(taskText => {
          if (typeof taskText==="string" && taskText.trim()) {
            items.push({ id:genId(), station:stationKey, text:taskText.trim() });
          }
        });
      });

      if (items.length===0) { toast("Nessuna preparazione estratta","error"); setAiLoading(false); return; }

      setAiPreview(items);
      // select all by default
      const sel = {};
      items.forEach(x => { sel[x.id]=true; });
      setAiPreviewSel(sel);
      toast(`${items.length} preparazioni trovate — conferma prima di inserire`,"success");

    } catch(err) {
      toast("Errore API: " + (err.message||"rete"), "error");
    }
    setAiLoading(false);
  }

  function confirmInsert() {
    const toInsert = (aiPreview||[]).filter(x=>aiPreviewSel[x.id]);
    if (!toInsert.length) { toast("Nessuna selezione","error"); return; }
    toInsert.forEach(x => addTask(x.text, x.station));
    toast(`${toInsert.length} preparazioni inserite in lista`,"success");
    setAiPreview(null);
    setAiPreviewSel({});
    setAiText("");
    setAiFile(null);
    setShowAIImport(false);
  }

  // ── Filtered task list ────────────────────────────────
  const visibleTasks = tasks.filter(x => {
    if (!filterDone && x.done) return false;
    if (filterStation !== "all" && x.station !== filterStation) return false;
    return true;
  });
  const todo = visibleTasks.filter(x=>!x.done);
  const done = visibleTasks.filter(x=>x.done);

  // ── Station group counts for badge ────────────────────
  const countByStation = {};
  STATIONS.forEach(s => { countByStation[s.key] = tasks.filter(x=>!x.done&&(s.key==="all"||x.station===s.key)).length; });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── AI IMPORT PANEL ─────────────────────────────── */}
      {showAIImport && (
        <Card t={t} glow style={{padding:0,overflow:"visible"}}>
          {/* Panel header */}
          <div style={{
            padding:"16px 22px",
            background:`linear-gradient(135deg, ${t.secondary}, ${t.secondaryDeep})`,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            borderRadius:"14px 14px 0 0",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:20}}>🤖</span>
              <div>
                <div style={{color:"#fff",fontFamily:"var(--serif)",fontSize:15,fontWeight:500}}>Importa preparazioni con AI</div>
                <div className="mono" style={{fontSize:7,color:"rgba(255,255,255,0.45)",letterSpacing:"0.16em",marginTop:1}}>
                  FOTO · FILE · TESTO · VOCE → LISTA MEP
                </div>
              </div>
            </div>
            <button onClick={()=>{setShowAIImport(false);setAiPreview(null);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
          </div>

          <div style={{padding:22,display:"flex",flexDirection:"column",gap:18}}>
            {/* Mode selector */}
            <div style={{display:"flex",gap:8}}>
              {[
                {key:"voice", label:"🎤 Voce / Testo", desc:"Ditta o scrivi"},
                {key:"file",  label:"📄 Foto / File",  desc:"Immagine, PDF, .txt"},
              ].map(m=>(
                <button key={m.key} onClick={()=>{setAiMode(m.key);setAiPreview(null);}} style={{
                  flex:1,padding:"12px 16px",borderRadius:10,cursor:"pointer",
                  background:aiMode===m.key?`linear-gradient(135deg,${t.gold},${t.goldBright})`:t.bgAlt,
                  color:aiMode===m.key?"#fff":t.inkMuted,
                  fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
                  boxShadow:aiMode===m.key?`0 4px 16px ${t.goldFaint}`:`0 1px 4px ${t.shadow}`,
                  transition:"all 0.25s",
                  border:aiMode===m.key?"none":`1px solid ${t.div}`,
                }}>
                  <div style={{fontSize:14,marginBottom:4}}>{m.label}</div>
                  <div style={{fontSize:8,opacity:0.7}}>{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Voice / text mode */}
            {aiMode==="voice" && !aiPreview && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:11,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkMuted}}>
                  Ditta le preparazioni, oppure incolla il testo del foglio cucina. L'AI le assegnerà alle partite.
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <textarea
                    value={aiText}
                    onChange={e=>setAiText(e.target.value)}
                    placeholder={"Es: Saucier — fondo bruno ridotto, salsa Périgueux.\nPoissonnier — sfilettare 8 rombi, aprire 2kg vongole.\nPâtissier — crema pasticcera x40, mignardises."}
                    style={{
                      flex:1,minHeight:120,padding:"12px 14px",borderRadius:10,
                      fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",
                      background:t.bgCardAlt,color:t.ink,border:`1px solid ${t.div}`,
                      outline:"none",resize:"vertical",lineHeight:1.6,
                    }}
                    onFocus={e=>e.target.style.borderColor=t.gold}
                    onBlur={e=>e.target.style.borderColor=t.div}
                  />
                  <VoiceBtn t={t} onResult={r=>setAiText(p=>p?(p+" "+r):r)}/>
                </div>
              </div>
            )}

            {/* File mode */}
            {aiMode==="file" && !aiPreview && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:11,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkMuted}}>
                  Carica la foto del foglio MEP, un PDF stampato, o un file di testo. Funziona anche con scrittura a mano.
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,text/plain" style={{display:"none"}} onChange={handleFile}/>
                <div
                  onClick={()=>fileInputRef.current?.click()}
                  style={{
                    border:`2px dashed ${aiFile?t.gold:t.div}`,borderRadius:12,
                    padding:"28px 22px",textAlign:"center",cursor:"pointer",
                    background:aiFile?t.goldFaint:t.bgAlt,transition:"all 0.25s",
                  }}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.gold;}}
                  onDragLeave={e=>{e.currentTarget.style.borderColor=aiFile?t.gold:t.div;}}
                  onDrop={e=>{
                    e.preventDefault();
                    const f=e.dataTransfer.files?.[0];
                    if(f){ const fakeEv={target:{files:[f]}}; handleFile(fakeEv); }
                  }}
                >
                  {aiFile ? (
                    <div>
                      <div style={{fontSize:28,marginBottom:6}}>✓</div>
                      <div style={{fontFamily:"var(--serif)",fontSize:14,color:t.gold,fontStyle:"italic"}}>{aiFile.name}</div>
                      <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:4}}>Clicca per sostituire</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:32,marginBottom:8}}>📸</div>
                      <div style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:t.inkMuted}}>Trascina qui o clicca per scegliere</div>
                      <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:4}}>JPG · PNG · WEBP · PDF · TXT</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview extracted tasks */}
            {aiPreview && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:t.ink}}>
                    {aiPreview.length} preparazioni estratte — seleziona quelle da inserire:
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{const s={};aiPreview.forEach(x=>{s[x.id]=true;});setAiPreviewSel(s);}} style={{...btnSmall(t),fontSize:8}}>Tutto</button>
                    <button onClick={()=>setAiPreviewSel({})} style={{...btnSmall(t),fontSize:8}}>Niente</button>
                  </div>
                </div>

                {/* Group by station */}
                {STATIONS.filter(s=>s.key!=="all").map(station=>{
                  const stTasks = aiPreview.filter(x=>x.station===station.key);
                  if (!stTasks.length) return null;
                  return (
                    <div key={station.key} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${t.div}`}}>
                      <div style={{
                        padding:"9px 14px",display:"flex",alignItems:"center",gap:10,
                        background:`linear-gradient(135deg, ${station.color}22, ${station.color}11)`,
                        borderBottom:`1px solid ${t.div}`,
                      }}>
                        <span style={{fontSize:14}}>{station.icon}</span>
                        <span className="mono" style={{fontSize:9,letterSpacing:"0.1em",color:station.color,fontWeight:600}}>{station.label.toUpperCase()}</span>
                        <span style={{marginLeft:"auto",fontSize:9,fontFamily:"var(--mono)",color:t.inkFaint}}>{stTasks.filter(x=>aiPreviewSel[x.id]).length}/{stTasks.length} selezionate</span>
                      </div>
                      {stTasks.map((item,i)=>(
                        <div key={item.id} style={{
                          padding:"10px 14px",display:"flex",alignItems:"center",gap:12,
                          borderBottom:i<stTasks.length-1?`1px solid ${t.div}`:"none",
                          background:aiPreviewSel[item.id]?t.bgAlt:t.bgCard,
                          cursor:"pointer",transition:"background 0.15s",
                        }}
                        onClick={()=>setAiPreviewSel(p=>({...p,[item.id]:!p[item.id]}))}>
                          <div style={{
                            width:18,height:18,borderRadius:4,border:`1.5px solid ${aiPreviewSel[item.id]?t.gold:t.div}`,
                            background:aiPreviewSel[item.id]?t.gold:"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            flexShrink:0,transition:"all 0.15s",
                          }}>
                            {aiPreviewSel[item.id]&&<span style={{color:"#fff",fontSize:10,lineHeight:1}}>✓</span>}
                          </div>
                          <span style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:t.ink,flex:1}}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Also show "all" items */}
                {aiPreview.filter(x=>x.station==="all").length>0&&(
                  <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${t.div}`}}>
                    <div style={{padding:"9px 14px",background:t.bgAlt,borderBottom:`1px solid ${t.div}`}}>
                      <span className="mono" style={{fontSize:9,letterSpacing:"0.1em",color:t.inkMuted}}>STAZIONE NON SPECIFICATA</span>
                    </div>
                    {aiPreview.filter(x=>x.station==="all").map((item,i,arr)=>(
                      <div key={item.id} style={{
                        padding:"10px 14px",display:"flex",alignItems:"center",gap:12,
                        borderBottom:i<arr.length-1?`1px solid ${t.div}`:"none",
                        background:aiPreviewSel[item.id]?t.bgAlt:t.bgCard,cursor:"pointer",transition:"background 0.15s",
                      }}
                      onClick={()=>setAiPreviewSel(p=>({...p,[item.id]:!p[item.id]}))}>
                        <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${aiPreviewSel[item.id]?t.gold:t.div}`,background:aiPreviewSel[item.id]?t.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                          {aiPreviewSel[item.id]&&<span style={{color:"#fff",fontSize:10}}>✓</span>}
                        </div>
                        <span style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:t.ink,flex:1}}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",gap:10}}>
                  <Btn t={t} variant="gold" onClick={confirmInsert} disabled={!Object.values(aiPreviewSel).some(Boolean)}>
                    ✓ Inserisci {Object.values(aiPreviewSel).filter(Boolean).length} preparazioni in lista
                  </Btn>
                  <Btn t={t} variant="ghost" onClick={()=>{setAiPreview(null);setAiPreviewSel({});}}>← Rianalizza</Btn>
                </div>
              </div>
            )}

            {/* Analyze button */}
            {!aiPreview && (
              <Btn t={t} variant="primary"
                onClick={runAI}
                disabled={aiLoading || (aiMode==="file"?!aiFile:!aiText.trim())}
                style={{alignSelf:"flex-start"}}
              >
                {aiLoading
                  ? <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{animation:"blink 1s ease-in-out infinite"}}>◷</span> Analisi in corso…</span>
                  : "🤖 Analizza ed estrai preparazioni"}
              </Btn>
            )}
          </div>
        </Card>
      )}

      {/* ── MANUAL ADD + AI BUTTON ───────────────────────── */}
      {canEdit && !showAIImport && (
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>NUOVA PREPARAZIONE MEP</div>
          {/* Riga 1: nome + voce */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:10}}>
            <AutocompleteInput value={manualText} onChange={e=>setManualText(e.target.value)}
              onSelect={p=>{setManualText(p.n);if(p.u)setManualUnit(p.u);saveCustomPrep&&saveCustomPrep(p.n);}}
              placeholder="Nome preparazione (autocomplete + memoria)…" t={t}
              catalog={PREP_CATALOG} extraSuggestions={customPrepsL||[]}/>
            <VoiceBtn t={t} onResult={r=>setManualText(r)}/>
          </div>
          {/* Riga 2: qty + unit + categoria (la partita segue la categoria) */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <LuxInput value={manualQty} onChange={e=>setManualQty(e.target.value)} type="number" placeholder="Qtà" t={t}/>
            <LuxSelect value={manualUnit} onChange={e=>setManualUnit(e.target.value)} t={t}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </LuxSelect>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <span className="mono" style={{fontSize:8,color:"#999",letterSpacing:"0.1em"}}>CATEGORIA / PARTITA</span>
              <LuxSelect value={manualCat} onChange={e=>{setManualCat(e.target.value);setManualStation(e.target.value);}} t={t}>
                {CATEGORIE_MENU.filter(c=>c.key!=="svolte").map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </LuxSelect>
            </div>
          </div>
          {/* Riga 3: lotto con autocomplete */}
          <div style={{marginBottom:10,position:"relative"}}>
            <input value={manualLot} onChange={e=>setManualLot(e.target.value)}
              list="lotti-arch" placeholder="Lotto (opzionale)"
              style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            <datalist id="lotti-arch">
              {(kitchen?.ingredienti||[]).filter((x:any)=>x.lotto).map((i:any)=>(
                <option key={i.id} value={i.lotto}>{i.nome} — {i.fornitore}</option>
              ))}
            </datalist>
          </div>
          {/* Riga 4: scadenza rapida */}
          <div style={{marginBottom:6}}>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>SCADENZA PREP</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
              {[1,2,3,5,7,10,14,21,31].map(d=>{
                const dt=new Date();dt.setDate(dt.getDate()+d);
                const iso=dt.toISOString().slice(0,10);
                return <button key={d} onClick={()=>setManualScadeIl(iso)} style={{
                  padding:"3px 8px",borderRadius:6,border:"1px solid rgba(193,154,62,0.4)",
                  background:manualScadeIl===iso?"#C19A3E":"rgba(193,154,62,0.08)",
                  color:manualScadeIl===iso?"#fff":"#C19A3E",
                  fontFamily:"var(--mono)",fontSize:9,cursor:"pointer",
                }}>+{d}gg</button>;
              })}
            </div>
            <LuxInput value={manualScadeIl} onChange={e=>setManualScadeIl(e.target.value)} type="date" t={t}/>
          </div>
          {/* Riga 5: bottoni azione */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
            <Btn t={t} variant="gold" onClick={doManualAdd} disabled={!manualText.trim()}>+ Aggiungi Preparazione</Btn>
            <button onClick={()=>setShowAIImport(true)} style={{
              padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg, ${t.gold}, ${t.goldBright})`,
              color:"#fff",fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.08em",
              boxShadow:`0 3px 14px ${t.goldFaint}`,display:"flex",alignItems:"center",gap:8,
            }}>
              <span>🤖</span> Importa da foto / file / voce
            </button>
          </div>
        </Card>
      )}
      {canEdit && showAIImport && !aiPreview && (
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <Btn t={t} variant="ghost" onClick={()=>setShowAIImport(false)}>← Torna alla lista</Btn>
        </div>
      )}

      {/* ── STATION FILTER TABS ──────────────────────────── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {STATIONS.map(s=>{
          const cnt = countByStation[s.key];
          const active = filterStation===s.key;
          return (
            <button key={s.key} onClick={()=>setFilterStation(s.key)} style={{
              padding:"8px 16px",borderRadius:10,cursor:"pointer",
              fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.06em",
              background:active?`linear-gradient(135deg,${s.color},${s.color}CC)`:t.bgCard,
              color:active?"#fff":t.inkMuted,
              border:active?"none":`1px solid ${t.div}`,
              display:"flex",alignItems:"center",gap:6,transition:"all 0.25s",
              boxShadow:active?`0 4px 16px ${s.color}30`:`0 1px 4px ${t.shadow}`,
            }}>
              <span style={{fontSize:12}}>{s.icon}</span>
              {s.label}
              {cnt>0&&<span style={{background:active?"rgba(255,255,255,0.25)":s.color+"25",color:active?"#fff":s.color,padding:"1px 7px",borderRadius:8,fontSize:8}}>{cnt}</span>}
            </button>
          );
        })}
        <button onClick={()=>setFilterDone(!filterDone)} style={{
          padding:"8px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
          fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.06em",
          background:filterDone?t.bgAlt:t.bgCard,color:t.inkMuted,marginLeft:"auto",
        }}>
          {filterDone?"Nascondi completate":"Mostra completate"}
        </button>
      </div>

      {/* ── TASK COLUMNS ─────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {/* Da fare */}
        <Card t={t}>
          <CardHeader t={t} title={`Da fare (${todo.length})`}/>
          <div>
            {todo.length===0 && (
              <div style={{padding:"24px 22px",color:t.inkFaint,fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center"}}>
                {tasks.length===0?"Nessuna preparazione — aggiungi con + o AI":"✓ Tutto completato"}
              </div>
            )}
            {todo.map((task,i)=>{
              const station = STATIONS.find(s=>s.key===task.station)||STATIONS[STATIONS.length-1];
              return (
                <div key={task.id} style={{
                  padding:"12px 22px",display:"flex",alignItems:"flex-start",gap:12,
                  borderBottom:i<todo.length-1?`1px solid ${t.div}`:"none",
                  borderLeft:`3px solid ${station.color}`,
                  transition:"background 0.15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background=t.bgAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:12,marginTop:2,flexShrink:0}}>{station.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontFamily:"var(--serif)",fontStyle:"italic",color:t.ink,lineHeight:1.4}}>{task.text}</div>
                    <div className="mono" style={{fontSize:8,color:station.color,marginTop:3,opacity:0.8}}>{station.label}</div>
                  </div>
                  {canEdit&&(
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <button onClick={()=>setMoveModal(task)} style={{...btnSmall(t),background:t.success+"20",color:t.success,fontSize:8,padding:"3px 8px"}}>↑ Carica</button>
                      <button onClick={()=>toggleTask(task.id)} style={{...btnSmall(t),fontSize:8,padding:"3px 8px"}}>✓</button>
                      <button onClick={()=>removeTask(task.id)} style={{...btnSmall(t),background:t.accentGlow,color:t.danger,fontSize:8,padding:"3px 8px"}}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Completate */}
        <Card t={t}>
          <CardHeader t={t} title={`Completate (${done.length})`}
            right={done.length>0&&canEdit?(
              <button onClick={()=>setTasks(p=>p.filter(x=>!x.done))} style={{...btnSmall(t),fontSize:8}}>Pulisci</button>
            ):null}/>
          <div>
            {done.length===0 && (
              <div style={{padding:"24px 22px",color:t.inkFaint,fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center"}}>
                Nessuna completata
              </div>
            )}
            {done.map((task,i)=>{
              const station = STATIONS.find(s=>s.key===task.station)||STATIONS[STATIONS.length-1];
              return (
                <div key={task.id} style={{
                  padding:"12px 22px",display:"flex",alignItems:"center",gap:12,
                  borderBottom:i<done.length-1?`1px solid ${t.div}`:"none",
                  opacity:0.55, borderLeft:`3px solid ${station.color}44`,
                }}>
                  <span style={{fontSize:12,color:t.success}}>✓</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkMuted,textDecoration:"line-through"}}>{task.text}</div>
                    <div className="mono" style={{fontSize:8,color:station.color,marginTop:2,opacity:0.7}}>{station.label}</div>
                  </div>
                  {canEdit&&<button onClick={()=>toggleTask(task.id)} style={{...btnSmall(t),fontSize:8}}>Annulla</button>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── LOAD-IN MODAL ────────────────────────────────── */}
      {moveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Card t={t} style={{width:380,padding:28}}>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:8}}>CARICA IN GIACENZA</div>
            <div style={{fontFamily:"var(--serif)",fontSize:17,fontStyle:"italic",color:t.ink,marginBottom:20,lineHeight:1.4}}>{moveModal.text}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <LuxInput value={moveQty} onChange={e=>setMoveQty(e.target.value)} type="number" placeholder="Quantità" t={t}/>
                <LuxSelect value={moveDest} onChange={e=>setMoveDest(e.target.value)} t={t}>
                  <option value="fridge">Frigo</option>
                  <option value="freezer">Congelatore</option>
                  <option value="dry">Dispensa</option>
                  <option value="counter">Banco</option>
                </LuxSelect>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn t={t} variant="gold" onClick={doLoadIn}>↑ Carica in giacenza</Btn>
                <Btn t={t} variant="ghost" onClick={()=>setMoveModal(null)}>Annulla</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SHOPPING VIEW
   ════════════════════════════════════════════════════════ */
function ShoppingView({ t }) {
  const { kitchen, shopAdd, shopToggle, shopRemove, shopClear, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());

  const [name, setName]  = useState("");
  const [qty,  setQty]   = useState("1");
  const [unit, setUnit]  = useState("pz");
  const [cat,  setCat]   = useState("economato");
  const [notes,setNotes] = useState("");
  const speech = useSpeech(t=>setName(t));

  const CATS = ["economato","giornaliero","settimanale","altro"];
  const items = (kitchen?.shopping||[]);

  function add() {
    if(!name.trim()||parseFloat(qty)<=0) { toast("Compila nome e quantità","error"); return; }
    shopAdd(name,parseFloat(qty),unit,cat,notes);
    toast(`${name} aggiunto alla lista`,"success");
    setName(""); setQty("1"); setNotes("");
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {canEdit&&(
        <Card t={t} style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{display:"flex",gap:8}}>
              <AutocompleteInput value={name} onChange={e=>setName(e.target.value)}
                onSelect={p=>{setName(p.n);if(p.u)setUnit(p.u);}}
                placeholder="Articolo MEP (autocomplete)" t={t} style={{flex:1}}
                catalog={[...PREP_CATALOG,...PRODUCT_CATALOG]} extraSuggestions={[]}/>
              <VoiceBtn t={t} onResult={r=>setName(r)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <LuxInput value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="Qtà" t={t}/>
              <LuxSelect value={unit} onChange={e=>setUnit(e.target.value)} t={t}>
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </LuxSelect>
            </div>
            <LuxSelect value={cat} onChange={e=>setCat(e.target.value)} t={t}>
              {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </LuxSelect>
            <LuxInput value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Note" t={t}/>
          </div>
          <Btn t={t} onClick={add} disabled={!name.trim()}>Aggiungi alla lista</Btn>
        </Card>
      )}

      {CATS.map(category=>{
        const catItems = items.filter(x=>x.category===category);
        if(!catItems.length) return null;
        const unchecked = catItems.filter(x=>!x.checked);
        const checked   = catItems.filter(x=>x.checked);
        return (
          <Card key={category} t={t}>
            <CardHeader t={t} title={category.toUpperCase()}
              right={canEdit&&checked.length>0?<button onClick={()=>shopClear(category)} style={{...btnSmall(t),fontSize:8}}>Pulisci spuntati</button>:null}/>
            <div>
              {[...unchecked,...checked].map((item,i)=>(
                <div key={item.id} style={{padding:"11px 22px",display:"flex",alignItems:"center",gap:12,borderBottom:i<catItems.length-1?`1px solid ${t.div}`:"none",opacity:item.checked?0.5:1,transition:"opacity 0.2s"}}>
                  <input type="checkbox" checked={item.checked} onChange={()=>shopToggle(item.id)} style={{cursor:"pointer",accentColor:t.gold}}/>
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,fontFamily:"var(--serif)",color:t.ink,textDecoration:item.checked?"line-through":"none",fontStyle:"italic"}}>{item.name}</span>
                    <span className="mono" style={{fontSize:9,color:t.inkFaint,marginLeft:8}}>{item.quantity} {item.unit}</span>
                    {item.notes&&<span style={{fontSize:9,color:t.inkFaint,marginLeft:8,fontStyle:"italic"}}>· {item.notes}</span>}
                  </div>
                  {canEdit&&<button onClick={()=>shopRemove(item.id)} style={{...btnSmall(t),background:t.accentGlow,color:t.danger}}>✕</button>}
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {items.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}>
          <div style={{fontFamily:"var(--serif)",fontSize:20,fontStyle:"italic",marginBottom:8}}>Lista vuota</div>
          <div className="mono" style={{fontSize:9,letterSpacing:"0.14em"}}>AGGIUNGI ARTICOLI DA ORDINARE</div>
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   SPESA VIEW v2 — vista tabellare tipologia × frequenza
   Economato | Alimenti | Altro  ×  Giornaliero | Settimanale
   ════════════════════════════════════════════════════════ */
function PerFornitoireView({ t, items, spesaV2Add, spesaV2Toggle, spesaV2Remove, spesaV2Update, toast, canEdit }) {
  const byFornitore:{[k:string]:any[]} = {};
  items.forEach((item:any)=>{
    const k = item.fornitore||"Senza fornitore";
    if(!byFornitore[k]) byFornitore[k]=[];
    byFornitore[k].push(item);
  });
  const fornitori = Object.keys(byFornitore).sort();
  const [expanded, setExpanded] = React.useState<string|null>(null);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {items.length===0&&<div style={{padding:"32px",textAlign:"center",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic"}}>Nessun articolo in lista</div>}
      {fornitori.map((forn:string)=>{
        const isOpen=expanded===forn;
        const fornitoreItems=byFornitore[forn];
        const tot=fornitoreItems.filter((x:any)=>!x.checked).length;
        return (
          <div key={forn} style={{borderRadius:12,border:"1px solid "+t.div,overflow:"hidden"}}>
            <div onClick={()=>setExpanded(isOpen?null:forn)} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isOpen?t.bgAlt:t.bgCard}}>
              <span style={{fontSize:16}}>🏪</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink,fontWeight:500}}>{forn}</div>
                <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{tot} articoli da ordinare · {fornitoreItems.length} totali</div>
              </div>
              <span style={{fontSize:11,color:t.inkFaint}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen&&(
              <div style={{padding:"8px 16px 12px",display:"flex",flexDirection:"column",gap:2}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.1em"}}>GIORNALIERO</div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.1em"}}>SETTIMANALE</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    {fornitoreItems.filter((x:any)=>x.frequenza==="giornaliero").map((item:any)=>(
                      <div key={item.id} style={{padding:"4px 0",display:"flex",alignItems:"center",gap:6,opacity:item.checked?0.4:1}}>
                        <input type="checkbox" checked={!!item.checked} onChange={()=>spesaV2Toggle(item.id)} style={{cursor:"pointer",accentColor:t.gold}}/>
                        <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,flex:1,textDecoration:item.checked?"line-through":"none"}}>{item.nome}</span>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{item.quantita}{item.unitaMisura}</span>
                        {canEdit&&<button onClick={()=>spesaV2Remove(item.id)} style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:12}}>✕</button>}
                      </div>
                    ))}
                    {fornitoreItems.filter((x:any)=>x.frequenza==="giornaliero").length===0&&<div style={{color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11}}>—</div>}
                  </div>
                  <div>
                    {fornitoreItems.filter((x:any)=>x.frequenza==="settimanale").map((item:any)=>(
                      <div key={item.id} style={{padding:"4px 0",display:"flex",alignItems:"center",gap:6,opacity:item.checked?0.4:1}}>
                        <input type="checkbox" checked={!!item.checked} onChange={()=>spesaV2Toggle(item.id)} style={{cursor:"pointer",accentColor:t.gold}}/>
                        <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,flex:1,textDecoration:item.checked?"line-through":"none"}}>{item.nome}</span>
                        <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{item.quantita}{item.unitaMisura}</span>
                        {canEdit&&<button onClick={()=>spesaV2Remove(item.id)} style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:12}}>✕</button>}
                      </div>
                    ))}
                    {fornitoreItems.filter((x:any)=>x.frequenza==="settimanale").length===0&&<div style={{color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11}}>—</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GiacenzaFornitori({ t, spesaV2Add, toast, items }) {
  const { kitchen } = useK();
  const ingredienti = kitchen?.ingredienti||[];
  const [expanded, setExpanded] = React.useState<string|null>(null);
  const [search, setSearch] = React.useState("");

  // Raggruppa per fornitore
  const byFornitore:{[k:string]:any[]} = {};
  ingredienti.forEach((ing:any)=>{
    const k = ing.fornitore||"Fornitore sconosciuto";
    if(!byFornitore[k]) byFornitore[k]=[];
    byFornitore[k].push(ing);
  });

  const allIngr = ingredienti.filter((i:any)=>!search||i.nome.toLowerCase().includes(search.toLowerCase()));

  function inStock(nome:string) {
    if(!nome) return null;
    return (items||[]).find((x:any)=>(x.name||"boom").toLowerCase().includes((nome||"").toLowerCase().split(" ")[0]));
  }

  function aggiungiASpesa(ing:any) {
    spesaV2Add(ing.nome, ing.qty||1, ing.unit||"pz", "alimenti", "giornaliero", ing.lotto?"lotto:"+ing.lotto:"", ing.fornitore||"" );
    toast("+ "+ing.nome+" in lista spesa","success");
  }

  const fornitori = Object.keys(byFornitore).sort();

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca ingrediente..." style={{flex:1,minWidth:120,padding:"8px 12px",borderRadius:9,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:13,outline:"none"}}/>
        <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{ingredienti.length} ingredienti</span>
      </div>
      {ingredienti.length===0&&<div style={{padding:"32px",textAlign:"center",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic"}}>Carica una fattura per vedere gli ingredienti</div>}
      {search ? (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {allIngr.map((ing:any)=>{
            const stock=inStock(ing.nome);
            const sotto=stock&&stock.quantity<(stock.parLevel||0);
            return (
              <div key={ing.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,background:t.bgAlt,border:"1px solid "+(sotto?t.danger:t.div)}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{ing.nome}</div>
                  <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2,display:"flex",flexWrap:"wrap",gap:6}}>
                    <span style={{color:t.secondary}}>{ing.fornitore}</span>
                    <span>{ing.qty} {ing.unit}</span>
                    {ing.lotto&&<span style={{color:t.gold}}>#{ing.lotto}</span>}
                    {ing.scadenza&&<span>scad:{ing.scadenza}</span>}
                    {sotto&&<span style={{color:t.danger,fontWeight:700}}>SOTTO PAR</span>}
                  </div>
                </div>
                <button onClick={()=>aggiungiASpesa(ing)} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:9}}>+ Spesa</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {fornitori.map((forn:string)=>{
            const ings=byFornitore[forn];
            const isOpen=expanded===forn;
            const tot=ings.reduce((s:number,i:any)=>s+(i.prezzoTotale||0),0);
            return (
              <div key={forn} style={{borderRadius:12,border:"1px solid "+t.div,overflow:"hidden"}}>
                <div onClick={()=>setExpanded(isOpen?null:forn)} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isOpen?t.bgAlt:t.bgCard}}>
                  <span style={{fontSize:16}}>🏪</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink,fontWeight:500}}>{forn}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{ings.length} ingredienti{tot>0?" · €"+tot.toFixed(2):""}</div>
                  </div>
                  <span style={{fontSize:11,color:t.inkFaint}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{padding:"8px 12px 12px",display:"flex",flexDirection:"column",gap:6}}>
                    {ings.map((ing:any)=>{
                      const stock=inStock(ing.nome);
                      const sotto=stock&&stock.quantity<(stock.parLevel||0);
                      return (
                        <div key={ing.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:t.bgCard,border:"1px solid "+(sotto?t.danger+"44":t.div)}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{ing.nome}</div>
                            <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2,display:"flex",flexWrap:"wrap",gap:5}}>
                              <span>{ing.qty} {ing.unit}</span>
                              {ing.lotto&&<span style={{color:t.gold}}>#{ing.lotto}</span>}
                              {ing.scadenza&&<span>scad:{ing.scadenza}</span>}
                              {ing.prezzoUnitario&&<span style={{color:t.success}}>€{ing.prezzoUnitario}/{ing.unit}</span>}
                              {sotto&&<span style={{color:t.danger,fontWeight:700}}>SOTTO PAR</span>}
                            </div>
                          </div>
                          <button onClick={()=>aggiungiASpesa(ing)} style={{padding:"4px 8px",borderRadius:6,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:8,whiteSpace:"nowrap"}}>+ Spesa</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArchivioFatture({ t, storico, setStorico, FKEY, stockAdd, toast }) {
  const { kitchen, ingredienteRemove } = useK();
  const ingredienti = kitchen?.ingredienti||[];
  const [expanded, setExpanded] = React.useState<string|null>(null);
  // Raggruppa per mese
  const byFattura:{[k:string]:any[]}={};
  ingredienti.forEach((ing:any)=>{ const k=ing.fatturaId||"unknown"; if(!byFattura[k]) byFattura[k]=[]; byFattura[k].push(ing); });
  const byMonth:{[k:string]:string[]}={};
  Object.keys(byFattura).forEach(fid=>{
    const first=byFattura[fid][0];
    const m=(first?.dataFattura||"").slice(0,7)||"senza-data";
    if(!byMonth[m]) byMonth[m]=[];
    byMonth[m].push(fid);
  });
  const months = Object.keys(byMonth).sort((a,b)=>b.localeCompare(a));

  function fmtMonth(m:string){
    const [y,mo]=m.split("-");
    return (names[parseInt(mo)]||mo)+" "+y;
  }
    const names=["","Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  return (
    <div style={{background:t.bgAlt,borderRadius:14,border:"1px solid "+t.div,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:ingredienti.length?"1px solid "+t.div:"none"}}>
        <div className="mono" style={{fontSize:9,color:t.gold,letterSpacing:"0.1em"}}>ARCHIVIO INGREDIENTI ({ingredienti.length})</div>
      </div>
      {ingredienti.length===0&&<div style={{padding:"20px",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center",fontSize:12}}>Nessun ingrediente — carica una fattura</div>}
      {months.map((m:string)=>(
        <div key={m} style={{borderBottom:"1px solid "+t.div}}>
          <div style={{padding:"8px 16px",background:t.bgCard,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span className="mono" style={{fontSize:10,color:t.secondary,fontWeight:600}}>{fmtMonth(m)}</span>
            <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{byMonth[m].length} fatture</span>
          </div>
          {(byMonth[m] as string[]).map((fid:string)=>{
            const ings=byFattura[fid]||[];
            const first=ings[0];
            const isOpen=expanded===fid;
            const tot=ings.reduce((s:number,ing:any)=>s+(ing.prezzoTotale||0),0);
            return (
              <div key={fid}>
                <div onClick={()=>setExpanded(isOpen?null:fid)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isOpen?t.bgAlt:"transparent",borderTop:"1px solid "+t.div+"44"}}>
                  <span style={{fontSize:14}}>📄</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{first?.fornitore||"Fattura"}{first?.numeroFattura?" #"+first.numeroFattura:""}</div>
                  {first?.imgFattura&&isOpen&&<img src={"data:"+first.imgFattura.mimeType+";base64,"+first.imgFattura.base64} alt="fattura" style={{width:"100%",borderRadius:8,marginTop:8,maxHeight:300,objectFit:"contain"}}/>}
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{first?.dataFattura} · {ings.length} ingredienti{tot>0?" · €"+tot.toFixed(2):""}</div>
                  </div>
                  <span style={{fontSize:11,color:t.inkFaint}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{padding:"8px 16px 12px",display:"flex",flexDirection:"column",gap:6}}>
                    {ings.map((ing:any)=>(
                      <div key={ing.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:9,background:t.bgCard,border:"1px solid "+t.div}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{ing.nome}</div>
                          <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2,display:"flex",flexWrap:"wrap",gap:6}}>
                            <span>{ing.qty} {ing.unit}</span>
                            {ing.lotto&&<span style={{color:t.gold}}>#{ing.lotto}</span>}
                            {ing.scadenza&&<span>scad:{ing.scadenza}</span>}
                            {ing.prezzoUnitario&&<span style={{color:t.success}}>€{ing.prezzoUnitario}/{ing.unit}</span>}
                            {ing.prezzoTotale&&<span style={{color:t.success,fontWeight:600}}>€{ing.prezzoTotale}</span>}
                          </div>
                        </div>
                        <button onClick={()=>ingredienteRemove(ing.id)} style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:8}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FatturaLottiView({ t, stockAdd, toast }) {
  const { ingredienteAdd } = useK();
  const fileRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [sel, setSel] = useState<{[k:string]:boolean}>({});
  const [imgData, setImgData] = useState<{base64:string,mimeType:string}|null>(null);
  const [textInput, setTextInput] = useState("");
  const FKEY = "fatture-storico";
  const [storico, setStorico] = useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem(FKEY)||"[]");}catch{return[];}});
  const [showStorico, setShowStorico] = useState(false);
  function saveStorico(prods:any[], meta:any) {
    const entry = {id:genId(), data:todayDate(), at:nowISO(), fornitore:meta?.fornitore||"", numero:meta?.numero||"", dataFattura:meta?.dataFattura||todayDate(), prodotti:prods};
    const next = [entry, ...storico].slice(0,30);
    setStorico(next); localStorage.setItem(FKEY, JSON.stringify(next));
  }

  async function analizza() {
    if(!imgData&&!textInput.trim()){toast("Carica una foto o inserisci il testo","error");return;}
    setLoading(true); setPreview([]); setSel({});
    try {
      const sys = `Sei un sistema OCR esperto per cucine professionali stellate. Analizza questa fattura/DDT ed estrai TUTTI i prodotti.
Rispondi SOLO in JSON valido (no markdown, no testo extra):
{"fornitore":"NOME FORNITORE","numero_fattura":"NUM","data_fattura":"2026-01-15","prodotti":[{"nome":"NOME PRODOTTO REALE","lotto":"LOT123 oppure null","qty":5,"unit":"kg","prezzo_unitario":3.50,"prezzo_totale":17.50,"scadenza":"2026-04-05 oppure null"}]}
Estrai TUTTI i prodotti visibili. Se un campo non è presente mettilo null.`;
      let result;
      // Groq non supporta vision — usa sempre testo (OCR gia fatto da Tesseract)
      const inputTxt = textInput.trim()||(imgData?"(immagine caricata, analizza)":"");
      result = await callAI({systemPrompt:sys, userContext:inputTxt, maxTokens:2000, expectJSON:false, noCache:true});
      if(typeof result==="string"){const s=result.indexOf("{");const e=result.lastIndexOf("}");if(s>=0&&e>s)result=JSON.parse(result.slice(s,e+1));}
      const prods = result?.prodotti||[];
      // Salva metadati fattura per uso in archivio
      (window as any).__lastFatturaResult = result;
      if(!prods.length){toast("Nessun prodotto trovato","error");return;}
      const initSel:{[k:string]:boolean}={};
      prods.forEach((_:any,i:number)=>{initSel[i]=true;});
      setPreview(prods); setSel(initSel);
      toast(`${prods.length} prodotti estratti`,"success");
    } catch(e:any) {
      toast("Errore AI: "+e.message,"error");
    } finally { setLoading(false); }
  }

  function carica() {
    const toLoad = preview.filter((_,i)=>sel[i]);
    if(!toLoad.length){toast("Seleziona almeno un prodotto","error");return;}
    const lastRes2 = (window as any).__lastFatturaResult||{};
    const fatturaId = genId();
    const fatturaImg = imgData ? {base64:imgData.base64,mimeType:imgData.mimeType} : null;
    toLoad.forEach((p:any)=>{
      ingredienteAdd({
        imgFattura: fatturaImg,
        imgFattura: fatturaImg,
        fatturaId,
        fornitore: lastRes2?.fornitore||"",
        dataFattura: lastRes2?.data_fattura||todayDate(),
        numeroFattura: lastRes2?.numero_fattura||"",
        nome: p.nome, lotto: p.lotto||null,
        qty: p.qty||1, unit: p.unit||"pz",
        prezzoUnitario: p.prezzo_unitario||null,
        prezzoTotale: p.prezzo_totale||null,
        scadenza: p.scadenza||null, usato: false,
      });
    });
    const lastRes = (window as any).__lastFatturaResult||{};
    const meta = { fornitore: lastRes?.fornitore||toLoad[0]?.fornitore||"", numero: lastRes?.numero_fattura||"", dataFattura: lastRes?.data_fattura||todayDate() };
    saveStorico(toLoad, meta);
    toast(`✓ ${toLoad.length} ingredienti salvati in archivio`,"success");
    setPreview([]); setSel({}); setImgData(null); setTextInput("");
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:t.bgAlt,borderRadius:14,padding:"16px",border:"1px solid "+t.div}}>
        <div className="mono" style={{fontSize:9,color:t.gold,letterSpacing:"0.1em",marginBottom:10}}>CARICA FATTURA O DDT</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={async e=>{
            const f=e.target.files?.[0]; if(!f) return;
            toast("Analisi in corso...","success");
            try {
              // Carica Tesseract.js per OCR
              if(!(window as any).Tesseract){
                await new Promise<void>((res,rej)=>{
                  const s=document.createElement("script");
                  s.src="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js";
                  s.onload=()=>res(); s.onerror=()=>rej(new Error("Tesseract load failed"));
                  document.head.appendChild(s);
                });
              }
              // Per PDF usa PDF.js prima
              let imageData = f;
              if(f.type==="application/pdf"){
                if(!(window as any).pdfjsLib){
                  await new Promise<void>((res,rej)=>{
                    const s=document.createElement("script");
                    s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                    s.onload=()=>{ (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; res(); };
                    s.onerror=()=>rej(new Error("PDF.js load"));
                    document.head.appendChild(s);
                  });
                }
                const ab=await f.arrayBuffer();
                const pdf=await (window as any).pdfjsLib.getDocument({data:ab}).promise;
                const page=await pdf.getPage(1);
                const vp=page.getViewport({scale:2});
                const canvas=document.createElement("canvas");
                canvas.width=vp.width; canvas.height=vp.height;
                await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
                // Converti canvas in blob
                imageData = await new Promise<File>(res2=>canvas.toBlob(b=>res2(new File([b!],"page1.jpg",{type:"image/jpeg"})),"image/jpeg",0.9));
              }
              // OCR con Tesseract
              const result = await (window as any).Tesseract.recognize(imageData, "ita+eng", {logger:()=>{}});
              const ocrText = result.data.text;
              if(ocrText.trim().length > 10){
                setTextInput(ocrText);
                setImgData(null);
                toast("Testo estratto! Premi Analizza.","success");
              } else {
                toast("OCR: poco testo trovato. Incolla manualmente.","error");
              }
            } catch(err:any){ toast("Errore: "+err.message,"error"); }
          }}/>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"9px 18px",borderRadius:9,border:"1px solid "+t.div,cursor:"pointer",background:imgData?t.goldFaint:t.bgCard,color:imgData?t.gold:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>
            {imgData?"✓ File caricato":"📎 Foto/PDF"}
          </button>
          {imgData&&<button onClick={()=>setImgData(null)} style={{padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:10}}>✕</button>}
        </div>
        <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:6}}>OPPURE INCOLLA IL TESTO</div>
        <textarea value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Incolla testo fattura o DDT. Es: Cozze vive 5kg lotto COZ001 scad 03/04/2026 euro 3.20" rows={4} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:11,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
        <button onClick={analizza} disabled={loading||(!imgData&&!textInput.trim())} style={{marginTop:10,width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:loading?t.bgAlt:t.secondary,color:loading?t.inkMuted:"#fff",fontFamily:"var(--mono)",fontSize:11,fontWeight:600,transition:"all 0.2s"}}>
          {loading?"⏳ Analisi in corso...":"✨ Analizza e Estrai Lotti"}
        </button>
      </div>

      {preview.length>0&&(
        <div style={{background:t.bgAlt,borderRadius:14,padding:"16px",border:"1px solid "+t.div,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="mono" style={{fontSize:9,color:t.gold,letterSpacing:"0.1em"}}>PRODOTTI ESTRATTI — seleziona da caricare</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{const s:{[k:string]:boolean}={};preview.forEach((_,i)=>{s[i]=true;});setSel(s);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>Tutti</button>
              <button onClick={()=>setSel({})} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>Nessuno</button>
            </div>
          </div>
          {preview.map((p:any,i:number)=>(
            <div key={i} onClick={()=>setSel(s=>({...s,[i]:!s[i]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,border:"1px solid "+(sel[i]?t.gold:t.div),background:sel[i]?t.goldFaint:t.bgCard,cursor:"pointer",transition:"all 0.15s"}}>
              <span style={{fontSize:14,color:sel[i]?t.gold:t.inkFaint}}>{sel[i]?"☑":"☐"}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{p.nome}</div>
                <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                  <span>{p.qty} {p.unit}</span>
                  {p.lotto&&<span style={{color:t.gold}}>#{p.lotto}</span>}
                  {p.scadenza&&<span>scad:{p.scadenza}</span>}
                  {p.prezzo_totale&&<span style={{color:t.success}}>€{p.prezzo_totale}</span>}
                  <select value={p.location||"fridge"} onChange={e=>{const n=[...preview];n[i]={...n[i],location:e.target.value};setPreview(n);}} onClick={ev=>ev.stopPropagation()} style={{padding:"2px 4px",borderRadius:5,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:9,fontFamily:"var(--mono)",outline:"none"}}>
                    <option value="fridge">Frigo</option>
                    <option value="freezer">Freezer</option>
                    <option value="dry">Dispensa</option>
                    <option value="counter">Banco</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button onClick={carica} style={{padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:11,fontWeight:600}}>
            ✓ Salva {Object.values(sel).filter(Boolean).length} ingredienti in archivio
          </button>
        </div>
      )}
      {/* Archivio fatture calendario */}
      <ArchivioFatture t={t} storico={storico} setStorico={setStorico} FKEY={FKEY} stockAdd={stockAdd} toast={toast}/>
    </div>
  );
}

function SpesaView({ t }) {
  const { kitchen, allItems, stockAdd, spesaV2Add, spesaV2Update, spesaV2Toggle, spesaV2Remove, spesaV2Clear, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [customSpesaL, saveCustomSpesa] = useCustomMemory("spesa");

  const items = kitchen?.spesaV2||[];
  const [tab, setTab]     = useState("tabella");
  const [form, setForm]   = useState({nome:"",qty:"1",unit:"pz",tipologia:"alimenti",frequenza:"giornaliero",note:""});

  // ── Carica articolo spesa in giacenza ─────────────────────
  function caricaInGiacenza(item) {
    const qty = parseFloat(item.quantita)||1;
    const loc = "dry"; // default dispensa — modificabile
    stockAdd({name:item.nome, quantity:qty, unit:item.unitaMisura||"pz", location:loc, insertedDate:todayDate()});
    spesaV2Toggle(item.id); // spunta l'articolo
    toast(`✓ ${item.nome} (${qty} ${item.unitaMisura||"pz"}) → Dispensa`, "success");
  }
  const [qNome, setQNome] = useState("");
  const [qQty,  setQQty]  = useState("1");
  const [qUnit, setQUnit] = useState("pz");
  function quickAdd() {
    if(!qNome.trim()){toast("Inserisci il nome","error");return;}
    spesaV2Add(qNome.trim(),qQty,qUnit,"alimenti","giornaliero","");
    saveCustomSpesa(qNome.trim());
    setQNome(""); setQQty("1");
    toast(`${qNome.trim()} aggiunto`,"success");
  }
  const [aiLoading,setAiLoading] = useState(false);

  function save() {
    if(!form.nome.trim()) { toast("Inserisci il nome articolo","error"); return; }
    spesaV2Add(form.nome,form.qty,form.unit,form.tipologia,form.frequenza,form.note);
    toast(`${form.nome} aggiunto`,"success");
    setForm(p=>({...p,nome:"",qty:"1",note:""}));
  }

  // ── matrice per vista tabellare ──────────────────────────
  const matrice = useMemo(()=>
    SPESA_TIPOLOGIE.map(tip=>({
      tip,
      label: SPESA_TIP_LABELS[tip],
      icon:  SPESA_TIP_ICONS[tip],
      giornalieri: items.filter(i=>i.tipologia===tip&&i.frequenza==="giornaliero"),
      settimanali: items.filter(i=>i.tipologia===tip&&i.frequenza==="settimanale"),
    })).filter(r=>r.giornalieri.length||r.settimanali.length||true),
    [items]
  );
  const totale = items.filter(x=>!x.checked).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Tab header */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[{k:"tabella",l:`📊 Vista Tabella (${totale})`},{k:"perfornitore",l:"🏪 Per Fornitore"},{k:"aggiungi",l:"+ Aggiungi"},{k:"fattura",l:"📄 Fattura/DDT"},{k:"fornitori",l:"📦 Ingredienti"}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
            background:tab===k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:t.bgCard,
            color:tab===k?"#fff":t.inkMuted,boxShadow:`0 1px 4px ${t.shadow}`,transition:"all 0.2s",
          }}>{l}</button>
        ))}
        {items.some(x=>x.checked)&&(
          <button onClick={()=>{spesaV2Clear();toast("Spuntati rimossi","success");}} style={{
            marginLeft:"auto",padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:9,background:t.accentGlow,color:t.danger,
          }}>Pulisci spuntati</button>
        )}
      </div>

      {/* Form aggiunta */}
      {tab==="perfornitore"&&<PerFornitoireView t={t} items={items} spesaV2Add={spesaV2Add} spesaV2Toggle={spesaV2Toggle} spesaV2Remove={spesaV2Remove} spesaV2Update={spesaV2Update} toast={toast} canEdit={canEdit}/>}
      {tab==="fattura"&&<FatturaLottiView t={t} stockAdd={stockAdd} toast={toast}/>}
      {tab==="fornitori"&&<GiacenzaFornitori t={t} spesaV2Add={spesaV2Add} toast={toast} items={items}/>}
      {(tab==="aggiungi"||!items.length)&&canEdit&&(
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>NUOVO ARTICOLO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <AutocompleteInput value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}
              onSelect={p=>{setForm(q=>({...q,nome:p.n,unit:p.u||q.unit}));saveCustomSpesa(p.n);}}
              placeholder="Articolo (autocomplete)" t={t} style={{gridColumn:"1/-1"}}
              catalog={[...PRODUCT_CATALOG,...ECONOMO_CATALOG]} extraSuggestions={customSpesaL}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <LuxInput value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} type="number" t={t} placeholder="Qtà"/>
              <LuxSelect value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} t={t}>
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </LuxSelect>
            </div>
            <LuxSelect value={form.tipologia} onChange={e=>setForm(p=>({...p,tipologia:e.target.value}))} t={t}>
              {SPESA_TIPOLOGIE.map(s=><option key={s} value={s}>{SPESA_TIP_ICONS[s]} {SPESA_TIP_LABELS[s]}</option>)}
            </LuxSelect>
            <LuxSelect value={form.frequenza} onChange={e=>setForm(p=>({...p,frequenza:e.target.value}))} t={t}>
              {SPESA_FREQUENZE.map(f=><option key={f} value={f}>{SPESA_FREQ_LABELS[f]}</option>)}
            </LuxSelect>
            <LuxInput value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Note" t={t} style={{gridColumn:"1/-1"}}/>
          </div>
          <Btn t={t} variant="gold" onClick={save} disabled={!form.nome.trim()}>+ Aggiungi alla Lista</Btn>
        </Card>
      )}

      {/* Quick add spesa sempre visibile */}
      {canEdit&&(
        <div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 16px",borderRadius:12,background:t.bgCard,border:`1px solid ${t.div}`,flexWrap:"wrap"}}>
          <AutocompleteInput value={qNome} onChange={e=>setQNome(e.target.value)}
            onSelect={p=>{setQNome(p.n);setQUnit(p.u||qUnit);saveCustomSpesa(p.n);}}
            placeholder="Articolo…" t={t} style={{flex:2,minWidth:160}}
            catalog={[...PRODUCT_CATALOG,...ECONOMO_CATALOG]} extraSuggestions={customSpesaL}/>
          <input value={qQty} onChange={e=>setQQty(e.target.value)} type="number" min="0.1" step="0.1"
            style={{width:56,padding:"6px 8px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none"}}/>
          <select value={qUnit} onChange={e=>setQUnit(e.target.value)}
            style={{padding:"6px 6px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
            {["pz","kg","g","l","ml"].map(u=><option key={u}>{u}</option>)}
          </select>
          <button onClick={quickAdd}
            style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10,whiteSpace:"nowrap"}}>+ Aggiungi</button>
        </div>
      )}
      {/* Vista tabellare */}
      {tab==="tabella"&&(
        <Card t={t} style={{padding:0,overflow:"hidden"}}>
          {/* Intestazione colonne */}
          <div style={{
            display:"grid",gridTemplateColumns:"160px 1fr 1fr",
            background:t.bgAlt,borderBottom:`1px solid ${t.div}`,
          }}>
            {["Categoria","Giornaliero","Settimanale"].map(h=>(
              <div key={h} style={{padding:"12px 16px",fontFamily:"var(--mono)",fontSize:9,
                letterSpacing:"0.12em",color:t.inkFaint,borderRight:`1px solid ${t.div}`}}>
                {h}
              </div>
            ))}
          </div>
          {/* Righe per tipologia */}
          {matrice.map(riga=>(
            <div key={riga.tip} style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",borderBottom:`1px solid ${t.div}`}}>
              {/* Label tipologia */}
              <div style={{padding:"14px 16px",display:"flex",alignItems:"flex-start",gap:8,
                borderRight:`1px solid ${t.div}`,background:t.bgAlt}}>
                <span style={{fontSize:18}}>{riga.icon}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:t.ink,letterSpacing:"0.06em",marginTop:2}}>
                  {riga.label.toUpperCase()}
                </span>
              </div>
              {/* Colonna giornalieri */}
              <div style={{padding:"8px 12px",borderRight:`1px solid ${t.div}`}}>
                {riga.giornalieri.map(item=>(
                  <SpesaItemRow key={item.id} item={item} t={t} canEdit={canEdit}
                    onToggle={spesaV2Toggle} onRemove={spesaV2Remove}
                    onUpdate={spesaV2Update} onCaricaGiacenza={caricaInGiacenza}/>
                ))}
                {riga.giornalieri.length===0&&(
                  <div style={{padding:"8px 0",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11}}>—</div>
                )}
              </div>
              {/* Colonna settimanali */}
              <div style={{padding:"8px 12px"}}>
                {riga.settimanali.map(item=>(
                  <SpesaItemRow key={item.id} item={item} t={t} canEdit={canEdit}
                    onToggle={spesaV2Toggle} onRemove={spesaV2Remove}
                    onUpdate={spesaV2Update} onCaricaGiacenza={caricaInGiacenza}/>
                ))}
                {riga.settimanali.length===0&&(
                  <div style={{padding:"8px 0",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11}}>—</div>
                )}
              </div>
            </div>
          ))}
          {items.length===0&&(
            <div style={{padding:"48px 0",textAlign:"center",color:t.inkFaint}}>
              <div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic",marginBottom:8}}>Lista vuota</div>
              <div className="mono" style={{fontSize:9}}>AGGIUNGI ARTICOLI CON IL TAB + AGGIUNGI</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SpesaItemRow({ item, t, canEdit, onToggle, onRemove, onUpdate, onCaricaGiacenza }) {
  const [editQty, setEditQty] = React.useState(false);
  const [qtyVal, setQtyVal]   = React.useState(String(item.quantita||"1"));

  function commitQty() {
    const v = parseFloat(qtyVal);
    if(isFinite(v) && v > 0 && onUpdate) onUpdate(item.id, {quantita: String(v)});
    setEditQty(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 0",
      opacity:item.checked?0.4:1,transition:"opacity 0.2s"}}>
      <input type="checkbox" checked={!!item.checked} onChange={()=>onToggle(item.id)}
        style={{cursor:"pointer",accentColor:t.gold,minWidth:16,minHeight:16}}/>
      <div style={{flex:1,minWidth:0}}>
        <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,
          textDecoration:item.checked?"line-through":"none"}}>{item.nome}</span>
        {/* Qty inline edit */}
        {editQty ? (
          <span style={{display:"inline-flex",alignItems:"center",gap:3,marginLeft:6}}>
            <input autoFocus type="number" value={qtyVal}
              onChange={e=>setQtyVal(e.target.value)}
              onBlur={commitQty}
              onKeyDown={e=>{if(e.key==="Enter")commitQty();if(e.key==="Escape")setEditQty(false);}}
              style={{width:50,padding:"1px 4px",borderRadius:5,border:`1px solid ${t.gold}`,
                background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11,outline:"none"}}/>
            <span className="mono" style={{fontSize:9,color:t.inkFaint}}>{item.unitaMisura}</span>
          </span>
        ) : (
          <span className="mono" onClick={()=>{if(canEdit)setEditQty(true);}}
            style={{fontSize:9,color:t.inkFaint,marginLeft:6,cursor:canEdit?"pointer":"default",
              borderBottom:canEdit?`1px dashed ${t.div}`:"none"}}>
            {item.quantita} {item.unitaMisura}
          </span>
        )}
        {item.note&&<span style={{fontSize:9,color:t.inkFaint,marginLeft:4}}>· {item.note}</span>}
      </div>
      {canEdit&&!item.checked&&(
        <>
          {/* +/- rapidi */}
          <button onClick={()=>{
            const v=parseFloat(item.quantita||"1");
            if(onUpdate) onUpdate(item.id,{quantita:String(Math.max(0.1,+(v-1).toFixed(2)))});
          }} style={{background:t.bgAlt,border:`1px solid ${t.div}`,color:t.inkMuted,
            cursor:"pointer",borderRadius:5,width:20,height:20,fontSize:12,lineHeight:"1",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>−</button>
          <button onClick={()=>{
            const v=parseFloat(item.quantita||"1");
            if(onUpdate) onUpdate(item.id,{quantita:String(+(v+1).toFixed(2))});
          }} style={{background:t.bgAlt,border:`1px solid ${t.div}`,color:t.inkMuted,
            cursor:"pointer",borderRadius:5,width:20,height:20,fontSize:12,lineHeight:"1",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
          {/* Carica in giacenza */}
          {onCaricaGiacenza&&(
            <button onClick={()=>onCaricaGiacenza(item)}
              title="Carica in giacenza (economato)"
              style={{padding:"2px 7px",borderRadius:6,border:`1px solid ${t.success}44`,cursor:"pointer",
                background:t.success+"15",color:t.success,fontFamily:"var(--mono)",fontSize:8,
                whiteSpace:"nowrap",flexShrink:0}}>
              → stock
            </button>
          )}
        </>
      )}
      {canEdit&&(
        <button onClick={()=>onRemove(item.id)} style={{
          background:"none",border:"none",color:t.danger,cursor:"pointer",
          fontSize:12,minWidth:20,minHeight:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        }}>✕</button>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   ECONOMATO VIEW — flusso professionale
   Lista Spesa + Giacenze + Ordini + Ricezione
   REGOLA: prezzi SOLO qui · stock aggiornato solo dopo conferma
   ════════════════════════════════════════════════════════ */
function EconomatoView({ t }) {
  const { kitchen, ordineAdd, ordineUpdate, confermRicezione, allItems, currentRole, updateLocation } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());

  const ordini = kitchen?.ordini||[];
  const [tab, setTab]       = useState("ordini");
  const [showForm, setShowForm] = useState(false);
  const [ordineForm, setOrdineForm] = useState({fornitore:"", items:[]});
  const [newItem, setNewItem] = useState({nome:"",qty:"",unit:"kg",prezzoUnit:"",codiceLotto:"",scadeIl:""});
  const [ricezione, setRicezione] = useState(null); // ordineId in ricezione
  const [editingOrdineId, setEditingOrdineId] = useState(null);
  const [editOrdineItems, setEditOrdineItems] = useState([]);
  const [newEditItem, setNewEditItem] = useState({nome:'',qty:'',unit:'kg',prezzoUnit:''});

  function addItemToForm() {
    if(!newItem.nome||!newItem.qty) { toast("Nome e quantità obbligatori","error"); return; }
    setOrdineForm(p=>({...p, items:[...p.items,{
      id:genId(), nome:newItem.nome, quantitaOrdinata:parseFloat(newItem.qty)||0,
      unitaMisura:newItem.unit, prezzoUnitario:parseFloat(newItem.prezzoUnit)||0,
      quantitaRicevuta:null,
    }]}));
    setNewItem({nome:"",qty:"",unit:"kg",prezzoUnit:"",codiceLotto:"",scadeIl:""});
  }

  function saveOrdine() {
    if(!ordineForm.fornitore||!ordineForm.items.length) { toast("Fornitore e almeno un articolo obbligatori","error"); return; }
    ordineAdd(ordineForm.fornitore, ordineForm.items);
    toast("Ordine creato in bozza","success");
    setOrdineForm({fornitore:"", items:[]});
    setShowForm(false);
  }

  function inviaOrdine(id) {
    ordineUpdate(id,{status:"inviato",inviatoIl:nowISO()});
    toast("Ordine inviato","success");
  }

  function confermOrdine(ordine) {
    const ricezioni = (ordine.items||[]).map(i=>({
      nome:i.nome, quantitaRicevuta:i.quantitaOrdinata,
      unitaMisura:i.unitaMisura, prezzoUnitario:i.prezzoUnitario,
      fornitore:ordine.fornitore, codiceLotto:null, scadeIl:null,
    }));
    confermRicezione(ordine.id, ricezioni);
    toast(`Stock aggiornato da ordine ${ordine.id.slice(-4)}!`,"success");
  }

  const STATUS_COLORS = {
    bozza:"#7A7168",inviato:"#C19A3E",
    ricevuto_parziale:"#2A4FA5",ricevuto:"#3D7A4A"
  };
  const STATUS_LABELS = {
    bozza:"Bozza",inviato:"Inviato",
    ricevuto_parziale:"Ricevuto parziale",ricevuto:"Ricevuto ✓"
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[{k:"ordini",l:`📋 Ordini (${ordini.length})`},{k:"giacenze",l:"📦 Giacenze Economato"}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
            background:tab===k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:t.bgCard,
            color:tab===k?"#fff":t.inkMuted,boxShadow:`0 1px 4px ${t.shadow}`,transition:"all 0.2s",
          }}>{l}</button>
        ))}
        {canEdit&&(
          <button onClick={()=>setShowForm(f=>!f)} style={{
            marginLeft:"auto",padding:"8px 18px",borderRadius:10,cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",
            fontFamily:"var(--mono)",fontSize:10,
          }}>+ Nuovo Ordine</button>
        )}
      </div>

      {/* Form nuovo ordine */}
      {showForm&&canEdit&&(
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>CREA ORDINE</div>
          <LuxInput value={ordineForm.fornitore} onChange={e=>setOrdineForm(p=>({...p,fornitore:e.target.value}))}
            placeholder="Nome fornitore" t={t} style={{marginBottom:12}}/>
          <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:8}}>ARTICOLI</div>
          {ordineForm.items.map((item,i)=>(
            <div key={item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${t.div}`}}>
              <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,flex:1}}>{item.nome}</span>
              <span className="mono" style={{fontSize:10,color:t.inkMuted}}>{item.quantitaOrdinata} {item.unitaMisura}</span>
              <span className="mono" style={{fontSize:10,color:t.gold}}>€{item.prezzoUnitario}/{item.unitaMisura}</span>
              <button onClick={()=>setOrdineForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))}
                style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:14}}>✕</button>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginTop:10}}>
            <AutocompleteInput value={newItem.nome} onChange={e=>setNewItem(p=>({...p,nome:e.target.value}))}
              onSelect={p=>{setNewItem(q=>({...q,nome:p.n,unit:p.u||q.unit}));}}
              placeholder="Articolo (autocomplete)" t={t}
              catalog={[...ECONOMO_CATALOG,...PRODUCT_CATALOG.filter(x=>x.macro==="economato")]} extraSuggestions={[]}/>
            <LuxInput value={newItem.qty} onChange={e=>setNewItem(p=>({...p,qty:e.target.value}))} type="number" placeholder="Qtà" t={t}/>
            <LuxSelect value={newItem.unit} onChange={e=>setNewItem(p=>({...p,unit:e.target.value}))} t={t}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </LuxSelect>
            <LuxInput value={newItem.prezzoUnit} onChange={e=>setNewItem(p=>({...p,prezzoUnit:e.target.value}))}
              type="number" placeholder="€/unità" t={t}/>
            <button onClick={addItemToForm} style={{
              padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",
              background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:10,
            }}>+ Item</button>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <Btn t={t} variant="gold" onClick={saveOrdine} disabled={!ordineForm.fornitore||!ordineForm.items.length}>
              💾 Salva in Bozza
            </Btn>
            <button onClick={()=>setShowForm(false)} style={{
              padding:"8px 16px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
              background:"none",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10,
            }}>Annulla</button>
          </div>
        </Card>
      )}

      {/* Lista ordini */}
      {tab==="ordini"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {ordini.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}>
              <div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic",marginBottom:8}}>Nessun ordine</div>
            </div>
          )}
          {ordini.map(ordine=>(
            <Card key={ordine.id} t={t} style={{padding:0}}>
              <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>{ordine.fornitore}</div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginTop:2}}>
                    {ordine.data} · {(ordine.items||[]).length} articoli
                    {ordine.inviatoIl&&` · Inviato ${fmtDate(ordine.inviatoIl)}`}
                  </div>
                </div>
                <span style={{
                  padding:"3px 10px",borderRadius:6,fontSize:9,fontFamily:"var(--mono)",
                  background:(STATUS_COLORS[ordine.status]||"#7A7168")+"22",
                  border:`1px solid ${(STATUS_COLORS[ordine.status]||"#7A7168")}44`,
                  color:STATUS_COLORS[ordine.status]||"#7A7168",
                }}>{STATUS_LABELS[ordine.status]||ordine.status}</span>
                {canEdit&&ordine.status==="bozza"&&(
                  <button onClick={()=>{if(editingOrdineId===ordine.id){setEditingOrdineId(null);}else{setEditingOrdineId(ordine.id);setEditOrdineItems([...(ordine.items||[])]);setNewEditItem({nome:'',qty:'',unit:'kg',prezzoUnit:''}); }}} style={{fontSize:9,padding:"5px 12px",borderRadius:8,border:"1px solid "+t.div,cursor:"pointer",background:editingOrdineId===ordine.id?t.gold+"20":"transparent",color:editingOrdineId===ordine.id?t.gold:t.inkMuted,fontFamily:"var(--mono)"}}>{editingOrdineId===ordine.id?"✓ Chiudi":"✏ Modifica"}</button>
                )}
                {canEdit&&ordine.status==="bozza"&&(
                  <Btn t={t} onClick={()=>inviaOrdine(ordine.id)} style={{fontSize:9,padding:"5px 12px"}}>Invia</Btn>
                )}
                {canEdit&&ordine.status==="inviato"&&(
                  <Btn t={t} variant="gold" onClick={()=>confermOrdine(ordine)} style={{fontSize:9,padding:"5px 12px"}}>
                    ✅ Conferma Ricezione → Stock
                  </Btn>
                )}
              </div>
              {(ordine.items||[]).length>0&&(
                <div style={{borderTop:`1px solid ${t.div}`}}>
                  {ordine.items.map((item,i)=>(
                    <div key={item.id||i} style={{padding:"8px 20px",display:"flex",gap:10,alignItems:"center",
                      borderBottom:i<ordine.items.length-1?`1px solid ${t.div}`:undefined}}>
                      <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,flex:1}}>{item.nome}</span>
                      <span className="mono" style={{fontSize:9,color:t.inkMuted}}>{item.quantitaOrdinata} {item.unitaMisura}</span>
                      <span className="mono" style={{fontSize:10,color:t.gold}}>€{(item.prezzoUnitario||0).toFixed(2)}/{item.unitaMisura}</span>
                    </div>
                  ))}
                  <div style={{padding:"8px 20px",display:"flex",justifyContent:"flex-end",borderTop:`1px solid ${t.div}`,background:t.bgAlt}}>
                    <span className="mono" style={{fontSize:10,color:t.gold}}>
                      Totale: €{(ordine.items.reduce((s,i)=>s+(i.prezzoUnitario||0)*(i.quantitaOrdinata||0),0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {editingOrdineId===ordine.id&&(
                <div style={{padding:"12px 20px",borderTop:`1px solid ${t.div}`,background:t.bgAlt,display:"flex",flexDirection:"column",gap:8}}>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>MODIFICA ARTICOLI</div>
                  {editOrdineItems.map((item,i)=>(
                    <div key={item.id||i} style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={item.nome} onChange={e=>{const a=[...editOrdineItems];a[i]={...a[i],nome:e.target.value};setEditOrdineItems(a);}} style={{flex:2,padding:"5px 8px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,outline:"none"}}/>
                      <input type="number" value={item.quantitaOrdinata} onChange={e=>{const a=[...editOrdineItems];a[i]={...a[i],quantitaOrdinata:parseFloat(e.target.value)||0};setEditOrdineItems(a);}} style={{width:60,padding:"5px 6px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:11,outline:"none"}}/>
                      <input type="number" value={item.prezzoUnitario||0} onChange={e=>{const a=[...editOrdineItems];a[i]={...a[i],prezzoUnitario:parseFloat(e.target.value)||0};setEditOrdineItems(a);}} placeholder="€" style={{width:60,padding:"5px 6px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.gold,fontFamily:"var(--mono)",fontSize:11,outline:"none"}}/>
                      <button onClick={()=>setEditOrdineItems(editOrdineItems.filter((_,j)=>j!==i))} style={{padding:"3px 8px",borderRadius:5,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontSize:12}}>✕</button>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:4}}>
                    <input value={newEditItem.nome} onChange={e=>setNewEditItem(p=>({...p,nome:e.target.value}))} placeholder="Nuovo articolo" style={{flex:2,padding:"5px 8px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,outline:"none"}}/>
                    <input type="number" value={newEditItem.qty} onChange={e=>setNewEditItem(p=>({...p,qty:e.target.value}))} placeholder="Qtà" style={{width:55,padding:"5px 6px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:11,outline:"none"}}/>
                    <input value={newEditItem.unit} onChange={e=>setNewEditItem(p=>({...p,unit:e.target.value}))} placeholder="un" style={{width:40,padding:"5px 4px",borderRadius:7,border:`1px solid ${t.div}`,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:11,outline:"none"}}/>
                    <button onClick={()=>{if(!newEditItem.nome||!newEditItem.qty)return;setEditOrdineItems(p=>[...p,{id:genId(),nome:newEditItem.nome,quantitaOrdinata:parseFloat(newEditItem.qty)||0,unitaMisura:newEditItem.unit,prezzoUnitario:0,quantitaRicevuta:null}]);setNewEditItem({nome:'',qty:'',unit:'kg',prezzoUnit:''}); }} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:9}}>+ Add</button>
                  </div>
                  <button onClick={()=>{ordineUpdate(ordine.id,{items:editOrdineItems});setEditingOrdineId(null);toast("Ordine aggiornato","success");}} style={{padding:"8px",borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10}}>💾 Salva modifiche</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Giacenze economato */}
      {tab==="giacenze"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{padding:"10px 14px",background:t.bgAlt,borderRadius:10,fontFamily:"var(--mono)",fontSize:9,color:t.inkFaint}}>
            ℹ I prezzi sono visibili SOLO in questa sezione · non compaiono negli altri reparti
          </div>
          {allItems().filter(x=>x.category==="economato"||x.location==="dry").map(item=>(
            <Card key={item.id} t={t} style={{padding:"12px 18px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{item.name}</div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginTop:2}}>
                    {item.quantity} {item.unit}
                    {item.lot&&` · Lotto: ${item.lot}`}
                    {item.expiresAt&&` · Scad. ${fmtDate(item.expiresAt)}`}
                  </div>
                </div>
                {item.prezzoUnitario&&(
                  <div style={{textAlign:"right"}}>
                    <div className="mono" style={{fontSize:12,color:t.gold,fontWeight:700}}>
                      €{(item.prezzoUnitario*item.quantity).toFixed(2)}
                    </div>
                    <div className="mono" style={{fontSize:8,color:t.inkFaint}}>€{item.prezzoUnitario}/{item.unit}</div>
                  </div>
                )}
              </div>
                {canEdit&&(
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:8}}>
                    <button onClick={()=>{const loc=item.location||"dry";const arr=(kitchen[loc]||[]).map((x:any)=>x.id===item.id?{...x,quantity:Math.max(0,(x.quantity||0)-1)}:x);updateLocation(loc,arr);}} style={{width:28,height:28,borderRadius:7,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,cursor:"pointer",fontFamily:"var(--mono)",fontSize:14}}>-</button>
                    <span className="mono" style={{minWidth:40,textAlign:"center",fontSize:12,color:t.ink}}>{item.quantity} {item.unit}</span>
                    <button onClick={()=>{const loc=item.location||"dry";const arr=(kitchen[loc]||[]).map((x:any)=>x.id===item.id?{...x,quantity:(x.quantity||0)+1}:x);updateLocation(loc,arr);}} style={{width:28,height:28,borderRadius:7,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,cursor:"pointer",fontFamily:"var(--mono)",fontSize:14}}>+</button>
                    <button onClick={()=>{const loc=item.location||"dry";const arr=(kitchen[loc]||[]).filter((x:any)=>x.id!==item.id);updateLocation(loc,arr);toast(item.name+" rimosso","success");}} style={{marginLeft:"auto",padding:"4px 10px",borderRadius:7,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:9}}>✕ Rimuovi</button>
                  </div>
                )}
            </Card>
          ))}
          {allItems().filter(x=>x.category==="economato"||x.location==="dry").length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint,fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic"}}>
              Nessuna giacenza — conferma la ricezione di un ordine per aggiornare lo stock
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SERVIZIO LIVE VIEW
   ════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   FILTER BAR — componente filtro universale per giacenze + prep
   ═══════════════════════════════════════════════════════ */
function FilterChip({ label, active, onClick, color, count, t }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 12px", borderRadius:20, border:`1px solid ${active?(color||t.accent):t.div}`,
      background:active?(color||t.accent)+"18":"transparent",
      color:active?(color||t.accent):t.inkMuted, cursor:"pointer",
      fontFamily:"var(--mono)", fontSize:10, letterSpacing:"0.04em",
      transition:"all 0.15s", display:"flex", alignItems:"center", gap:5,
      whiteSpace:"nowrap",
    }}>
      {label}
      {count!=null&&<span style={{
        background:active?(color||t.accent):t.inkFaint+"44",
        color:active?"#fff":t.inkMuted,
        borderRadius:10,padding:"1px 6px",fontSize:9,
      }}>{count}</span>}
    </button>
  );
}

function ActiveFiltersBar({ filters, onClear, t }) {
  const active = Object.entries(filters).filter(([,v])=>v&&v!=="all"&&v!=="tutti"&&v!=="tutte"&&v!=="");
  if(!active.length) return null;
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",flexWrap:"wrap"}}>
      <span style={{fontFamily:"var(--mono)",fontSize:9,color:t.inkFaint,letterSpacing:"0.08em"}}>FILTRI ATTIVI:</span>
      {active.map(([k,v])=>(
        <span key={k} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",
          borderRadius:12,background:t.accent+"20",border:`1px solid ${t.accent}44`,
          fontFamily:"var(--mono)",fontSize:9,color:t.accent}}>
          {v}
          <span onClick={()=>onClear(k)} style={{cursor:"pointer",opacity:0.7,fontSize:11,lineHeight:1}}>×</span>
        </span>
      ))}
      <button onClick={()=>onClear("_all")} style={{
        padding:"3px 10px",borderRadius:12,border:"none",cursor:"pointer",
        background:t.div,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9
      }}>Reset tutto</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SMART CALENDARIO — 14-day view con eventi da stock + prep
   ═══════════════════════════════════════════════════════ */
function SmartCalendario({ t }) {
  const { kitchen, allItems, addCalendarNote, removeCalendarNote } = useK();
  const toast = useToast();
  const [noteForm, setNoteForm] = useState({ open:false, date:"", testo:"", tipo:"note" });
  const [selectedDay, setSelectedDay] = useState(null);

  const today = new Date(); today.setHours(0,0,0,0);

  // Genera eventi automatici dalle giacenze
  const autoEvents = useMemo(() => {
    if(!kitchen) return [];
    const evts = [];
    const allStock = allItems ? allItems() : [];

    // 1. Stock in scadenza
    allStock.forEach(item => {
      if(!item.expiresAt) return;
      const exp = new Date(item.expiresAt); exp.setHours(0,0,0,0);
      const daysLeft = Math.round((exp - today) / 86400000);
      if(daysLeft > 7) return;
      evts.push({
        id:`exp_${item.id}`, date:exp,
        tipo: daysLeft <= 0 ? "scaduto" : daysLeft <= 1 ? "critico" : daysLeft <= 3 ? "urgente" : "avviso",
        icon: daysLeft <= 1 ? "⚠️" : "📅",
        titolo: item.name,
        sotto: `${item.quantity}${item.unit} · ${["freezer","fridge","dry","counter"].find(l=>(kitchen[l]||[]).some(x=>x.id===item.id))||"?"}`,
        categoria: "scadenza_stock",
        priority: daysLeft <= 0 ? 4 : daysLeft <= 1 ? 3 : daysLeft <= 3 ? 2 : 1,
      });
    });

    // 2. Preparazioni in scadenza
    (kitchen.preparazioni||[]).forEach(prep => {
      if(!prep.scadeIl) return;
      const exp = new Date(prep.scadeIl); exp.setHours(0,0,0,0);
      const daysLeft = Math.round((exp - today) / 86400000);
      if(daysLeft > 7) return;
      evts.push({
        id:`prep_exp_${prep.id}`, date:exp,
        tipo: daysLeft <= 0 ? "scaduto" : daysLeft <= 1 ? "critico" : "urgente",
        icon:"📋", titolo:`REPREP: ${prep.nome}`,
        sotto:`${prep.quantita}${prep.unitaMisura} · da rifare`,
        categoria:"scadenza_prep",
        priority: daysLeft <= 0 ? 4 : 3,
      });
    });

    // 3. Stock sotto par → ri-ordine
    allStock.forEach(item => {
      if(!item.parLevel || item.quantity >= item.parLevel) return;
      const shortage = item.parLevel - item.quantity;
      evts.push({
        id:`par_${item.id}`, date:today,
        tipo:"riordine", icon:"🛒",
        titolo:`Riordina: ${item.name}`,
        sotto:`${item.quantity}/${item.parLevel}${item.unit} · mancano ${shortage}${item.unit}`,
        categoria:"sotto_par", priority:2,
      });
    });

    // 4. Suggerisci reprep prep scadute entro 2gg — giorno prima
    (kitchen.preparazioni||[]).filter(p=>p.scadeIl&&p.status!=="smistata").forEach(prep => {
      const exp = new Date(prep.scadeIl); exp.setHours(0,0,0,0);
      const daysLeft = Math.round((exp - today) / 86400000);
      if(daysLeft < 1 || daysLeft > 5) return;
      const reprepDay = new Date(exp); reprepDay.setDate(reprepDay.getDate() - 1);
      if(reprepDay < today) return;
      evts.push({
        id:`reprep_sched_${prep.id}`, date:reprepDay,
        tipo:"pianifica", icon:"⏰",
        titolo:`Pianifica reprep: ${prep.nome}`,
        sotto:`Scade ${exp.toLocaleDateString("it-IT")} · preparare oggi`,
        categoria:"scheduling", priority:1,
      });
    });

    return evts;
  }, [kitchen, today]);

  // Giorni da mostrare (14gg)
  const days = useMemo(() => {
    return Array.from({length:14}, (_,i) => {
      const d = new Date(today); d.setDate(d.getDate()+i);
      return d;
    });
  }, []);

  function dateKey(d) { return d.toISOString().slice(0,10); }

  const eventsForDay = useCallback((day) => {
    const dk = dateKey(day);
    const auto = autoEvents.filter(e => dateKey(e.date)===dk);
    const manual = (kitchen?.calendarNotes||[]).filter(n=>n.date===dk);
    return [...auto, ...manual.map(n=>({...n, icon:"📝", categoria:"note", tipo:"note"}))];
  }, [autoEvents, kitchen]);

  const tipo2color = {
    scaduto:"#E85D5D", critico:"#C75B5B", urgente:"#C19A3E", avviso:"#5B8DD9",
    riordine:"#E85D5D", pianifica:"#5B9E6F", note:"#8A857D",
  };

  function addNote() {
    if(!noteForm.date||!noteForm.testo.trim()) { toast("Inserisci data e testo","error"); return; }
    addCalendarNote({ date:noteForm.date, testo:noteForm.testo.trim(), tipo:noteForm.tipo });
    setNoteForm({open:false,date:"",testo:"",tipo:"note"});
    toast("Nota aggiunta","success");
  }

  const selDay = selectedDay ? new Date(selectedDay) : null;
  selDay?.setHours(0,0,0,0);
  const selEvents = selDay ? eventsForDay(selDay) : [];

  // Conteggio urgenze totali
  const criticalCount = autoEvents.filter(e=>e.tipo==="critico"||e.tipo==="scaduto"||e.tipo==="riordine").length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:18,color:t.ink}}>
            📅 Calendario Smart
          </div>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.1em",marginTop:2}}>
            EVENTI AUTOMATICI DA GIACENZE + PREP · {autoEvents.length} alert attivi
          </div>
        </div>
        {criticalCount > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,
            background:tipo2color.critico+"20",border:`1px solid ${tipo2color.critico}44`}}>
            <span style={{fontSize:18}}>⚠️</span>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:tipo2color.critico,fontWeight:600}}>
              {criticalCount} CRITICI
            </span>
          </div>
        )}
        <button onClick={()=>setNoteForm(f=>({...f,open:true,date:dateKey(today)}))} style={{
          padding:"8px 16px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
          background:t.bgCard,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10,
        }}>+ Aggiungi nota</button>
      </div>

      {/* Grid 14 giorni */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
        {days.map(day => {
          const dk = dateKey(day);
          const evts = eventsForDay(day);
          const isToday = dk === dateKey(today);
          const isSelected = dk === selectedDay;
          const topPrio = evts.reduce((max,e)=>Math.max(max,e.priority||0),0);
          const borderColor = topPrio>=4?tipo2color.scaduto : topPrio>=3?tipo2color.critico : topPrio>=2?tipo2color.urgente : topPrio>=1?tipo2color.avviso : t.div;
          return (
            <div key={dk} onClick={()=>setSelectedDay(isSelected?null:dk)} style={{
              borderRadius:12, border:`1.5px solid ${isSelected?t.accent:evts.length?borderColor:t.div}`,
              background:isToday?t.accent+"0A":isSelected?t.accent+"10":t.bgCard,
              padding:"10px 10px 8px",cursor:evts.length||true?"pointer":"default",
              transition:"all 0.15s", minHeight:80,
              boxShadow:isSelected?`0 0 0 2px ${t.accent}44`:"none",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontFamily:"var(--mono)",fontSize:11,
                  color:isToday?t.accent:t.ink, fontWeight:isToday?700:400}}>
                  {day.toLocaleDateString("it-IT",{weekday:"short"}).toUpperCase()}
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:600,color:isToday?t.accent:t.inkSoft}}>
                  {day.getDate()}
                </div>
              </div>
              {evts.slice(0,3).map((e,i)=>(
                <div key={e.id||i} style={{
                  display:"flex",alignItems:"center",gap:4,marginBottom:2,
                }}>
                  <span style={{fontSize:10,flexShrink:0}}>{e.icon}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:8,color:tipo2color[e.tipo]||t.inkMuted,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
                    {e.titolo}
                  </span>
                </div>
              ))}
              {evts.length > 3 && (
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:t.inkFaint}}>+{evts.length-3} altri</div>
              )}
              {evts.length===0&&(
                <div style={{fontFamily:"var(--serif)",fontSize:10,color:t.inkGhost,fontStyle:"italic",textAlign:"center",paddingTop:6}}>—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedDay && selEvents.length > 0 && (
        <div style={{background:t.bgCard,borderRadius:14,border:`1px solid ${t.div}`,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${t.div}`,display:"flex",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink}}>
                {new Date(selectedDay).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{selEvents.length} EVENTI</div>
            </div>
            <button onClick={()=>setSelectedDay(null)} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
          </div>
          {selEvents.map((e,i)=>{
            const col = tipo2color[e.tipo]||t.inkMuted;
            return (
              <div key={e.id||i} style={{padding:"14px 20px",borderBottom:i<selEvents.length-1?`1px solid ${t.div}`:"none",
                display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:10,background:col+"20",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>
                  {e.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,fontWeight:500}}>
                    {e.titolo}
                  </div>
                  <div className="mono" style={{fontSize:10,color:t.inkMuted,marginTop:2}}>{e.sotto||e.testo}</div>
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <span style={{padding:"2px 10px",borderRadius:8,background:col+"20",
                      color:col,fontFamily:"var(--mono)",fontSize:9,border:`1px solid ${col}44`}}>
                      {e.tipo?.toUpperCase()||e.categoria?.toUpperCase()}
                    </span>
                  </div>
                </div>
                {e.categoria==="note" && (
                  <button onClick={()=>removeCalendarNote(e.id)} style={{
                    background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:16
                  }}>🗑</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note form */}
      {noteForm.open && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.6)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={e=>{if(e.target===e.currentTarget)setNoteForm(f=>({...f,open:false}));}}>
          <div style={{background:t.bgCard,borderRadius:16,padding:24,width:"100%",maxWidth:440,
            boxShadow:`0 20px 60px rgba(0,0,0,0.5)`,border:`1px solid ${t.div}`}}>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:16,color:t.ink,marginBottom:16}}>
              📝 Aggiungi nota al calendario
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <input type="date" value={noteForm.date} onChange={e=>setNoteForm(f=>({...f,date:e.target.value}))}
                style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}/>
              <select value={noteForm.tipo} onChange={e=>setNoteForm(f=>({...f,tipo:e.target.value}))}
                style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}>
                <option value="note">📝 Nota generica</option>
                <option value="evento">🎉 Evento/Servizio speciale</option>
                <option value="ordine">🛒 Ordine pianificato</option>
                <option value="pulizie">🧹 Pulizie / HACCP</option>
                <option value="reminder">⏰ Reminder</option>
              </select>
              <textarea value={noteForm.testo} onChange={e=>setNoteForm(f=>({...f,testo:e.target.value}))}
                placeholder="Testo della nota…" rows={3}
                style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:13,resize:"vertical"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setNoteForm(f=>({...f,open:false}))} style={{
                  flex:1,padding:"10px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
                  background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:11}}>Annulla</button>
                <button onClick={addNote} style={{
                  flex:2,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",
                  background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11,fontWeight:600}}>
                  ✓ Salva nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PIATTI MANAGER — gestione piatti con scaling stock + link app
   ═══════════════════════════════════════════════════════ */
const PIATTO_CATEGORIE = [
  {key:"antipasto",label:"Antipasto",icon:"🫕"},
  {key:"primo",label:"Primo",icon:"🍝"},
  {key:"secondo",label:"Secondo",icon:"🥩"},
  {key:"dessert",label:"Dessert",icon:"🍮"},
  {key:"buffet",label:"Buffet",icon:"🎪"},
  {key:"speciale",label:"Speciale",icon:"⭐"},
];

function PiattiManager({ t, copertiServizio=30 }) {
  const { kitchen, allItems, piattoAdd, piattoUpdate, piattoRemove, piattoToggleActive, setExternalAppUrl, stockAdd, removeItem, adjustItem, spesaV2Add } = useK();
  const toast = useToast();
  const piatti = kitchen?.piatti||[];
  const externalUrl = kitchen?.externalAppUrl||"";

  const [view, setView]           = useState("lista");   // lista | form | detail | forecast
  const [selPiatto, setSelPiatto] = useState(null);
  const [catFilter, setCatFilter] = useState("tutti");
  const [search, setSearch]       = useState("");
  const [editUrl, setEditUrl]     = useState(false);
  const [urlInput, setUrlInput]   = useState(externalUrl);
  const [forecastCoperti, setForecastCoperti] = useState(copertiServizio);

  // Form nuovo piatto
  const [form, setForm] = useState({
    nome:"", categoria:"antipasto", note:"",
    copertiBase:copertiServizio,
    ingredienti:[],
  });
  const [ingForm, setIngForm] = useState({nome:"",qty:"",unit:"pz",stockId:""});
  const [ingSearch, setIngSearch] = useState("");
  const [pickRecipe, setPickRecipe] = useState(false);

  const stockItems = allItems ? allItems() : [];

  const filtered = piatti.filter(p => {
    if(catFilter!=="tutti" && p.categoria!==catFilter) return false;
    if(search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Resolve stock item by ID or name ──────────────────────
  function resolveStock(ing) {
    if(ing.stockId) return stockItems.find(s=>s.id===ing.stockId)||null;
    return stockItems.find(s=>s.name.toLowerCase()===ing.nome.toLowerCase())||null;
  }

  // ── Calcola disponibilità + % utilizzo ───────────────────
  function calcPorzioni(piatto, coperti) {
    if(!piatto.ingredienti?.length) return null;
    const base = piatto.copertiBase||copertiServizio;
    const scaleFactor = coperti / base;
    let minPorzioni = Infinity;
    const details = piatto.ingredienti.map(ing => {
      const needed = ing.qty * scaleFactor;
      const si = resolveStock(ing);
      const inStock = si ? si.quantity : stockItems.filter(s=>s.name.toLowerCase().includes(ing.nome.toLowerCase())).reduce((s,x)=>s+x.quantity,0);
      const canMake = inStock > 0 && ing.qty > 0 ? Math.floor(inStock / (ing.qty / base)) : 0;
      minPorzioni = Math.min(minPorzioni, canMake);
      const pctUso = inStock > 0 ? Math.min(100, Math.round((needed / inStock) * 100)) : 0;
      // Quante porzioni posso fare con lo stock rimasto
      const porzioniPossibili = ing.qty > 0 ? Math.floor(inStock / (ing.qty / base)) : 999;
      return { nome:ing.nome, needed:needed.toFixed(2), unit:ing.unit, inStock:inStock.toFixed(2), ok:inStock>=needed, pctUso, canMake, porzioniPossibili };
    });
    return { details, porzioni:minPorzioni===Infinity?0:minPorzioni };
  }

  // ── Service log helpers ───────────────────────────────────
  function logService(piatto, coperti) {
    const storico = [...(piatto.storico||[]), { data:todayDate(), coperti:Number(coperti)||0, ts:nowISO() }];
    piattoUpdate(piatto.id, { storico });
    toast(`Servizio registrato: ${coperti} coperti`, "success");
  }

  // ── Consume stock for a service ───────────────────────────
  function consumeService(piatto, coperti) {
    if(!piatto.ingredienti?.length) { logService(piatto,coperti); return; }
    if(!confirm(`Scaricare ingredienti per ${coperti} coperti di "${piatto.nome}"?\nL'operazione aggiornerà le giacenze.`)) return;
    const base = piatto.copertiBase||copertiServizio;
    const sf = Number(coperti) / base;
    const consumed:string[] = [];
    piatto.ingredienti.forEach(ing => {
      const si = resolveStock(ing);
      if(si) {
        const qty = parseFloat((ing.qty * sf).toFixed(3));
        adjustItem(si.id, -qty);
        consumed.push(`${ing.nome} -${qty}${ing.unit}`);
      }
    });
    logService(piatto, coperti);
    if(consumed.length) toast(`Scaricato: ${consumed.join(", ")}`, "success");
  }

  // ── Stats from storico ───────────────────────────────────
  function calcStats(piatto) {
    const st = piatto.storico||[];
    if(!st.length) return null;
    const last7 = st.filter(s=>{
      const d = new Date(s.data); const now = new Date();
      return (now - d) <= 7*86400000;
    });
    const total7 = last7.reduce((a,b)=>a+(b.coperti||0),0);
    const avg7 = last7.length ? Math.round(total7 / last7.length) : 0;
    const last30 = st.filter(s=>{
      const d = new Date(s.data); const now = new Date();
      return (now - d) <= 30*86400000;
    });
    const total30 = last30.reduce((a,b)=>a+(b.coperti||0),0);
    // Estimate days of stock
    let minDays = Infinity;
    if(avg7 > 0 && piatto.ingredienti?.length) {
      piatto.ingredienti.forEach(ing => {
        const si = resolveStock(ing);
        const inStock = si ? si.quantity : 0;
        const dailyUse = (ing.qty / (piatto.copertiBase||copertiServizio)) * avg7;
        if(dailyUse > 0) minDays = Math.min(minDays, inStock / dailyUse);
      });
    }
    return { total7, avg7, total30, services7:last7.length, minDays: minDays === Infinity ? null : Math.floor(minDays), st };
  }

  function addIngrediente() {
    const nome = ingSearch.trim()||ingForm.nome.trim();
    if(!nome) return;
    const qty = parseFloat(ingForm.qty);
    if(!isFinite(qty)||qty<=0) { toast("Inserisci una quantità valida","error"); return; }
    const si = ingForm.stockId
      ? stockItems.find(s=>s.id===ingForm.stockId)
      : stockItems.find(s=>s.name.toLowerCase()===nome.toLowerCase());
    setForm(f=>({...f, ingredienti:[...f.ingredienti, {
      nome: si ? si.name : nome,
      qty,
      unit: ingForm.unit||(si?.unit)||"pz",
      stockId: si?.id||null,
    }]}));
    setIngForm({nome:"",qty:"",unit:"pz",stockId:""});
    setIngSearch("");
  }

  function submitPiatto() {
    if(!form.nome.trim()) { toast("Inserisci il nome del piatto","error"); return; }
    piattoAdd({ nome:form.nome.trim(), categoria:form.categoria,
      note:form.note, copertiBase:Number(form.copertiBase)||copertiServizio,
      ingredienti:form.ingredienti, ricette:form.ricette||[], storico:[] });
    toast(`${form.nome} aggiunto ai piatti ✓`,"success");
    setForm({nome:"",categoria:"antipasto",note:"",copertiBase:copertiServizio,ingredienti:[]});
    setView("lista");
  }

  function openInExternalApp(piatto) {
    if(!externalUrl) { toast("Configura l'URL dell'app esterna prima","error"); return; }
    const params = new URLSearchParams({
      piatto_id: piatto.id, piatto_nome: piatto.nome,
      coperti: String(copertiServizio),
      ingredienti: JSON.stringify(piatto.ingredienti),
    });
    const url = externalUrl.includes("?") ? `${externalUrl}&${params}` : `${externalUrl}?${params}`;
    window.open(url, "_blank");
  }

  const catLabels = {tutti:"Tutti",...Object.fromEntries(PIATTO_CATEGORIE.map(c=>[c.key,c.icon+" "+c.label]))};
  const catActive = piatti.filter(p=>p.attivo);

  // ── Semaforo autonomia per card lista ────────────────────
  function getStockSignal(piatto) {
    const calc = calcPorzioni(piatto, copertiServizio);
    if(!calc) return null;
    const stats = calcStats(piatto);
    const minDays = stats?.minDays;
    if(calc.porzioni >= copertiServizio) {
      return { col:"#3D7A4A", label: calc.porzioni >= copertiServizio*2 ? "✓✓" : "✓", title:`Stock OK — ${calc.porzioni} coperti possibili` };
    } else if(calc.porzioni > 0) {
      return { col:"#B8860B", label:`⚠ ${calc.porzioni}`, title:`Stock parziale — solo ${calc.porzioni} coperti` };
    } else {
      return { col:"#C04A4A", label:"✗", title:"Stock insufficiente" };
    }
  }

  // ── DETAIL / FORECAST VIEW ────────────────────────────────
  React.useEffect(()=>{
    if(view==="detail" && selPiatto && !piatti.find(p=>p.id===selPiatto)) setView("lista");
  },[view,selPiatto,piatti]);
  if(view==="detail" && selPiatto) {
    const piatto = piatti.find(p=>p.id===selPiatto)||null;
    if(!piatto) return null;
    const calc = calcPorzioni(piatto, forecastCoperti);
    const stats = calcStats(piatto);
    const cat = PIATTO_CATEGORIE.find(c=>c.key===piatto.categoria);
    const [logCop, setLogCop] = React.useState(String(copertiServizio));

    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {/* Back + header */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>{setView("lista");setSelPiatto(null);}} style={{
            padding:"8px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
            background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>← Lista</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:18,color:t.ink}}>
              {cat?.icon} {piatto.nome}
            </div>
            <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
              {cat?.label.toUpperCase()} · BASE {piatto.copertiBase||copertiServizio} COPERTI · {piatto.ingredienti?.length||0} INGREDIENTI
            </div>
          </div>
          <button onClick={()=>piattoToggleActive(piatto.id)} style={{
            padding:"6px 14px",borderRadius:20,border:`1px solid ${piatto.attivo?t.success:t.div}`,cursor:"pointer",
            background:piatto.attivo?t.success+"20":"transparent",
            color:piatto.attivo?t.success:t.inkFaint,fontFamily:"var(--mono)",fontSize:9}}>
            {piatto.attivo?"● ATTIVO":"○ OFF"}
          </button>
        </div>

        {/* Forecast slider */}
        <div style={{background:t.bgCard,borderRadius:14,padding:18,border:`1px solid ${t.div}`}}>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.12em",marginBottom:12}}>
            📊 PREVISIONE INGREDIENTI
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
            <span className="mono" style={{fontSize:10,color:t.inkMuted,minWidth:80}}>COPERTI:</span>
            <input type="range" min={1} max={200} value={forecastCoperti}
              onChange={e=>setForecastCoperti(Number(e.target.value))}
              style={{flex:1,accentColor:t.gold}}/>
            <input type="number" value={forecastCoperti} onChange={e=>setForecastCoperti(Number(e.target.value)||1)}
              min={1} style={{width:64,padding:"6px 10px",borderRadius:8,border:`1px solid ${t.div}`,
              background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:13,textAlign:"center"}}/>
          </div>
          {calc ? (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {/* Summary badge */}
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:4,
                background:calc.porzioni>=forecastCoperti?t.success+"15":calc.porzioni>0?t.warning+"15":t.danger+"15",
                border:`1px solid ${calc.porzioni>=forecastCoperti?t.success:calc.porzioni>0?t.warning:t.danger}33`}}>
                <span className="mono" style={{fontSize:11,fontWeight:600,
                  color:calc.porzioni>=forecastCoperti?t.success:calc.porzioni>0?t.warning:t.danger}}>
                  {calc.porzioni>=forecastCoperti
                    ? `✓ STOCK SUFFICIENTE PER ${forecastCoperti} COPERTI`
                    : calc.porzioni>0
                    ? `⚠ STOCK PER ${calc.porzioni} COPERTI (mancano ${forecastCoperti-calc.porzioni})`
                    : "✗ STOCK INSUFFICIENTE"}
                </span>
              </div>
              {/* Per-ingredient table */}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"var(--mono)",fontSize:10}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${t.div}`}}>
                      {["INGREDIENTE","NECESSARIO","IN STOCK","% USO","MAX PORZION.","STATO"].map(h=>(
                        <th key={h} style={{padding:"6px 8px",textAlign:"left",color:t.inkFaint,fontWeight:400,letterSpacing:"0.08em",fontSize:9}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calc.details.map((d,i)=>{
                      const barW = Math.min(100, d.pctUso);
                      const col = d.ok ? t.success : d.pctUso>80 ? t.warning : t.danger;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${t.div}44`}}>
                          <td style={{padding:"8px",color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11}}>{d.nome}</td>
                          <td style={{padding:"8px",color:t.inkMuted}}>{d.needed} {d.unit}</td>
                          <td style={{padding:"8px",color:d.ok?t.success:t.danger,fontWeight:600}}>{d.inStock} {d.unit}</td>
                          <td style={{padding:"8px",minWidth:80}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{flex:1,height:4,borderRadius:2,background:t.div,overflow:"hidden"}}>
                                <div style={{width:`${barW}%`,height:"100%",background:col,borderRadius:2,transition:"width 0.3s"}}/>
                              </div>
                              <span style={{color:col,minWidth:30,textAlign:"right"}}>{d.pctUso}%</span>
                            </div>
                          </td>
                          <td style={{padding:"8px",textAlign:"center"}}>
                            <span className="mono" style={{
                              fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:5,
                              background:d.porzioniPossibili>=forecastCoperti?t.success+"18":d.porzioniPossibili>0?t.warning+"18":t.danger+"18",
                              color:d.porzioniPossibili>=forecastCoperti?t.success:d.porzioniPossibili>0?t.warning:t.danger,
                            }}>{d.porzioniPossibili>=999?"∞":d.porzioniPossibili}</span>
                          </td>
                          <td style={{padding:"8px",color:d.ok?t.success:t.danger,fontSize:12}}>
                            {d.ok?"✓":
                              <button onClick={()=>{spesaV2Add(d.nome,String(Math.ceil(parseFloat(d.needed)-parseFloat(d.inStock))),d.unit,"alimenti","giornaliero","Da PiattiManager");toast(`${d.nome} → lista spesa`,"success");}}
                                style={{padding:"3px 8px",borderRadius:6,border:"none",cursor:"pointer",background:t.danger+"22",color:t.danger,fontFamily:"var(--mono)",fontSize:8}}>
                                ✗ +spesa
                              </button>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Autonomia */}
              {stats?.minDays!=null && (
                <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:4,textAlign:"right"}}>
                  ⏱ AUTONOMIA STIMATA: <span style={{color:stats.minDays<=3?t.danger:stats.minDays<=7?t.warning:t.success,fontWeight:600}}>{stats.minDays} GIORNI</span>
                  {stats.minDays<=3&&" — RIORDINA ORA"}
                </div>
              )}
            </div>
          ) : (
            <div style={{color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12}}>
              Aggiungi ingredienti per vedere le previsioni.
            </div>
          )}
        </div>

        {/* Storico servizi */}
        <div style={{background:t.bgCard,borderRadius:14,padding:18,border:`1px solid ${t.div}`}}>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.12em",marginBottom:12}}>
            📈 STORICO & STATISTICHE
          </div>
          {stats ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              {[
                {l:"COPERTI 7GG",v:stats.total7,col:t.ink},
                {l:"MEDIA GIORN.",v:stats.avg7,col:t.gold},
                {l:"SERVIZI 7GG",v:stats.services7,col:t.secondary},
                {l:"COPERTI 30GG",v:stats.total30,col:t.inkMuted},
                {l:"AUTONOMIA",v:stats.minDays!=null?`${stats.minDays}gg`:"—",col:stats.minDays!=null&&stats.minDays<=3?t.danger:t.success},
              ].map(({l,v,col})=>(
                <div key={l} style={{background:t.bgAlt,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.div}`}}>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:col}}>{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,marginBottom:14}}>
              Nessun servizio registrato ancora.
            </div>
          )}
          {/* Log service */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div className="mono" style={{fontSize:9,color:t.inkMuted,minWidth:120}}>REGISTRA SERVIZIO:</div>
            <input type="number" value={logCop} onChange={e=>setLogCop(e.target.value)}
              min={1} placeholder="Coperti" style={{width:80,padding:"8px 12px",borderRadius:8,
              border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}/>
            <button onClick={()=>consumeService(piatto, logCop)} style={{
              padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
              color:"#fff",fontFamily:"var(--mono)",fontSize:10,fontWeight:600}}>
              ✓ Log
            </button>
          </div>
          {/* Mini chart — last 10 services */}
          {stats && stats.st.length>0 && (
            <div style={{marginTop:14}}>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>ULTIMI SERVIZI</div>
              <div style={{display:"flex",gap:3,alignItems:"flex-end",height:48}}>
                {[...stats.st].slice(-14).map((s,i)=>{
                  const max = Math.max(...stats.st.slice(-14).map(x=>x.coperti||0))||1;
                  const h = Math.max(4, ((s.coperti||0)/max)*48);
                  return (
                    <div key={i} title={`${s.data}: ${s.coperti} cop.`} style={{
                      flex:1,height:h,borderRadius:"2px 2px 0 0",
                      background:`linear-gradient(180deg,${t.gold},${t.goldBright})`,
                      opacity:0.7+(i/14)*0.3,cursor:"pointer",minWidth:6}}/>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ingredienti del piatto */}
        <div style={{background:t.bgCard,borderRadius:14,padding:18,border:`1px solid ${t.div}`}}>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.12em",marginBottom:10}}>
            🧪 INGREDIENTI (per {piatto.copertiBase||copertiServizio} coperti base)
          </div>
          {(piatto.ingredienti||[]).map((ing,i)=>{
            const si = resolveStock(ing);
            const pct = si && si.quantity>0 ? Math.min(100,Math.round((ing.qty/si.quantity)*100)) : null;
            return (
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",
                marginBottom:4,borderRadius:8,background:t.bgAlt,border:`1px solid ${t.div}`}}>
                <span style={{flex:1,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{ing.nome}</span>
                <span className="mono" style={{fontSize:10,color:t.gold}}>{ing.qty} {ing.unit}</span>
                {si && <span className="mono" style={{fontSize:9,color:t.success}}>stock:{si.quantity.toFixed(1)}</span>}
                {pct!=null && (
                  <span className="mono" style={{
                    fontSize:9,padding:"2px 6px",borderRadius:4,
                    background:pct>80?t.danger+"20":pct>50?t.warning+"20":t.success+"20",
                    color:pct>80?t.danger:pct>50?t.warning:t.success}}>
                    {pct}% uso
                  </span>
                )}
                {!si && <span className="mono" style={{fontSize:9,color:t.inkFaint}}>—</span>}
              </div>
            );
          })}
          {!(piatto.ingredienti?.length) && (
            <div style={{color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12}}>Nessun ingrediente.</div>
          )}
        </div>

        {(piatto.ricette||[]).length>0 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {piatto.ricette.map(r=>(
              <a key={r.id} href={BRIDGE.urls.recipe(r.id)} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${t.gold}55`,
                background:t.goldFaint,color:t.gold,fontFamily:"var(--mono)",fontSize:10,textDecoration:"none"}}>📖 {r.name}</a>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8}}>
          {externalUrl && !(piatto.ricette||[]).length && (
            <button onClick={()=>openInExternalApp(piatto)} style={{
              flex:1,padding:"10px",borderRadius:10,border:`1px solid ${t.secondary}44`,cursor:"pointer",
              background:t.secondary+"10",color:t.secondary,fontFamily:"var(--mono)",fontSize:10}}>
              🔗 Apri nell'app
            </button>
          )}
          <button onClick={()=>{if(confirm(`Eliminare "${piatto.nome}"?`)){piattoRemove(piatto.id);setView("lista");}}} style={{
            padding:"10px 14px",borderRadius:10,border:`1px solid ${t.danger}33`,cursor:"pointer",
            background:t.danger+"10",color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>🗑</button>
        </div>
      </div>
    );
  }

  // ── FORM NUOVO PIATTO ─────────────────────────────────────
  if(view==="form") {
    const stockSuggestions = stockItems.filter(s=>
      ingSearch.length>0 && s.name.toLowerCase().includes(ingSearch.toLowerCase())
    ).slice(0,8);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setView("lista")} style={{
            padding:"8px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
            background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>← Lista</button>
          <div className="mono" style={{fontSize:10,color:t.inkFaint,letterSpacing:"0.1em"}}>NUOVO PIATTO</div>
        </div>

        <div style={{background:t.bgCard,borderRadius:14,border:`1px solid ${t.div}`,padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:6}}>NOME PIATTO</div>
              <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
                placeholder="es. Risotto al tartufo" style={{
                width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:6}}>CATEGORIA</div>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={{
                width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}>
                {PIATTO_CATEGORIE.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:6}}>COPERTI BASE</div>
              <input type="number" value={form.copertiBase} onChange={e=>setForm(f=>({...f,copertiBase:e.target.value}))}
                min={1} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:6}}>NOTE CHEF</div>
              <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                placeholder="Tecniche, varianti…" style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* Ingredienti da giacenza */}
          <div>
            <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>
              INGREDIENTI DA GIACENZA ({form.ingredienti.length}) — per {form.copertiBase||copertiServizio} coperti base
            </div>
            {BRIDGE?.recipes?.length>0 && (
              <button onClick={()=>setPickRecipe(true)} style={{marginBottom:8,padding:"8px 14px",borderRadius:8,border:`1px dashed ${t.gold}`,cursor:"pointer",
                background:t.goldFaint,color:t.gold,fontFamily:"var(--mono)",fontSize:10}}>📖 Aggiungi da ricettario</button>
            )}
            {(form.ricette||[]).length>0 && (
              <div className="mono" style={{fontSize:9,color:t.inkMuted,marginBottom:8}}>Ricette collegate: {(form.ricette||[]).map(r=>r.name).join(" · ")}</div>
            )}
            {pickRecipe && <RecipePickerKP t={t} onClose={()=>setPickRecipe(false)} onPick={(r,dose)=>{
              const add = (r.ingredients||[]).filter(i=>i.quantity!=null).map(i=>{
                const si = stockItems.find(s=>s.name.toLowerCase()===i.name.toLowerCase());
                return { nome: si?si.name:i.name, qty: Math.round(i.quantity*dose*100)/100, unit: i.unit||"g", stockId: si?.id||null };
              });
              setForm(f=>({...f, nome: f.nome || r.name, ingredienti:[...f.ingredienti, ...add], ricette:[...(f.ricette||[]), {id:r.id, name:r.name, dose}]}));
              setPickRecipe(false);
              toast(`${add.length} ingredienti da «${r.name}»`,"success");
            }}/>}
            {form.ingredienti.map((ing,i)=>{
              const si = ing.stockId ? stockItems.find(s=>s.id===ing.stockId) : null;
              const pct = si && si.quantity>0 ? Math.min(100,Math.round((ing.qty/si.quantity)*100)) : null;
              return (
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",
                  marginBottom:4,borderRadius:8,background:t.bgAlt,border:`1px solid ${t.div}`}}>
                  <span style={{flex:1,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{ing.nome}</span>
                  <span className="mono" style={{fontSize:10,color:t.gold}}>{ing.qty} {ing.unit}</span>
                  {si && <span className="mono" style={{fontSize:9,color:t.success}}>✓ stock</span>}
                  {pct!=null && (
                    <span className="mono" style={{fontSize:9,padding:"2px 5px",borderRadius:4,
                      background:pct>80?t.danger+"20":pct>50?t.warning+"20":t.success+"20",
                      color:pct>80?t.danger:pct>50?t.warning:t.success}}>
                      {pct}%
                    </span>
                  )}
                  <button onClick={()=>setForm(f=>({...f,ingredienti:f.ingredienti.filter((_,j)=>j!==i)}))}
                    style={{background:"none",border:"none",cursor:"pointer",color:t.danger,fontSize:14}}>✕</button>
                </div>
              );
            })}

            {/* Ingredient search from stock */}
            <div style={{position:"relative",marginTop:8}}>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>CERCA DA GIACENZA:</div>
              <div style={{display:"flex",gap:8}}>
                <div style={{position:"relative",flex:2}}>
                  <input value={ingSearch} onChange={e=>{setIngSearch(e.target.value);setIngForm(f=>({...f,nome:e.target.value,stockId:""}));}}
                    placeholder="Cerca in giacenza o digita nome…" style={{
                    width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                    background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,boxSizing:"border-box"}}/>
                  {ingSearch.length>0 && stockSuggestions.length>0 && (
                    <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,
                      background:t.bgCard,border:`1px solid ${t.div}`,borderRadius:10,
                      boxShadow:"0 8px 24px rgba(0,0,0,0.3)",overflow:"hidden",maxHeight:200,overflowY:"auto"}}>
                      {stockSuggestions.map(s=>(
                        <div key={s.id} onClick={()=>{
                          setIngSearch(s.name);
                          setIngForm(f=>({...f,nome:s.name,unit:s.unit||"pz",stockId:s.id}));
                        }} style={{padding:"10px 14px",cursor:"pointer",
                          display:"flex",justifyContent:"space-between",alignItems:"center",
                          borderBottom:`1px solid ${t.div}44`}}
                          onMouseEnter={e=>e.currentTarget.style.background=t.bgAlt}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{s.name}</span>
                          <span className="mono" style={{fontSize:9,color:t.gold}}>{s.quantity} {s.unit} · {s.location}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" value={ingForm.qty} onChange={e=>setIngForm(f=>({...f,qty:e.target.value}))}
                  placeholder="Qtà" min="0.01" step="0.01" style={{width:72,padding:"10px 12px",borderRadius:8,
                  border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}/>
                <select value={ingForm.unit} onChange={e=>setIngForm(f=>({...f,unit:e.target.value}))}
                  style={{width:68,padding:"10px 8px",borderRadius:8,border:`1px solid ${t.div}`,
                  background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11}}>
                  {["pz","kg","g","l","ml","vasch","cl","dl","hg"].map(u=><option key={u}>{u}</option>)}
                </select>
                <button onClick={addIngrediente} style={{padding:"10px 14px",borderRadius:8,border:"none",cursor:"pointer",
                  background:t.success+"22",color:t.success,fontFamily:"var(--mono)",fontSize:13,fontWeight:600}}>+</button>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setView("lista")} style={{flex:1,padding:"12px",borderRadius:10,
              border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",
              color:t.inkMuted,fontFamily:"var(--mono)",fontSize:11}}>Annulla</button>
            <button onClick={submitPiatto} style={{flex:2,padding:"12px",borderRadius:10,
              border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
              color:"#fff",fontFamily:"var(--mono)",fontSize:12,fontWeight:600}}>
              ✓ Salva Piatto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA PIATTI ──────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:17,color:t.ink}}>
            🍽️ Piatti in Carta
          </div>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,letterSpacing:"0.1em",marginTop:2}}>
            {catActive.length} ATTIVI · {piatti.length} TOTALI · {copertiServizio} COPERTI SERVIZIO
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setEditUrl(true)} style={{
            padding:"8px 14px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
            background:t.bgCard,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>
            🔗 App esterna
          </button>
          <button onClick={()=>setView("form")} style={{
            padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
            color:"#fff",fontFamily:"var(--mono)",fontSize:10,fontWeight:600}}>
            + Nuovo piatto
          </button>
        </div>
      </div>

      {/* Config external URL */}
      {editUrl && (
        <div style={{background:t.bgCard,borderRadius:12,padding:16,border:`1px solid ${t.div}`}}>
          <div className="mono" style={{fontSize:9,letterSpacing:"0.1em",color:t.inkFaint,marginBottom:10}}>
            URL APP ESTERNA — riceverà parametri: piatto_id, piatto_nome, coperti, ingredienti
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
              placeholder="https://tuaapp.com/servizio" style={{
              flex:1,padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
              background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:12}}/>
            <button onClick={()=>{setExternalAppUrl(urlInput);setEditUrl(false);toast("URL salvato","success");}} style={{
              padding:"10px 18px",borderRadius:8,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
              color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>✓</button>
            <button onClick={()=>setEditUrl(false)} style={{
              padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
              background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:11}}>✕</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca piatto…"
          style={{flex:1,minWidth:160,padding:"8px 14px",borderRadius:20,border:`1px solid ${t.div}`,
          background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12}}/>
        {["tutti",...PIATTO_CATEGORIE.map(c=>c.key)].map(cat=>(
          <FilterChip key={cat} label={catLabels[cat]||cat} active={catFilter===cat}
            onClick={()=>setCatFilter(cat)} t={t}
            count={cat==="tutti"?piatti.length:piatti.filter(p=>p.categoria===cat).length}/>
        ))}
      </div>

      {/* Cards */}
      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",fontFamily:"var(--serif)",
          fontStyle:"italic",color:t.inkFaint,fontSize:14}}>
          Nessun piatto in carta. Aggiungine uno!
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
          {filtered.map(piatto => {
            const calc = calcPorzioni(piatto, copertiServizio);
            const cat = PIATTO_CATEGORIE.find(c=>c.key===piatto.categoria);
            const hasStock = calc && calc.porzioni > 0;
            const stockOk = calc && calc.porzioni >= copertiServizio;
            const stats = calcStats(piatto);
            return (
              <div key={piatto.id} onClick={()=>{setSelPiatto(piatto.id);setForecastCoperti(copertiServizio);setView("detail");}}
                style={{
                  background:t.bgCard, borderRadius:14, cursor:"pointer",
                  border:`1.5px solid ${piatto.attivo ? (stockOk?t.success:t.warning)+"44" : t.div}`,
                  overflow:"hidden", transition:"all 0.2s",
                  opacity:piatto.attivo?1:0.6,
                }}>
                <div style={{height:3,background:piatto.attivo?(stockOk?t.success:t.warning):t.div}}/>
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink,fontWeight:500}}>
                        {cat?.icon} {piatto.nome}
                      </div>
                      <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
                        {cat?.label.toUpperCase()} · {piatto.ingredienti?.length||0} ING.
                        {stats&&stats.total7>0 && ` · ${stats.total7} cop./7gg`}
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();piattoToggleActive(piatto.id);}} style={{
                      padding:"4px 10px",borderRadius:20,border:`1px solid ${piatto.attivo?t.success:t.div}`,
                      cursor:"pointer",background:piatto.attivo?t.success+"20":"transparent",
                      color:piatto.attivo?t.success:t.inkFaint,fontFamily:"var(--mono)",fontSize:9}}>
                      {piatto.attivo?"● ATTIVO":"○ OFF"}
                    </button>
                  </div>

                  {/* Stock indicator */}
                  {calc && (
                    <div style={{padding:"8px 12px",borderRadius:8,
                      background:stockOk?t.success+"12":hasStock?t.warning+"12":t.danger+"12",
                      border:`1px solid ${stockOk?t.success:hasStock?t.warning:t.danger}22`,
                      marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span className="mono" style={{fontSize:9,color:stockOk?t.success:hasStock?t.warning:t.danger}}>
                          {stockOk?"✓ STOCK OK":hasStock?`⚠ ${calc.porzioni} PORZ.`:"✗ INSUFFICIENTE"}
                        </span>
                        {stats?.minDays!=null && (
                          <span className="mono" style={{fontSize:8,color:stats.minDays<=3?t.danger:stats.minDays<=7?t.warning:t.inkFaint}}>
                            ⏱ {stats.minDays}gg
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mono" style={{fontSize:8,color:t.gold,letterSpacing:"0.08em"}}>
                    → Tocca per dettagli & previsione
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI COMMAND CENTER — audio + immagine + testo con checkout
   ═══════════════════════════════════════════════════════ */
const AI_CMD_SYSTEM = `Sei il sistema AI di Kitchen Pro, un gestionale professionale per cucine di alto livello.
Analizza l'input (testo, audio trascritto, o documento) e estrai comandi strutturati per la gestione cucina.

REGOLA CRITICA: Se l'input menziona PIÙ prodotti o ingredienti (es. "3 uova e 2 kg di farina", "togli il burro e aggiungi 5 limoni"), devi creare UN COMANDO SEPARATO per OGNI prodotto. MAI accorpare più prodotti in un solo comando.

Esempi:
- Input: "3 uova e 2 kg di farina in frigo" → 2 comandi: stock_aggiungi per "uova" (qty:3) + stock_aggiungi per "farina" (qty:2,unit:"kg")
- Input: "aggiungi 5 ostriche e 3 aragoste" → 2 comandi separati
- Input: "prepara 2 kg di fondo bruno e 500g di salsa béarnaise" → 2 comandi prep_aggiungi separati

Rispondi SOLO in JSON valido (nessun testo fuori dal JSON):
{
  "riassunto": "Breve descrizione di cosa hai capito (max 2 righe)",
  "comandi": [
    {
      "id": "cmd_1",
      "tipo": "stock_aggiungi" | "stock_rimuovi" | "stock_aggiusta" | "prep_aggiungi" | "prep_status" | "spesa_aggiungi" | "piatto_aggiungi",
      "priorita": "alta" | "media" | "bassa",
      "dati": {
        "nome": "nome del singolo prodotto",
        "quantita": 1,
        "unit": "pz|kg|g|l|ml|vasch",
        "location": "fridge|freezer|dry|counter",
        "categoria": "categoria prodotto",
        "scadenza_giorni": null,
        "reparto": "antipasti|primi|secondi|pasticceria|colazioni|buffet|eventi",
        "turno": "mattina|pomeriggio|sera",
        "note": ""
      },
      "nota": "Spiegazione umana del comando"
    }
  ]
}

IMPORTANTE: "location" default = "fridge". "unit" default = "pz". Ogni comando ha UN SOLO prodotto nel campo "nome".`;

function AICommandCenter({ t, onClose }) {
  const { stockAdd, prepAdd, spesaV2Add, adjustItem, removeItem, piattoAdd, allItems } = useK();
  const toast = useToast();

  const [tab, setTab] = useState("testo");
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState("input"); // input | processing | checkout | done
  const [result, setResult] = useState(null);
  const [sel, setSel] = useState({});
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null);
  const fileRef = useRef(null);

  // Speech recognition
  const speech = useSpeech(transcript => setText(p => p ? p + " " + transcript : transcript));

  async function process() {
    setStep("processing"); setError(null);
    try {
      let content;
      if(files.length > 0) {
        const parts = files.map(f=>({
          type:"image", source:{type:"base64",media_type:f.mimeType,data:f.base64}
        }));
        if(text.trim()) parts.push({type:"text",text:text.trim()});
        else parts.push({type:"text",text:"Analizza questa immagine ed estrai comandi cucina."});
        content = { userMessages: parts };
      } else {
        content = { userContext: text.trim()||"Nessun input ricevuto" };
      }
      const res = await callAI({
        systemPrompt: AI_CMD_SYSTEM,
        ...content,
        maxTokens:2048, expectJSON:true, noCache:true,
      });
      if(!res?.comandi?.length) {
        setError("Nessun comando estratto. Prova con un input più dettagliato.");
        setStep("input"); return;
      }
      const initSel = {};
      res.comandi.forEach(c => { initSel[c.id]=true; });
      setResult(res);
      setSel(initSel);
      setStep("checkout");
    } catch(e) {
      setError("Errore AI: "+(e.message||"sconosciuto"));
      setStep("input");
    }
  }

  function applyCommands() {
    let counts = {stock:0, prep:0, spesa:0, piatto:0, altro:0};
    const allStock = allItems ? allItems() : [];
    (result?.comandi||[]).filter(c=>sel[c.id]).forEach(cmd => {
      const d = cmd.dati||{};
      const scadeIso = d.scadenza_giorni ? new Date(Date.now()+d.scadenza_giorni*86400000).toISOString() : null;
      switch(cmd.tipo) {
        case "stock_aggiungi":
          stockAdd({name:d.nome,quantity:Number(d.quantita)||1,unit:d.unit||"pz",
            location:d.location||"fridge",category:d.categoria||"altro",
            expiresAt:scadeIso,insertedDate:todayDate()});
          counts.stock++; break;
        case "stock_rimuovi": {
          const m=allStock.find(s=>s.name.toLowerCase().includes((d.nome||"").toLowerCase()));
          if(m){removeItem(m.id);counts.stock++;} break;
        }
        case "stock_aggiusta": {
          const m=allStock.find(s=>s.name.toLowerCase().includes((d.nome||"").toLowerCase()));
          if(m){adjustItem(m.id,Number(d.quantita)||0);counts.stock++;} break;
        }
        case "prep_aggiungi":
          prepAdd(d.nome,Number(d.quantita)||1,d.unit||"pz",
            d.categoria||"antipasti",d.reparto||"cucina_calda",d.turno||"mattina",
            d.note||"",scadeIso);
          counts.prep++; break;
        case "spesa_aggiungi":
          spesaV2Add(d.nome,Number(d.quantita)||1,d.unit||"pz",d.tipologia||"alimenti","giornaliero","");
          counts.spesa++; break;
        case "piatto_aggiungi":
          piattoAdd({nome:d.nome,categoria:d.categoria||"secondo",ingredienti:d.ingredienti||[]});
          counts.piatto++; break;
        default: counts.altro++; break;
      }
    });
    const parts = [];
    if(counts.stock) parts.push(`${counts.stock} stock`);
    if(counts.prep) parts.push(`${counts.prep} prep`);
    if(counts.spesa) parts.push(`${counts.spesa} spesa`);
    if(counts.piatto) parts.push(`${counts.piatto} piatti`);
    setApplied(counts);
    setStep("done");
    toast(`✅ AI: ${parts.join(" · ")} applicati`,"success");
  }

  const tipo2label = {
    stock_aggiungi:"➕ Aggiungi stock", stock_rimuovi:"➖ Rimuovi stock",
    stock_aggiusta:"🔧 Aggiusta qty", prep_aggiungi:"📋 Prep",
    prep_status:"🔄 Status prep", spesa_aggiungi:"🛒 Lista spesa",
    piatto_aggiungi:"🍽️ Nuovo piatto",
  };
  const tipo2color = {
    stock_aggiungi:t.success, stock_rimuovi:t.danger, stock_aggiusta:t.warning,
    prep_aggiungi:t.secondary, spesa_aggiungi:"#5A7A9A", piatto_aggiungi:t.gold,
  };
  const prio2badge = {alta:{bg:t.danger+"20",col:t.danger,l:"ALTA"},
    media:{bg:t.warning+"20",col:t.warning,l:"MEDIA"},
    bassa:{bg:t.success+"20",col:t.success,l:"BASSA"}};

  return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.75)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:20,width:"100%",maxWidth:700,maxHeight:"92vh",
        overflow:"hidden",display:"flex",flexDirection:"column",
        boxShadow:`0 24px 80px rgba(0,0,0,0.6),0 0 0 1px ${t.div}`}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${t.div}`,flexShrink:0,
          background:`linear-gradient(135deg,${t.accent}10,${t.bgCard})`,
          display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:44,height:44,borderRadius:14,
            background:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--serif)",fontSize:17,fontStyle:"italic",color:t.ink}}>
              AI Command Center
            </div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.12em",marginTop:2}}>
              AUDIO · IMMAGINE · TESTO → COMANDI CON CHECKOUT
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {["input","checkout","done"].map((s,i)=>(
              <React.Fragment key={s}>
                <div style={{width:26,height:26,borderRadius:"50%",display:"flex",
                  alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:9,
                  background:step===s||step==="processing"&&s==="input"?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:t.bgAlt,
                  color:step===s||step==="processing"&&s==="input"?"#fff":t.inkFaint,
                  border:step===s?"none":`1px solid ${t.div}`}}>
                  {step==="processing"&&s==="input"?"⏳":i+1}
                </div>
                {i<2&&<div style={{width:14,height:1,background:t.div}}/>}
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            color:t.inkFaint,fontSize:22,lineHeight:1}}>×</button>
        </div>

        <div style={{flex:1,overflow:"auto",padding:24}}>

          {/* INPUT STEP */}
          {(step==="input"||step==="processing") && (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              {/* Tab selector */}
              <div style={{display:"flex",gap:4,padding:4,background:t.bgAlt,borderRadius:12,width:"fit-content"}}>
                {[{k:"testo",l:"📝 Testo"},{k:"audio",l:"🎙 Voce"},{k:"foto",l:"📷 Immagine"}].map(tb=>(
                  <button key={tb.k} onClick={()=>setTab(tb.k)} style={{
                    padding:"8px 18px",borderRadius:9,border:"none",cursor:"pointer",
                    background:tab===tb.k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:"transparent",
                    color:tab===tb.k?"#fff":t.inkMuted,fontFamily:"var(--mono)",fontSize:10,transition:"all 0.2s"}}>
                    {tb.l}
                  </button>
                ))}
              </div>

              {/* Text */}
              {tab==="testo" && (
                <div>
                  <div className="mono" style={{fontSize:9,color:t.inkFaint,marginBottom:8}}>
                    INSERISCI I COMANDI — es: "aggiungi 5kg di filetto in frigo, crea prep per demi-glace 2L da fare domani mattina"
                  </div>
                  <textarea value={text} onChange={e=>setText(e.target.value)}
                    placeholder={`Esempi:\n• "Ricevuto 10kg petto pollo, 5kg branzino da mettere in frigo"\n• "Aggiungi preparazione: bisque gamberi 3 litri per domani"\n• "Rimuovi le seppie, sono scadute. Aggiungi 2kg gamberetti"\n• "Crea lista spesa: burro 3kg, uova 60pz, panna 5l"`}
                    rows={8} style={{width:"100%",padding:"14px",borderRadius:12,
                    border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,
                    fontFamily:"var(--serif)",fontSize:13,resize:"vertical",lineHeight:1.6}}/>
                </div>
              )}

              {/* Audio */}
              {tab==="audio" && (
                <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center",padding:"20px 0"}}>
                  <div style={{width:80,height:80,borderRadius:"50%",
                    background:speech.listening?`linear-gradient(135deg,${t.danger},${t.accentDeep})`:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,cursor:"pointer",
                    boxShadow:speech.listening?`0 0 0 8px ${t.danger}33,0 0 0 16px ${t.danger}11`:`0 8px 32px ${t.accent}44`,
                    transition:"all 0.3s", animation:speech.listening?"pulse 1.5s ease-in-out infinite":"none"}}
                    onClick={speech.listening?speech.stop:speech.start}>
                    {speech.listening?"🔴":"🎙"}
                  </div>
                  <div className="mono" style={{fontSize:10,color:speech.listening?t.danger:t.inkFaint,
                    letterSpacing:"0.1em",animation:speech.listening?"pulse 1.5s ease-in-out infinite":"none"}}>
                    {speech.listening?"IN ASCOLTO… PARLA ORA":"PREMI PER INIZIARE"}
                  </div>
                  {!speech.supported && (
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.danger}}>
                      Browser non supportato. Usa Chrome/Edge per il riconoscimento vocale.
                    </div>
                  )}
                  {text && (
                    <div style={{background:t.bgAlt,borderRadius:12,padding:16,width:"100%",
                      border:`1px solid ${t.div}`}}>
                      <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:6}}>TRASCRIZIONE</div>
                      <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,lineHeight:1.6}}>
                        {text}
                      </div>
                      <button onClick={()=>setText("")} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",
                        color:t.inkFaint,fontFamily:"var(--mono)",fontSize:10}}>✕ Cancella</button>
                    </div>
                  )}
                </div>
              )}

              {/* Foto */}
              {tab==="foto" && (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:11,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkMuted,lineHeight:1.6}}>
                    Carica foto di: ricevute fornitori, DDT, lista scritta a mano, foto prodotti con etichette.
                    L'AI estrarrà automaticamente gli articoli.
                  </div>
                  <div onClick={()=>fileRef.current?.click()} style={{
                    border:`2px dashed ${t.div}`, borderRadius:14, padding:"32px 24px",
                    textAlign:"center", cursor:"pointer",
                    background: t.bgAlt, transition:"all 0.2s"}}>
                    <div style={{fontSize:36,marginBottom:10}}>📷</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.inkMuted}}>
                      Clicca per caricare immagine o PDF
                    </div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:6}}>JPG · PNG · PDF</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple
                    style={{display:"none"}} onChange={async e=>{
                      const newFiles=[];
                      for(const f of e.target.files){
                        if(!f.type.startsWith("image/")&&f.type!=="application/pdf") continue;
                        const b64=await new Promise((res,rej)=>{
                          const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);
                          r.onerror=rej;r.readAsDataURL(f);
                        });
                        newFiles.push({name:f.name,mimeType:f.type,base64:b64});
                      }
                      setFiles(p=>[...p,...newFiles]);
                    }}/>
                  {files.map((f,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                      borderRadius:8,background:t.bgAlt,border:`1px solid ${t.div}`}}>
                      <span style={{fontSize:16}}>📄</span>
                      <span style={{flex:1,fontFamily:"var(--mono)",fontSize:10,color:t.ink}}>{f.name}</span>
                      <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{
                        background:"none",border:"none",cursor:"pointer",color:t.danger,fontSize:16}}>✕</button>
                    </div>
                  ))}
                  <textarea value={text} onChange={e=>setText(e.target.value)}
                    placeholder="Aggiungi contesto opzionale (es. 'ordine di venerdì', 'frigo 1')…"
                    rows={2} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,
                    background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:12,resize:"none"}}/>
                </div>
              )}

              {error && (
                <div style={{padding:"12px 16px",borderRadius:10,background:t.danger+"15",
                  border:`1px solid ${t.danger}44`,fontFamily:"var(--mono)",fontSize:11,color:t.danger}}>
                  ⚠ {error}
                </div>
              )}

              <button onClick={process} disabled={step==="processing"||(!text.trim()&&!files.length)} style={{
                padding:"14px 24px",borderRadius:14,border:"none",cursor:"pointer",
                background:step==="processing"?t.bgAlt:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,
                color:step==="processing"?t.inkMuted:"#fff",fontFamily:"var(--mono)",fontSize:12,fontWeight:600,
                opacity:(!text.trim()&&!files.length)?0.5:1,transition:"all 0.2s"}}>
                {step==="processing"?"⏳ AI sta elaborando…":"✨ Analizza e genera comandi"}
              </button>
            </div>
          )}

          {/* CHECKOUT STEP */}
          {step==="checkout" && result && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{padding:"14px 18px",borderRadius:12,background:t.gold+"12",
                border:`1px solid ${t.gold}33`}}>
                <div className="mono" style={{fontSize:9,color:t.goldBright,marginBottom:4}}>AI RIASSUNTO</div>
                <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,lineHeight:1.5}}>
                  {result.riassunto}
                </div>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div className="mono" style={{fontSize:9,color:t.inkFaint}}>
                  {Object.values(sel).filter(Boolean).length} / {result.comandi.length} COMANDI SELEZIONATI
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setSel(Object.fromEntries(result.comandi.map(c=>[c.id,true])))}
                    style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
                    background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>Tutti</button>
                  <button onClick={()=>setSel(Object.fromEntries(result.comandi.map(c=>[c.id,false])))}
                    style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${t.div}`,cursor:"pointer",
                    background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>Nessuno</button>
                </div>
              </div>

              {result.comandi.map(cmd => {
                const col = tipo2color[cmd.tipo]||t.gold;
                const pb = prio2badge[cmd.priorita]||prio2badge.media;
                return (
                  <div key={cmd.id} onClick={()=>setSel(p=>({...p,[cmd.id]:!p[cmd.id]}))} style={{
                    padding:"14px 18px",borderRadius:12,cursor:"pointer",
                    background:sel[cmd.id]?col+"10":t.bgAlt,
                    border:`1.5px solid ${sel[cmd.id]?col+"66":t.div}`,
                    transition:"all 0.15s",
                  }}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                        background:sel[cmd.id]?col:`${t.div}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        border:`1px solid ${sel[cmd.id]?col:t.div}`,transition:"all 0.15s",marginTop:2}}>
                        {sel[cmd.id]&&<span style={{color:"#fff",fontSize:12,lineHeight:1}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{padding:"3px 10px",borderRadius:8,background:col+"20",
                            color:col,fontFamily:"var(--mono)",fontSize:9,border:`1px solid ${col}33`}}>
                            {tipo2label[cmd.tipo]||cmd.tipo}
                          </span>
                          <span style={{padding:"3px 8px",borderRadius:8,background:pb.bg,
                            color:pb.col,fontFamily:"var(--mono)",fontSize:8}}>
                            {pb.l}
                          </span>
                        </div>
                        <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>
                          {cmd.nota}
                        </div>
                        <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:4}}>
                          {Object.entries(cmd.dati||{}).filter(([,v])=>v&&v!==""&&!Array.isArray(v))
                            .slice(0,5).map(([k,v])=>`${k}: ${v}`).join(" · ")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{display:"flex",gap:10,paddingTop:8}}>
                <button onClick={()=>setStep("input")} style={{flex:1,padding:"12px",borderRadius:12,
                  border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",
                  color:t.inkMuted,fontFamily:"var(--mono)",fontSize:11}}>← Modifica</button>
                <button onClick={applyCommands}
                  disabled={!Object.values(sel).some(Boolean)} style={{
                  flex:2,padding:"12px",borderRadius:12,border:"none",cursor:"pointer",
                  background:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,
                  color:"#fff",fontFamily:"var(--mono)",fontSize:12,fontWeight:600,
                  opacity:Object.values(sel).some(Boolean)?1:0.5}}>
                  ✓ Applica {Object.values(sel).filter(Boolean).length} comandi
                </button>
              </div>
            </div>
          )}

          {/* DONE STEP */}
          {step==="done" && applied && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"20px 0"}}>
              <div style={{width:72,height:72,borderRadius:"50%",
                background:`linear-gradient(135deg,${t.success},#3D9A55)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,
                boxShadow:`0 8px 32px ${t.success}44`}}>✓</div>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:18,color:t.ink,textAlign:"center"}}>
                Comandi applicati con successo
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
                {[["stock",t.success,"📦"],["prep",t.secondary,"📋"],["spesa","#5A7A9A","🛒"],["piatto",t.gold,"🍽️"]]
                  .filter(([k])=>applied[k]>0).map(([k,col,icon])=>(
                  <div key={k} style={{padding:"10px 18px",borderRadius:12,background:col+"15",
                    border:`1px solid ${col}33`,textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                    <div className="mono" style={{fontSize:18,color:col,fontWeight:700}}>{applied[k]}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint}}>{k.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setStep("input");setText("");setFiles([]);setResult(null);setSel({});}} style={{
                  padding:"12px 24px",borderRadius:12,border:`1px solid ${t.div}`,cursor:"pointer",
                  background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:11}}>
                  Nuovo comando
                </button>
                <button onClick={onClose} style={{
                  padding:"12px 24px",borderRadius:12,border:"none",cursor:"pointer",
                  background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
                  color:"#fff",fontFamily:"var(--mono)",fontSize:11,fontWeight:600}}>
                  Chiudi ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function ServizioViewFull({ t }) {
  const { kitchen, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [servTab, setServTab] = useState("live"); // live | piatti | ai
  const [showAICmd, setShowAICmd] = useState(false);
  const [active,setActive]=useState(false);
  const [startAt,setStartAt]=useState(null);
  const [coperti,setCoperti]=useState("30");
  const [elapsed,setElapsed]=useState(0);
  const [stazioni,setStazioni]=useState(()=>
    STATIONS.filter(s=>s.key!=="all").map(s=>({...s,status:"pronta"}))
  );
  useEffect(()=>{
    if(!active||!startAt)return;
    const i=setInterval(()=>setElapsed(Math.floor((Date.now()-startAt)/1000)),1000);
    return()=>clearInterval(i);
  },[active,startAt]);
  function fmt(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return h>0?`${h}h ${m}m`:`${m}m ${ss}s`;}
  function cycleStatus(key){
    const cy=["pronta","in_servizio","richiesta","esaurita"];
    setStazioni(p=>p.map(s=>s.key!==key?s:{...s,status:cy[(cy.indexOf(s.status)+1)%cy.length]}));
  }
  const SS={
    pronta:      {bg:"#3D7A4A22",border:"#3D7A4A",label:"PRONTA",      color:"#3D7A4A"},
    in_servizio: {bg:"#C19A3E22",border:"#C19A3E",label:"IN SERVIZIO", color:"#C19A3E"},
    richiesta:   {bg:"#8B1E2F22",border:"#8B1E2F",label:"⚡ RICHIESTA",color:"#8B1E2F"},
    esaurita:    {bg:"#8B1E2F44",border:"#FF3333",label:"ESAURITA",    color:"#FF3333"},
  };
  const alerts=stazioni.filter(s=>s.status==="esaurita"||s.status==="richiesta");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {showAICmd && <AICommandCenter t={t} onClose={()=>setShowAICmd(false)}/>}
      {/* Sub-tab navigation */}
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4,padding:4,background:t.bgAlt,borderRadius:12}}>
          {[{k:"live",l:"▶ Live",icon:"🟢"},{k:"piatti",l:"🍽️ Piatti",icon:""},{k:"calendario",l:"📅 Calendario",icon:""}].map(tb=>(
            <button key={tb.k} onClick={()=>setServTab(tb.k)} style={{
              padding:"8px 16px",borderRadius:9,border:"none",cursor:"pointer",
              background:servTab===tb.k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:"transparent",
              color:servTab===tb.k?"#fff":t.inkMuted,fontFamily:"var(--mono)",fontSize:10,transition:"all 0.2s"}}>
              {tb.l}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowAICmd(true)} style={{
          display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,
          border:`1px solid ${t.accent}44`,cursor:"pointer",
          background:t.accent+"10",color:t.accent,fontFamily:"var(--mono)",fontSize:10}}>
          🤖 AI Command
        </button>
      </div>
      {/* PIATTI TAB */}
      {servTab==="piatti" && <PiattiView/>}
      {/* CALENDARIO TAB */}
      {servTab==="calendario" && <SmartCalendario t={t}/>}
      {/* LIVE TAB */}
      {servTab==="live" && <>
      {/* Barra stato */}
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 22px",borderRadius:14,
        border:`1px solid ${active?t.success+"55":t.div}`,background:active?t.success+"0A":t.bgCard}}>
        <div style={{width:14,height:14,borderRadius:"50%",background:active?t.success:t.inkFaint,
          boxShadow:active?`0 0 12px ${t.success}`:"none",
          animation:active?"pulse 2s ease-in-out infinite":"none",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink,fontWeight:500}}>
            {active?"Servizio Live":"Servizio non attivo"}
          </div>
          {active&&<div className="mono" style={{fontSize:10,color:t.success,marginTop:2}}>{fmt(elapsed)} · {coperti} coperti</div>}
        </div>
        {active&&<div className="mono" style={{fontSize:28,color:t.gold,fontWeight:600,letterSpacing:"0.04em"}}>{fmt(elapsed)}</div>}
      </div>
      {/* Alert live partite */}
      {active&&alerts.map(s=>{const ss=SS[s.status];return(
        <div key={s.key} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:10,
          border:`1.5px solid ${ss.border}`,background:ss.bg,animation:"pulse 1.5s ease-in-out infinite"}}>
          <span style={{fontSize:20}}>{s.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink,fontWeight:500}}>{s.label}</div>
            <div className="mono" style={{fontSize:9,color:ss.color,marginTop:2}}>{ss.label}</div>
          </div>
          {canEdit&&<button onClick={()=>cycleStatus(s.key)} style={{...btnSmall(t),color:ss.color,borderColor:ss.border}}>Aggiorna</button>}
        </div>
      );})}
      {/* Avvio form */}
      {!active&&canEdit&&(
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>AVVIA SERVIZIO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <LuxInput value={coperti} onChange={e=>setCoperti(e.target.value)} type="number" placeholder="N. coperti" t={t}/>
          </div>
          <Btn t={t} variant="gold" onClick={()=>{setActive(true);setStartAt(Date.now());setElapsed(0);toast("Servizio avviato ▶","success");}}>
            ▶ Avvia Servizio
          </Btn>
        </Card>
      )}
      {active&&canEdit&&(
        <Btn t={t} variant="danger" onClick={()=>{setActive(false);toast(`Servizio terminato dopo ${fmt(elapsed)}`,"info");}} style={{alignSelf:"flex-start"}}>
          ■ Termina Servizio
        </Btn>
      )}
      {/* Griglia stazioni */}
      {active&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          {stazioni.map(s=>{const ss=SS[s.status];return(
            <Card key={s.key} t={t} style={{padding:0,cursor:canEdit?"pointer":"default",border:`1px solid ${ss.border}44`}}
              onClick={canEdit?()=>cycleStatus(s.key):undefined}>
              <div style={{height:3,background:ss.border}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:22}}>{s.icon}</span>
                  <div className="mono" style={{fontSize:10,letterSpacing:"0.06em",color:t.ink,fontWeight:600}}>{s.label}</div>
                </div>
                <span style={{display:"inline-block",padding:"3px 10px",borderRadius:6,fontFamily:"var(--mono)",fontSize:9,
                  background:ss.bg,color:ss.color,border:`1px solid ${ss.border}44`}}>{ss.label}</span>
              </div>
            </Card>
          );})}
        </div>
      )}
      {/* MEP snapshot */}
      {(kitchen?.mepItems||[]).length>0&&active&&(
        <Card t={t}>
          <CardHeader t={t} title="MEP — Stato Frigo di Linea"/>
          <div>
            {(kitchen.mepItems||[]).map((item,i)=>{
              const lv=item.livelloServizio??4;
              const cols=["#8B1E2F","#C75B5B","#C19A3E","#5B9E6F","#3D7A4A"];
              const labs=["ESAURITO","CRITICO","BASSO","OK","PIENO"];
              return (
                <div key={item.id} style={{padding:"10px 22px",display:"flex",alignItems:"center",gap:12,
                  borderBottom:i<(kitchen.mepItems||[]).length-1?`1px solid ${t.div}`:undefined}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{item.nome||item.text||"—"}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{(item.postazione||item.station||"").replace("_"," ")}</div>
                  </div>
                  <div style={{display:"flex",gap:3}}>
                    {[0,1,2,3,4].map(v=>(
                      <div key={v} style={{width:8,height:24,borderRadius:3,background:v<=lv?cols[lv]:t.div,transition:"all 0.3s"}}/>
                    ))}
                  </div>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:cols[lv],minWidth:60,textAlign:"right"}}>{labs[lv]}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      </>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   HACCP VIEW — temperature, checklist, lotti
   ════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════
   SPTTP — Scheda Fine Turno
   Scadenze · Preparazioni · Temperature · Tracciabilità · Pulizie
   ════════════════════════════════════════════════════════ */
function SpttpView({ t }) {
  const { kitchen, allItems, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const today = todayDate();
  const STORAGE = `spttp-${kitchen?.id}-${today}`;
  const [data, setData] = React.useState(()=>{
    try{ return JSON.parse(localStorage.getItem(STORAGE)||"null"); }catch{ return null; }
  });
  React.useEffect(()=>{ try{ localStorage.setItem(STORAGE, JSON.stringify(data)); }catch{} }, [data, STORAGE]);

  const items = allItems();
  const preps = kitchen?.preparazioni||[];
  const now = new Date();

  // Auto-init data struttura
  React.useEffect(()=>{
    if(data) return;
    const expired = items.filter(x=>x.expiresAt&&new Date(x.expiresAt)<now);
    const scadenti = items.filter(x=>{const h=hoursUntil(x.expiresAt);return h!==null&&h>0&&h<=24;});
    const prepsOggi = preps.filter(p=>p.status!=="smistata");
    setData({
      turno: "mattina",
      coperti: "",
      operatore: "",
      // Sezione 1 — Scadenze
      scadenzeChecked: {},
      // Sezione 2 — Prep completate
      prepChecked: {},
      // Sezione 3 — Temperature frigo linea
      tempFrigo: "", tempFreezer: "", tempBanco: "",
      tempFrigoOk: null, tempFreezerOk: null, tempBancoOk: null,
      // Sezione 4 — Scarico giacenze
      scaricoNote: "",
      // Sezione 5 — Pulizie
      pulizie: {},
      // Sezione 6 — Check frigo linea
      checkFrigo: {},
      // Sezione 7 — Check fine servizio
      checkServizio: {},
      // Sezione 8 — Note libere
      note: "",
      completedAt: null,
    });
  }, [kitchen?.id, today]);

  if(!data) return <div style={{padding:40,textAlign:"center",color:t.inkFaint}}>Caricamento...</div>;

  const upd = (patch:any) => setData((p:any)=>({...p,...patch}));

  const expired = items.filter(x=>x.expiresAt&&new Date(x.expiresAt)<now);
  const scadenti24 = items.filter(x=>{const h=hoursUntil(x.expiresAt);return h!==null&&h>0&&h<=48;});
  const prepsAttive = preps.filter(p=>p.status!=="smistata"&&p.status!=="svolta");

  const PULIZIE_LIST = [
    "Piani di lavoro sanitizzati","Attrezzature pulite e riposte",
    "Frigo linea pulito e organizzato","Frigo principale controllato",
    "Congelatore controllato","Pavimenti puliti",
    "Lavello e scarichi puliti","Cappe aspiranti pulite",
    "Contenitori e GN lavati","Rifiuti smaltiti correttamente",
  ];
  const CHECK_FRIGO = [
    "Temperatura corretta (0-5°C)","Alimenti coperti con pellicola/coperchi",
    "FIFO rispettato (vecchio davanti)","Nessun alimento scaduto",
    "Separazione crudo/cotto","Etichettatura completa",
  ];
  const CHECK_FINE_SERVIZIO = [
    "Prep aggiornate nel sistema","Giacenze aggiornate",
    "Scarico effettuato","Temperatura registrata su HACCP",
    "Comunicazione al turno successivo","Banco servizio pulito",
    "Mise en place per domani avviata",
  ];

  const scoreSection = (obj:any, list:any[]) => list.filter((_,i)=>obj[i]).length;
  const totalScore = 
    scoreSection(data.pulizie, PULIZIE_LIST) +
    scoreSection(data.checkFrigo, CHECK_FRIGO) +
    scoreSection(data.checkServizio, CHECK_FINE_SERVIZIO) +
    Object.values(data.prepChecked||{}).filter(Boolean).length +
    Object.values(data.scadenzeChecked||{}).filter(Boolean).length +
    (data.tempFrigoOk!==null?1:0) + (data.tempFreezerOk!==null?1:0);
  const maxScore = PULIZIE_LIST.length + CHECK_FRIGO.length + CHECK_FINE_SERVIZIO.length +
    prepsAttive.length + (expired.length+scadenti24.length) + 3;
  const pct = maxScore>0 ? Math.round((totalScore/maxScore)*100) : 0;

  function SectionHeader({icon,title,sub}:any) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:22}}>{icon}</span>
        <div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:"0.1em",color:t.ink}}>{title}</div>
          {sub&&<div className="mono" style={{fontSize:8,color:t.inkFaint}}>{sub}</div>}
        </div>
      </div>
    );
  }

  function CheckRow({label,checked,onToggle,warn=false}:any) {
    return (
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",
        borderRadius:8,cursor:"pointer",background:checked?t.success+"10":warn?t.danger+"08":"transparent",
        border:`1px solid ${checked?t.success+"44":warn?t.danger+"33":t.div}`,marginBottom:6,transition:"all 0.15s"}}>
        <div style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${checked?t.success:warn?t.danger:t.div}`,
          background:checked?t.success:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {checked&&<span style={{color:"#fff",fontSize:13}}>✓</span>}
        </div>
        <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:warn&&!checked?t.danger:t.ink,flex:1}}>{label}</span>
        {warn&&!checked&&<span style={{fontSize:10,color:t.danger}}>⚠</span>}
      </div>
    );
  }

  function TempInput({label,icon,value,min,max,okFn,field,okField}:any) {
    const tv=parseFloat(value);
    const ok=value?okFn(tv):null;
    return (
      <div style={{padding:"14px 16px",borderRadius:12,border:`2px solid ${ok===false?t.danger:ok===true?t.success:t.div}`,background:t.bgCard,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{icon}</span>
          <div>
            <div className="mono" style={{fontSize:10,color:t.ink}}>{label}</div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint}}>{min}÷{max}°C</div>
          </div>
          {ok!==null&&<span style={{marginLeft:"auto",fontSize:20}}>{ok?"✅":"⚠️"}</span>}
        </div>
        <input value={value} onChange={e=>{ const v=e.target.value; upd({[field]:v,[okField]:v?okFn(parseFloat(v)):null}); }}
          type="number" placeholder="°C" style={{
            padding:"8px 12px",borderRadius:8,border:`1px solid ${ok===false?t.danger:ok===true?t.success:t.div}`,
            background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:18,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"
          }}/>
      </div>
    );
  }

  function exportPDF() {
    const lines = [
      `SCHEDA FINE TURNO — ${today}`,
      `Operatore: ${data.operatore||"—"} | Turno: ${data.turno} | Coperti: ${data.coperti||"—"}`,
      `Completamento: ${pct}%`,
      "",
      "=== TEMPERATURE ===",
      `Frigo: ${data.tempFrigo||"—"}°C ${data.tempFrigoOk===true?"✓":data.tempFrigoOk===false?"✗":""}`,
      `Congelatore: ${data.tempFreezer||"—"}°C ${data.tempFreezerOk===true?"✓":data.tempFreezerOk===false?"✗":""}`,
      `Banco: ${data.tempBanco||"—"}°C ${data.tempBancoOk===true?"✓":data.tempBancoOk===false?"✗":""}`,
      "",
      "=== PULIZIE ===",
      ...PULIZIE_LIST.map((p,i)=>`${data.pulizie[i]?"[✓]":"[ ]"} ${p}`),
      "",
      "=== CHECK FRIGO LINEA ===",
      ...CHECK_FRIGO.map((p,i)=>`${data.checkFrigo[i]?"[✓]":"[ ]"} ${p}`),
      "",
      "=== CHECK FINE SERVIZIO ===",
      ...CHECK_FINE_SERVIZIO.map((p,i)=>`${data.checkServizio[i]?"[✓]":"[ ]"} ${p}`),
      "",
      `Note: ${data.note||"—"}`,
    ];
    const csv = lines.join("\n");
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(csv);
    a.download = `SPTTP-${today}-${data.turno}.txt`;
    a.click();
    toast("Scheda esportata","success");
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header stato */}
      <div style={{padding:"16px 22px",borderRadius:14,background:pct>=80?t.success+"12":pct>=50?t.gold+"12":t.bgCard,
        border:`1.5px solid ${pct>=80?t.success+"55":pct>=50?t.gold+"55":t.div}`,display:"flex",alignItems:"center",gap:16}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:16,color:t.ink}}>Scheda Fine Turno — {today}</div>
          <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{totalScore}/{maxScore} check completati</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:28,fontWeight:700,color:pct>=80?t.success:pct>=50?t.gold:t.danger}}>{pct}%</div>
          <div className="mono" style={{fontSize:8,color:t.inkFaint}}>COMPLETAMENTO</div>
        </div>
        <button onClick={exportPDF} style={{padding:"8px 16px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:t.bgAlt,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>⬇ Esporta</button>
      </div>

      {/* Info turno */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="📋" title="INFO TURNO" sub={today}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>OPERATORE</div>
            <input value={data.operatore} onChange={e=>upd({operatore:e.target.value})} placeholder="Nome operatore"
              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>TURNO</div>
            <select value={data.turno} onChange={e=>upd({turno:e.target.value})}
              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11}}>
              {["mattina","pranzo","pomeriggio","cena","notte"].map(t2=><option key={t2}>{t2}</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:4}}>COPERTI</div>
            <input value={data.coperti} onChange={e=>upd({coperti:e.target.value})} type="number" placeholder="es. 45"
              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
      </Card>

      {/* 1. Scadenze */}
      {(expired.length>0||scadenti24.length>0)&&(
        <Card t={t} style={{padding:20}}>
          <SectionHeader icon="⚠️" title="SCADENZE DA GESTIRE" sub={`${expired.length} scaduti · ${scadenti24.length} entro 48h`}/>
          {expired.map((item,i)=>(
            <CheckRow key={item.id} warn label={`SCADUTO — ${item.name} (${item.quantity} ${item.unit})`}
              checked={!!data.scadenzeChecked[item.id]}
              onToggle={()=>upd({scadenzeChecked:{...data.scadenzeChecked,[item.id]:!data.scadenzeChecked[item.id]}})}/>
          ))}
          {scadenti24.map((item,i)=>(
            <CheckRow key={item.id} label={`Scade presto — ${item.name} (${item.quantity} ${item.unit}) · ${fmtDate(item.expiresAt)}`}
              checked={!!data.scadenzeChecked["s"+item.id]}
              onToggle={()=>upd({scadenzeChecked:{...data.scadenzeChecked,["s"+item.id]:!data.scadenzeChecked["s"+item.id]}})}/>
          ))}
        </Card>
      )}

      {/* 2. Temperature */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="🌡️" title="TEMPERATURE" sub="Registra le temperature di fine turno"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
          <TempInput label="Frigo Linea" icon="🧊" value={data.tempFrigo} min={0} max={5}
            okFn={(v:number)=>v>=0&&v<=5} field="tempFrigo" okField="tempFrigoOk"/>
          <TempInput label="Congelatore" icon="❄️" value={data.tempFreezer} min={-20} max={-15}
            okFn={(v:number)=>v>=-20&&v<=-15} field="tempFreezer" okField="tempFreezerOk"/>
          <TempInput label="Banco Pesce" icon="🐟" value={data.tempBanco} min={0} max={4}
            okFn={(v:number)=>v>=0&&v<=4} field="tempBanco" okField="tempBancoOk"/>
        </div>
      </Card>

      {/* 3. Prep attive */}
      {prepsAttive.length>0&&(
        <Card t={t} style={{padding:20}}>
          <SectionHeader icon="📋" title="PREPARAZIONI ATTIVE" sub="Aggiorna lo stato delle prep"/>
          {prepsAttive.map(p=>(
            <CheckRow key={p.id} label={`${p.nome} — ${p.quantita} ${p.unitaMisura||"pz"}`}
              checked={!!data.prepChecked[p.id]}
              onToggle={()=>upd({prepChecked:{...data.prepChecked,[p.id]:!data.prepChecked[p.id]}})}/>
          ))}
        </Card>
      )}

      {/* 4. Check frigo linea */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="🧊" title="CHECK FRIGO LINEA" sub={`${scoreSection(data.checkFrigo,CHECK_FRIGO)}/${CHECK_FRIGO.length} OK`}/>
        {CHECK_FRIGO.map((item,i)=>(
          <CheckRow key={i} label={item}
            checked={!!data.checkFrigo[i]}
            onToggle={()=>upd({checkFrigo:{...data.checkFrigo,[i]:!data.checkFrigo[i]}})}/>
        ))}
      </Card>

      {/* 5. Pulizie */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="🧹" title="PULIZIE" sub={`${scoreSection(data.pulizie,PULIZIE_LIST)}/${PULIZIE_LIST.length} completate`}/>
        {PULIZIE_LIST.map((item,i)=>(
          <CheckRow key={i} label={item}
            checked={!!data.pulizie[i]}
            onToggle={()=>upd({pulizie:{...data.pulizie,[i]:!data.pulizie[i]}})}/>
        ))}
      </Card>

      {/* 6. Check fine servizio */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="✅" title="CHECK FINE SERVIZIO"  sub={`${scoreSection(data.checkServizio,CHECK_FINE_SERVIZIO)}/${CHECK_FINE_SERVIZIO.length} OK`}/>
        {CHECK_FINE_SERVIZIO.map((item,i)=>(
          <CheckRow key={i} label={item}
            checked={!!data.checkServizio[i]}
            onToggle={()=>upd({checkServizio:{...data.checkServizio,[i]:!data.checkServizio[i]}})}/>
        ))}
      </Card>

      {/* 7. Note */}
      <Card t={t} style={{padding:20}}>
        <SectionHeader icon="📝" title="NOTE FINE TURNO" sub="Comunicazioni per il turno successivo"/>
        <textarea value={data.note} onChange={e=>upd({note:e.target.value})} placeholder="Segnalazioni, comunicazioni, anomalie..."
          rows={4} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${t.div}`,
            background:t.bgAlt,color:t.ink,fontFamily:"var(--serif)",fontSize:13,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
      </Card>

      {/* CTA fine */}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={()=>{
          if(window.confirm("Resetta la scheda di oggi?")) {
            localStorage.removeItem(STORAGE);
            setData(null);
          }
        }} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>
          ↺ Reset
        </button>
        <button onClick={()=>{
          upd({completedAt:nowISO()});
          exportPDF();
          toast("Scheda fine turno completata e salvata","success");
        }} style={{padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",
          background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em"}}>
          ✓ Completa Turno
        </button>
      </div>
    </div>
  );
}

function SemilavView({ t, kitchen, allItems, toast }) {
  const SLKEY=`semilav-${kitchen?.id}`;
  const ALLERGENI_EU=["Glutine","Crostacei","Uova","Pesce","Arachidi","Soia","Latte","Frutta a guscio","Sedano","Senape","Semi di sesamo","Anidride solforosa","Lupini","Molluschi"];
  const items=allItems();
  const lots=items.filter((x:any)=>x.lot);
  const preps=(kitchen?.preps||[]).filter((p:any)=>p.status!=="done");
  // Ingredienti ultima settimana con lotto, divisi per fornitore
  const settimana = Date.now() - 7*86400000;
  const ingredientiArch=(kitchen?.ingredienti||[])
    .filter((x:any)=>x.lotto && new Date(x.createdAt||0).getTime()>settimana)
    .sort((a:any,b:any)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime());
  const fornArchivio:{[k:string]:any[]}={};
  ingredientiArch.forEach((i:any)=>{ const k=i.fornitore||"-"; if(!fornArchivio[k]) fornArchivio[k]=[]; fornArchivio[k].push(i); });

  const [slList,setSlList]=useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem(SLKEY)||"[]");}catch{return[];}});
  const emptyForm={nome:"",dataProd:todayDate(),scadGiorni:"3",nota:"",allergeni:[] as string[],categoria:"frigo",ingredienti:[{nome:"",lotto:"",qty:"",unit:"kg"}]};
  const [slForm,setSlForm]=useState<any>(emptyForm);
  const [showForm,setShowForm]=useState(false);
  const [printItem,setPrintItem]=useState<any>(null);
  const saveList=(l:any[])=>{setSlList(l);localStorage.setItem(SLKEY,JSON.stringify(l));};

  function rinnovaLotti(sl:any) {
    const allFatture:any[]=(() => {try{return JSON.parse(localStorage.getItem("fatture-storico")||"[]");}catch{return[];}})();
    const sorted=[...allFatture].sort((a:any,b:any)=>new Date(b.at).getTime()-new Date(a.at).getTime());
    let aggiornati=0;
    const nuoviIng=sl.ingredienti.map((ing:any)=>{
      for(const f of sorted){
        const match=f.prodotti.find((p:any)=>p.lotto&&(
          p.nome.toLowerCase().includes(ing.nome.toLowerCase().split(" ")[0])||
          ing.nome.toLowerCase().includes(p.nome.toLowerCase().split(" ")[0])
        ));
        if(match){aggiornati++;return {...ing,lotto:match.lotto};}
      }
      const sm=items.find((x:any)=>x.lot&&x.name.toLowerCase().includes(ing.nome.toLowerCase().split(" ")[0]));
      if(sm){aggiornati++;return {...ing,lotto:sm.lot};}
      return ing;
    });
    const scad=new Date();scad.setDate(scad.getDate()+3);
    const updated={...sl,ingredienti:nuoviIng,dataProd:todayDate(),scadenza:scad.toISOString().slice(0,10),lotto:"KP-"+Date.now().toString(36).toUpperCase()};
    saveList(slList.map((x:any)=>x.id===sl.id?updated:x));
    toast(aggiornati>0?"Rinnovo lotti: "+aggiornati+" aggiornati":"Nessun lotto trovato nelle fatture","success");
  }

  const CATCOL:any={frigo:"#1a5276",freezer:"#1a3a6b",banco:"#1e6b3a",dry:"#7d5a1e",default:"#1a2744"};
  const CATLAB:any={frigo:"Frigo 0-4 C",freezer:"Congelato -18 C",banco:"Banco Servizio",dry:"Dispensa",default:"Cucina"};

  function toggleAllergene(a:string){
    setSlForm((p:any)=>({...p,allergeni:p.allergeni.includes(a)?p.allergeni.filter((x:string)=>x!==a):[...p.allergeni,a]}));
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink}}>Semilavorati ({slList.length})</span>
        <button onClick={()=>{setSlForm(emptyForm);setShowForm(p=>!p);}} style={{padding:"7px 16px",borderRadius:9,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:10,fontWeight:600}}>{showForm?"✕ Chiudi":"+ Nuovo"}</button>
      </div>

      {/* Form */}
      {showForm&&(
        <div style={{background:t.bgAlt,borderRadius:14,padding:"16px",border:"1px solid "+t.div,display:"flex",flexDirection:"column",gap:12}}>
          <div className="mono" style={{fontSize:9,color:t.gold,letterSpacing:"0.1em"}}>NUOVO SEMILAVORATO</div>

          {/* Nome + date */}
          <input placeholder="Nome semilavorato *" value={slForm.nome} onChange={e=>setSlForm((p:any)=>({...p,nome:e.target.value}))}
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:3}}>DATA PRODUZIONE</div>
              <input type="date" value={slForm.dataProd} onChange={e=>setSlForm((p:any)=>({...p,dataProd:e.target.value}))}
                style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:3}}>SCADENZA (giorni)</div>
              <input type="number" min="1" value={slForm.scadGiorni} onChange={e=>setSlForm((p:any)=>({...p,scadGiorni:e.target.value}))}
                style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:3}}>CONSERVAZIONE</div>
            <select value={slForm.categoria} onChange={e=>setSlForm((p:any)=>({...p,categoria:e.target.value}))}
              style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none"}}>
              <option value="frigo">Frigo (0-4 C)</option>
              <option value="freezer">Congelato (-18 C)</option>
              <option value="banco">Banco Servizio</option>
              <option value="dry">Dispensa</option>
            </select>
          </div>

          {/* Ingredienti */}
          <div>
            <div className="mono" style={{fontSize:8,color:t.inkMuted,marginBottom:6}}>INGREDIENTI E LOTTI</div>
            {slForm.ingredienti.map((ing:any,ii:number)=>(
              <div key={ii} style={{display:"grid",gridTemplateColumns:"2fr 2fr 60px 50px 28px",gap:5,marginBottom:6,alignItems:"center"}}>
                <input placeholder="Ingrediente" value={ing.nome} onChange={e=>{const a=[...slForm.ingredienti];a[ii]={...a[ii],nome:e.target.value};setSlForm((p:any)=>({...p,ingredienti:a}));}}
                  style={{padding:"6px 8px",borderRadius:7,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontSize:12,fontFamily:"var(--serif)",outline:"none"}}/>
                <select value={ing.lotto} onChange={e=>{const a=[...slForm.ingredienti];a[ii]={...a[ii],lotto:e.target.value,nome:ing.nome||e.target.options[e.target.selectedIndex].text.split(" —")[0]};setSlForm((p:any)=>({...p,ingredienti:a}));}}
                  style={{padding:"6px 4px",borderRadius:7,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontSize:11,outline:"none"}}>
                  <option value="">Lotto —</option>
                  {lots.length>0&&<optgroup label="📦 Stock">{lots.map((x:any)=><option key={x.id} value={x.lot}>{x.name} #{x.lot}</option>)}</optgroup>}
                  {preps.length>0&&<optgroup label="📋 Prep">{preps.filter((p:any)=>p.lotto).map((p:any,pi:number)=><option key={pi} value={p.lotto}>{p.nome} #{p.lotto}</option>)}</optgroup>}
                  {Object.keys(fornArchivio).map((forn:string)=><optgroup key={forn} label={"📄 "+forn}>{fornArchivio[forn].map((i:any)=><option key={i.id} value={i.lotto}>{i.nome} #{i.lotto} ({i.dataFattura})</option>)}</optgroup>)}
                </select>
                <input placeholder="Qty" value={ing.qty} onChange={e=>{const a=[...slForm.ingredienti];a[ii]={...a[ii],qty:e.target.value};setSlForm((p:any)=>({...p,ingredienti:a}));}}
                  style={{padding:"6px 4px",borderRadius:7,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontSize:12,outline:"none",textAlign:"center"}}/>
                <select value={ing.unit} onChange={e=>{const a=[...slForm.ingredienti];a[ii]={...a[ii],unit:e.target.value};setSlForm((p:any)=>({...p,ingredienti:a}));}}
                  style={{padding:"6px 2px",borderRadius:7,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontSize:10,outline:"none"}}>
                  <option>kg</option><option>g</option><option>l</option><option>ml</option><option>pz</option>
                </select>
                <button onClick={()=>{const a=slForm.ingredienti.filter((_:any,j:number)=>j!==ii);setSlForm((p:any)=>({...p,ingredienti:a.length?a:[{nome:"",lotto:"",qty:"",unit:"kg"}]}));}}
                  style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setSlForm((p:any)=>({...p,ingredienti:[...p.ingredienti,{nome:"",lotto:"",qty:"",unit:"kg"}]}))}
              style={{padding:"5px 12px",borderRadius:7,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>+ Ingrediente</button>
          </div>

          {/* Allergeni */}
          <div>
            <div className="mono" style={{fontSize:8,color:t.danger,marginBottom:6,letterSpacing:"0.08em"}}>ALLERGENI REG. UE 1169/2011</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {ALLERGENI_EU.map((a:string)=>(
                <button key={a} onClick={()=>toggleAllergene(a)} style={{
                  padding:"4px 9px",borderRadius:6,cursor:"pointer",fontFamily:"var(--mono)",fontSize:9,transition:"all 0.15s",
                  background:slForm.allergeni.includes(a)?"#b0000022":t.bgCard,
                  border:"1px solid "+(slForm.allergeni.includes(a)?t.danger:t.div),
                  color:slForm.allergeni.includes(a)?t.danger:t.inkMuted,
                  fontWeight:slForm.allergeni.includes(a)?700:400,
                }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Note */}
          <textarea placeholder="Note (conservazione, istruzioni...)" value={slForm.nota} onChange={e=>setSlForm((p:any)=>({...p,nota:e.target.value}))} rows={2}
            style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+t.div,background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:12,resize:"vertical",outline:"none"}}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>{
              if(!slForm.nome.trim()){toast("Nome obbligatorio","error");return;}
              const scad=new Date(slForm.dataProd);scad.setDate(scad.getDate()+parseInt(slForm.scadGiorni||"3"));
              const item={id:genId(),nome:slForm.nome.trim(),dataProd:slForm.dataProd,scadenza:scad.toISOString().slice(0,10),nota:slForm.nota,allergeni:slForm.allergeni,ingredienti:slForm.ingredienti.filter((x:any)=>x.nome.trim()),lotto:"KP-"+Date.now().toString(36).toUpperCase(),categoria:slForm.categoria||"frigo",createdAt:nowISO()};
              saveList([item,...slList]);setSlForm(emptyForm);setShowForm(false);toast("Semilavorato salvato","success");
            }} style={{padding:"9px",borderRadius:9,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:10,fontWeight:600}}>✓ Salva</button>
            <button onClick={()=>{setSlForm(emptyForm);setShowForm(false);}} style={{padding:"9px",borderRadius:9,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {slList.length===0&&!showForm&&<div style={{padding:"32px",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center"}}>Nessun semilavorato — premi + Nuovo</div>}
      {slList.map((sl:any,si:number)=>{
        const scadDate=new Date(sl.scadenza);
        const oggi=new Date(todayDate());
        const diffGg=Math.ceil((scadDate.getTime()-oggi.getTime())/86400000);
        const scadColor=diffGg<0?t.danger:diffGg<=1?t.warning:diffGg<=3?"#E8A020":t.success;
        return (
          <div key={sl.id} style={{background:t.bgAlt,borderRadius:12,border:"2px solid "+(CATCOL[sl.categoria||"default"]||CATCOL.default),overflow:"hidden"}}>
            <div style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sl.nome}</div>
                <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:3,display:"flex",flexWrap:"wrap",gap:6}}>
                  <span>Lotto: {sl.lotto}</span>
                  <span>Prod: {sl.dataProd}</span>
                  <span style={{color:scadColor,fontWeight:600}}>Scad: {sl.scadenza} {diffGg<0?"⛔":diffGg<=1?"⚠️":""}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button onClick={()=>rinnovaLotti(sl)} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:9}} title="Aggiorna lotti">🔄</button>
                <button onClick={()=>setPrintItem(sl)} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:t.secondary,color:"#fff",fontFamily:"var(--mono)",fontSize:9}}>🖨</button>
                <button onClick={()=>saveList(slList.filter((_:any,j:number)=>j!==si))} style={{padding:"5px 8px",borderRadius:7,border:"none",cursor:"pointer",background:t.accentGlow,color:t.danger,fontFamily:"var(--mono)",fontSize:9}}>✕</button>
              </div>
            </div>
            {(sl.ingredienti.length>0||sl.allergeni?.length>0)&&(
              <div style={{padding:"0 14px 12px",display:"flex",flexDirection:"column",gap:6}}>
                {sl.ingredienti.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {sl.ingredienti.map((ing:any,ii:number)=>(
                    <span key={ii} style={{padding:"2px 7px",borderRadius:5,background:t.bgCard,border:"1px solid "+t.div,fontFamily:"var(--mono)",fontSize:9,color:t.inkMuted}}>{ing.nome}{ing.lotto?" #"+ing.lotto:""}{ing.qty?" "+ing.qty+ing.unit:""}</span>
                  ))}
                </div>}
                {sl.allergeni?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,paddingTop:4,borderTop:"1px solid "+t.div}}>
                  <span className="mono" style={{fontSize:8,color:t.danger,alignSelf:"center"}}>ALLERGENI:</span>
                  {sl.allergeni.map((a:string,ai:number)=>(
                    <span key={ai} style={{padding:"2px 7px",borderRadius:5,background:"#b0000015",border:"1px solid "+t.danger+"44",fontFamily:"var(--mono)",fontSize:9,color:t.danger}}>{a}</span>
                  ))}
                </div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal stampa */}
      {printItem&&(
        <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div id="etichetta-print-wrapper" style={{display:"none",position:"fixed",inset:0,background:"#fff",zIndex:99999,alignItems:"center",justifyContent:"center"}}>
            <div style={{fontFamily:"'Times New Roman',serif",color:"#000",border:"3px solid "+(CATCOL[printItem.categoria||"default"]||CATCOL.default),borderRadius:6,padding:"14px 18px",width:320,margin:"auto",marginTop:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"1.5px solid #1a2744",paddingBottom:8,marginBottom:10}}>
                <div><div style={{fontSize:9,letterSpacing:"0.18em",color:"#8B7536",fontFamily:"monospace"}}>KITCHEN PRO · SEMILAVORATO</div><div style={{fontSize:20,fontWeight:700,marginTop:3,lineHeight:1.2}}>{printItem.nome}</div></div>
                <img src={"https://api.qrserver.com/v1/create-qr-code/?size=70x70&data="+encodeURIComponent("LOTTO:"+printItem.lotto+"|PROD:"+printItem.dataProd+"|SCAD:"+printItem.scadenza+"|"+printItem.nome)} alt="QR" style={{width:70,height:70,borderRadius:4}}/>
              </div>
              <table style={{width:"100%",fontSize:11,lineHeight:1.9,borderCollapse:"collapse"}}><tbody>
                <tr><td style={{color:"#555",width:110,fontFamily:"monospace",fontSize:10}}>LOTTO</td><td style={{fontWeight:700,fontFamily:"monospace"}}>{printItem.lotto}</td></tr>
                <tr><td style={{color:"#555",fontFamily:"monospace",fontSize:10}}>PRODUZIONE</td><td>{printItem.dataProd}</td></tr>
                <tr><td style={{fontFamily:"monospace",fontSize:10,color:"#b00"}}>SCADENZA</td><td style={{fontWeight:700,color:"#b00"}}>{printItem.scadenza}</td></tr>
                {printItem.ingredienti?.length>0&&<tr><td style={{color:"#555",fontFamily:"monospace",fontSize:10,verticalAlign:"top",paddingTop:4}}>INGREDIENTI</td><td style={{fontSize:10}}>{printItem.ingredienti.map((ing:any,ii:number)=><span key={ii}>{ing.nome}{ing.lotto?" (L."+ing.lotto+")":""}{ing.qty?" "+ing.qty+ing.unit:""}{ii<printItem.ingredienti.length-1?", ":""}</span>)}</td></tr>}
                {printItem.allergeni?.length>0&&<tr><td style={{color:"#b00",fontFamily:"monospace",fontSize:10,fontWeight:700,verticalAlign:"top",paddingTop:4}}>ALLERGENI</td><td style={{fontSize:10,color:"#b00",fontWeight:600}}>{printItem.allergeni.join(", ")}</td></tr>}
                {printItem.nota&&<tr><td style={{color:"#555",fontFamily:"monospace",fontSize:10,verticalAlign:"top"}}>NOTE</td><td style={{fontSize:10,fontStyle:"italic"}}>{printItem.nota}</td></tr>}
              </tbody></table>
              <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #ccc",display:"flex",justifyContent:"space-between",fontSize:8,color:"#999",fontFamily:"monospace"}}>
                <span>{kitchen?.name||"Kitchen Pro"}</span><span>Reg. {printItem.createdAt?.slice(0,10)||""}</span>
              </div>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:"20px",maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Times New Roman',serif",color:"#000",border:"2px solid #1a2744",borderRadius:8,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"1.5px solid #1a2744",paddingBottom:8,marginBottom:10}}>
                <div><div style={{fontSize:9,letterSpacing:"0.15em",color:"#8B7536",fontFamily:"monospace"}}>KITCHEN PRO · SEMILAVORATO</div><div style={{fontSize:17,fontWeight:700,marginTop:3}}>{printItem.nome}</div></div>
                <img src={"https://api.qrserver.com/v1/create-qr-code/?size=64x64&data="+encodeURIComponent("LOTTO:"+printItem.lotto+"|"+printItem.nome)} alt="QR" style={{width:64,height:64,borderRadius:4}}/>
              </div>
              <div style={{fontSize:11,lineHeight:1.9}}>
                <div><b>Lotto:</b> <span style={{fontFamily:"monospace"}}>{printItem.lotto}</span></div>
                <div><b>Produzione:</b> {printItem.dataProd}</div>
                <div style={{color:"#b00"}}><b>Scadenza:</b> {printItem.scadenza}</div>
                {printItem.ingredienti?.length>0&&<div style={{marginTop:6,fontSize:10}}><b>Ingredienti:</b> {printItem.ingredienti.map((i:any,ii:number)=><span key={ii}>{i.nome}{i.lotto?" (L."+i.lotto+")":""}{i.qty?" "+i.qty+i.unit:""}{ii<printItem.ingredienti.length-1?", ":""}</span>)}</div>}
                {printItem.allergeni?.length>0&&<div style={{marginTop:6,fontSize:10,color:"#b00"}}><b>ALLERGENI:</b> {printItem.allergeni.join(", ")}</div>}
                {printItem.nota&&<div style={{marginTop:4,fontSize:10,fontStyle:"italic",color:"#666"}}>{printItem.nota}</div>}
              </div>
              <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #ddd",fontSize:8,color:"#aaa",fontFamily:"monospace",textAlign:"right"}}>{kitchen?.name||""}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>{const w=document.getElementById("etichetta-print-wrapper");if(w){w.style.display="flex";}setTimeout(()=>{window.print();setTimeout(()=>{if(w)w.style.display="none";},500);},200);}}
                style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",background:"#1a2744",color:"#C9A84C",fontFamily:"monospace",fontSize:11,fontWeight:600}}>🖨 Stampa A6</button>
              <button onClick={()=>setPrintItem(null)} style={{flex:1,padding:"9px",borderRadius:9,border:"1px solid #ccc",cursor:"pointer",background:"transparent",color:"#666",fontFamily:"monospace",fontSize:11}}>Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function HaccpViewFull({ t }) {
  const { kitchen, allItems, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [tab,setTab]=useState("temperatura");
  const [showHACCPAI, setShowHACCPAI] = useState(false);
  const [logs,setLogs]=useState(()=>{try{return JSON.parse(localStorage.getItem(`hlog-${kitchen?.id}`)||"[]");}catch{return[];}});
  const [form,setForm]=useState({zona:"frigo",temp:"",op:"",note:""});
  const [zTemps,setZTemps]=useState<{[k:string]:string}>({});
  const [checks,setChecks]=useState(()=>{try{return JSON.parse(localStorage.getItem(`hck-${kitchen?.id}-${todayDate()}`)||"{}");}catch{return{};}});

  useEffect(()=>{try{localStorage.setItem(`hlog-${kitchen?.id}`,JSON.stringify(logs.slice(0,200)));}catch{}},[logs,kitchen?.id]);
  useEffect(()=>{try{localStorage.setItem(`hck-${kitchen?.id}-${todayDate()}`,JSON.stringify(checks));}catch{}},[checks,kitchen?.id]);

  const DEFAULT_ZONES=[
    {key:"frigo",       label:"Frigo",         icon:"🧊",min:0,  max:5,   minT:0,  maxT:5},
    {key:"congelatore", label:"Congelatore",    icon:"❄️",min:-20,max:-15, minT:-20,maxT:-15},
    {key:"abbattitore", label:"Abbattitore",    icon:"🌡",min:-18,max:3,   minT:-18,maxT:3},
    {key:"banco",       label:"Banco Pesce",    icon:"🐟",min:0,  max:4,   minT:0,  maxT:4},
    {key:"cucina",      label:"Cucina (cotto)", icon:"🔥",min:70, max:100, minT:70, maxT:100},
  ];
  const [zonesRaw,setZonesRaw]=useState(()=>{
    try{const s=localStorage.getItem(`haccp-zones-${kitchen?.id}`); return s?JSON.parse(s):DEFAULT_ZONES;}catch{return DEFAULT_ZONES;}
  });
  const [editZone,setEditZone]=useState<any>(null); // null=chiuso, {}=nuovo, {key}=edit
  const ZONES=zonesRaw.map((z:any)=>({...z,ok:(v:number)=>v>=z.minT&&v<=z.maxT}));
  const saveZones=(nz:any[])=>{setZonesRaw(nz);localStorage.setItem(`haccp-zones-${kitchen?.id}`,JSON.stringify(nz));};

  const CHECKLIST=[
    "Controllo temperature frigo (mattina)","Controllo temperature congelatore",
    "Verifica scadenze FIFO","Sanificazione piani lavoro","Sanificazione attrezzature",
    "Abbigliamento operatori conforme","Integrità confezioni","Registrazione lotti",
    "Smaltimento rifiuti organici","Controllo visivo infestanti",
  ];

  function logTemp(){
    if(!form.temp){toast("Inserisci temperatura","error");return;}
    const z=ZONES.find(x=>x.key===form.zona);
    const tv=parseFloat(form.temp);
    const pass=z?z.ok(tv):true;
    setLogs(p=>[{id:genId(),zona:form.zona,temp:tv,op:form.op,note:form.note,at:nowISO(),ok:pass},...p]);
    toast(pass?"✓ Registrata":"⚠ Fuori range — log salvato",pass?"success":"error");
    setForm(p=>({...p,temp:"",note:""}));
  }

  const items=allItems();
  const expired=items.filter(x=>x.expiresAt&&new Date(x.expiresAt)<new Date());
  const critical=items.filter(x=>{const h=hoursUntil(x.expiresAt);return h!==null&&h>0&&h<=24;});
  const lots=items.filter(x=>x.lot);
  const scoreOk=Object.values(checks).filter(Boolean).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {(expired.length>0||critical.length>0)&&(
        <div style={{padding:"12px 16px",borderRadius:12,border:`1.5px solid ${t.danger}`,background:t.accentGlow,display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            {expired.length>0&&<div className="mono" style={{fontSize:10,color:t.danger,letterSpacing:"0.06em"}}>{expired.length} PRODOTTI SCADUTI — RIMUOVERE</div>}
            {critical.length>0&&<div className="mono" style={{fontSize:10,color:t.warning,marginTop:2}}>{critical.length} SCADONO ENTRO 24H</div>}
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[{k:"temperatura",l:"🌡 Temperature"},{k:"checklist",l:`✅ Checklist (${scoreOk}/${CHECKLIST.length})`},{k:"lotti",l:`🏷 Lotti (${lots.length})`},{k:"semilavorati",l:"🏷 Semilavorati"},{k:"ia",l:"🛡 IA Compliance"}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
            background:tab===k?`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`:t.bgCard,
            color:tab===k?"#fff":t.inkMuted,boxShadow:`0 1px 4px ${t.shadow}`,transition:"all 0.2s"}}>{l}</button>
        ))}
      </div>

      {showHACCPAI&&<HACCPAIPanel kitchen={kitchen} logs={logs} t={t} onClose={()=>setShowHACCPAI(false)}/>}

      {tab==="semilavorati"&&<SemilavView t={t} kitchen={kitchen} allItems={allItems} toast={toast}/>}
      {tab==="ia"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:"20px 22px",borderRadius:14,background:`linear-gradient(135deg,${t.secondary}22,${t.bgCard})`,border:`1px solid ${t.secondary}44`}}>
            <div style={{fontFamily:"var(--serif)",fontSize:15,fontStyle:"italic",color:t.ink,marginBottom:8}}>🛡 HACCP Compliance Intelligence</div>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkMuted,lineHeight:1.7,marginBottom:16}}>Analizza log temperatura, scaduti e CCP per identificare deviazioni e suggerire azioni correttive secondo Reg. CE 852/2004.</div>
            <button onClick={()=>setShowHACCPAI(true)} style={{padding:"12px 24px",borderRadius:10,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,color:"#fff",fontFamily:"var(--mono)",fontSize:11}}>🛡 Avvia Verifica HACCP AI</button>
          </div>
          {(logs||[]).filter(l=>!l.ok).length>0&&(
            <div style={{padding:"12px 16px",borderRadius:10,background:t.accentGlow,border:`1px solid ${t.danger}44`}}>
              <div className="mono" style={{fontSize:9,color:t.danger,marginBottom:4}}>⚠ TEMPERATURE FUORI RANGE</div>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.danger}}>{(logs||[]).filter(l=>!l.ok).length} rilevazioni non conformi — verifica immediata</div>
            </div>
          )}
        </div>
      )}

      {tab==="temperatura"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* GESTISCI ZONE */}
          {canEdit&&editZone!==null&&(
            <div style={{padding:"16px",borderRadius:14,border:`1px solid ${t.gold}`,background:t.bgCard,display:"flex",flexDirection:"column",gap:10}}>
              <div className="mono" style={{fontSize:10,color:t.gold,letterSpacing:"0.1em"}}>{editZone.key?"✎ MODIFICA ZONA":"+ NUOVA ZONA"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span className="mono" style={{fontSize:8,color:t.inkFaint}}>NOME</span>
                  <input value={editZone.label||""} onChange={e=>setEditZone((p:any)=>({...p,label:e.target.value}))}
                    placeholder="es. Frigo 2" style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span className="mono" style={{fontSize:8,color:t.inkFaint}}>ICONA</span>
                  <input value={editZone.icon||""} onChange={e=>setEditZone((p:any)=>({...p,icon:e.target.value}))}
                    placeholder="🧊" style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontSize:18,width:60}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span className="mono" style={{fontSize:8,color:t.inkFaint}}>TEMP MIN (°C)</span>
                  <input type="number" value={editZone.minT??""} onChange={e=>setEditZone((p:any)=>({...p,minT:parseFloat(e.target.value)||0,min:parseFloat(e.target.value)||0}))}
                    style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <span className="mono" style={{fontSize:8,color:t.inkFaint}}>TEMP MAX (°C)</span>
                  <input type="number" value={editZone.maxT??""} onChange={e=>setEditZone((p:any)=>({...p,maxT:parseFloat(e.target.value)||0,max:parseFloat(e.target.value)||0}))}
                    style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:11}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setEditZone(null)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>Annulla</button>
                {editZone.key&&<button onClick={()=>{saveZones(zonesRaw.filter((z:any)=>z.key!==editZone.key));setEditZone(null);toast("Zona eliminata","success");}} style={{padding:"6px 14px",borderRadius:8,border:"none",background:t.danger+"22",color:t.danger,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>🗑 Elimina</button>}
                <button onClick={()=>{
                  if(!editZone.label?.trim()){toast("Inserisci un nome","error");return;}
                  const k=editZone.key||(editZone.label.toLowerCase().replace(/\s+/g,"-")+"-"+Date.now());
                  if(editZone.key){saveZones(zonesRaw.map((z:any)=>z.key===editZone.key?{...editZone,key:k}:z));}
                  else{saveZones([...zonesRaw,{...editZone,key:k}]);}
                  setEditZone(null);toast("Zona salvata","success");
                }} style={{padding:"6px 14px",borderRadius:8,border:"none",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>✓ Salva</button>
              </div>
            </div>
          )}
          {/* PANNELLI RAPIDI PER ZONA */}
          {canEdit&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,width:"100%"}}>
              {ZONES.map(z=>{
                const lastLog=logs.filter(l=>l.zona===z.key)[0];
                const zTemp=zTemps[z.key]||"";
                const setZTemp=(v:string)=>setZTemps(p=>({...p,[z.key]:v}));
                const tv=parseFloat(zTemp);
                const isOk=zTemp?z.ok(tv):null;
                return(
                  <div key={z.key} style={{borderRadius:14,border:`2px solid ${isOk===false?t.danger:isOk===true?t.success:t.div}`,background:t.bgCard,padding:"14px 16px",display:"flex",flexDirection:"column",gap:8,transition:"border 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:22}}>{z.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.08em",color:t.ink}}>{z.label.toUpperCase()}</div>
                        <div className="mono" style={{fontSize:8,color:t.inkFaint}}>{z.minT}÷{z.maxT}°C</div>
                      </div>
                      <button onClick={()=>setEditZone({...zonesRaw.find((x:any)=>x.key===z.key)})} style={{padding:"5px 9px",borderRadius:6,border:`1px solid ${t.div}`,background:"transparent",color:t.inkFaint,fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>✎</button>
                    </div>
                    {lastLog&&<div style={{fontFamily:"var(--mono)",fontSize:11,color:lastLog.ok?t.success:t.danger}}>Ultima: {lastLog.temp}°C {lastLog.ok?"✅":"⚠️"}</div>}
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input value={zTemp} onChange={e=>setZTemp(e.target.value)} type="number" placeholder="°C"
                        style={{flex:1,minWidth:0,padding:"6px 8px",borderRadius:8,border:`1px solid ${isOk===false?t.danger:isOk===true?t.success:t.div}`,background:t.bgAlt,color:t.ink,fontFamily:"var(--mono)",fontSize:14,outline:"none",textAlign:"center"}}/>
                      <button onClick={()=>{
                        if(!zTemp)return;
                        const pass=z.ok(tv);
                        setLogs(p=>[{id:genId(),zona:z.key,temp:tv,op:form.op||"",note:"",at:nowISO(),ok:pass},...p]);
                        setZTemp("");
                        toast(pass?`✓ ${z.label}: ${tv}°C`:`⚠ ${z.label}: ${tv}°C fuori range`,pass?"success":"error");
                      }} style={{padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",flexShrink:0,background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:12}}>✓</button>
                    </div>
                  </div>
                );
              })}
              <div onClick={()=>setEditZone({label:"",icon:"🌡",minT:0,maxT:5,min:0,max:5})}
                style={{borderRadius:14,border:`2px dashed ${t.div}`,background:"transparent",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8,alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:0.6,minHeight:120}}>
                <span style={{fontSize:22}}>＋</span>
                <span className="mono" style={{fontSize:9,color:t.inkMuted}}>AGGIUNGI ZONA</span>
              </div>
            </div>
          )}
          {/* OPERATORE + EXPORT */}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <LuxInput value={form.op} onChange={e=>setForm(p=>({...p,op:e.target.value}))} placeholder="👤 Operatore (per tutte le rilevazioni)" t={t} style={{flex:1,minWidth:180}}/>
            <button onClick={()=>{
              const rows=[["Data","Ora","Zona","Temperatura","Operatore","OK","Note"],
                ...logs.map(l=>[l.at?.slice(0,10)||"",l.at?.slice(11,16)||"",l.zona,l.temp,l.op||"",l.ok?"SI":"NO",l.note||""])];
              const csv=rows.map(r=>r.join(";")).join("\n");
              const a=document.createElement("a");
              a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
              a.download=`haccp-temperature-${todayDate()}.csv`;
              a.click();
            }} style={{padding:"8px 16px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",background:t.bgCard,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>
              ⬇ Esporta CSV
            </button>
          </div>
          {/* STORICO */}
          <Card t={t}>
            <CardHeader t={t} title="Storico temperature" right={<Badge label={`${logs.length} log`} color={t.inkMuted} bg={t.bgAlt}/>}/>
            <div>
              {logs.length===0&&<div style={{padding:"24px 22px",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center"}}>Nessuna rilevazione</div>}
              {logs.slice(0,40).map((log,i)=>{const z=ZONES.find(x=>x.key===log.zona);return(
                <div key={log.id} style={{padding:"10px 22px",display:"flex",gap:12,alignItems:"center",borderBottom:i<Math.min(logs.length,40)-1?`1px solid ${t.div}`:undefined,background:log.ok?"transparent":t.danger+"08"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{z?.icon||"🌡"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{z?.label||log.zona}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{(log.at||"").slice(0,16).replace("T"," ")} · {log.op||"—"}</div>
                  </div>
                  <span style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:600,color:log.ok?t.success:t.danger}}>{log.temp}°C</span>
                  <span style={{fontSize:16}}>{log.ok?"✅":"⚠️"}</span>
                  <button onClick={()=>setLogs(p=>p.filter(l=>l.id!==log.id))} style={{padding:"2px 7px",borderRadius:6,border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",color:t.inkFaint,fontSize:10,marginLeft:4}}>×</button>
                </div>
              );})}
            </div>
          </Card>
        </div>
      )}

      {tab==="checklist"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderRadius:12,
            background:scoreOk===CHECKLIST.length?t.success+"15":t.bgCard,
            border:`1px solid ${scoreOk===CHECKLIST.length?t.success+"55":t.div}`}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>
                {scoreOk===CHECKLIST.length?"✅ Checklist completata":"Checklist HACCP — "+todayDate()}
              </div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>{scoreOk}/{CHECKLIST.length} completati</div>
            </div>
            <svg viewBox="0 0 36 36" style={{transform:"rotate(-90deg)",width:52,height:52,flexShrink:0}}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={t.div} strokeWidth="2.5"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={t.success} strokeWidth="2.5"
                strokeDasharray={`${(scoreOk/CHECKLIST.length)*100} 100`} strokeLinecap="round"/>
            </svg>
          </div>
          <Card t={t}>
            {CHECKLIST.map((item,i)=>(
              <div key={i} onClick={()=>setChecks(p=>({...p,[i]:!p[i]}))}
                style={{padding:"13px 22px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",
                  borderBottom:i<CHECKLIST.length-1?`1px solid ${t.div}`:undefined,
                  background:checks[i]?t.success+"08":"transparent",transition:"background 0.15s"}}>
                <div style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${checks[i]?t.success:t.div}`,
                  background:checks[i]?t.success:"transparent",display:"flex",alignItems:"center",
                  justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                  {checks[i]&&<span style={{color:"#fff",fontSize:13,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,
                  color:checks[i]?t.inkMuted:t.ink,textDecoration:checks[i]?"line-through":"none",transition:"all 0.2s"}}>
                  {item}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab==="lotti"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {expired.length>0&&(
            <Card t={t} glow>
              <CardHeader t={t} title="⚠ SCADUTI" right={<Badge label={`${expired.length}`} color="#fff" bg={t.danger}/>}/>
              <div>
                {expired.map((item,i)=>(
                  <div key={item.id} style={{padding:"10px 22px",display:"flex",gap:12,alignItems:"center",
                    borderBottom:i<expired.length-1?`1px solid ${t.div}`:undefined}}>
                    <span style={{fontSize:18}}>{LOCATION_ICONS[item.location]||"📦"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.danger,fontWeight:500}}>{item.name}</div>
                      <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>Scad: {fmtDate(item.expiresAt)} · {item.location}{item.lot?` · Lotto: ${item.lot}`:""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card t={t}>
            <CardHeader t={t} title="Lotti registrati" right={<Badge label={`${lots.length}`} color={t.secondary} bg={t.goldFaint}/>}/>
            <div>
              {lots.length===0&&<div style={{padding:"24px 22px",color:t.inkFaint,fontFamily:"var(--serif)",fontStyle:"italic",textAlign:"center"}}>Nessun lotto — aggiungi il campo lotto al caricamento stock</div>}
              {lots.map((item,i)=>(
                <div key={item.id} style={{padding:"10px 22px",display:"flex",gap:12,alignItems:"center",borderBottom:i<lots.length-1?`1px solid ${t.div}`:undefined}}>
                  <span style={{fontSize:16}}>{LOCATION_ICONS[item.location]||"📦"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{item.name}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
                      Lotto: {item.lot} · {item.quantity} {item.unit} · {item.location}
                      {item.expiresAt&&` · Scad: ${fmtDate(item.expiresAt)}`}
                    </div>
                  </div>
                  {expiryBadge(item.expiresAt)&&<Badge {...expiryBadge(item.expiresAt)}/>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   FOOD COST VIEW — ricette, food cost %, waste log
   ════════════════════════════════════════════════════════ */
function FoodCostViewFull({ t }) {
  const { kitchen, allItems, currentRole } = useK();
  const toast = useToast();
  const canEdit = CAN_EDIT.includes(currentRole());
  const [tab,setTab]=useState("ricette");
  const [ricette,setRicette]=useState(()=>{try{return JSON.parse(localStorage.getItem(`fc-r-${kitchen?.id}`)||"[]");}catch{return[];}});
  const [waste,setWaste]=useState(()=>{try{return JSON.parse(localStorage.getItem(`fc-w-${kitchen?.id}`)||"[]");}catch{return[];}});
  const [showR,setShowR]=useState(false);
  const [showW,setShowW]=useState(false);
  const [pickFC,setPickFC]=useState(false);
  const [formR,setFormR]=useState({nome:"",prezzo:"",ing:[{id:genId(),nome:"",qty:"",unit:"kg",costo:""}]});
  const [formW,setFormW]=useState({prodotto:"",qty:"",unit:"kg",motivo:"scaduto",costo:""});

  useEffect(()=>{try{localStorage.setItem(`fc-r-${kitchen?.id}`,JSON.stringify(ricette));}catch{}},[ricette,kitchen?.id]);
  useEffect(()=>{try{localStorage.setItem(`fc-w-${kitchen?.id}`,JSON.stringify(waste));}catch{}},[waste,kitchen?.id]);

  function calcCosto(r){return (r.ing||[]).reduce((s,i)=>s+(parseFloat(i.costo)||0)*(parseFloat(i.qty)||0),0);}
  function calcFC(r){const c=calcCosto(r),p=parseFloat(r.prezzo)||0;if(!p)return null;return ((c/p)*100).toFixed(1);}
  function fcColor(pct){return !pct?t.inkMuted:parseFloat(pct)<=25?t.success:parseFloat(pct)<=35?t.warning:t.danger;}

  const valStock=(()=>{const items=allItems();return items.filter(x=>x.prezzoUnitario).reduce((s,x)=>s+(x.prezzoUnitario||0)*x.quantity,0);})();
  const totWaste=waste.reduce((s,x)=>s+(parseFloat(x.costo)||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
        {[
          {l:"VALORE STOCK",v:`€${valStock.toFixed(0)}`,c:t.gold},
          {l:"RICETTE",     v:ricette.length,            c:t.secondary},
          {l:"SPRECHI",     v:`€${totWaste.toFixed(0)}`, c:waste.length?t.danger:t.inkFaint},
        ].map((k,i)=>(
          <Card key={i} t={t} style={{padding:"16px 20px"}}>
            <div className="mono" style={{fontSize:8,letterSpacing:"0.16em",color:t.inkFaint,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:26,fontWeight:400,fontFamily:"var(--serif)",color:k.c,lineHeight:1}}>{k.v}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[{k:"ricette",l:`📋 Ricette (${ricette.length})`},{k:"waste",l:`🗑 Sprechi (${waste.length})`}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"var(--mono)",fontSize:10,
            background:tab===k?`linear-gradient(135deg,${t.accent},${t.accentDeep})`:t.bgCard,
            color:tab===k?"#fff":t.inkMuted,transition:"all 0.2s"}}>{l}</button>
        ))}
        {canEdit&&tab==="ricette"&&<button onClick={()=>setShowR(f=>!f)} style={{marginLeft:"auto",padding:"8px 18px",borderRadius:10,cursor:"pointer",background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10}}>+ Ricetta</button>}
        {canEdit&&tab==="waste"&&<button onClick={()=>setShowW(f=>!f)} style={{marginLeft:"auto",padding:"8px 18px",borderRadius:10,cursor:"pointer",background:`linear-gradient(135deg,${t.accent},${t.accentDeep})`,color:"#fff",fontFamily:"var(--mono)",fontSize:10}}>+ Spreco</button>}
      </div>

      {/* RICETTE */}
      {tab==="ricette"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {showR&&canEdit&&(
            <Card t={t} style={{padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint}}>NUOVA RICETTA</div>
                {BRIDGE?.recipes?.length>0 && <button onClick={()=>setPickFC(true)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,border:`1px dashed ${t.gold}`,cursor:"pointer",
                  background:t.goldFaint,color:t.gold,fontFamily:"var(--mono)",fontSize:10}}>📖 Da ricettario</button>}
              </div>
              {pickFC && <RecipePickerKP t={t} onClose={()=>setPickFC(false)} onPick={(r,dose)=>{
                const stock = allItems();
                const ing = (r.ingredients||[]).filter(i=>i.quantity!=null).map(i=>{
                  const u=(i.unit||"").toLowerCase();
                  const toKg = u==="g"||u==="ml" ? 1/1000 : 1;
                  const unit = u==="g"?"kg":u==="ml"?"l":(i.unit||"pz");
                  const si = stock.find(s=>s.name.toLowerCase()===i.name.toLowerCase() && s.prezzoUnitario);
                  return {id:genId(), nome:i.name, qty:String(Math.round(i.quantity*dose*toKg*1000)/1000), unit, costo: si?String(si.prezzoUnitario):""};
                });
                setFormR(p=>({...p, nome: p.nome || r.name, ing: ing.length?ing:p.ing}));
                setPickFC(false);
                toast(`Ricetta «${r.name}» importata: completa i costi mancanti`,"success");
              }}/>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <LuxInput value={formR.nome} onChange={e=>setFormR(p=>({...p,nome:e.target.value}))} placeholder="Nome piatto" t={t} style={{gridColumn:"1/-1"}}/>
                <LuxInput value={formR.prezzo} onChange={e=>setFormR(p=>({...p,prezzo:e.target.value}))} type="number" placeholder="Prezzo vendita (€)" t={t}/>
              </div>
              <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:8}}>INGREDIENTI</div>
              {formR.ing.map((ing,i)=>(
                <div key={ing.id} style={{display:"grid",gridTemplateColumns:"1fr 60px 55px 75px 28px",gap:6,marginBottom:6}}>
                  <LuxInput value={ing.nome} onChange={e=>setFormR(p=>({...p,ing:p.ing.map((x,j)=>j!==i?x:{...x,nome:e.target.value})}))} placeholder="Ingrediente" t={t}/>
                  <LuxInput value={ing.qty} onChange={e=>setFormR(p=>({...p,ing:p.ing.map((x,j)=>j!==i?x:{...x,qty:e.target.value})}))} type="number" placeholder="Qtà" t={t}/>
                  <LuxSelect value={ing.unit} onChange={e=>setFormR(p=>({...p,ing:p.ing.map((x,j)=>j!==i?x:{...x,unit:e.target.value})}))} t={t}>
                    {["kg","g","l","ml","pz"].map(u=><option key={u} value={u}>{u}</option>)}
                  </LuxSelect>
                  <LuxInput value={ing.costo} onChange={e=>setFormR(p=>({...p,ing:p.ing.map((x,j)=>j!==i?x:{...x,costo:e.target.value})}))} type="number" placeholder="€/u" t={t}/>
                  <button onClick={()=>setFormR(p=>({...p,ing:p.ing.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:16,alignSelf:"center"}}>✕</button>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={()=>setFormR(p=>({...p,ing:[...p.ing,{id:genId(),nome:"",qty:"",unit:"kg",costo:""}]}))} style={btnSmall(t)}>+ Ingrediente</button>
                <Btn t={t} variant="gold" onClick={()=>{if(!formR.nome){toast("Nome obbligatorio","error");return;}setRicette(p=>[{...formR,id:genId(),createdAt:nowISO()},...p]);toast(`${formR.nome} salvata`,"success");setFormR({nome:"",prezzo:"",ing:[{id:genId(),nome:"",qty:"",unit:"kg",costo:""}]});setShowR(false);}}>Salva</Btn>
                <Btn t={t} variant="ghost" onClick={()=>setShowR(false)}>Annulla</Btn>
              </div>
            </Card>
          )}
          {ricette.length===0&&!showR&&<div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}><div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic",marginBottom:8}}>Nessuna ricetta</div></div>}
          {ricette.map(r=>{
            const costo=calcCosto(r),pct=calcFC(r),prezzo=parseFloat(r.prezzo)||0;
            return (
              <Card key={r.id} t={t} style={{padding:0}}>
                <div style={{padding:"16px 22px",display:"flex",alignItems:"center",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:16,color:t.ink,fontWeight:500,marginBottom:4}}>{r.nome}</div>
                    <div className="mono" style={{fontSize:9,color:t.inkFaint}}>
                      Costo: €{costo.toFixed(2)} · Prezzo: €{prezzo.toFixed(2)} · Margine: €{(prezzo-costo).toFixed(2)}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
                      {(r.ing||[]).map(i=><Badge key={i.id} label={`${i.nome} ${i.qty}${i.unit}`} color={t.inkMuted} bg={t.bgAlt}/>)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {pct&&<div style={{fontFamily:"var(--mono)",fontSize:26,fontWeight:700,color:fcColor(pct),lineHeight:1}}>{pct}%</div>}
                    {pct&&<div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>Food Cost</div>}
                    {canEdit&&<button onClick={()=>setRicette(p=>p.filter(x=>x.id!==r.id))} style={{...btnSmall(t),background:t.accentGlow,color:t.danger,marginTop:8}}>✕</button>}
                  </div>
                </div>
                {pct&&<div style={{height:4,background:t.bgAlt}}><div style={{height:"100%",width:`${Math.min(parseFloat(pct),100)}%`,background:fcColor(pct),transition:"width 0.8s"}}/></div>}
              </Card>
            );
          })}
        </div>
      )}

      {/* SPRECHI */}
      {tab==="waste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {showW&&canEdit&&(
            <Card t={t} style={{padding:20}}>
              <div className="mono" style={{fontSize:8,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:12}}>REGISTRA SPRECO</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <LuxInput value={formW.prodotto} onChange={e=>setFormW(p=>({...p,prodotto:e.target.value}))} placeholder="Prodotto" t={t} style={{gridColumn:"1/-1"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <LuxInput value={formW.qty} onChange={e=>setFormW(p=>({...p,qty:e.target.value}))} type="number" placeholder="Quantità" t={t}/>
                  <LuxSelect value={formW.unit} onChange={e=>setFormW(p=>({...p,unit:e.target.value}))} t={t}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</LuxSelect>
                </div>
                <LuxSelect value={formW.motivo} onChange={e=>setFormW(p=>({...p,motivo:e.target.value}))} t={t}>
                  {["scaduto","danneggiato","errore","overproduction","altro"].map(m=><option key={m} value={m}>{m}</option>)}
                </LuxSelect>
                <LuxInput value={formW.costo} onChange={e=>setFormW(p=>({...p,costo:e.target.value}))} type="number" placeholder="Costo stimato €" t={t}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn t={t} variant="danger" onClick={()=>{if(!formW.prodotto||!formW.qty){toast("Compila prodotto e quantità","error");return;}setWaste(p=>[{...formW,id:genId(),at:nowISO()},...p]);toast("Spreco registrato","success");setFormW({prodotto:"",qty:"",unit:"kg",motivo:"scaduto",costo:""});setShowW(false);}}>Registra</Btn>
                <Btn t={t} variant="ghost" onClick={()=>setShowW(false)}>Annulla</Btn>
              </div>
            </Card>
          )}
          {waste.length===0&&!showW&&<div style={{textAlign:"center",padding:"48px 0",color:t.inkFaint}}><div style={{fontFamily:"var(--serif)",fontSize:18,fontStyle:"italic"}}>Nessuno spreco registrato</div></div>}
          {waste.map((w,i)=>(
            <Card key={w.id} t={t} style={{padding:"12px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>🗑</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>{w.prodotto}</div>
                  <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:2}}>
                    {w.qty} {w.unit} · {w.motivo} · {(w.at||"").slice(0,10)}
                  </div>
                </div>
                {w.costo&&<div className="mono" style={{fontSize:14,color:t.danger,fontWeight:700}}>-€{parseFloat(w.costo).toFixed(2)}</div>}
                {canEdit&&<button onClick={()=>setWaste(p=>p.filter(x=>x.id!==w.id))} style={{...btnSmall(t),background:t.accentGlow,color:t.danger}}>✕</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   BRIGATA VIEW
   ════════════════════════════════════════════════════════ */
function BrigataView({ t }) {
  const { state, kitchen, addMember, updateRole, removeMember, currentRole, selectMember } = useK();
  const toast = useToast();
  const isAdmin = currentRole()==="admin";

  const [name,setName] = useState("");
  const [role,setRole] = useState("commis");

  if(!kitchen) return null;
  const members = kitchen.members||[];

  const ROLE_STYLE = {
    admin:         {color:"#fff", bg:"#C19A3E"},
    chef:          {color:"#fff", bg:"#8B1E2F"},
    "sous-chef":   {color:"#fff", bg:"#8B1E2F"},
    "capo-partita":{color:"#fff", bg:"#8B1E2F"},
    commis:        {color:"#555", bg:"rgba(0,0,0,0.08)"},
    stagista:      {color:"#555", bg:"rgba(0,0,0,0.08)"},
    staff:         {color:"#555", bg:"rgba(0,0,0,0.08)"},
    fb:            {color:"#555", bg:"rgba(0,0,0,0.08)"},
    mm:            {color:"#555", bg:"rgba(0,0,0,0.08)"},
  };

  function doAdd() {
    if(!name.trim()){toast("Inserisci un nome","error");return;}
    addMember(name,role);
    toast(`${name} aggiunto alla brigata`,"success");
    setName("");
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Current user */}
      <Card t={t} style={{padding:"14px 22px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"var(--serif)",fontSize:16,fontWeight:600}}>
          {(members.find(m=>m.id===state.selectedMemberId)||members[0])?.name?.[0]||"?"}
        </div>
        <div>
          <div style={{fontFamily:"var(--serif)",fontSize:14,fontWeight:500,color:t.ink}}>
            {(members.find(m=>m.id===state.selectedMemberId)||members[0])?.name||"—"}
          </div>
          <div className="mono" style={{fontSize:8,letterSpacing:"0.1em",color:t.inkFaint}}>UTENTE CORRENTE · {currentRole().toUpperCase()}</div>
        </div>
        <div style={{flex:1}}/>
        <div style={{fontSize:9,fontFamily:"var(--mono)",color:t.inkFaint}}>Accedi come:</div>
        <LuxSelect value={state.selectedMemberId||""} onChange={e=>selectMember(e.target.value)} t={t} style={{width:160}}>
          {members.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
        </LuxSelect>
      </Card>

      {isAdmin&&(
        <Card t={t} style={{padding:20}}>
          <div className="mono" style={{fontSize:9,letterSpacing:"0.14em",color:t.inkFaint,marginBottom:14}}>AGGIUNGI MEMBRO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10}}>
            <LuxInput value={name} onChange={e=>setName(e.target.value)} placeholder="Nome e cognome" t={t}/>
            <LuxSelect value={role} onChange={e=>setRole(e.target.value)} t={t}>
              {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
            </LuxSelect>
            <Btn t={t} onClick={doAdd} disabled={!name.trim()}>Aggiungi</Btn>
          </div>
        </Card>
      )}

      <Card t={t}>
        <CardHeader t={t} title={`Brigata (${members.length})`}/>
        <div>
          {members.map((m,i)=>{
            const rs = ROLE_STYLE[m.role]||ROLE_STYLE.staff;
            return (
              <div key={m.id} style={{padding:"14px 22px",display:"flex",alignItems:"center",gap:14,borderBottom:i<members.length-1?`1px solid ${t.div}`:"none"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"var(--serif)",fontSize:14,fontWeight:600,flexShrink:0}}>
                  {m.name[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--serif)",fontSize:14,fontWeight:500,color:t.ink}}>{m.name}</div>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint}}>Dal {m.joinedAt?.slice(0,10)||"—"}</div>
                </div>
                {isAdmin&&m.role!=="admin"?(
                  <LuxSelect value={m.role} onChange={e=>updateRole(m.id,e.target.value)} t={t} style={{width:140}}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </LuxSelect>
                ):(
                  <Badge label={m.role.toUpperCase()} color={rs.color} bg={rs.bg}/>
                )}
                {isAdmin&&m.role!=="admin"&&(
                  <button onClick={()=>{if(confirm(`Rimuovi ${m.name}?`))removeMember(m.id);}} style={{...btnSmall(t),background:t.accentGlow,color:t.danger}}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SETTINGS VIEW
   ════════════════════════════════════════════════════════ */
function SettingsView({ t }) {
  const { state, kitchen, createKitchen, selectKitchen, setParCategory, currentRole } = useK();
  const toast = useToast();
  const isAdmin = currentRole()==="admin";

  const [newName, setNewName] = useState("");
  const [newOwner,setNewOwner] = useState("");

  const parKeys = Object.keys(PAR_PRESET);
  const currentPar = kitchen?.parByCategory||{};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <KitchenBridgeCard t={t}/>
      {false && <Card t={t}>
        <CardHeader t={t} title="Cucine"/>
        <div style={{padding:20}}>
          {kitchen?.code&&<div style={{marginBottom:16,padding:"12px 16px",borderRadius:10,background:"#1a2744",display:"flex",alignItems:"center",gap:12}}><span className="mono" style={{fontSize:9,color:"#888",letterSpacing:"0.15em"}}>CODICE CUCINA</span><span className="mono" style={{fontSize:18,color:"#C19A3E",fontWeight:700,letterSpacing:"0.2em"}}>{kitchen.code}</span><span style={{fontSize:10,color:"#666"}}>— condividilo con il team</span></div>}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            {state.kitchens.map(k=>(
              <button key={k.id} onClick={()=>selectKitchen(k.id)} style={{
                padding:"8px 18px",borderRadius:10,cursor:"pointer",
                fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
                background:(state.selectedKitchenId||state.kitchens[0]?.id)===k.id?`linear-gradient(135deg,${t.gold},${t.goldBright})`:`${t.bgAlt}`,
                color:(state.selectedKitchenId||state.kitchens[0]?.id)===k.id?"#fff":t.inkMuted,
                border:`1px solid ${t.div}`,
              }}>{k.name}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10}}>
            <LuxInput value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nuova cucina" t={t}/>
            <LuxInput value={newOwner} onChange={e=>setNewOwner(e.target.value)} placeholder="Admin" t={t}/>
            <Btn t={t} onClick={()=>{createKitchen(newName,newOwner);setNewName("");setNewOwner("");toast("Cucina creata","success");}} disabled={!newName.trim()}>Crea</Btn>
          </div>
        </div>
      </Card>}

      {/* Par levels */}
      {isAdmin&&(
        <Card t={t}>
          <CardHeader t={t} title="Livelli PAR per categoria"/>
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {parKeys.map(key=>(
                <div key={key}>
                  <div className="mono" style={{fontSize:8,letterSpacing:"0.12em",color:t.inkFaint,marginBottom:4}}>{(CATEGORIES[key]?.label||key).toUpperCase()}</div>
                  <LuxInput
                    value={currentPar[key]??PAR_PRESET[key]??0}
                    onChange={e=>setParCategory(key,e.target.value)}
                    type="number" t={t}
                    style={{padding:"7px 10px",fontSize:12}}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   AI ASSISTANT PANEL
   ════════════════════════════════════════════════════════ */
function AIPanel({ t, onClose }) {
  const { allItems, stockAdd, removeItem, adjustItem, prepAdd, kitchen } = useK();
  const [messages, setMessages] = useState([{role:"ai",text:"Ciao! Sono il tuo assistente cucina. Posso aiutarti con le giacenze, scadenze, e liste. Cosa vuoi sapere?"}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachImg, setAttachImg] = useState(null); // {base64, mimeType, name}
  const [editingOp, setEditingOp] = useState(null);
  const [pendingOps, setPendingOps] = useState<any[]|null>(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const speech = useSpeech(t2=>setInput(t2));

  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);

  async function send() {
    const msg=input.trim(); if(!msg)return;
    setInput("");
    setMessages(p=>[...p,{role:"user",text:msg}]);

    // Local intent parsing
    const lower=msg.toLowerCase();
    let reply=null;
    let ops_recap:any[]=[];

    const items=allItems();
    const now=new Date();

    // ── Parser +N item [in/al loc] e -N item ──────────────
    // Supporta: "+3 piccioni in congelatore +2 uova in frigo, -1kg filetto manzo"
    const locMap:{[k:string]:string}={frigo:"fridge",frigorifico:"fridge",fridge:"fridge",freezer:"freezer",congelatore:"freezer",dispensa:"dry",secco:"dry",banco:"counter",servizio:"counter"};
    const plusMinusPattern = /([+\-])\s*(\d+[\.,]?\d*)\s*(pz|kg|g|ml|l|vasch|cl|dl|hg)?\s+(?:di\s+)?([a-zA-Zàèìòùéáíóú][a-zA-Zàèìòùéáíóú\s']*?)(?:\s+(?:in|al|nel|nella|nel)\s+([a-zA-Zàèìòùéáíóú]+))?(?=[,+\-]|$)/gi;
    const matches=[...msg.matchAll(plusMinusPattern)];
    if(matches.length>0) {
      const ops:{sign:string,qty:number,unit:string,name:string,loc:string}[]=[];
      for(const m of matches){
        const sign=m[1], qty=parseFloat((m[2]||"1").replace(",",".")), unit=(m[3]||"pz").toLowerCase();
        const name=(m[4]||"").trim().replace(/\s+/g," ");
        const locRaw=(m[5]||"").toLowerCase();
        const loc=locMap[locRaw]||"fridge";
        if(name&&qty>0) ops.push({sign,qty,unit,name,loc});
      }
      if(ops.length>0){
        const pendingList=ops.map(({sign,qty,unit,name,loc})=>({
          type:sign==="+"?"add":"remove",
          name,qty,unit,loc,
        }));
        setPendingOps(pendingList);
        setMessages(p=>[...p,{role:"ai",text:`⚡ ${pendingList.length} operazion${pendingList.length===1?"e":"i"} — verifica e conferma:`}]);
        return;
      }
    }

    if(/cosa ho|giacenze|inventario|stock|quanti|quante|cosa ce|cosa ci|mostra tutto/.test(lower) && !/aggiungi|carica|rimuovi|scala/.test(lower)) {
      const byLoc:{[k:string]:any[]}={fridge:[],freezer:[],dry:[],counter:[]};
      items.forEach(x=>{ if(byLoc[x.location]) byLoc[x.location].push(x); });
      const locLabel:{[k:string]:string}={fridge:"Frigo",freezer:"Freezer",dry:"Dispensa",counter:"Banco"};
      const lines:string[]=[];
      Object.entries(byLoc).forEach(([loc,arr])=>{
        if(arr.length) lines.push(`${locLabel[loc]}: ${arr.map(x=>`${x.name} ${x.quantity}${x.unit}`).join(", ")}`);
      });
      reply=lines.length?lines.join("\n"):"Nessuna giacenza registrata.";
    } else if(/scadenz|urgenti|in scadenza|scad|cosa scade|cosa sta scadendo/.test(lower)) {
      const urgent=items.filter(x=>{ const h=hoursUntil(x.expiresAt); return h!==null&&h>0&&h<=72; });
      const expired=items.filter(x=>x.expiresAt&&new Date(x.expiresAt)<now);
      if(!urgent.length&&!expired.length) reply="✓ Nessuna scadenza urgente al momento.";
      else {
        const lines=[...expired.map(x=>`⛔ ${x.name} — SCADUTO`), ...urgent.map(x=>`⚠ ${x.name} — ${Math.round(hoursUntil(x.expiresAt))}h rimaste`)];
        reply=lines.join("\n");
      }
    } else if(/low|scorta bassa|sotto par|livello par|sotto livello|livello minimo|par level/.test(lower)) {
      const low=items.filter(x=>{ const par=x.parLevel??PAR_PRESET[x.category]??0; return par>0&&x.quantity<par; });
      if(!low.length) reply="✓ Tutti i livelli nella norma.";
      else reply=low.map(x=>`↓ ${x.name}: ${x.quantity} (par ${x.parLevel??PAR_PRESET[x.category]})`).join("\n");
    } else if(/aggiungi|carica/.test(lower)) {
      // Count numbers in message — if >1 item detected, use AI for multi-item parsing
      const numCount = (msg.match(/\d+/g)||[]).length;
      if(numCount > 1) {
        // Multi-item parser locale — zero API
        const locMap2:{[k:string]:string}={frigo:"fridge",frigorifico:"fridge",freezer:"freezer",congelatore:"freezer",dispensa:"dry",secco:"dry",banco:"counter"};
        const globalLocM=lower.match(/\b(frigo|frigorifico|freezer|congelatore|dispensa|secco|banco)\b/);
        const globalLoc=globalLocM?(locMap2[globalLocM[1]]||"fridge"):"fridge";
        const msgStripped=msg.replace(/^(aggiungi|carica|inserisci|metti)\s+/i,"");
        const parts=msgStripped.split(/\s+e\s+|,\s*|\s+poi\s+/i);
        const pendingMulti:{type:string,name:string,qty:number,unit:string,loc:string}[]=[];
        parts.forEach(part=>{
          const pm=part.toLowerCase().match(/(\d+[\.,]?\d*)\s*(pz|kg|g|ml|l)?\s+(?:di\s+)?([\w\s]+?)(?:\s+(?:al|in)\s+(frigo|frigorifico|freezer|congelatore|dispensa|banco))?\s*$/);
          if(pm){const qty=parseFloat(pm[1].replace(",","."));
            const name=pm[3].trim().replace(/\b(un|una|il|lo|la|i|gli|le)\b/gi,"").trim();
            const loc=pm[4]?(locMap2[pm[4]]||globalLoc):globalLoc;
            if(qty>0&&name.length>1) pendingMulti.push({type:'add',name,qty,unit:pm[2]||'pz',loc});
          }
        });
        if(pendingMulti.length>0){
          setPendingOps(pendingMulti);
          setMessages(p=>[...p,{role:"ai",text:`⚡ ${pendingMulti.length} prodott${pendingMulti.length===1?"o":"i"} — verifica e conferma:`}]);
          return;
        }
        reply="Non ho capito. Prova: \"aggiungi 3 uova e 2 filetti in frigo\x22"
      } else {
        // Single item — fast local parse
        const locMap={frigo:"fridge",frigorifico:"fridge",freezer:"freezer",congelatore:"freezer",dispensa:"dry",secco:"dry",banco:"counter"};
        // Regex estesa: quantità opzionale, unità opzionale, nome libero
        const stripped=lower.replace(/^(aggiungi|carica|inserisci|metti)\s+/,"");
        const m=stripped.match(/(\d+[\.,]?\d*)?\s*(pz|kg|g|ml|l)?\s+(?:di\s+)?(.+?)(?:\s+(?:al|in|nel|nella)\s+(frigo|frigorifico|freezer|congelatore|dispensa|secco|banco))?(?:\s+lotto\s+(\S+))?$/);
        if(m) {
          const qty=m[1]?parseFloat(m[1].replace(",",".")):1;
          const name=m[3].replace(/\s+(al|in|nel|nella)\s+(frigo|frigorifico|freezer|congelatore|dispensa|secco|banco)\s*$/i,"").trim();
          const locKey=m[4]||(lower.match(/\b(frigo|frigorifico|freezer|congelatore|dispensa|secco|banco)\b/)||[])[0]||"frigo";
          const loc=locMap[locKey]||"fridge";
          const lot=m[5]||undefined;
          if(name.length>1){
            setPendingOps([{type:'add',name,qty,unit:m[2]||"pz",loc,lot}]);
            setMessages(p=>[...p,{role:"ai",text:`⚡ Conferma aggiunta:`}]);
            return;
          }
        }
        if(!reply) reply="Non ho capito. Prova: \"aggiungi 3 polli in frigo\"";
      }
    } else if(/rimuovi|elimina/.test(lower)) {
      const name=lower
        .replace(/rimuovi|elimina/,"")
        .replace(/\b(un|una|il|lo|la|i|gli|le|del|dal)\b|dal frigo|dal congelatore|dalla dispensa|dal banco/gi,"")
        .trim();
      const found=items.find(x=>x.name.toLowerCase().includes(name.toLowerCase()));
      if(found){ removeItem(found.id); reply=`✓ ${found.name} rimosso.`; }
      else {
        // fallback: cerca parola più lunga
        const words=name.split(/\s+/).filter(w=>w.length>2);
        const found2=words.length?items.find(x=>words.some(w=>x.name.toLowerCase().includes(w))):null;
        if(found2){ removeItem(found2.id); reply=`✓ ${found2.name} rimosso.`; }
        else reply=`Non ho trovato "${name}" in magazzino.`;
      }
    } else if(/\b(scala|togli|preleva|usa|consuma|scarica)\b/.test(lower)) {
      // scala 2kg filetto dal frigo / togli 3 uova
      const stripped2=lower.replace(/^(scala|togli|preleva|usa|consuma|scarica)\s+/,"");
      const sm2=stripped2.match(/(\d+[\.,]?\d*)\s*(pz|kg|g|ml|l)?\s+(?:di\s+)?(.+?)(?:\s+(?:da[l]?|in|al|nel)\s+\S+)?$/);
      if(sm2){
        const qty=parseFloat(sm2[1].replace(",",".")); const name=sm2[3].trim();
        const found=items.find(x=>x.name.toLowerCase().includes(name.toLowerCase()));
        if(found){ adjustItem(found.id,-qty); reply=`✓ Scalati ${qty}${sm2[2]||"pz"} da ${found.name} (ora: ${Math.max(0,found.quantity-qty)}${found.unit}).`; }
        else reply=`Non ho trovato "${name}" in magazzino.`;
      } else reply="Non ho capito. Prova: \"scala 2 uova dal frigo\"";
    } else if(/\b(prepara|prep|metti in prep|aggiungi prep|preparazione)\b/.test(lower)) {
      // "prepara: maialino domani, anatra dopodomani"
      // "prepara 2kg fondo bruno per domani mattina"
      const dateMap:{[k:string]:number}={
        oggi:0, stasera:0, stamattina:0,
        domani:1, domanisera:1,
        dopodomani:2,
      };
      const stripped3=lower
        .replace(/^(prepara|prep|metti in prep|aggiungi prep|preparazione)[:\s]+/,"")
        .replace(/^metti\s+(.+?)\s+in\s+(?:prep|preparazione)\s*/i,"$1 ")
        .replace(/\s+in\s+(?:prep|preparazione)\s*$/i,"")
        .trim();
      // split su ", " o " e " o " poi "
      const prepParts=stripped3.split(/,\s*|\s+e\s+|\s+poi\s+/i);
      const done:string[]=[];
      prepParts.forEach(part=>{
        if(!part.trim()) return;
        // Estrai qty + unit + nome + data
        const pm2=part.match(/^(\d+[\.,]?\d*)?\s*(pz|kg|g|ml|l|porz|porzioni?)?\s*(?:di\s+)?(.+?)(?:\s+(?:per\s+)?(oggi|domani|dopodomani|tra\s+\d+\s+giorni|stasera|stamattina|domanisera))?(?:\s+(mattina|pomeriggio|sera))?$/i);
        if(pm2){
          const qty=pm2[1]?parseFloat(pm2[1].replace(",",".")):1;
          const unit=pm2[2]||"pz";
          const nome=(pm2[3]||"").trim().replace(/\s+(per\s+)?(oggi|domani|dopodomani|tra\s+\d+\s+giorni|stasera|stamattina)$/i,"").trim();
          const dateStr=(pm2[4]||"oggi").toLowerCase().trim();
          const turno=(pm2[5]||"mattina").toLowerCase();
          let daysAhead=dateMap[dateStr.replace(/\s+/g,"")] ?? 0;
          // gestisci "tra N giorni"
          const traMatch=dateStr.match(/tra\s+(\d+)\s+giorni/i);
          if(traMatch) daysAhead=parseInt(traMatch[1]);
          const scadeIso=daysAhead>0
            ? new Date(Date.now()+daysAhead*86400000).toISOString()
            : null;
          if(nome.length>1){
            // rileva partita dal testo se presente
            const partitaKeys=["antipasti","primi","secondi","pasticceria","colazioni","buffet","eventi"];
            const detectedPartita=partitaKeys.find(k=>lower.includes(k))||"antipasti";
            prepAdd(nome, qty, unit, detectedPartita, detectedPartita, turno, "", scadeIso);
            const dataLabel=daysAhead===0?"oggi":daysAhead===1?"domani":daysAhead===2?"dopodomani":`tra ${daysAhead}gg`;
            done.push(`✓ ${nome} (${qty}${unit}) — ${dataLabel} ${turno}`);
          }
        }
      });
      reply=done.length?done.join("\n"):"Non ho capito. Prova: \"prepara: maialino domani, anatra dopodomani\"";
    }

    // Intent: HACCP
    if(/haccp|conformit|ccp|non conform/.test(lower)) {
      const nonConf=(kitchen?.tempLogs||[]).filter(l=>!l.ok);
      const expiredC=items.filter(x=>x.expiresAt&&new Date(x.expiresAt)<now);
      if(!nonConf.length&&!expiredC.length) reply="✅ Nessuna non conformità HACCP. Temperature e scadenze nella norma.";
      else reply=`⚠ HACCP — ${nonConf.length} temp fuori range, ${expiredC.length} scaduti.\nVai in HACCP › IA per l'analisi completa.`;
    }
    else if(/briefing|brigata|mattino/.test(lower)) {
      reply="📢 Usa il widget Briefing AI nel Dashboard per il briefing completo della brigata.";
    }
    else if(/spreco|waste|scarti/.test(lower)) {
      const wl=kitchen?.wasteLog||[];
      reply=wl.length?`♻️ ${wl.length} voci spreco registrate. Usa Dashboard › Spreco AI per l'analisi completa.`:"Nessun dato spreco. Registra gli scarti per analisi AI.";
    }
    else if(/cosa cucinare|cosa posso fare|menu|ricetta/.test(lower)) {
      const sc=items.filter(x=>{const h=hoursUntil(x.expiresAt);return h!==null&&h>0&&h<=72;});
      reply=sc.length?`🍽 ${sc.length} prodotti in scadenza 72h: ${sc.slice(0,4).map(x=>x.name).join(", ")}…\nUsa Dashboard › Menu AI per i suggerimenti.`:"Nessun articolo in scadenza imminente.";
    }

    if(reply) { setMessages(p=>[...p,{role:"ai",text:reply}]); return; }

    // Claude API via callAI (cache 5min + retry + multimodale)
    setLoading(true);
    const preps = kitchen?.preps||[];
    const today = todayDate();
    const prepCtx = preps.filter(p=>p.status!=="done").slice(0,30).map(p=>`${p.nome} (${p.quantita}${p.unitaMisura||""} · ${p.partita||p.reparto||"—"} · scade: ${p.scadeIl||"?"} · stato: ${p.status||"pending"})`).join(", ");
    const ctx = `Cucina: ${kitchen?.name||"—"}. Oggi: ${today}. Giacenze: ${items.map(x=>`${x.name} ${x.quantity}${x.unit} (${x.location})`).join(", ").slice(0,800)}. Prep attive: ${prepCtx.slice(0,600)||"nessuna"}.`;
    const sys = `Sei LIA, assistente AI per cucine professionali Michelin. Rispondi SEMPRE in italiano, conciso (max 8 righe).

COMANDI CHE PUOI ESEGUIRE (rispondi confermando l'azione):
- "aggiungi X [qty] [unità] [in frigo/freezer/dispensa/banco]" → aggiunge a giacenze
- "scala/togli/usa X [qty]" → scala dalla giacenza
- "prepara X [qty] [per domani/dopodomani/lunedì]" → aggiunge a prep list con data
- "prepara: maialino domani, fondo bruno dopodomani, anatra per venerdì" → prep MULTIPLI con date diverse
- "cosa c'è in prep / cosa devo preparare oggi/domani" → mostra prep list filtrata per data
- "segna X come pronto/fatto" → aggiorna status prep
- "rimuovi/elimina X" → rimuove da giacenze
- COMANDI MULTIPLI: "aggiungi 3 uova e 2kg farina, scala 1kg burro" → esegui TUTTI separatamente

REGOLE:
- Per comandi azione: conferma con "✓ [cosa hai fatto]"
- Per domande: rispondi con dati dalla cucina
- Se non capisci: chiedi chiarimento breve
- MAI inventare dati non presenti nel contesto

DATI CUCINA: ${ctx}`;
    try {
      let text;
      if(attachImg) {
        // Richiesta multimodale con immagine allegata
        const userMsgs:any[] = [
          {type:"image", source:{type:"base64",media_type:attachImg.mimeType,data:attachImg.base64}},
          {type:"text",  text: msg||"Analizza questa immagine nel contesto della cucina."},
        ];
        text = await callAI({systemPrompt:sys, userMessages:userMsgs, maxTokens:600});
        setAttachImg(null);
      } else {
        text = await callAI({systemPrompt:sys, userContext:msg, maxTokens:400});
      }
      setMessages(p=>[...p,{role:"ai",text:text||"(nessuna risposta)"}]);
    } catch(e) {
      setMessages(p=>[...p,{role:"ai",text:`⚠ ${e.message}`}]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      position:"fixed",zIndex:8000,
      bottom:"var(--ai-bottom,90px)",right:0,
      width:"min(480px,100vw)",
      height:"min(520px,calc(100dvh - 80px))",
      borderRadius:"clamp(0px,16px,16px)",overflow:"hidden",
      boxShadow:`0 20px 60px ${t.shadowStrong}`,
      display:"flex",flexDirection:"column",
      background:t.bgCard,border:`1px solid ${t.div}`,
    }}>
      {/* Header */}
      <div style={{padding:"14px 20px",background:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <span style={{color:"#fff",fontFamily:"var(--serif)",fontSize:14,fontWeight:500}}>🤖 Assistente AI</span>
          <div className="mono" style={{fontSize:7,color:"rgba(255,255,255,0.5)",letterSpacing:"0.14em",marginTop:1}}>KITCHEN PRO INTELLIGENCE</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",fontSize:18,cursor:"pointer"}}>✕</button>
      </div>

      {/* Pending ops — preview con conferma */}
      {pendingOps&&(
        <div style={{padding:"12px 14px",borderBottom:"1px solid "+t.div,background:t.bgAlt,display:"flex",flexDirection:"column",gap:8}}>
          <div className="mono" style={{fontSize:9,color:t.gold,letterSpacing:"0.1em"}}>CONFERMA OPERAZIONI</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {pendingOps.map((op,oi)=>(
              <div key={oi} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:7,background:t.bgCard,border:"1px solid "+t.div}}>
                <span style={{fontSize:11,color:op.type==="add"?"#3D7A4A":"#C04A4A"}}>{op.type==="add"?"➕":"➖"}</span>
                <input value={op.name} onChange={e=>{const n=[...pendingOps];n[oi]={...n[oi],name:e.target.value};setPendingOps(n);}} style={{flex:2,minWidth:60,padding:"3px 5px",borderRadius:5,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:12,fontFamily:"var(--serif)",outline:"none"}}/>
                <input type="number" value={op.qty} onChange={e=>{const n=[...pendingOps];n[oi]={...n[oi],qty:parseFloat(e.target.value)||0};setPendingOps(n);}} style={{width:44,padding:"3px 4px",borderRadius:5,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:12,outline:"none"}}/>
                <input value={op.unit} onChange={e=>{const n=[...pendingOps];n[oi]={...n[oi],unit:e.target.value};setPendingOps(n);}} style={{width:32,padding:"3px",borderRadius:5,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:11,outline:"none"}}/>
                <select value={op.loc} onChange={e=>{const n=[...pendingOps];n[oi]={...n[oi],loc:e.target.value};setPendingOps(n);}} style={{padding:"3px",borderRadius:5,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:10,outline:"none"}}>
                  <option value="fridge">Frigo</option><option value="freezer">Freezer</option><option value="dry">Dispensa</option><option value="counter">Banco</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{
              const locLabel:{[k:string]:string}={fridge:"Frigo",freezer:"Freezer",dry:"Dispensa",counter:"Banco"};
              const recap:string[]=[];
              pendingOps.forEach(op=>{
                if(op.type==="add"){
                  stockAdd({name:op.name,quantity:op.qty,unit:op.unit,location:op.loc,lot:op.lot,insertedDate:todayDate()});
                  recap.push(`✓ ${op.name} · ${op.qty} ${op.unit} → ${locLabel[op.loc]||op.loc}`);
                } else {
                  const f=allItems().find(x=>x.name.toLowerCase().includes(op.name.toLowerCase()));
                  if(f){ adjustItem(f.id,-op.qty); recap.push(`✓ Scalati ${op.qty}${op.unit} da ${f.name}`); }
                  else recap.push(`✗ Non trovato: ${op.name}`);
                }
              });
              setMessages(p=>[...p,{role:"ai",text:recap.join("\n")||"✓ Operazioni applicate"}]);
              setPendingOps(null);
            }} style={{flex:1,padding:"7px",borderRadius:8,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:10,fontWeight:600}}>✅ Applica</button>
            <button onClick={()=>setPendingOps(null)} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
          </div>
        </div>
      )}
      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{
              maxWidth:"80%",padding:"10px 14px",borderRadius:12,fontSize:12,lineHeight:1.5,
              fontFamily:m.role==="ai"?"var(--serif)":"var(--mono)",fontStyle:m.role==="ai"?"italic":"normal",
              whiteSpace:"pre-wrap",
              background:m.role==="user"?`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`:t.bgAlt,
              color:m.role==="user"?"#fff":t.ink,
              borderBottomRightRadius:m.role==="user"?2:12,
              borderBottomLeftRadius:m.role==="ai"?2:12,
            }}>{m.text}</div>
            {m.ops&&m.ops.length>0&&(
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                {m.ops.map((op,oi)=>(
                  editingOp&&editingOp.msgIdx===i&&editingOp.opIdx===oi ? (
                    <div key={oi} style={{background:t.bgCard,borderRadius:8,padding:"8px 10px",border:"1px solid "+t.gold,display:"flex",flexDirection:"column",gap:6}}>
                      <div className="mono" style={{fontSize:8,color:t.gold}}>MODIFICA</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <input value={editingOp.name} onChange={e=>setEditingOp(p=>({...p,name:e.target.value}))} style={{flex:2,minWidth:80,padding:"4px 6px",borderRadius:6,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:13,fontFamily:"var(--serif)",outline:"none"}}/>
                        <input type="number" value={editingOp.qty} onChange={e=>setEditingOp(p=>({...p,qty:parseFloat(e.target.value)||0}))} style={{width:50,padding:"4px 6px",borderRadius:6,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:13,outline:"none"}}/>
                        <input value={editingOp.unit} onChange={e=>setEditingOp(p=>({...p,unit:e.target.value}))} style={{width:36,padding:"4px",borderRadius:6,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:12,outline:"none"}}/>
                        <select value={editingOp.loc} onChange={e=>setEditingOp(p=>({...p,loc:e.target.value}))} style={{padding:"4px",borderRadius:6,border:"1px solid "+t.div,background:t.bgAlt,color:t.ink,fontSize:11,outline:"none"}}>
                          <option value="fridge">Frigo</option>
                          <option value="freezer">Freezer</option>
                          <option value="dry">Dispensa</option>
                          <option value="counter">Banco</option>
                        </select>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{stockAdd({name:editingOp.name,quantity:editingOp.qty,unit:editingOp.unit,location:editingOp.loc,insertedDate:todayDate()});setEditingOp(null);}} style={{flex:1,padding:"5px",borderRadius:7,border:"none",cursor:"pointer",background:t.gold,color:"#fff",fontFamily:"var(--mono)",fontSize:9}}>Salva</button>
                        <button onClick={()=>setEditingOp(null)} style={{flex:1,padding:"5px",borderRadius:7,border:"1px solid "+t.div,cursor:"pointer",background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>Annulla</button>
                      </div>
                    </div>
                  ) : (
                    <div key={oi} onClick={()=>setEditingOp({msgIdx:i,opIdx:oi,...op})} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:7,background:t.bgCard,border:"1px solid "+t.div,cursor:"pointer"}}>
                      <span style={{fontSize:11,color:op.type==="add"?"#3D7A4A":"#C04A4A"}}>{op.type==="add"?"✓":"✕"}</span>
                      <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,flex:1}}>{op.name}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:9,color:t.inkMuted}}>{op.qty} {op.unit}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:8,color:t.inkFaint}}>{op.loc==="fridge"?"Frigo":op.loc==="freezer"?"Freezer":op.loc==="dry"?"Dispensa":"Banco"}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:8,color:t.inkFaint}}>✎</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
        {loading&&<div style={{color:t.inkFaint,fontFamily:"var(--mono)",fontSize:10,animation:"pulse 1.5s ease-in-out infinite"}}>...</div>}
        <div ref={endRef}/>
      </div>

      {/* Allegato immagine preview */}
      {attachImg&&(
        <div style={{padding:"6px 16px 0",display:"flex",alignItems:"center",gap:8,background:t.bgAlt}}>
          <span style={{fontSize:12,fontFamily:"var(--serif)",fontStyle:"italic",color:t.inkMuted,flex:1}}>📎 {attachImg.name}</span>
          <button onClick={()=>setAttachImg(null)} style={{background:"none",border:"none",color:t.danger,cursor:"pointer",fontSize:14}}>✕</button>
        </div>
      )}
      {/* Shortcut buttons */}
      <div style={{padding:"6px 12px",borderTop:`1px solid ${t.div}`,display:"flex",gap:5,flexWrap:"wrap"}}>
        {[
          {l:"Scadenze", q:"Quali prodotti scadono presto?"},
          {l:"HACCP",    q:"Verifica conformità HACCP"},
          {l:"Scorte",   q:"Cosa è sotto livello par?"},
          {l:"Cosa cucino?", q:"Cosa posso cucinare con ciò che sta per scadere?"},
        ].map(a=>(
          <button key={a.l} onClick={()=>setInput(a.q)} style={{
            padding:"4px 10px",borderRadius:6,border:`1px solid ${t.div}`,cursor:"pointer",
            background:t.bgAlt,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9,whiteSpace:"nowrap",
          }}>{a.l}</button>
        ))}
      </div>
      {/* Input */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${t.div}`,display:"flex",gap:8,flexWrap:"wrap"}}>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
          const f=e.target.files?.[0]; if(!f)return;
          const r=new FileReader();
          r.onload=ev=>{
            const b64=ev.target.result.split(",")[1];
            setAttachImg({base64:b64,mimeType:f.type,name:f.name});
          };
          r.readAsDataURL(f);
        }}/>
        <LuxInput value={input} onChange={e=>setInput(e.target.value)} placeholder="Chiedi qualcosa o allega una foto…" t={t} style={{flex:1,minWidth:120}}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}/>
        <button onClick={()=>fileRef.current?.click()} style={{
          width:36,height:36,borderRadius:8,border:`1px solid ${t.div}`,
          background:attachImg?t.goldFaint:t.bgAlt,color:attachImg?t.gold:t.inkMuted,
          cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
        }}>📷</button>
        <VoiceBtn t={t} onResult={r=>setInput(r)}/>
        <Btn t={t} onClick={send} disabled={(!input.trim()&&!attachImg)||loading}>→</Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════ */
// ── NAVIGAZIONE CENTRALIZZATA — zero hardcoding in JSX ──────

const SVG_NAV = {
  dashboard:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  giacenze:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  mep:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  preparazioni: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  servizio:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>,
  spesa:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  economato:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  haccp:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  foodcost:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  brigata:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

const MAIN_NAV = [
  {key:"dashboard",    label:"Home",    icon:"◫", mobileLabel:"Home"},
  {key:"giacenze",     label:"Stock",   icon:"❄", mobileLabel:"Stock"},
  {key:"preparazioni", label:"Prep/MEP", icon:"📋", mobileLabel:"Prep"},
  {key:"servizio",     label:"Live",    icon:"▶", mobileLabel:"Live"},
];
const DRAWER_NAV = [
  {key:"spesa",      label:"Lista Spesa"},
  {key:"economato",  label:"Economato"},
  {key:"haccp",      label:"HACCP"},
  {key:"spttp",      label:"SPTTP Fine Turno"},
  {key:"foodcost",   label:"Food cost e conti"},
  {key:"brigata",    label:"Brigata"},
  {key:"settings",   label:"Impostazioni"},
];
// Compatibilità: NAV usato dal sidebar esistente = unione
const NAV = [
  ...MAIN_NAV,
  ...DRAWER_NAV.map(n=>({...n,icon:"·"})),
];

const SECTION_TITLE = {
  dashboard:    "Panoramica",
  piatti:       "Piatti",
  linea:        "Linea",
  giacenze:     "Magazzino",
  preparazioni: "Preparazioni",
  servizio:     "Servizio",
  spesa:        "Lista della Spesa",
  economato:    "Economato",
  haccp:        "HACCP & Tracciabilità",
  spttp:         "SPTTP — Fine Turno",
  foodcost:     "Food cost e conti",
  brigata:      "Brigata",
  settings:     "Impostazioni",
};



/* ════════════════════════════════════════════════════════════════
   SmartDocImportPanel v1.0
   OCR professionale: foto / PDF / testo → giacenze · prep · spesa
   Review table inline editabile → import selettivo
   ════════════════════════════════════════════════════════════════ */
const SMART_DOC_SYSTEM = `Sei un sistema AI professionale per cucine e ristoranti stellati.
Puoi ricevere: fatture, DDT, bolle, foto frigo/dispensa/magazzino, liste scritte a mano, testo vocale dettato.

RICONOSCI IL TIPO DI AZIONE richiesta per ogni articolo:
- "aggiungi": arrivo merce, nuovo stock, "ho comprato", "è arrivato", "metti in"
- "rimuovi": "togli", "elimina", "buttato", "finito", "scarica", "non c'è più"
- "aggiusta": "ho usato", "ne restano", "scarica X", "consumato", quantità da sottrarre/aggiornare
- "spesa": "devo comprare", "ordina", "manca", "serve", "lista spesa", "da ordinare"
- "preparazione": "prepara", "fai", "metti in lavorazione", "da fare"

GESTISCI TESTO VOCALE NATURALE:
- "allora devo preparare 10 porzioni di fondo bruno 5 agnello e 3 maiale e mettere in giacenza congelatore 10 porzioni fondo di pollo"
  → fondo bruno (qty:10, azione:preparazione), fondo agnello (qty:5, azione:preparazione), fondo maiale (qty:3, azione:preparazione), fondo di pollo (qty:10, azione:aggiungi, location:freezer)
- "togli il salmone e metti 3kg di branzino in frigo" → salmone (azione:rimuovi), branzino (qty:3, azione:aggiungi, location:fridge)
- "ho usato 2kg di fondo bruno" → fondo bruno (qty:2, azione:aggiusta)
- "serve burro e panna per domani" → burro (azione:spesa), panna (azione:spesa)

NORMALIZZAZIONE:
- Abbreviazioni: fdb→Fondo Bruno, sc→Scalogno, pett.poll→Petto di pollo
- Parti di cucina: "per il saucier" → categoria fondi/salse, "per il poissonnier" → pesce
- Location da contesto: "in congelatore/freezer" → freezer, "in frigo" → fridge, "in dispensa/secco" → dry, "sul banco/in lavoro" → counter
- Se location non detta, inferisci dal tipo: proteine/pesce/dairy → fridge, surgelati → freezer, secco/spezie → dry

Per ogni articolo:
- nome: normalizzato in italiano
- qty: quantità (float, default 1 se non detta)
- unit: pz/kg/g/l/ml/box/busta/vasch (inferisci dal prodotto)
- categoria: proteine/pesce/verdure/erbe/dairy/cereali/grassi/acidi/spezie/fondi/beverage/secco/pulizia/carta/attrezzatura/packaging
- macro: "alimenti" o "economato"
- lotto: stringa o null
- scadenza: YYYY-MM-DD o null
- fornitore: stringa o null
- prezzo_unitario: float o null
- location: fridge/freezer/dry/counter
- azione: "aggiungi"|"rimuovi"|"aggiusta"|"spesa"|"preparazione"
- nota_ai: breve nota sul riconoscimento (opzionale)

Rispondi SOLO con JSON:
{
  "tipo_documento": "fattura|ddt|lista_acquisti|foto_giacenze|appunti|testo_vocale|altro",
  "fornitore_globale": null,
  "data_documento": null,
  "numero_documento": null,
  "note_generali": null,
  "articoli": [{"nome":"...","qty":1,"unit":"pz","categoria":"secco","macro":"alimenti","lotto":null,"scadenza":null,"fornitore":null,"prezzo_unitario":null,"location":"dry","azione":"aggiungi","nota_ai":null}]
}`;

function SmartDocImportPanel({ kitchen, t, onClose }) {
  const { stockAdd, prepAdd, adjustItem, removeItem, spesaV2Add, allItems } = useK();
  const toast = useToast();

  const [step,      setStep]      = React.useState("upload");
  const [files,     setFiles]     = React.useState([]);
  const [text,      setText]      = React.useState("");
  const [inputMode, setInputMode] = React.useState("file");
  const [dragging,  setDragging]  = React.useState(false);
  const [doc,       setDoc]       = React.useState(null);
  const [rows,      setRows]      = React.useState([]);
  const [dest,      setDest]      = React.useState({});
  const [sel,       setSel]       = React.useState({});
  const [editRow,   setEditRow]   = React.useState(null);
  const [imported,  setImported]  = React.useState(null);
  const [error,     setError]     = React.useState(null);

  const LOC_ICONS = {fridge:"❄️",freezer:"🧊",dry:"🏺",counter:"🍽️"};
  const DEST_COLORS = {aggiungi:"#3D7A4A",preparazione:"#182040",spesa:"#5A7A9A",rimuovi:"#8B1E2F",aggiusta:"#C19A3E",skip:"#888"};
  const DEST_LABELS = {aggiungi:"➕ Aggiungi",preparazione:"📋 Prep",spesa:"🛒 Spesa",rimuovi:"➖ Rimuovi",aggiusta:"🔧 Aggiusta",skip:"✕ Salta"};

  async function loadFiles(fileList) {
    const loaded = [];
    for (const f of fileList) {
      if(!f.type.startsWith("image/")&&f.type!=="application/pdf"&&!f.type.startsWith("text/")) continue;
      try { loaded.push(await fileToBase64(f)); } catch(e) { console.warn(e); }
    }
    if(loaded.length) setFiles(p=>[...p,...loaded]);
  }

  async function analyzeDoc() {
    setStep("processing"); setError(null); setDoc(null); setRows([]);
    try {
      let userContent;
      if(inputMode==="text"||files.length===0) {
        if(!text.trim()){setError("Inserisci testo o carica un file.");setStep("upload");return;}
        userContent = `Analizza questo documento:

${text.trim()}`;
      } else {
        const parts = files.map(f=>{
          if(f.mimeType.startsWith("image/"))
            return {type:"image",source:{type:"base64",media_type:f.mimeType,data:f.base64}};
          if(f.mimeType==="application/pdf")
            return {type:"document",source:{type:"base64",media_type:"application/pdf",data:f.base64}};
          return {type:"text",text:atob(f.base64)};
        });
        parts.push({type:"text",text:"Analizza e estrai tutti gli articoli."});
        userContent = parts;
      }
      const result = await callAI({
        systemPrompt:SMART_DOC_SYSTEM,
        ...(Array.isArray(userContent)?{userMessages:userContent}:{userContext:userContent}),
        maxTokens:4096, expectJSON:true, noCache:true,
      });
      if(!result?.articoli?.length){
        setError("Nessun articolo trovato. Prova con immagine più nitida.");
        setStep("upload"); return;
      }
      const enriched = result.articoli.map((a,i)=>({
        ...a, id:`r${i}_${Date.now()}`,
        qty: typeof a.qty==="number"?a.qty:parseFloat(a.qty)||1,
        fornitore: a.fornitore||result.fornitore_globale||null,
      }));
      setDoc({tipo:result.tipo_documento,fornitore:result.fornitore_globale,
        data:result.data_documento,numero:result.numero_documento,note:result.note_generali});
      setRows(enriched);
      const si={},di={};
      enriched.forEach(r=>{
        si[r.id]=true;
        // Mappa azione AI → dest UI
        const az = r.azione||"";
        di[r.id] = az==="rimuovi"?"rimuovi"
          : az==="aggiusta"?"aggiusta"
          : az==="spesa"?"spesa"
          : az==="preparazione"?"preparazione"
          : "aggiungi";
      });
      setSel(si); setDest(di); setStep("review");
    } catch(e) {
      setError("Errore AI: "+(e.message||"sconosciuto")); setStep("upload");
    }
  }

  function doImport() {
    let cAdd=0,cPrep=0,cSpesa=0,cRim=0,cAdj=0,cSkip=0;
    const allStock = allItems ? allItems() : [];
    rows.filter(r=>sel[r.id]&&dest[r.id]!=="skip").forEach(r=>{
      const d = dest[r.id]||"aggiungi";
      if(d==="aggiungi"){
        stockAdd({name:r.nome,quantity:r.qty,unit:r.unit,location:r.location||"dry",
          category:r.categoria||"secco",lot:r.lotto||undefined,
          expiresAt:r.scadenza?new Date(r.scadenza).toISOString():undefined,
          notes:[r.fornitore,r.prezzo_unitario!=null?`€${r.prezzo_unitario}`:null].filter(Boolean).join(" | ")||undefined,
          insertedDate:new Date().toISOString().slice(0,10)});
        cAdd++;
      } else if(d==="preparazione"){
        prepAdd(r.nome,r.qty,r.unit,r.categoria||"antipasti","saucier","mattina",r.fornitore||"",r.scadenza?new Date(r.scadenza).toISOString():null);
        cPrep++;
      } else if(d==="spesa"){
        spesaV2Add(r.nome,r.qty,r.unit,r.macro==="economato"?"economato":"alimenti","giornaliero",r.fornitore||"");
        cSpesa++;
      } else if(d==="rimuovi"){
        // Cerca in stock per nome (fuzzy: include)
        const matches = allStock.filter(i=>i.name.toLowerCase().includes(r.nome.toLowerCase()));
        if(matches.length>0){
          removeItem(matches[0].id);
          cRim++;
        } else {
          toast(`⚠ Non trovato in giacenze: ${r.nome}`,"error");
        }
      } else if(d==="aggiusta"){
        // Cerca in stock e sottrai quantità
        const matches = allStock.filter(i=>i.name.toLowerCase().includes(r.nome.toLowerCase()));
        if(matches.length>0){
          adjustItem(matches[0].id, -Math.abs(r.qty));
          cAdj++;
        } else {
          toast(`⚠ Non trovato per aggiustamento: ${r.nome}`,"error");
        }
      }
    });
    rows.filter(r=>!sel[r.id]||dest[r.id]==="skip").forEach(()=>cSkip++);
    const parts=[];
    if(cAdd>0)   parts.push(`${cAdd} aggiunti`);
    if(cPrep>0)  parts.push(`${cPrep} prep`);
    if(cSpesa>0) parts.push(`${cSpesa} in spesa`);
    if(cRim>0)   parts.push(`${cRim} rimossi`);
    if(cAdj>0)   parts.push(`${cAdj} aggiustati`);
    setImported({add:cAdd,p:cPrep,s:cSpesa,rim:cRim,adj:cAdj,skip:cSkip});
    setStep("done");
    toast(`✅ ${parts.join(" · ")}`, "success");
  }

  function updateRow(id,field,value){ setRows(p=>p.map(r=>r.id!==id?r:{...r,[field]:value})); }

  const selCount = Object.values(sel).filter(Boolean).length;
  const skipCount = rows.filter(r=>sel[r.id]&&dest[r.id]==="skip").length;

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.72)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:t.bgCard,borderRadius:20,width:"100%",maxWidth:880,maxHeight:"92vh",
        overflow:"hidden",display:"flex",flexDirection:"column",
        boxShadow:`0 24px 80px rgba(0,0,0,0.5),0 0 0 1px ${t.div}`}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${t.div}`,flexShrink:0,
          background:`linear-gradient(135deg,${t.gold}14,${t.bgCard})`,
          display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📄</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--serif)",fontSize:17,fontStyle:"italic",color:t.ink}}>Importa da Documento</div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,letterSpacing:"0.12em",marginTop:2}}>
              OCR AI — FATTURE · DDT · FOTO · LISTE A MANO
            </div>
          </div>
          {/* Step indicator */}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {["upload","review","done"].map((s,i)=>(
              <React.Fragment key={s}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",
                  alignItems:"center",justifyContent:"center",
                  fontFamily:"var(--mono)",fontSize:10,
                  background:step===s?`linear-gradient(135deg,${t.gold},${t.goldBright})`:t.bgAlt,
                  color:step===s?"#fff":t.inkFaint,
                  border:step===s?"none":`1px solid ${t.div}`}}>
                  {step==="processing"&&s==="upload"?"⏳":i+1}
                </div>
                {i<2&&<div style={{width:16,height:1,background:t.div}}/>}
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            color:t.inkFaint,fontSize:22,lineHeight:1}}>×</button>
        </div>

        {/* Contenuto */}
        <div style={{flex:1,overflow:"auto",padding:24}}>

          {/* UPLOAD */}
          {(step==="upload"||step==="processing")&&(
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{display:"flex",gap:6,padding:4,background:t.bgAlt,borderRadius:10,width:"fit-content"}}>
                {[{k:"file",l:"📎 File / Foto"},{k:"text",l:"📝 Testo libero"}].map(m=>(
                  <button key={m.k} onClick={()=>setInputMode(m.k)} style={{
                    padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",
                    background:inputMode===m.k?`linear-gradient(135deg,${t.gold},${t.goldBright})`:"transparent",
                    color:inputMode===m.k?"#fff":t.inkMuted,fontFamily:"var(--mono)",fontSize:10,transition:"all 0.2s"}}>
                    {m.l}
                  </button>
                ))}
              </div>

              {inputMode==="file"&&(
                <div>
                  <div
                    onDragOver={e=>{e.preventDefault();setDragging(true);}}
                    onDragLeave={()=>setDragging(false)}
                    onDrop={async e=>{e.preventDefault();setDragging(false);await loadFiles(Array.from(e.dataTransfer?.files||[]));}}
                    onClick={()=>document.getElementById("kp-smart-file")?.click()}
                    style={{border:`2px dashed ${dragging?t.gold:t.div}`,borderRadius:16,
                      padding:"40px 24px",textAlign:"center",cursor:"pointer",transition:"all 0.25s",
                      background:dragging?`${t.gold}08`:"transparent"}}>
                    <div style={{fontSize:40,marginBottom:12}}>{files.length?"📄":"☁️"}</div>
                    {files.length===0?(
                      <>
                        <div style={{fontFamily:"var(--serif)",fontSize:15,fontStyle:"italic",color:t.ink,marginBottom:6}}>
                          Trascina qui foto o PDF
                        </div>
                        <div className="mono" style={{fontSize:9,color:t.inkFaint}}>JPG · PNG · PDF · anche multipli</div>
                        <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:4}}>
                          Fatture · DDT · Bolle · Foto frigo/dispensa · Liste a mano
                        </div>
                      </>
                    ):(
                      <div style={{fontFamily:"var(--serif)",fontSize:13,color:t.inkMuted}}>+ aggiungi altri file</div>
                    )}
                    <input id="kp-smart-file" type="file" multiple accept="image/*,application/pdf"
                      style={{display:"none"}} onChange={e=>loadFiles(Array.from(e.target.files||[]))}/>
                  </div>
                  {files.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
                      {files.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                          borderRadius:10,background:t.bgAlt,border:`1px solid ${t.div}`,maxWidth:200}}>
                          <span>{f.mimeType.startsWith("image/")?"🖼️":f.mimeType==="application/pdf"?"📑":"📄"}</span>
                          <span className="mono" style={{fontSize:9,color:t.ink,overflow:"hidden",
                            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                          <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                            style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:14}}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inputMode==="text"&&(
                <textarea value={text} onChange={e=>setText(e.target.value)}
                  placeholder={`Esempi:
- Filetto manzo 2kg lot. FT230 scad. 15/03
- Burro 84% 5kg
- Pomodori San Marzano 6x2.5kg
...
Oppure incolla testo da una fattura.`}
                  style={{width:"100%",minHeight:200,padding:"14px 16px",borderRadius:12,
                    border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,
                    fontFamily:"var(--mono)",fontSize:12,resize:"vertical",outline:"none",
                    lineHeight:1.7,boxSizing:"border-box"}}/>
              )}

              {error&&(
                <div style={{padding:"12px 16px",borderRadius:10,background:t.accentGlow,
                  border:`1px solid ${t.danger}44`,color:t.danger,fontFamily:"var(--mono)",fontSize:11}}>
                  ⚠ {error}
                </div>
              )}

              {step==="processing"&&(
                <div style={{textAlign:"center",padding:"32px 24px"}}>
                  <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:10,height:10,borderRadius:"50%",background:t.gold,
                        animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
                    ))}
                  </div>
                  <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:14,color:t.ink}}>
                    Analisi AI in corso…
                  </div>
                  <div className="mono" style={{fontSize:9,color:t.inkFaint,marginTop:8}}>
                    OCR · Riconoscimento prodotti · Estrazione lotti e scadenze
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REVIEW */}
          {step==="review"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {doc&&(
                <div style={{padding:"12px 16px",borderRadius:12,
                  background:`linear-gradient(135deg,${t.gold}10,${t.bgAlt})`,
                  border:`1px solid ${t.gold}40`,display:"flex",flexWrap:"wrap",gap:16}}>
                  {doc.tipo&&<div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>TIPO</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{doc.tipo.replace(/_/g," ")}</div></div>}
                  {doc.fornitore&&<div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>FORNITORE</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{doc.fornitore}</div></div>}
                  {doc.numero&&<div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>N° DOC</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{doc.numero}</div></div>}
                  {doc.data&&<div><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>DATA</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink}}>{doc.data}</div></div>}
                  {doc.note&&<div style={{width:"100%"}}><div className="mono" style={{fontSize:7,color:t.inkFaint,marginBottom:2}}>NOTE AI</div>
                    <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:11,color:t.inkMuted}}>{doc.note}</div></div>}
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.ink}}>
                  {rows.length} articoli rilevati · <span className="mono" style={{fontSize:10,color:t.inkFaint}}>{selCount} selezionati</span>
                </span>
                <div style={{display:"flex",gap:6}}>
                  {[["Tutti",()=>{const s={};rows.forEach(r=>s[r.id]=true);setSel(s);}],
                    ["Nessuno",()=>setSel({})],
                    ["← Ricarica",()=>setStep("upload")]].map(([l,fn])=>(
                    <button key={l} onClick={fn} style={{padding:"5px 12px",borderRadius:7,
                      border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",
                      color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span className="mono" style={{fontSize:8,color:t.inkFaint,alignSelf:"center"}}>DEST:</span>
                {Object.entries(DEST_LABELS).map(([k,l])=>(
                  <span key={k} style={{padding:"3px 10px",borderRadius:6,fontFamily:"var(--mono)",fontSize:9,
                    background:DEST_COLORS[k]+"22",color:DEST_COLORS[k],border:`1px solid ${DEST_COLORS[k]}44`}}>{l}</span>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {rows.map(r=>{
                  const isEd=editRow===r.id, isSel=!!sel[r.id], d=dest[r.id]||"giacenza", dc=DEST_COLORS[d];
                  return (
                    <div key={r.id} style={{borderRadius:10,border:`1px solid ${isSel?t.div+"88":t.div+"33"}`,
                      background:isSel?t.bgAlt:"transparent",opacity:isSel?1:0.4,transition:"all 0.15s",
                      borderLeft:`4px solid ${isSel?dc:t.div}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",flexWrap:"wrap"}}>
                        <input type="checkbox" checked={isSel}
                          onChange={e=>setSel(p=>({...p,[r.id]:e.target.checked}))}
                          style={{width:16,height:16,accentColor:t.gold,flexShrink:0,cursor:"pointer"}}/>
                        {isEd?(
                          <input value={r.nome} autoFocus onChange={e=>updateRow(r.id,"nome",e.target.value)}
                            style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${t.gold}`,
                              background:t.bgCard,color:t.ink,fontFamily:"var(--serif)",fontSize:13,
                              fontStyle:"italic",outline:"none"}}/>
                        ):(
                          <span style={{flex:2,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,
                            color:t.ink,cursor:"pointer"}} onClick={()=>setEditRow(isEd?null:r.id)}>{r.nome}</span>
                        )}
                        {isEd?(
                          <div style={{display:"flex",gap:4}}>
                            <input value={r.qty} type="number" min="0" step="0.1"
                              onChange={e=>updateRow(r.id,"qty",parseFloat(e.target.value)||0)}
                              style={{width:58,padding:"4px 6px",borderRadius:6,border:`1px solid ${t.gold}`,
                                background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:12,outline:"none"}}/>
                            <select value={r.unit} onChange={e=>updateRow(r.id,"unit",e.target.value)}
                              style={{padding:"4px 5px",borderRadius:6,border:`1px solid ${t.gold}`,
                                background:t.bgCard,color:t.ink,fontFamily:"var(--mono)",fontSize:10}}>
                              {["pz","kg","g","l","ml","box","busta","vasch","crt","conf"].map(u=><option key={u}>{u}</option>)}
                            </select>
                          </div>
                        ):(
                          <span className="mono" style={{fontSize:11,color:t.gold,cursor:"pointer"}}
                            onClick={()=>setEditRow(r.id)}>{r.qty} {r.unit}</span>
                        )}
                        <span style={{fontSize:13,cursor:"pointer"}} title={r.location||"dry"}
                          onClick={()=>setEditRow(r.id)}>{LOC_ICONS[r.location||"dry"]}</span>
                        {r.lotto&&<span className="mono" style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                          background:t.bgCard,color:t.inkFaint,border:`1px solid ${t.div}`}}>🏷 {r.lotto}</span>}
                        {r.scadenza&&<span className="mono" style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                          background:t.accentGlow,color:t.danger}}>📅 {r.scadenza}</span>}
                        {r.prezzo_unitario!=null&&<span className="mono" style={{fontSize:9,color:t.gold}}>€{r.prezzo_unitario}</span>}
                        {r.nota_ai&&<span className="mono" style={{fontSize:8,padding:"2px 6px",borderRadius:4,
                          background:t.bgAlt,color:t.inkFaint,fontStyle:"italic",maxWidth:120,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.nota_ai}>💬 {r.nota_ai}</span>}
                        <select value={d} onChange={e=>setDest(p=>({...p,[r.id]:e.target.value}))}
                          style={{padding:"3px 5px",borderRadius:6,border:`1px solid ${dc}44`,
                            background:dc+"18",color:dc,fontFamily:"var(--mono)",fontSize:9,cursor:"pointer"}}>
                          <option value="giacenza">📦 Giacenza</option>
                          <option value="preparazione">📋 Prep</option>
                          <option value="spesa">🛒 Spesa</option>
                          <option value="skip">✕ Salta</option>
                        </select>
                        <button onClick={()=>setEditRow(isEd?null:r.id)}
                          style={{background:"none",border:"none",cursor:"pointer",
                            color:isEd?t.gold:t.inkFaint,fontSize:14,padding:"2px 4px"}}>
                          {isEd?"✓":"✏"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DONE */}
          {step==="done"&&imported&&(
            <div style={{textAlign:"center",padding:"40px 24px",display:"flex",
              flexDirection:"column",gap:20,alignItems:"center"}}>
              <div style={{fontSize:48}}>✅</div>
              <div style={{fontFamily:"var(--serif)",fontSize:20,fontStyle:"italic",color:t.ink}}>Importazione completata</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
                {imported.g>0&&<div style={{padding:"12px 20px",borderRadius:12,background:"rgba(61,122,74,0.15)",
                  border:"1px solid rgba(61,122,74,0.3)"}}>
                  <div style={{fontFamily:"var(--serif)",fontSize:24,color:"#3D7A4A"}}>{imported.g}</div>
                  <div className="mono" style={{fontSize:9,color:"#3D7A4A"}}>📦 GIACENZE</div></div>}
                {imported.p>0&&<div style={{padding:"12px 20px",borderRadius:12,background:"rgba(24,32,64,0.15)",
                  border:"1px solid rgba(24,32,64,0.3)"}}>
                  <div style={{fontFamily:"var(--serif)",fontSize:24,color:"#182040"}}>{imported.p}</div>
                  <div className="mono" style={{fontSize:9,color:"#182040"}}>📋 PREP</div></div>}
              </div>
              {imported.skip>0&&<div className="mono" style={{fontSize:9,color:t.inkFaint}}>{imported.skip} saltati</div>}
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>{setStep("upload");setFiles([]);setText("");setRows([]);setDest({});setSel({});setImported(null);setDoc(null);}}
                  style={{padding:"10px 24px",borderRadius:10,border:`1px solid ${t.div}`,cursor:"pointer",
                    background:"transparent",color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>
                  ← Nuovo documento
                </button>
                <button onClick={onClose} style={{padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",
                  background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
                  color:"#fff",fontFamily:"var(--mono)",fontSize:10}}>
                  ✓ Chiudi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step==="upload"&&(
          <div style={{padding:"16px 24px",borderTop:`1px solid ${t.div}`,flexShrink:0,
            background:t.bgCard,display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,
              border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",
              color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>Annulla</button>
            <button onClick={analyzeDoc} disabled={files.length===0&&!text.trim()}
              style={{padding:"10px 28px",borderRadius:10,border:"none",cursor:"pointer",
                background:files.length===0&&!text.trim()?t.bgAlt:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
                color:files.length===0&&!text.trim()?t.inkFaint:"#fff",
                fontFamily:"var(--mono)",fontSize:11,transition:"all 0.2s"}}>
              ✨ Analizza con AI
            </button>
          </div>
        )}
        {step==="review"&&(
          <div style={{padding:"16px 24px",borderTop:`1px solid ${t.div}`,flexShrink:0,
            background:t.bgCard,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.inkMuted}}>
              {selCount-skipCount} articoli verranno importati
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setStep("upload")} style={{padding:"10px 18px",borderRadius:10,
                border:`1px solid ${t.div}`,cursor:"pointer",background:"transparent",
                color:t.inkMuted,fontFamily:"var(--mono)",fontSize:10}}>← Rianalizza</button>
              <button onClick={doImport} disabled={selCount===0||selCount===skipCount}
                style={{padding:"10px 28px",borderRadius:10,border:"none",cursor:"pointer",
                  background:selCount===0||selCount===skipCount?t.bgAlt:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
                  color:selCount===0||selCount===skipCount?t.inkFaint:"#fff",
                  fontFamily:"var(--mono)",fontSize:11,transition:"all 0.2s"}}>
                ✓ Importa {selCount-skipCount} articoli
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BancoServizioWidget({ t }) {
  const { kitchen } = useK();
  const items = kitchen?.counter || [];
  const [open, setOpen] = React.useState(false);
  if(items.length === 0) return (
    <div style={{padding:"12px 20px",borderRadius:12,border:`1px solid ${t.div}`,
      background:t.bgCard,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:14}}>🍽️</span>
      <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:13,color:t.inkFaint}}>Banco Servizio vuoto</span>
    </div>
  );
  const alerts = items.filter(x => {const b=expiryBadge(x.expiresAt); return b?.urgent;});
  return (
    <div style={{borderRadius:12,border:`1px solid ${t.div}`,background:t.bgCard,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        padding:"12px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",
        background:`linear-gradient(135deg,${t.secondary}18,${t.secondary}08)`,
        borderBottom:open?`1px solid ${t.div}`:"none",
      }}>
        <span style={{fontSize:16}}>🍽️</span>
        <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.08em",color:t.ink,fontWeight:600}}>BANCO SERVIZIO</span>
        <span style={{marginLeft:8,padding:"2px 8px",borderRadius:8,background:t.bgAlt,
          fontFamily:"var(--mono)",fontSize:9,color:t.inkMuted}}>{items.length} art.</span>
        {alerts.length>0&&<span style={{padding:"2px 8px",borderRadius:8,background:t.danger+"20",
          fontFamily:"var(--mono)",fontSize:9,color:t.danger}}>⚠ {alerts.length} in scadenza</span>}
        <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:10,color:t.inkFaint}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,padding:12}}>
          {items.map(item=>{
            const badge=expiryBadge(item.expiresAt);
            return (
              <div key={item.id} style={{padding:"10px 14px",borderRadius:10,
                border:`1px solid ${badge?.urgent?t.danger+"40":t.div}`,
                background:badge?.urgent?t.danger+"08":t.bgAlt}}>
                <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:12,color:t.ink,marginBottom:4}}>{item.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span className="mono" style={{fontSize:10,color:t.gold}}>{item.quantity} {item.unit}</span>
                  {badge&&<span className="mono" style={{fontSize:8,color:badge.urgent?t.danger:t.inkFaint}}>{badge.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PrepMepView({ t }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <MepView t={t}/>
      <div>
        <div className="mono" style={{fontSize:8,letterSpacing:"0.16em",color:"#999",marginBottom:8,paddingLeft:2}}>BANCO SERVIZIO</div>
        <BancoServizioWidget t={t}/>
      </div>
      <div style={{borderTop:"2px solid rgba(0,0,0,0.06)",paddingTop:20}}>
        <PreparazioniView t={t} hideForm={true}/>
      </div>
    </div>
  );
}

export default function KitchenPro({ bridge }) {
  BRIDGE = bridge;

  return (
    <ErrorBoundary>
      <KitchenProvider>
        <ToastProvider>
          <KitchenProInner/>
        </ToastProvider>
      </KitchenProvider>
    </ErrorBoundary>
  );
}

function BridgeBar({ t, isMobile }) {
  const [st, setSt] = useState("saved");
  useEffect(() => { const h = (e) => setSt(e.detail); window.addEventListener("kp-sync", h); return () => window.removeEventListener("kp-sync", h); }, []);
  const col = st === "saved" ? t.success : st === "saving" ? t.warning : t.danger;
  const lbl = st === "saved" ? "Sincronizzato" : st === "saving" ? "Salvataggio…" : "Offline, salvo appena torna la rete";
  return (
    <span title={lbl} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"2px 10px 2px 8px",borderRadius:999,background:col+"18",color:col,fontSize:12,fontWeight:500}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:col}}/>{lbl}
    </span>
  );
}

function RecipePickerKP({ t, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [dose, setDose] = useState(1);
  const list = (BRIDGE?.recipes || []).filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.section||"").toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }} style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:t.bgCard,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:`0 20px 60px ${t.shadowStrong}`}}>
        <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.div}`,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:18,color:t.ink}}>📖 Scegli dal ricettario</span>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:t.inkMuted}}>✕</button>
          </div>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca ricetta…" style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${t.div}`,background:t.bgAlt,color:t.ink,fontSize:14,outline:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="mono" style={{fontSize:9,color:t.inkFaint}}>DOSE</span>
            {[0.5,1,2,3].map(d=>(
              <button key={d} onClick={()=>setDose(d)} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${t.div}`,fontFamily:"var(--mono)",fontSize:10,
                background:dose===d?t.gold:"transparent",color:dose===d?"#fff":t.inkMuted}}>×{String(d).replace(".",",")}</button>
            ))}
          </div>
        </div>
        <div style={{overflowY:"auto",padding:8}}>
          {list.map(r=>(
            <button key={r.id} onClick={()=>onPick(r,dose)} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.bgAlt} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink}}>{r.name}</div>
              <div className="mono" style={{fontSize:9,color:t.inkFaint}}>{r.section} · {(r.ingredients||[]).length} ingredienti</div>
            </button>
          ))}
          {!list.length && <div style={{padding:20,textAlign:"center",color:t.inkFaint,fontStyle:"italic"}}>Nessuna ricetta</div>}
        </div>
      </div>
    </div>
  );
}

const KP_ROLE_LABEL = { admin:"Admin", chef:"Chef", "sous-chef":"Sous-chef", "capo-partita":"Capo partita", commis:"Commis", stagista:"Stagista", staff:"Staff", fb:"F&B", mm:"Manutenzione" };
function BrigataBridgeView({ t }) {
  const { kitchen, currentRole } = useK();
  const members = kitchen?.members || [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <KitchenBridgeCard t={t}/>
      <Card t={t}>
        <CardHeader t={t} title={`Brigata · ${members.length}`}/>
        <div style={{padding:12}}>
          {members.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 8px",borderBottom:`1px solid ${t.div}`}}>
              <span style={{flex:1,fontFamily:"var(--serif)",fontStyle:"italic",fontSize:15,color:t.ink}}>{m.name}{m.id===BRIDGE.userId?" (tu)":""}</span>
              <span className="mono" style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:t.goldFaint,color:t.gold}}>{KP_ROLE_LABEL[m.role]||m.role}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KitchenBridgeCard({ t }) {
  const { currentRole } = useK();
  const canManage = ["admin","chef","sous-chef"].includes(currentRole());
  return (
    <Card t={t}>
      <CardHeader t={t} title="Cucina"/>
      <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:20,color:t.ink}}>{BRIDGE.kitchenName}</div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span className="mono" style={{fontSize:9,color:t.inkFaint}}>CODICE INVITO</span>
          <span className="mono" style={{fontSize:16,letterSpacing:"0.2em",color:t.gold}}>{BRIDGE.code}</span>
        </div>
        <div style={{fontSize:12,color:t.inkMuted,lineHeight:1.5}}>
          I dati di giacenze, preparazioni, MEP, ordini, spesa e piatti sono condivisi con tutta la brigata in tempo reale.
          Brigata, ruoli e ricettari collegati si gestiscono dall'app.
        </div>
        {canManage && <a href={BRIDGE.urls.settings} style={{alignSelf:"flex-start",padding:"9px 16px",borderRadius:10,background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,
          color:"#fff",textDecoration:"none",fontFamily:"var(--mono)",fontSize:10}}>Gestisci brigata e ricettari →</a>}
      </div>
    </Card>
  );
}

function KitchenProInner() {
  const [themeKey,    setThemeKey]    = useState(()=>{ const s=localStorage.getItem("kp-theme"); return s&&THEMES[s]?s:"carta"; });
  const [section,     setSection]     = useState(() => (BRIDGE && BRIDGE.section) || "dashboard");
  useEffect(() => { if (BRIDGE && BRIDGE.onSection) BRIDGE.onSection(section); }, [section]);
  const [ready,       setReady]       = useState(false);
  const [sideCollapsed,setSideCollapsed]= useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [showAI,        setShowAI]        = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [expSections, setExpSections] = useState({giacenze:true,preparazioni:true,haccp:false});
  const [expPartita, setExpPartita] = useState('tutti');
  const [showBriefing,  setShowBriefing]  = useState(false);
  const [showWasteAI,   setShowWasteAI]   = useState(false);
  const [showMenuAI,    setShowMenuAI]    = useState(false);
  const [showMEPAI,     setShowMEPAI]     = useState(false);
  const [showImportAI,  setShowImportAI]  = useState(false);
  const [showDrawer,    setShowDrawer]    = useState(false);
  const isMobile = useIsMobile();
  const t = useAppTheme(); void themeKey;
  const { state, kitchen } = useK();
  const alertCount = selectAlertCritici(kitchen).length;

  useEffect(()=>{ setReady(true); },[]);
  useEffect(()=>{ localStorage.setItem("kp-theme",themeKey); },[themeKey]);
  /* listener per Quick Actions della Dashboard */
  useEffect(()=>{
    const fn = (e) => { setSection(e.detail); setShowDrawer(false); };
    window.addEventListener("kp-nav", fn);
    return () => window.removeEventListener("kp-nav", fn);
  },[]);
  useEffect(()=>{
    const aiH = (e) => {
      const {panel}=e.detail||{};
      if(panel==="briefing") setShowBriefing(true);
      if(panel==="waste")    setShowWasteAI(true);
      if(panel==="menu")     setShowMenuAI(true);
      if(panel==="mep")      setShowMEPAI(true);
      if(panel==="import")   setShowImportAI(true);
    };
    window.addEventListener("kp-ai", aiH);
    return () => window.removeEventListener("kp-ai", aiH);
  },[]);

  const needsSetup = false; // la cucina arriva sempre dall'app
  if(needsSetup) return <><style>{CSS(t)}</style><SetupScreen t={t}/></>;

  return (
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"var(--serif)",color:t.ink,background:t.bg,transition:"background 0.6s, color 0.4s"}}>
      <style>{CSS(t)}</style>

      {/* Sidebar — nascosta su mobile */}
      {false && !isMobile && <aside style={{
        width:sideCollapsed?68:240,background:`linear-gradient(180deg,${t.secondary},${t.secondaryDeep})`,
        display:"flex",flexDirection:"column",transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)",
        position:"fixed",top:0,bottom:0,left:0,zIndex:20,
        boxShadow:`4px 0 24px ${t.shadowStrong}`,overflow:"hidden",
      }}>
        {/* Logo */}
        <div style={{padding:sideCollapsed?"20px 12px":"24px 24px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:42,height:42,minWidth:42,borderRadius:"50%",border:`2px solid ${t.goldBright}`,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.06)",boxShadow:`0 0 0 4px ${t.goldFaint}`,flexShrink:0}}>
            <span className="mono" style={{fontSize:9,color:t.goldBright,fontWeight:600}}>★★★</span>
          </div>
          {!sideCollapsed&&(
            <div style={{animation:"fadeIn 0.3s ease"}}>
              <div style={{fontSize:16,fontWeight:600,letterSpacing:"0.12em",color:"#fff",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                {kitchen?.name||"Kitchen Pro"}
              </div>
              <div className="mono" style={{fontSize:7,letterSpacing:"0.2em",color:"rgba(255,255,255,0.35)",marginTop:2}}>GESTIONE CUCINA</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"16px 10px",display:"flex",flexDirection:"column",gap:4}}>
          {[...MAIN_NAV,...DRAWER_NAV.map(n=>({...n,icon:"·"}))].map(n=>{
            const active=section===n.key;
            return (
              <button key={n.key} onClick={()=>setSection(n.key)} style={{
                display:"flex",alignItems:"center",gap:14,padding:sideCollapsed?"12px 14px":"10px 18px",
                borderRadius:10,border:"none",cursor:"pointer",
                background:active?"rgba(255,255,255,0.12)":"transparent",
                color:active?"#fff":"rgba(255,255,255,0.45)",
                fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.06em",
                transition:"all 0.25s",textAlign:"left",width:"100%",
                borderLeft:active?`3px solid ${t.goldBright}`:"3px solid transparent",
              }}>
                <span style={{width:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {SVG_NAV[n.key]||<span style={{fontSize:14}}>{n.icon}</span>}
                </span>
                {!sideCollapsed&&<span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
              </button>
            );
          })}
          {!sideCollapsed&&(
            <>
              <div style={{height:1,background:"rgba(255,255,255,0.08)",margin:"6px 4px"}}/>
              <button onClick={()=>setSideDrawerOpen(o=>!o)} style={{
                display:"flex",alignItems:"center",gap:14,padding:"10px 18px",
                borderRadius:10,border:"none",cursor:"pointer",background:"transparent",
                color:"rgba(255,255,255,0.45)",fontFamily:"var(--mono)",fontSize:10,
                transition:"all 0.25s",textAlign:"left",width:"100%",borderLeft:"3px solid transparent",
              }}>
                <span style={{fontSize:11,transform:sideDrawerOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.25s",display:"inline-block"}}>›</span>
                <span>Altro</span>
              </button>
              {sideDrawerOpen&&DRAWER_NAV.map(n=>{
                const active=section===n.key;
                return (
                  <button key={n.key} onClick={()=>setSection(n.key)} style={{
                    display:"flex",alignItems:"center",gap:12,padding:"9px 18px 9px 28px",
                    borderRadius:10,border:"none",cursor:"pointer",
                    background:active?"rgba(255,255,255,0.10)":"transparent",
                    color:active?"#fff":"rgba(255,255,255,0.35)",
                    fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.06em",
                    transition:"all 0.2s",textAlign:"left",width:"100%",
                    borderLeft:active?`3px solid ${t.goldBright}`:"3px solid transparent",
                  }}>
                    <span style={{width:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {SVG_NAV[n.key]||<span style={{fontSize:12}}>·</span>}
                    </span>
                    <span style={{whiteSpace:"nowrap"}}>{n.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Theme switcher */}
        <div style={{padding:sideCollapsed?"12px 8px 16px":"16px 14px 20px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          {!sideCollapsed&&<div className="mono" style={{fontSize:7,letterSpacing:"0.2em",color:"rgba(255,255,255,0.25)",marginBottom:10,paddingLeft:4}}>TEMA</div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:sideCollapsed?"center":"flex-start"}}>
            {Object.entries(THEMES).map(([key,th])=>(
              <button key={key} onClick={()=>setThemeKey(key)} title={th.name} style={{
                width:sideCollapsed?36:48,height:sideCollapsed?36:32,borderRadius:8,
                border:themeKey===key?`2px solid ${t.goldBright}`:"2px solid rgba(255,255,255,0.1)",
                background:th.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:sideCollapsed?14:12,transition:"all 0.3s",
                transform:themeKey===key?"scale(1.08)":"scale(1)",
                boxShadow:themeKey===key?`0 0 12px ${t.goldFaint}`:"none",
              }}>{th.icon}</button>
            ))}
          </div>
        </div>

        {/* Collapse */}
        <button onClick={()=>setSideCollapsed(!sideCollapsed)} style={{padding:"14px",border:"none",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:14,borderTop:"1px solid rgba(255,255,255,0.06)",transition:"all 0.25s",fontFamily:"var(--mono)"}}>
          {sideCollapsed?"→":"← Comprimi"}
        </button>
      </aside>}

      {/* Main */}
      <div style={{
        flex:1,
        marginLeft:0,
        transition:"margin-left 0.4s cubic-bezier(0.4,0,0.2,1)",
        display:"flex",flexDirection:"column",
        paddingBottom:isMobile?"calc(64px + env(safe-area-inset-bottom,0px))":0,
      }}>
        {/* Topbar */}
        <header style={{
          padding:isMobile?"11px 16px":"16px 36px",
          background:t.bgGlass,backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${t.div}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"relative",zIndex:10,transition:"background 0.4s",
          gap:12,
        }}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{
              fontFamily:"var(--f-display)",fontWeight:500,display:isMobile?"none":"block",
              fontSize:isMobile?16:30,
              letterSpacing:isMobile?"0.02em":"0.06em",
              color:t.ink,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
            }}>{SECTION_TITLE[section]}</div>
            <div style={{fontSize:13,color:t.inkMuted,marginTop:isMobile?0:4,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span>{kitchen?.name||"—"}</span>
              {!isMobile && <span>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</span>}
              <BridgeBar t={t} isMobile={isMobile}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:isMobile?8:18,flexShrink:0}}>
            <button onClick={()=>setShowExport(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:9,border:`1px solid ${t.div}`,cursor:"pointer",background:t.bgCard,color:t.inkMuted,fontFamily:"var(--mono)",fontSize:9}}><span>⬇</span><span>{isMobile?"":"Export"}</span></button>
            <LiveClock t={t} short={isMobile}/>
            {!isMobile&&<div style={{width:1,height:28,background:t.div}}/>}
            <button onClick={()=>setShowAI(!showAI)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:isMobile?"6px 12px":"7px 18px",
              borderRadius:10,border:"none",cursor:"pointer",
              background:showAI?`linear-gradient(135deg,${t.gold},${t.goldBright})`:`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`,
              color:"#fff",fontFamily:"var(--mono)",
              fontSize:isMobile?9:10,letterSpacing:"0.08em",
              boxShadow:`0 3px 14px ${showAI?t.goldFaint:t.shadowStrong}`,transition:"all 0.3s",
              minHeight:36,
            }}>
              <span style={{fontSize:14}}>🤖</span>
              {!isMobile&&" AI"}
            </button>
            {alertCount>0&&(
              <div style={{
                width:22,height:22,borderRadius:"50%",
                background:t.danger,color:"#fff",
                fontFamily:"var(--mono)",fontSize:10,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center",
                animation:"pulse 2s ease-in-out infinite",flexShrink:0,
              }}>{alertCount>9?"9+":alertCount}</div>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex:1,
          padding:isMobile?"10px 8px 80px":"28px 36px 48px",
          overflow:"auto",
        }} key={section}>
          <div style={{animation:ready?"cardInFast 0.16s ease-out both":"none",width:"100%",minWidth:0}}>
            {section==="dashboard"    && <Panoramica/>}
            {section==="dashboard"    && <details style={{marginTop:24}}><summary style={{cursor:"pointer",color:t.inkMuted,fontSize:14,padding:"8px 0"}}>Indicatori del magazzino</summary><div style={{marginTop:12}}><DashboardView t={t}/></div></details>}
            {section==="piatti"       && <PiattiView/>}
            {section==="linea"        && <LineaView/>}
            <BadgeEmitter/>
            {section==="giacenze"     && <MagazzinoHub legacy={<InventoryView t={t}/>}/>}
            {section==="preparazioni" && <PreparazioniHub legacy={<PrepMepView t={t}/>}/>}
            {false && section==="preparazioni" && isMobile && <QuickPrepFAB t={t}/>}
            {section==="spesa"        && <SpesaView t={t}/>}
            {section==="economato"    && <EconomatoView t={t}/>}
            {section==="servizio"     && <ServizioHub legacy={<ServizioViewFull t={t}/>}/>}
            {section==="haccp"        && <HaccpHub legacy={<HaccpViewFull t={t}/>}/>}
            {section==="spttp"        && <SpttpView t={t}/>}
            {section==="foodcost"     && <Economia/>}
            {section==="brigata"      && <BrigataBridgeView t={t}/>}
            {section==="settings"     && <SettingsView t={t}/>}
          </div>
        </main>
      </div>

      {/* Bottom Nav + Drawer — sostituiti dalla barra dell'app */}
      {false&&isMobile&&(
        <>
          {/* ── DRAWER ALTRO (slide-up) ── */}
          {showDrawer&&(
            <div
              onClick={()=>setShowDrawer(false)}
              style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)"}}
            >
              <div
                onClick={e=>e.stopPropagation()}
                style={{
                  position:"fixed",bottom:"calc(60px + env(safe-area-inset-bottom,0px))",
                  left:0,right:0,zIndex:999,
                  background:t.bgCard,
                  borderRadius:"18px 18px 0 0",
                  boxShadow:`0 -8px 40px ${t.shadowStrong}`,
                  border:`1px solid ${t.div}`,
                  borderBottom:"none",
                  padding:"16px 16px 8px",
                  animation:"cardIn 0.22s cubic-bezier(0.4,0,0.2,1) both",
                }}
              >
                {/* Handle */}
                <div style={{width:36,height:3,background:t.div,borderRadius:2,margin:"0 auto 18px"}}/>
                <div className="mono" style={{fontSize:8,letterSpacing:"0.16em",color:t.inkFaint,marginBottom:14,paddingLeft:2}}>SEZIONI</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                  {[
                    {key:"spesa",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label:"Spesa",     color:t.secondary},
                    {key:"economato",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>, label:"Economato",color:t.gold},
                    {key:"haccp",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label:"HACCP",     color:t.success},
                    {key:"foodcost", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, label:"Food Cost",color:t.warning},
                    {key:"brigata",  icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, label:"Brigata",   color:t.accent},
                    {key:"spttp",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="16" x2="12" y2="20"/></svg>, label:"Fine Turno", color:t.secondary},
                    {key:"settings", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="26" height="26"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label:"Settings",  color:t.inkMuted},
                  ].map(n=>{
                    const active=section===n.key;
                    return (
                      <button key={n.key} onClick={()=>{setSection(n.key);setShowDrawer(false);}} style={{
                        padding:"16px 8px 14px",borderRadius:14,
                        border:`1px solid ${active?n.color+"55":t.div}`,
                        cursor:"pointer",
                        background:active?`linear-gradient(145deg,${n.color}20,${n.color}08)`:t.bgAlt,
                        display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                        minHeight:78,transition:"all 0.2s",
                        boxShadow:active?`0 4px 16px ${n.color}22`:"none",
                        color:active?n.color:t.inkMuted,
                      }}>
                        {n.icon}
                        <span style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.06em",textAlign:"center",fontWeight:active?600:400}}>
                          {n.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Theme switcher nel drawer */}
                <div style={{paddingTop:12,borderTop:`1px solid ${t.div}`}}>
                  <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:10,letterSpacing:"0.12em"}}>TEMA</div>
                  <div style={{display:"flex",gap:8}}>
                    {Object.entries(THEMES).map(([key,th])=>(
                      <button key={key} onClick={()=>{setThemeKey(key);}} style={{
                        flex:1,height:44,borderRadius:10,cursor:"pointer",
                        background:th.bg,fontSize:18,
                        border:themeKey===key?`2px solid ${t.gold}`:`1px solid ${t.div}`,
                        transform:themeKey===key?"scale(1.06)":"scale(1)",
                        boxShadow:themeKey===key?`0 0 14px ${t.goldDim}`:"none",
                        transition:"all 0.2s",
                      }}>{th.icon}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BOTTOM TAB BAR ── */}
          <nav className="kp-bottom-nav" style={{
            position:"fixed",bottom:0,left:0,right:0,zIndex:100,
            background:t.bgCard,borderTop:`1px solid ${t.div}`,
            display:"flex",alignItems:"stretch",
            boxShadow:`0 -4px 20px ${t.shadow}`,
          }}>
            {[
              {key:"dashboard",    label:"Home",  svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="21" height="21"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
              {key:"giacenze",     label:"Stock", svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="21" height="21"><path d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>},
              {key:"preparazioni", label:"Prep/MEP", svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="21" height="21"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>},
              {key:"servizio",     label:"Live",  svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="21" height="21"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>},
            ].map(n=>{
              const active=section===n.key;
              const hasBadge=n.key==="giacenze"&&alertCount>0;
              return (
                <button key={n.key} onClick={()=>{setSection(n.key);setShowDrawer(false);}} style={{
                  flex:1,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",
                  padding:"8px 4px 6px",border:"none",cursor:"pointer",
                  minHeight:58,background:"transparent",
                  color:active?t.accent:t.inkFaint,
                  transition:"all 0.2s",gap:3,position:"relative",
                }}>
                  {active&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:t.accent,borderRadius:"0 0 3px 3px"}}/>}
                  <div style={{
                    width:38,height:38,borderRadius:11,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:active?t.accentGlow:"transparent",
                    transition:"all 0.2s",position:"relative",
                  }}>
                    {n.svg}
                    {hasBadge&&<span style={{position:"absolute",top:-3,right:-5,width:16,height:16,borderRadius:"50%",background:t.danger,color:"#fff",fontSize:8,fontFamily:"var(--mono)",display:"flex",alignItems:"center",justifyContent:"center"}}>{alertCount>9?"9+":alertCount}</span>}
                  </div>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.04em",fontWeight:active?600:400}}>{n.label}</span>
                </button>
              );
            })}
            {/* Altro */}
            <button onClick={()=>setShowDrawer(d=>!d)} style={{
              flex:1,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",
              padding:"8px 4px 6px",border:"none",cursor:"pointer",
              minHeight:58,background:"transparent",
              color:["spesa","economato","haccp","foodcost","brigata","settings"].includes(section)||showDrawer?t.accent:t.inkFaint,
              transition:"all 0.2s",gap:3,position:"relative",
            }}>
              {(["spesa","economato","haccp","foodcost","brigata","settings"].includes(section)||showDrawer)&&
                <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:t.accent,borderRadius:"0 0 3px 3px"}}/>}
              <div style={{
                width:38,height:38,borderRadius:11,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:(["spesa","economato","haccp","foodcost","brigata","settings"].includes(section)||showDrawer)?t.accentGlow:"transparent",
                transition:"all 0.2s",
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="21" height="21"
                  style={{transform:showDrawer?"rotate(45deg)":"none",transition:"transform 0.25s"}}>
                  <circle cx="5" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="19" cy="5" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="5" cy="19" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                  <circle cx="19" cy="19" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <span style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.04em",fontWeight:showDrawer?600:400}}>
                {["spesa","economato","haccp","foodcost","brigata","settings"].includes(section)
                  ? SECTION_TITLE[section]?.slice(0,6)||"Altro"
                  : "Altro"}
              </span>
            </button>
          </nav>
        </>
      )}

      {/* AI Panels */}
      {showAI        && <AIPanel            t={t} onClose={()=>setShowAI(false)}/>}
      {showExport&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowExport(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,borderRadius:16,padding:28,width:460,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--serif)",fontSize:16,fontStyle:"italic",color:t.ink}}>⬇ Esporta Dati</div>
              <button onClick={()=>setShowExport(false)} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,fontSize:20}}>×</button>
            </div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:8,letterSpacing:"0.1em"}}>SEZIONI</div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[{k:"giacenze",l:"Giacenze"},{k:"preparazioni",l:"Preparazioni"},{k:"haccp",l:"HACCP"}].map(({k,l})=>(
                <button key={k} onClick={()=>setExpSections((p:any)=>({...p,[k]:!p[k]}))}
                  style={{padding:"7px 14px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"var(--mono)",fontSize:9,
                    background:(expSections as any)[k]?`linear-gradient(135deg,${t.secondary},${t.secondaryDeep})`:t.bgAlt,
                    color:(expSections as any)[k]?"#fff":t.inkMuted}}>
                  {(expSections as any)[k]?"✓ ":""}{l}
                </button>
              ))}
            </div>
            <div className="mono" style={{fontSize:8,color:t.inkFaint,marginBottom:8,letterSpacing:"0.1em"}}>PARTITA</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
              {[{k:"tutti",l:"Tutte"},...STATIONS.filter((s:any)=>s.key!=="all").map((s:any)=>({k:s.key,l:s.icon+" "+s.label}))].map(({k,l})=>(
                <button key={k} onClick={()=>setExpPartita(k)}
                  style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"var(--mono)",fontSize:9,
                    background:expPartita===k?t.gold:t.bgAlt,
                    color:expPartita===k?"#fff":t.inkMuted}}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={()=>{
              const rows:string[][] = [];
              const sep = ";";
              const allItems = [...(kitchen?.freezer||[]),...(kitchen?.fridge||[]),...(kitchen?.dry||[]),...(kitchen?.counter||[])];
              const filtItems = expPartita==="tutti"?allItems:allItems.filter((x:any)=>x.partita===expPartita);
              if((expSections as any).giacenze){
                rows.push(["GIACENZE","","","","","","",""]);
                rows.push(["Nome","Categoria","Partita","Lotto","Data Produzione","Scadenza","Giacenza","Unita"]);
                filtItems.forEach((x:any)=>rows.push([x.name||"",x.category||"",x.partita||"",x.lot||"",x.insertedDate||"",x.expiresAt?x.expiresAt.slice(0,10):"",String(x.quantity||0),x.unit||""]));
                rows.push([""]);
              }
              if((expSections as any).preparazioni){
                const preps = expPartita==="tutti"?(kitchen?.preparazioni||[]):(kitchen?.preparazioni||[]).filter((p:any)=>p.partita===expPartita||p.reparto===expPartita);
                rows.push(["PREPARAZIONI","","","","",""]);
                rows.push(["Nome","Partita","Stato","Quantita","Unita","Scadenza"]);
                preps.forEach((p:any)=>rows.push([p.nome||"",p.partita||p.reparto||"",p.status||"",String(p.quantita||0),p.unitaMisura||"",p.scadeIl?p.scadeIl.slice(0,10):""]));
                rows.push([""]);
              }
              if((expSections as any).haccp){
                const hLogs:any[] = JSON.parse(localStorage.getItem("hlog-"+kitchen?.id)||"[]");
                const filtLogs = expPartita==="tutti"?hLogs:hLogs;
                rows.push(["HACCP TEMPERATURE","","","",""]);
                rows.push(["Zona","Temperatura","Operatore","Data Ora","Conforme"]);
                filtLogs.forEach((l:any)=>rows.push([l.zona||"",String(l.temp||0),l.op||"",l.at?l.at.slice(0,16).replace("T"," "):"",l.ok?"SI":"NO"]));
              }
              const csv = rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(sep)).join("\n");
              const a = document.createElement("a");
              a.href = "data:text/csv;charset=utf-8,﻿"+encodeURIComponent(csv);
              a.download = "kitchenpro-export-"+new Date().toISOString().slice(0,10)+".csv";
              a.click();
              setShowExport(false);
            }} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg,${t.gold},${t.goldBright})`,color:"#fff",
              fontFamily:"var(--mono)",fontSize:11,letterSpacing:"0.06em"}}>
              ⬇ Scarica CSV (Excel)
            </button>
          </div>
        </div>
      )}
      {showBriefing  && <BriefingPanel      kitchen={kitchen} t={t} onClose={()=>setShowBriefing(false)}/>}
      {showWasteAI   && <WasteAnalysisPanel kitchen={kitchen} t={t} onClose={()=>setShowWasteAI(false)}/>}
      {showMenuAI    && <MenuFromExpiryPanel kitchen={kitchen} t={t} onClose={()=>setShowMenuAI(false)}/>}
      {showMEPAI     && <MEPPlannerAI       kitchen={kitchen} t={t} onClose={()=>setShowMEPAI(false)}/>}
      {showImportAI  && <SmartDocImportPanel kitchen={kitchen} t={t} onClose={()=>setShowImportAI(false)}/>}
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   BOTTOM NAV — implementato inline in KitchenProInner
   (rimossa versione standalone per evitare re-render)
   ════════════════════════════════════════════════════════ */
function BottomNav_UNUSED({ active, onChange, alertCount=0, t }) {
  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      height:"calc(56px + env(safe-area-inset-bottom,0px))",
      paddingBottom:"env(safe-area-inset-bottom,0px)",
      display:"flex", alignItems:"stretch",
      background:t.bgCard, borderTop:`1px solid ${t.div}`,
      boxShadow:`0 -4px 20px ${t.shadow}`,
    }}>
      {MAIN_NAV.map(n=>{
        const isActive = active===n.key;
        const hasAlert = n.key==="giacenze" && alertCount>0;
        return (
          <button key={n.key} onClick={()=>onChange(n.key)} style={{
            flex:1, border:"none", background:"none",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            gap:3, cursor:"pointer", position:"relative",
            color:isActive?t.accent:t.inkMuted,
            minWidth:44, padding:"4px 0",
            transition:"color 0.2s",
          }}>
            {isActive&&(
              <div style={{
                position:"absolute", top:0, left:"50%",
                transform:"translateX(-50%)",
                width:28, height:2,
                background:t.accent, borderRadius:"0 0 3px 3px",
              }}/>
            )}
            <div style={{position:"relative", fontSize:20}}>
              {n.icon}
              {hasAlert&&(
                <span style={{
                  position:"absolute", top:-5, right:-8,
                  width:16, height:16, borderRadius:"50%",
                  background:t.danger, color:"#fff",
                  fontSize:9, fontFamily:"var(--mono)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>{alertCount>9?"9+":alertCount}</span>
              )}
            </div>
            <span style={{
              fontSize:9, fontFamily:"var(--mono)",
              letterSpacing:"0.04em",
              fontWeight:isActive?600:400,
            }}>{n.mobileLabel||n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ════════════════════════════════════════════════════════
   GLOBAL CSS
   ════════════════════════════════════════════════════════ */
function CSS(t) {
  return `
    /* caratteri: quelli dell'app */
    :root { --serif:var(--f-display); --mono:var(--f-ui); }
    .kp-host .mono{letter-spacing:0!important;text-transform:none}
    *{margin:0;padding:0;box-sizing:border-box;}
    .mono{font-family:var(--mono);}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}
    @keyframes pulseGlow{0%,100%{box-shadow:0 0 8px currentColor}50%{box-shadow:0 0 20px currentColor}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    @keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes cardInFast{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${t.goldDim};border-radius:2px;}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${t.ink==="#151210"?"none":"invert(1)"};}
    /* ── MOBILE TOUCH ── */
    @media(max-width:768px){
      .kp-host div[style*="marginLeft"]{margin-left:0!important;}
      .kp-host header{padding:12px 16px!important;}
    }
    .kp-host button,.kp-host [role=button]{min-height:40px;}
    .bottom-nav{position:fixed;bottom:0;left:0;right:0;}
    /* touch scrolling */
    *{-webkit-overflow-scrolling:touch;}
    /* no horizontal overflow */

    input,select{color-scheme:${t.bg.startsWith("#0")||t.bg.startsWith("#1")||t.bg.startsWith("#2")?"dark":"light"};}
    /* ── TOUCH & MOBILE ── */
    button,input,select,a{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    html,body{-webkit-text-size-adjust:100%;overflow-x:hidden;}
    input[type=number]{-moz-appearance:textfield;}
    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
    /* ── FOCUS ── */
    button:focus-visible{outline:2px solid ${t.gold};outline-offset:2px;}
    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${t.goldDim};border-radius:2px;}
    /* ── MOBILE safe area ── */
    @supports(padding:env(safe-area-inset-bottom)){
      .kp-bottom-nav{ padding-bottom:env(safe-area-inset-bottom,0px); }
    }
  `;
}