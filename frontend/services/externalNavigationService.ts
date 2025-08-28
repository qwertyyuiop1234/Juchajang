import { Linking, Platform, Alert } from 'react-native';

export interface NavigationAppOptions {
  name: string;
  displayName: string;
  icon: string;
  isAvailable?: boolean;
}

export interface NavigationDestination {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
}

export const NAVIGATION_APPS: NavigationAppOptions[] = [
  {
    name: 'naver',
    displayName: '네이버 맵',
    icon: 'navigate',
  },
  {
    name: 'tmap',
    displayName: '티맵',
    icon: 'car',
  },
  {
    name: 'kakao',
    displayName: '카카오맵',
    icon: 'location',
  },
];

class ExternalNavigationService {
  private getNaverMapUrl(destination: NavigationDestination): string {
    const { latitude, longitude, name } = destination;
    
    console.log('네이버 맵 URL 생성:', { latitude, longitude, name });
    
    // 네이버 맵 - 자동으로 네비게이션 시작 (현재 위치에서 목적지까지)
    const url = `nmap://navigation?dlat=${latitude}&dlng=${longitude}&dname=${encodeURIComponent(name)}&appname=${encodeURIComponent('주차장앱')}&menu=navigation`;
    
    console.log('생성된 네이버맵 URL:', url);
    return url;
  }

  private getTMapUrl(destination: NavigationDestination): string {
    const { latitude, longitude, name } = destination;
    
    console.log('티맵 URL 생성:', { latitude, longitude, name });
    
    // 티맵 - 자동으로 네비게이션 시작 (rGoName으로 목적지명 설정, rGoX/rGoY로 좌표 설정)
    const url = `tmap://viewmap?name=${encodeURIComponent(name)}&lon=${longitude}&lat=${latitude}&rGoName=${encodeURIComponent(name)}&rGoX=${longitude}&rGoY=${latitude}`;
    console.log('생성된 티맵 URL:', url);
    
    return url;
  }

  private getKakaoMapUrl(destination: NavigationDestination): string {
    const { latitude, longitude, name } = destination;
    
    console.log('카카오맵 URL 생성:', { latitude, longitude, name });
    
    // 카카오맵 - 자동으로 길찾기 시작 (route로 네비게이션 바로 시작)
    const url = `kakaomap://route?ep=${latitude},${longitude}&by=CAR`;
    console.log('생성된 카카오맵 URL:', url);
    
    return url;
  }

  private getWebFallbackUrl(appName: string, destination: NavigationDestination): string {
    const { latitude, longitude, name } = destination;
    
    switch (appName) {
      case 'naver':
        return `https://map.naver.com/v5/directions/-/-/${latitude},${longitude},,${encodeURIComponent(name)}/car`;
      case 'tmap':
        return `https://tmap.life/route/car?goalLat=${latitude}&goalLng=${longitude}&goalName=${encodeURIComponent(name)}`;
      case 'kakao':
        return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`;
      default:
        return '';
    }
  }

  async checkAppAvailability(): Promise<NavigationAppOptions[]> {
    const availableApps: NavigationAppOptions[] = [];

    // 간단한 URL 스킴으로 앱 설치 여부 확인
    const appSchemes = {
      'naver': 'nmap://',
      'tmap': 'tmap://',
      'kakao': 'kakaomap://'
    };

    for (const app of NAVIGATION_APPS) {
      let isAvailable = false;
      
      try {
        const scheme = appSchemes[app.name as keyof typeof appSchemes];
        if (scheme) {
          isAvailable = await Linking.canOpenURL(scheme);
          console.log(`${app.name} (${scheme}) 설치 확인:`, isAvailable);
        }
      } catch (error) {
        console.log(`${app.name} app availability check failed:`, error);
        isAvailable = false;
      }

      availableApps.push({
        ...app,
        isAvailable
      });
    }

    console.log('앱 설치 확인 결과:', availableApps);
    return availableApps;
  }

  async navigateWithApp(appName: string, destination: NavigationDestination): Promise<boolean> {
    try {
      let url = '';
      
      switch (appName) {
        case 'naver':
          url = this.getNaverMapUrl(destination);
          break;
        case 'tmap':
          url = this.getTMapUrl(destination);
          break;
        case 'kakao':
          url = this.getKakaoMapUrl(destination);
          break;
        default:
          Alert.alert('오류', '지원하지 않는 네비게이션 앱입니다.');
          return false;
      }

      console.log(`Attempting to open ${appName} with URL:`, url);

      try {
        await Linking.openURL(url);
        return true;
      } catch (linkingError) {
        console.log(`${appName} 앱 실행 실패, 웹 버전으로 시도:`, linkingError);
        
        Alert.alert(
          `${NAVIGATION_APPS.find(app => app.name === appName)?.displayName} 앱 없음`,
          `${NAVIGATION_APPS.find(app => app.name === appName)?.displayName} 앱이 설치되어 있지 않습니다. 웹 브라우저로 길찾기를 시작하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '웹으로 열기',
              onPress: () => this.openWebFallback(appName, destination)
            }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error(`${appName} 네비게이션 실행 실패:`, error);
      Alert.alert('오류', `${appName} 네비게이션을 실행할 수 없습니다.`);
      return false;
    }
  }

  private async openWebFallback(appName: string, destination: NavigationDestination): Promise<boolean> {
    try {
      const webUrl = this.getWebFallbackUrl(appName, destination);
      
      if (webUrl) {
        const canOpen = await Linking.canOpenURL(webUrl);
        if (canOpen) {
          await Linking.openURL(webUrl);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`웹 버전 실행 실패:`, error);
      return false;
    }
  }

  async showNavigationOptions(destination: NavigationDestination): Promise<void> {
    // iOS에서 URL 스킴 쿼리 제한으로 인해 모든 앱을 표시하고 실행 시 확인하는 방식으로 변경
    const options = [
      ...NAVIGATION_APPS.map(app => ({
        text: app.displayName,
        onPress: () => this.navigateWithApp(app.name, destination)
      })),
      { text: '취소', style: 'cancel' as const }
    ];

    Alert.alert(
      '네비게이션 선택',
      '어떤 앱으로 길찾기를 하시겠습니까?',
      options
    );
  }

  async getQuickNavigationApp(): Promise<string | null> {
    const availableApps = await this.checkAppAvailability();
    const installedApps = availableApps.filter(app => app.isAvailable);
    
    const preferredOrder = ['naver', 'tmap', 'kakao'];
    
    for (const preferredApp of preferredOrder) {
      const app = installedApps.find(app => app.name === preferredApp);
      if (app) {
        return app.name;
      }
    }
    
    return installedApps.length > 0 ? installedApps[0].name : null;
  }
}

export const externalNavigationService = new ExternalNavigationService();
export default externalNavigationService;