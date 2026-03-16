import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onLogout: () => void;
};

export default function SettingsScreen({ onLogout }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Settings</Text>
        <Pressable style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '800', color: '#2A3547' },
  button: { marginTop: 14, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
});

