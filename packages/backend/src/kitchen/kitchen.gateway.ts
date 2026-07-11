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
import { KitchenService, KitchenOrderView } from './kitchen.service';

/**
 * WebSocket gateway for real-time kitchen display updates.
 * Kitchen staff join a branch-specific room and receive live order updates.
 */
@WebSocketGateway({
  namespace: '/kitchen',
  cors: {
    origin: '*',
  },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KitchenGateway.name);

  constructor(private readonly kitchenService: KitchenService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Kitchen display connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Kitchen display disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinKitchen')
  async handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; branchId: string },
  ) {
    const room = `kitchen:${data.tenantId}:${data.branchId}`;
    await client.join(room);
    this.logger.log(`Kitchen client ${client.id} joined room ${room}`);

    // Send initial kitchen state
    const [orders, stats] = await Promise.all([
      this.kitchenService.getKitchenOrders(data.tenantId, data.branchId),
      this.kitchenService.getKitchenStats(data.tenantId, data.branchId),
    ]);

    client.emit('kitchenSync', { orders, stats });
  }

  @SubscribeMessage('leaveKitchen')
  async handleLeaveKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; branchId: string },
  ) {
    const room = `kitchen:${data.tenantId}:${data.branchId}`;
    await client.leave(room);
  }

  @SubscribeMessage('requestRefresh')
  async handleRefresh(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; branchId: string },
  ) {
    const [orders, stats] = await Promise.all([
      this.kitchenService.getKitchenOrders(data.tenantId, data.branchId),
      this.kitchenService.getKitchenStats(data.tenantId, data.branchId),
    ]);
    client.emit('kitchenSync', { orders, stats });
  }

  // ── Methods called by other services to broadcast updates ──────

  /**
   * Called when a new order arrives that is relevant to the kitchen.
   */
  emitNewOrder(tenantId: string, branchId: string, order: KitchenOrderView) {
    const room = `kitchen:${tenantId}:${branchId}`;
    this.server.to(room).emit('newOrder', order);
    this.logger.log(`Emitted new order ${order.orderNumber} to kitchen`);
  }

  /**
   * Called when an order's status changes.
   */
  emitOrderUpdated(tenantId: string, branchId: string, order: KitchenOrderView) {
    const room = `kitchen:${tenantId}:${branchId}`;
    this.server.to(room).emit('orderUpdated', order);
  }

  /**
   * Called when an item's preparation status changes.
   */
  emitItemStatusChanged(
    tenantId: string,
    branchId: string,
    data: { orderId: string; orderNumber: string; itemId: string; newStatus: string },
  ) {
    const room = `kitchen:${tenantId}:${branchId}`;
    this.server.to(room).emit('itemStatusChanged', data);
  }

  /**
   * Called when an order is completed and should be removed from the display.
   */
  emitOrderCompleted(tenantId: string, branchId: string, orderId: string) {
    const room = `kitchen:${tenantId}:${branchId}`;
    this.server.to(room).emit('orderCompleted', { orderId });
  }

  /**
   * Broadcast updated stats to all kitchen displays.
   */
  async emitStatsUpdate(tenantId: string, branchId: string) {
    const stats = await this.kitchenService.getKitchenStats(tenantId, branchId);
    const room = `kitchen:${tenantId}:${branchId}`;
    this.server.to(room).emit('statsUpdated', stats);
  }
}
