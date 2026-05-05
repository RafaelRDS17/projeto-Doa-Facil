import { View, Text, StyleSheet } from 'react-native';

//Essa é a tela principal da aba "Doar". É aonde o usuario ira colocar items para a doação

export default function DonateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aqui é onde voce ira doar os items</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24,  textAlign: 'center'  },
});