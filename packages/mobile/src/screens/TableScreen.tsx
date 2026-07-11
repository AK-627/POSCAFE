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

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

interface Table {
  id: string;
  number: string;
  name: string;
  capacity: number;
  status: TableStatus;
  currentOrder?: {
    id: string;
    items: number;
    total: number;
  };
}

const TableScreen: React.FC<Props> = ({ navigation }) => {
  const [tables, setTables] = React.useState<Table[]>([
    { id: '1', number: '1', name: 'Window Table', capacity: 2, status: 'available' },
    { id: '2', number: '2', name: 'Center Table', capacity: 4, status: 'occupied', currentOrder: { id: '123', items: 3, total: 24.50 } },
    { id: '3', number: '3', name: 'Bar Table', capacity: 2, status: 'available' },
    { id: '4', number: '4', name: 'Family Table', capacity: 6, status: 'occupied', currentOrder: { id: '124', items: 5, total: 42.75 } },
    { id: '5', number: '5', name: 'Corner Table', capacity: 4, status: 'reserved' },
    { id: '6', number: '6', name: 'Patio Table', capacity: 4, status: 'available' },
    { id: '7', number: '7', name: 'Patio Table', capacity: 2, status: 'occupied', currentOrder: { id: '125', items: 2, total: 18.00 } },
    { id: '8', number: '8', name: 'Window Table', capacity: 2, status: 'cleaning' },
    { id: '9', number: '9', name: 'Center Table', capacity: 4, status: 'available' },
    { id: '10', number: '10', name: 'Bar Table', capacity: 2, status: 'available' }
  ]);

  const getStatusColor = (status: TableStatus): string => {
    switch (status) {
      case 'available': return '#10b981';
      case 'occupied': return '#ef4444';
      case 'reserved': return '#f59e0b';
      case 'cleaning': return '#8b5cf6';
    }
  };

  const getStatusText = (status: TableStatus): string => {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'reserved': return 'Reserved';
      case 'cleaning': return 'Cleaning';
    }
  };

  const handleTablePress = (table: Table) => {
    if (table.status === 'available') {
      navigation.navigate('Order');
    } else if (table.status === 'occupied' && table.currentOrder) {
      // Navigate to order details
      console.log('View order:', table.currentOrder.id);
    }
  };

  const handleStatusChange = (tableId: string, newStatus: TableStatus) => {
    setTables(tables.map(table => 
      table.id === tableId ? { ...table, status: newStatus } : table
    ));
  };

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Table Management</Text>
          <Text style={styles.subtitle}>Manage table status and view orders</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Tables</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statNumber, { color: '#065f46' }]}>{stats.available}</Text>
            <Text style={[styles.statLabel, { color: '#065f46' }]}>Available</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statNumber, { color: '#991b1b' }]}>{stats.occupied}</Text>
            <Text style={[styles.statLabel, { color: '#991b1b' }]}>Occupied</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statNumber, { color: '#92400e' }]}>{stats.reserved}</Text>
            <Text style={[styles.statLabel, { color: '#92400e' }]}>Reserved</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Tables</Text>
          <View style={styles.tableGrid}>
            {tables.map((table) => (
              <TouchableOpacity
                key={table.id}
                style={[styles.tableCard, { borderColor: getStatusColor(table.status) }]}
                onPress={() => handleTablePress(table)}
              >
                <View style={styles.tableHeader}>
                  <View style={styles.tableNumberContainer}>
                    <Text style={styles.tableNumber}>#{table.number}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(table.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(table.status)}</Text>
                  </View>
                </View>
                
                <View style={styles.tableInfo}>
                  <Text style={styles.tableName}>{table.name}</Text>
                  <Text style={styles.tableCapacity}>Seats: {table.capacity}</Text>
                </View>

                {table.currentOrder && (
                  <View style={styles.orderInfo}>
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderLabel}>Order #{table.currentOrder.id}</Text>
                      <Text style={styles.orderValue}>{table.currentOrder.items} items</Text>
                    </View>
                    <Text style={styles.orderTotal}>${table.currentOrder.total.toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {table.status === 'available' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                      onPress={() => navigation.navigate('Order')}
                    >
                      <Text style={styles.actionButtonText}>Seat Customer</Text>
                    </TouchableOpacity>
                  )}
                  
                  {table.status === 'occupied' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                        onPress={() => navigation.navigate('Payment')}
                      >
                        <Text style={styles.actionButtonText}>Process Payment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                        onPress={() => handleStatusChange(table.id, 'cleaning')}
                      >
                        <Text style={styles.actionButtonText}>Mark for Cleaning</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  {table.status === 'cleaning' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                      onPress={() => handleStatusChange(table.id, 'available')}
                    >
                      <Text style={styles.actionButtonText}>Mark Clean</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  statCard: {
    width: '23%',
    margin: '1%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  tableCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0'
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  tableNumberContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  },
  tableInfo: {
    marginBottom: 12
  },
  tableName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4
  },
  tableCapacity: {
    fontSize: 12,
    color: '#64748b'
  },
  orderInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  orderDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569'
  },
  orderValue: {
    fontSize: 12,
    color: '#64748b'
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center'
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff'
  }
});

export default TableScreen;