import { Server as SocketIOServer } from 'socket.io';
export declare const liveDvrFrameCache: Map<string, {
    buffer: Buffer;
    contentType: string;
    timestamp: number;
}>;
export declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
