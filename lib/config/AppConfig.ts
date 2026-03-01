/**
 * AppConfig: Spracúva environment konfiguráciu a feature flagy do typovaného runtime objektu.
 *
 * Prečo: Validácia konfigurácie pri štarte znižuje riziko tichých chýb v rôznych prostrediach.
 */

import {
  API_BASE_URL,
  DATA_SOURCE,
  EXPO_PUBLIC_BUSINESS_DETAIL_V2,
  EXPO_PUBLIC_DISCOVER_SEARCH_V2,
  EXPO_PUBLIC_HOME_SEARCH_V2,
  EXPO_PUBLIC_REVIEW_PHOTOS,
  EXPO_PUBLIC_SHOW_MORE_V2,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@env";
import type { DataSourceMode } from "../data/models";

// Centralny wrapper pre env konfiguraciu aplikacie.
export type AppConfigMapIOSTextMode = "dynamic" | "always" | "off";

export interface AppConfigValue {
  dataSource: DataSourceMode;
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  homeSearchV2Enabled: boolean;
  discoverSearchV2Enabled: boolean;
  showMoreV2Enabled: boolean;
  businessDetailV2Enabled: boolean;
  reviewPhotosEnabled: boolean;
  mapIOSTextMode: AppConfigMapIOSTextMode;
  mapIOSPoolSize?: number;
}

const getTrimmedValue = (value?: string | null) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getEnvValue = (key: string, injected?: string | null) => {
  const direct = getTrimmedValue(injected);
  if (direct) {
    return direct;
  }

  if (typeof process !== "undefined" && process?.env) {
    return getTrimmedValue(process.env[key]);
  }

  return undefined;
};

const parseDataSource = (value?: string): DataSourceMode => {
  if (!value) {
    return "mock";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "api") {
    return "api";
  }
  if (normalized === "supabase") {
    return "supabase";
  }
  return "mock";
};

const parseBooleanFlag = (value?: string, defaultValue = false): boolean => {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "off", "no"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const parseMapIOSTextMode = (value?: string): AppConfigMapIOSTextMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "off") {
    return "off";
  }
  if (normalized === "always") {
    return "always";
  }
  return "dynamic";
};

const parseOptionalInteger = (
  value?: string,
  minimum?: number,
  maximum?: number
) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  let normalized = Math.floor(parsed);
  if (typeof minimum === "number") {
    normalized = Math.max(minimum, normalized);
  }
  if (typeof maximum === "number") {
    normalized = Math.min(maximum, normalized);
  }
  return normalized;
};

const appConfig: AppConfigValue = Object.freeze({
  dataSource: parseDataSource(getEnvValue("DATA_SOURCE", DATA_SOURCE)),
  apiBaseUrl: getEnvValue("API_BASE_URL", API_BASE_URL),
  supabaseUrl: getEnvValue("SUPABASE_URL", SUPABASE_URL),
  supabaseAnonKey: getEnvValue("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY),
  homeSearchV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_HOME_SEARCH_V2", EXPO_PUBLIC_HOME_SEARCH_V2),
    true
  ),
  discoverSearchV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_DISCOVER_SEARCH_V2", EXPO_PUBLIC_DISCOVER_SEARCH_V2),
    true
  ),
  showMoreV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_SHOW_MORE_V2", EXPO_PUBLIC_SHOW_MORE_V2),
    true
  ),
  businessDetailV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_BUSINESS_DETAIL_V2", EXPO_PUBLIC_BUSINESS_DETAIL_V2),
    true
  ),
  reviewPhotosEnabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_REVIEW_PHOTOS", EXPO_PUBLIC_REVIEW_PHOTOS),
    true
  ),
  mapIOSTextMode: parseMapIOSTextMode(getEnvValue("EXPO_PUBLIC_MAP_IOS_TEXT_MODE")),
  mapIOSPoolSize: parseOptionalInteger(
    getEnvValue("EXPO_PUBLIC_MAP_IOS_POOL_SIZE"),
    16,
    96
  ),
});

export const AppConfig = appConfig;

export const getAppConfig = () => AppConfig;
