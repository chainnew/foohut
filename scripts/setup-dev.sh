#!/usr/bin/env bash

# =============================================================================
# Foohut Development Environment Setup Script
# =============================================================================
# This script sets up the local development environment for the Foohut project.
# It checks for required dependencies, installs packages, and starts services.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check minimum version
version_gte() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Print banner
print_banner() {
    echo ""
    echo "  _____ ___   ___  _   _ _   _ _____ "
    echo " |  ___/ _ \ / _ \| | | | | | |_   _|"
    echo " | |_ | | | | | | | |_| | | | | | |  "
    echo " |  _|| |_| | |_| |  _  | |_| | | |  "
    echo " |_|   \___/ \___/|_| |_|\___/  |_|  "
    echo ""
    echo " Development Environment Setup"
    echo " =============================="
    echo ""
}

# Check required dependencies
check_dependencies() {
    log_info "Checking required dependencies..."

    local missing_deps=()

    # Check Node.js
    if command_exists node; then
        local node_version
        node_version=$(node -v | sed 's/v//')
        if version_gte "$node_version" "20.0.0"; then
            log_success "Node.js $node_version installed"
        else
            log_warning "Node.js version $node_version found, but 20.x+ is recommended"
        fi
    else
        missing_deps+=("node")
        log_error "Node.js is not installed"
    fi

    # Check pnpm
    if command_exists pnpm; then
        local pnpm_version
        pnpm_version=$(pnpm -v)
        log_success "pnpm $pnpm_version installed"
    else
        log_warning "pnpm is not installed, will attempt to install"
        if command_exists npm; then
            npm install -g pnpm
            log_success "pnpm installed via npm"
        else
            missing_deps+=("pnpm")
        fi
    fi

    # Check Docker
    if command_exists docker; then
        local docker_version
        docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        log_success "Docker $docker_version installed"

        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
        else
            log_error "Docker daemon is not running. Please start Docker Desktop."
            missing_deps+=("docker-daemon")
        fi
    else
        missing_deps+=("docker")
        log_error "Docker is not installed"
    fi

    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose is available"
    else
        missing_deps+=("docker-compose")
        log_error "Docker Compose is not installed"
    fi

    # Check Git
    if command_exists git; then
        local git_version
        git_version=$(git --version | awk '{print $3}')
        log_success "Git $git_version installed"
    else
        missing_deps+=("git")
        log_error "Git is not installed"
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and run this script again."
        exit 1
    fi

    log_success "All required dependencies are installed"
}

# Create environment files
create_env_files() {
    log_info "Creating environment files..."

    # Root .env file for Docker Compose
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cat > "$PROJECT_ROOT/.env" << 'EOF'
# Docker Compose Environment Variables
# =====================================
# Copy this file and modify as needed

# PostgreSQL
POSTGRES_USER=foohut
POSTGRES_PASSWORD=foohut_dev_password
POSTGRES_DB=foohut
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=foohut_redis_dev
REDIS_PORT=6379

# Backend
BACKEND_PORT=3000
JWT_SECRET=dev_jwt_secret_change_in_production_minimum_32_chars
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_change_in_production_min_32

# Frontend
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Optional Tools
PGADMIN_EMAIL=admin@foohut.com
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
REDIS_COMMANDER_PORT=8081
MAILHOG_SMTP_PORT=1025
MAILHOG_WEB_PORT=8025
EOF
        log_success "Created root .env file"
    else
        log_info "Root .env file already exists, skipping"
    fi

    # Backend .env file
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        mkdir -p "$PROJECT_ROOT/backend"
        cat > "$PROJECT_ROOT/backend/.env" << 'EOF'
# Backend Environment Variables
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://foohut:foohut_dev_password@localhost:5432/foohut

# Redis
REDIS_URL=redis://:foohut_redis_dev@localhost:6379

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production_minimum_32_chars
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_change_in_production_min_32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug

# Email (using Mailhog in development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@foohut.com
EOF
        log_success "Created backend .env file"
    else
        log_info "Backend .env file already exists, skipping"
    fi

    # Frontend .env file
    if [ ! -f "$PROJECT_ROOT/frontend/.env" ]; then
        mkdir -p "$PROJECT_ROOT/frontend"
        cat > "$PROJECT_ROOT/frontend/.env" << 'EOF'
# Frontend Environment Variables
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME=Foohut
VITE_APP_VERSION=dev
EOF
        log_success "Created frontend .env file"
    else
        log_info "Frontend .env file already exists, skipping"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing project dependencies..."

    cd "$PROJECT_ROOT"

    # Install root dependencies
    if [ -f "package.json" ]; then
        pnpm install
        log_success "Installed root dependencies"
    fi

    # Install backend dependencies
    if [ -f "backend/package.json" ]; then
        cd "$PROJECT_ROOT/backend"
        pnpm install
        log_success "Installed backend dependencies"
    fi

    # Install frontend dependencies
    if [ -f "frontend/package.json" ]; then
        cd "$PROJECT_ROOT/frontend"
        pnpm install
        log_success "Installed frontend dependencies"
    fi

    cd "$PROJECT_ROOT"
}

