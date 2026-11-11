import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { profile, session, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setMessage('');

    try {
      await signOut();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
      setIsSigningOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.message}>
        Signed in as {profile?.display_name ?? session?.user.email}
      </Text>
      <Text style={styles.detail}>Role: {profile?.role ?? 'loading'}</Text>

      <Pressable style={styles.button} onPress={() => navigation.navigate('Medicines')}>
        <Text style={styles.buttonText}>Medicines</Text>
      </Pressable>

      <Text style={styles.hint}>
        Interface polish comes later: keyboard scrolling, password rules, and show-password.
      </Text>

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <Pressable style={styles.secondaryButton} onPress={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? (
          <ActivityIndicator color="#1d4e89" />
        ) : (
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        )}
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
  detail: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    color: '#333333',
  },
  hint: {
    marginTop: 16,
    fontSize: 15,
    color: '#666666',
  },
  feedback: {
    marginTop: 12,
    fontSize: 16,
    color: '#14213d',
  },
  button: {
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
