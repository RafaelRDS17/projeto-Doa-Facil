import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../hooks';
import { getLastEmail, saveLastEmail } from '../../services/localAuthPreferences';
import { getSafeErrorMessage } from '../../utils/errorMessages';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLastEmail()
      .then((lastEmail) => {
        if (lastEmail) {
          setEmail(lastEmail);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Campos obrigatorios', 'Informe email e senha para entrar.');
      return;
    }

    try {
      setLoading(true);
      await signIn({
        email: email.trim(),
        password,
      });
      await saveLastEmail(email);
    } catch (error) {
      Alert.alert(
        'Erro ao entrar',
        getSafeErrorMessage(error, 'Nao foi possivel entrar agora.'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>DoaFacil</Text>
        <Text style={styles.subtitle}>Entre para doar e solicitar itens.</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          value={email}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            onChangeText={setPassword}
            placeholder="Senha"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
          />
          <Pressable
            onPress={() => setShowPassword((currentValue) => !currentValue)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={loading}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Entrar</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={styles.linkText}>Criar uma conta</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f3',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#245442',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#52645b',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordToggle: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  passwordToggleText: {
    color: '#2f7d57',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 18,
    padding: 8,
  },
  linkText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '600',
  },
});
