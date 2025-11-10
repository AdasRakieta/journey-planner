#!/bin/bash
# Switch between direct access (ports) and Nginx (paths) configuration

echo "🔄 Journey Planner Environment Switcher"
echo ""
echo "Choose deployment mode:"
echo "  1) Direct access (ports 5001/5173) - No Nginx"
echo "  2) Nginx reverse proxy (/journey/ path)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
  1)
    echo ""
    echo "📝 Configuring for DIRECT ACCESS (no Nginx)..."
    echo ""
    echo "Update your .env with these values:"
    echo ""
    echo "FRONTEND_URL=http://YOUR_PI_IP:5173"
    echo "VITE_API_URL=http://YOUR_PI_IP:5001/api"
    echo "CORS_ORIGIN=http://YOUR_PI_IP:5173"
    echo ""
    echo "Access application at:"
    echo "  Frontend: http://YOUR_PI_IP:5173"
    echo "  Backend:  http://YOUR_PI_IP:5001/api"
    ;;
  
  2)
    echo ""
    echo "🔄 Configuring for NGINX REVERSE PROXY..."
    echo ""
    echo "Update your .env with these values:"
    echo ""
    echo "FRONTEND_URL=http://YOUR_PI_IP/journey"
    echo "VITE_API_URL=http://YOUR_PI_IP/journey/api"
    echo "CORS_ORIGIN=http://YOUR_PI_IP"
    echo ""
    echo "Access application at:"
    echo "  Frontend: http://YOUR_PI_IP/journey/"
    echo "  Backend:  http://YOUR_PI_IP/journey/api/"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "  1. Configure Nginx (see NGINX_SETUP.md)"
    echo "  2. Update .env with values above"
    echo "  3. Rebuild frontend: docker-compose up -d --build"
    ;;
  
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📋 Template files available:"
echo "  .env.example         - Direct access (ports)"
echo "  .env.nginx.example   - Nginx reverse proxy (paths)"
echo ""
echo "Copy the appropriate one:"
echo "  cp .env.nginx.example .env  # For Nginx"
echo "  cp .env.example .env         # For direct access"
echo ""
echo "Then edit with your actual values:"
echo "  nano .env"
echo ""
echo "After updating .env, rebuild:"
echo "  docker-compose down"
echo "  docker-compose up -d --build"
