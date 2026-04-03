import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type MobileAdsModule = typeof import("react-native-google-mobile-ads");
type AdsConfig = {
  android?: {
    banner?: string;
  };
  ios?: {
    banner?: string;
  };
};

const adsConfig = (Constants.expoConfig?.extra?.ads ?? {}) as AdsConfig;

let mobileAdsModule: MobileAdsModule | null = null;
let initializePromise: Promise<void> | null = null;

export const supportsNativeAds =
  Platform.OS !== "web" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export const getMobileAdsModule = () => {
  if (!supportsNativeAds) {
    return null;
  }

  if (!mobileAdsModule) {
    mobileAdsModule = require("react-native-google-mobile-ads") as MobileAdsModule;
  }

  return mobileAdsModule;
};

export const getBannerAdUnitId = () => {
  const adsModule = getMobileAdsModule();

  if (!adsModule) {
    return null;
  }

  if (__DEV__) {
    return adsModule.TestIds.ADAPTIVE_BANNER;
  }

  return Platform.OS === "ios" ? adsConfig.ios?.banner ?? null : adsConfig.android?.banner ?? null;
};

export const initializeMobileAdsIfSupported = async () => {
  const adsModule = getMobileAdsModule();

  if (!adsModule) {
    return;
  }

  if (!initializePromise) {
    initializePromise = adsModule
      .default()
      .initialize()
      .then(() => undefined)
      .catch(() => undefined);
  }

  await initializePromise;
};
