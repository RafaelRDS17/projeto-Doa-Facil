import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { listDonationItems } from '../src/services/itemService';

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

export default function ShopScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async ({ showRefreshing = false } = {}) => {
    try {
      setError(null);

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const donationItems = await listDonationItems();
      setItems(donationItems || []);
    } catch {
      setError('Nao foi possivel carregar as doacoes agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  function renderItem({ item }) {
    const donorProfile = item.profiles;
    const cityState = [donorProfile?.municipio, donorProfile?.estado].filter(Boolean).join(' - ');
    const neighborhood = donorProfile?.bairro;

    return (
      <Pressable
        onPress={() => navigation.navigate('ItemDetails', { item })}
        style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Sem foto</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.itemTitle}>{item.titulo}</Text>
            <Text style={styles.status}>{formatItemStatus(item.status)}</Text>
          </View>

          <Text style={styles.category}>{item.categoria}</Text>
          <Text numberOfLines={2} style={styles.description}>
            {item.descricao}
          </Text>

          <View style={styles.donorRow}>
            {donorProfile?.avatar_url ? (
              <Image source={{ uri: donorProfile.avatar_url }} style={styles.donorAvatar} />
            ) : (
              <View style={styles.donorAvatarPlaceholder}>
                <Text style={styles.donorAvatarText}>D</Text>
              </View>
            )}
            <View style={styles.donorTextBox}>
              <Text numberOfLines={1} style={styles.donorName}>
                {donorProfile?.nome || 'Doador nao informado'}
              </Text>
              <Text numberOfLines={1} style={styles.donorLocation}>
                {cityState || neighborhood
                  ? [neighborhood, cityState].filter(Boolean).join(', ')
                  : 'Localizacao nao informada'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#2f7d57" size="large" />
        <Text style={styles.loadingText}>Carregando doacoes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doacoes disponiveis</Text>
        <Pressable
          disabled={refreshing}
          onPress={() => loadItems({ showRefreshing: true })}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.buttonPressed,
            refreshing && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.refreshButtonText}>{refreshing ? 'Atualizando' : 'Atualizar'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma doacao cadastrada ainda.</Text>
        }
        onRefresh={() => loadItems({ showRefreshing: true })}
        refreshing={refreshing}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6f3',
    flex: 1,
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 8,
  },
  title: {
    color: '#245442',
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: '#2f7d57',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#d8e0da',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  cardImage: {
    backgroundColor: '#e4efe8',
    borderRadius: 8,
    height: 82,
    width: 82,
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderColor: '#b7d2c1',
    borderRadius: 8,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  imagePlaceholderText: {
    color: '#52645b',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    color: '#1f2924',
    flex: 1,
    fontSize: 18,
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
  category: {
    color: '#2f7d57',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: '#52645b',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  donorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  donorAvatar: {
    backgroundColor: '#e4efe8',
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  donorAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e4efe8',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  donorAvatarText: {
    color: '#2f7d57',
    fontSize: 12,
    fontWeight: '700',
  },
  donorTextBox: {
    flex: 1,
  },
  donorName: {
    color: '#2d3a34',
    fontSize: 13,
    fontWeight: '700',
  },
  donorLocation: {
    color: '#52645b',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#52645b',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#9d2f2f',
    fontSize: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
