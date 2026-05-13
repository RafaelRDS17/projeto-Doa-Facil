import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getReceivedRequests, getSentRequests } from '../src/services/donationRequestService';

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

function PersonSummary({ profile, fallbackName }) {
  const location = formatLocation(profile);

  return (
    <View style={styles.personRow}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      )}
      <View style={styles.personTextBox}>
        <Text numberOfLines={1} style={styles.personName}>
          {profile?.nome || fallbackName}
        </Text>
        <Text numberOfLines={1} style={styles.personLocation}>
          {location || 'Localizacao nao informada'}
        </Text>
      </View>
    </View>
  );
}

function RequestCard({ mode, navigation, request }) {
  const profile = mode === 'received' ? request.requester : request.donor;
  const fallbackName = mode === 'received' ? 'Interessado nao informado' : 'Doador nao informado';
  const personLabel = mode === 'received' ? 'Interessado' : 'Doador';

  return (
    <Pressable
      onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.itemRow}>
        {request.item?.image_url ? (
          <Image source={{ uri: request.item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Text style={styles.itemImageText}>Sem foto</Text>
          </View>
        )}

        <View style={styles.itemTextBox}>
          <View style={styles.cardHeader}>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {request.item?.titulo || 'Item nao encontrado'}
            </Text>
            <Text style={styles.status}>{formatRequestStatus(request.status)}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.personLabel}>{personLabel}</Text>
      <PersonSummary profile={profile} fallbackName={fallbackName} />
    </Pressable>
  );
}

function Section({ emptyText, mode, navigation, requests, title }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {requests.length ? (
        requests.map((request) => (
          <RequestCard key={request.id} mode={mode} navigation={navigation} request={request} />
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

export default function RequestsScreen({ navigation }) {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadRequests = useCallback(async ({ showRefreshing = false } = {}) => {
    try {
      setError(null);

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [received, sent] = await Promise.all([
        getReceivedRequests(),
        getSentRequests(),
      ]);

      setReceivedRequests(received);
      setSentRequests(sent);
    } catch {
      setError('Nao foi possivel carregar as solicitacoes agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2f7d57" size="large" />
        <Text style={styles.loadingText}>Carregando solicitacoes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          colors={['#2f7d57']}
          onRefresh={() => loadRequests({ showRefreshing: true })}
          refreshing={refreshing}
          tintColor="#2f7d57"
        />
      }
      style={styles.container}
    >
      <Text style={styles.title}>Solicitacoes</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Section
        emptyText="Voce ainda nao recebeu solicitacoes."
        mode="received"
        navigation={navigation}
        requests={receivedRequests}
        title="Recebidas"
      />

      <Section
        emptyText="Voce ainda nao enviou solicitacoes."
        mode="sent"
        navigation={navigation}
        requests={sentRequests}
        title="Enviadas"
      />
    </ScrollView>
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
  title: {
    color: '#245442',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 18,
  },
  errorText: {
    color: '#9d2f2f',
    fontSize: 14,
    marginBottom: 12,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#2d3a34',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  itemImage: {
    backgroundColor: '#e4efe8',
    borderRadius: 8,
    height: 72,
    width: 72,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  itemImageText: {
    color: '#52645b',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  itemTextBox: {
    flex: 1,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  itemTitle: {
    color: '#1f2924',
    flex: 1,
    fontSize: 17,
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
  dateText: {
    color: '#52645b',
    fontSize: 13,
    marginTop: 8,
  },
  personLabel: {
    color: '#2f7d57',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  personRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  avatar: {
    backgroundColor: '#e4efe8',
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: {
    color: '#2f7d57',
    fontSize: 13,
    fontWeight: '700',
  },
  personTextBox: {
    flex: 1,
  },
  personName: {
    color: '#2d3a34',
    fontSize: 14,
    fontWeight: '700',
  },
  personLocation: {
    color: '#52645b',
    fontSize: 13,
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    color: '#52645b',
    fontSize: 15,
    textAlign: 'center',
  },
});
