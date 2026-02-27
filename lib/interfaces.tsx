/**
 * interfaces: Definuje zdieľané TypeScript kontrakty pre UI, navigáciu, mapu a dátový tok aplikácie.
 *
 * Prečo: Jeden zdroj typov znižuje nekonzistencie medzi obrazovkami, hookmi a dátovou vrstvou.
 */

import type { Dispatch, RefObject, SetStateAction } from "react";
import type BottomSheet from "@gorhom/bottom-sheet";
import { ImageSourcePropType } from "react-native";
import type MapView from "react-native-maps";

export type MapViewRef = RefObject<MapView | null>;

export type DiscoverCategory = "Fitness" | "Gastro" | "Relax" | "Beauty";

export type BranchMenuLabelMode = "menu" | "pricelist";

export interface BranchMenuItem {
  id: string;
  name: string;
  details?: string;
  price?: string;
}

export interface User {

    id : string;
    first_name : string;
    last_name : string;
    image_url?: string;

}

export interface Coords {
    id : string;
    lng : number;
    lat : number;
    category: DiscoverCategory;

    groupId?: string; 
    items?: DiscoverMapMarker[];

}

export interface Location {
    image : ImageSourcePropType,
    label : string,
    coord?: [number, number],
    isSaved?: boolean,
    markerImage?: ImageSourcePropType,
}

