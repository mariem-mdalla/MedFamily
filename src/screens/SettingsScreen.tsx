import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage('');
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not sign out.');
      setIsSigningOut(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Profile</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{profile?.display_name ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile?.role === 'admin' ? 'Household Admin' : 'Family Member'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Language</Text>
          <Text style={styles.value}>{profile?.language === 'ar' ? 'العربية' : 'Français'}</Text>
        </View>
      </View>

      {profile?.role === 'admin' ? (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Household</Text>
          <Pressable
            style={styles.actionRow}
            onPress={() => navigation.navigate('ManageInvites')}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="ticket-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.actionText}>Manage invite codes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Voice Reminder</Text>
          <Text style={styles.value}>{profile?.voice_enabled ? 'On' : 'Off'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Large Text</Text>
          <Text style={styles.value}>{profile?.large_text ? 'Enabled' : 'Default'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>High Contrast</Text>
          <Text style={styles.value}>{profile?.high_contrast ? 'Enabled' : 'Default'}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? (
          <ActivityIndicator color={theme.colors.error} />
        ) : (
          <Text style={styles.signOutText}>Sign out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    minHeight: theme.touchTarget.minTarget,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.label,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  signOutButton: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
});
