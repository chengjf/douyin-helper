export enum MessageType {
  PING = 'PING',
  PONG = 'PONG',
}

export interface Message {
  type: MessageType
  payload?: unknown
}
