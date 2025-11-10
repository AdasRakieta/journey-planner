# 🔄 Changelog - Environment Variables from Portainer

## Zmiany w projekcie

### 1. Backend (`server/src/index.ts`)
✅ **Dodano ładowanie `stack.env` z Portainera**
- Backend najpierw ładuje `.env` (lokalny development)
- Następnie ładuje `stack.env` i nadpisuje zmienne (production w Portainerze)
- Kolejność: `.env` → `stack.env` → environment variables z Dockera

✅ **Dynamiczne wyświetlanie URL w konsoli**
- Zamiast `http://localhost:5001` pokazuje **rzeczywisty adres** z `VITE_API_URL`
- Wyświetla pełny API URL z environment variables
- Pokazuje CORS Origin dla weryfikacji

**Przykładowy output:**
```
📦 Loading Portainer stack.env...
✅ All required environment variables are set
🚀 Server is running on port 5001
🌍 Environment: production
📡 Backend URL: https://malina.tail384b18.ts.net
📡 API Base URL: https://malina.tail384b18.ts.net/journey/api
🔗 CORS Origin: https://malina.tail384b18.ts.net
```

### 2. Nowe pliki

#### `stack.env.example`
Template dla environment variables w Portainerze/Docker z poprawnymi przykładami dla Nginx i Direct Access.

#### `PORTAINER_ENV.md`
Kompletna dokumentacja:
- Jak działa ładowanie zmiennych (`.env` → `stack.env`)
- Setup w Portainer UI (Environment Variables)
- Alternatywnie: użycie pliku `stack.env`
- Weryfikacja i troubleshooting
- **Poprawione przykłady** z `/journey` dla Nginx

#### `URL_CONFIGURATION_GUIDE.md` ⭐ NOWY
**Kompletny przewodnik po konfiguracji URL:**
- Kiedy używać `/journey/` w URL?
- Porównanie: Nginx vs Direct Access
- Szczegółowe wyjaśnienie CORS_ORIGIN (BEZ `/journey`!)
- Wizualizacje jak działają różne tryby
- Troubleshooting CORS i URL problems
- Quick checklists dla każdego trybu

### 3. Aktualizacje dokumentacji

#### `README.md`
- Dodano link do `PORTAINER_ENV.md` w sekcji Deployment Options
- Dodano link w sekcji Deployment & Configuration

## Jak to działa

### Dla lokalnego developmentu:
1. Używasz `.env` w katalogu głównym
2. Backend ładuje tylko `.env`
3. Wszystkie zmienne z `.env` są aktywne

### Dla Portainera/Docker:
1. Ustawiasz zmienne w **Portainer → Stack → Environment Variables**
2. Docker przekazuje te zmienne do kontenera
3. Backend ładuje `.env` (jeśli istnieje)
4. Następnie ładuje `stack.env` (jeśli istnieje) i **nadpisuje** zmienne
5. W konsoli widzisz **rzeczywiste adresy** zamiast localhost

## Korzyści

✅ **Jedno źródło prawdy** - Environment Variables w Portainerze  
✅ **Brak conflictów** - stack.env nadpisuje .env  
✅ **Czytelne logi** - Widzisz rzeczywiste URL zamiast localhost  
✅ **Łatwa weryfikacja** - Sprawdzasz CORS i URL w logach  
✅ **Różne środowiska** - Dev używa .env, prod używa Portainer  

## Testowanie

### Lokalnie (development):
```bash
# Użyj .env z localhost
npm run dev
```

### Docker (production):
```bash
# 1. Ustaw zmienne w Portainer Environment Variables
# 2. Deploy stack
# 3. Sprawdź logi:
docker logs journey-planner-api
```

## Następne kroki

1. ✅ Skopiuj `stack.env.example` do `stack.env` (opcjonalnie)
2. ✅ W Portainerze ustaw Environment Variables (zalecane)
3. ✅ Deploy stack z **Pull and redeploy**
4. ✅ Sprawdź logi backendu - powinny pokazać rzeczywiste URL
5. ✅ Zweryfikuj że frontend łączy się z API pod prawidłowym adresem

---

**Data:** 10 listopada 2025  
**Wersja:** 1.0  
**Status:** ✅ Kompilacja przeszła, gotowe do deploy
