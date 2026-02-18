// branchDtos fixture: mock DTO katalog prevadzok.
// Zodpovednost: lokalne testovacie data v backend kontrakt shape.
// Vstup/Vystup: export branchDtosFixture pre mock datasource.

import type { BranchDto } from "../data/models";
import { getMockBranchSearchMetadata } from "../data/search/mockBranchSearchMetadata";

// Kluce pre ponuky (prekladaju sa az vo ViewModel vrstve).
const OFFER_KEYS = {
  discount20: "offer_discount20",
  freeEntryFriend: "offer_freeEntryFriend",
  discount15Today: "offer_discount15Today",
  firstMonthFree: "offer_firstMonthFree",
};

const withSearchMetadata = (branch: BranchDto): BranchDto => ({
  ...branch,
  ...getMockBranchSearchMetadata(branch.id, branch.category, branch.title),
});

// Mock DTO data pripraveny pre backend kontrakt.
const baseBranchDtos: BranchDto[] = [
  {
    id: "gym_365",
    title: "365 GYM Nitra",
    category: "Fitness",
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    discountKey: OFFER_KEYS.discount20,
    offersKeys: [OFFER_KEYS.discount20, OFFER_KEYS.freeEntryFriend],
    moreCount: 2,
    address: "Chrenovska 16, Nitra",
    phone: "+421903776925",
    email: "info@365gym.sk",
    website: "https://365gym.sk",
  },
  {
    id: "royal_gym",
    title: "RED ROYAL GYM",
    category: "Fitness",
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    discountKey: OFFER_KEYS.discount15Today,
    offersKeys: [OFFER_KEYS.discount15Today, OFFER_KEYS.freeEntryFriend],
    moreCount: 3,
    address: "Trieda Andreja Hlinku 3, Nitra",
    phone: "+421911222333",
    email: "info@redroyal.sk",
    website: "https://redroyal.sk",
  },
  {
    id: "gym_klub",
    title: "GYM KLUB",
    category: "Fitness",
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    discountKey: OFFER_KEYS.firstMonthFree,
    offersKeys: [OFFER_KEYS.firstMonthFree, OFFER_KEYS.freeEntryFriend],
    moreCount: 5,
    address: "Mostna 42, Nitra",
    phone: "+421904555666",
    email: "kontakt@gymklub.sk",
    website: "https://gymklub.sk",
  },
  {
    id: "Diamond gym",
    title: "Diamond Gym",
    category: "Fitness",
    rating: 4.4,
    distance: "1.5 km",
    hours: "9:00 - 21:00",
    discountKey: OFFER_KEYS.discount20,
    offersKeys: [OFFER_KEYS.discount20],
  },
  {
    id: "Diamond barber",
    title: "Diamond Barber",
    category: "Beauty",
    rating: 4.6,
    distance: "1.5 km",
    hours: "9:00 - 21:00",
    discountKey: OFFER_KEYS.discount20,
    offersKeys: [OFFER_KEYS.discount20],
  },
];

export const branchDtosFixture: BranchDto[] = baseBranchDtos.map(withSearchMetadata);
