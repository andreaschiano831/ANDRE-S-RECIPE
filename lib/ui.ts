export function bookGradient(color: string) {
  return `linear-gradient(155deg, color-mix(in srgb, ${color} 45%, #000), ${color} 70%, color-mix(in srgb, ${color} 80%, #fff))`
}
