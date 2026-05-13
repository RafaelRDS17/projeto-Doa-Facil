import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../src/hooks';
import { updateUserProfile } from '../src/services/profileService';
import { getSafeErrorMessage } from '../src/utils/errorMessages';

export default function EditProfileScreen({ navigation }) {
  const { profile, refreshProfile, user } = useAuth();
  const [name, setName] = useState(profile?.nome || '');
  const [phone, setPhone] = useState(profile?.telefone || '');
  const [state, setState] = useState(profile?.estado || '');
  const [municipality, setMunicipality] = useState(profile?.municipio || '');
  const [neighborhood, setNeighborhood] = useState(profile?.bairro || '');
  const [photo, setPhoto] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewUri = photo?.uri || profile?.avatar_url;

  async function handlePickPhoto() {
    try {
      setLoadingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Permita o acesso as fotos para trocar a foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.4,
      });

      if (!result.canceled && result.assets?.length) {
        setPhoto(result.assets[0]);
      }
    } catch {
      Alert.alert('Erro ao escolher foto', 'Nao foi possivel escolher a foto.');
    } finally {
      setLoadingPhoto(false);
    }
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !state.trim() ||
      !municipality.trim() ||
      !neighborhood.trim()
    ) {
      Alert.alert('Campos obrigatorios', 'Preencha nome, telefone, estado, cidade e bairro.');
      return;
    }

    try {
      setSaving(true);

      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        state: state.trim(),
        municipality: municipality.trim(),
        neighborhood: neighborhood.trim(),
        currentAvatarPath: profile?.avatar_path,
        newPhotoUri: photo?.uri,
      });

      await refreshProfile();
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Erro ao salvar',
        getSafeErrorMessage(error, 'Nao foi possivel atualizar seu perfil agora.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Editar Perfil</Text>

        <View style={styles.avatarBox}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>Sem foto</Text>
          )}
        </View>

        <Pressable
          disabled={loadingPhoto || saving}
          onPress={handlePickPhoto}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            (loadingPhoto || saving) && styles.buttonDisabled,
          ]}
        >
          {loadingPhoto ? (
            <ActivityIndicator color="#2f7d57" />
          ) : (
            <Text style={styles.secondaryButtonText}>Trocar foto</Text>
          )}
        </Pressable>

        <Text style={styles.label}>Nome</Text>
        <TextInput onChangeText={setName} placeholder="Nome" style={styles.input} value={name} />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          editable={false}
          placeholder="E-mail"
          style={[styles.input, styles.disabledInput]}
          value={user?.email || profile?.email || ''}
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="Telefone"
          style={styles.input}
          value={phone}
        />

        <Text style={styles.label}>Estado</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setState}
          placeholder="Estado"
          style={styles.input}
          value={state}
        />

        <Text style={styles.label}>Cidade/Municipio</Text>
        <TextInput
          onChangeText={setMunicipality}
          placeholder="Cidade/Municipio"
          style={styles.input}
          value={municipality}
        />

        <Text style={styles.label}>Bairro</Text>
        <TextInput
          onChangeText={setNeighborhood}
          placeholder="Bairro"
          style={styles.input}
          value={neighborhood}
        />

        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            saving && styles.buttonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Salvar perfil</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6f3',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: '#245442',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
  },
  avatarBox: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 70,
    borderWidth: 1,
    height: 140,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    width: 140,
  },
  avatarImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  avatarPlaceholder: {
    color: '#52645b',
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    color: '#2d3a34',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1f2924',
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledInput: {
    backgroundColor: '#edf1ee',
    color: '#6f7d74',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 18,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 50,
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
});
