import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Loan, Replacement } from '../types';
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
}: Props & {
  onOpenReplacement: (r: Replacement) => void;
  onOpenLoan: (l: Loan) => void;
  onOpenToolForm: (toolId?: string) => void;
  onOpenUsersForm: (userId?: string) => void;
  onOpenCategories: () => void;
  onOpenSubCategories: () => void;
}) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Reports" options={{ title: 'Reports' }}>
        {() => <AdminReportsScreen token={token} />}
      </Tab.Screen>
      <Tab.Screen name="Penggantian" options={{ title: 'Penggantian' }}>
        {() => <AdminReplacementsScreen token={token} onOpenReplacement={onOpenReplacement} />}
      </Tab.Screen>
      <Tab.Screen name="Tools" options={{ title: 'Tools' }}>
        {() => (
          <AdminToolsScreen
            token={token}
            onCreate={() => onOpenToolForm(undefined)}
            onEdit={(id) => onOpenToolForm(id)}
            onOpenCategories={onOpenCategories}
            onOpenSubCategories={onOpenSubCategories}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Loans" options={{ title: 'Loans' }}>
        {() => <AdminLoansScreen token={token} onOpenLoan={onOpenLoan} />}
      </Tab.Screen>
      <Tab.Screen name="Users" options={{ title: 'Users' }}>
        {() => <AdminUsersScreen token={token} onCreate={() => onOpenUsersForm(undefined)} onEdit={(id) => onOpenUsersForm(id)} />}
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ title: 'Settings' }}>
        {() => <SettingsScreen onLogout={onLogout} />}
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

  return (
    <NavigationContainer>
      <Stack.Navigator>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
