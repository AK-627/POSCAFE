import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Kitchen'>;

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served';
type ItemStatus = 'pending' | 'preparing' | 'ready';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  status: ItemStatus;
  specialInstructions?: string;
  preparationTime: number; // in minutes
}

interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  priority: 'normal' | 'high' | 'rush';
}

const KitchenScreen: React.FC<Props> = () => {
  const [orders, setOrders] = React.useState<Order[]>([
    {
      id: '123',
      tableNumber: '2',
      items: [
        { id: '1', name: 'Cappuccino', quantity: 2, status: 'ready', preparationTime: 5 },
        { id: '2', name: 'Croissant', quantity: 1, status: 'ready', preparationTime: 2 },
        { id: '3', name: 'Club Sandwich', quantity: 1, status: 'preparing', specialInstructions: 'No mayo', preparationTime: 10 }
      ],
      status: 'preparing',
      createdAt: '10:30 AM',
      priority: 'high'
    },
    {
      id: '124',
      tableNumber: '4',
      items: [
        { id: '4', name: 'Espresso', quantity: 1, status: 'ready', preparationTime: 3 },
        { id: '5', name: 'Chocolate Cake', quantity: 2, status: 'preparing', preparationTime: 2 },
        { id: '6', name: 'Iced Coffee', quantity: 2, status: 'pending', preparationTime: 4 }
      ],
      status: 'pending',
      createdAt: '10:45 AM',
      priority: 'normal'
    },
    {
      id: '125',
      tableNumber: '7',
      items: [
        { id: '7', name: 'Club Sandwich', quantity: 1, status: 'preparing', specialInstructions: 'Extra cheese', preparationTime: 10 },
        { id: '8', name: 'Iced Coffee', quantity: 1, status: 'pending', preparationTime: 4 }
      ],
      status: 'pending',
      createdAt: '11:00 AM',
      priority: 'rush'
    }
  ]);

  const getPriorityColor = (priority: Order['priority']): string => {
    switch (priority) {
      case 'normal': return '#3b82f6';
      case 'high': return '#f59e0b';
      case 'rush': return '#ef4444';
    }
  };

  const getStatusColor = (status: ItemStatus): string => {
    switch (status) {
      case 'pending': return '#94a3b8';
      case 'preparing': return '#f59e0b';
      case 'ready': return '#10b981';
    }
  };

  const getStatusText = (status: ItemStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
    }
  };

  const updateItemStatus = (orderId: string, itemId: string, newStatus: ItemStatus) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        
        // Update order status based on item statuses
        const allReady = updatedItems.every(item => item.status === 'ready');
        const anyPreparing = updatedItems.some(item => item.status === 'preparing');
        
        let newOrderStatus: OrderStatus = order.status;
        if (allReady) {
          newOrderStatus = 'ready';
        } else if (anyPreparing) {
          newOrderStatus = 'preparing';
        }
        
        return { ...order, items: updatedItems, status: newOrderStatus };
      }
      return order;
    }));
  };

  const markOrderReady = (orderId: string) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, status: 'ready', items: order.items.map(item => ({ ...item, status: 'ready' })) }
        : order
    ));
  };

  const stats = {
    totalOrders: orders.length,
    pendingItems: orders.reduce((count, order) => 
      count + order.items.filter(item => item.status === 'pending').length, 0
    ),
    preparingItems: orders.reduce((count, order) => 
      count + order.items.filter(item => item.status === 'preparing').length, 0
    ),
    readyItems: orders.reduce((count, order) => 
      count + order.items.filter(item => item.status === 'ready').length, 0
    )
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Kitchen Display</Text>
            <Text style={styles.subtitle}>Monitor and update order preparation</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>11:15 AM</Text>
            <Text style={styles.dateText}>Today</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statNumber, { color: '#991b1b' }]}>{stats.pendingItems}</Text>
            <Text style={[styles.statLabel, { color: '#991b1b' }]}>Pending Items</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statNumber, { color: '#92400e' }]}>{stats.preparingItems}</Text>
            <Text style={[styles.statLabel, { color: '#92400e' }]}>Preparing</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statNumber, { color: '#065f46' }]}>{stats.readyItems}</Text>
            <Text style={[styles.statLabel, { color: '#065f46' }]}>Ready</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <View style={styles.orderMeta}>
                    <Text style={styles.tableNumber}>Table {order.tableNumber}</Text>
                    <Text style={styles.orderTime}>{order.createdAt}</Text>
                  </View>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(order.priority) }]}>
                  <Text style={styles.priorityText}>{order.priority.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.itemsContainer}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                      </View>
                      {item.specialInstructions && (
                        <Text style={styles.specialInstructions}>Note: {item.specialInstructions}</Text>
                      )}
                      <Text style={styles.prepTime}>~{item.preparationTime} min</Text>
                    </View>
                    
                    <View style={styles.itemActions}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                      </View>
                      
                      <View style={styles.statusButtons}>
                        {item.status !== 'pending' && (
                          <TouchableOpacity 
                            style={styles.statusButton}
                            onPress={() => updateItemStatus(order.id, item.id, 'pending')}
                          >
                            <Text style={styles.statusButtonText}>Pending</Text>
                          </TouchableOpacity>
                        )}
                        {item.status !== 'preparing' && (
                          <TouchableOpacity 
                            style={[styles.statusButton, { backgroundColor: '#f59e0b' }]}
                            onPress={() => updateItemStatus(order.id, item.id, 'preparing')}
                          >
                            <Text style={styles.statusButtonText}>Preparing</Text>
                          </TouchableOpacity>
                        )}
                        {item.status !== 'ready' && (
                          <TouchableOpacity 
                            style={[styles.statusButton, { backgroundColor: '#10b981' }]}
                            onPress={() => updateItemStatus(order.id, item.id, 'ready')}
                          >
                            <Text style={styles.statusButtonText}>Ready</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {order.items.filter(item => item.status === 'ready').length} / {order.items.length} items ready
                  </Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${(order.items.filter(item => item.status === 'ready').length / order.items.length) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.completeButton, order.status === 'ready' && styles.completeButtonActive]}
                  onPress={() => markOrderReady(order.id)}
                  disabled={order.status === 'ready'}
                >
                  <Text style={[styles.completeButtonText, order.status === 'ready' && styles.completeButtonTextActive]}>
                    {order.status === 'ready' ? 'READY FOR SERVICE' : 'MARK AS READY'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4
  },
  timeContainer: {
    alignItems: 'flex-end'
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  statCard: {
    width: '23%',
    margin: '1%',
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  statLabel: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 4
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  orderInfo: {
    flex: 1
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  tableNumber: {
    fontSize: 14,
    color: '#cbd5e1'
  },
  orderTime: {
    fontSize: 14,
    color: '#94a3b8'
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  itemsContainer: {
    gap: 12,
    marginBottom: 16
  },
  itemCard: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  itemInfo: {
    flex: 1,
    marginRight: 12
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f8fafc'
  },
  itemQuantity: {
    fontSize: 14,
    color: '#cbd5e1'
  },
  specialInstructions: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginBottom: 8
  },
  prepTime: {
    fontSize: 12,
    color: '#94a3b8'
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 4
  },
  statusButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusButtonText: {
    fontSize: 10,
    color: '#f8fafc'
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  progressContainer: {
    flex: 1
  },
  progressText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4
  },
  progressBar: {
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2
  },
  completeButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12
  },
  completeButtonActive: {
    backgroundColor: '#10b981'
  },
  completeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1'
  },
  completeButtonTextActive: {
    color: '#fff'
  }
});

export default KitchenScreen;
