# 🎯 Quick Start - Nginx Deployment (No Traefik)

## 📦 Pliki do Użycia

| Plik | Opis |
|------|------|
| `docker-compose-nginx.yml` | Stack definition (Journey + SmartHome + Nginx) |
| `nginx.conf` | Nginx configuration (routing /journey i /smarthome) |
| `stack-nginx.env` | Environment variables (dla Portainer) |
| `NGINX_DEPLOYMENT.md` | Pełna dokumentacja deployment |

## 🚀 Szybki Deploy (3 kroki)

### 1. Przygotuj Certyfikaty SSL (raz)

```bash
ssh adas.rakieta@192.168.1.218

# Skopiuj certyfikaty Tailscale
sudo mkdir -p /etc/ssl/tailscale
sudo cp /var/lib/tailscale/certs/malina.tail384b18.ts.net.* /etc/ssl/tailscale/
sudo chmod 644 /etc/ssl/tailscale/*.crt
sudo chmod 600 /etc/ssl/tailscale/*.key
```

### 2. Skopiuj Nginx Config

```bash
# Z local machine:
scp nginx.conf adas.rakieta@192.168.1.218:/home/adas.rakieta/

# Na RPi:
ssh adas.rakieta@192.168.1.218
sudo mv /home/adas.rakieta/nginx.conf /opt/nginx.conf
sudo chmod 644 /opt/nginx.conf
```

### 3. Deploy w Portainer

1. **Portainer → Stacks → Add stack**
2. **Name**: `journey-smarthome-nginx`
3. **Build method**: Git Repository
   - URL: `https://github.com/AdasRakieta/journey-planner`
   - Compose path: `docker-compose-nginx.yml`
4. **Environment variables**: Skopiuj z `stack-nginx.env`
5. **Deploy!**

## ✅ Weryfikacja

```bash
# Sprawdź kontenery
docker ps | grep -E "nginx-proxy|journey|smarthome"

# Test URLs
curl -k https://malina.tail384b18.ts.net/health
curl -k https://malina.tail384b18.ts.net/journey/api/health
```

## 🌐 URLs

- Journey Planner: https://malina.tail384b18.ts.net/journey/
- SmartHome: https://malina.tail384b18.ts.net/smarthome/
- Portainer: https://malina.tail384b18.ts.net/portainer/

## 📚 Dokumentacja

Pełna dokumentacja: **NGINX_DEPLOYMENT.md**

---

## 🔧 Ważne: Dostosuj SmartHome Image

W `docker-compose-nginx.yml` zmień:

```yaml
services:
  smarthome:
    image: ghcr.io/your-username/smarthome:latest  # ⚠️ ZMIEŃ!
```

---

## 💡 Dlaczego Nginx zamiast Traefik?

✅ **Prostsze** - jedna konfiguracja, jasne routing rules  
✅ **Stabilniejsze** - mniej warstw abstrakcji  
✅ **Łatwiejsze debugowanie** - standardowe logi Nginx  
✅ **Mniej zasobów** - lekki Alpine Nginx  
✅ **Sprawdzona technologia** - dokumentacja + community  

---

**Ready to deploy? Follow the 3 steps above! 🚀**
