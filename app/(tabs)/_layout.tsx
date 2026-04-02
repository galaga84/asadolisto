import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type TabIconProps = {
  focused: boolean;
  label: string;
  icon: "home" | "beef" | "flame" | "notebook";
};

type IconProps = {
  color: string;
};

function HomeIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BeefIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1-2.29 7.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M15 8.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FlameIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NotebookIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M2 6h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 10h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 14h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 18h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 2v20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AppIcon({ icon, color }: { icon: TabIconProps["icon"]; color: string }) {
  if (icon === "home") {
    return <HomeIcon color={color} />;
  }

  if (icon === "beef") {
    return <BeefIcon color={color} />;
  }

  if (icon === "flame") {
    return <FlameIcon color={color} />;
  }

  return <NotebookIcon color={color} />;
}

function TabIcon({ focused, label, icon }: TabIconProps) {
  const tint = focused ? "#09A1A1" : "#8C939A";

  return (
    <View style={styles.tabItem}>
      <AppIcon icon={icon} color={tint} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 220
          }
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            backgroundColor: "#FCF9F8",
            paddingTop: insets.top,
            opacity: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.97, 1, 0.97]
            }),
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-18, 0, 18]
                })
              }
            ]
          }
        }),
        tabBarStyle: [
          styles.tabBar,
          {
            height: 88 + insets.bottom,
            paddingBottom: 8 + insets.bottom
          }
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Inicio" icon="home" />
        }}
      />
      <Tabs.Screen
        name="asados"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Planificar" icon="beef" />
        }}
      />
      <Tabs.Screen
        name="fuego"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Parrilla" icon="flame" />
        }}
      />
      <Tabs.Screen
        name="mis-asados"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Mis asados" icon="notebook" />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 88,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FCF9F8",
    borderTopWidth: 0
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0
  },
  tabBarIcon: {
    width: "100%",
    height: 56,
    marginTop: 0,
    marginBottom: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: 72,
    alignSelf: "center"
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#8C939A",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  tabLabelActive: {
    color: "#09A1A1"
  }
});