# Start Docker services
start_docker_services() {
    log_info "Starting Docker services..."

    cd "$PROJECT_ROOT"

    # Pull images
    docker compose pull

    # Start services
    docker compose up -d postgres redis

    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker compose exec -T postgres pg_isready -U foohut -d foohut >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done

    if [ $retries -eq 0 ]; then
        log_error "PostgreSQL failed to start"
        exit 1
    fi

    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    retries=30
    while [ $retries -gt 0 ]; do
        if docker compose exec -T redis redis-cli -a foohut_redis_dev ping >/dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done

    if [ $retries -eq 0 ]; then
        log_error "Redis failed to start"
        exit 1
    fi

    log_success "Docker services are running"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    cd "$PROJECT_ROOT/backend"

    if [ -f "package.json" ] && grep -q "db:migrate" "package.json"; then
        pnpm db:migrate
        log_success "Database migrations completed"
    else
        log_warning "No migration script found, skipping"
    fi

    cd "$PROJECT_ROOT"
}

# Setup Git hooks
setup_git_hooks() {
    log_info "Setting up Git hooks..."

    cd "$PROJECT_ROOT"

    # Install husky if available
    if [ -f "package.json" ] && grep -q "husky" "package.json"; then
        pnpm exec husky install 2>/dev/null || true
        log_success "Git hooks configured"
    else
        log_info "Husky not configured, skipping Git hooks setup"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "=============================================="
    log_success "Development environment setup complete!"
    echo "=============================================="
    echo ""
    echo "Services running:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo ""
    echo "To start development servers:"
    echo "  Backend:  cd backend && pnpm dev"
    echo "  Frontend: cd frontend && pnpm dev"
    echo ""
    echo "Or use Docker Compose for full stack:"
    echo "  docker compose up"
    echo ""
    echo "Optional development tools:"
    echo "  docker compose --profile tools up -d"
    echo "  - pgAdmin: http://localhost:5050"
    echo "  - Redis Commander: http://localhost:8081"
    echo "  - Mailhog: http://localhost:8025"
    echo ""
    echo "Useful commands:"
    echo "  pnpm lint          - Run linter"
    echo "  pnpm test          - Run tests"
    echo "  pnpm typecheck     - Type checking"
    echo "  pnpm build         - Build for production"
    echo ""
}

# Main function
main() {
    print_banner

    # Parse arguments
    local skip_deps=false
    local skip_docker=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                skip_deps=true
                shift
                ;;
            --skip-docker)
                skip_docker=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-deps    Skip dependency installation"
                echo "  --skip-docker  Skip Docker services startup"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    check_dependencies
    create_env_files

    if [ "$skip_deps" = false ]; then
        install_dependencies
    fi

    if [ "$skip_docker" = false ]; then
        start_docker_services
        run_migrations
    fi

    setup_git_hooks
    print_summary
}

# Run main function
main "$@"
