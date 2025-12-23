function findThemeSet(config, id) {
  const sets = config?.data?.theme_sets
  if (!Array.isArray(sets)) return null
  return sets.find((s) => s && s.id === id) || null
}

export function resolveThemeForPage(config, page) {
  const defaultId = config?.data?.resolved_theme_set
  const pageId = page?.theme_set

  return (
    findThemeSet(config, pageId) ||
    findThemeSet(config, defaultId) ||
    (Array.isArray(config?.data?.theme_sets) ? config.data.theme_sets[0] : null) ||
    null
  )
}

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  const v = hex.trim()
  if (!v.startsWith('#')) return null
  const raw = v.slice(1)
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16)
    const g = parseInt(raw[1] + raw[1], 16)
    const b = parseInt(raw[2] + raw[2], 16)
    return { r, g, b }
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16)
    const g = parseInt(raw.slice(2, 4), 16)
    const b = parseInt(raw.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

export function toRgba(color, alpha) {
  if (typeof color !== 'string') return `rgba(0,0,0,${alpha})`
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) return color
  const rgb = hexToRgb(color)
  if (!rgb) return `rgba(0,0,0,${alpha})`
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
}
