import type { BranchData } from "../interfaces";
import type { UserBooking, UserVisit } from "../interfaces";

export const DUMMY_FAVORITES: BranchData[] = [
  {
    id: "gym_365",
    title: "365 GYM Nitra",
    image: require("../../assets/365.jpg"),
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    offers: ["offer_discount20", "offer_freeEntryFriend"],
    moreCount: 2,
    address: "Chrenovská 16, Nitra",
    phone: "+421 903 776 925",
    email: "info@365gym.sk",
    website: "https://365gym.sk",
  },
  {
    id: "royal_gym",
    title: "RED ROYAL GYM",
    image: require("../../assets/royal.jpg"),
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    offers: ["offer_discount15Today", "offer_twoForOne"],
    moreCount: 3,
    address: "Trieda Andreja Hlinku 3, Nitra",
    phone: "+421 911 222 333",
    email: "info@redroyal.sk",
    website: "https://redroyal.sk",
  },
  {
    id: "gym_klub",
    title: "GYM KLUB",
    image: require("../../assets/klub.jpg"),
    rating: 4.6,
    distance: "1.7 km",
    hours: "9:00 - 21:00",
    offers: ["offer_firstMonthFree", "offer_personalTrainer"],
    moreCount: 5,
    address: "Mostná 42, Nitra",
    phone: "+421 904 555 666",
    email: "kontakt@gymklub.sk",
    website: "https://gymklub.sk",
  },
];

export const DUMMY_BOOKINGS: UserBooking[] = [
  {
    id: "booking_1",
    branch: DUMMY_FAVORITES[0],
    date: "26. feb 2026",
    time: "10:00 – 11:00",
    status: "confirmed",
  },
  {
    id: "booking_2",
    branch: DUMMY_FAVORITES[1],
    date: "1. mar 2026",
    time: "14:30 – 15:30",
    status: "pending",
  },
  {
    id: "booking_3",
    branch: DUMMY_FAVORITES[2],
    date: "18. feb 2026",
    time: "09:00 – 10:00",
    status: "completed",
  },
];

export const DUMMY_MOST_VISITED: UserVisit[] = [
  { id: "mv_1", branch: DUMMY_FAVORITES[0], visitedAt: "23. feb 2026", visitCount: 12 },
  { id: "mv_2", branch: DUMMY_FAVORITES[1], visitedAt: "20. feb 2026", visitCount: 8 },
  { id: "mv_3", branch: DUMMY_FAVORITES[2], visitedAt: "15. feb 2026", visitCount: 5 },
];

export const DUMMY_LAST_VISITED: UserVisit[] = [
  { id: "lv_1", branch: DUMMY_FAVORITES[0], visitedAt: "23. feb 2026" },
  { id: "lv_2", branch: DUMMY_FAVORITES[2], visitedAt: "19. feb 2026" },
  { id: "lv_3", branch: DUMMY_FAVORITES[1], visitedAt: "14. feb 2026" },
];
