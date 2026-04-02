import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { getActiveAsado, type SavedAsado } from "../../lib/asado-store";

type PlanItem = {
  id: string;
  moment: string;
  timeLabel: string;
  title: string;
  text: string;
  stage: string;
};

type PlanningMode = "rapido" | "junto";
type TipCategory = "fuego" | "carne";
type MeatPlanStage = "Coccion larga" | "Coccion media" | "Salida rapida" | "Acompanamientos";
type MeatPlanEntry = {
  minutes: number;
  stage: MeatPlanStage;
  searMinutes?: number;
  searPhase?: "initial" | "final";
};

const meatPlan = {
  Costillar: { minutes: 70, stage: "Coccion larga" },
  "Pulpa de cerdo": { minutes: 50, stage: "Coccion larga" },
  Sobrecostilla: { minutes: 36, stage: "Coccion larga" },
  Huachalomo: { minutes: 32, stage: "Coccion larga" },
  "Asado carnicero": { minutes: 24, stage: "Coccion media", searMinutes: 8, searPhase: "initial" },
  "Lomo vetado de cerdo": { minutes: 26, stage: "Coccion media" },
  Trutro: { minutes: 28, stage: "Coccion media" },
  "Tuto deshuesado": { minutes: 20, stage: "Coccion media" },
  Alitas: { minutes: 22, stage: "Coccion media" },
  Chuleta: { minutes: 16, stage: "Coccion media" },
  Pechuga: { minutes: 16, stage: "Coccion media" },
  Longaniza: { minutes: 15, stage: "Salida rapida" },
  Chorizo: { minutes: 14, stage: "Salida rapida" },
  Prietas: { minutes: 10, stage: "Salida rapida" },
  "Lomo vetado": { minutes: 20, stage: "Coccion media", searMinutes: 6, searPhase: "initial" },
  "Lomo liso": { minutes: 20, stage: "Coccion media", searMinutes: 6, searPhase: "initial" },
  "Punta picana": { minutes: 24, stage: "Coccion media", searMinutes: 6, searPhase: "initial" },
  Choclo: { minutes: 18, stage: "Acompanamientos" },
  Papa: { minutes: 30, stage: "Acompanamientos" },
  Cebolla: { minutes: 16, stage: "Acompanamientos" },
  Pimentón: { minutes: 18, stage: "Acompanamientos" },
  "Zapallo italiano": { minutes: 10, stage: "Acompanamientos" },
  Champiñones: { minutes: 8, stage: "Acompanamientos" }
} as const satisfies Record<string, MeatPlanEntry>;

type PlannedMeat = keyof typeof meatPlan;

const stageOrder: readonly MeatPlanStage[] = ["Coccion larga", "Coccion media", "Salida rapida", "Acompanamientos"];
const hasMeatPlan = (meat: string): meat is PlannedMeat => meat in meatPlan;
const getMeatPlan = (meat: PlannedMeat): MeatPlanEntry => meatPlan[meat] as MeatPlanEntry;
const fireTips = [
  {
    id: "brasas",
    category: "fuego" as const,
    title: "Parte con brasas, no con llama",
    text: "No pongas la carne cuando el carbón todavía esté tirando llama viva. Espera a que haya brasas rojas y una capa gris encima para tener un calor más parejo."
  },
  {
    id: "temperatura",
    category: "fuego" as const,
    title: "Arma dos zonas de calor",
    text: "Deja una mitad con brasas fuertes y otra más suave. Así puedes sellar en un lado y terminar de cocinar o mantener caliente en el otro sin apurar todo."
  },
  {
    id: "ritmo",
    category: "fuego" as const,
    title: "Alimenta el fuego de a poco",
    text: "No tires mucho carbón de una sola vez porque te cambia el calor y llenas de humo la parrilla. Anda sumando brasas chicas al costado y las corres cuando haga falta."
  },
  {
    id: "sal",
    category: "carne" as const,
    title: "Sala con criterio",
    text: "En piezas grandes puedes salar antes sin problema. En cortes más chicos, sala justo antes o durante la parrilla para no pasarte y mantener buen color."
  },
  {
    id: "pinchar",
    category: "carne" as const,
    title: "No la pinches a cada rato",
    text: "Usa pinzas o espátula cuando puedas. Si pinchas todo el tiempo, la carne pierde jugo y se seca más fácil, sobre todo en pollo y cortes delgados."
  },
  {
    id: "reposo",
    category: "carne" as const,
    title: "Deja reposar antes de cortar",
    text: "En cortes grandes, deja 5 a 10 minutos de reposo fuera del fuego antes de cortar. Ese descanso ayuda a que el jugo se acomode y no se vaya al tiro a la tabla."
  }
] as const;

