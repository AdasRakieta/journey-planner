# 🌐 Przewodnik po konfiguracji URL - Journey Planner

## ❓ Kiedy używać `/journey/` w URL?

To zależy od tego, **czy używasz Nginx reverse proxy**, czy **bezpośredniego dostępu przez porty**.

---

## 🔴 Tryb 1: Direct Access (BEZ Nginx)

### Kiedy używać?
- ✅ Development lokalny
- ✅ Testy bez Nginx
- ✅ Bezpośredni dostęp przez porty

### Konfiguracja:
```env
FRONTEND_URL=http://100.103.184.90:5173
VITE_API_URL=http://100.103.184.90:5001/api
CORS_ORIGIN=http://100.103.184.90:5173
```

### Jak działa?
```
Przeglądarka → http://100.103.184.90:5173 → Frontend (port 5173)
Przeglądarka → http://100.103.184.90:5001/api → Backend (port 5001)
```

### ⚠️ **BEZ `/journey/` w URL!**

---

## 🟢 Tryb 2: Nginx Reverse Proxy (Z `/journey/`)

### Kiedy używać?
- ✅ Produkcja z Nginx
- ✅ Współdzielenie portu 80/443 z innymi aplikacjami (np. SmartHome)
- ✅ TailScale z ładnymi URL

### Konfiguracja:
```env
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

### Jak działa?
```
Przeglądarka → https://malina.tail384b18.ts.net/journey/
                ↓
              Nginx (port 443)
                ↓
location /journey/ → Frontend container (port 80)
                ↓
            http://localhost:5173

Przeglądarka → https://malina.tail384b18.ts.net/journey/api
                ↓
              Nginx (port 443)
                ↓
location /journey/api/ → Backend container (port 5001)
                ↓
            http://localhost:5001/api
```

### ✅ **Z `/journey/` dla URL, ale BEZ dla CORS_ORIGIN!**

---

## 📊 Porównanie - Co gdzie?

| Zmienna | Direct Access (BEZ Nginx) | Z Nginx (Reverse Proxy) |
|---------|---------------------------|-------------------------|
| `FRONTEND_URL` | `http://IP:5173` | `https://domena/journey` ✅ |
| `VITE_API_URL` | `http://IP:5001/api` | `https://domena/journey/api` ✅ |
| `CORS_ORIGIN` | `http://IP:5173` | `https://domena` ❌ BEZ `/journey/` |

---

## 🎯 Kluczowa zasada dla CORS_ORIGIN:

### ✅ POPRAWNIE:
```env
CORS_ORIGIN=https://malina.tail384b18.ts.net
```
Backend sprawdza **źródło żądania** (Origin header), które przeglądarki wysyłają jako:
- `Origin: https://malina.tail384b18.ts.net`

### ❌ BŁĘDNIE:
```env
CORS_ORIGIN=https://malina.tail384b18.ts.net/journey
```
To NIE zadziała, bo przeglądarka nigdy nie wyśle `Origin: https://domena/journey`

---

## 🔧 Przykłady dla Portainera

### Dla Nginx (TailScale + Reverse Proxy):
```env
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
NODE_ENV=production
IMAGE_TAG=latest
```

### Dla Direct Access (IP bez Nginx):
```env
FRONTEND_URL=http://100.103.184.90:5173
VITE_API_URL=http://100.103.184.90:5001/api
CORS_ORIGIN=http://100.103.184.90:5173
NODE_ENV=production
IMAGE_TAG=latest
```

---

## 🐛 Troubleshooting

### Problem: CORS error mimo poprawnej konfiguracji

**Sprawdź logi backendu:**
```bash
docker logs journey-planner-api
```

Powinno pokazać:
```
🔗 CORS Origin: https://malina.tail384b18.ts.net
```

**Jeśli pokazuje:**
```
🔗 CORS Origin: https://malina.tail384b18.ts.net/journey
```
❌ **To BŁĄD!** Usuń `/journey` z `CORS_ORIGIN`

---

### Problem: Frontend nie łączy się z API

**1. Sprawdź browser console (F12):**
```
Failed to fetch: https://malina.tail384b18.ts.net/journey/api/journeys
```

**2. Sprawdź czy Nginx routing działa:**
```bash
curl https://malina.tail384b18.ts.net/journey/api/health
```

**3. Sprawdź czy frontend został przebudowany z nowymi zmiennymi:**
```bash
# W Portainer: Update stack → ✅ Pull and redeploy
```

---

### Problem: Strona pokazuje ale API nie działa

**Przyczyna:** Frontend ma stare `VITE_API_URL` w bundle

**Rozwiązanie:**
1. Ustaw poprawne `VITE_API_URL` w Portainer Environment Variables
2. **Przebuduj frontend** (Pull and redeploy w Portainerze)
3. Frontend musi być rebuilowany, żeby `import.meta.env.VITE_API_URL` się zaktualizowało!

---

## ✅ Quick Checklist

### Dla Nginx deployment:
- [ ] `FRONTEND_URL` zawiera `/journey`
- [ ] `VITE_API_URL` zawiera `/journey/api`
- [ ] `CORS_ORIGIN` **NIE** zawiera `/journey` (tylko domena!)
- [ ] Nginx ma `location /journey/` i `location /journey/api/`
- [ ] Frontend przebudowany po zmianie zmiennych

### Dla Direct Access:
- [ ] `FRONTEND_URL` zawiera port `:5173`
- [ ] `VITE_API_URL` zawiera port `:5001/api`
- [ ] `CORS_ORIGIN` zawiera port `:5173`
- [ ] Porty 5173 i 5001 są dostępne z zewnątrz
- [ ] Firewall pozwala na połączenia

---

## 📚 Powiązane dokumenty

- **PORTAINER_ENV.md** - Konfiguracja zmiennych w Portainerze
- **NGINX_SETUP.md** - Szczegółowa konfiguracja Nginx
- **NGINX_QUICK_COPY.md** - Quick copy-paste dla Nginx

---

**Podsumowanie:**  
- **Z Nginx:** Dodaj `/journey` do FRONTEND_URL i VITE_API_URL, ale **NIE** do CORS_ORIGIN
- **Bez Nginx:** Używaj portów, **BEZ** `/journey` nigdzie
