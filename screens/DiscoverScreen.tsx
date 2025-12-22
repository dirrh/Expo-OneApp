import { Platform, useWindowDimensions } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Mapbox from "@rnmapbox/maps";
import type { Camera } from "@rnmapbox/maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { coords } from "../lib/data/coords";
import { useTranslation } from "react-i18next";
import type BottomSheet from "@gorhom/bottom-sheet";
import { Location } from "../lib/interfaces";
import DiscoverMap from "../components/discover/DiscoverMap";
import DiscoverTopControls from "../components/discover/DiscoverTopControls";
import DiscoverSearchSheet from "../components/discover/DiscoverSearchSheet";
import DiscoverFilterSheet from "../components/discover/DiscoverFilterSheet";
import DiscoverBranchOverlay from "../components/discover/DiscoverBranchOverlay";
import { styles } from "../components/discover/discoverStyles";

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const sheetRef = useRef<BottomSheet>(null);
  const filterRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["25%", "85%"], []);

  const filter_options = ["Fitness", "Gastro", "Relax", "Beauty"];
  const filter_icons: Record<string, any> = {
    Fitness: require("../images/icons/fitness/Fitness.png"),
    Gastro: require("../images/icons/gastro/Gastro.png"),
    Relax: require("../images/icons/relax/Relax.png"),
    Beauty: require("../images/icons/beauty/Beauty.png"),

  }

  const subcategories = ["Vegan", "Coffee", "Asian", "Pizza", "Sushi", "Fast Food", "Seafood", "Beer"];

  const { t } = useTranslation();

  const branches = [
    {
      title: t("365 GYM Nitra"),
      image: require("../assets/365.jpg"),
      rating: 4.6,
      distance: t("1.7 km"),
      hours: t("9:00 - 21:00"),
      discount: t("20% discount on first entry"),
      moreCount: 2,
      onPress: () => console.log("Open detail"),
    },
    {
      title: t("RED ROYAL GYM"),
      image: require("../assets/royal.jpg"),
      rating: 4.6,
      distance: t("1.7 km"),
      hours: t("9:00 - 21:00"),
      discount: t("20% discount on first entry"),
      moreCount: 3,
    },
    {
      title: t("GYM KLUB"),
      image: require("../assets/klub.jpg"),
      rating: 4.6,
      distance: t("1.7 km"),
      hours: t("9:00 - 21:00"),
      discount: t("20% discount on first entry"),
      moreCount: 5,
    },
  ];

 

  const [location,setLocation] = useState <Location[]>([
    { image:require("../images/home.png"),label:"home" },
    { image: require("../images/business.png"), label: "business" },
  ]
 );

  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<string>("yourLocation");
  const [text, setText] = useState("");
  const [o, setO] = useState<boolean>(true)
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filter, setFilter] = useState("Gastro")
  const [appliedFilter, setAppliedFilter] = useState<string | null>(null);
  const [sub, setSub] = useState<Set<string>>(() => new Set());
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null);
  const [didInitialCenter, setDidInitialCenter] = useState(false);

  const cameraRef = useRef<Camera>(null);
  
const query = text.trim().toLowerCase();
const filtered = query
  ? branches.filter(b => b.title.toLowerCase().includes(query))
  : branches;

  const toggle = (name: string) => {
    setSub(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };


  useEffect(() => {
    if (Platform.OS === "android") {
      Mapbox.requestAndroidLocationPermissions();
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: isSheetOpen ? "none" : "flex" },
    });
  }, [navigation, isSheetOpen]);

  useEffect(() => {
    if (!userCoord || didInitialCenter) {
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: userCoord,
      zoomLevel: 14,
      animationDuration: 800,
    });
    setDidInitialCenter(true);
  }, [userCoord, didInitialCenter]);

  const subcategoryChipWidth = Math.max(96, Math.floor((screenWidth - 16 * 2 - 12 * 2) / 3));
  const branchCardWidth = Math.min(360, screenWidth - 32);
  const markerItems = [
    {
      id: "fitness",
      category: "Fitness",
      coord: coords[0],
      icon: require("../images/icons/fitness/fitness_without_review.png"),
    },
    {
      id: "gastro",
      category: "Gastro",
      coord: coords[1],
      icon: require("../images/icons/gastro/gastro_without_rating.png"),
    },
    {
      id: "relax",
      category: "Relax",
      coord: coords[2],
      icon: require("../images/icons/relax/relax_without_rating.png"),
    },
    {
      id: "beauty",
      category: "Beauty",
      coord: coords[3],
      icon: require("../images/icons/beauty/beauty_without_rating.png"),
    },
  ];
  const filteredMarkers = appliedFilter
    ? markerItems.filter(item => item.category === appliedFilter)
    : markerItems;

  const handleSheetChange = (index: number) => {
    setO(index === -1);
    setIsSheetOpen(index !== -1);
  };

  const handleUserLocationUpdate = (coord: [number, number]) => {
    setUserCoord(coord);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <DiscoverMap
        cameraRef={cameraRef}
        filteredMarkers={filteredMarkers}
        onUserLocationUpdate={handleUserLocationUpdate}
      />
      <DiscoverTopControls
        insetsTop={insets.top}
        open={open}
        setOpen={setOpen}
        location={location}
        setLocation={setLocation}
        option={option}
        setOption={setOption}
        o={o}
        sheetRef={sheetRef}
        filterRef={filterRef}
        userCoord={userCoord}
        cameraRef={cameraRef}
        t={t}
      />
      <DiscoverSearchSheet
        sheetRef={sheetRef}
        snapPoints={snapPoints}
        onSheetChange={handleSheetChange}
        text={text}
        setText={setText}
        filtered={filtered}
        t={t}
      />
      <DiscoverFilterSheet
        filterRef={filterRef}
        snapPoints={snapPoints}
        onSheetChange={handleSheetChange}
        insetsBottom={insets.bottom}
        filter={filter}
        setFilter={setFilter}
        filterOptions={filter_options}
        filterIcons={filter_icons}
        subcategories={subcategories}
        sub={sub}
        toggle={toggle}
        count={sub.size}
        setAppliedFilter={setAppliedFilter}
        setSub={setSub}
        subcategoryChipWidth={subcategoryChipWidth}
        t={t}
      />
      {!isSheetOpen && (
        <DiscoverBranchOverlay
          insetsBottom={insets.bottom}
          categoriesOpen={categoriesOpen}
          setCategoriesOpen={setCategoriesOpen}
          filterOptions={filter_options}
          filterIcons={filter_icons}
          appliedFilter={appliedFilter}
          setAppliedFilter={setAppliedFilter}
          setFilter={setFilter}
          branches={branches}
          branchCardWidth={branchCardWidth}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}
