/**
 * FavoritesContext: Session-level stav obľúbených prevádzok.
 *
 * Prečo: Zdieľaný kontext synchronizuje srdce v BusinessDetail a zoznam v Profile
 * bez persistence – pripravené na backend integráciu (nahradiť useState API volaním).
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BranchData } from "./interfaces";

interface FavoritesContextType {
  favorites: BranchData[];
  isFavorite: (id: string | undefined) => boolean;
  toggleFavorite: (branch: BranchData) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider = ({
  children,
  initialFavorites = [],
}: {
  children: React.ReactNode;
  initialFavorites?: BranchData[];
}) => {
  const [favorites, setFavorites] = useState<BranchData[]>(initialFavorites);

  const isFavorite = useCallback(
    (id: string | undefined) => {
      if (!id) return false;
      return favorites.some((b) => b.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback((branch: BranchData) => {
    setFavorites((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      if (exists) {
        return prev.filter((b) => b.id !== branch.id);
      }
      return [branch, ...prev];
    });
  }, []);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