export type BranchData = {
  id?: string;
  title: string;
  image: ImageSourcePropType;
  images?: ImageSourcePropType[];
  coordinates?: [number, number];
  rating: number;
  distance: string;
  hours: string;
  category?: string;
  discount?: string;
  offers?: string[];
  menuItems?: BranchMenuItem[];
  menuLabelMode?: BranchMenuLabelMode;
  searchTags?: string[];
  searchMenuItems?: string[];
  searchAliases?: string[];
  badgeVariant?: "more" | "all";
  moreCount?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export interface BranchCardProps extends BranchData {
  onPress?: (branch: BranchData) => void;
  cardPaddingBottom?: number;
  cardMarginBottom?: number;
  badgePosition?: "bottom" | "inline";
  badgeInlineOffset?: number;
  badgeRowOffset?: number;
  noElevation?: boolean;
}

export interface DiscoverMapMarker {
  id: string;
  title?: string;
  labelPriority?: number;
  markerSpriteUrl?: string;
  markerSpriteKey?: string;
  coord: { lng: number; lat: number };
  groupId?: string;
  groupCount?: number;
  icon: ImageSourcePropType;
  rating: number;
  ratingFormatted?: string; // Pred-formátovaný rating pre mapu
  category: DiscoverCategory | "Multi";
}

export interface DiscoverMapLabelPolicy {
  minZoom: number;
  enterZoom?: number;
  exitZoom?: number;
  lowZoomMax: number;
  midZoomMax: number;
  highZoomMax: number;
  maxMarkersForLabels?: number;
}

export interface DiscoverMapProps {
  cameraRef: MapViewRef;
  filteredMarkers: DiscoverMapMarker[];
  userCoord?: [number, number] | null;
  hasActiveFilter?: boolean;
  labelPolicy?: Partial<DiscoverMapLabelPolicy>;
  markerRenderPolicy?: {
    fullSpritesEnabled?: boolean;
  };
  onCameraChanged: (
    center: [number, number],
    zoom: number,
    isUserGesture?: boolean
  ) => void;

  onMarkerPress?: (id: string) => void;

  mapCenter?: [number, number];
  mapZoom?: number;
  cityCenter?: [number, number];
  initialCamera?: { center: [number, number]; zoom: number } | null;
}


export interface DiscoverTopControlsProps {
  insetsTop: number;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  location: Location[];
  setLocation: Dispatch<SetStateAction<Location[]>>;
  option: string;
  setOption: Dispatch<SetStateAction<string>>;
  o: boolean;
  filterRef: RefObject<BottomSheet | null>;
  onOpenSearch: () => void;
  userCoord: [number, number] | null;
  mainMapCenter?: [number, number] | null;
  cameraRef: MapViewRef;
  t: (key: string) => string;
  onLocationSheetChange?: (index: number) => void;
  hasActiveFilter?: boolean;
  isSearchOpen?: boolean;
  onCloseSearch?: () => void;
}

export interface DiscoverLocationSearchResult {
  title: string;
  subtitle: string;
}

export interface DiscoverFavoritePlace {
  id: string;
  label: string;
  coord: [number, number];
  isSaved?: boolean;
}

export interface DiscoverLocationSheetProps {
  locationRef: RefObject<BottomSheet | null>;
  setLocation: Dispatch<SetStateAction<Location[]>>;
  userCoord: [number, number] | null;
  mainMapCenter?: [number, number] | null;
  onLocationSheetChange?: (index: number) => void;
}

export type PlanId = "starter" | "medium" | "gold";

export interface SelectableCardProps {
  id: PlanId;
  title: string;
  price: string;
  description: string;
  popular?: boolean;
  selected: boolean;
  onPress: (id: PlanId) => void;
}

export interface LocationAddStepProps {
  addressLine1: string;
  addressLine2: string;
  onSearchPress: () => void;
  onContinue: () => void;
  onMapPress: () => void;
}

export interface LocationDetailsStepProps {
  locationName: string;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
}

export interface LocationSearchStepProps {
  searchQuery: string;
  onChangeQuery: (value: string) => void;
  results: DiscoverLocationSearchResult[];
  onSelectResult: (item: DiscoverLocationSearchResult) => void;
  onContinue: () => void;
  onMapPress: () => void;
}

export interface LocationMapStepProps {
  selectedCoord: [number, number];
  selectedCoordLabel: string;
  hasMapMoved: boolean;
  onBack: () => void;
  onCenterPress: () => void;
  onSave: () => void;
  setHasMapMoved: Dispatch<SetStateAction<boolean>>;
  setSelectedCoord: Dispatch<SetStateAction<[number, number]>>;
  mapCameraRef: MapViewRef;
}

export interface DiscoverSearchSheetProps {
  onSheetChange?: (index: number) => void;
  onClose: () => void;
  sheetIndex: number;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  filtered: BranchCardProps[];
  onSelectBranch: (branch: BranchData) => void;
  favoritePlaces: DiscoverFavoritePlace[];
  onSelectFavorite: (place: DiscoverFavoritePlace) => void;
  autoFocus?: boolean;
  showFavorites?: boolean;
  resultTabs?: Array<{ key: string; label: string }>;
  activeResultTabKey?: string;
  onChangeResultTab?: (key: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface DiscoverFilterSheetProps {
  filterRef: RefObject<BottomSheet | null>;
  snapPoints: string[];
  onSheetChange: (index: number) => void;
  insetsBottom: number;
  filter: string;
  setFilter: Dispatch<SetStateAction<string>>;
  rating: Set<string>;
  setRating: Dispatch<SetStateAction<Set<string>>>;
  filterOptions: string[];
  filterIcons: Record<string, ImageSourcePropType>;
  subcategories: string[];
  sub: Set<string>;
  toggle: (name: string) => void;
  count: number;
  appliedFilters: Set<string>;
  setAppliedFilters: Dispatch<SetStateAction<Set<string>>>;
  setAppliedRatings: Dispatch<SetStateAction<Set<string>>>;
  setSub: Dispatch<SetStateAction<Set<string>>>;
  subcategoryChipWidth: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface DiscoverBranchOverlayProps {
  insetsBottom: number;
  categoriesOpen: boolean;
  setCategoriesOpen: Dispatch<SetStateAction<boolean>>;
  filterOptions: string[];
  filterIcons: Record<string, ImageSourcePropType>;
  appliedFilters: Set<string>;
  setAppliedFilters: Dispatch<SetStateAction<Set<string>>>;
  setFilter: Dispatch<SetStateAction<string>>;
  branches: BranchCardProps[];
  branchCardWidth: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface UserBooking {
  id: string;
  branch: BranchData;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
}

export interface UserVisit {
  id: string;
  branch: BranchData;
  visitedAt: string;
  visitCount?: number;
}
