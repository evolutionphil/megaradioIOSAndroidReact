import { Redirect } from 'expo-router';

// Catches unmatched deep links (e.g. trackplayer://notification.click)
// and redirects to the home screen
export default function NotFound() {
  return <Redirect href="/(tabs)" />;
}
