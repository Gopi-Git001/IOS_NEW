// Cross-platform dialogs. React Native's Alert.alert does nothing on web, so buttons that
// relied on it (sign out, delete account, clear history) silently failed in the browser build.
import { Alert, Platform } from 'react-native';

/** Asks a yes/no question and runs `onConfirm` if the user agrees. */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Shows a simple message. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
