import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";

type AppLogoBadgeProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogoBadge({ size = 68, style }: AppLogoBadgeProps) {
  return (
    <Image
      source={require("../assets/splash-icon.png")}
      style={[
        styles.image,
        style,
        {
          width: size,
          height: size
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "contain"
  }
});
