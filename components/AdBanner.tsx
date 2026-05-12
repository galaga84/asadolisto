import { useEffect, useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { getBannerAdUnitId, getMobileAdsModule, supportsNativeAds } from "../lib/mobile-ads";

type AdBannerProps = {
  label?: string;
};

export function AdBanner({ label = "Publicidad" }: AdBannerProps) {
  const adsModule = useMemo(() => getMobileAdsModule(), []);
  const isFocused = useIsFocused();
  const [frameWidth, setFrameWidth] = useState(0);
  const [adHeight, setAdHeight] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const unitId = getBannerAdUnitId();
  const bannerSizes = adsModule ? [adsModule.BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER, adsModule.BannerAdSize.BANNER] : [];
  const hasExhaustedAttempts = bannerSizes.length > 0 && loadAttempt >= bannerSizes.length;

  useEffect(() => {
    if (!isFocused || frameWidth <= 0 || !adsModule || !unitId) {
      return;
    }

    setLoadAttempt(0);
    setErrorMessage(null);
    setAdHeight(0);
  }, [adsModule, frameWidth, isFocused, unitId]);

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const nextWidth = Math.floor(nativeEvent.layout.width);

    if (nextWidth > 0 && nextWidth !== frameWidth) {
      setFrameWidth(nextWidth);
    }
  };

  if (!supportsNativeAds) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.bannerPreview}>
          <Text style={styles.previewTitle}>Vista previa del banner</Text>
          <Text style={styles.previewText}>En web y Expo Go solo mostramos esta maqueta. El anuncio real se ve en la APK.</Text>
        </View>
      </View>
    );
  }

  if (!adsModule || !unitId) {
    return null;
  }

  const { BannerAd } = adsModule;
  const activeBannerSize = bannerSizes[Math.min(loadAttempt, bannerSizes.length - 1)];

  if (hasExhaustedAttempts) {
    if (!__DEV__) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.bannerPreview}>
          <Text style={styles.previewTitle}>Anuncio no disponible por ahora</Text>
          <Text style={styles.previewText}>
            El banner no cargo todavia. Si la unidad es nueva o la app sigue en revision en AdMob, esto puede pasar durante las primeras horas o dias.
          </Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.bannerFrame, adHeight > 0 && { minHeight: adHeight }]} onLayout={handleLayout}>
        {frameWidth > 0 && isFocused ? (
          <BannerAd
            key={`${unitId}-${frameWidth}-${activeBannerSize}-${loadAttempt}`}
            unitId={unitId}
            size={activeBannerSize}
            width={frameWidth}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={(dimensions) => {
              setAdHeight(dimensions.height);
              setErrorMessage(null);
            }}
            onAdFailedToLoad={(error) => {
              const nextMessage = error.message?.trim() || "No pudimos cargar el anuncio.";

              console.warn(`[AdMob] Banner failed to load (${activeBannerSize})`, error);
              setAdHeight(0);
              setErrorMessage(nextMessage);
              setLoadAttempt((currentAttempt) => currentAttempt + 1);
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF"
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#09A1A1",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  bannerFrame: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F0E8"
  },
  bannerPreview: {
    minHeight: 110,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#30525C",
    textAlign: "center"
  },
  previewText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#5B5563",
    textAlign: "center"
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "#7C2D12",
    textAlign: "center"
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#5B5563"
  }
});
