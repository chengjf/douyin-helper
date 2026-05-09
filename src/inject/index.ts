;(function () {
  console.log('[DH inject] 脚本已加载')

  const AWEME_ATTR   = 'data-dh-id'
  const MARKED_ATTR  = 'data-dh-marked'
  const STYLE_ID     = '__dh_inject_style__'
  const throttledSet = new Set<string>()

  // ── 样式 ─────────────────────────────────────────────────────────────────
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement('style')
    s.id = STYLE_ID
    s.textContent = `
      [${MARKED_ATTR}] {
        outline: 1.5px solid rgba(220,38,38,.35) !important;
        border-radius: 4px;
        background: rgba(220,38,38,.04) !important;
      }
      .__dh_badge__ {
        position:absolute; top:6px; left:6px; z-index:99;
        background:rgba(220,38,38,.9); color:#fff;
        font-size:11px; font-weight:600; line-height:1;
        padding:3px 7px; border-radius:4px;
        pointer-events:none; white-space:nowrap;
        font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
      }
      .__dh_id_label__ {
        display:block; width:fit-content; margin-top:5px;
        font-size:11px; color:#aaa; font-family:monospace;
        cursor:pointer; user-select:none;
        padding:1px 6px; border-radius:3px;
        border:1px solid #ebebeb; background:#fafafa;
        transition:color .15s, border-color .15s;
        line-height:1.6;
      }
      .__dh_id_label__:hover { color:#555; border-color:#bbb; }
    `
    document.head.appendChild(s)
  }

  // ── React Fiber 读取 aweme_id + status_value ─────────────────────────────
  interface ItemInfo { awemeId: string; statusValue: number }

  function getItemInfo(el: Element): ItemInfo | null {
    const fiberKey = Object.keys(el).find(
      k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    )
    if (!fiberKey) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber = (el as any)[fiberKey]
    for (let i = 0; i < 60 && fiber; i++) {
      const p = fiber.memoizedProps as Record<string, unknown> | null
      if (p) {
        // 尝试几种常见的 props 结构
        for (const obj of [p, p.item, p.data, p.awemeInfo] as Record<string, unknown>[]) {
          if (obj?.aweme_id) {
            return {
              awemeId:     String(obj.aweme_id),
              statusValue: Number(obj.status_value ?? 0),
            }
          }
        }
      }
      fiber = fiber.return
    }
    return null
  }

  // ── 标记单张卡片 ──────────────────────────────────────────────────────────
  function processCard(card: HTMLElement) {
    // 首次：从 fiber 读取 aweme_id 和 status_value
    if (!card.hasAttribute(AWEME_ATTR)) {
      const info = getItemInfo(card)
      if (!info) return

      card.setAttribute(AWEME_ATTR, info.awemeId)

      // status_value === 143 直接入限流集合，无需等 API 拦截
      if (info.statusValue === 143) throttledSet.add(info.awemeId)

      console.log('[DH inject]', info.awemeId, 'status_value:', info.statusValue)

      // 在「已发布」行下方插入 aweme_id，点击可复制
      const infoOp = card.querySelector<HTMLElement>('[class*="info-op"][class*="info-row"]')
      if (infoOp && !infoOp.parentElement?.querySelector('.__dh_id_label__')) {
        const lbl = document.createElement('span')
        lbl.className = '__dh_id_label__'
        lbl.title = '点击复制 aweme_id'
        lbl.textContent = info.awemeId
        lbl.addEventListener('click', (e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(info.awemeId).then(() => {
            const prev = lbl.textContent
            lbl.textContent = '✓ 已复制'
            lbl.style.color = '#16a34a'
            setTimeout(() => { lbl.textContent = prev; lbl.style.color = '' }, 1500)
          })
        })
        infoOp.insertAdjacentElement('afterend', lbl)
      }
    }

    // 若在限流集合里，打角标
    const awemeId = card.getAttribute(AWEME_ATTR)!
    if (throttledSet.has(awemeId) && !card.hasAttribute(MARKED_ATTR)) {
      card.setAttribute(MARKED_ATTR, '1')
      const cover = card.querySelector<HTMLElement>('[class*="video-card-cover"]')
      if (cover && !cover.querySelector('.__dh_badge__')) {
        const badge = document.createElement('span')
        badge.className = '__dh_badge__'
        badge.textContent = '限流'
        cover.appendChild(badge)
      }
    }
  }

  function processAllCards() {
    ensureStyle()
    document.querySelectorAll<HTMLElement>('[class*="video-card-new"]').forEach(processCard)
  }

  // ── MutationObserver 监听新卡片 ───────────────────────────────────────────
  new MutationObserver(processAllCards)
    .observe(document.documentElement, { childList: true, subtree: true })

  // ── 处理 work_list 接口数据 ───────────────────────────────────────────────
  function handleWorkList(data: Record<string, unknown>) {
    const list: Record<string, unknown>[] =
      (data.aweme_list as Record<string, unknown>[]) ??
      (data.work_list  as Record<string, unknown>[]) ??
      (data.list       as Record<string, unknown>[]) ??
      ((data.data as Record<string, unknown>)?.aweme_list as Record<string, unknown>[]) ?? []

    console.log('[DH inject] 拦截 work_list，共', list.length, '条')
    list.forEach(item => {
      const id = item.aweme_id as string
      const sv = item.status_value
      console.log('[DH inject]', id, '→ status_value:', sv)
      if (sv === 143 && id) throttledSet.add(id)
    })

    // 通知 content script 更新面板
    window.postMessage({ __dh__: 'work_list', data }, window.location.origin)
    processAllCards()
  }

  // ── Fetch 拦截 ────────────────────────────────────────────────────────────
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const res = await nativeFetch(...args)
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    if (url.includes('work_list')) {
      res.clone().json().then(handleWorkList).catch(() => {})
    }
    return res
  }

  // ── XHR 拦截（兜底） ───────────────────────────────────────────────────────
  const XP = window.XMLHttpRequest.prototype
  const origOpen = XP.open as (m: string, u: string) => void
  const origSend = XP.send
  XP.open = function (m: string, u: string, ...rest: unknown[]) {
    (this as unknown as Record<string, unknown>)._dhUrl = u
    return origOpen.apply(this, [m, u, ...rest] as Parameters<typeof origOpen>)
  }
  XP.send = function (...args: unknown[]) {
    this.addEventListener('load', function (this: XMLHttpRequest) {
      const url = (this as unknown as Record<string, unknown>)._dhUrl as string ?? ''
      if (url.includes('work_list')) {
        try { handleWorkList(JSON.parse(this.responseText)) } catch {}
      }
    })
    return origSend.apply(this, args as Parameters<typeof origSend>)
  }

  // ── SPA 导航 ──────────────────────────────────────────────────────────────
  const pushState = history.pushState.bind(history)
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    pushState(...args)
    window.postMessage({ __dh__: 'navigate', href: location.href }, window.location.origin)
  }
  window.addEventListener('popstate', () => {
    window.postMessage({ __dh__: 'navigate', href: location.href }, window.location.origin)
  })
})()
