import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogoBadge } from "../components/AppLogoBadge";

export default function LandingScreen() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    pulseAnimation.start();

    const timer = setTimeout(() => {
      router.replace("/(tabs)/inicio");
    }, 1800);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
      pulse.stopAnimation();
    };
  }, [pulse, router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1]
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.035]
                  })
                }
              ]
            }
          ]}
        >
          <AppLogoBadge size={68} />

          <Text style={styles.brandTitle}>
            <Text style={styles.brandTitleAccent}>Asado</Text>Listo
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF7ED"
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFF7ED",
    gap: 28
  },
  logoWrap: {
    alignItems: "center",
    gap: 18
  },
  brandTitle: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: "Newsreader_700Bold",
    color: "#18181B",
    textAlign: "center"
  },
  brandTitleAccent: {
    color: "#09A1A1"
  }
});
