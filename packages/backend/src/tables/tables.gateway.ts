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
import { TablesService } from './tables.service';

/**
 * WebSocket gateway for real-time table status updates.
 * Clients join a tenant-specific room and receive table changes in real time.
 */
@WebSocketGateway({
  namespace: '/tables',
  cors: {
    origin: '*',
  },
})
export class TablesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TablesGateway.name);

  constructor(private readonly tablesService: TablesService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTenant')
  async handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; branchId?: string },
  ) {
    const room = `tenant:${data.tenantId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);

    // Send current table state
    const tables = await this.tablesService.listTables(data.tenantId, data.branchId);
    client.emit('tablesSync', tables);
  }

  @SubscribeMessage('leaveTenant')
  async handleLeaveTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    const room = `tenant:${data.tenantId}`;
    await client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
  }

  /**
   * Broadcast a table status change to all clients in the tenant room.
   * Called by the service layer after a status update.
   */
  emitTableUpdate(tenantId: string, table: any) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('tableUpdated', table);
  }

  /**
   * Broadcast when a new table is created.
   */
  emitTableCreated(tenantId: string, table: any) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('tableCreated', table);
  }

  /**
   * Broadcast when a table is deleted.
   */
  emitTableDeleted(tenantId: string, tableId: string) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('tableDeleted', { tableId });
  }
}
