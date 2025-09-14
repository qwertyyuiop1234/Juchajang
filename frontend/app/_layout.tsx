import { Stack } from 'expo-router';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <FavoritesProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="parking-detail" options={{ headerShown: false }} />
            <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
          </Stack>
        </FavoritesProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
