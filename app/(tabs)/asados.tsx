import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AdBanner } from "../../components/AdBanner";
import { DateTimeField } from "../../components/DateTimeField";
import { getSavedAsadoById, saveAsado, setActiveAsadoId, type SavedShoppingGroup } from "../../lib/asado-store";

const totalSteps = 5;

const stepContent = [
  {
    title: "Ponle nombre a tu asado",
    text: "Define cuándo será, a qué hora y dónde lo harás para dejarlo guardado y encontrarlo después en Mis asados."
  },
  {
    title: "¿Quiénes vienen al asado?",
    text: "Cuéntanos cuántas personas se suman para calcular mejor la carne, las bebidas y el carbón que vas a necesitar."
  },
  {
    title: "Elige los cortes favoritos",
    text: "Selecciona las carnes que quieres incluir en el asado y arma una combinación a tu gusto. Con esto podremos calcular mejor las cantidades y los tiempos de cocción."
  },
  {
    title: "Elige las bebidas",
    text: "Selecciona lo que quieres incluir para calcular mejor cuánto comprar según el grupo y el tipo de asado."
  },
  {
    title: "Resultados",
    text: "Aquí verás la lista de compra estimada con lo seleccionado en los pasos anteriores."
  }
] as const;

const eventFields = [
  { key: "name", label: "Nombre del asado", placeholder: "Ej: Asado sábado con amigos" },
  { key: "date", label: "Cuándo será", placeholder: "Ej: 20/04/2026" },
  { key: "time", label: "Hora", placeholder: "Ej: 14:30" },
  { key: "location", label: "Dónde", placeholder: "Ej: Casa de Nico, Maipú" }
] as const;

const drinkCategories = [
  {
    title: "Sin alcohol",
    items: ["Bebidas", "Agua", "Jugos", "Energéticas"]
  },
  {
    title: "Con alcohol",
    items: ["Cerveza", "Vino", "Espumante", "Destilados", "Cócteles / mezclas"]
  },
  {
    title: "Destilados",
    items: ["Whisky", "Ron", "Vodka", "Pisco", "Gin"]
  },
  {
    title: "Para acompañar o mezclar",
    items: ["Hielo", "Limón", "Agua tónica", "Bebidas cola", "Jugo o mixer"]
  }
] as const;

const attendeeFields = [
  { key: "adultos", label: "Adultos" },
  { key: "ninos", label: "Niños/as" },
  { key: "vegetarianos", label: "Vegetarianos/as" },
  { key: "noAlcohol", label: "Adultos que no toman alcohol" },
  { key: "noVacuno", label: "No comen vacuno" },
  { key: "noCerdo", label: "No comen cerdo" },
  { key: "noPollo", label: "No comen pollo" }
] as const;

const meatCategories = [
  {
    title: "Vacuno",
    items: ["Lomo liso", "Lomo vetado", "Asado carnicero", "Sobrecostilla", "Punta picana", "Huachalomo"]
  },
  {
    title: "Cerdo",
    items: ["Costillar", "Chuleta", "Pulpa de cerdo", "Lomo vetado de cerdo"]
  },
  {
    title: "Pollo",
    items: ["Tuto deshuesado", "Trutro", "Alitas", "Pechuga"]
  },
  {
    title: "Embutidos",
    items: ["Longaniza", "Chorizo", "Prietas"]
  },
  {
    title: "Vegetales a la parrilla",
    items: ["Choclo", "Papa", "Cebolla", "Pimentón", "Zapallo italiano", "Champiñones"]
  }
] as const;

type FieldKey = (typeof attendeeFields)[number]["key"];
type MeatItem = (typeof meatCategories)[number]["items"][number];
type DrinkItem = (typeof drinkCategories)[number]["items"][number];
type EventFieldKey = (typeof eventFields)[number]["key"];
type ShoppingEntry = { label: string; amount: string };
type ShoppingGroup = { title: string; items: ShoppingEntry[] };

const attendeeCountKeys: FieldKey[] = ["adultos", "ninos"];
const preferenceKeys: FieldKey[] = ["vegetarianos", "noAlcohol", "noVacuno", "noCerdo", "noPollo"];
const allMeatItems = meatCategories.flatMap((category) => [...category.items]) as readonly MeatItem[];
const allDrinkItems = drinkCategories.flatMap((category) => [...category.items]) as readonly DrinkItem[];
const alcoholCategoryTitle = "Con alcohol" as const;
const spiritsCategoryTitle = "Destilados" as const;
const mixersCategoryTitle = "Para acompañar o mezclar" as const;
const isMeatItem = (value: string): value is MeatItem => allMeatItems.some((item) => item === value);
const isDrinkItem = (value: string): value is DrinkItem => allDrinkItems.some((item) => item === value);
const isAlcoholSelection = (item: DrinkItem) => item in alcoholItemWeights;
const isSpiritSelection = (item: DrinkItem) => item in spiritItemWeights;
const appetiteOptions = ["Poco", "Promedio", "Mucho"] as const;
const appetiteFactors = {
  Poco: 0.9,
  Promedio: 1,
  Mucho: 1.18
} as const;
const proteinCategoryWeights = {
  Vacuno: 1.2,
  Cerdo: 0.9,
  Pollo: 0.8,
  Embutidos: 0.45
} as const;
const alcoholItemWeights: Record<string, number> = {
  Cerveza: 1.4,
  Vino: 1.1,
  Espumante: 0.6,
  "Cócteles / mezclas": 0.9,
};
const alcoholItemMinimums: Record<string, number> = {
  Cerveza: 1,
  Vino: 0.75,
  Espumante: 0.75,
  "Cócteles / mezclas": 1,
};
const spiritItemWeights: Record<string, number> = {
  Whisky: 1,
  Ron: 1,
  Vodka: 1,
  Pisco: 1.2,
  Gin: 0.9
};
const spiritItemMinimums: Record<string, number> = {
  Whisky: 0.75,
  Ron: 0.75,
  Vodka: 0.75,
  Pisco: 0.75,
  Gin: 0.75
};

type AppetiteOption = (typeof appetiteOptions)[number];

const emptyEventDetails: Record<EventFieldKey, string> = {
  name: "",
  date: "",
  time: "",
  location: ""
};

