import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBorderAll, faPlusCircle, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import SettingsScreen from '../screens/SettingsScreen';
import { Replacement, Report, Tool } from '../types';
import ToolsScreen from '../screens/Technician/ToolsScreen';
import ReportScreen from '../screens/Technician/ReportScreen';
import HistoryScreen from '../screens/Technician/HistoryScreen';
import ReturnOldScreen from '../screens/Technician/ReturnOldScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

type Props = {
  token: string;
  onLogout: () => void;
};

type RootStackParamList = {
  Tabs: undefined;
  Report: { tool?: Tool } | undefined;
  ReturnOld: { replacement: Replacement };
  ReportDetail: { report: Report; token?: string; role?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function EmptyScreen() {
  return null;
}

function Tabs({ token, onLogout, onOpenReport, onOpenReturnOld }: Props & { onOpenReport: (tool?: Tool) => void; onOpenReturnOld: (r: Replacement) => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          shadowColor: 'rgba(0,0,0,0.25)',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.12,
          shadowRadius: 30,
          elevation: 20,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faBorderAll} color={color} size={size ?? 20} />,
        }}
      >
        {() => <ToolsScreen token={token} onLogout={onLogout} onOpenReport={onOpenReport} onOpenReturnOld={onOpenReturnOld} />}
      </Tab.Screen>
      <Tab.Screen
        name="BuatReport"
        component={EmptyScreen}
        options={{
          title: 'Buat Report',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faPlusCircle} color={color} size={size ?? 20} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            onOpenReport(undefined);
          },
        }}
      />
      <Tab.Screen
        name="Riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faClock} color={color} size={size ?? 20} />,
        }}
      >
        {() => <HistoryScreen token={token} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faUser} color={color} size={size ?? 20} />,
        }}
      >
        {() => <SettingsScreen token={token} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function TechnicianNavigator({ token, onLogout }: Props) {
  const { navTheme, colors } = useAppTheme();
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      >
        <Stack.Screen name="Tabs" options={{ headerShown: false }}>
          {({ navigation }) => (
            <Tabs
              token={token}
              onLogout={onLogout}
              onOpenReport={(tool) => {
                navigation.navigate('Report', tool ? { tool } : undefined);
              }}
              onOpenReturnOld={(r) => {
                navigation.navigate('ReturnOld', { replacement: r });
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Report" options={{ title: 'Buat Report' }}>
          {({ navigation, route }) => (
            <ReportScreen
              token={token}
              initialTool={route.params?.tool}
              onDone={() => {
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ReturnOld" options={{ title: 'Kirim Tools Lama' }}>
          {({ navigation, route }) => (
            <ReturnOldScreen
              token={token}
              replacement={route.params.replacement}
              onDone={() => {
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ReportDetail" options={{ title: 'Detail Laporan' }} component={ReportDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
