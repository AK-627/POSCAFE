import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

type PaymentMethod = 'cash' | 'card' | 'wallet';

interface PaymentLineItem {
  id: string;
  name: string;
  quantity: number;
  amount: number;
}

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  description: string;
}> = [
  { id: 'cash', label: 'Cash', description: 'Accept cash and return change' },
  { id: 'card', label: 'Card', description: 'Tap, chip, or swipe card payments' },
  { id: 'wallet', label: 'Digital Wallet', description: 'Apple Pay, Google Pay, and more' },
];

const PaymentScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>('card');
  const [processing, setProcessing] = React.useState(false);

  const lineItems: PaymentLineItem[] = [
    { id: '1', name: 'Cappuccino', quantity: 2, amount: 9 },
    { id: '2', name: 'Croissant', quantity: 1, amount: 3.5 },
    { id: '3', name: 'Club Sandwich', quantity: 1, amount: 8.5 },
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.1;
  const serviceCharge = subtotal * 0.05;
  const total = subtotal + tax + serviceCharge;

  const handlePayment = async () => {
    setProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert('Payment Successful', `Payment of $${total.toFixed(2)} completed.`);
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Payment Failed', 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Process Payment</Text>
          <Text style={styles.subtitle}>Complete the table and close the bill</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methodList}>
            {paymentMethods.map((method) => {
              const active = selectedMethod === method.id;

              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                    {method.label}
                  </Text>
                  <Text style={[styles.methodDescription, active && styles.methodDescriptionActive]}>
                    {method.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.summaryCard}>
            {lineItems.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemAmount}>${item.amount.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Charge</Text>
              <Text style={styles.summaryValue}>${serviceCharge.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Due</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Notes</Text>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              Selected method: {paymentMethods.find((method) => method.id === selectedMethod)?.label}
            </Text>
            <Text style={styles.noteSubtext}>
              Use this screen to finalize the table and trigger receipt generation.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, processing && styles.primaryButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          <Text style={styles.primaryButtonText}>
            {processing ? 'Processing...' : `Charge $${total.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 96,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  methodList: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  methodCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  methodLabelActive: {
    color: '#1d4ed8',
  },
  methodDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  methodDescriptionActive: {
    color: '#1e40af',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  noteSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  primaryButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentScreen;
