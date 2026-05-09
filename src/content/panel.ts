import type { TodayStats } from './api'

const PANEL_ID = '__dh_panel__'
const STORE_KEY = 'dh_panel_v1'
const PANEL_W = 200   // expanded width (px)
const SNAP_DIST = 80  // px from edge to trigger snap

interface State {
  y: number
  x: number
  collapsed: boolean
  edge: 'left' | 'right'
}

function loadState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (!s) throw new Error()
    return {
      y: clamp(Number(s.y), 40, window.innerHeight - 160),
      x: clamp(Number(s.x), 0, window.innerWidth - PANEL_W),
      collapsed: Boolean(s.collapsed),
      edge: s.edge === 'left' ? 'left' : 'right',
    }
  } catch {
    return { y: 80, x: window.innerWidth - PANEL_W - 20, collapsed: false, edge: 'right' }
  }
}

function save(s: State) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch {}
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max))
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLE = `
#${PANEL_ID} {
  position: fixed;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  user-select: none;
  box-sizing: border-box;
  transition: box-shadow .2s;
}

/* ── Expanded ── */
#${PANEL_ID}.dh-expanded {
  width: ${PANEL_W}px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 14px;
  box-shadow: 0 6px 28px rgba(0,0,0,.13);
  overflow: hidden;
}
#${PANEL_ID}.dh-expanded .dh-handle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  cursor: grab;
  background: #fafafa;
  border-bottom: 1px solid rgba(0,0,0,.05);
}
#${PANEL_ID}.dh-expanded .dh-handle:active { cursor: grabbing; }
#${PANEL_ID} .dh-handle-label {
  font-size: 11px;
  color: #aaa;
  letter-spacing: 1px;
}
#${PANEL_ID} .dh-actions { display: flex; gap: 6px; }
#${PANEL_ID} .dh-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #ccc;
  font-size: 15px;
  padding: 0;
  line-height: 1;
  transition: color .15s;
  display: flex;
  align-items: center;
}
#${PANEL_ID} .dh-icon-btn:hover { color: #555; }
#${PANEL_ID} .dh-icon-btn.spin { animation: dh-spin .7s linear infinite; }
@keyframes dh-spin { to { transform: rotate(360deg); } }

#${PANEL_ID}.dh-expanded .dh-body { padding: 12px 14px 14px; }
#${PANEL_ID} .dh-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
#${PANEL_ID} .dh-row:last-of-type { margin-bottom: 0; }
#${PANEL_ID} .dh-label { font-size: 12px; color: #888; }
#${PANEL_ID} .dh-val  { font-size: 20px; font-weight: 700; color: #111; margin-left: 8px; }
#${PANEL_ID} .dh-unit { font-size: 11px; color: #bbb; margin-left: 2px; }
#${PANEL_ID} .dh-tip {
  font-size: 11px;
  color: #ccc;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
#${PANEL_ID} .dh-tip.err { color: #f56; }
#${PANEL_ID} .dh-label-warn { color: #dc2626; }
#${PANEL_ID} .dh-val-warn   { color: #dc2626; }
#${PANEL_ID} .dh-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 6px 0 8px;
}

/* ── Tab elements: hidden by default, shown only when collapsed ── */
#${PANEL_ID} .dh-tab-icon,
#${PANEL_ID} .dh-tab-count { display: none; }

/* ── Collapsed (edge tab) ── */
#${PANEL_ID}.dh-collapsed {
  width: 28px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  cursor: pointer;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
#${PANEL_ID}.dh-collapsed .dh-handle,
#${PANEL_ID}.dh-collapsed .dh-body { display: none; }
#${PANEL_ID}.dh-collapsed .dh-tab-icon {
  display: block;
  font-size: 14px;
  writing-mode: vertical-rl;
}
#${PANEL_ID}.dh-collapsed .dh-tab-count {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  writing-mode: vertical-rl;
  line-height: 1;
}

#${PANEL_ID}.dh-edge-right { border-radius: 10px 0 0 10px; border-right: none; }
#${PANEL_ID}.dh-edge-left  { border-radius: 0 10px 10px 0; border-left: none;  }
`

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function applyPos(el: HTMLElement, s: State) {
  el.style.top = `${s.y}px`
  if (s.collapsed) {
    el.classList.remove('dh-expanded')
    el.classList.add('dh-collapsed')
    el.classList.toggle('dh-edge-right', s.edge === 'right')
    el.classList.toggle('dh-edge-left', s.edge === 'left')
    // Use inline style directly — avoids CSS specificity conflicts
    if (s.edge === 'right') {
      el.style.left = 'auto'
      el.style.right = '0px'
    } else {
      el.style.right = 'auto'
      el.style.left = '0px'
    }
  } else {
    el.classList.remove('dh-collapsed', 'dh-edge-right', 'dh-edge-left')
    el.classList.add('dh-expanded')
    el.style.right = 'auto'
    el.style.left = `${s.x}px`
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PanelAPI {
  el: HTMLElement
  setLoading(on: boolean): void
  setError(msg: string): void
  setStats(stats: TodayStats): void
}

export function createPanel(onRefresh: () => void): PanelAPI {
  // inject style once
  if (!document.getElementById(`${PANEL_ID}_s`)) {
    const s = document.createElement('style')
    s.id = `${PANEL_ID}_s`
    s.textContent = STYLE
    document.head.appendChild(s)
  }

  const state = loadState()

  const el = document.createElement('div')
  el.id = PANEL_ID
  el.innerHTML = `
    <div class="dh-handle">
      <span class="dh-handle-label">TODAY</span>
      <div class="dh-actions">
        <button class="dh-icon-btn" id="dh-refresh" title="刷新">↻</button>
        <button class="dh-icon-btn" id="dh-pin" title="收起">⊙</button>
      </div>
    </div>
    <div class="dh-body">
      <div class="dh-row">
        <span class="dh-label">发布作品</span>
        <span><span class="dh-val" id="dh-c">--</span><span class="dh-unit">条</span></span>
      </div>
      <div class="dh-row dh-row-throttle">
        <span class="dh-label dh-label-warn">⚠ 限流</span>
        <span><span class="dh-val dh-val-warn" id="dh-th">--</span><span class="dh-unit">条</span></span>
      </div>
      <div class="dh-divider"></div>
      <div class="dh-row">
        <span class="dh-label">▶ 播放</span>
        <span class="dh-val" id="dh-p">--</span>
      </div>
      <div class="dh-row">
        <span class="dh-label">♥ 点赞</span>
        <span class="dh-val" id="dh-d">--</span>
      </div>
      <div class="dh-row">
        <span class="dh-label">💬 评论</span>
        <span class="dh-val" id="dh-cm">--</span>
      </div>
      <div class="dh-row">
        <span class="dh-label">★ 收藏</span>
        <span class="dh-val" id="dh-cl">--</span>
      </div>
      <div class="dh-row">
        <span class="dh-label">↗ 分享</span>
        <span class="dh-val" id="dh-s">--</span>
      </div>
      <div class="dh-row">
        <span class="dh-label">⇄ 转发</span>
        <span class="dh-val" id="dh-f">--</span>
      </div>
      <div class="dh-tip" id="dh-t">加载中...</div>
    </div>
    <span class="dh-tab-icon">📊</span>
    <span class="dh-tab-count" id="dh-tab-c">--</span>
  `
  document.body.appendChild(el)
  applyPos(el, state)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handle = el.querySelector<HTMLElement>('.dh-handle')!
  let dragging = false
  let ox = 0, oy = 0, sx = 0, sy = 0

  handle.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging = true
    ox = e.clientX; oy = e.clientY
    sx = state.x;  sy = state.y
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    state.x = clamp(sx + e.clientX - ox, 0, window.innerWidth - PANEL_W)
    state.y = clamp(sy + e.clientY - oy, 0, window.innerHeight - el.offsetHeight)
    el.style.right = 'auto'
    el.style.left = `${state.x}px`
    el.style.top  = `${state.y}px`
  })

  window.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false

    // snap to edge?
    if (state.x <= SNAP_DIST) {
      state.collapsed = true; state.edge = 'left'
    } else if (state.x >= window.innerWidth - PANEL_W - SNAP_DIST) {
      state.collapsed = true; state.edge = 'right'
    }

    applyPos(el, state)
    save(state)
  })

  // ── Buttons ───────────────────────────────────────────────────────────────
  el.querySelector('#dh-refresh')!.addEventListener('click', (e) => {
    e.stopPropagation()
    onRefresh()
  })

  el.querySelector('#dh-pin')!.addEventListener('click', (e) => {
    e.stopPropagation()
    state.edge = state.x + PANEL_W / 2 > window.innerWidth / 2 ? 'right' : 'left'
    state.collapsed = true
    applyPos(el, state)
    save(state)
  })

  // ── Click collapsed tab to expand ─────────────────────────────────────────
  el.addEventListener('click', () => {
    if (!state.collapsed) return
    state.collapsed = false
    state.x = state.edge === 'right'
      ? window.innerWidth - PANEL_W - 20
      : 20
    applyPos(el, state)
    save(state)
  })

  // ── Public API ─────────────────────────────────────────────────────────────
  const throttleEl = el.querySelector<HTMLElement>('#dh-th')!
  const tip        = el.querySelector<HTMLElement>('#dh-t')!
  const countEl    = el.querySelector<HTMLElement>('#dh-c')!
  const playsEl    = el.querySelector<HTMLElement>('#dh-p')!
  const diggsEl    = el.querySelector<HTMLElement>('#dh-d')!
  const commentsEl = el.querySelector<HTMLElement>('#dh-cm')!
  const collectsEl = el.querySelector<HTMLElement>('#dh-cl')!
  const sharesEl   = el.querySelector<HTMLElement>('#dh-s')!
  const forwardsEl = el.querySelector<HTMLElement>('#dh-f')!
  const tabC       = el.querySelector<HTMLElement>('#dh-tab-c')!
  const refreshBtn = el.querySelector<HTMLElement>('#dh-refresh')!

  return {
    el,
    setLoading(on) {
      refreshBtn.classList.toggle('spin', on)
      refreshBtn.style.pointerEvents = on ? 'none' : ''
      if (on) { tip.textContent = '加载中...'; tip.classList.remove('err') }
    },
    setError(msg) {
      tip.textContent = `错误: ${msg}`
      tip.classList.add('err')
    },
    setStats(stats) {
      countEl.textContent    = String(stats.count)
      throttleEl.textContent = String(stats.throttled)
      playsEl.textContent    = fmt(stats.plays)
      diggsEl.textContent    = fmt(stats.diggs)
      commentsEl.textContent = fmt(stats.comments)
      collectsEl.textContent = fmt(stats.collects)
      sharesEl.textContent   = fmt(stats.shares)
      forwardsEl.textContent = fmt(stats.forwards)
      tabC.textContent       = String(stats.count)
      tip.textContent        = `${new Date().toLocaleTimeString()} 更新`
      tip.classList.remove('err')
    },
  }
}

function fmt(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}亿`
  if (n >= 1_0000)      return `${(n / 1_0000).toFixed(1)}万`
  return String(n)
}
