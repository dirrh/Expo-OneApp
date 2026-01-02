import type { Dispatch, RefObject, SetStateAction } from "react";
import type BottomSheet from "@gorhom/bottom-sheet";
import type { Camera } from "@rnmapbox/maps";
import { ImageSourcePropType } from "react-native";

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

}

export interface Location {
    image : ImageSourcePropType,
    label : string,
}

export type BranchData = {
  title: string;
  image: any;
  rating: number;
  distance: string;
  hours: string;
  discount?: string;
  moreCount?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export interface BranchCardProps extends BranchData {
  onPress?: (branch: BranchData) => void;
}

export interface DiscoverMapMarker {
  id: string;
  coord: { lng: number; lat: number };
  icon: any;
}

export interface DiscoverMapProps {
  cameraRef: RefObject<Camera>;
  filteredMarkers: DiscoverMapMarker[];
  onUserLocationUpdate: (coord: [number, number]) => void;
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
  sheetRef: RefObject<BottomSheet>;
  filterRef: RefObject<BottomSheet>;
  userCoord: [number, number] | null;
  cameraRef: RefObject<Camera>;
  t: (key: string) => string;
}

export interface DiscoverSearchSheetProps {
  sheetRef: RefObject<BottomSheet>;
  snapPoints: string[];
  onSheetChange: (index: number) => void;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  filtered: BranchCardProps[];
  t: (key: string) => string;
}

export interface DiscoverFilterSheetProps {
  filterRef: RefObject<BottomSheet>;
  snapPoints: string[];
  onSheetChange: (index: number) => void;
  insetsBottom: number;
  filter: string;
  setFilter: Dispatch<SetStateAction<string>>;
  filterOptions: string[];
  filterIcons: Record<string, any>;
  subcategories: string[];
  sub: Set<string>;
  toggle: (name: string) => void;
  count: number;
  setAppliedFilter: Dispatch<SetStateAction<string | null>>;
  setSub: Dispatch<SetStateAction<Set<string>>>;
  subcategoryChipWidth: number;
  t: (key: string) => string;
}

export interface DiscoverBranchOverlayProps {
  insetsBottom: number;
  categoriesOpen: boolean;
  setCategoriesOpen: Dispatch<SetStateAction<boolean>>;
  filterOptions: string[];
  filterIcons: Record<string, any>;
  appliedFilter: string | null;
  setAppliedFilter: Dispatch<SetStateAction<string | null>>;
  setFilter: Dispatch<SetStateAction<string>>;
  branches: BranchCardProps[];
  branchCardWidth: number;
  t: (key: string) => string;
}

