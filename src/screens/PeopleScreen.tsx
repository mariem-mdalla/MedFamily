import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile } from '../types/database';

export default function PeopleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const [people, setPeople] = useState<CareProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const hasLoadedRef = useRef(false);

  async function loadPeople(silent = false) {
    if (!profile) {
      setPeople([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setMessage('');

    const { data, error } = await supabase
      .from('care_profiles')
      .select('id, family_id, display_name, label, color, linked_user_id')
      .eq('family_id', profile.family_id)
      .order('display_name');

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPeople((data as CareProfile[]) ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadPeople(!isInitial);
    }, [profile?.family_id]),
  );

  function handleDelete(person: CareProfile) {
    Alert.alert(
      'Remove person',
      `Remove "${person.display_name}" from the household? Their past dose history will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('care_profiles')
              .delete()
              .eq('id', person.id)
              .eq('family_id', profile?.family_id ?? '');

            if (error) {
              setMessage(error.message);
              return;
            }

            await loadPeople();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>People</Text>
      <Text style={styles.subtitle}>Manage the care profiles in your household.</Text>

      <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddPerson')}>
        <Ionicons name="add" size={20} color={theme.colors.surface} />
        <Text style={styles.addButtonText}>Add person</Text>
      </Pressable>

      {isLoading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}
      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={40} color={theme.colors.secondary} />
              <Text style={styles.emptyTitle}>No care profiles yet</Text>
              <Text style={styles.emptyText}>
                Tap "Add person" to create a care profile for a family member.
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const initial = item.display_name.charAt(0).toUpperCase();
          const isLinked = item.linked_user_id !== null;
          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.display_name}</Text>
                  {item.label ? <Text style={styles.cardLabel}>{item.label}</Text> : null}
                  {isLinked ? (
                    <View style={styles.linkedBadge}>
                      <Ionicons name="person-circle-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.linkedBadgeText}>Linked account</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('EditPerson', { careProfileId: item.id })}
                  hitSlop={8}
                >
                  <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  addButton: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  loader: {
    marginVertical: theme.spacing.md,
  },
  errorText: {
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.label,
    color: theme.colors.error,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: theme.typography.section,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkedBadgeText: {
    fontSize: theme.typography.small,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
