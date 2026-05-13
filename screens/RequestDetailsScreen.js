import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../src/hooks';
import {
  acceptDonationRequest,
  completeDonationRequest,
  getDonationRequestDetails,
  rejectDonationRequest,
} from '../src/services/donationRequestService';
import { getSafeErrorMessage } from '../src/utils/errorMessages';

function formatRequestStatus(status) {
  const statusLabels = {
    pending: 'Pendente',
    accepted: 'Aceita',
    rejected: 'Recusada',
    completed: 'Concluida',
    cancelled: 'Cancelada',
  };

  return statusLabels[status] || status || 'Status nao informado';
}

function formatItemStatus(status) {
  const statusLabels = {
    available: 'Disponivel',
    reserved: 'Reservado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
    disponivel: 'Disponivel',
  };

  return statusLabels[status] || status || 'Status nao informado';
}

function formatDate(value) {
  if (!value) {
    return 'Data nao informada';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

function formatLocation(profile) {
  const cityState = [profile?.municipio, profile?.estado].filter(Boolean).join(' - ');

  return [profile?.bairro, cityState].filter(Boolean).join(', ');
}

function getPhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function getWhatsappPhone(phone) {
  const digits = getPhoneDigits(phone);

  if (!digits) {
    return '';
  }

  return digits.startsWith('55') ? digits : `55${digits}`;
}

export default function RequestDetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(null);

  const isDonor = request?.donor_id === user?.id;
  const isRequester = request?.requester_id === user?.id;
  const canManage = isDonor && request?.status === 'pending';
  const canComplete = isDonor && request?.status === 'accepted' && request?.item?.status === 'reserved';
  const isAccepted = request?.status === 'accepted';
  const otherPerson = isDonor ? request?.requester : request?.donor;
  const otherPersonLabel = isDonor ? 'Interessado' : 'Doador';
  const otherPersonFallback = isDonor ? 'Interessado nao informado' : 'Doador nao informado';
  const otherPersonLocation = formatLocation(otherPerson);
  const otherPersonPhone = isAccepted ? otherPerson?.telefone : null;

  const loadRequest = useCallback(async () => {
    try {
      setLoading(true);
      const requestDetails = await getDonationRequestDetails(requestId);
      setRequest(requestDetails);
    } catch (error) {
      Alert.alert(
        'Erro ao carregar',
        getSafeErrorMessage(error, 'Nao foi possivel carregar esta solicitacao agora.'),
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, requestId]);

  useFocusEffect(
    useCallback(() => {
      loadRequest();
    }, [loadRequest]),
  );

  async function handleAccept() {
    if (!request || savingAction) {
      return;
    }

    try {
      setSavingAction('accept');
      const updatedRequest = await acceptDonationRequest(request.id, request.item_id);
      setRequest(updatedRequest);
      Alert.alert('Solicitacao aceita', 'O item foi reservado para este interessado.');
    } catch (error) {
      Alert.alert(
        'Erro ao aceitar',
        getSafeErrorMessage(error, 'Nao foi possivel aceitar esta solicitacao agora.'),
      );
    } finally {
      setSavingAction(null);
    }
  }

  async function handleReject() {
    if (!request || savingAction) {
      return;
    }

    try {
      setSavingAction('reject');
      const updatedRequest = await rejectDonationRequest(request.id);
      setRequest(updatedRequest);
      Alert.alert('Solicitacao recusada', 'A solicitacao foi recusada.');
    } catch (error) {
      Alert.alert(
        'Erro ao recusar',
        getSafeErrorMessage(error, 'Nao foi possivel recusar esta solicitacao agora.'),
      );
    } finally {
      setSavingAction(null);
    }
  }

  function handleComplete() {
    if (!request || savingAction) {
      return;
    }

    Alert.alert(
      'Concluir doacao',
      'Tem certeza que deseja concluir esta doacao? O item saira da lista publica.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              setSavingAction('complete');
              const updatedRequest = await completeDonationRequest(request.id, request.item_id);
              setRequest(updatedRequest);
              Alert.alert('Doacao concluida', 'Doacao concluida com sucesso.');
            } catch (error) {
              Alert.alert(
                'Erro ao concluir',
                getSafeErrorMessage(error, 'Nao foi possivel concluir esta doacao agora.'),
              );
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  }

  async function handleOpenWhatsApp() {
    const whatsappPhone = getWhatsappPhone(otherPersonPhone);

    if (!whatsappPhone) {
      Alert.alert('Telefone indisponivel', 'Telefone nao disponivel.');
      return;
    }

    try {
      await Linking.openURL(`https://wa.me/${whatsappPhone}`);
    } catch (error) {
      Alert.alert('Erro ao abrir WhatsApp', 'Nao foi possivel abrir o WhatsApp agora.');
    }
  }

  async function handleCall() {
    const phoneDigits = getPhoneDigits(otherPersonPhone);

    if (!phoneDigits) {
      Alert.alert('Telefone indisponivel', 'Telefone nao disponivel.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phoneDigits}`);
    } catch (error) {
      Alert.alert('Erro ao ligar', 'Nao foi possivel iniciar a ligacao agora.');
    }
  }

  if (loading || !request) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2f7d57" size="large" />
        <Text style={styles.loadingText}>Carregando solicitacao...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {request.item?.image_url ? (
          <View style={styles.imageFrame}>
            <Image source={{ uri: request.item.image_url }} style={styles.itemImage} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Sem foto disponivel</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>{request.item?.titulo || 'Item nao encontrado'}</Text>
          <Text style={styles.status}>{formatRequestStatus(request.status)}</Text>
        </View>

        <Text style={styles.label}>Descricao</Text>
        <Text style={styles.value}>{request.item?.descricao || 'Descricao nao informada'}</Text>

        <Text style={styles.label}>Status do item</Text>
        <Text style={styles.value}>{formatItemStatus(request.item?.status)}</Text>

        <Text style={styles.label}>{otherPersonLabel}</Text>
        <View style={styles.personBox}>
          {otherPerson?.avatar_url ? (
            <Image source={{ uri: otherPerson.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>U</Text>
            </View>
          )}
          <View style={styles.personTextBox}>
            <Text style={styles.personName}>
              {otherPerson?.nome || otherPersonFallback}
            </Text>
            <Text style={styles.personLocation}>
              {otherPersonLocation || 'Localizacao nao informada'}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Data da solicitacao</Text>
        <Text style={styles.value}>{formatDate(request.created_at)}</Text>

        <Text style={styles.label}>Status da solicitacao</Text>
        <Text style={styles.value}>{formatRequestStatus(request.status)}</Text>

        {isRequester && request.status === 'pending' ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Aguardando resposta do doador.</Text>
          </View>
        ) : null}

        {isAccepted ? (
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Contato liberado</Text>
            <Text style={styles.contactText}>Combine a retirada do item com seguranca.</Text>

            <Text style={styles.label}>Telefone</Text>
            <Text style={styles.value}>{otherPersonPhone || 'Telefone nao disponivel'}</Text>

            <View style={styles.contactActions}>
              <Pressable
                onPress={handleOpenWhatsApp}
                style={({ pressed }) => [styles.whatsappButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.actionButtonText}>Conversar no WhatsApp</Text>
              </Pressable>

              <Pressable
                onPress={handleCall}
                style={({ pressed }) => [styles.callButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.callButtonText}>Ligar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {canManage ? (
          <View style={styles.actions}>
            <Pressable
              disabled={Boolean(savingAction)}
              onPress={handleAccept}
              style={({ pressed }) => [
                styles.acceptButton,
                pressed && styles.buttonPressed,
                savingAction && styles.buttonDisabled,
              ]}
            >
              {savingAction === 'accept' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Aceitar</Text>
              )}
            </Pressable>

            <Pressable
              disabled={Boolean(savingAction)}
              onPress={handleReject}
              style={({ pressed }) => [
                styles.rejectButton,
                pressed && styles.buttonPressed,
                savingAction && styles.buttonDisabled,
              ]}
            >
              {savingAction === 'reject' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Recusar</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {canComplete ? (
          <View style={styles.actions}>
            <Pressable
              disabled={Boolean(savingAction)}
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.completeButton,
                pressed && styles.buttonPressed,
                savingAction && styles.buttonDisabled,
              ]}
            >
              {savingAction === 'complete' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Concluir doacao</Text>
              )}
            </Pressable>
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
  centerContainer: {
    alignItems: 'center',
    backgroundColor: '#f4f6f3',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#52645b',
    fontSize: 15,
    marginTop: 12,
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
  personBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  avatar: {
    backgroundColor: '#e4efe8',
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: '#2f7d57',
    fontSize: 14,
    fontWeight: '700',
  },
  personTextBox: {
    flex: 1,
  },
  personName: {
    color: '#2d3a34',
    fontSize: 16,
    fontWeight: '700',
  },
  personLocation: {
    color: '#52645b',
    fontSize: 14,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fff7df',
    borderColor: '#e5c46d',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 12,
  },
  infoText: {
    color: '#6f5a1f',
    fontSize: 14,
    lineHeight: 20,
  },
  contactBox: {
    backgroundColor: '#eef7f1',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 20,
    padding: 14,
  },
  contactTitle: {
    color: '#245442',
    fontSize: 17,
    fontWeight: '700',
  },
  contactText: {
    color: '#52645b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  contactActions: {
    gap: 10,
    marginTop: 14,
  },
  whatsappButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  callButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#2f7d57',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  callButtonText: {
    color: '#2f7d57',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 24,
  },
  acceptButton: {
    alignItems: 'center',
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: '#9d2f2f',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: '#245442',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  actionButtonText: {
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
