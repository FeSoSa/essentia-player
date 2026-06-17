import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { setStatusBarHidden } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

async function enterImmersiveMode() {
  setStatusBarHidden(true, "fade");
  if (Platform.OS === "android") {
    await NavigationBar.setVisibilityAsync("hidden");
    await NavigationBar.setBehaviorAsync("overlay-swipe");
  }
}

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    SystemUI.setBackgroundColorAsync("#09090b");
    SplashScreen.hideAsync();
    enterImmersiveMode();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Delay needed: Android resets system UI after the app comes to foreground
        setTimeout(enterImmersiveMode, 300);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            statusBarHidden: true,
            contentStyle: { backgroundColor: "#09090b" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="game" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
