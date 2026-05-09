const STYLE_ID = '__dh_marker_style__'
const MARKED_ATTR = 'data-dh-marked'
const AWEME_ATTR = 'data-dh-aweme-id'

const STYLE = `
[${MARKED_ATTR}] {
  outline: 1.5px solid rgba(220, 38, 38, 0.35) !important;
  border-radius: 4px;
  background-color: rgba(220, 38, 38, 0.04) !important;
}
.__dh_badge__ {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 99;
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 4px;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
`

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = STYLE
  document.head.appendChild(el)
}

// 从 DOM 节点的 React Fiber 树中读取 aweme_id
function readAwemeIdFromFiber(el: Element): string | null {
  // React 16 用 __reactInternalInstance$xxx，17+ 用 __reactFiber$xxx
  const fiberKey = Object.keys(el).find(
    k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
  )
  if (!fiberKey) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber = (el as any)[fiberKey]
  for (let i = 0; i < 50 && fiber; i++) {
    const props = fiber.memoizedProps as Record<string, unknown> | null
    if (props) {
      const id =
        props.aweme_id ??
        (props.item as Record<string, unknown>)?.aweme_id ??
        (props.data as Record<string, unknown>)?.aweme_id ??
        (props.awemeInfo as Record<string, unknown>)?.aweme_id
      if (id) return String(id)
    }
    fiber = fiber.return
  }
  return null
}

// 给页面上所有未打标签的卡片打上 aweme_id 属性，并在封面上显示 id（调试用）
function tagCards() {
  const cards = document.querySelectorAll<HTMLElement>(`[class*="video-card-new"]:not([${AWEME_ATTR}])`)
  console.log('[DH] 待标签卡片数:', cards.length)
  for (const card of cards) {
    const id = readAwemeIdFromFiber(card)
    if (id) {
      card.setAttribute(AWEME_ATTR, id)
      console.log('[DH] 卡片标签成功:', id)

      // 在封面左下角显示 aweme_id，方便肉眼核对
      const cover = card.querySelector<HTMLElement>('[class*="video-card-cover"]')
      if (cover && !cover.querySelector('.__dh_id_label__')) {
        const label = document.createElement('span')
        label.className = '__dh_id_label__'
        label.textContent = id
        label.style.cssText = [
          'position:absolute', 'bottom:4px', 'left:4px', 'right:4px',
          'z-index:99', 'background:rgba(0,0,0,0.65)', 'color:#fff',
          'font-size:10px', 'line-height:1.3', 'padding:2px 4px',
          'border-radius:3px', 'word-break:break-all',
          'font-family:monospace', 'pointer-events:none',
        ].join(';')
        cover.appendChild(label)
      }
    } else {
      console.warn('[DH] Fiber 读取失败:', card.className.slice(0, 40))
    }
  }
}

function markCard(card: HTMLElement) {
  if (card.hasAttribute(MARKED_ATTR)) return
  card.setAttribute(MARKED_ATTR, '1')

  const cover = card.querySelector<HTMLElement>('[class*="video-card-cover"]')
  if (cover) {
    const badge = document.createElement('span')
    badge.className = '__dh_badge__'
    badge.textContent = '限流'
    cover.appendChild(badge)
  }
}

let throttledSet = new Set<string>()
let mo: MutationObserver | null = null

function applyMarks() {
  tagCards()
  document.querySelectorAll<HTMLElement>(`[${AWEME_ATTR}]`).forEach(card => {
    const id = card.getAttribute(AWEME_ATTR)!
    if (throttledSet.has(id)) markCard(card)
  })
}

// 启动标记（同时开启 MutationObserver 监听后续新卡片）
export function startMarking(ids: string[] = []) {
  injectStyle()
  throttledSet = new Set(ids)
  applyMarks()

  if (!mo) {
    mo = new MutationObserver(applyMarks)
    mo.observe(document.body, { childList: true, subtree: true })
  }
}

// 页面翻页时追加新的限流 ID，不重置已有标记
export function addIds(ids: string[]) {
  injectStyle()
  ids.forEach(id => throttledSet.add(id))
  applyMarks()

  if (!mo) {
    mo = new MutationObserver(applyMarks)
    mo.observe(document.body, { childList: true, subtree: true })
  }
}

export function stopMarking() {
  mo?.disconnect()
  mo = null
  throttledSet.clear()
  document.querySelectorAll('.__dh_badge__').forEach(el => el.remove())
  document.querySelectorAll(`[${MARKED_ATTR}]`).forEach(el => el.removeAttribute(MARKED_ATTR))
  document.querySelectorAll(`[${AWEME_ATTR}]`).forEach(el => el.removeAttribute(AWEME_ATTR))
}
