import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SyncService, SyncBatchInput } from './sync.service';

@WebSocketGateway({
  namespace: '/sync',
  cors: { origin: '*' },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SyncGateway.name);

  constructor(private readonly syncService: SyncService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Sync client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Sync client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinSync')
  async handleJoinSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; deviceId: string },
  ) {
    const room = `sync:${data.tenantId}`;
    await client.join(room);
    this.logger.log(`Device ${data.deviceId} joined sync room ${room}`);
    client.emit('syncJoined', { room, timestamp: new Date() });
  }

  @SubscribeMessage('syncBatch')
  async handleSyncBatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; batch: SyncBatchInput },
  ) {
    const result = await this.syncService.processSyncBatch(data.tenantId, data.batch);
    client.emit('syncResult', result);

    // Broadcast changes to other devices in the tenant room
    const room = `sync:${data.tenantId}`;
    client.to(room).emit('remoteChanges', {
      operations: result.applied,
      timestamp: result.latestTimestamp,
    });
  }

  @SubscribeMessage('resolveConflict')
  async handleResolveConflict(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      tenantId: string;
      operationId: string;
      resolution: 'keep_local' | 'keep_remote' | 'merge';
      mergedData?: Record<string, any>;
    },
  ) {
    const resolved = await this.syncService.resolveConflict(
      data.tenantId,
      data.operationId,
      data.resolution,
      data.mergedData,
    );
    client.emit('conflictResolved', resolved);
  }

  /**
   * Broadcast a change to all devices in a tenant room.
   */
  emitEntityChange(tenantId: string, change: any) {
    const room = `sync:${tenantId}`;
    this.server.to(room).emit('entityChanged', change);
  }
}
