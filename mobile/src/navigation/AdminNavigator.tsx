import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClipboardList, faRepeat, faWrench, faInbox, faUsers, faGear, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { Loan, Replacement, Report } from '../types';
import AdminDashboardScreen from '../screens/Admin/DashboardScreen';
import AdminReportsScreen from '../screens/Admin/ReportsScreen';
import AdminReplacementsScreen from '../screens/Admin/ReplacementsScreen';
import AdminReplacementDetailScreen from '../screens/Admin/ReplacementDetailScreen';
import AdminToolsScreen from '../screens/Admin/ToolsScreen';
import AdminLoansScreen from '../screens/Admin/LoansScreen';
import AdminLoanDetailScreen from '../screens/Admin/LoanDetailScreen';
import AdminUsersScreen from '../screens/Admin/UsersScreen';
import AdminUserFormScreen from '../screens/Admin/UserFormScreen';
import AdminToolFormScreen from '../screens/Admin/ToolFormScreen';
import AdminCategoriesScreen from '../screens/Admin/CategoriesScreen';
import AdminCategoryFormScreen from '../screens/Admin/CategoryFormScreen';
import AdminSubCategoriesScreen from '../screens/Admin/SubCategoriesScreen';
import AdminSubCategoryFormScreen from '../screens/Admin/SubCategoryFormScreen';
import AdminToolLoansScreen from '../screens/Admin/ToolLoansScreen';
import AdminToolReportsScreen from '../screens/Admin/ToolReportsScreen';
import AdminReportFormScreen from '../screens/Admin/ReportFormScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

type Props = {
  token: string;
  onLogout: () => void;
};

