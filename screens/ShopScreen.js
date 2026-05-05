import { View, Text, StyleSheet } from 'react-native';

//Essa é a tela principal da aba "Doações". É aonde vai ficar os item a serem doados

export default function ShopScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aqui estarão os items para doação</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24,  textAlign: 'center' },
});