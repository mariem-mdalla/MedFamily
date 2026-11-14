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
import { useTranslation } from '../i18n';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';
import { CareProfile } from '../types/database';

export default function PeopleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const { t, isRTL } = useTranslation();
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
    if (person.linked_user_id) {
      Alert.alert(t.cannotDelete, t.cannotDeleteLinked);
      return;
    }

    Alert.alert(
      t.removePerson,
      t.removePersonConfirm(person.display_name),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.remove,
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
      <Text style={[styles.title, isRTL && styles.textRTL]}>{t.people}</Text>
      <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t.peopleSubtitle}</Text>

      <Pressable
        style={[styles.addButton, isRTL && styles.rowRTL]}
        onPress={() => navigation.navigate('AddPerson')}
      >
        <Ionicons name="add" size={20} color={theme.colors.surface} />
        <Text style={styles.addButtonText}>{t.addPerson}</Text>
      </Pressable>

      {isLoading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}
      {message ? <Text style={[styles.errorText, isRTL && styles.textRTL]}>{message}</Text> : null}

      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={40} color={theme.colors.secondary} />
              <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t.noPeople}</Text>
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t.noPeopleSubtitle}
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const initial = item.display_name.charAt(0).toUpperCase();
          const isLinked = item.linked_user_id !== null;
          return (
            <View style={[styles.card, isRTL && styles.rowRTL]}>
              <View style={[styles.cardLeft, isRTL && styles.rowRTL]}>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, isRTL && styles.textRTL]}>{item.display_name}</Text>
                  {item.label ? <Text style={[styles.cardLabel, isRTL && styles.textRTL]}>{item.label}</Text> : null}
                  {isLinked ? (
                    <View style={[styles.linkedBadge, isRTL && styles.rowRTL]}>
                      <Ionicons name="person-circle-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.linkedBadgeText}>{t.linkedAccount}</Text>
                    </View>
                  ) : null}
                  {isLinked ? (
                    <Text style={[styles.linkedExplanation, isRTL && styles.textRTL]}>
                      {t.cannotDeleteLinked}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={[styles.cardActions, isRTL && styles.rowRTL]}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('EditPerson', { careProfileId: item.id })}
                  hitSlop={8}
                >
                  <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                </Pressable>
                {isLinked ? (
                  <Pressable
                    style={[styles.iconBtn, styles.iconBtnDisabled]}
                    onPress={() => Alert.alert(t.cannotDelete, t.cannotDeleteLinked)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.border} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </Pressable>
                )}
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
  linkedExplanation: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
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
  iconBtnDisabled: {
    opacity: 0.45,
    backgroundColor: theme.colors.surface,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});
