import { create } from "zustand";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Store de commande — sélection d'options partagée (v2.0.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  La carte latérale (OptionSelector) et la barre de commande persistante
 *  (OrderDock) partagent le même état : les options cochées se reflètent
 *  instantanément dans le total affiché en bas d'écran, dans le récapitulatif
 *  et dans le tunnel de commande. Une seule source de vérité côté client.
 *
 *  Portée : page de service courante (réinitialisée au montage du dock).
 */
interface OrderUiState {
  /** Ids des options supplémentaires sélectionnées (cumulables). */
  selectedIds: string[];
  /** Coche/décoche une option (idempotent). */
  toggleOption: (id: string) => void;
  /** Tunnel de commande ouvert ? */
  dialogOpen: boolean;
  openOrderDialog: () => void;
  closeOrderDialog: () => void;
  /** Remise à zéro (changement de fiche de service). */
  resetOrder: () => void;
}

export const useOrderStore = create<OrderUiState>((set) => ({
  selectedIds: [],
  toggleOption: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id],
    })),
  dialogOpen: false,
  openOrderDialog: () => set({ dialogOpen: true }),
  closeOrderDialog: () => set({ dialogOpen: false }),
  resetOrder: () => set({ selectedIds: [], dialogOpen: false }),
}));