const emptyValues: Record<FieldKey, number> = {
  adultos: 0,
  ninos: 0,
  vegetarianos: 0,
  noAlcohol: 0,
  noVacuno: 0,
  noCerdo: 0,
  noPollo: 0
};

const roundToOne = (value: number) => Math.round(value * 10) / 10;
const toKgLabel = (value: number) => `${roundToOne(value).toFixed(1)} kg`;
const toLiterLabel = (value: number) => `${roundToOne(value).toFixed(1)} L`;

const parseAmountValue = (amount: string) => {
  const match = amount.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|L|un)$/i);

  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: match[2]
  };
};

const formatAmountValue = (value: number, unit: string) => {
  if (unit === "un") {
    return `${Math.max(0, Math.round(value))} un`;
  }

  return `${Math.max(0, roundToOne(value)).toFixed(1)} ${unit}`;
};

const splitAmount = (total: number, count: number) => {
  if (total <= 0 || count <= 0) {
    return [] as number[];
  }

  const base = Math.floor((total / count) * 10) / 10;
  const values = Array.from({ length: count }, () => base);
  let remaining = roundToOne(total - base * count);
  let index = 0;

  while (remaining > 0 && index < values.length) {
    values[index] = roundToOne(values[index] + Math.min(0.1, remaining));
    remaining = roundToOne(remaining - 0.1);
    index += 1;
  }

  return values;
};

const distributeWeightedLiters = (
  total: number,
  items: string[],
  weights: Record<string, number>,
  minimums: Record<string, number> = {}
) => {
  if (total <= 0 || items.length === 0) {
    return [] as number[];
  }

  const itemWeights = items.map((item) => weights[item] ?? 1);
  const totalWeight = itemWeights.reduce((sum, value) => sum + value, 0);

  return items.map((item, index) => {
    const weightedValue = totalWeight > 0 ? total * (itemWeights[index] / totalWeight) : 0;
    const minimumValue = minimums[item] ?? 0;
    return roundToOne(Math.max(weightedValue, minimumValue));
  });
};

const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTimeInputValue = (value: Date) => {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

const parseAsadoDate = (value: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map(Number);

  if (parts.length === 3 && parts.every((part) => !Number.isNaN(part))) {
    const [first, second, third] = parts;
    const isIsoFormat = normalized.split("/")[0]?.length === 4;
    const year = isIsoFormat ? first : third;
    const month = second;
    const day = isIsoFormat ? third : first;
    return new Date(year, month - 1, day);
  }

  return null;
};

const buildEventDateTime = (dateValue: string, timeValue: string) => {
  const parsedDate = parseAsadoDate(dateValue);

  if (!parsedDate || !timeValue.includes(":")) {
    return null;
  }

  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), hours, minutes, 0, 0);
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

