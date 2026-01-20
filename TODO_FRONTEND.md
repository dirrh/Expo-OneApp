# TODO - Frontend implementácia podľa FSD User Layer

## Prehľad implementovaných funkcií

### ✅ Už implementované:
1. **Autentifikácia** - Supabase Auth (email, Google OAuth)
2. **Základný profil** - zobrazenie používateľa, úprava základných údajov
3. **Mapa** - Mapbox integrovaná, zobrazenie POI, filtre podľa kategórií
4. **Vyhľadávanie** - základné vyhľadávanie podnikov
5. **QR kód** - základné zobrazenie QR kódu (statický)
6. **Recenzie** - zobrazenie recenzií (len UI, bez funkcionality pridávania)
7. **Navigácia** - presmerovanie do Google Maps
8. **Predplatné** - UI pre výber plánu (Starter, Medium, Gold)

---

## 🔴 CHYBÁ - MUST HAVE funkcie

### 1. **Onboarding – Registrácia** ❌
**Status:** Úplne chýba

**Čo treba implementovať:**
- Po prvej registrácii zobraziť onboarding flow
- Pýtať sa používateľa, aké služby v súčasnosti využíva (fitko, nechty, strihanie vlasov, atď.)
- Zobraziť informácie o prevádzkach v daných kategóriách
- Ponúknuť možnosť predplatného pre dané služby (napr. Beauty + Fitness package)

**Kde implementovať:**
- Nový screen: `screens/OnboardingScreen.tsx`
- Pridať do navigácie po úspešnej registrácii
- Možno použiť multi-step form s výberom kategórií

---

### 2. **Predplatné – kompletná funkcionalita** ⚠️
**Status:** Čiastočne implementované (len UI)

**Čo treba doplniť:**
- ✅ UI pre výber plánu (Starter, Medium, Gold) - **UŽ JE**
- ❌ Výber geografickej oblasti (Local, Continent, World Pass)
- ❌ Integrácia s platobným systémom
- ❌ Uloženie stavu predplatného do databázy
- ❌ Zobrazenie aktívneho stavu predplatného (active, paused, expired)
- ❌ História predplatných v profile

**Kde implementovať:**
- Rozšíriť `screens/profile/SubscriptionActivationScreen.tsx`
- Pridať výber geografickej oblasti
- Pridať integraciu s platobným systémom (Stripe/PayPal)
- Pridať API volania na uloženie predplatného

---

### 3. **QR kód validácia** ⚠️
**Status:** Čiastočne implementované (len statický QR kód)

**Čo treba doplniť:**
- ✅ Základné zobrazenie QR kódu - **UŽ JE**
- ❌ Dynamický QR kód, ktorý sa obnovuje každých 10 sekúnd
- ❌ Kryptografické podpísanie QR kódu (JWT claim + časová platnosť)
- ❌ Generovanie QR kódu na základe používateľského ID a session
- ❌ Zobrazenie časovača do obnovenia QR kódu

**Kde implementovať:**
- Upraviť `screens/HomeScreen.tsx` - pridať dynamické generovanie
- Upraviť `screens/BenefitsScreen.tsx` - pridať dynamické generovanie
- Vytvoriť hook: `lib/hooks/useDynamicQRCode.ts`
- Pridať API endpoint alebo funkciu na generovanie JWT tokenu

---

### 4. **Recenzie a hodnotenia** ⚠️
**Status:** Čiastočne implementované (len zobrazenie)

**Čo treba doplniť:**
- ✅ Zobrazenie recenzií - **UŽ JE**
- ❌ Pridávanie recenzií (formulár s hodnotením 1-5, text, fotografia)
- ❌ Validácia, že používateľ benefit využil (overené QR kódom)
- ❌ Body za recenzie (systém odmeňovania)
- ❌ Upload fotografií k recenzii
- ❌ Zobrazenie histórie recenzií používateľa

**Kde implementovať:**
- Rozšíriť `components/discover/ReviewsSection.tsx` - pridať modal/formulár
- Vytvoriť `screens/AddReviewScreen.tsx` alebo modal
- Pridať validáciu cez API (overenie, že používateľ skutočne využil benefit)
- Pridať upload fotografií (expo-image-picker)

---

### 5. **Sledovanie obsadenosti** ❌
**Status:** Úplne chýba

**Čo treba implementovať:**
- Zobrazenie aktuálnej obsadenosti pre fitness, wellness, gastro prevádzky
- Odhad podľa aktívnych check-inov cez QR kód
- Anonymná agregácia dát
- Zobrazenie v detaili prevádzky (napr. "Aktuálne obsadenosť: 65%")

**Kde implementovať:**
- Pridať do `components/discover/HeroInfo.tsx` alebo `components/discover/InfoSection.tsx`
- Vytvoriť komponent `components/OccupancyIndicator.tsx`
- Pridať API volanie na získanie obsadenosti
- Zobraziť len pre kategórie: Fitness, Wellness, Gastro

---

### 6. **Osobná štatistika** ⚠️
**Status:** Čiastočne implementované (len základné UI)

