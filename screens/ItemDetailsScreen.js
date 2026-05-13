import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../src/hooks';
import {
  createDonationRequest,
  getRequestForItemByCurrentUser,
  getRequestsForMyItems,
} from '../src/services/donationRequestService';
import { deleteDonationItem } from '../src/services/itemService';
import { getSafeErrorMessage } from '../src/utils/errorMessages';

function formatItemStatus(status) {
  const statusLabels = {
    available: 'Disponivel',
    reserved: 'Reservado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
    disponivel: 'Disponivel',
    solicitado: 'Solicitado',
    doado: 'Doado',
  };

  return statusLabels[status] || status || 'Status nao informado';
}

export default function ItemDetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { item } = route.params;
  const [deleting, setDeleting] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [currentUserRequest, setCurrentUserRequest] = useState(null);
  const [interestCount, setInterestCount] = useState(0);
  const donorProfile = item.profiles;
  const isOwner = user?.id === item.user_id;
  const isAvailable = item.status === 'available';
  const canShowInterestButton = !isOwner && isAvailable && !currentUserRequest;
  const hasSentInterest = !isOwner && Boolean(currentUserRequest);
  const cityState = [donorProfile?.municipio, donorProfile?.estado].filter(Boolean).join(' - ');
  const neighborhood = donorProfile?.bairro;
  const donorLocation = [neighborhood, cityState].filter(Boolean).join(', ');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadRequestState() {
        if (!user?.id) {
          return;
        }

        try {
          if (isOwner) {
            const requests = await getRequestsForMyItems();
            const itemRequests = requests.filter((request) => request.item_id === item.id);

            if (isActive) {
              setInterestCount(itemRequests.length);
            }
          } else {
            const request = await getRequestForItemByCurrentUser(item.id);

            if (isActive) {
              setCurrentUserRequest(request);
            }
          }
        } catch {}
      }

      loadRequestState();

      return () => {
        isActive = false;
      };
    }, [isOwner, item.id, user?.id]),
  );

  function handleEdit() {
    navigation.navigate('EditItem', { item });
  }

  async function handleInterest() {
    if (requestLoading || !canShowInterestButton) {
      return;
    }

    try {
      setRequestLoading(true);
      const request = await createDonationRequest(item.id, item.user_id);
      setCurrentUserRequest(request);
      Alert.alert('Interesse enviado', 'Interesse enviado ao doador.');
    } catch (error) {
      Alert.alert(
        'Erro ao enviar interesse',
        getSafeErrorMessage(error, 'Nao foi possivel enviar seu interesse agora.'),
      );
    } finally {
      setRequestLoading(false);
    }
  }

  function handleDelete() {
    if (deleting) {
      return;
    }

    Alert.alert('Apagar doacao', 'Tem certeza que deseja apagar este item?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteDonationItem(item.id);
            setDeleting(false);
            Alert.alert('Pronto', 'Doacao apagada com sucesso.');
            navigation.goBack();
          } catch (error) {
            setDeleting(false);
            Alert.alert(
              'Erro ao apagar',
              getSafeErrorMessage(error, 'Nao foi possivel apagar esta doacao agora.'),
            );
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {item.image_url ? (
          <View style={styles.imageFrame}>
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Sem foto disponivel</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>{item.titulo}</Text>
          <Text style={styles.status}>{formatItemStatus(item.status)}</Text>
        </View>

        <Text style={styles.label}>Categoria</Text>
        <Text style={styles.value}>{item.categoria}</Text>

        <Text style={styles.label}>Descricao</Text>
        <Text style={styles.description}>{item.descricao}</Text>

        <Text style={styles.label}>Doador</Text>
        <View style={styles.donorBox}>
          {donorProfile?.avatar_url ? (
            <Image source={{ uri: donorProfile.avatar_url }} style={styles.donorAvatar} />
          ) : (
            <View style={styles.donorAvatarPlaceholder}>
              <Text style={styles.donorAvatarText}>D</Text>
            </View>
          )}
          <Text style={styles.value}>{donorProfile?.nome || 'Doador nao informado'}</Text>
        </View>

        <Text style={styles.label}>Localizacao</Text>
        {donorLocation ? (
          <Text style={styles.value}>{donorLocation}</Text>
        ) : (
          <Text style={styles.value}>Localizacao nao informada</Text>
        )}

        {isOwner ? (
          <View style={styles.actions}>
            <Text style={styles.interestInfo}>
              Este item possui {interestCount} interessado(s)
            </Text>

            <Pressable
              disabled={deleting}
              onPress={handleEdit}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                deleting && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>

            <Pressable
              disabled={deleting}
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.buttonPressed,
                deleting && styles.buttonDisabled,
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.dangerButtonText}>Apagar</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {!isOwner ? (
          <View style={styles.actions}>
            {hasSentInterest ? (
              <View style={styles.sentInterestBox}>
                <Text style={styles.sentInterestText}>Interesse enviado</Text>
              </View>
            ) : null}

            {canShowInterestButton ? (
              <Pressable
                disabled={requestLoading}
                onPress={handleInterest}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  requestLoading && styles.buttonDisabled,
                ]}
              >
                {requestLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Tenho interesse</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6f3',
    flexGrow: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderRadius: 8,
    height: 220,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    width: '100%',
  },
  itemImage: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  imagePlaceholderText: {
    color: '#52645b',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: '#1f2924',
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  status: {
    backgroundColor: '#e4efe8',
    borderRadius: 8,
    color: '#2f7d57',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    color: '#2f7d57',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  value: {
    color: '#52645b',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  description: {
    color: '#52645b',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 4,
  },
  donorBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  donorAvatar: {
    backgroundColor: '#e4efe8',
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  donorAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  donorAvatarText: {
    color: '#2f7d57',
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 24,
  },
  interestInfo: {
    color: '#52645b',
    fontSize: 15,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sentInterestBox: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  sentInterestText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#9d2f2f',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  dangerButtonText: {
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
