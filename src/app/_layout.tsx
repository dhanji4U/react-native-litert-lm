import "../../global.css";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as FileSystem from 'expo-file-system/legacy';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { emiEngine } from '@/services/EmiEngine';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const bgColor = colorScheme === 'dark' ? '#000000' : '#ffffff';
    SystemUI.setBackgroundColorAsync(bgColor).catch(() => {
      // Keep layout functional even if system UI control is unavailable.
    });

    const checkModel = async () => {
      const targetUri = `${FileSystem.documentDirectory}gemma.litertlm`;
      const fileInfo = await FileSystem.getInfoAsync(targetUri);

      if (!fileInfo.exists) {
        setNeedsSetup(true);
        setIsReady(true);
      } else {
        try {
          await emiEngine.initModel(targetUri.replace('file://', ''));
        } catch (e) {
          console.error("Failed to init model", e);
        }
        setIsReady(true);
      }
    };

    checkModel();
  }, [colorScheme]);

  useEffect(() => {
    if (isReady && needsSetup) {
      // Ensure layout is mounted by waiting a tiny tick
      requestAnimationFrame(() => {
        router.replace('/setup');
      });
    }
  }, [isReady, needsSetup, router]);

  // Keep Stack mounted so navigation context exists
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="light" />
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
