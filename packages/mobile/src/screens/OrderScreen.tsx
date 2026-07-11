import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;

const OrderScreen: React.FC<Props> = ({ navigation }) => {
  const [tableNumber, setTableNumber] = React.useState('');
  const [specialInstructions, setSpecialInstructions] = React.useState('');

  const menuItems = [
    { id: '1', name: 'Cappuccino', price: 4.50, category: 'Hot Drinks' },
    { id: '2', name: 'Espresso', price: 3.00, category: 'Hot Drinks' },
    { id: '3', name: 'Croissant', price: 3.50, category: 'Pastries' },
    { id: '4', name: 'Chocolate Cake', price: 6.00, category: 'Desserts' },
    { id: '5', name: 'Iced Coffee', price: 4.00, category: 'Cold Drinks' },
    { id: '6', name: 'Club Sandwich', price: 8.50, category: 'Sandwiches' }
  ];

  const cartItems = [
    { id: '1', name: 'Cappuccino', price: 4.50, quantity: 2 },
    { id: '3', name: 'Croissant', price: 3.50, quantity: 1 }
  ];

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Table Information</Text>
          <View style={styles.tableInputContainer}>
            <Text style={styles.label}>Table Number</Text>
            <TextInput
              style={styles.tableInput}
              placeholder="e.g., 5"
              value={tableNumber}
              onChangeText={setTableNumber}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={styles.tablePreview}>
            <Text style={styles.tablePreviewText}>
              {tableNumber ? `Table ${tableNumber}` : 'Select a table'}
            </Text>
            <TouchableOpacity style={styles.tableButton} onPress={() => navigation.navigate('Table')}>
              <Text style={styles.tableButtonText}>Browse Tables</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Items</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemCategory}>{item.category}</Text>
                </View>
                <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Any special requests or dietary restrictions?"
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummary}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            
            <View style={styles.orderTotal}>
              <Text style={styles.orderTotalLabel}>Total</Text>
              <Text style={styles.orderTotalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Payment')}>
          <Text style={styles.primaryButtonText}>Submit Order (${calculateTotal().toFixed(2)})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16
  },
  tableInputContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8
  },
  tableInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b'
  },
  tablePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8
  },
  tablePreviewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569'
  },
  tableButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  tableButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff'
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  menuItem: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  menuItemContent: {
    flex: 1
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4
  },
  menuItemCategory: {
    fontSize: 12,
    color: '#64748b'
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6'
  },
  instructionsInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    textAlignVertical: 'top'
  },
  orderSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  orderItemInfo: {
    flex: 1
  },
  orderItemName: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 4
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#64748b'
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0'
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b'
  },
  orderTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6'
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b'
  }
});

export default OrderScreen;