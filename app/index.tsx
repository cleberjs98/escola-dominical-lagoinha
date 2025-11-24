import { View, Text, StyleSheet } from "react-native";
import { firebaseDb } from "../lib/firebase";

export default function HomeScreen() {
  console.log("Firestore conectado:", !!firebaseDb);

  return (
    
    <View style={styles.container}>
      <Text style={styles.title}>Escola Dominical Lagoinha Dublin</Text>
      <Text style={styles.subtitle}>
        App em construção 🚧{"\n"}Fase 1.1 - Estrutura inicial
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
});
