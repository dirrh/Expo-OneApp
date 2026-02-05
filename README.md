# Expo-OneApp

Táto dokumentácia popisuje lokálne nastavenie projektu, spustenie v režime vývoja cez **Expo Dev Client** a vytváranie **Android buildov** pomocou **EAS Cloud**.

---

## Požiadavky

Pred začatím sa uistite, že máte k dispozícii:

- **Node.js** (odporúčaná LTS verzia 20 alebo 22) a **npm**
- **Git**
- **EAS CLI** (inštalačný príkaz nižšie)
- **Expo/EAS účet** s prístupom k projektu
- **Android Studio** (vyžadované pre Android SDK, nástroje príkazového riadka a emulátor)
- **Android zariadenie** (fyzické zariadenie alebo nakonfigurovaný emulátor v Android Studiu)

---

## Inštalácia a nastavenie

### 1. Klonovanie repozitára
```bash
git clone "https://github.com/Quintex9/Expo-OneApp"
cd Expo-OneApp
```

### 2. Inštalácia závislostí
```bash
npm install
```

### 3. Inštalácia EAS CLI
```bash
npm install -g eas-cli
```

### 4. Konfigurácia prostredia (.env)
V koreňovom priečinku projektu vytvorte súbor `.env` a doplňte hodnoty, ktoré vám poskytne autor projektu:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=VAS_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_AVATAR_URL=\images\photo.png
```

**Dôležité upozornenie:** Súbor `.env` obsahuje citlivé údaje a nesmie sa odosielať (commit) do Git repozitára. Overte, že je tento súbor uvedený v `.gitignore`.

---

## Vývoj a spustenie (Expo Dev Client)

Spustenie vývoja na mobilnom zariadení vyžaduje prítomnosť špeciálneho vývojárskeho buildu (Dev Client).

### 1. Inštalácia vývojárskej aplikácie
Predtým, než začnete, uistite sa, že máte v zariadení správnu verziu aplikácie:
- Ak už máte v zariadení nainštalovanú staršiu verziu aplikácie, **odinštalujte ju**.
- Stiahnite a nainštalujte si **najnovší development build (APK)** z odkazu, ktorý vám poskytli autori projektu (vygenerovaný cez EAS).

### 2. Prihlásenie do EAS
```bash
eas login
```
Prihláste sa účtom, ktorý má oprávnenie pracovať s týmto projektom.

### 3. Spustenie Metro Bundlera
Spustite vývojový server s vyčistením vyrovnávacej pamäte (cache):
```bash
npx expo start --dev-client -c
```

### 4. Pripojenie zariadenia k serveru
1. Uistite sa, že fyzické mobilné zariadenie aj počítač sú na **rovnakej Wi-Fi sieti**.
2. Otvorte v mobile nainštalovanú aplikáciu **Dev Client**.
3. V termináli na PC sa zobrazí ponuka Metro bundlera. 
   - Ak používate **emulátor v Android Studiu** alebo fyzické zariadenie pripojené cez kábel, stlačte klávesu **a**, keď sa táto možnosť zobrazí v konzole.
   - Alternatívne naskenujte QR kód zobrazený v konzole priamo cez aplikáciu Dev Client.

**Poznámka k polohe:** Pre správne fungovanie máp povoľte aplikácii prístup k polohe a nastavte ju na možnosť **Presná (Precise)**.

---

## Build aplikácie (Android cez EAS Cloud)

Ak potrebujete vytvoriť nový inštalačný balík (napr. pri zmene natívnych knižníc) cez cloudovú službu EAS, použite:

```bash
eas build -p android --profile preview
```

Po dokončení procesu získate odkaz na stiahnutie `.apk` súboru v termináli alebo vo vašom EAS dashboarde. Tento odkaz následne poskytnite ostatným vývojárom na inštaláciu.

---

## Riešenie problémov

| Problém | Možné riešenie |
| :--- | :--- |
| **Nesprávna poloha (napr. USA)** | Skontrolujte, či je v systéme Android zapnuté GPS a či má aplikácia udelené oprávnenie pre Presnú polohu. |
| **Zmeny v kóde sa neprejavujú** | Reštartujte Metro bundler s vyčistením cache: `npx expo start --dev-client -c`. |
| **Mapa sa nenačíta (Android)** | Overte správnosť `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` v súbore `.env`. |
| **Aplikácia padá pri štarte** | Odinštalujte starú verziu a nainštalujte najnovšie APK od autorov. Staré verzie nemusia byť kompatibilné s novým kódom. |
| **Android Studio / ADB chyby** | Uistite sa, že máte správne nastavené systémové premenné (ANDROID_HOME) a v emulátore/zariadení je povolené Ladenie cez USB. |

---
*Posledná aktualizácia: December 2024*
