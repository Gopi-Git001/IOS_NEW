import { AtSign, LogOut, Trash2, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { demoAlert, Group, listStyles, Row, Sheet } from '../components/ListUI';
import { verdictColor } from '../components/VerdictPanel';
import { confirmAction, notify } from '../lib/confirm';
import { deleteAccountAndData, saveDisplayName, signOut, type Stats, syncProfile, syncStats, useProfile } from '../lib/account';
import { initials, percent } from '../lib/display';
import { isConfigured } from '../lib/supabase';
import { brand, colors, fonts, frost } from '../theme';

type Props = { visible: boolean; onClose: () => void; email?: string };

/** The person screen: name, Google email, stats, sign out and delete account. */
export function ProfileScreen({ visible, onClose, email }: Props) {
  const { displayName, stats } = useProfile();

  // Fresh name, settings and stats each time the screen opens; the local copy shows meanwhile.
  useEffect(() => {
    if (!visible) return;
    syncProfile();
    syncStats();
  }, [visible]);

  return (
    <Sheet visible={visible} title="Profile" onBack={onClose} backLabel="Close profile">
      {/* iOS: the name editor's Save/Cancel stay above the keyboard on a 375x667 screen (insets shrink back on close, no jump). */}
      <ScrollView
        contentContainerStyle={listStyles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <NameCard displayName={displayName} />

        <Group title="Account">
          <Row
            icon={AtSign}
            label="Google account"
            value={!isConfigured ? 'Demo mode' : email && !isTestEmail(email) ? email : 'Test session'}
            onPress={isConfigured ? undefined : demoAlert}
          />
        </Group>

        <Group title="My stats">
          <StatsCard stats={stats} />
        </Group>

        <Group title="Session">
          <Row icon={LogOut} label="Sign out" onPress={confirmSignOut} />
          <Row icon={Trash2} label="Delete account" danger onPress={confirmDelete} />
        </Group>
      </ScrollView>
    </Sheet>
  );
}

/** Guest and old phone sessions use hidden placeholder emails; never show those. */
const isTestEmail = (email: string) => /@(guest|phone)\.sugarhunter\.app$/.test(email);

// ---------- Name ----------

function NameCard({ displayName }: { displayName: string | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const letters = initials(displayName);

  const start = () => {
    if (!isConfigured) return demoAlert();
    setDraft(displayName ?? '');
    setEditing(true);
  };
  const save = async () => {
    // Keyboard "done" and the Save button can both fire; save once.
    if (saving) return;
    setSaving(true);
    try {
      await saveDisplayName(draft);
      setEditing(false);
    } catch (e) {
      notify('Not saved', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.nameCard}>
      <View style={styles.avatar} accessibilityLabel={displayName ? `Profile picture, ${displayName}` : 'Profile picture'}>
        {letters ? <Text style={styles.avatarText}>{letters}</Text> : <User size={32} color={colors.onInk} strokeWidth={2} />}
      </View>

      {editing ? (
        <View style={styles.editor}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={40}
            placeholder="Your name"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            autoComplete="name"
            returnKeyType="done"
            onSubmitEditing={save}
            style={styles.input}
            accessibilityLabel="Display name"
          />
          <View style={styles.editorButtons}>
            <Pressable onPress={() => setEditing(false)} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} style={styles.primaryButton} accessibilityRole="button">
              {saving ? <ActivityIndicator color={colors.onInk} /> : <Text style={styles.primaryButtonText}>Save</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.name, !displayName && styles.namePlaceholder]}>{displayName ?? 'No name yet'}</Text>
          <Pressable onPress={start} hitSlop={8} accessibilityRole="button">
            <Text style={styles.editLink}>Edit name</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ---------- Stats ----------

function StatsCard({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <View style={styles.statsCard}>
        <ActivityIndicator color={colors.inkMuted} />
      </View>
    );
  }
  const parts = [
    { label: 'CLEAN', count: stats.clean, color: verdictColor.CLEAN },
    { label: 'OKAY', count: stats.okay, color: verdictColor.OKAY },
    { label: 'BAD', count: stats.bad, color: verdictColor.BAD },
  ] as const;

  return (
    <View style={styles.statsCard}>
      <Text style={styles.total}>
        {stats.total} <Text style={styles.totalLabel}>{stats.total === 1 ? 'scan' : 'scans'}</Text>
      </Text>
      {stats.total > 0 ? (
        <>
          <View style={styles.bar}>
            {parts.map((p) => (p.count > 0 ? <View key={p.label} style={{ flex: p.count, backgroundColor: p.color }} /> : null))}
          </View>
          <View style={styles.legend}>
            {parts.map((p) => (
              <View key={p.label} style={styles.legendItem} accessible accessibilityLabel={`${p.label} ${percent(p.count, stats.total)} percent`}>
                <Text style={[styles.legendPercent, { color: p.color }]}>{percent(p.count, stats.total)}%</Text>
                <Text style={styles.legendLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.noScans}>Scan a label to start your stats.</Text>
      )}
    </View>
  );
}

// ---------- Sign out / delete ----------

export function confirmSignOut() {
  if (!isConfigured) return demoAlert();
  confirmAction('Sign out?', 'You can sign back in with Google.', 'Sign out', () => {
    signOut().catch(() => notify('Sign out failed', 'Try again.'));
  });
}

function confirmDelete() {
  if (!isConfigured) return demoAlert();
  confirmAction(
    'Delete account?',
    `This permanently deletes your ${brand.name} account and all of your scan history. It cannot be undone.`,
    'Delete',
    () => {
      // Failure keeps the account and everything on this phone (accountDeletion.ts).
      deleteAccountAndData().catch((e: unknown) =>
        notify('Delete failed', e instanceof Error && e.message ? e.message : 'Could not delete account. Try again.'),
      );
    },
    true,
  );
}

const styles = StyleSheet.create({
  nameCard: { backgroundColor: colors.paperRaised, ...frost(24), borderRadius: 20, padding: 20, marginTop: 12, alignItems: 'center', gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontFamily: fonts.black, fontSize: 28, letterSpacing: -1, color: colors.onInk },
  name: { fontFamily: fonts.black, fontSize: 24, letterSpacing: -0.6, color: colors.ink },
  namePlaceholder: { color: colors.inkMuted },
  editLink: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  editor: { alignSelf: 'stretch', gap: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.rule,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  editorButtons: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.ink },
  secondaryButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  primaryButton: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,246,251,0.92)' },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onInk },
  statsCard: { padding: 16, gap: 12, minHeight: 52, justifyContent: 'center' },
  total: { fontFamily: fonts.black, fontSize: 32, letterSpacing: -1, color: colors.ink },
  totalLabel: { fontFamily: fonts.serif, fontSize: 18, letterSpacing: 0, color: colors.inkMuted },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row' },
  legendItem: { flex: 1 },
  legendPercent: { fontFamily: fonts.black, fontSize: 20, letterSpacing: -0.5 },
  legendLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, color: colors.inkMuted, marginTop: 2 },
  noScans: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkMuted },
});
