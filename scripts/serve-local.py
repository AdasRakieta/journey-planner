#!/usr/bin/env python3
"""
Journey Planner - Local Development Server
==========================================

Skrypt do lokalnego hostowania aplikacji Journey Planner.
Służy do szybkiego testowania bez pełnego deploymentu.

Użycie:
    python scripts/serve-local.py [--frontend-only] [--port PORT]

Opcje:
    --frontend-only    Hostuj tylko frontend (wymaga zbudowanej aplikacji)
    --port PORT        Port dla serwera (domyślnie 8000)
    --help            Pokaż tę pomoc

Przykłady:
    python scripts/serve-local.py                    # Hostuj frontend na porcie 8000
    python scripts/serve-local.py --port 3000        # Hostuj na porcie 3000
    python scripts/serve-local.py --frontend-only    # Tylko frontend
"""

import http.server
import socketserver
import argparse
import os
import sys
import subprocess
from pathlib import Path

class Colors:
    """ANSI color codes dla czytelnego outputu"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_banner():
    """Wyświetl banner z logo"""
    banner = f"""
{Colors.OKCYAN}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🗺️  JOURNEY PLANNER - LOCAL SERVER 🗺️              ║
║                                                           ║
║              Development & Testing Environment            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝{Colors.ENDC}
    """
    print(banner)

def check_prerequisites():
    """Sprawdź czy aplikacja jest zbudowana"""
    client_dist = Path(__file__).parent.parent / "client" / "dist"
    
    if not client_dist.exists():
        print(f"{Colors.FAIL}❌ Błąd: Folder client/dist nie istnieje!{Colors.ENDC}")
        print(f"{Colors.WARNING}Najpierw zbuduj aplikację:{Colors.ENDC}")
        print(f"  cd client")
        print(f"  npm run build")
        return False
    
    index_html = client_dist / "index.html"
    if not index_html.exists():
        print(f"{Colors.FAIL}❌ Błąd: Brak pliku client/dist/index.html!{Colors.ENDC}")
        print(f"{Colors.WARNING}Zbuduj aplikację ponownie.{Colors.ENDC}")
        return False
    
    return True

def check_backend_running(port=5001):
    """Sprawdź czy backend działa"""
    try:
        import urllib.request
        response = urllib.request.urlopen(f'http://localhost:{port}/api/health', timeout=2)
        if response.status == 200:
            return True
    except:
        return False
    return False

def start_frontend_server(port=8000):
    """Uruchom prosty HTTP server dla frontendu"""
    client_dist = Path(__file__).parent.parent / "client" / "dist"
    
    print(f"\n{Colors.OKGREEN}✅ Przygotowanie serwera...{Colors.ENDC}")
    print(f"{Colors.OKBLUE}📁 Katalog: {client_dist}{Colors.ENDC}")
    print(f"{Colors.OKBLUE}🔌 Port: {port}{Colors.ENDC}\n")
    
    os.chdir(client_dist)
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    # Custom handler dla SPA (Single Page Application)
    class SPAHandler(Handler):
        def do_GET(self):
            # Dla SPA, wszystkie nieistniejące pliki przekieruj do index.html
            if self.path != '/' and not os.path.exists(self.path[1:]):
                self.path = '/index.html'
            return super().do_GET()
        
        def log_message(self, format, *args):
            # Bardziej czytelne logi
            print(f"{Colors.OKCYAN}[{self.log_date_time_string()}]{Colors.ENDC} {format % args}")
    
    try:
        with socketserver.TCPServer(("", port), SPAHandler) as httpd:
            print(f"{Colors.OKGREEN}{Colors.BOLD}✅ Serwer uruchomiony!{Colors.ENDC}\n")
            print(f"🌐 Frontend: {Colors.OKGREEN}{Colors.BOLD}http://localhost:{port}{Colors.ENDC}")
            
            # Sprawdź backend
            backend_port = 5001
            if check_backend_running(backend_port):
                print(f"🔌 Backend:  {Colors.OKGREEN}{Colors.BOLD}http://localhost:{backend_port}/api{Colors.ENDC} ✅")
            else:
                print(f"🔌 Backend:  {Colors.WARNING}http://localhost:{backend_port}/api{Colors.ENDC} ⚠️  (nie działa)")
                print(f"\n{Colors.WARNING}⚠️  UWAGA: Backend nie jest uruchomiony!{Colors.ENDC}")
                print(f"{Colors.WARNING}   Uruchom backend w osobnym terminalu:{Colors.ENDC}")
                print(f"   cd server && npm run dev\n")
            
            print(f"\n{Colors.OKCYAN}💡 Porady:{Colors.ENDC}")
            print(f"   • Naciśnij Ctrl+C aby zatrzymać serwer")
            print(f"   • Otwórz http://localhost:{port} w przeglądarce")
            print(f"   • Sprawdź DevTools (F12) jeśli są problemy\n")
            
            print(f"{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}\n")
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}⏹️  Zatrzymywanie serwera...{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✅ Serwer zatrzymany pomyślnie!{Colors.ENDC}\n")
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048 or e.errno == 48:  # Port zajęty (Windows/Unix)
            print(f"\n{Colors.FAIL}❌ Błąd: Port {port} jest zajęty!{Colors.ENDC}")
            print(f"{Colors.WARNING}Spróbuj użyć innego portu:{Colors.ENDC}")
            print(f"  python scripts/serve-local.py --port 3000\n")
        else:
            print(f"\n{Colors.FAIL}❌ Błąd: {e}{Colors.ENDC}\n")
        sys.exit(1)

def show_full_setup_instructions():
    """Pokaż pełne instrukcje uruchomienia"""
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}📚 PEŁNY PRZEWODNIK URUCHOMIENIA{Colors.ENDC}\n")
    
    print(f"{Colors.BOLD}Metoda 1: Docker Compose (Zalecana) ⭐{Colors.ENDC}")
    print(f"  1. docker-compose up -d postgres")
    print(f"  2. npm run install:all")
    print(f"  3. npm run dev")
    print(f"  4. Otwórz http://localhost:5173\n")
    
    print(f"{Colors.BOLD}Metoda 2: Python HTTP Server (ten skrypt){Colors.ENDC}")
    print(f"  1. npm run build:all")
    print(f"  2. cd server && npm run dev          (Terminal 1)")
    print(f"  3. python scripts/serve-local.py     (Terminal 2)")
    print(f"  4. Otwórz http://localhost:8000\n")
    
    print(f"{Colors.BOLD}Metoda 3: Osobne terminale{Colors.ENDC}")
    print(f"  Terminal 1: cd server && npm run dev")
    print(f"  Terminal 2: cd client && npm run dev")
    print(f"  Terminal 3: docker-compose up postgres\n")
    
    print(f"{Colors.OKCYAN}💡 Porady:{Colors.ENDC}")
    print(f"  • Backend zawsze na porcie 5001 (NIE 5000!)")
    print(f"  • Frontend dev na porcie 5173")
    print(f"  • PostgreSQL na porcie 5432")
    print(f"  • Sprawdź logi jeśli są problemy\n")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Journey Planner - Local Development Server',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Przykłady:
  python scripts/serve-local.py                    # Domyślnie port 8000
  python scripts/serve-local.py --port 3000        # Custom port
  python scripts/serve-local.py --help             # Pokaż pomoc
  python scripts/serve-local.py --full-guide       # Pełny przewodnik
        """
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=8000,
        help='Port dla serwera (domyślnie: 8000)'
    )
    
    parser.add_argument(
        '--frontend-only',
        action='store_true',
        help='Hostuj tylko frontend (wymaga zbudowanej aplikacji)'
    )
    
    parser.add_argument(
        '--full-guide',
        action='store_true',
        help='Pokaż pełny przewodnik uruchomienia'
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    if args.full_guide:
        show_full_setup_instructions()
        return
    
    # Sprawdź czy aplikacja jest zbudowana
    if not check_prerequisites():
        print(f"\n{Colors.WARNING}💡 Potrzebujesz pomocy? Użyj:{Colors.ENDC}")
        print(f"  python scripts/serve-local.py --full-guide\n")
        sys.exit(1)
    
    # Uruchom frontend server
    start_frontend_server(args.port)

if __name__ == '__main__':
    main()
