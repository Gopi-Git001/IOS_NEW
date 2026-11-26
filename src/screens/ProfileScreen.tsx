import { LogOut, Trash2, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { demoAlert, Group, listStyles, Row, Sheet } from '../components/ListUI';
import { confirmAction, notify } from '../lib/confirm';
import { deleteAccountAndData, saveDisplayName, signOut, type Stats, syncProfile, syncStats, useProfile } from '../lib/account';
import { initials, percent } from '../lib/display';
import { isConfigured } from '../lib/supabase';
import { brand, fonts, mint } from '../theme';

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
      <ScrollView contentContainerStyle={listStyles.content} keyboardShouldPersistTaps="handled">
        <NameCard displayName={displayName} />

        <Group title="Account">
          <AccountRow
            text={!isConfigured ? 'Demo mode' : email && !isTestEmail(email) ? email : 'Test session'}
            signedIn={isConfigured && !!email && !isTestEmail(email)}
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

/** The account card: just the signed-in email (or Demo mode / Test session), one line, left-aligned like the other rows. */
function AccountRow({ text, signedIn, onPress }: { text: string; signedIn: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={signedIn ? `Signed in as ${text}` : text}
      style={({ pressed }) => [listStyles.row, pressed && listStyles.rowPressed]}
    >
      <Text style={styles.accountText} numberOfLines={1} ellipsizeMode="middle">
        {text}
      </Text>
    </Pressable>
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
        {letters ? <Text style={styles.avatarText}>{letters}</Text> : <User size={32} color={mint.onInk} strokeWidth={2} />}
      </View>

      {editing ? (
        <View style={styles.editor}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={40}
            placeholder="Your name"
            placeholderTextColor={mint.muted}
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
              {saving ? <ActivityIndicator color={mint.onInk} /> : <Text style={styles.primaryButtonText}>Save</Text>}
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
        <ActivityIndicator color={mint.muted} />
      </View>
    );
  }
  const parts = [
    { label: 'CLEAN', count: stats.clean, color: mint.CLEAN.tint, ink: mint.CLEAN.deep },
    { label: 'OKAY', count: stats.okay, color: mint.OKAY.tint, ink: mint.OKAY.deep },
    { label: 'BAD', count: stats.bad, color: mint.BAD.tint, ink: mint.BAD.deep },
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
                <Text style={[styles.legendPercent, { color: p.ink }]}>{percent(p.count, stats.total)}%</Text>
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
      deleteAccountAndData().catch((e: Error) => notify('Delete failed', e.message));
    },
    true,
  );
}

const styles = StyleSheet.create({
  accountText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: mint.ink },
  nameCard: { backgroundColor: mint.surface, borderWidth: 1, borderColor: mint.border, borderRadius: 20, padding: 20, marginTop: 12, alignItems: 'center', gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: mint.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontFamily: fonts.black, fontSize: 28, letterSpacing: -1, color: mint.onInk },
  name: { fontFamily: fonts.black, fontSize: 24, letterSpacing: -0.6, color: mint.ink },
  namePlaceholder: { color: mint.muted },
  editLink: { fontFamily: fonts.bold, fontSize: 15, color: mint.ink, textDecorationLine: 'underline' },
  editor: { alignSelf: 'stretch', gap: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: mint.paper,
    borderWidth: 1,
    borderColor: mint.border,
    color: mint.ink,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  editorButtons: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: mint.ink },
  secondaryButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: mint.ink },
  primaryButton: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: mint.ink },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 15, color: mint.onInk },
  statsCard: { padding: 16, gap: 12, minHeight: 52, justifyContent: 'center' },
  total: { fontFamily: fonts.black, fontSize: 32, letterSpacing: -1, color: mint.ink },
  totalLabel: { fontFamily: fonts.serif, fontSize: 18, letterSpacing: 0, color: mint.muted },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row' },
  legendItem: { flex: 1 },
  legendPercent: { fontFamily: fonts.black, fontSize: 20, letterSpacing: -0.5 },
  legendLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, color: mint.muted, marginTop: 2 },
  noScans: { fontFamily: fonts.regular, fontSize: 14, color: mint.muted },
});
