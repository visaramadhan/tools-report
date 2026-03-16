import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useState } from 'react';
import { Replacement, Tool } from '../types';
import ToolsScreen from '../screens/Technician/ToolsScreen';
import ReportScreen from '../screens/Technician/ReportScreen';
import HistoryScreen from '../screens/Technician/HistoryScreen';
import ReturnOldScreen from '../screens/Technician/ReturnOldScreen';

type Props = {
  token: string;
  onLogout: () => void;
};

type RootStackParamList = {
  Tabs: undefined;
  Report: { tool?: Tool } | undefined;
  ReturnOld: { replacement: Replacement };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function Tabs({ token, onLogout, onOpenReport, onOpenReturnOld }: Props & { onOpenReport: (tool?: Tool) => void; onOpenReturnOld: (r: Replacement) => void }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Tools" options={{ title: 'Tools' }}>
        {() => <ToolsScreen token={token} onLogout={onLogout} onOpenReport={onOpenReport} onOpenReturnOld={onOpenReturnOld} />}
      </Tab.Screen>
      <Tab.Screen name="Riwayat" options={{ title: 'Riwayat' }}>
        {() => <HistoryScreen token={token} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function TechnicianNavigator({ token, onLogout }: Props) {
  const [reportTool, setReportTool] = useState<Tool | undefined>(undefined);
  const [returnReplacement, setReturnReplacement] = useState<Replacement | null>(null);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" options={{ headerShown: false }}>
          {({ navigation }) => (
            <Tabs
              token={token}
              onLogout={onLogout}
              onOpenReport={(tool) => {
                setReportTool(tool);
                navigation.navigate('Report', tool ? { tool } : undefined);
              }}
              onOpenReturnOld={(r) => {
                setReturnReplacement(r);
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
                setReportTool(undefined);
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
                setReturnReplacement(null);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
