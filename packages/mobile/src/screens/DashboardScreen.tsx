import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '@skynether/shared/types/user';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  
  const rolePermissions: Record<UserRole, Array<{
    title: string;
    description: string;
    screen: keyof RootStackParamList;
    color: string;
  }>> = {
    owner: [
      { title: 'Take Order', description: 'Create new orders', screen: 'Order', color: '#3b82f6' },
      { title: 'Tables', description: 'Manage table status', screen: 'Table', color: '#10b981' },
      { title: 'Kitchen', description: 'Monitor order preparation', screen: 'Kitchen', color: '#f59e0b' },
      { title: 'Payments', description: 'Process payments', screen: 'Payment', color: '#8b5cf6' },
      { title: 'Reports', description: 'View analytics', screen: 'Dashboard', color: '#ec4899' },
      { title: 'Staff', description: 'Manage team', screen: 'Dashboard', color: '#6366f1' }
    ],
    manager: [
      { title: 'Take Order', description: 'Create new orders', screen: 'Order', color: '#3b82f6' },
      { title: 'Tables', description: 'Manage table status', screen: 'Table', color: '#10b981' },
      { title: 'Kitchen', description: 'Monitor order preparation', screen: 'Kitchen', color: '#f59e0b' },
      { title: 'Payments', description: 'Process payments', screen: 'Payment', color: '#8b5cf6' },
      { title: 'Reports', description: 'View analytics', screen: 'Dashboard', color: '#ec4899' },
      { title: 'Staff', description: 'Manage team', screen: 'Dashboard', color: '#6366f1' }
    ],
    cashier: [
      { title: 'Take Order', description: 'Create new orders', screen: 'Order', color: '#3b82f6' },
      { title: 'Tables', description: 'Manage table status', screen: 'Table', color: '#10b981' },
      { title: 'Payments', description: 'Process payments', screen: 'Payment', color: '#8b5cf6' }
    ],
    waiter: [
      { title: 'Take Order', description: 'Create new orders', screen: 'Order', color: '#3b82f6' },
      { title: 'Tables', description: 'Manage table status', screen: 'Table', color: '#10b981' }
    ],
    chef: [
      { title: 'Kitchen', description: 'Monitor order preparation', screen: 'Kitchen', color: '#f59e0b' }
    ]
  };

  const permissions = rolePermissions[user?.role || 'waiter'];

  const handleNavigation = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Active Tables</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Orders Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>$1,245</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {permissions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={() => handleNavigation(action.screen)}
            >
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Order #1234 completed for Table 5</Text>
              <Text style={styles.activityTime}>5 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Table 3 marked as occupied</Text>
              <Text style={styles.activityTime}>15 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>New menu item added: Cappuccino</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          You're using Sky Nether in offline mode. All data will sync when connection is restored.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  logoutButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b'
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  statCard: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  section: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  actionCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4
  },
  actionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden'
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 6,
    marginRight: 12
  },
  activityContent: {
    flex: 1
  },
  activityText: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 4
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b'
  },
  footer: {
    padding: 20,
    backgroundColor: '#fef3c7',
    margin: 20,
    borderRadius: 12
  },
  footerText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center'
  }
});

export default DashboardScreen;