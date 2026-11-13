import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import EditMedicineScreen from '../screens/EditMedicineScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import AdminTabNavigator from './AdminTabNavigator';
import MemberTabNavigator from './MemberTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, profile, isLoading } = useAuth();

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
            options={{ title: 'Add medicine' }}
          />
          <Stack.Screen
            name="EditMedicine"
            component={EditMedicineScreen}
            options={{ title: 'Edit medicine' }}
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
            options={{ title: 'Register' }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Sign in' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
