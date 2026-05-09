const WORK_LIST_URL =
  'https://creator.douyin.com/janus/douyin/creator/pc/work_list'

interface Statistics {
  play_count?: number
  digg_count?: number
  comment_count?: number
  share_count?: number
  collect_count?: number
  forward_count?: number
}

interface WorkItem {
  aweme_id?: string
  create_time?: number
  status_value?: number
  statistics?: Statistics
}

function isThrottled(item: WorkItem): boolean {
  return item.status_value === 143
}

interface WorkListResponse {
  status_code?: number
  aweme_list?: WorkItem[]
  work_list?: WorkItem[]
  list?: WorkItem[]
  data?: { aweme_list?: WorkItem[]; work_list?: WorkItem[]; list?: WorkItem[] }
  has_more?: number | boolean
  max_cursor?: number | string
}

export interface TodayStats {
  count: number
  plays: number
  diggs: number
  comments: number
  shares: number
  collects: number
  forwards: number
  throttled: number
  throttledIds: string[]
}

function isToday(unixSeconds: number): boolean {
  const d = new Date(unixSeconds * 1000)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function extractList(data: WorkListResponse): WorkItem[] | null {
  const list =
    data.aweme_list ??
    data.work_list ??
    data.list ??
    data.data?.aweme_list ??
    data.data?.work_list ??
    data.data?.list
  return Array.isArray(list) ? list : null
}

// 从任意 work_list 接口响应中提取限流 aweme_id（供页面拦截使用）
export function extractThrottledIds(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  const list = extractList(data as WorkListResponse)
  if (!list) return []
  return list
    .filter(item => isThrottled(item) && !!item.aweme_id)
    .map(item => item.aweme_id!)
}

export async function fetchTodayStats(): Promise<TodayStats> {
  let maxCursor = 0
  let count = 0, plays = 0, diggs = 0, comments = 0
  let shares = 0, collects = 0, forwards = 0
  let throttled = 0
  const throttledIds: string[] = []

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      status: '0',
      count: '12',
      max_cursor: String(maxCursor),
      scene: 'star_atlas',
      device_platform: 'android',
      aid: '1128',
    })

    const res = await fetch(`${WORK_LIST_URL}?${params}`, {
      credentials: 'include',
      headers: { accept: '*/*' },
    })

    if (!res.ok) throw new Error(`请求失败: HTTP ${res.status}`)

    const data: WorkListResponse = await res.json()
    const list = extractList(data)
    if (!list || list.length === 0) break

    let reachedOlderVideo = false
    for (const item of list) {
      const t = item.create_time
      if (!t) continue
      if (isToday(t)) {
        console.log('[DH] 今日作品:', item.aweme_id, 'status_value:', item.status_value)
        const s = item.statistics ?? {}
        count++
        plays    += s.play_count    ?? 0
        diggs    += s.digg_count    ?? 0
        comments += s.comment_count ?? 0
        shares   += s.share_count   ?? 0
        collects += s.collect_count ?? 0
        forwards += s.forward_count ?? 0
        if (isThrottled(item) && item.aweme_id) {
          throttled++
          throttledIds.push(item.aweme_id)
        }
      } else {
        reachedOlderVideo = true
        break
      }
    }

    if (reachedOlderVideo || !data.has_more) break

    const nextCursor = Number(data.max_cursor)
    if (!nextCursor || nextCursor === maxCursor) break
    maxCursor = nextCursor
  }

  return { count, plays, diggs, comments, shares, collects, forwards, throttled, throttledIds }
}
