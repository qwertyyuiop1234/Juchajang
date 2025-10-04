import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // 로그인하지 않았고 auth 화면이 아니면 auth로 이동
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // 로그인했고 auth 화면에 있으면 메인으로 이동
      router.replace('/(tabs)');
    }
  }, [user, segments, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
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
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
