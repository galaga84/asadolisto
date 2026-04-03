import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeMobileAdsIfSupported } from "../lib/mobile-ads";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("../node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_600SemiBold: require("../node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("../node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
    Newsreader_600SemiBold: require("../node_modules/@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf"),
    Newsreader_700Bold: require("../node_modules/@expo-google-fonts/newsreader/700Bold/Newsreader_700Bold.ttf")
  });

  useEffect(() => {
    void initializeMobileAdsIfSupported();
  }, []);

  return (
    <SafeAreaProvider>
      {!fontsLoaded && !fontError ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#09A1A1" size="small" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCF9F8"
  }
});
