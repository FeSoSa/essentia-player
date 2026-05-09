import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar, setStatusBarHidden } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

function hideStatusBar() {
  setStatusBarHidden(true, 'none');
  if (Platform.OS === 'android') {
    StatusBar.setHidden(true, 'none');
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
  }
}

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    SystemUI.setBackgroundColorAsync('#09090b');
    hideStatusBar();
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ExpoStatusBar hidden translucent style="light" />
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Garante que cada tela não reseta a status bar
            contentStyle: { backgroundColor: '#09090b' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="game" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