export default function AsadosScreen() {
  const router = useRouter();
  const { editId, mode, resetKey } = useLocalSearchParams<{ editId?: string; mode?: string; resetKey?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [eventDetails, setEventDetails] = useState<Record<EventFieldKey, string>>(emptyEventDetails);
  const [values, setValues] = useState<Record<FieldKey, number>>(emptyValues);
  const [preferenceModalVisible, setPreferenceModalVisible] = useState(false);
  const [eventDateTimeModalVisible, setEventDateTimeModalVisible] = useState(false);
  const [appetiteLevel, setAppetiteLevel] = useState<AppetiteOption | null>(null);
  const [selectedMeats, setSelectedMeats] = useState<MeatItem[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<DrinkItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAsadoId, setEditingAsadoId] = useState<string | null>(null);
  const [manualAdjustmentEnabled, setManualAdjustmentEnabled] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({});

  const resetPlanner = useCallback(() => {
    setCurrentStep(1);
    setEventDetails({ ...emptyEventDetails });
    setValues({ ...emptyValues });
    setPreferenceModalVisible(false);
    setEventDateTimeModalVisible(false);
    setAppetiteLevel(null);
    setSelectedMeats([]);
    setSelectedDrinks([]);
    setIsSaving(false);
    setEditingAsadoId(null);
    setManualAdjustmentEnabled(false);
    setManualAmounts({});
  }, []);

  const totalAttendees = values.adultos + values.ninos;
  const now = new Date();

  useEffect(() => {
    setValues((current) => {
      let hasChanges = false;
      const next = { ...current };
      let remainingSlots = totalAttendees;

      preferenceKeys.forEach((key) => {
        const clampedValue = Math.min(next[key], remainingSlots);

        if (next[key] !== clampedValue) {
          next[key] = clampedValue;
          hasChanges = true;
        }

        remainingSlots -= next[key];
      });

      return hasChanges ? next : current;
    });
  }, [totalAttendees]);

  const updateValue = (key: FieldKey, delta: number) => {
    if (attendeeCountKeys.includes(key)) {
      setValues((current) => ({
        ...current,
        [key]: Math.min(99, Math.max(0, current[key] + delta))
      }));

      return;
    }

    const usedPreferences = preferenceKeys.reduce((sum, preferenceKey) => sum + values[preferenceKey], 0);
    const availablePreferenceSlots = Math.max(0, totalAttendees - (usedPreferences - values[key]));
    const baseMaxValue = Math.min(99, availablePreferenceSlots);
    const maxValue = key === "noAlcohol" ? Math.min(baseMaxValue, values.adultos) : baseMaxValue;
    const nextValue = Math.min(maxValue, Math.max(0, values[key] + delta));

    if (delta > 0 && values[key] >= maxValue) {
      setPreferenceModalVisible(true);
      return;
    }

    setValues((current) => ({
      ...current,
      [key]: nextValue
    }));
  };

  const clearFields = (keys: FieldKey[]) => {
    setValues((current) => {
      const next = { ...current };

      keys.forEach((key) => {
        next[key] = 0;
      });

      return next;
    });
  };

  const asistentesResumen = attendeeFields.slice(0, 2).filter((field) => values[field.key] > 0);
  const preferenciasResumen = attendeeFields.slice(2).filter((field) => values[field.key] > 0);
  const selectedEventDate = parseAsadoDate(eventDetails.date);
  const currentDateMin = formatDateInputValue(now);
  const currentTimeMin =
    selectedEventDate &&
    selectedEventDate.getFullYear() === now.getFullYear() &&
    selectedEventDate.getMonth() === now.getMonth() &&
    selectedEventDate.getDate() === now.getDate()
      ? formatTimeInputValue(now)
      : undefined;
  const isEventDateTimeValid = (() => {
    const eventDateTime = buildEventDateTime(eventDetails.date, eventDetails.time);

    if (!eventDateTime) {
      return false;
    }

    return eventDateTime.getTime() >= now.getTime();
  })();
  const selectedMeatCategories = meatCategories
    .map((category) => ({
      title: category.title,
      items: category.items.filter((item) => selectedMeats.includes(item))
    }))
    .filter((category) => category.items.length > 0);
  const showSpiritsCategory = selectedDrinks.includes(spiritsCategoryTitle);
  const selectedDrinkCategories = drinkCategories
    .filter((category) => (category.title === spiritsCategoryTitle ? showSpiritsCategory : true))
    .map((category) => ({
      title: category.title,
      items: category.items.filter((item) => selectedDrinks.includes(item))
    }))
    .filter((category) => category.items.length > 0);
  const alcoholFreeAdults = Math.min(values.noAlcohol, values.adultos);
  const drinkingAdults = Math.max(values.adultos - alcoholFreeAdults, 0);
  const selectedAlcoholOptionCount = selectedDrinks.filter((item) => isAlcoholSelection(item) || isSpiritSelection(item)).length;
  const hasStepOneSummary = asistentesResumen.length > 0 || preferenciasResumen.length > 0 || appetiteLevel !== null;
  const hasEventDetails = eventFields.every((field) => eventDetails[field.key].trim().length > 0) && isEventDateTimeValid;
  const hasStepTwoSummary = selectedMeats.length > 0;
  const hasStepThreeSummary = selectedDrinks.length > 0;
  const canContinue =
    currentStep === 1
      ? hasEventDetails
      : currentStep === 2
        ? hasStepOneSummary
      : currentStep === 3
        ? hasStepTwoSummary
        : currentStep === 4
          ? hasStepThreeSummary
          : false;
  const currentStepContent = stepContent[currentStep - 1];

  const goToNextStep = () => {
    if (canContinue && currentStep < totalSteps) {
      setCurrentStep((step) => step + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  };

  const toggleMeatSelection = (item: MeatItem) => {
    setSelectedMeats((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));
  };

  const clearMeatCategory = (items: readonly MeatItem[]) => {
    setSelectedMeats((current) => current.filter((item) => !items.includes(item)));
  };

  const toggleDrinkSelection = (item: DrinkItem) => {
    setSelectedDrinks((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));
  };

  const clearDrinkCategory = (items: readonly DrinkItem[]) => {
    setSelectedDrinks((current) => current.filter((item) => !items.includes(item)));
  };

  const updateEventDetail = (key: EventFieldKey, value: string) => {
    setEventDetails((current) => {
      const next = {
        ...current,
        [key]: value
      };

      if (next.date && next.time) {
        const eventDateTime = buildEventDateTime(next.date, next.time);

        if (eventDateTime && eventDateTime.getTime() < now.getTime()) {
          setEventDateTimeModalVisible(true);

          if (key === "time") {
            return {
              ...current,
              time: ""
            };
          }

          return {
            ...current,
            date: value,
            time: ""
          };
        }
      }

      return next;
    });
  };

  const shoppingResults = useMemo(() => {
    const appetiteFactor = appetiteLevel ? appetiteFactors[appetiteLevel] : 1;
    const adults = values.adultos;
    const kids = values.ninos;
    const vegetarians = Math.min(values.vegetarianos, adults);
    const adultsEatingProtein = Math.max(adults - vegetarians, 0);
    const alcoholFreeAdults = Math.min(values.noAlcohol, adults);
    const drinkingAdults = Math.max(adults - alcoholFreeAdults, 0);
    const proteinBaseKg = adultsEatingProtein * 0.45 * appetiteFactor + kids * 0.3 * appetiteFactor;
    const selectedVegetables = selectedMeatCategories.find((category) => category.title === "Vegetales a la parrilla");
    const selectedProteinCategories = selectedMeatCategories.filter((category) => category.title !== "Vegetales a la parrilla");

    const proteinScores = selectedProteinCategories.map((category) => {
      if (category.title === "Vacuno") {
        return {
          title: category.title,
          score: Math.max(totalAttendees - vegetarians - values.noVacuno, 0) * proteinCategoryWeights.Vacuno,
          items: category.items
        };
      }

      if (category.title === "Cerdo") {
        return {
          title: category.title,
          score: Math.max(totalAttendees - vegetarians - values.noCerdo, 0) * proteinCategoryWeights.Cerdo,
          items: category.items
        };
      }

      if (category.title === "Pollo") {
        return {
          title: category.title,
          score: Math.max(totalAttendees - vegetarians - values.noPollo, 0) * proteinCategoryWeights.Pollo,
          items: category.items
        };
      }

      return {
        title: category.title,
        score: Math.max(totalAttendees - vegetarians, 0) * proteinCategoryWeights.Embutidos,
        items: category.items
      };
    });

    const totalProteinScore = proteinScores.reduce((sum, category) => sum + category.score, 0);
    const proteinEntries = proteinScores.flatMap((category) => {
      if (category.score <= 0 || totalProteinScore <= 0) {
        return [] as ShoppingEntry[];
      }

      const categoryKg = (proteinBaseKg * category.score) / totalProteinScore;
      const perItemValues = splitAmount(categoryKg, category.items.length);

      return category.items.map((item, index) => ({
        label: item,
        amount: toKgLabel(perItemValues[index] ?? 0)
      }));
    });

    const vegetablesKg = selectedVegetables
      ? vegetarians * 0.35 * appetiteFactor + Math.max(adultsEatingProtein + kids, 0) * 0.08 * appetiteFactor
      : 0;
    const vegetableValues = selectedVegetables ? splitAmount(vegetablesKg, selectedVegetables.items.length) : [];
    const vegetableEntries =
      selectedVegetables && vegetablesKg > 0
        ? selectedVegetables.items.map((item, index) => ({
            label: item,
            amount: toKgLabel(vegetableValues[index] ?? 0)
          }))
        : [];

    const totalParrillaKg = proteinBaseKg + vegetablesKg;
    const charcoalKg = totalParrillaKg > 0 ? Math.max(2, roundToOne(proteinBaseKg * 0.9 + vegetablesKg * 0.25)) : 0;

    const softDrinksSelected = selectedDrinkCategories.find((category) => category.title === "Sin alcohol");
    const alcoholSelected = selectedDrinkCategories.find((category) => category.title === alcoholCategoryTitle);
    const spiritsSelected = selectedDrinkCategories.find((category) => category.title === spiritsCategoryTitle);
    const mixersSelected = selectedDrinkCategories.find((category) => category.title === mixersCategoryTitle);

    const nonAlcoholAdults = alcoholFreeAdults;
    const softLiters = (kids * 0.8 + nonAlcoholAdults * 0.9 + drinkingAdults * 0.35) * appetiteFactor;
    const alcoholLiters = drinkingAdults * 1.2 * appetiteFactor;
    const spiritLiters = selectedDrinks.includes(spiritsCategoryTitle) ? alcoholLiters * 0.28 : 0;
    const directAlcoholLiters = Math.max(alcoholLiters - spiritLiters, 0);

    const softValues = softDrinksSelected ? splitAmount(softLiters, softDrinksSelected.items.length) : [];
    const nonAlcoholEntries =
      softDrinksSelected && softLiters > 0
        ? softDrinksSelected.items.map((item, index) => ({
            label: item,
            amount: toLiterLabel(softValues[index] ?? 0)
          }))
        : [];

    const alcoholDirectItems = alcoholSelected ? alcoholSelected.items.filter((item) => item !== spiritsCategoryTitle) : [];
    const alcoholValues = distributeWeightedLiters(directAlcoholLiters, alcoholDirectItems, alcoholItemWeights, alcoholItemMinimums);
    const alcoholEntries =
      alcoholSelected && directAlcoholLiters > 0
        ? alcoholDirectItems.map((item, index) => ({
            label: item,
            amount: toLiterLabel(alcoholValues[index] ?? 0)
          }))
        : [];

    const spiritValues = spiritsSelected
      ? distributeWeightedLiters(spiritLiters, spiritsSelected.items, spiritItemWeights, spiritItemMinimums)
      : [];
    const spiritsEntries =
      spiritsSelected && spiritLiters > 0
        ? spiritsSelected.items.map((item, index) => ({
            label: item,
            amount: toLiterLabel(spiritValues[index] ?? 0)
          }))
        : [];

    const liquidMixerItems = mixersSelected ? mixersSelected.items.filter((item) => item !== "Hielo" && item !== "Limón") : [];
    const mixerValues = splitAmount(Math.max(drinkingAdults * 0.35, 0), liquidMixerItems.length);
    const mixersEntries =
      mixersSelected && mixersSelected.items.length > 0
        ? mixersSelected.items.map((item) => {
            if (item === "Hielo") {
              return { label: item, amount: `${Math.max(2, Math.ceil(drinkingAdults * 0.2))} kg` };
            }

            if (item === "Limón") {
              return { label: item, amount: `${Math.max(2, Math.ceil(drinkingAdults * 0.5))} un` };
            }

            const itemIndex = liquidMixerItems.findIndex((entry) => entry === item);
            return { label: item, amount: itemIndex >= 0 ? toLiterLabel(mixerValues[itemIndex] ?? 0) : "0.0 L" };
          })
        : [];

    return {
      totalParrillaKg: roundToOne(totalParrillaKg),
      charcoalKg,
      softLiters: roundToOne(softLiters),
      alcoholLiters: roundToOne(alcoholLiters),
      proteinEntries,
      vegetableEntries,
      nonAlcoholEntries,
      alcoholEntries,
      spiritsEntries,
      mixersEntries
    };
  }, [appetiteLevel, selectedDrinkCategories, selectedDrinks, selectedMeatCategories, totalAttendees, values]);

  const hasAnyResults =
    shoppingResults.proteinEntries.length > 0 ||
    shoppingResults.vegetableEntries.length > 0 ||
    shoppingResults.nonAlcoholEntries.length > 0 ||
    shoppingResults.alcoholEntries.length > 0 ||
    shoppingResults.spiritsEntries.length > 0 ||
    shoppingResults.mixersEntries.length > 0;
  const alcoholSelectionWarning =
    drinkingAdults > 0 &&
    ((drinkingAdults <= 2 && selectedAlcoholOptionCount > 2) ||
      (drinkingAdults <= 4 && selectedAlcoholOptionCount > 3) ||
      (drinkingAdults <= 6 && selectedAlcoholOptionCount > 4))
      ? "Para la cantidad de adultos que toman, hay muchos tipos de alcohol seleccionados. Si quieres una compra mas realista, conviene priorizar menos opciones y subir la cantidad de esas mismas."
      : null;
  const baseShoppingGroups = useMemo(
    () =>
      [
        {
          title: "Carnes y parrilla",
          items: [...shoppingResults.proteinEntries, ...shoppingResults.vegetableEntries]
        },
        {
          title: "Bebidas",
          items: [...shoppingResults.nonAlcoholEntries, ...shoppingResults.alcoholEntries]
        },
        {
          title: "Destilados",
          items: shoppingResults.spiritsEntries
        },
        {
          title: "Acompanamientos",
          items: shoppingResults.mixersEntries
        }
      ].filter((group) => group.items.length > 0),
    [shoppingResults]
  );
  const effectiveShoppingGroups = useMemo(
    () =>
      baseShoppingGroups.map((group) => ({
        title: group.title,
        items: group.items.map((item) => ({
          ...item,
          amount: manualAmounts[`${group.title}-${item.label}`] ?? item.amount
        }))
      })),
    [baseShoppingGroups, manualAmounts]
  );

  const updateManualAmount = (groupTitle: string, item: ShoppingEntry, delta: number) => {
    const key = `${groupTitle}-${item.label}`;
    const currentAmount = manualAmounts[key] ?? item.amount;
    const parsed = parseAmountValue(currentAmount);

    if (!parsed) {
      return;
    }

    const step = parsed.unit === "un" ? 1 : 0.1;
    const nextValue = parsed.unit === "un" ? Math.max(0, parsed.value + delta) : Math.max(0, roundToOne(parsed.value + delta * step));
    const nextAmount = formatAmountValue(nextValue, parsed.unit);

    setManualAmounts((current) => ({
      ...current,
      [key]: nextAmount
    }));
  };

  const renderShoppingGroup = (group: ShoppingGroup) => (
    <View key={group.title} style={styles.summaryBlock}>
      <Text style={styles.summaryTitle}>{group.title}</Text>
      <View style={styles.shoppingList}>
        {group.items.map((item) => (
          <View key={`${group.title}-${item.label}`} style={styles.shoppingRow}>
            <Text style={styles.shoppingLabel}>{item.label}</Text>
            {manualAdjustmentEnabled ? (
              <View style={[styles.quantityControl, styles.stepFiveQuantityControl]}>
                <Pressable
                  style={[styles.quantityButton, styles.stepFiveQuantityButton]}
                  onPress={() => updateManualAmount(group.title, item, -1)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </Pressable>
                <View style={styles.quantityValueWrap}>
                  <Text style={[styles.quantityValueSmall, styles.stepFiveQuantityValueSmall]}>{item.amount}</Text>
                </View>
                <Pressable
                  style={[styles.quantityButton, styles.stepFiveQuantityButton]}
                  onPress={() => updateManualAmount(group.title, item, 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.shoppingAmount}>{item.amount}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const handleSaveAsado = async () => {
    if (!hasAnyResults || isSaving || !hasEventDetails) {
      return;
    }

    setIsSaving(true);

    try {
      const shoppingGroups: SavedShoppingGroup[] = effectiveShoppingGroups;

      await saveAsado({
        id: editingAsadoId ?? `${Date.now()}`,
        name: eventDetails.name.trim(),
        date: eventDetails.date.trim(),
        time: eventDetails.time.trim(),
        location: eventDetails.location.trim(),
        createdAt: new Date().toISOString(),
        appetiteLevel,
        attendees: {
          adultos: values.adultos,
          ninos: values.ninos
        },
        preferences: {
          vegetarianos: values.vegetarianos,
          noAlcohol: values.noAlcohol,
          noVacuno: values.noVacuno,
          noCerdo: values.noCerdo,
          noPollo: values.noPollo
        },
        meats: selectedMeats,
        drinks: selectedDrinks,
        totals: {
          totalAttendees,
          totalParrillaKg: shoppingResults.totalParrillaKg,
          charcoalKg: shoppingResults.charcoalKg,
          softLiters: shoppingResults.softLiters,
          alcoholLiters: shoppingResults.alcoholLiters
        },
        shoppingGroups
      });

      setEditingAsadoId(null);
      router.push("/(tabs)/fuego");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (mode === "new") {
      resetPlanner();
      return;
    }

    const normalizedEditId = typeof editId === "string" && editId.trim().length > 0 ? editId : null;

    if (!normalizedEditId) {
      return;
    }

    let active = true;

    const loadEditableAsado = async () => {
      await setActiveAsadoId(normalizedEditId);
      const saved = await getSavedAsadoById(normalizedEditId);

      if (!saved || !active) {
        return;
      }

      setEditingAsadoId(saved.id);
      setCurrentStep(1);
      setEventDetails({
        name: saved.name,
        date: saved.date,
        time: saved.time,
        location: saved.location
      });
      setValues({
        adultos: saved.attendees.adultos,
        ninos: saved.attendees.ninos,
        vegetarianos: saved.preferences.vegetarianos,
        noAlcohol: saved.preferences.noAlcohol,
        noVacuno: saved.preferences.noVacuno,
        noCerdo: saved.preferences.noCerdo,
        noPollo: saved.preferences.noPollo
      });
      setAppetiteLevel(saved.appetiteLevel as AppetiteOption | null);
      setSelectedMeats(saved.meats.filter(isMeatItem));
      setSelectedDrinks(saved.drinks.filter(isDrinkItem));
    };

    void loadEditableAsado();

    return () => {
      active = false;
    };
  }, [editId, mode, resetKey, resetPlanner]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [currentStep]);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [])
  );

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Modal
        transparent
        animationType="fade"
        visible={preferenceModalVisible}
        onRequestClose={() => setPreferenceModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>No caben más preferencias</Text>
            <Text style={styles.modalText}>
              La suma total de preferencias no puede superar la cantidad de asistentes que vienen al asado.
            </Text>
            <Pressable style={styles.modalButton} onPress={() => setPreferenceModalVisible(false)}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={eventDateTimeModalVisible}
        onRequestClose={() => setEventDateTimeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ese horario ya pasó</Text>
            <Text style={styles.modalText}>Elige una fecha u hora igual o posterior a la actual para seguir con ese asado.</Text>
            <Pressable style={styles.modalButton} onPress={() => setEventDateTimeModalVisible(false)}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
        </View>

        <Text style={styles.progressText}>{`Paso ${currentStep} de ${totalSteps}`}</Text>

        <View style={styles.progressActions}>
          {currentStep > 1 ? (
            <Pressable style={styles.progressButton} onPress={goToPreviousStep}>
              <ChevronLeftIcon />
            </Pressable>
          ) : (
            <View style={styles.progressButtonPlaceholder} />
          )}

          {currentStep < totalSteps ? (
            <Pressable style={styles.progressButton} onPress={goToNextStep}>
              <ChevronRightIcon />
            </Pressable>
          ) : (
            <View style={styles.progressButtonPlaceholder} />
          )}
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{currentStepContent.title}</Text>
        <Text style={styles.text}>{currentStepContent.text}</Text>
      </View>

      {currentStep === 1 ? (
        <>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Detalles</Text>

            <View style={styles.fieldList}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Nombre del asado</Text>
                <TextInput
                  value={eventDetails.name}
                  onChangeText={(value) => updateEventDetail("name", value)}
                  placeholder="Ej: Asado sábado con amigos"
                  placeholderTextColor="#A1A1AA"
                  style={styles.input}
                />
              </View>

              <DateTimeField
                label="Cuándo será"
                value={eventDetails.date}
                onChange={(value) => updateEventDetail("date", value)}
                placeholder="Elegir fecha"
                kind="date"
                min={currentDateMin}
                minimumDate={now}
              />

              <DateTimeField
                label="Hora"
                value={eventDetails.time}
                onChange={(value) => updateEventDetail("time", value)}
                placeholder="Elegir hora"
                kind="time"
                min={currentTimeMin}
                isValueAllowed={(value) => {
                  if (!eventDetails.date) {
                    return true;
                  }

                  const eventDateTime = buildEventDateTime(eventDetails.date, value);
                  return eventDateTime ? eventDateTime.getTime() >= now.getTime() : true;
                }}
                onInvalidValue={() => setEventDateTimeModalVisible(true)}
              />

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Dónde</Text>
                <TextInput
                  value={eventDetails.location}
                  onChangeText={(value) => updateEventDetail("location", value)}
                  placeholder="Ej: Casa de Nico, Maipú"
                  placeholderTextColor="#A1A1AA"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

        </>
      ) : currentStep === 2 ? (
        <>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Asistentes</Text>

            <View style={styles.fieldList}>
              {attendeeFields.slice(0, 2).map((field) => (
                <View key={field.key} style={styles.fieldRow}>
                  <View style={styles.fieldLabelWrap}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>

                  <View style={styles.fieldActionStack}>
                    <Pressable style={styles.inlineClearButton} onPress={() => clearFields([field.key])}>
                      <Text style={styles.inlineClearButtonText}>x</Text>
                    </Pressable>

                    <View style={styles.quantityControl}>
                      <Pressable style={styles.quantityButton} onPress={() => updateValue(field.key, -1)}>
                        <Text style={styles.quantityButtonText}>-</Text>
                      </Pressable>

                      <View style={styles.quantityValueWrap}>
                        <Text style={styles.quantityValue}>{values[field.key]}</Text>
                      </View>

                      <Pressable style={styles.quantityButton} onPress={() => updateValue(field.key, 1)}>
                        <Text style={styles.quantityButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Preferencias</Text>
              </View>

              {attendeeFields.slice(2).map((field) => (
                <View key={field.key} style={styles.fieldRow}>
                  <View style={styles.fieldLabelWrap}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>

                  <View style={styles.fieldActionStack}>
                    <Pressable style={styles.inlineClearButton} onPress={() => clearFields([field.key])}>
                      <Text style={styles.inlineClearButtonText}>x</Text>
                    </Pressable>

                    <View style={styles.quantityControl}>
                      <Pressable style={styles.quantityButton} onPress={() => updateValue(field.key, -1)}>
                        <Text style={styles.quantityButtonText}>-</Text>
                      </Pressable>

                      <View style={styles.quantityValueWrap}>
                        <Text style={styles.quantityValue}>{values[field.key]}</Text>
                      </View>

                      <Pressable style={styles.quantityButton} onPress={() => updateValue(field.key, 1)}>
                        <Text style={styles.quantityButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Nivel de apetito</Text>
              </View>

              <View style={styles.appetiteOptions}>
                {appetiteOptions.map((option) => {
                  const selected = appetiteLevel === option;

                  return (
                    <Pressable
                      key={option}
                      style={[styles.appetiteBadge, selected && styles.appetiteBadgeSelected]}
                      onPress={() => setAppetiteLevel(option)}
                    >
                      <Text style={[styles.appetiteBadgeText, selected && styles.appetiteBadgeTextSelected]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumen</Text>

            {asistentesResumen.length > 0 ? (
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>Asistentes</Text>
                <View style={styles.totalAttendeesBadge}>
                  <Text style={styles.totalAttendeesValue}>{totalAttendees}</Text>
                </View>
                <View style={styles.summaryBadges}>
                  {asistentesResumen.map((field) => (
                    <View key={field.key} style={[styles.summaryBadge, styles.stepTwoSummaryBadge]}>
                      <Text style={[styles.summaryBadgeText, styles.stepTwoSummaryBadgeText]}>{`${field.label}: ${values[field.key]}`}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {preferenciasResumen.length > 0 ? (
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>Preferencias</Text>
                <View style={styles.summaryBadges}>
                  {preferenciasResumen.map((field) => (
                    <View key={field.key} style={[styles.summaryBadge, styles.stepTwoSummaryBadge]}>
                      <Text style={[styles.summaryBadgeText, styles.stepTwoSummaryBadgeText]}>{`${field.label}: ${values[field.key]}`}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {appetiteLevel ? (
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>Nivel de apetito</Text>
                <View style={styles.summaryBadges}>
                  <View style={[styles.summaryBadge, styles.stepTwoSummaryBadge]}>
                    <Text style={[styles.summaryBadgeText, styles.stepTwoSummaryBadgeText]}>{appetiteLevel}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </>
      ) : currentStep === 3 ? (
        <>
          <View style={styles.meatSection}>
            {meatCategories.map((category) => (
              <View key={category.title} style={styles.meatCategoryBlock}>
                <View style={styles.sectionHeaderInline}>
                  <Text style={styles.sectionTitle}>{category.title}</Text>
                  <Pressable style={styles.inlineClearButton} onPress={() => clearMeatCategory(category.items)}>
                    <Text style={styles.inlineClearButtonText}>x</Text>
                  </Pressable>
                </View>
                <View style={styles.meatBadges}>
                  {category.items.map((item) => {
                    const selected = selectedMeats.includes(item);

                    return (
                      <Pressable
                        key={item}
                        style={[
                          styles.meatBadge,
                          styles.stepThreeOptionBadge,
                          selected && styles.meatBadgeSelected,
                          selected && styles.stepThreeOptionBadgeSelected
                        ]}
                        onPress={() => toggleMeatSelection(item)}
                      >
                        <Text
                          style={[
                            styles.meatBadgeText,
                            styles.stepThreeOptionBadgeText,
                            selected && styles.meatBadgeTextSelected,
                            selected && styles.stepThreeOptionBadgeTextSelected
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {hasStepTwoSummary ? (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Resumen</Text>
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>Cortes elegidos</Text>
                <View style={styles.summaryBadges}>
                  {selectedMeatCategories.map((category) => (
                    <View key={category.title} style={styles.summaryCategoryBlock}>
                      <Text style={styles.summaryCategoryTitle}>{category.title}</Text>
                      <View style={styles.summaryBadges}>
                        {category.items.map((item) => (
                          <View key={item} style={[styles.summaryBadge, styles.stepThreeSummaryBadge]}>
                            <Text style={[styles.summaryBadgeText, styles.stepThreeSummaryBadgeText]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              {alcoholSelectionWarning ? (
                <View style={[styles.noteCard, styles.stepFiveNoteCard]}>
                  <Text style={[styles.noteTitle, styles.stepFiveNoteTitle]}>Ojo con las opciones</Text>
                  <Text style={[styles.noteText, styles.stepFiveNoteText]}>{alcoholSelectionWarning}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : currentStep === 4 ? (
        <>
          <View style={styles.meatSection}>
            {drinkCategories
              .filter((category) => (category.title === "Destilados" ? showSpiritsCategory : true))
              .map((category) => (
              <View key={category.title} style={styles.meatCategoryBlock}>
                <View style={styles.sectionHeaderInline}>
                  <Text style={styles.sectionTitle}>{category.title}</Text>
                  <Pressable style={styles.inlineClearButton} onPress={() => clearDrinkCategory(category.items)}>
                    <Text style={styles.inlineClearButtonText}>x</Text>
                  </Pressable>
                </View>
                <View style={styles.meatBadges}>
                  {category.items.map((item) => {
                    const selected = selectedDrinks.includes(item);

                    return (
                      <Pressable
                        key={item}
                        style={[
                          styles.meatBadge,
                          styles.stepFourOptionBadge,
                          selected && styles.meatBadgeSelected,
                          selected && styles.stepFourOptionBadgeSelected
                        ]}
                        onPress={() => toggleDrinkSelection(item)}
                      >
                        <Text
                          style={[
                            styles.meatBadgeText,
                            styles.stepFourOptionBadgeText,
                            selected && styles.meatBadgeTextSelected,
                            selected && styles.stepFourOptionBadgeTextSelected
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {hasStepThreeSummary ? (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Resumen</Text>
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>Bebidas elegidas</Text>
                <View style={styles.summaryBadges}>
                  {selectedDrinkCategories.map((category) => (
                    <View key={category.title} style={styles.summaryCategoryBlock}>
                      <Text style={styles.summaryCategoryTitle}>{category.title}</Text>
                      <View style={styles.summaryBadges}>
                        {category.items.map((item) => (
                          <View key={item} style={[styles.summaryBadge, styles.stepFourSummaryBadge]}>
                            <Text style={[styles.summaryBadgeText, styles.stepFourSummaryBadgeText]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.resultsHero}>
            <View style={styles.totalAttendeesBadge}>
              <Text style={styles.totalAttendeesValue}>{totalAttendees}</Text>
              <Text style={styles.totalAttendeesLabel}>Asistentes</Text>
            </View>
            <View style={styles.resultsHeroText}>
              <Text style={styles.resultsHeroTitle}>Lista de compra estimada</Text>
              <Text style={styles.resultsHeroMeta}>{`${eventDetails.name.trim()} · ${eventDetails.date.trim()} · ${eventDetails.time.trim()}`}</Text>
              <Text style={styles.resultsHeroMeta}>{eventDetails.location.trim()}</Text>
              <Text style={styles.resultsHeroDescription}>
                Aquí tienes una guía bien aterrizada para comprar con tranquilidad, con cantidades pensadas según la gente que
                viene, el hambre del grupo, lo que se va a tirar a la parrilla y lo que van a tomar.
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Parrilla</Text>
              <Text style={styles.metricValue}>{toKgLabel(shoppingResults.totalParrillaKg)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Carbón</Text>
              <Text style={styles.metricValue}>{toKgLabel(shoppingResults.charcoalKg)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Sin alcohol</Text>
              <Text style={styles.metricValue}>{toLiterLabel(shoppingResults.softLiters)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Con alcohol</Text>
              <Text style={styles.metricValue}>{toLiterLabel(shoppingResults.alcoholLiters)}</Text>
            </View>
          </View>

          <AdBanner />

          {hasAnyResults ? (
            <View style={styles.summarySection}>
              {effectiveShoppingGroups.map((group) => renderShoppingGroup(group))}
              {alcoholSelectionWarning ? (
                <View style={styles.noteCard}>
                  <Text style={styles.noteTitle}>Ojo con las opciones</Text>
                  <Text style={styles.noteText}>{alcoholSelectionWarning}</Text>
                </View>
              ) : null}

              <View style={[styles.noteCard, styles.stepFiveNoteCard]}>
                <Text style={[styles.noteTitle, styles.stepFiveNoteTitle]}>Cómo se calcula</Text>
                <Text style={[styles.noteText, styles.stepFiveNoteText]}>
                  Hicimos el cálculo pensando en que no falte, pero sin irse al chancho. Tomamos en cuenta cuánta gente
                  va, el nivel de apetito, los cortes que elegiste, las bebidas y algunas preferencias del grupo para
                  darte una lista bien aterrizada y fácil de seguir.
                </Text>
              </View>

              <View style={[styles.noteCard, styles.stepFiveNoteCard]}>
                <Text style={[styles.noteTitle, styles.stepFiveNoteTitle]}>¿Piensas que es poco?</Text>
                <Text style={[styles.noteText, styles.stepFiveNoteText]}>
                  Si crees que la estimación quedó corta, puedes agregar más manualmente y guardar esos valores ajustados.
                </Text>
                <Pressable
                  style={[
                    styles.manualAdjustButton,
                    styles.stepFiveManualAdjustButton,
                    manualAdjustmentEnabled && styles.manualAdjustButtonActive,
                    manualAdjustmentEnabled && styles.stepFiveManualAdjustButtonActive
                  ]}
                  onPress={() => setManualAdjustmentEnabled((current) => !current)}
                >
                  <Text
                    style={[
                      styles.manualAdjustButtonText,
                      styles.stepFiveManualAdjustButtonText,
                      manualAdjustmentEnabled && styles.manualAdjustButtonTextActive,
                      manualAdjustmentEnabled && styles.stepFiveManualAdjustButtonTextActive
                    ]}
                  >
                    {manualAdjustmentEnabled ? "Ocultar ajuste manual" : "Agregar más manualmente"}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSaveAsado} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Guardar y ver planificación</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Todavía no hay suficientes datos</Text>
              <Text style={styles.placeholderText}>
                Completa asistentes, cortes y bebidas para que podamos calcular la lista de compra.
              </Text>
            </View>
          )}
        </>
      )}

      {canContinue ? (
        <Pressable style={styles.continueButton} onPress={goToNextStep}>
          <Text style={styles.continueButtonText}>{currentStep === 1 ? "Guardar" : "Continuar"}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FCF9F8"
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 32
  },
  progressBlock: {
    gap: 14
  },
  progressActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  progressButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1E5F9"
  },
  progressButtonPlaceholder: {
    width: 40,
    height: 40
  },
  progressButtonText: {
    fontSize: 18,
    lineHeight: 18,
    fontFamily: "Inter_700Bold",
    color: "#30525C",
    includeFontPadding: false,
    textAlign: "center"
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#30525C",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#09A1A1"
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
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
    color: "#5B5563",
    maxWidth: 340
  },
  formSection: {
    gap: 18
  },
  summarySection: {
    gap: 14
  },
  meatSection: {
    gap: 24
  },
  meatCategoryBlock: {
    gap: 14
  },
  sectionHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  meatBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  meatBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFDDB6"
  },
  stepThreeOptionBadge: {
    backgroundColor: "#09A1A1"
  },
  stepFourOptionBadge: {
    backgroundColor: "#09A1A1"
  },
  meatBadgeSelected: {
    backgroundColor: "#09A1A1"
  },
  stepThreeOptionBadgeSelected: {
    backgroundColor: "#30525C",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  stepFourOptionBadgeSelected: {
    backgroundColor: "#30525C",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  meatBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#2A1800"
  },
  stepThreeOptionBadgeText: {
    color: "#FFFFFF"
  },
  stepFourOptionBadgeText: {
    color: "#FFFFFF"
  },
  meatBadgeTextSelected: {
    color: "#FFFFFF"
  },
  stepThreeOptionBadgeTextSelected: {
    color: "#FFFFFF"
  },
  stepFourOptionBadgeTextSelected: {
    color: "#FFFFFF"
  },
  fieldList: {
    gap: 12
  },
  inputCard: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#09A1A1"
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#18181B"
  },
  selectorField: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  selectorFieldText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#18181B"
  },
  selectorPlaceholder: {
    color: "#A1A1AA"
  },
  selectorIcon: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#30525C",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  subsection: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 2
  },
  subsectionTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  appetiteOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  appetiteBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#09A1A1"
  },
  appetiteBadgeSelected: {
    backgroundColor: "#30525C",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  appetiteBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF"
  },
  appetiteBadgeTextSelected: {
    color: "#FFFFFF"
  },
  inlineClearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09A1A1"
  },
  inlineClearButtonText: {
    fontSize: 11,
    lineHeight: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false
  },
  summaryBlock: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#09A1A1"
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  totalAttendeesBadge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#30525C"
  },
  totalAttendeesValue: {
    fontSize: 20,
    fontFamily: "Newsreader_700Bold",
    color: "#FFFFFF"
  },
  totalAttendeesLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  summaryBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#D1E5F9"
  },
  stepTwoSummaryBadge: {
    backgroundColor: "#30525C"
  },
  stepTwoSummaryBadgeText: {
    color: "#FFFFFF"
  },
  stepThreeSummaryBadge: {
    backgroundColor: "#30525C"
  },
  stepThreeSummaryBadgeText: {
    color: "#FFFFFF"
  },
  stepFourSummaryBadge: {
    backgroundColor: "#30525C"
  },
  stepFourSummaryBadgeText: {
    color: "#FFFFFF"
  },
  summaryCategoryBlock: {
    width: "100%",
    gap: 10
  },
  summaryCategoryTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  summaryBadgeText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#30525C"
  },
  continueButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#30525C"
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  fieldRow: {
    minHeight: 72,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFF2EC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#18181B"
  },
  fieldLabelWrap: {
    flex: 1,
    justifyContent: "center"
  },
  fieldActionStack: {
    alignItems: "center",
    gap: 8
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#09A1A1"
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09A1A1"
  },
  quantityButtonText: {
    fontSize: 20,
    lineHeight: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  quantityValueWrap: {
    minWidth: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  quantityValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  placeholderCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#09A1A1",
    gap: 10
  },
  placeholderTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(28, 25, 23, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFDFB"
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  modalText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#5B5563"
  },
  modalButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#30525C"
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  resultsHero: {
    gap: 16,
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#09A1A1"
  },
  resultsHeroText: {
    gap: 8
  },
  resultsHeroTitle: {
    fontSize: 24,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  resultsHeroMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF"
  },
  resultsHeroDescription: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  metricCard: {
    width: "48%",
    minHeight: 110,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#09A1A1",
    justifyContent: "space-between"
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  metricValue: {
    fontSize: 24,
    fontFamily: "Newsreader_600SemiBold",
    color: "#F6C992"
  },
  shoppingList: {
    gap: 12
  },
  shoppingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  shoppingLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF"
  },
  shoppingAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#F6C992"
  },
  quantityValueSmall: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#F6C992",
    textAlign: "center"
  },
  stepFiveQuantityControl: {
    backgroundColor: "#30525C"
  },
  stepFiveQuantityButton: {
    backgroundColor: "#30525C"
  },
  stepFiveQuantityValueSmall: {
    color: "#F6C992"
  },
  noteCard: {
    gap: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#D1E5F9"
  },
  noteTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#30525C"
  },
  stepFiveNoteCard: {
    backgroundColor: "#09A1A1"
  },
  stepFiveNoteTitle: {
    color: "#FFFFFF"
  },
  stepFiveNoteText: {
    color: "#FFFFFF"
  },
  manualAdjustButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#FFF2EC"
  },
  manualAdjustButtonActive: {
    backgroundColor: "#30525C"
  },
  stepFiveManualAdjustButton: {
    backgroundColor: "#ACC0D3"
  },
  stepFiveManualAdjustButtonActive: {
    backgroundColor: "#FFFFFF"
  },
  manualAdjustButtonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  manualAdjustButtonTextActive: {
    color: "#FFFFFF"
  },
  stepFiveManualAdjustButtonText: {
    color: "#30525C"
  },
  stepFiveManualAdjustButtonTextActive: {
    color: "#30525C"
  },
  saveButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#30525C"
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  }
});
