import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { resolveThemeForPage, toRgba } from './lib/theme.js'

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text), error: null }
  } catch (e) {
    return { ok: false, value: null, error: e }
  }
}

function clampIndex(idx, len) {
  if (len <= 0) return 0
  return Math.max(0, Math.min(len - 1, idx))
}

function computePagesRanges(text) {
  if (typeof text !== 'string') return []
  const keyIdx = text.indexOf('"pages"')
  if (keyIdx < 0) return []
  const arrStart = text.indexOf('[', keyIdx)
  if (arrStart < 0) return []

  const ranges = []
  let i = arrStart + 1
  let inString = false
  let escape = false
  let depth = 0
  let start = -1

  for (; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') {
      if (depth === 0) start = i
      depth++
      continue
    }

    if (ch === '}') {
      if (depth > 0) depth--
      if (depth === 0 && start >= 0) {
        ranges.push({ start, end: i + 1 })
        start = -1
      }
      continue
    }

    if (ch === ']' && depth === 0) break
  }

  return ranges
}

function findPageIndexAtOffset(ranges, offset) {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]
    if (offset >= r.start && offset <= r.end) return i
  }
  return null
}

function StoryPreview({ config, activeIndex, onActiveIndexChange, onManualNavigate }) {
  const data = config?.data
  const pages = Array.isArray(data?.pages) ? data.pages : []

  useEffect(() => {
    onActiveIndexChange(clampIndex(activeIndex, pages.length))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length])

  const activePage = pages[activeIndex]
  const theme = useMemo(() => resolveThemeForPage(config, activePage), [config, activePage])

  const design = theme?.design || {}
  const bgGradient = Array.isArray(design.background_gradient) ? design.background_gradient : null
  const bgColor = design.background_color || null
  const textColor = design.text_color || '#111827'
  const accentColor = design.accent_color || '#6366F1'
  const bgImage = design.background_image && design.background_image.url ? design.background_image : null

  const baseLayer =
    bgGradient && bgGradient.length >= 2
      ? `linear-gradient(180deg, ${bgGradient[0]}, ${bgGradient[1]})`
      : `linear-gradient(${bgColor || '#ffffff'}, ${bgColor || '#ffffff'})`

  const backgroundLayers = bgImage
    ? [
        `linear-gradient(${bgImage.overlay_color || 'rgba(0,0,0,0.25)'}, ${
          bgImage.overlay_color || 'rgba(0,0,0,0.25)'
        })`,
        baseLayer,
        `url(${bgImage.url})`,
      ]
    : [baseLayer]

  const containerStyle = {
    color: textColor,
    backgroundImage: backgroundLayers.join(', '),
    backgroundSize: bgImage ? 'auto, auto, cover' : 'auto',
    backgroundPosition: bgImage ? 'center, center, center' : 'center',
    backgroundRepeat: bgImage ? 'no-repeat, no-repeat, no-repeat' : 'no-repeat',
    backgroundBlendMode: bgImage ? 'normal, multiply, normal' : 'normal',
  }

  const content = activePage?.content || {}
  const valueText = content.value !== undefined ? String(content.value) : ''

  function computeValueFontSize(text) {
    const t = typeof text === 'string' ? text.trim() : ''
    const len = t.length
    if (len <= 10) return 54
    if (len <= 16) return 48
    if (len <= 26) return 40
    if (len <= 40) return 34
    return 30
  }

  const pillBase = {
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.2,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: `1px solid ${toRgba(textColor, 0.16)}`,
  }

  const labelPillStyle = {
    ...pillBase,
    background: toRgba(textColor, 0.12),
    color: textColor,
  }

  const highlightPillStyle = {
    ...pillBase,
    background: toRgba(accentColor, 0.25),
    border: `1px solid ${toRgba(accentColor, 0.35)}`,
    color: textColor,
  }

  const chromeBackplate = {
    background: toRgba(textColor, 0.14),
    border: `1px solid ${toRgba(textColor, 0.18)}`,
    boxShadow: `0 6px 18px ${toRgba('#000000', 0.18)}`,
  }

  const navBtnStyle = {
    ...chromeBackplate,
    color: textColor,
  }

  const navMetaStyle = {
    color: toRgba(textColor, 0.72),
    textShadow: `0 1px 10px ${toRgba('#000000', 0.18)}`,
  }

  const valueStyle = {
    fontSize: computeValueFontSize(valueText),
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: -1.5,
    textAlign: 'center',
    margin: '14px 0 10px',
    maxWidth: 320,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    textShadow: `0 1px 22px ${toRgba('#000000', 0.12)}`,
  }

  const titleStyle = {
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 800,
    textAlign: 'center',
    margin: 0,
    textShadow: `0 1px 24px ${toRgba('#000000', 0.12)}`,
  }

  const subtitleStyle = {
    fontSize: 16,
    lineHeight: 1.4,
    opacity: 0.92,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 300,
  }

  function goPrev() {
    onManualNavigate?.()
    onActiveIndexChange(clampIndex(activeIndex - 1, pages.length))
  }

  function goNext() {
    onManualNavigate?.()
    onActiveIndexChange(clampIndex(activeIndex + 1, pages.length))
  }

  function handleTap(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 2) goPrev()
    else goNext()
  }

  return (
    <div className="previewWrap">
      <div className="phoneFrame">
        <div className="story" style={containerStyle} onClick={handleTap}>
          <div className="storyTop">
            <div className="progress">
              {pages.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className={idx <= activeIndex ? 'bar barActive' : 'bar'}
                  style={{
                    background:
                      idx <= activeIndex ? toRgba(textColor, 0.85) : toRgba(textColor, 0.28),
                    boxShadow: `0 1px 10px ${toRgba('#000000', 0.16)}`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="storyBody">
            {activePage?.type === 'cover' || activePage?.type === 'closing' ? (
              <div className="centered">
                <h1 style={titleStyle}>{content.title || ''}</h1>
                {content.subtitle ? <div style={subtitleStyle}>{content.subtitle}</div> : null}
              </div>
            ) : (
              <div className="centered">
                {content.label ? <div style={labelPillStyle}>{content.label}</div> : null}
                {content.value !== undefined ? <div style={valueStyle}>{valueText}</div> : null}
                {content.highlight ? <div style={highlightPillStyle}>{content.highlight}</div> : null}
              </div>
            )}
          </div>

          <div className="storyBottom">
            <div className="navRow">
              <button
                className="navBtn"
                style={navBtnStyle}
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                disabled={activeIndex === 0}
              >
                Prev
              </button>
              <div className="navMeta">
                {data?.wrapped_year ? <span className="muted" style={navMetaStyle}>Wrapped {data.wrapped_year}</span> : null}
                <span className="muted" style={navMetaStyle}>
                  {pages.length ? `${activeIndex + 1} / ${pages.length}` : 'No pages'}
                </span>
              </div>
              <button
                className="navBtn"
                style={navBtnStyle}
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                disabled={activeIndex >= pages.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="hint">
        Click left/right side of the story to navigate.
      </div>
    </div>
  )
}

export default function App() {
  const [editorText, setEditorText] = useState('')
  const [parsedConfig, setParsedConfig] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canSaveToServer, setCanSaveToServer] = useState(true)
  const debounceRef = useRef(null)
  const editorTextRef = useRef('')
  const monacoEditorRef = useRef(null)
  const cursorDebounceRef = useRef(null)
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [followCursor, setFollowCursor] = useState(true)
  const followCursorRef = useRef(true)

  useEffect(() => {
    followCursorRef.current = followCursor
  }, [followCursor])

  async function loadConfig() {
    let text = ''
    try {
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error('api_not_ok')
      text = await res.text()
      setCanSaveToServer(true)
    } catch {
      const res = await fetch('/config.json', { cache: 'no-store' })
      text = await res.text()
      setCanSaveToServer(false)
    }
    setEditorText(text)
    editorTextRef.current = text

    const parsed = safeJsonParse(text)
    if (parsed.ok) {
      setParsedConfig(parsed.value)
      setParseError(null)
    } else {
      setParsedConfig(null)
      setParseError(String(parsed.error?.message || parsed.error))
    }
    setDirty(false)
  }

  useEffect(() => {
    loadConfig()
  }, [])

  function scheduleParse(nextText) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const parsed = safeJsonParse(nextText)
      if (parsed.ok) {
        setParsedConfig(parsed.value)
        setParseError(null)
      } else {
        setParsedConfig(null)
        setParseError(String(parsed.error?.message || parsed.error))
      }
    }, 450)
  }

  function scheduleCursorSync(nextText) {
    if (!followCursorRef.current) return
    const editor = monacoEditorRef.current
    if (!editor) return

    if (cursorDebounceRef.current) window.clearTimeout(cursorDebounceRef.current)
    cursorDebounceRef.current = window.setTimeout(() => {
      try {
        const pos = editor.getPosition()
        const model = editor.getModel()
        if (!pos || !model) return

        const offset = model.getOffsetAt(pos)
        const ranges = computePagesRanges(nextText)
        const idx = findPageIndexAtOffset(ranges, offset)
        if (idx === null) return

        const pagesLen = Array.isArray(parsedConfig?.data?.pages) ? parsedConfig.data.pages.length : 0
        const len = pagesLen || ranges.length
        setActivePageIndex(clampIndex(idx, len || 1))
      } catch {
        // ignore
      }
    }, 120)
  }

  useEffect(() => {
    if (!followCursorRef.current) return
    const editor = monacoEditorRef.current
    if (!editor) return
    scheduleCursorSync(editor.getValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followCursor])

  async function saveConfig() {
    setSaving(true)
    try {
      const parsed = safeJsonParse(editorText)
      if (!parsed.ok) {
        setParseError(String(parsed.error?.message || parsed.error))
        return
      }

      if (canSaveToServer) {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.value),
        })

        if (!res.ok) {
          throw new Error('Save failed')
        }

        const savedText = await res.text()
        setEditorText(savedText)
        editorTextRef.current = savedText
        setDirty(false)
      } else {
        const pretty = JSON.stringify(parsed.value, null, 2) + '\n'
        const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'config.json'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="title">Year Wrap Preview</div>
        <div className="actions">
          <button className="btn" onClick={loadConfig} type="button">
            Reload
          </button>
          <button className="btn btnPrimary" onClick={saveConfig} type="button" disabled={saving || !dirty}>
            {saving ? 'Saving…' : canSaveToServer ? 'Save' : 'Download config.json'}
          </button>
        </div>
      </header>

      <div className="split">
        <section className="pane paneLeft">
          <div className="paneHeader">
            <div className="paneTitle">config.json</div>
            <div className={parseError ? 'status statusError' : dirty ? 'status statusWarn' : 'status statusOk'}>
              {parseError ? `Invalid JSON: ${parseError}` : dirty ? 'Unsaved changes' : 'Valid'}
            </div>
          </div>

          <div className="editorWrap">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={editorText}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
              onChange={(val) => {
                const nextText = val ?? ''
                setEditorText(nextText)
                editorTextRef.current = nextText
                setDirty(true)
                scheduleParse(nextText)
                scheduleCursorSync(nextText)
              }}
              onMount={(editor) => {
                monacoEditorRef.current = editor
                editor.onDidChangeCursorPosition(() => {
                  scheduleCursorSync(editor.getValue())
                })
              }}
            />
          </div>
        </section>

        <section className="pane paneRight">
          <div className="paneHeader">
            <div className="paneTitle">Preview</div>
            <div className={followCursor ? 'status statusOk' : 'status statusWarn'}>
              {parsedConfig ? (followCursor ? 'Follow cursor' : 'Manual') : 'Waiting for valid JSON'}
            </div>
          </div>

          <div className="previewArea">
            {parsedConfig ? (
              <div style={{ width: '100%', display: 'grid', placeItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                    <input
                      type="checkbox"
                      checked={followCursor}
                      style={{ accentColor: '#A5B4FC' }}
                      onChange={(e) => setFollowCursor(e.target.checked)}
                    />
                    Follow cursor
                  </label>
                </div>
                <StoryPreview
                  config={parsedConfig}
                  activeIndex={activePageIndex}
                  onActiveIndexChange={setActivePageIndex}
                  onManualNavigate={() => setFollowCursor(false)}
                />
              </div>
            ) : (
              <div className="emptyState">Fix JSON to see preview.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
