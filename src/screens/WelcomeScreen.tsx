import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/types';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MedFamily</Text>
      <Text style={styles.message}>Medication schedules for your household.</Text>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.buttonText}>Create account</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.secondaryButtonText}>I already have an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#14213d',
  },
  message: {
    marginTop: 12,
    fontSize: 18,
    color: '#333333',
  },
  button: {
    marginTop: 32,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#1d4e89',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1d4e89',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1d4e89',
    fontSize: 18,
    fontWeight: '700',
  },
});
