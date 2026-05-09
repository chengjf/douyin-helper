import { fetchTodayStats, extractThrottledIds } from './api'
import { createPanel } from './panel'
import type { PanelAPI } from './panel'
import { startMarking, stopMarking, addIds } from './marker'

let panel: PanelAPI | null = null
let prevPath = location.pathname

function isTargetPage() {
  return location.pathname.includes('/content/manage')
}

function injectPageScript() {
  const el = document.createElement('script')
  el.src = chrome.runtime.getURL('inject/index.js')
  el.onload = () => { console.log('[DH] inject 脚本加载成功'); el.remove() }
  el.onerror = (e) => console.error('[DH] inject 脚本加载失败', e)
  ;(document.head || document.documentElement).appendChild(el)
}

async function loadStats() {
  if (!panel) return
  panel.setLoading(true)
  stopMarking()
  try {
    const stats = await fetchTodayStats()
    console.log('[DH] 今日统计:', stats.count, '条，限流:', stats.throttledIds)
    panel.setStats(stats)
    startMarking(stats.throttledIds) // 始终启动，顺便给所有卡片打 id label
  } catch (e) {
    panel.setError(e instanceof Error ? e.message : String(e))
  } finally {
    panel.setLoading(false)
  }
}

function syncPanel() {
  if (!isTargetPage()) {
    if (panel) panel.el.style.display = 'none'
    stopMarking()
    return
  }
  if (!panel) panel = createPanel(loadStats)
  panel.el.style.display = ''
  loadStats()
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.__dh__ === 'navigate') {
    syncPanel()
  } else if (e.data?.__dh__ === 'work_list' && isTargetPage()) {
    // 复用页面原生翻页请求，追加限流标记，零额外请求
    const ids = extractThrottledIds(e.data.data)
    if (ids.length > 0) addIds(ids)
  }
})

setInterval(() => {
  if (location.pathname !== prevPath) {
    prevPath = location.pathname
    syncPanel()
  }
}, 800)

injectPageScript()
syncPanel()
