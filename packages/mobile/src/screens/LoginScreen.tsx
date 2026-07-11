import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Order: undefined;
  Table: undefined;
  Kitchen: undefined;
  Payment: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await login(email, password);
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sky Nether</Text>
        <Text style={styles.subtitle}>Café Management System</Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="staff@cafe.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            Contact your manager if you've forgotten your login details
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sky Nether v0.1.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8
  },
  form: {
    flex: 2,
    justifyContent: 'center'
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b'
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  helpText: {
    marginTop: 24,
    alignItems: 'center'
  },
  helpTextContent: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center'
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12
  }
});

export default LoginScreen;