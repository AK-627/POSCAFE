import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrderScreen from './src/screens/OrderScreen';
import TableScreen from './src/screens/TableScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PaymentScreen from './src/screens/PaymentScreen';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <View style={styles.container}>
            <StatusBar style="auto" />
            <Stack.Navigator initialRouteName="Login">
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Order"
                component={OrderScreen}
                options={{ title: 'Take Order' }}
              />
              <Stack.Screen
                name="Table"
                component={TableScreen}
                options={{ title: 'Table Management' }}
              />
              <Stack.Screen
                name="Kitchen"
                component={KitchenScreen}
                options={{ title: 'Kitchen Display' }}
              />
              <Stack.Screen
                name="Payment"
                component={PaymentScreen}
                options={{ title: 'Process Payment' }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  }
});
