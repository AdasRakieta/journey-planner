# 🚀 Quick Reference - Portainer Multi-Stack Deployment

## 📦 3 Stacki do Stworzenia w Portainerze

### 1️⃣ Stack: `traefik`
**Plik:** `portainer-stacks/1-traefik-stack.yml`  
**Environment Variables:** Nie wymagane  
**Deploy:** PIERWSZY (przed innymi)

### 2️⃣ Stack: `journey-planner`
**Plik:** `portainer-stacks/2-journey-planner-stack.yml`  
**Environment Variables:** `portainer-stacks/journey-planner.env`  
**URL:** https://malina.tail384b18.ts.net/journey  
**Login:** admin / admin123

### 3️⃣ Stack: `smarthome`
**Plik:** `portainer-stacks/3-smarthome-stack.yml`  
**Environment Variables:** `portainer-stacks/smarthome.env` (⚠️ EDYTUJ CREDENTIALS!)  
**URL:** https://malina.tail384b18.ts.net/smarthome

---

## ⚡ Szybki Deploy (Portainer)

### Stack 1: Traefik
1. Stacks → Add Stack
2. Name: `traefik`
3. Web editor → Wklej `1-traefik-stack.yml`
4. Deploy

### Stack 2: Journey Planner
1. Stacks → Add Stack
2. Name: `journey-planner`
3. Web editor → Wklej `2-journey-planner-stack.yml`
4. Environment variables → Wklej `journey-planner.env`
5. Deploy (⏱️ ~5-10 min pierwszego razu)

### Stack 3: SmartHome
1. Stacks → Add Stack
2. Name: `smarthome`
3. Web editor → Wklej `3-smarthome-stack.yml`
4. Environment variables → Wklej `smarthome.env`
   - ⚠️ **ZMIEŃ:** `SECRET_KEY`, `DB_PASSWORD`
5. Deploy

---

## 🌐 URLs

| Aplikacja | URL | Login |
|-----------|-----|-------|
| **Traefik Dashboard** | https://malina.tail384b18.ts.net/dashboard/ | Brak (public) |
| **Journey Planner** | https://malina.tail384b18.ts.net/journey | admin / admin123 |
| **SmartHome** | https://malina.tail384b18.ts.net/smarthome | Twoje credentials |

---

## 🔧 Kluczowe Environment Variables

### Journey Planner (NIE ZMIENIAJ):
```bash
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net  # BEZ /journey!
```

### SmartHome (DO ZMIANY):
```bash
SECRET_KEY=your_secret_key_here  # Wygeneruj nowy!
DB_PASSWORD=your_password         # Twoje hasło!
URL_PREFIX=                       # Puste! Traefik dodaje /smarthome
```

---

## 🐛 Quick Troubleshooting

### "network web not found"
```bash
docker network create web
```

### CORS errors w Journey Planner
Sprawdź: `CORS_ORIGIN=https://malina.tail384b18.ts.net` (BEZ /journey!)

### SmartHome 502 Bad Gateway
```bash
docker logs smarthome_app --tail 50
docker logs smarthome_redis_standalone
```

### Traefik nie widzi kontenera
```bash
docker network connect web <container-name>
docker restart <container-name>
```

---

## 📊 Status Check

```bash
# Wszystkie kontenery
docker ps --format "table {{.Names}}\t{{.Status}}"

# Sprawdź network
docker network inspect web | grep Name

# Test URLs
curl -I https://malina.tail384b18.ts.net/journey/api/health
curl -I https://malina.tail384b18.ts.net/smarthome/
```

---

## 🔄 Update Aplikacji

### Journey Planner:
Portainer → Stacks → journey-planner → Editor → Deploy → ☑️ Re-pull image

### SmartHome:
Portainer → Stacks → smarthome → Editor → Deploy → ☑️ Re-pull image

---

## ✅ Deployment Checklist

- [ ] PostgreSQL działa (192.168.1.218:5432)
- [ ] Baza `journey_planner` istnieje z userem `admin`
- [ ] Traefik stack deployed → Network `web` exists
- [ ] Journey Planner stack deployed → Login działa
- [ ] SmartHome stack deployed → Redis działa
- [ ] Wszystkie URLs dostępne przez HTTPS

---

**📚 Pełna dokumentacja:** `portainer-stacks/PORTAINER_DEPLOYMENT.md`
