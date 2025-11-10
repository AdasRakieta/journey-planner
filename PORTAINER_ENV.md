# 📦 Portainer Environment Configuration

## Jak działa ładowanie zmiennych środowiskowych

Backend ładuje zmienne w następującej kolejności:

1. **`.env`** - Podstawowa konfiguracja (lokalny development)
2. **`stack.env`** - Nadpisuje zmienne dla Portainera (production)

Dzięki temu możesz:
- Mieć lokalną konfigurację w `.env` dla development
- Używać `stack.env` w Portainerze bez modyfikacji `.env`

## 🚀 Setup w Portainerze

### Metoda 1: Environment Variables w Portainer UI (Zalecana)

1. **Portainer → Stacks → journey-planner → Editor**
2. Przewiń w dół do **Environment variables**
3. Dodaj zmienne bezpośrednio w UI:

```env
# WAŻNE: Z Nginx dodaj /journey do FRONTEND_URL i VITE_API_URL!
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
NODE_ENV=production
DB_HOST=100.103.184.90
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=admin
DB_PASSWORD=***
JWT_SECRET=***
SMTP_USERNAME=***
SMTP_PASSWORD=***
IMAGE_TAG=latest
```

4. **Update the stack** → ✅ Pull and redeploy

### Metoda 2: Plik stack.env (Alternatywna)

Jeśli wolisz używać pliku:

1. Skopiuj przykładowy plik:
```bash
cp stack.env.example stack.env
```

2. Edytuj `stack.env` z właściwymi wartościami produkcyjnymi:
```bash
nano stack.env
```

3. Upewnij się, że plik jest w katalogu głównym projektu
4. Backend automatycznie go załaduje przy starcie kontenera

## 🔍 Weryfikacja

Po uruchomieniu backend pokaże w logach:

```
📦 Loading Portainer stack.env...
✅ All required environment variables are set
🚀 Server is running on port 5001
🌍 Environment: production
📡 Backend URL: https://malina.tail384b18.ts.net
📡 API Base URL: https://malina.tail384b18.ts.net/journey/api
🔗 CORS Origin: https://malina.tail384b18.ts.net
```

Sprawdź logi:
```bash
docker logs journey-planner-api
```

## 🎯 Kluczowe zmienne dla produkcji

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `FRONTEND_URL` | URL frontendu (Z `/journey` dla Nginx!) | `https://malina.tail384b18.ts.net/journey` |
| `VITE_API_URL` | URL API dla frontendu (Z `/journey/api` dla Nginx!) | `https://malina.tail384b18.ts.net/journey/api` |
| `CORS_ORIGIN` | Dozwolone źródło CORS (BEZ `/journey`!) | `https://malina.tail384b18.ts.net` |
| `NODE_ENV` | Środowisko | `production` |
| `IMAGE_TAG` | Tag obrazu Docker | `latest` |

## ⚠️ Ważne

### Dla Nginx deployment (Z reverse proxy):
```env
# FRONTEND_URL i VITE_API_URL MUSZĄ mieć /journey!
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
# CORS_ORIGIN BEZ /journey (tylko domena!)
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

### Dla direct access (BEZ Nginx, przez porty):
```env
# BEZ /journey, z portami
FRONTEND_URL=http://100.103.184.90:5173
VITE_API_URL=http://100.103.184.90:5001/api
CORS_ORIGIN=http://100.103.184.90:5173
```

## 🐛 Troubleshooting

### Backend pokazuje localhost zamiast prawdziwego URL

**Przyczyna:** `VITE_API_URL` nie jest ustawione w environment variables

**Rozwiązanie:**
1. Sprawdź logi: `docker logs journey-planner-api`
2. Dodaj `VITE_API_URL` w Portainer Environment Variables
3. Redeploy stack

### CORS errors

**Przyczyna:** `CORS_ORIGIN` nie pasuje do URL frontendu

**Rozwiązanie:**
```env
# ✅ POPRAWNIE - tylko domena, BEZ /journey
CORS_ORIGIN=https://malina.tail384b18.ts.net

# ❌ BŁĘDNIE - z /journey nie zadziała!
CORS_ORIGIN=https://malina.tail384b18.ts.net/journey
```

**Wyjaśnienie:** Przeglądarka wysyła Origin header jako `https://malina.tail384b18.ts.net` (bez ścieżki), więc CORS_ORIGIN musi być identyczny!

### Frontend nadal używa localhost

**Przyczyna:** Frontend nie został przebudowany z nowymi zmiennymi

**Rozwiązanie:**
1. Ustaw `VITE_API_URL` w Portainer
2. **✅ Pull and redeploy** (przebuduje frontend)
3. Poczekaj 1-2 minuty na rebuild

---

**Podsumowanie:** Portainer environment variables > stack.env > .env
