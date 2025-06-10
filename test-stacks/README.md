# Test Docker Stacks for Network Management Development

This directory contains various docker-compose stacks to simulate a real-world multi-stack environment for testing Traefik UI's network management capabilities.

## Quick Setup

1. **Create the shared external network first:**
   ```bash
   cd test-stacks
   docker compose -f shared-network.yml up -d
   ```

2. **Start all test stacks:**
   ```bash
   docker compose -f app-stack.yml up -d
   docker compose -f microservices-stack.yml up -d
   docker compose -f monitoring-stack.yml up -d
   docker compose -f legacy-stack.yml up -d
   ```

3. **View all networks:**
   ```bash
   docker network ls
   ```

## Network Topology

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   app-network   │───▶│  shared-network  │◀───│microservices-   │
│                 │    │   (external)     │    │    network      │
│ - app-frontend  │    │                  │    │ - auth-service  │
│ - app-backend   │    │                  │    │ - user-service  │
│ - app-database  │    │                  │    │ - notification  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ legacy-network  │    │ backend-network  │◀───│ monitoring-     │
│                 │    │                  │    │   network       │
│ - legacy-web    │    │ - message-queue  │    │ - prometheus    │
│ - legacy-db     │    │ - prometheus     │    │ - grafana       │
│ - legacy-cache  │    │                  │    │ - alertmanager  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│isolated-network │
│   (internal)    │
│ - legacy-db     │
└─────────────────┘
```

## Networks Created

- **shared-network**: External network for cross-stack communication
- **app-network**: Application stack network
- **microservices-network**: Microservices stack network  
- **monitoring-network**: Monitoring stack network
- **backend-network**: Backend services network
- **legacy-network**: Legacy application network
- **isolated-network**: Internal/isolated network

## Services with Traefik Labels

- `app.local` → app-frontend
- `api.app.local` → app-backend
- `auth.microservices.local` → auth-service
- `users.microservices.local` → user-service
- `notifications.microservices.local` → notification-service
- `prometheus.monitoring.local` → prometheus
- `grafana.monitoring.local` → grafana
- `alerts.monitoring.local` → alertmanager
- `legacy.local` → legacy-web

## Cleanup

```bash
docker compose -f app-stack.yml down
docker compose -f microservices-stack.yml down
docker compose -f monitoring-stack.yml down
docker compose -f legacy-stack.yml down
docker compose -f shared-network.yml down
```