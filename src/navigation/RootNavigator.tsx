import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import MedicinesScreen from '../screens/MedicinesScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1d4e89" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {session ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
          <Stack.Screen name="Medicines" component={MedicinesScreen} options={{ title: 'Medicines' }} />
          <Stack.Screen
            name="AddMedicine"
            component={AddMedicineScreen}
            options={{ title: 'Add medicine' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'MedFamily' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
