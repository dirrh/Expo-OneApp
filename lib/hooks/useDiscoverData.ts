/**
 * useDiscoverData: Hook use Discover Data zapúzdruje stav a udalosti pre svoju časť aplikačného flowu.
 *
 * Prečo: Presun stavovej logiky do hooku useDiscoverData znižuje komplexitu obrazoviek a uľahčuje opakované použitie.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageSourcePropType } from "react-native";
import type { DiscoverMapMarker } from "../interfaces";
import { useDataSource } from "../data/useDataSource";
import type {
  BranchDto,
  BranchViewModel,
  MarkerDto,
  MarkerViewModel,
} from "../data/models";
import {
  buildBranchFromMarkerViewModel,
  createMapperContext,
  groupMarkersByLocation,
  mapBranchDtoToViewModel,
  mapMarkerDtoToViewModel,
} from "../data/mappers";
import type { GroupedMarkerBucket } from "../data/mappers";
import type { MarkerBranchOverride } from "../data/config/markerOverrides";
import { getRatingForId } from "../data/normalizers";
import { normalizeCenter } from "../maps/camera";

export interface UseDiscoverDataReturn {
  branches: BranchViewModel[];
  markers: MarkerViewModel[];
  groupedMarkers: GroupedMarkerBucket[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  fetchBranchForMarker: (marker: MarkerViewModel) => Promise<BranchViewModel>;
  buildBranchFromMarker: (marker: MarkerViewModel) => BranchViewModel;
}

interface UseDiscoverDataOptions {
  t: (key: string) => string;
  markerBranchOverrides?: Record<string, MarkerBranchOverride>;
  includeBranches?: boolean;
  includeGroupedMarkers?: boolean;
}

const EMPTY_BRANCHES: BranchViewModel[] = [];
const EMPTY_GROUPED_MARKERS: GroupedMarkerBucket[] = [];
type LoadedDtos = { branchDtos: BranchDto[]; markerDtos: MarkerDto[] };

export const useDiscoverData = ({
  t,
  markerBranchOverrides,
  includeBranches = true,
  includeGroupedMarkers = true,
}: UseDiscoverDataOptions): UseDiscoverDataReturn => {
  const dataSource = useDataSource();
  const mapperContext = useMemo(
    () => createMapperContext({ t, markerBranchOverrides }),
    [markerBranchOverrides, t]
  );

  const [branches, setBranches] = useState<BranchViewModel[]>([]);
  const [markers, setMarkers] = useState<MarkerViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadPromise: Promise<LoadedDtos> = includeBranches
      ? Promise.all([dataSource.getBranches(), dataSource.getMarkers()]).then(
          ([branchDtos, markerDtos]) => ({ branchDtos, markerDtos })
        )
      : dataSource.getMarkers().then((markerDtos) => ({
          branchDtos: [],
          markerDtos,
        }));

    loadPromise
      .then(({ branchDtos, markerDtos }) => {
        if (!active) {
          return;
        }

        const mappedMarkers = markerDtos.map((dto) =>
          mapMarkerDtoToViewModel(dto, mapperContext)
        );
        const mappedBranches = includeBranches
          ? branchDtos.map((dto) => mapBranchDtoToViewModel(dto, mapperContext))
          : EMPTY_BRANCHES;

        setBranches(mappedBranches);
        setMarkers(mappedMarkers);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(loadError?.message ?? "Nepodarilo sa nacitat data");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dataSource, fetchKey, includeBranches, mapperContext]);

  const refetch = useCallback(() => {
    setFetchKey((current) => current + 1);
  }, []);

  const groupedMarkers = useMemo(
    () =>
      includeGroupedMarkers ? groupMarkersByLocation(markers) : EMPTY_GROUPED_MARKERS,
    [includeGroupedMarkers, markers]
  );

  const buildBranchFromMarker = useCallback(
    (marker: MarkerViewModel) =>
      buildBranchFromMarkerViewModel(marker, mapperContext),
    [mapperContext]
  );

  const fetchBranchForMarker = useCallback(
    async (marker: MarkerViewModel) => {
      const branchDto = await dataSource.getBranchById(marker.id);
      if (branchDto) {
        return mapBranchDtoToViewModel(branchDto, mapperContext);
      }

      return buildBranchFromMarkerViewModel(marker, mapperContext);
    },
    [dataSource, mapperContext]
  );

  return {
    branches,
    markers,
    groupedMarkers,
    loading,
    error,
    refetch,
    fetchBranchForMarker,
    buildBranchFromMarker,
  };
};

export const useSavedLocationMarkers = (
  locations: Array<{
    label: string;
    coord?: [number, number];
    isSaved?: boolean;
    image: ImageSourcePropType;
    markerImage?: ImageSourcePropType;
  }>
): DiscoverMapMarker[] => {
  return useMemo(
    () =>
      locations
        .filter(
          (item) =>
            item.isSaved &&
            Array.isArray(item.coord) &&
            Number.isFinite(item.coord[0]) &&
            Number.isFinite(item.coord[1])
        )
        .map((item, index) => {
          const coord = item.coord as [number, number];
          const [lng, lat] = normalizeCenter(coord);
          const id = `saved-${index}-${lng}-${lat}`;
          const rating = getRatingForId(id);

          return {
            id,
            title: item.label,
            coord: { lng, lat },
            icon: item.markerImage ?? item.image,
            useNativePin: true,
            rating,
            category: "Multi" as const,
            ratingFormatted: rating.toFixed(1),
          };
        }),
    [locations]
  );
};
