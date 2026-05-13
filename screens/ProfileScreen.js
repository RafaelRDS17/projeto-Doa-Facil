import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/hooks';

export default function ProfileScreen({ navigation }) {
  const { profile, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);

  function handleSignOut() {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await signOut();
          } catch {
            Alert.alert('Erro ao sair', 'Nao foi possivel sair da conta agora.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  function handleEditProfile() {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.navigate('EditProfile');
      return;
    }

    navigation.navigate('EditProfile');
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Perfil</Text>
        <View style={styles.avatarBox}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>Sem foto</Text>
          )}
        </View>
        <Text style={styles.name}>{profile?.nome || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email || 'Email nao informado'}</Text>

        <Pressable
          disabled={loading}
          onPress={handleEditProfile}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </Pressable>

        <Pressable
          disabled={loading}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signOutButtonText}>Sair</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6f3',
    flex: 1,
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
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
    borderRadius: 54,
    borderWidth: 1,
    height: 108,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    width: 108,
  },
  avatarImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  avatarPlaceholder: {
    color: '#52645b',
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    color: '#1f2924',
    fontSize: 18,
    fontWeight: '700',
  },
  email: {
    color: '#52645b',
    fontSize: 15,
    marginTop: 4,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48,
  },
  editButtonText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#9d2f2f',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  signOutButtonText: {
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
