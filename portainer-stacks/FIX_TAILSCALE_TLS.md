# 🔧 Fix: Tailscale TLS Certificate Error

## Problem
```
Domain: malina.tail384b18.ts.net
Error: Could not retrieve status from machine
Status: Loading
```

## Przyczyna
Tailscale na malinie nie odpowiada lub HTTPS nie jest włączony dla tej maszyny.

---

## ✅ Rozwiązanie (na Raspberry Pi)

### Krok 1: Sprawdź status Tailscale
```bash
ssh malina
sudo tailscale status
```

Powinieneś zobaczyć:
```
malina                  malina.tail384b18.ts.net    linux   active; ...
```

---

### Krok 2: Sprawdź czy HTTPS jest włączony
```bash
sudo tailscale serve status
```

Jeśli puste, **HTTPS nie jest skonfigurowany!**

---

### Krok 3: Włącz HTTPS dla maliny (KLUCZOWE!)

Tailscale **automatycznie** zapewnia HTTPS, ale musisz powiedzieć, który port ma być wystawiony:

```bash
# Włącz HTTPS na porcie 80 (Traefik)
sudo tailscale serve https / http://127.0.0.1:80

# Lub jeśli Traefik jest na localhost:80
sudo tailscale serve https / proxy 80
```

To spowoduje:
- ✅ Tailscale automatycznie pobierze certyfikat TLS
- ✅ `https://malina.tail384b18.ts.net` → przekierowanie na `localhost:80` (Traefik)
- ✅ Błąd "Could not retrieve status from machine" zniknie

---

### Krok 4: Zweryfikuj konfigurację
```bash
sudo tailscale serve status
```

Powinieneś zobaczyć:
```
https://malina.tail384b18.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:80
```

---

### Krok 5: Test w przeglądarce
```
https://malina.tail384b18.ts.net
```

Powinieneś zobaczyć Traefik dashboard lub błąd 404 (to OK - znaczy że Traefik działa).

---

## 🔄 Alternatywa: Tailscale Funnel (Publiczny dostęp)

Jeśli chcesz udostępnić malina.tail384b18.ts.net **publicznie** (bez VPN):

```bash
# Włącz funnel (publiczny dostęp)
sudo tailscale funnel 80

# Sprawdź status
sudo tailscale serve status
```

To otworzy malina.tail384b18.ts.net dla całego internetu (nie tylko Tailscale VPN).

---

## 🐛 Jeśli dalej nie działa

### Sprawdź czy Tailscale jest aktywny
```bash
sudo systemctl status tailscaled
```

Jeśli nie działa:
```bash
sudo systemctl start tailscaled
sudo systemctl enable tailscaled
```

### Sprawdź czy port 80 jest otwarty
```bash
sudo netstat -tlnp | grep :80
```

Powinieneś zobaczyć Traefik lub nginx.

### Sprawdź czy Traefik działa
```bash
docker ps | grep traefik
curl http://localhost:80
```

---

## 📝 Podsumowanie

**Problem:** Tailscale nie wie, że ma udostępnić HTTPS dla maliny.

**Rozwiązanie:**
```bash
sudo tailscale serve https / http://127.0.0.1:80
```

To automatycznie:
- Pobierze certyfikat TLS od Tailscale
- Przekieruje `https://malina.tail384b18.ts.net` → `localhost:80` (Traefik)
- Naprawi błąd "Could not retrieve status from machine"

**Po tej komendzie Traefik będzie dostępny przez HTTPS!**
