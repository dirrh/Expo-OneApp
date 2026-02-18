// AppConfig: jednotny pristup ku konfiguracii prostredia.
// Zodpovednost: citanie, validacia a fallback env hodnot.
// Vstup/Vystup: exportuje typed konfiguraciu pre data a API vrstvu.

import {
  API_BASE_URL,
  DATA_SOURCE,
  EXPO_PUBLIC_HOME_SEARCH_V2,
  EXPO_PUBLIC_SHOW_MORE_V2,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@env";
import type { DataSourceMode } from "../data/models";

// Centralny wrapper pre env konfiguraciu aplikacie.
export interface AppConfigValue {
  dataSource: DataSourceMode;
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  homeSearchV2Enabled: boolean;
  showMoreV2Enabled: boolean;
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

const appConfig: AppConfigValue = Object.freeze({
  dataSource: parseDataSource(getEnvValue("DATA_SOURCE", DATA_SOURCE)),
  apiBaseUrl: getEnvValue("API_BASE_URL", API_BASE_URL),
  supabaseUrl: getEnvValue("SUPABASE_URL", SUPABASE_URL),
  supabaseAnonKey: getEnvValue("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY),
  homeSearchV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_HOME_SEARCH_V2", EXPO_PUBLIC_HOME_SEARCH_V2),
    true
  ),
  showMoreV2Enabled: parseBooleanFlag(
    getEnvValue("EXPO_PUBLIC_SHOW_MORE_V2", EXPO_PUBLIC_SHOW_MORE_V2),
    true
  ),
});

export const AppConfig = appConfig;

export const getAppConfig = () => AppConfig;
