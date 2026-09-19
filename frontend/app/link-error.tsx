import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../src/constants/theme';
export default function LinkError() {
  const router = useRouter();
  return <SafeAreaView testID="invalid-shared-link" style={styles.page}>
    <Text testID="invalid-shared-link-message" style={styles.text}>Bu bağlantı geçerli değil.</Text>
    <TouchableOpacity testID="invalid-shared-link-home" onPress={() => router.replace('/(tabs)')} style={styles.button}>
      <Text style={styles.text}>Ana sayfa</Text>
    </TouchableOpacity>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { fontSize: 16, color: colors.text },
  button: { minHeight: 44, padding: 12, backgroundColor: colors.primary, borderRadius: 22 },
});