import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { AppLogoBadge } from "../../components/AppLogoBadge";

const cards = [
  {
    id: "calculo",
    title: "Arma tu cálculo",
    text: "Ingresa la cantidad de personas, elige las carnes, bebidas y preferencias de tus invitados, y obtén una estimación clara de lo que necesitas comprar."
  },
  {
    id: "fuego",
    title: "Prepara bien la parrilla",
    text: "Revisa cuánto carbón podrías necesitar, cómo encender el fuego de forma práctica y qué tiempos considerar para cocinar mejor cada corte."
  },
  {
    id: "consejos",
    title: "Tips para que salga mejor",
    text: "Encuentra recomendaciones simples para organizar el asado, manejar mejor la cocción y evitar errores comunes en la parrilla."
  }
];

function CalculatorBackgroundIcon() {
  return (
    <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={2} width={16} height={20} rx={2} stroke="#FFFFFF" strokeWidth={2} />
      <Line x1={8} x2={16} y1={6} y2={6} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Line x1={16} x2={16} y1={14} y2={18} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 10h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 10h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 10h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 14h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 14h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 18h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 18h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UtensilsBackgroundIcon() {
  return (
    <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 2v20" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LightbulbBackgroundIcon() {
  return (
    <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
      <Path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 18h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 22h4" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function InicioScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(18)).current;
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const sectionTranslateY = useRef(new Animated.Value(20)).current;
  const cardAnimations = useRef(
    cards.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(24)
    }))
  ).current;

  useEffect(() => {
    const cardTimings = cardAnimations.map((animation, index) =>
      Animated.parallel([
        Animated.timing(animation.opacity, {
          toValue: 1,
          duration: 260,
          delay: 220 + index * 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(animation.translateY, {
          toValue: 0,
          duration: 320,
          delay: 220 + index * 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ])
    );

    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(sectionOpacity, {
        toValue: 1,
        duration: 280,
        delay: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(sectionTranslateY, {
        toValue: 0,
        duration: 320,
        delay: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      ...cardTimings
    ]).start();
  }, [cardAnimations, heroOpacity, heroTranslateY, sectionOpacity, sectionTranslateY]);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [])
  );

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslateY }]
          }
        ]}
      >
        <AppLogoBadge size={68} style={styles.heroLogoBadge} />
        <Text style={styles.title}>
          Organiza tu <Text style={styles.titleAccent}>asado</Text> sin{"\n"}complicarte
        </Text>
        <Text style={styles.text}>
          Calcula de forma simple cuánto comprar de carne, bebidas y carbón según la gente que viene, sus preferencias y el tipo de asado que quieres armar. También encontrarás tiempos de cocción, una planificación clara para la parrilla y consejos prácticos para que todo salga mejor.
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/asados",
                params: { mode: "new", resetKey: `${Date.now()}` }
              })
            }
          >
            <Text style={styles.buttonText}>Organizar nuevo asado</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.push("/(tabs)/mis-asados")}>
            <Text style={styles.secondaryButtonText}>Ver asados anteriores</Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.section,
          {
            opacity: sectionOpacity,
            transform: [{ translateY: sectionTranslateY }]
          }
        ]}
      >
        <View style={styles.divider} />
        <View style={styles.cards}>
          {cards.map((card, index) => (
            <Animated.View
              key={card.title}
              style={[
                styles.card,
                {
                  opacity: cardAnimations[index].opacity,
                  transform: [{ translateY: cardAnimations[index].translateY }]
                }
              ]}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardText}>{card.text}</Text>
                </View>

                {card.id === "calculo" ? (
                  <View style={styles.cardDecoration}>
                    <CalculatorBackgroundIcon />
                  </View>
                ) : null}
                {card.id === "fuego" ? (
                  <View style={styles.cardDecoration}>
                    <UtensilsBackgroundIcon />
                  </View>
                ) : null}
                {card.id === "consejos" ? (
                  <View style={styles.cardDecoration}>
                    <LightbulbBackgroundIcon />
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FCF9F8"
  },
  container: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 40
  },
  content: {
    width: "100%",
    maxWidth: 360,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 50,
    fontFamily: "Newsreader_700Bold",
    color: "#18181B",
    marginBottom: 18,
    textAlign: "center",
    lineHeight: 64
  },
  titleAccent: {
    color: "#09A1A1"
  },
  heroLogoBadge: {
    marginBottom: 18
  },
  text: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
    color: "#5B5563",
    textAlign: "center",
    marginBottom: 24
  },
  actions: {
    width: "100%",
    alignItems: "center",
    gap: 12
  },
  button: {
    minHeight: 48,
    minWidth: 220,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#30525C"
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 220,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ACC0D3"
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  section: {
    width: "100%",
    maxWidth: 360,
    gap: 24,
    paddingBottom: 24
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#E4E2E1"
  },
  cards: {
    gap: 14
  },
  card: {
    minHeight: 248,
    borderRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#09A1A1",
    borderWidth: 0,
    position: "relative",
    overflow: "hidden"
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between"
  },
  cardDecoration: {
    minHeight: 72,
    alignSelf: "flex-end",
    marginTop: 18,
    marginRight: 6,
    marginBottom: 8,
    opacity: 0.2
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 26
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE"
  }
});
