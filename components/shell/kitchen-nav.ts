/** dentro la stessa cucina si cambia sezione senza ricaricare la pagina dal server */
export function kitchenNav(e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean } | null, href: string) {
  const m = href.match(/^(\/cucine\/[^/?]+\/app)\?s=([\w-]+)/)
  if (!m || location.pathname !== m[1] || e?.metaKey || e?.ctrlKey) return false
  e?.preventDefault()
  window.history.pushState(null, '', href)
  window.dispatchEvent(new CustomEvent('kp-nav', { detail: m[2] }))
  return true
}

