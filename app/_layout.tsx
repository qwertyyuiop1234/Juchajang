import { Stack } from 'expo-router';
import { FavoritesProvider } from '../contexts/FavoritesContext';

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="parking-detail" options={{ headerShown: false }} />
        <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
      </Stack>
    </FavoritesProvider>
  );
}
