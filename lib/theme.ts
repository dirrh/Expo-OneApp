/**
 * Theme - centralizované farby, fonty a spoločné štýly
 * 
 * Použitie:
 * import { colors, fonts, spacing } from "../lib/theme";
 * 
 * <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
 */

// === FARBY ===
export const colors = {
    // Primárna farba (oranžová)
    primary: "#EB8100",
    primaryLight: "#F97316",
    
    // Textys
    textPrimary: "#000000",
    textSecondary: "#71717A",
    textMuted: "rgba(0, 0, 0, 0.5)",
    textWhite: "#FFFFFF",
    textLight: "#FAFAFA",
    
    // Pozadia
    background: "#FFFFFF",
    backgroundSecondary: "#F5F5F5",
    backgroundMuted: "#E5E7EB",
    
    // Bordery
    border: "#E4E4E7",
    borderLight: "rgba(228, 228, 231, 0.5)",
    
    // Akcenty
    star: "#FFD000",
    error: "#EF4444",
    errorLight: "#FEF2F2",
    errorText: "#DC2626",
    success: "#10B981",
    
    // Ikony
    iconGray: "#9B9B9B",
    iconDark: "#000000",
    
    // QR button
    qrBlue: "#225DFF",
    
    // Disabled stavy
    disabled: "#E4E4E7",
    disabledText: "#585858",
    
    // Shadows
    shadowColor: "#000000",
} as const;

// === FONTY ===
export const fonts = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
} as const;

// === SPACING ===
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
} as const;

// === BORDER RADIUS ===
export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 9999,
} as const;

// === FONT SIZES ===
export const fontSize = {
    xs: 9,
    sm: 10,
    md: 12,
    base: 14,
    lg: 15,
    xl: 17,
    xxl: 20,
    xxxl: 25,
} as const;

// === LINE HEIGHTS ===
export const lineHeight = {
    xs: 11,
    sm: 14,
    md: 17,
    base: 20,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
} as const;

// === SHADOWS ===
export const shadows = {
    sm: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
} as const;

// === CARD STYLES ===
export const cardStyles = {
    base: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.xl,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: spacing.lg,
    },
} as const;

// === BUTTON STYLES ===
export const buttonStyles = {
    primary: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        height: 40,
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    disabled: {
        backgroundColor: colors.disabled,
        borderRadius: borderRadius.lg,
        height: 40,
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
} as const;

// === TEXT STYLES ===
export const textStyles = {
    title: {
        fontFamily: fonts.bold,
        fontSize: fontSize.xl,
        lineHeight: lineHeight.xl,
        color: colors.textPrimary,
    },
    subtitle: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.lg,
        lineHeight: lineHeight.lg,
        color: colors.textPrimary,
    },
    body: {
        fontFamily: fonts.medium,
        fontSize: fontSize.base,
        lineHeight: lineHeight.base,
        color: colors.textSecondary,
    },
    caption: {
        fontFamily: fonts.medium,
        fontSize: fontSize.sm,
        lineHeight: lineHeight.sm,
        color: colors.textMuted,
    },
    button: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.base,
        lineHeight: lineHeight.md,
        color: colors.textWhite,
    },
} as const;

// === DEFAULT EXPORT ===
const theme = {
    colors,
    fonts,
    spacing,
    borderRadius,
    fontSize,
    lineHeight,
    shadows,
    cardStyles,
    buttonStyles,
    textStyles,
};

export default theme;