type RootStackParamList = {
  Tabs: undefined;
  ReplacementDetail: { replacement: Replacement };
  LoanDetail: { loan: Loan };
  ToolForm: { toolId?: string } | undefined;
  UserForm: { userId?: string } | undefined;
  Categories: undefined;
  CategoryForm: { categoryId?: string } | undefined;
  SubCategories: undefined;
  SubCategoryForm: { subCategoryId?: string } | undefined;
  ToolLoans: { toolId: string };
  ToolReports: { toolId: string };
  ReportForm: { toolId?: string } | undefined;
  ReportDetail: { report: Report; token?: string; role?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function Tabs({
  token,
  onLogout,
  onOpenReplacement,
  onOpenLoan,
  onOpenToolForm,
  onOpenUsersForm,
  onOpenCategories,
  onOpenSubCategories,
  onViewToolLoans,
  onViewToolReports,
  onOpenReportForm,
}: Props & {
  onOpenReplacement: (r: Replacement) => void;
  onOpenLoan: (l: Loan) => void;
  onOpenToolForm: (toolId?: string) => void;
  onOpenUsersForm: (userId?: string) => void;
  onOpenCategories: () => void;
  onOpenSubCategories: () => void;
  onViewToolLoans: (toolId: string) => void;
  onViewToolReports: (toolId: string) => void;
  onOpenReportForm: (toolId?: string) => void;
}) {
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
          title: 'Home',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faChartPie} color={color} size={size ?? 20} />,
        }}
      >
        {() => <AdminDashboardScreen token={token} />}
      </Tab.Screen>
      <Tab.Screen
        name="Reports"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faClipboardList} color={color} size={size ?? 20} />,
        }}
      >
        {() => <AdminReportsScreen token={token} onCreateReport={() => onOpenReportForm()} />}
      </Tab.Screen>
      <Tab.Screen
        name="Penggantian"
        options={{
          title: 'Penggantian',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faRepeat} color={color} size={size ?? 20} />,
        }}
      >
        {() => <AdminReplacementsScreen token={token} onOpenReplacement={onOpenReplacement} />}
      </Tab.Screen>
      <Tab.Screen
        name="Tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faWrench} color={color} size={size ?? 20} />,
        }}
      >
        {() => (
          <AdminToolsScreen
            token={token}
            onCreate={() => onOpenToolForm(undefined)}
            onEdit={(id) => onOpenToolForm(id)}
            onOpenCategories={onOpenCategories}
            onOpenSubCategories={onOpenSubCategories}
            onViewLoans={onViewToolLoans}
            onViewReports={onViewToolReports}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Loans"
        options={{
          title: 'Peminjaman',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faInbox} color={color} size={size ?? 20} />,
        }}
      >
        {() => <AdminLoansScreen token={token} onOpenLoan={onOpenLoan} />}
      </Tab.Screen>
      <Tab.Screen
        name="Users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faUsers} color={color} size={size ?? 20} />,
        }}
      >
        {() => <AdminUsersScreen token={token} onCreate={() => onOpenUsersForm(undefined)} onEdit={(id) => onOpenUsersForm(id)} />}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faGear} color={color} size={size ?? 20} />,
        }}
      >
        {() => <SettingsScreen token={token} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AdminNavigator({ token, onLogout }: Props) {
  const [, setActiveReplacement] = useState<Replacement | null>(null);
  const [, setActiveLoan] = useState<Loan | null>(null);
  const [, setActiveToolId] = useState<string | undefined>(undefined);
  const [, setActiveUserId] = useState<string | undefined>(undefined);
  const [, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [, setActiveSubCategoryId] = useState<string | undefined>(undefined);
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
              onOpenReplacement={(r) => {
                setActiveReplacement(r);
                navigation.navigate('ReplacementDetail', { replacement: r });
              }}
              onOpenLoan={(l) => {
                setActiveLoan(l);
                navigation.navigate('LoanDetail', { loan: l });
              }}
              onOpenToolForm={(id) => {
                setActiveToolId(id);
                navigation.navigate('ToolForm', id ? { toolId: id } : undefined);
              }}
              onOpenUsersForm={(id) => {
                setActiveUserId(id);
                navigation.navigate('UserForm', id ? { userId: id } : undefined);
              }}
              onOpenCategories={() => navigation.navigate('Categories')}
              onOpenSubCategories={() => navigation.navigate('SubCategories')}
              onViewToolLoans={(id) => navigation.navigate('ToolLoans', { toolId: id })}
              onViewToolReports={(id) => navigation.navigate('ToolReports', { toolId: id })}
              onOpenReportForm={(id) => navigation.navigate('ReportForm', { toolId: id })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ReplacementDetail" options={{ title: 'Detail Penggantian' }}>
          {({ navigation, route }) => (
            <AdminReplacementDetailScreen
              token={token}
              replacement={route.params.replacement}
              onDone={() => {
                setActiveReplacement(null);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="LoanDetail" options={{ title: 'Detail Loan' }}>
          {({ navigation, route }) => (
            <AdminLoanDetailScreen
              token={token}
              loan={route.params.loan}
              onDone={() => {
                setActiveLoan(null);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ToolForm" options={{ title: 'Tools' }}>
          {({ navigation, route }) => (
            <AdminToolFormScreen
              token={token}
              toolId={route.params?.toolId}
              onDone={() => {
                setActiveToolId(undefined);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="UserForm" options={{ title: 'User' }}>
          {({ navigation, route }) => (
            <AdminUserFormScreen
              token={token}
              userId={route.params?.userId}
              onDone={() => {
                setActiveUserId(undefined);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Categories" options={{ title: 'Kategori' }}>
          {({ navigation }) => (
            <AdminCategoriesScreen
              token={token}
              onCreate={() => {
                setActiveCategoryId(undefined);
                navigation.navigate('CategoryForm');
              }}
              onEdit={(id) => {
                setActiveCategoryId(id);
                navigation.navigate('CategoryForm', { categoryId: id });
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="CategoryForm" options={{ title: 'Kategori' }}>
          {({ navigation, route }) => (
            <AdminCategoryFormScreen
              token={token}
              categoryId={route.params?.categoryId}
              onDone={() => {
                setActiveCategoryId(undefined);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="SubCategories" options={{ title: 'Sub Kategori' }}>
          {({ navigation }) => (
            <AdminSubCategoriesScreen
              token={token}
              onCreate={() => {
                setActiveSubCategoryId(undefined);
                navigation.navigate('SubCategoryForm');
              }}
              onEdit={(id) => {
                setActiveSubCategoryId(id);
                navigation.navigate('SubCategoryForm', { subCategoryId: id });
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="SubCategoryForm" options={{ title: 'Sub Kategori' }}>
          {({ navigation, route }) => (
            <AdminSubCategoryFormScreen
              token={token}
              subCategoryId={route.params?.subCategoryId}
              onDone={() => {
                setActiveSubCategoryId(undefined);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ToolLoans" options={{ title: 'Riwayat Peminjaman' }}>
          {({ route }) => <AdminToolLoansScreen token={token} toolId={route.params.toolId} />}
        </Stack.Screen>

        <Stack.Screen name="ToolReports" options={{ title: 'Laporan Kondisi' }}>
          {({ navigation, route }) => (
            <AdminToolReportsScreen 
              token={token} 
              toolId={route.params.toolId} 
              onCreateReport={() => navigation.navigate('ReportForm', { toolId: route.params.toolId })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ReportForm" options={{ title: 'Buat Laporan' }}>
          {({ navigation, route }) => (
            <AdminReportFormScreen 
              token={token} 
              toolId={route.params?.toolId} 
              onDone={() => navigation.goBack()} 
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ReportDetail" options={{ title: 'Detail Laporan' }} component={ReportDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
