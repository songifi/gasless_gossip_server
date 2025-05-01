export interface WsMessage {
  event: string;
  data: any;
  room?: string;
  userId?: string;
}
