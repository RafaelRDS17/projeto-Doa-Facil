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
import { updateDonationItem } from '../src/services/itemService';
import { getSafeErrorMessage } from '../src/utils/errorMessages';

export default function EditItemScreen({ navigation, route }) {
  const { user } = useAuth();
  const { item } = route.params;
  const [title, setTitle] = useState(item.titulo || '');
  const [description, setDescription] = useState(item.descricao || '');
  const [category, setCategory] = useState(item.categoria || '');
  const [photo, setPhoto] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOwner = user?.id === item.user_id;

  async function handleTakePhoto() {
    if (saving) {
      return;
    }

    try {
      setLoadingCamera(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Permita o uso da camera para fotografar o item.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.4,
      });

      if (!result.canceled && result.assets?.length) {
        setPhoto(result.assets[0]);
      }
    } catch {
      Alert.alert('Erro ao abrir camera', 'Nao foi possivel abrir a camera agora.');
    } finally {
      setLoadingCamera(false);
    }
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    if (!isOwner) {
      Alert.alert('Sem permissao', 'Voce nao pode editar esta doacao.');
      return;
    }

    if (!title.trim() || !description.trim() || !category.trim()) {
      Alert.alert('Campos obrigatorios', 'Preencha titulo, descricao e categoria.');
      return;
    }

    try {
      setSaving(true);
      const updatedItem = await updateDonationItem({
        itemId: item.id,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        currentImagePath: item.image_path,
        newPhotoUri: photo?.uri,
      });

      Alert.alert('Sucesso', 'Doacao atualizada com sucesso.');
      navigation.replace('ItemDetails', { item: updatedItem });
    } catch (error) {
      Alert.alert(
        'Erro ao salvar',
        getSafeErrorMessage(error, 'Nao foi possivel atualizar esta doacao agora.'),
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
        <Text style={styles.title}>Editar doacao</Text>

        <View style={styles.imageBox}>
          {photo?.uri || item.image_url ? (
            <Image source={{ uri: photo?.uri || item.image_url }} style={styles.previewImage} />
          ) : (
            <Text style={styles.placeholderText}>Sem foto disponivel</Text>
          )}
        </View>

        <Pressable
          disabled={loadingCamera || saving}
          onPress={handleTakePhoto}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            (loadingCamera || saving) && styles.buttonDisabled,
          ]}
        >
          {loadingCamera ? (
            <ActivityIndicator color="#2f7d57" />
          ) : (
            <Text style={styles.secondaryButtonText}>Trocar foto</Text>
          )}
        </Pressable>

        <Text style={styles.label}>Titulo</Text>
        <TextInput onChangeText={setTitle} placeholder="Titulo" style={styles.input} value={title} />

        <Text style={styles.label}>Descricao</Text>
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Descricao"
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={description}
        />

        <Text style={styles.label}>Categoria</Text>
        <TextInput
          onChangeText={setCategory}
          placeholder="Categoria"
          style={styles.input}
          value={category}
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
            <Text style={styles.primaryButtonText}>Salvar alteracoes</Text>
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
  imageBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    height: 190,
    justifyContent: 'center',
    marginBottom: 14,
  },
  previewImage: {
    borderRadius: 8,
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  placeholderText: {
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
  textArea: {
    minHeight: 110,
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
