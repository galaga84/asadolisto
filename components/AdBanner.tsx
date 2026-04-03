import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { getBannerAdUnitId, getMobileAdsModule, supportsNativeAds } from "../lib/mobile-ads";

type AdBannerProps = {
  label?: string;
};

export function AdBanner({ label = "Publicidad" }: AdBannerProps) {
  const adsModule = useMemo(() => getMobileAdsModule(), []);
  const [hasFailed, setHasFailed] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);
  const [adHeight, setAdHeight] = useState(0);
  const unitId = getBannerAdUnitId();

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

  if (!adsModule || !unitId || hasFailed) {
    return null;
  }

  const { BannerAd, BannerAdSize } = adsModule;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.bannerFrame, adHeight > 0 && { minHeight: adHeight }]} onLayout={handleLayout}>
        {frameWidth > 0 ? (
          <BannerAd
            key={`${unitId}-${frameWidth}`}
            unitId={unitId}
            size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
            width={frameWidth}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={(dimensions) => setAdHeight(dimensions.height)}
            onAdFailedToLoad={() => setHasFailed(true)}
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
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#5B5563"
  }
});
