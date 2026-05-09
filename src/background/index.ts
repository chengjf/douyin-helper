import { MessageType } from '@/types/message'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Douyin Helper] extension installed')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Douyin Helper] background received message:', message, 'from:', sender)

  if (message.type === MessageType.PING) {
    sendResponse({ type: MessageType.PONG })
  }

  return true
})
