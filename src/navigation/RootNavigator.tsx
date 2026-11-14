import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import AddPersonScreen from '../screens/AddPersonScreen';
import EditMedicineScreen from '../screens/EditMedicineScreen';
import EditPersonScreen from '../screens/EditPersonScreen';
import HistoryScreen from '../screens/HistoryScreen';
import JoinWithCodeScreen from '../screens/JoinWithCodeScreen';
import LoginScreen from '../screens/LoginScreen';
import ManageInvitesScreen from '../screens/ManageInvitesScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import AdminTabNavigator from './AdminTabNavigator';
import MemberTabNavigator from './MemberTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, profile, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {session ? (
        <>
          {isAdmin ? (
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabNavigator}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="MemberTabs"
              component={MemberTabNavigator}
              options={{ headerShown: false }}
            />
          )}
          <Stack.Screen
            name="AddMedicine"
            component={AddMedicineScreen}
            options={{ title: t.addMedicineTitle }}
          />
          <Stack.Screen
            name="EditMedicine"
            component={EditMedicineScreen}
            options={{ title: t.editMedicineTitle }}
          />
          <Stack.Screen
            name="AddPerson"
            component={AddPersonScreen}
            options={{ title: t.addPersonTitle }}
          />
          <Stack.Screen
            name="EditPerson"
            component={EditPersonScreen}
            options={{ title: t.editPersonTitle }}
          />
          <Stack.Screen
            name="ManageInvites"
            component={ManageInvitesScreen}
            options={{ title: t.manageInvitesTitle }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: t.doseHistory }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: t.createAccount }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: t.signIn }}
          />
          <Stack.Screen
            name="JoinWithCode"
            component={JoinWithCodeScreen}
            options={{ title: t.joinHousehold }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
