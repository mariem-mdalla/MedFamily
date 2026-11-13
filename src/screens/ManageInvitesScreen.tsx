import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CareProfile, Invite } from '../types/database';

type InviteWithProfile = Invite & { care_profile_display_name?: string };

const EXPIRY_OPTIONS: { label: string; hours: number }[] = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
];

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function ManageInvitesScreen() {
  const { profile, session } = useAuth();
  const [invites, setInvites] = useState<InviteWithProfile[]>([]);
  const [careProfiles, setCareProfiles] = useState<CareProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const hasLoadedRef = useRef(false);

  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [selectedCareProfileId, setSelectedCareProfileId] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [singleUse, setSingleUse] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  async function loadData(silent = false) {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setMessage('');

    const [invitesResult, cpResult] = await Promise.all([
      supabase
        .from('invites')
        .select('id, family_id, code, role, care_profile_id, created_by, expires_at, single_use, used_at, used_by, created_at')
        .eq('family_id', profile.family_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('care_profiles')
        .select('id, family_id, display_name, label, color, linked_user_id')
        .eq('family_id', profile.family_id)
        .order('display_name'),
    ]);

    setIsLoading(false);

    if (invitesResult.error) {
      setMessage(invitesResult.error.message);
      return;
    }

    const profilesMap = new Map<string, string>();
    const profiles = (cpResult.data as CareProfile[]) ?? [];
    setCareProfiles(profiles);
    for (const cp of profiles) {
      profilesMap.set(cp.id, cp.display_name);
    }

    if (!selectedCareProfileId && profiles.length > 0) {
      setSelectedCareProfileId(profiles[0].id);
    }

    const enriched: InviteWithProfile[] = ((invitesResult.data as Invite[]) ?? []).map((inv) => ({
      ...inv,
      care_profile_display_name: inv.care_profile_id ? profilesMap.get(inv.care_profile_id) : undefined,
    }));

    setInvites(enriched);
  }

  useFocusEffect(
    useCallback(() => {
      const isInitial = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadData(!isInitial);
    }, [profile?.family_id]),
  );

  async function handleCreate() {
    if (!profile || !session) {
      return;
    }

    setCreateError('');
    setCreatedCode('');

    if (role === 'member' && !selectedCareProfileId) {
      setCreateError('Select the care profile this member will be linked to.');
      return;
    }

    setIsCreating(true);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('invites').insert({
      family_id: profile.family_id,
      code,
      role,
      care_profile_id: role === 'member' ? selectedCareProfileId : null,
      created_by: session.user.id,
      expires_at: expiresAt,
      single_use: singleUse,
    });

    setIsCreating(false);

    if (error) {
      setCreateError(error.message);
      return;
    }

    setCreatedCode(code);
    await loadData(true);
  }

  function handleDelete(invite: InviteWithProfile) {
    Alert.alert('Delete invite', `Delete code "${invite.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('invites')
            .delete()
            .eq('id', invite.id)
            .eq('family_id', profile?.family_id ?? '');
          if (error) {
            setMessage(error.message);
            return;
          }
          await loadData(true);
        },
      },
    ]);
  }

  function isExpired(invite: InviteWithProfile): boolean {
    return new Date(invite.expires_at) < new Date();
  }

  function isUsed(invite: InviteWithProfile): boolean {
    return invite.used_at !== null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create invite code</Text>

        <Text style={styles.fieldLabel}>Role</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleChip, role === 'member' ? styles.roleChipSelected : null]}
            onPress={() => setRole('member')}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={role === 'member' ? theme.colors.surface : theme.colors.primary}
            />
            <Text style={[styles.roleChipText, role === 'member' ? styles.roleChipTextSelected : null]}>
              Member
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleChip, role === 'admin' ? styles.roleChipSelected : null]}
            onPress={() => setRole('admin')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={role === 'admin' ? theme.colors.surface : theme.colors.primary}
            />
            <Text style={[styles.roleChipText, role === 'admin' ? styles.roleChipTextSelected : null]}>
              Admin (helper)
            </Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          {role === 'member'
            ? 'Members see only their own doses and cannot edit medicines.'
            : 'Admins (helpers) can manage all medicines and care profiles.'}
        </Text>

        {role === 'member' ? (
          <>
            <Text style={styles.fieldLabel}>Care profile to link</Text>
            <View style={styles.chipRow}>
              {careProfiles.map((cp) => {
                const isSelected = selectedCareProfileId === cp.id;
                const initial = cp.display_name.charAt(0).toUpperCase();
                return (
                  <Pressable
                    key={cp.id}
                    style={[styles.personChip, isSelected ? styles.personChipSelected : null]}
                    onPress={() => setSelectedCareProfileId(cp.id)}
                  >
                    <View style={[styles.chipAvatar, { backgroundColor: cp.color }]}>
                      <Text style={styles.chipAvatarText}>{initial}</Text>
                    </View>
                    <Text style={[styles.chipName, isSelected ? styles.chipNameSelected : null]}>
                      {cp.display_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helperText}>
              The invited member will be linked to this care profile.
            </Text>
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Expires after</Text>
        <View style={styles.chipRow}>
          {EXPIRY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.hours}
              style={[styles.expiryChip, expiryHours === opt.hours ? styles.expiryChipSelected : null]}
              onPress={() => setExpiryHours(opt.hours)}
            >
              <Text style={[styles.expiryChipText, expiryHours === opt.hours ? styles.expiryChipTextSelected : null]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.fieldLabel}>Single use</Text>
            <Text style={styles.helperText}>The code can only be used once.</Text>
          </View>
          <Switch
            value={singleUse}
            onValueChange={setSingleUse}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {createError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{createError}</Text>
          </View>
        ) : null}

        {createdCode ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
            <View style={styles.successContent}>
              <Text style={styles.successLabel}>New invite code:</Text>
              <Text style={styles.codeText}>{createdCode}</Text>
              <Text style={styles.successSubtext}>Share this code with the person you want to invite.</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.surface} />
          <Text style={styles.buttonText}>{isCreating ? 'Creating…' : 'Create invite code'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active invites</Text>

        {isLoading ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {message ? <Text style={styles.errorFeedback}>{message}</Text> : null}

        {!isLoading && invites.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ticket-outline" size={32} color={theme.colors.secondary} />
            <Text style={styles.emptyText}>No invite codes yet.</Text>
          </View>
        ) : null}

        {invites.map((invite) => {
          const expired = isExpired(invite);
          const used = isUsed(invite);
          const statusLabel = used ? 'Used' : expired ? 'Expired' : 'Active';
          const statusColor = used || expired ? theme.colors.textMuted : theme.colors.primary;
          return (
            <View key={invite.id} style={[styles.inviteCard, (used || expired) ? styles.inviteCardDim : null]}>
              <View style={styles.inviteTop}>
                <Text style={styles.inviteCode}>{invite.code}</Text>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(invite)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </Pressable>
              </View>
              <View style={styles.inviteMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{invite.role === 'admin' ? 'Admin' : 'Member'}</Text>
                </View>
                {invite.care_profile_display_name ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>{invite.care_profile_display_name}</Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </Text>
                </View>
                {invite.single_use ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="key-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>Single use</Text>
                  </View>
                ) : null}
                <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.section,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  helperText: {
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: 6,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
  },
  roleChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleChipText: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  roleChipTextSelected: {
    color: theme.colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: 6,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  personChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EDF5F2',
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  chipName: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  chipNameSelected: {
    color: theme.colors.primary,
  },
  expiryChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  expiryChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  expiryChipText: {
    fontSize: theme.typography.label,
    fontWeight: '600',
    color: theme.colors.text,
  },
  expiryChipTextSelected: {
    color: theme.colors.surface,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  switchLabel: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF0EF',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.label,
    color: theme.colors.error,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EDF5F2',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  successContent: {
    flex: 1,
    gap: 4,
  },
  successLabel: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  successSubtext: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  button: {
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  loader: {
    marginVertical: theme.spacing.md,
  },
  errorFeedback: {
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.label,
    color: theme.colors.error,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.label,
    color: theme.colors.textMuted,
  },
  inviteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  inviteCardDim: {
    opacity: 0.6,
  },
  inviteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inviteMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
});
