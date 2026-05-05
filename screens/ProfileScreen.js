import { View, Text, StyleSheet } from 'react-native';

//Essa é a tela principal da aba "Perfil". É aonde vai ficar o perfil e as configurações

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aqui Estarão seu perfil e configurações</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24,  textAlign: 'center'  },
});