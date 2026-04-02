import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "asadolisto.saved-asados";
const ACTIVE_ASADO_ID_STORAGE_KEY = "asadolisto.active-asado-id";

export type SavedShoppingGroup = {
  title: string;
  items: {
    label: string;
    amount: string;
  }[];
};

export type SavedAsado = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  createdAt: string;
  appetiteLevel: string | null;
  attendees: {
    adultos: number;
    ninos: number;
  };
  preferences: {
    vegetarianos: number;
    noAlcohol: number;
    noVacuno: number;
    noCerdo: number;
    noPollo: number;
  };
  meats: string[];
  drinks: string[];
  totals: {
    totalAttendees: number;
    totalParrillaKg: number;
    charcoalKg: number;
    softLiters: number;
    alcoholLiters: number;
  };
  shoppingGroups: SavedShoppingGroup[];
};

const normalizeSavedAsado = (item: Partial<SavedAsado>): SavedAsado => ({
  id: item.id ?? "",
  name: item.name ?? "",
  date: item.date ?? "",
  time: item.time ?? "",
  location: item.location ?? "",
  createdAt: item.createdAt ?? new Date(0).toISOString(),
  appetiteLevel: item.appetiteLevel ?? null,
  attendees: {
    adultos: item.attendees?.adultos ?? 0,
    ninos: item.attendees?.ninos ?? 0
  },
  preferences: {
    vegetarianos: item.preferences?.vegetarianos ?? 0,
    noAlcohol: item.preferences?.noAlcohol ?? 0,
    noVacuno: item.preferences?.noVacuno ?? 0,
    noCerdo: item.preferences?.noCerdo ?? 0,
    noPollo: item.preferences?.noPollo ?? 0
  },
  meats: Array.isArray(item.meats) ? item.meats : [],
  drinks: Array.isArray(item.drinks) ? item.drinks : [],
  totals: {
    totalAttendees: item.totals?.totalAttendees ?? 0,
    totalParrillaKg: item.totals?.totalParrillaKg ?? 0,
    charcoalKg: item.totals?.charcoalKg ?? 0,
    softLiters: item.totals?.softLiters ?? 0,
    alcoholLiters: item.totals?.alcoholLiters ?? 0
  },
  shoppingGroups: Array.isArray(item.shoppingGroups)
    ? item.shoppingGroups
        .filter((group) => group && typeof group.title === "string" && Array.isArray(group.items))
        .map((group) => ({
          title: group.title,
          items: group.items
            .filter((entry) => entry && typeof entry.label === "string" && typeof entry.amount === "string")
            .map((entry) => ({
              label: entry.label,
              amount: entry.amount
            }))
        }))
    : []
});

const getAsadoFingerprint = (asado: Pick<SavedAsado, "name" | "date" | "time" | "location">) =>
  [asado.name.trim().toLowerCase(), asado.date.trim(), asado.time.trim(), asado.location.trim().toLowerCase()].join("|");

export async function getSavedAsados() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [] as SavedAsado[];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedAsado>[];
    return Array.isArray(parsed) ? parsed.map(normalizeSavedAsado) : [];
  } catch {
    return [];
  }
}

export async function getSavedAsadoById(id: string) {
  const items = await getSavedAsados();
  return items.find((item) => item.id === id) ?? null;
}

export async function getActiveAsadoId() {
  return AsyncStorage.getItem(ACTIVE_ASADO_ID_STORAGE_KEY);
}

export async function setActiveAsadoId(id: string | null) {
  if (!id) {
    await AsyncStorage.removeItem(ACTIVE_ASADO_ID_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(ACTIVE_ASADO_ID_STORAGE_KEY, id);
}

export async function getActiveAsado() {
  const [items, activeId] = await Promise.all([getSavedAsados(), getActiveAsadoId()]);

  if (items.length === 0) {
    return null;
  }

  if (!activeId) {
    return items[0];
  }

  return items.find((item) => item.id === activeId) ?? items[0];
}

export async function saveAsado(asado: SavedAsado) {
  const current = await getSavedAsados();
  const existingById = current.find((item) => item.id === asado.id);
  const fingerprint = getAsadoFingerprint(asado);
  const existing = current.find((item) => getAsadoFingerprint(item) === fingerprint);
  const normalized = existingById
    ? { ...asado, createdAt: existingById.createdAt }
    : existing
      ? { ...asado, id: existing.id, createdAt: existing.createdAt }
      : asado;
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id && getAsadoFingerprint(item) !== fingerprint)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  await setActiveAsadoId(normalized.id);
  return next;
}

export async function deleteAsado(id: string) {
  const current = await getSavedAsados();
  const next = current.filter((item) => item.id !== id);
  const activeId = await getActiveAsadoId();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  if (activeId === id) {
    await setActiveAsadoId(next[0]?.id ?? null);
  }

  return next;
}
