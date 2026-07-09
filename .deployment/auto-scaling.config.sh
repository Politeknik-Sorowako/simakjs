#!/bin/bash

# ===========================================
# SIMAK Vokasi - Auto-Scaling Configuration
# ===========================================
# EXPERIMENTAL: This is a template for auto-scaling
# Requires Docker Swarm or Kubernetes for production use.
# With standard docker-compose, manual intervention is needed.

# Enable/disable auto-scaling
AUTO_SCALING_ENABLED=false

# Scaling limits
MIN_REPLICAS=1
MAX_REPLICAS=3

# Scale up thresholds (percentage)
SCALE_UP_CPU_THRESHOLD=70
SCALE_UP_MEM_THRESHOLD=80
SCALE_UP_COOLDOWN=300  # seconds between scale up operations

# Scale down thresholds (percentage)
SCALE_DOWN_CPU_THRESHOLD=30
SCALE_DOWN_MEM_THRESHOLD=40
SCALE_DOWN_COOLDOWN=600  # seconds between scale down operations

# Check interval (seconds)
CHECK_INTERVAL=30

# Services to monitor (comma separated)
SERVICES_TO_MONITOR="simak_backend,simak_frontend"

# Scale command template (adjust for your orchestration)
# Docker Compose: Just restart the service
# Docker Swarm: docker service scale <service>=<replicas>
# Kubernetes: kubectl scale deployment/<deployment> --replicas=<replicas>
SCALE_UP_COMMAND="docker compose up -d --no-deps --scale backend=%replicas% backend"
SCALE_DOWN_COMMAND="docker compose up -d --no-deps --scale backend=%replicas% backend"

# Notification on scale events
NOTIFY_ON_SCALE=true
