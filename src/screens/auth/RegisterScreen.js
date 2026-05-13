import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../hooks';
import { getCurrentLocationDetails } from '../../services/locationService';
import { saveLastEmail } from '../../services/localAuthPreferences';
import { getSafeErrorMessage } from '../../utils/errorMessages';

function getPhoneDigits(value) {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatBrazilianPhone(value) {
  const digits = getPhoneDigits(value);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  function handlePhoneChange(value) {
    setPhone(formatBrazilianPhone(value));
  }

  async function handleUseLocation() {
    try {
      setLoadingLocation(true);
      const currentLocation = await getCurrentLocationDetails();
      const nextCoordinates = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };

      setCoordinates(nextCoordinates);
      setState(currentLocation.state);
      setMunicipality(currentLocation.municipality);
      setNeighborhood(currentLocation.neighborhood);
      Alert.alert('Localizacao registrada', 'Confira os dados e ajuste se necessario.');
    } catch {
      Alert.alert(
        'Localizacao necessaria',
        'Permita o uso da localizacao para completar seu cadastro no DoaFacil.',
      );
    } finally {
      setLoadingLocation(false);
    }
  }

  async function handleRegister() {
    const phoneDigits = getPhoneDigits(phone);
    const latitude = coordinates?.latitude;
    const longitude = coordinates?.longitude;
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (
      !name.trim() ||
      !email.trim() ||
      !phoneDigits ||
      !state.trim() ||
      !municipality.trim() ||
      !neighborhood.trim() ||
      !hasCoordinates ||
      !password
    ) {
      Alert.alert(
        'Campos obrigatorios',
        'Use sua localizacao e informe nome, email, telefone, estado, municipio, bairro e senha.',
      );
      return;
    }

    if (phoneDigits.length !== 11) {
      Alert.alert('Telefone invalido', 'Informe um telefone com DDD no formato (27) 99999-9999.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha curta', 'Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const registerPayload = {
        name: name.trim(),
        email: email.trim(),
        phone: phoneDigits,
        state: state.trim(),
        municipality: municipality.trim(),
        neighborhood: neighborhood.trim(),
        latitude,
        longitude,
      };

      await signUp({
        ...registerPayload,
        password,
      });
      await saveLastEmail(email);
      setName('');
      setEmail('');
      setPhone('');
      setState('');
      setMunicipality('');
      setNeighborhood('');
      setCoordinates(null);
      setPassword('');
      Alert.alert(
        'Conta criada',
        'Cadastro criado. Confirme seu e-mail antes de fazer login.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Erro ao cadastrar',
        getSafeErrorMessage(error, 'Nao foi possivel criar sua conta agora.'),
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para usar o DoaFacil.</Text>

          <TextInput
            onChangeText={setName}
            placeholder="Nome"
            style={styles.input}
            value={name}
          />

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />

          <TextInput
            keyboardType="phone-pad"
            maxLength={15}
            onChangeText={handlePhoneChange}
            placeholder="(27) 99999-9999"
            style={[styles.input, styles.phoneInput]}
            value={phone}
          />
          <Text style={styles.helperText}>Usamos seu telefone para identificar cadastros duplicados.</Text>

          <Pressable
            disabled={loadingLocation}
            onPress={handleUseLocation}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              loadingLocation && styles.buttonDisabled,
            ]}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#2f7d57" />
            ) : (
              <Text style={styles.secondaryButtonText}>Usar minha localizacao</Text>
            )}
          </Pressable>

          <TextInput
            onChangeText={setState}
            placeholder="Estado"
            style={styles.input}
            value={state}
          />

          <TextInput
            onChangeText={setMunicipality}
            placeholder="Municipio"
            style={styles.input}
            value={municipality}
          />

          <TextInput
            onChangeText={setNeighborhood}
            placeholder="Bairro"
            style={styles.input}
            value={neighborhood}
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
          <Text style={styles.helperText}>
            Use uma senha forte com letras maiusculas, minusculas, numeros e caracteres especiais.
          </Text>

          <Pressable
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Cadastrar</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.linkButton}>
            <Text style={styles.linkText}>Ja tenho uma conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f3',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#245442',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#52645b',
    fontSize: 16,
    marginBottom: 28,
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
  phoneInput: {
    borderColor: '#2f7d57',
    borderWidth: 1.5,
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
  helperText: {
    color: '#52645b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: -6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
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
