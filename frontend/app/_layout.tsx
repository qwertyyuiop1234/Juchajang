import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
// import { FavoritesProvider } from '../contexts/FavoritesContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';

// 스플래시 스크린이 자동으로 숨겨지지 않도록 설정
SplashScreen.preventAutoHideAsync();

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
      {/* <FavoritesProvider> */}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="parking-detail" options={{ headerShown: false }} />
          <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
        </Stack>
      {/* </FavoritesProvider> */}
    </UserProfileProvider>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 네이티브 스플래시를 즉시 숨김
        await SplashScreen.hideAsync();
        // 커스텀 스플래시 표시 시간
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 표시
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a2744' }}>
        <Image 
          source={require('../assets/images/splash_combined.png')} 
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
