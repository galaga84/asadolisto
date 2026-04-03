import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AdBanner } from "../../components/AdBanner";
import { deleteAsado, getSavedAsados, setActiveAsadoId, type SavedAsado } from "../../lib/asado-store";

const ASADOS_PER_PAGE = 6;

export default function MisAsadosScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [items, setItems] = useState<SavedAsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToDelete, setSelectedToDelete] = useState<SavedAsado | null>(null);
  const [selectedToView, setSelectedToView] = useState<SavedAsado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const shoppingGroups = selectedToView?.shoppingGroups ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / ASADOS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);
  const pageStart = (visiblePage - 1) * ASADOS_PER_PAGE;
  const paginatedItems = items.slice(pageStart, pageStart + ASADOS_PER_PAGE);

  const buildWhatsAppMessage = useCallback((item: SavedAsado) => {
    const header = [
      `Lista de compras - ${item.name}`,
      `${item.date} - ${item.time}`,
      item.location
    ].join("\n");

    const groups =
      item.shoppingGroups.length > 0
        ? item.shoppingGroups
            .map((group) => [`${group.title}:`, ...group.items.map((entry) => `- ${entry.label}: ${entry.amount}`)].join("\n"))
            .join("\n\n")
        : "Este asado todavía no tiene una lista de compras guardada.";

    return `${header}\n\n${groups}`;
  }, []);

  const handleShareOnWhatsApp = useCallback(async (item: SavedAsado) => {
    const message = buildWhatsAppMessage(item);
    const encodedMessage = encodeURIComponent(message);
    const appUrl = `whatsapp://send?text=${encodedMessage}`;
    const webUrl = `https://wa.me/?text=${encodedMessage}`;

    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  }, [buildWhatsAppMessage]);

  const loadAsados = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await getSavedAsados();
      setItems(saved);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAsados();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [loadAsados])
  );

  const handleDelete = async () => {
    if (!selectedToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const next = await deleteAsado(selectedToDelete.id);
      setItems(next);
      setSelectedToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = useCallback(async (item: SavedAsado) => {
    await setActiveAsadoId(item.id);
    router.push({ pathname: "/(tabs)/asados", params: { editId: item.id, mode: "edit" } });
  }, [router]);

  const goToPage = useCallback((nextPage: number) => {
    const targetPage = Math.max(1, Math.min(totalPages, nextPage));
    setCurrentPage(targetPage);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [totalPages]);

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Modal transparent animationType="fade" visible={selectedToDelete !== null} onRequestClose={() => setSelectedToDelete(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Estás seguro?</Text>
            <Text style={styles.modalText}>Si borras este asado, saldrá de Mis asados y no podremos recuperarlo.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setSelectedToDelete(null)} disabled={isDeleting}>
                <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalPrimaryButton} onPress={handleDelete} disabled={isDeleting}>
                <Text style={styles.modalPrimaryButtonText}>{isDeleting ? "Borrando..." : "Sí, borrar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={selectedToView !== null} onRequestClose={() => setSelectedToView(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.largeModalCard}>
            <Text style={styles.modalTitle}>Lista de compras</Text>
            <Text style={styles.modalText}>{selectedToView ? `${selectedToView.name} - ${selectedToView.date} - ${selectedToView.time}` : ""}</Text>

            <ScrollView style={styles.shoppingModalScroll} showsVerticalScrollIndicator={false}>
              {shoppingGroups.length > 0 ? (
                shoppingGroups.map((group) => (
                  <View key={group.title} style={styles.shoppingGroup}>
                    <Text style={styles.shoppingGroupTitle}>{group.title}</Text>
                    {group.items.map((item) => (
                      <View key={`${group.title}-${item.label}`} style={styles.shoppingRow}>
                        <Text style={styles.shoppingLabel}>{item.label}</Text>
                        <Text style={styles.shoppingAmount}>{item.amount}</Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.shoppingEmptyCard}>
                  <Text style={styles.shoppingEmptyTitle}>Todavía no hay una lista guardada</Text>
                  <Text style={styles.shoppingEmptyText}>
                    Este asado es de una versión anterior. Si lo vuelves a calcular y guardar, la lista de compras quedará disponible aquí.
                  </Text>
                </View>
              )}
            </ScrollView>

            <Pressable style={styles.modalPrimaryButton} onPress={() => setSelectedToView(null)}>
              <Text style={styles.modalPrimaryButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Guardados</Text>
        <Text style={styles.title}>Mis asados</Text>
        <Text style={styles.text}>Aquí verás cada asado que armes con su fecha, lugar y resumen de compra.</Text>
      </View>

      <AdBanner />

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color="#09A1A1" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Todavía no tienes asados guardados</Text>
          <Text style={styles.emptyText}>Cuando guardes uno desde el flujo de Asados, aparecerá aquí.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {paginatedItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.totalBadgeWrap}>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeValue}>{item.totals.totalAttendees}</Text>
                  </View>
                  <Text style={styles.totalBadgeLabel}>Asistentes</Text>
                </View>
                <View style={styles.cardHeadings}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>{`${item.date} - ${item.time}`}</Text>
                  <Text style={styles.cardMeta}>{item.location}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable style={styles.deleteButton} onPress={() => setSelectedToDelete(item)}>
                    <Text style={styles.deleteButtonText}>Borrar</Text>
                  </Pressable>
                  <Pressable style={styles.editButtonCompact} onPress={() => void handleEdit(item)}>
                    <Text style={styles.editButtonCompactText}>Editar</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.metrics}>
                <View style={styles.metricBadge}>
                  <Text style={styles.metricText}>{`${item.totals.totalParrillaKg.toFixed(1)} kg parrilla`}</Text>
                </View>
                <View style={styles.metricBadge}>
                  <Text style={styles.metricText}>{`${item.totals.charcoalKg.toFixed(1)} kg carbón`}</Text>
                </View>
                <View style={styles.metricBadge}>
                  <Text style={styles.metricText}>{`${item.totals.softLiters.toFixed(1)} L sin alcohol`}</Text>
                </View>
                <View style={styles.metricBadge}>
                  <Text style={styles.metricText}>{`${item.totals.alcoholLiters.toFixed(1)} L con alcohol`}</Text>
                </View>
              </View>

              <Pressable style={styles.viewButton} onPress={() => setSelectedToView(item)}>
                <Text style={styles.viewButtonText}>Ver lista de compras</Text>
              </Pressable>

              <Pressable style={styles.shareButton} onPress={() => void handleShareOnWhatsApp(item)}>
                <Text style={styles.shareButtonText}>Compartir por WhatsApp</Text>
              </Pressable>
            </View>
          ))}

          {items.length > ASADOS_PER_PAGE ? (
            <View style={styles.paginationBlock}>
              <Pressable
                style={[styles.paginationButton, visiblePage === 1 && styles.paginationButtonDisabled]}
                onPress={() => goToPage(visiblePage - 1)}
                disabled={visiblePage === 1}
              >
                <Text style={styles.paginationButtonText}>Anterior</Text>
              </Pressable>

              <View style={styles.paginationStatus}>
                <Text style={styles.paginationStatusText}>{`${visiblePage} / ${totalPages}`}</Text>
              </View>

              <Pressable
                style={[styles.paginationButton, visiblePage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => goToPage(visiblePage + 1)}
                disabled={visiblePage === totalPages}
              >
                <Text style={styles.paginationButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
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
  eyebrow: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#09A1A1",
    textTransform: "uppercase",
    letterSpacing: 1
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
  list: {
    gap: 16
  },
  paginationBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4
  },
  paginationButton: {
    minHeight: 44,
    minWidth: 110,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ACC0D3"
  },
  paginationButtonDisabled: {
    opacity: 0.45
  },
  paginationButtonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  paginationStatus: {
    minHeight: 44,
    minWidth: 82,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#30525C"
  },
  paginationStatusText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  card: {
    gap: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#09A1A1"
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  cardActions: {
    gap: 8
  },
  totalBadgeWrap: {
    alignItems: "center",
    gap: 6
  },
  totalBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#30525C"
  },
  totalBadgeValue: {
    fontSize: 18,
    fontFamily: "Newsreader_700Bold",
    color: "#FFFFFF"
  },
  totalBadgeLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#E8FFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  cardHeadings: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF"
  },
  cardMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE"
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#D396A6"
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#C4E8F5"
  },
  metricText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#30525C"
  },
  viewButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#30525C"
  },
  viewButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  shareButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#C4E8F5"
  },
  shareButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  editButtonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#D1E5F9"
  },
  editButtonCompactText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  emptyCard: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#09A1A1"
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Newsreader_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center"
  },
  emptyText: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#F3FFFE",
    textAlign: "center"
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
    backgroundColor: "#FFFCFA"
  },
  largeModalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: 28,
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFCFA"
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
  shoppingModalScroll: {
    maxHeight: 360
  },
  shoppingGroup: {
    gap: 10,
    paddingVertical: 8
  },
  shoppingEmptyCard: {
    gap: 10,
    paddingVertical: 12
  },
  shoppingEmptyTitle: {
    fontSize: 18,
    fontFamily: "Newsreader_600SemiBold",
    color: "#18181B"
  },
  shoppingEmptyText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#5B5563"
  },
  shoppingGroupTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#09A1A1",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  shoppingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6
  },
  shoppingLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#18181B"
  },
  shoppingAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#09A1A1"
  },
  modalActions: {
    flexDirection: "row",
    gap: 10
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#D1E5F9"
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#30525C"
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#B42318"
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  }
});
