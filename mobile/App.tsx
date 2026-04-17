import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import LoginScreen from './src/screens/LoginScreen';
import { apiRequest } from './src/api/client';
import { clearToken, getToken, setToken } from './src/storage/token';
import { User } from './src/types';
import TechnicianNavigator from './src/navigation/TechnicianNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import { ThemeProvider, useAppTheme } from './src/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleHalfStroke, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

function AppInner() {
  const [booting, setBooting] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { colors, mode, resolved, setMode } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Roboto_400Regular,
    Roboto_700Bold,
  });

  useEffect(() => {
    (async () => {
      setBooting(true);
      try {
        const t = await getToken();
        if (!t) return;
        const me = await apiRequest<{ user: User; token?: string }>('/api/mobile/me', { token: t });
        const nextToken = me.token || t;
        if (nextToken !== t) await setToken(nextToken);
        setTokenState(nextToken);
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

  const cycleMode = async () => {
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    await setMode(next);
  };

  const content = (() => {
    if (booting || !fontsLoaded) {
      return (
        <View style={[styles.boot, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
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

    if (user.role === 'admin') return <AdminNavigator token={token} onLogout={logout} />;
    return <TechnicianNavigator token={token} onLogout={logout} />;
  })();

  const icon = mode === 'system' ? faCircleHalfStroke : resolved === 'dark' ? faSun : faMoon;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {content}
      <Pressable style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={cycleMode} hitSlop={10}>
        <FontAwesomeIcon icon={icon} color={colors.text} size={16} />
      </Pressable>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  themeBtn: {
    position: 'absolute',
    bottom: 88,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 999,
  },
});