const stageOffsets = {
  Fuego: 0,
  "Coccion larga": 20,
  "Coccion media": 45,
  "Salida rapida": 65,
  Acompanamientos: 75,
  Servicio: 95
} as const;

const TIP_CARD_WIDTH = 260;
const TIP_GAP = 14;
const TIP_SNAP_INTERVAL = TIP_CARD_WIDTH + TIP_GAP;

const parseTimeValue = (value: string) => {
  if (!value || !value.includes(":")) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const formatShiftedTime = (baseMinutes: number | null, offset: number) => {
  if (baseMinutes === null) {
    return "Hora pendiente";
  }

  const shifted = baseMinutes + offset;
  const normalized = ((shifted % 1440) + 1440) % 1440;
  const hours = `${Math.floor(normalized / 60)}`.padStart(2, "0");
  const minutes = `${normalized % 60}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

function ChevronLeftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="m15 18-6-6 6-6" stroke="#30525C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="m9 18 6-6-6-6" stroke="#30525C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function FuegoScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const tipsScrollRef = useRef<ScrollView>(null);
  const tipScrollX = useRef(new Animated.Value(0)).current;
  const [latestAsado, setLatestAsado] = useState<SavedAsado | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("rapido");
  const [tipCategory, setTipCategory] = useState<TipCategory>("fuego");

  const loadLatestAsado = useCallback(async () => {
    setLoading(true);
    try {
      const active = await getActiveAsado();
      setLatestAsado(active);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLatestAsado();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [loadLatestAsado])
  );

  const planItems = useMemo(() => {
    if (!latestAsado) {
      return [] as PlanItem[];
    }

    const startMinutes = parseTimeValue(latestAsado.time);

    if (planningMode === "rapido") {
      const sortedMeats = latestAsado.meats
        .filter(hasMeatPlan)
        .map((meat) => ({
          meat,
          plan: getMeatPlan(meat)
        }))
        .sort((a, b) => a.plan.minutes - b.plan.minutes);

      const steps: PlanItem[] = [
        {
          id: "fire",
          moment: "Primero",
          timeLabel: formatShiftedTime(startMinutes, stageOffsets.Fuego),
          title: "Inicia el fuego",
          text: "Parte con tiempo, arma una buena base de brasas y espera a que el fuego se asiente antes de empezar a poner los cortes.",
          stage: "Fuego"
        }
      ];

      sortedMeats.forEach((entry, index) => {
        const offset = 20 + index * 8;
        const moment =
          index === 0
            ? "Primer corte a la parrilla"
            : index === sortedMeats.length - 1
              ? "Ultima tanda"
              : "Siguiente tanda";

        if (entry.plan.searMinutes && entry.plan.searPhase === "initial") {
          steps.push({
            id: `quick-sear-${entry.meat}`,
            moment: "Sellado",
            timeLabel: formatShiftedTime(startMinutes, offset),
            title: `Sella ${entry.meat}`,
            text: `Parte sellando ${entry.meat} por unos ${entry.plan.searMinutes} min totales para afirmar color y jugo antes de dejarlo seguir a fuego medio.`,
            stage: "Sellado"
          });
        }

        steps.push({
          id: `quick-${entry.meat}`,
          moment,
          timeLabel: formatShiftedTime(startMinutes, offset + (entry.plan.searPhase === "initial" ? entry.plan.searMinutes ?? 0 : 0)),
          title: entry.meat,
          text: `Pon ${entry.meat} a la parrilla y considera unos ${entry.plan.minutes} min de cocción total, ajustando según grosor y fuerza del fuego.`,
          stage: entry.plan.stage
        });
      });

      steps.push({
        id: "serve",
        moment: "Cierre",
        timeLabel: formatShiftedTime(startMinutes, 20 + sortedMeats.length * 8 + 12),
        title: "Servicio por tandas",
        text: "Con este plan irás sacando primero lo más rápido. Sirve a medida que salga cada corte y deja lo largo trabajando atrás.",
        stage: "Servicio"
      });

      return steps;
    }

    const grouped = new Map<MeatPlanStage, { title: MeatPlanStage; minutes: number; items: string[]; initialSearMinutes: number; initialSearItems: string[] }>();

    latestAsado.meats.forEach((meat) => {
      if (!hasMeatPlan(meat)) {
        return;
      }

      const plan = getMeatPlan(meat);

      const existing = grouped.get(plan.stage);

      if (existing) {
        existing.items.push(meat);
        existing.minutes = Math.max(existing.minutes, plan.minutes);
        if (plan.searPhase === "initial" && plan.searMinutes) {
          existing.initialSearMinutes = Math.max(existing.initialSearMinutes, plan.searMinutes);
          existing.initialSearItems.push(meat);
        }
        return;
      }

      grouped.set(plan.stage, {
        title: plan.stage,
        minutes: plan.minutes,
        items: [meat],
        initialSearMinutes: plan.searPhase === "initial" ? plan.searMinutes ?? 0 : 0,
        initialSearItems: plan.searPhase === "initial" && plan.searMinutes ? [meat] : []
      });
    });

    const steps: PlanItem[] = [
      {
        id: "fire",
        moment: "Primero",
        timeLabel: formatShiftedTime(startMinutes, stageOffsets.Fuego),
        title: "Inicia el fuego",
        text: "Parte con tiempo, arma una buena base de brasas y espera a que el fuego se asiente antes de llenar la parrilla.",
        stage: "Fuego"
      }
    ];

    stageOrder.forEach((stage) => {
      const group = grouped.get(stage);

      if (!group) {
        return;
      }

      const meatsLabel = group.items.join(", ");
      const moment =
        stage === "Coccion larga"
          ? "Cuando tengas brasas firmes"
          : stage === "Coccion media"
            ? "Después de los cortes largos"
            : stage === "Salida rapida"
              ? "Cuando el asado ya agarró ritmo"
              : "Para acompañar el cierre";

      if (group.initialSearMinutes > 0 && group.initialSearItems.length > 0) {
        steps.push({
          id: `${stage}-sear-initial`,
          moment: "Sellado",
          timeLabel: formatShiftedTime(startMinutes, Math.max(stageOffsets[stage] - group.initialSearMinutes, 10)),
          title: `Sella ${group.initialSearItems.join(", ")}`,
          text: `Antes de la cocción principal, dales un sellado inicial de unos ${group.initialSearMinutes} min totales para agarrar color y partir con una buena base.`,
          stage: "Sellado"
        });
      }

      steps.push({
        id: stage,
        moment,
        timeLabel: formatShiftedTime(startMinutes, stageOffsets[stage]),
        title: stage,
        text: `Pon ${meatsLabel}. Considera alrededor de ${group.minutes} min totales para esta tanda y anda moviendo según el fuego.`,
        stage
      });
    });

    steps.push({
      id: "serve",
      moment: "Cierre",
      timeLabel: formatShiftedTime(startMinutes, stageOffsets.Servicio),
      title: "Última vuelta y servicio",
      text: "Deja reposar los cortes más grandes unos minutos, saca lo que salga rápido al final y sirve por tandas para que todo llegue calentito.",
      stage: "Servicio"
    });

    return steps;
  }, [latestAsado, planningMode]);

  const filteredTips = useMemo(() => fireTips.filter((tip) => tip.category === tipCategory), [tipCategory]);

  const goToTip = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(filteredTips.length - 1, nextIndex));
    setActiveTipIndex(clampedIndex);
    tipsScrollRef.current?.scrollTo({ x: clampedIndex * TIP_SNAP_INTERVAL, animated: true });
  };

  useEffect(() => {
    setActiveTipIndex(0);
    requestAnimationFrame(() => {
      tipsScrollRef.current?.scrollTo({ x: 0, animated: false });
      tipScrollX.setValue(0);
    });
  }, [tipCategory, tipScrollX]);

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Parrilla</Text>
        <Text style={styles.text}>Aquí te dejamos un orden sugerido para prender la parrilla y tirar cada corte en su momento.</Text>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color="#09A1A1" />
        </View>
      ) : !latestAsado ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Todavía no hay un asado para planificar</Text>
          <Text style={styles.emptyText}>Guarda un asado y aquí te armamos el orden para prender el fuego y manejar la parrilla.</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Asado activo</Text>
            <Text style={styles.heroTitle}>{latestAsado.name}</Text>
            <Text style={styles.heroMeta}>{`${latestAsado.date} - ${latestAsado.time}`}</Text>
            <Text style={styles.heroMeta}>{latestAsado.location}</Text>
          </View>

          <View style={styles.modeSection}>
            <Text style={styles.modeTitle}>¿Cómo quieres organizar la salida?</Text>
            <View style={styles.modeOptions}>
              <Pressable
                style={[styles.modeBadge, planningMode === "rapido" && styles.modeBadgeActive]}
                onPress={() => setPlanningMode("rapido")}
              >
                <Text style={[styles.modeBadgeText, planningMode === "rapido" && styles.modeBadgeTextActive]}>Sale primero lo rápido</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBadge, planningMode === "junto" && styles.modeBadgeActive]}
                onPress={() => setPlanningMode("junto")}
              >
                <Text style={[styles.modeBadgeText, planningMode === "junto" && styles.modeBadgeTextActive]}>Sale todo junto</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Ojo con la pieza y el grosor</Text>
            <Text style={styles.noteText}>
              Toma estos tiempos como una guía para partir con tranquilidad. En la parrilla influyen harto el tamaño de
              la pieza, el grosor del corte y la fuerza del fuego, así que si ves que un trozo viene más delgado o más
              grueso de lo normal, ajusta sin miedo y anda mirando cómo responde la carne.
            </Text>
          </View>

          <View style={styles.timeline}>
            {planItems.map((item, index) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < planItems.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineMoment}>{item.moment}</Text>
                  </View>
                  <Text style={styles.timelineTime}>{item.timeLabel}</Text>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Tips</Text>
            <View style={styles.tipCategoryRow}>
              <Pressable style={[styles.tipCategoryBadge, tipCategory === "fuego" && styles.tipCategoryBadgeActive]} onPress={() => setTipCategory("fuego")}>
                <Text style={[styles.tipCategoryText, tipCategory === "fuego" && styles.tipCategoryTextActive]}>Para el fuego</Text>
              </Pressable>
              <Pressable style={[styles.tipCategoryBadge, tipCategory === "carne" && styles.tipCategoryBadgeActive]} onPress={() => setTipCategory("carne")}>
                <Text style={[styles.tipCategoryText, tipCategory === "carne" && styles.tipCategoryTextActive]}>Para la carne</Text>
              </Pressable>
            </View>
            <View style={styles.tipsWrap}>
              <Pressable style={[styles.tipArrow, styles.tipArrowLeft, activeTipIndex === 0 && styles.tipArrowDisabled]} onPress={() => goToTip(activeTipIndex - 1)}>
                <ChevronLeftIcon />
              </Pressable>

              <Animated.ScrollView
                ref={tipsScrollRef}
                horizontal
                pagingEnabled={false}
                snapToInterval={TIP_SNAP_INTERVAL}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tipsCarousel}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: tipScrollX } } }], {
                  useNativeDriver: false,
                  listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / TIP_SNAP_INTERVAL);
                    const clampedIndex = Math.max(0, Math.min(filteredTips.length - 1, nextIndex));
                    setActiveTipIndex((current) => (current === clampedIndex ? current : clampedIndex));
                  }
                })}
              >
                {filteredTips.map((tip) => (
                  <View key={tip.id} style={styles.tipCard}>
                    <Text style={styles.tipCardTitle}>{tip.title}</Text>
                    <Text style={styles.tipCardText}>{tip.text}</Text>
                  </View>
                ))}
              </Animated.ScrollView>

              <Pressable
                style={[styles.tipArrow, styles.tipArrowRight, activeTipIndex === filteredTips.length - 1 && styles.tipArrowDisabled]}
                onPress={() => goToTip(activeTipIndex + 1)}
              >
                <ChevronRightIcon />
              </Pressable>
            </View>

            <View style={styles.tipDots}>
              {filteredTips.map((tip, index) => {
                const inputRange = [(index - 1) * TIP_SNAP_INTERVAL, index * TIP_SNAP_INTERVAL, (index + 1) * TIP_SNAP_INTERVAL];

                return (
                  <Animated.View
                    key={tip.id}
                    style={[
                      styles.tipDot,
                      {
                        width: tipScrollX.interpolate({
                          inputRange,
                          outputRange: [8, 22, 8],
                          extrapolate: "clamp"
                        }),
                        opacity: tipScrollX.interpolate({
                          inputRange,
                          outputRange: [0.45, 1, 0.45],
                          extrapolate: "clamp"
                        }),
                        transform: [
                          {
                            scale: tipScrollX.interpolate({
                              inputRange,
                              outputRange: [1, 1.06, 1],
                              extrapolate: "clamp"
                            })
                          }
                        ]
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </>
      )}
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
    gap: 24
  },
  header: {
    gap: 10
  },
  title: {
    fontSize: 34,
    fontFamily: "Newsreader_700Bold",
    color: "#18181B"
  },
  text: {
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#5B5563"
  },
  heroCard: {
    gap: 6,
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#09A1A1"
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#D1FFFE",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  heroMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#E8FFFF"
  },
  modeSection: {
    gap: 12
  },
  modeTitle: {
    fontSize: 18,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  modeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  modeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#09A1A1"
  },
  modeBadgeActive: {
    backgroundColor: "#30525C",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  modeBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  modeBadgeTextActive: {
    color: "#FFFFFF"
  },
  noteCard: {
    gap: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#09A1A1"
  },
  noteTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE"
  },
  timeline: {
    gap: 0
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14
  },
  timelineRail: {
    width: 20,
    alignItems: "center"
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#09A1A1",
    marginTop: 24
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#ACC0D3",
    marginTop: 8,
    marginBottom: -8
  },
  timelineCard: {
    flex: 1,
    gap: 8,
    padding: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#09A1A1"
  },
  timelineHeader: {
    gap: 6
  },
  timelineMoment: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#D1FFFE",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#30525C",
    alignSelf: "flex-start"
  },
  timelineTitle: {
    fontSize: 20,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  timelineText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE"
  },
  tipsSection: {
    gap: 14
  },
  tipCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  tipCategoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#09A1A1"
  },
  tipCategoryBadgeActive: {
    backgroundColor: "#30525C",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  tipCategoryText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  tipCategoryTextActive: {
    color: "#FFFFFF"
  },
  tipsWrap: {
    position: "relative"
  },
  tipsTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  tipsCarousel: {
    gap: TIP_GAP,
    paddingHorizontal: 18
  },
  tipCard: {
    width: TIP_CARD_WIDTH,
    minHeight: 170,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#09A1A1",
    borderWidth: 0,
    justifyContent: "space-between"
  },
  tipCardTitle: {
    fontSize: 20,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  tipCardText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE"
  },
  tipArrow: {
    position: "absolute",
    top: "50%",
    zIndex: 2,
    width: 36,
    height: 36,
    marginTop: -18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 251, 248, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(172, 192, 211, 0.45)"
  },
  tipArrowLeft: {
    left: 0
  },
  tipArrowRight: {
    right: 0
  },
  tipArrowDisabled: {
    opacity: 0.45
  },
  tipDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#30525C"
  },
  emptyCard: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#09A1A1"
  },
  emptyTitle: {
    maxWidth: 300,
    fontSize: 24,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center"
  },
  emptyText: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE",
    textAlign: "center"
  }
});