**Čo treba doplniť:**
- ✅ Základné zobrazenie "Ušetril: 15 €" - **UŽ JE** (ale statické)
- ❌ Skutočné výpočty ušetrených peňazí na benefitoch
- ❌ Zobrazenie prevádzok, v ktorých bol používateľ za posledný mesiac/rok
- ❌ História využitých benefitov
- ❌ Graf alebo zoznam aktivít

**Kde implementovať:**
- Rozšíriť `screens/profile/ProfileScreen.tsx` - pridať sekciu so štatistikami
- Vytvoriť `screens/profile/StatisticsScreen.tsx`
- Pridať API volania na získanie histórie benefitov a check-inov
- Pridať výpočty ušetrených peňazí

---

### 7. **História benefitov** ⚠️
**Status:** Čiastočne implementované (len UI)

**Čo treba doplniť:**
- ✅ Základné zobrazenie benefitov (Activated/Claimed) - **UŽ JE**
- ❌ Skutočná história využitých benefitov z databázy
- ❌ Filtrovanie podľa dátumu, kategórie, prevádzky
- ❌ Zobrazenie detailov každého využitia (kde, kedy, aký benefit)

**Kde implementovať:**
- Rozšíriť `screens/BenefitsScreen.tsx`
- Pridať API volania na získanie histórie
- Pridať filtre a vyhľadávanie

---

### 8. **Vyhľadávanie služieb** ⚠️
**Status:** Čiastočne implementované (len základné vyhľadávanie podnikov)

**Čo treba doplniť:**
- ✅ Základné vyhľadávanie podnikov - **UŽ JE**
- ❌ Vyhľadávanie konkrétnych služieb (napr. "gélové nechty", "akrylové nechty")
- ❌ Zobrazenie všetkých prevádzok s danou službou a ich vzdialenosť
- ❌ Možnosť otvoriť detail a navigovať

**Kde implementovať:**
- Rozšíriť `components/discover/DiscoverSearchSheet.tsx`
- Pridať vyhľadávanie v službách/servisoch prevádzok
- Pridať filtre podľa typu služby

---

### 9. **Zobrazenie info o POI/Firmách** ⚠️
**Status:** Čiastočne implementované

**Čo treba doplniť:**
- ✅ Základné zobrazenie detailu prevádzky - **UŽ JE**
- ❌ Zobrazenie všetkých kategórií, ktoré prevádzka ponúka
- ❌ Zobrazenie všetkých podnikov, ktoré vlastní business
- ❌ Hierarchia: Business → Kategórie → Prevádzky

**Kde implementovať:**
- Rozšíriť `screens/BusinessDetailScreen.tsx`
- Pridať sekciu "Všetky kategórie" a "Všetky prevádzky"
- Pridať navigáciu medzi prevádzkami toho istého businessu

---

### 10. **Body a odmeňovací systém** ❌
**Status:** Úplne chýba

**Čo treba implementovať:**
- Získavanie bodov za recenzie
- Zobrazenie aktuálneho počtu bodov
- Možnosť uplatniť body ako zľavu na predplatné
- História získaných a použitých bodov

**Kde implementovať:**
- Pridať do `screens/profile/ProfileScreen.tsx` - zobrazenie bodov
- Vytvoriť `screens/profile/PointsHistoryScreen.tsx`
- Pridať API volania na získanie a použitie bodov

---

## 📋 Zhrnutie podľa priority

### 🔴 KRITICKÉ (MUST HAVE):
1. **Onboarding flow** - úplne chýba
2. **Dynamický QR kód s JWT** - kritické pre validáciu
3. **Pridávanie recenzií** - základná funkcionalita
4. **Kompletná funkcionalita predplatného** - výber oblasti, platba, stav
5. **História benefitov** - skutočné dáta z databázy

### 🟡 DÔLEŽITÉ:
6. **Sledovanie obsadenosti** - užitočná funkcia
7. **Osobná štatistika** - rozšírená verzia
8. **Vyhľadávanie služieb** - rozšírenie existujúceho vyhľadávania
9. **Body a odmeňovací systém** - motivácia pre používateľov

### 🟢 NICE TO HAVE:
10. **Rozšírené zobrazenie POI/Business hierarchie**

---

## 🔧 Technické poznámky

### Potrebné závislosti:
- `expo-image-picker` - pre upload fotografií v recenziách
- `@react-native-async-storage/async-storage` - už je nainštalované
- JWT knižnica pre podpisovanie QR kódov (napr. `jsonwebtoken` alebo Supabase funkcie)

### API integrácie:
- Endpoint na generovanie dynamického QR kódu
- Endpoint na validáciu QR kódu (Business Suite)
- Endpoint na získanie histórie benefitov
- Endpoint na získanie obsadenosti prevádzok
- Endpoint na získanie bodov a histórie
- Endpoint na uloženie recenzií s validáciou

### Databázové tabuľky (predpoklad):
- `subscriptions` - predplatné používateľov
- `benefit_history` - história využitých benefitov
- `reviews` - recenzie používateľov
- `user_points` - body používateľov
- `check_ins` - check-iny cez QR kód (pre obsadenosť)
