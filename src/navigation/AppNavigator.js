import { useCallback, useState } from 'react';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import DonateScreen from '../../screens/DonateScreen';
import EditItemScreen from '../../screens/EditItemScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import ItemDetailsScreen from '../../screens/ItemDetailsScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import RequestDetailsScreen from '../../screens/RequestDetailsScreen';
import RequestsScreen from '../../screens/RequestsScreen';
import ShopScreen from '../../screens/ShopScreen';
import { useAuth } from '../hooks';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { getPendingReceivedRequestCount } from '../services/donationRequestService';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#2f7d57" size="large" />
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const loadPendingRequestCount = useCallback(async () => {
    try {
      const count = await getPendingReceivedRequestCount();
      setPendingRequestCount(count);
    } catch (error) {
      setPendingRequestCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPendingRequestCount();
    }, [loadPendingRequestCount]),
  );

  return (
    <Tab.Navigator
      screenListeners={{
        state: loadPendingRequestCount,
      }}
      screenOptions={{
        tabBarActiveTintColor: '#2f7d57',
        tabBarInactiveTintColor: '#6f7d74',
      }}
    >
      <Tab.Screen name="Donations" component={ShopScreen} options={{ title: 'Doacoes' }} />
      <Tab.Screen name="Donate" component={DonateScreen} options={{ title: 'Doar' }} />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          title: 'Solicitacoes',
          tabBarBadge: pendingRequestCount > 0 ? pendingRequestCount : undefined,
          tabBarBadgeStyle: styles.requestBadge,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { hasProfile, loading, session } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {session && hasProfile ? (
        <AppStack.Navigator>
          <AppStack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{
              headerShown: false,
              title: 'Voltar',
            }}
          />
          <AppStack.Screen
            name="ItemDetails"
            component={ItemDetailsScreen}
            options={{
              title: 'Detalhes da doacao',
              headerBackTitle: 'Voltar',
            }}
          />
          <AppStack.Screen
            name="EditItem"
            component={EditItemScreen}
            options={{
              title: 'Editar doacao',
              headerBackTitle: 'Voltar',
            }}
          />
          <AppStack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              title: 'Editar perfil',
              headerBackTitle: 'Voltar',
            }}
          />
          <AppStack.Screen
            name="RequestDetails"
            component={RequestDetailsScreen}
            options={{
              title: 'Detalhes da solicitacao',
              headerBackTitle: 'Voltar',
            }}
          />
        </AppStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#f4f6f3',
    flex: 1,
    justifyContent: 'center',
  },
  requestBadge: {
    backgroundColor: '#d53939',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
