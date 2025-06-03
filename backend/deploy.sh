#!/bin/bash

# Build the Docker image
docker build -t quaiqi-backend:latest .

# Load the image into minikube (if using minikube)
if command -v minikube &> /dev/null; then
    minikube image load quaiqi-backend:latest
fi

# Apply the Kubernetes manifests
kubectl apply -f k8s/deployment.yaml

# Wait for deployment to be ready
kubectl rollout status deployment/quaiqi-backend

echo "Backend deployment completed!" 