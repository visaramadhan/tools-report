import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import { apiRequest } from './src/api/client';
import { clearToken, getToken, setToken } from './src/storage/token';
import { User } from './src/types';
import TechnicianNavigator from './src/navigation/TechnicianNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      setBooting(true);
      try {
        const t = await getToken();
        if (!t) return;
        const me = await apiRequest<{ user: User }>('/api/mobile/me', { token: t });
        setTokenState(t);
        setUser(me.user);
      } catch {
        await clearToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#0E5E7E" />
      </View>
    );
  }

  if (!token || !user) {
    return (
      <LoginScreen
        onLoggedIn={async (t, u) => {
          await setToken(t);
          setTokenState(t);
          setUser(u);
        }}
      />
    );
  }

  if (user.role === 'technician') {
    return <TechnicianNavigator token={token} onLogout={logout} />;
  }

  return <AdminNavigator token={token} onLogout={logout} />;
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center' },
});
