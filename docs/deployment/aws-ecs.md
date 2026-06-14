# Deployment — AWS ECS (Fargate)

> Runs the Dockerized **static SPA** ([docker.md](docker.md)) on ECS Fargate behind an ALB. As with EC2, the backend remains on Supabase. **For a pure static SPA, ECS is overkill** — prefer CloudFront+S3 or a managed host unless you already standardize on ECS. This guide is provided for completeness as requested.

## Architecture
```
Route53 → ACM cert → ALB (443) → Target Group → ECS Service (Fargate task: solarsage-web:nginx)
                                                  └── pulls image from ECR
SPA → (browser) → Supabase (DB/auth/functions) → OpenAI
```

## Steps

### 1. Build & push image to ECR
```bash
aws ecr create-repository --repository-name solarsage-web
aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker build --build-arg VITE_SUPABASE_URL=$URL --build-arg VITE_SUPABASE_ANON_KEY=$ANON -t solarsage-web .
docker tag solarsage-web:latest <acct>.dkr.ecr.<region>.amazonaws.com/solarsage-web:<sha>
docker push <acct>.dkr.ecr.<region>.amazonaws.com/solarsage-web:<sha>
```

### 2. Task definition (Fargate)
- CPU/memory: 256/512 is ample (static Nginx).
- Container: the ECR image, port 80.
- **No secrets needed in the task** — the SPA only carries the public anon key baked at build time. (Do **not** put `OPENAI_API_KEY` or the service-role key here; they live in Supabase.)
- Log driver: `awslogs` → CloudWatch Logs.

```jsonc
{
  "family": "solarsage-web",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256", "memory": "512",
  "containerDefinitions": [{
    "name": "web",
    "image": "<acct>.dkr.ecr.<region>.amazonaws.com/solarsage-web:<sha>",
    "portMappings": [{ "containerPort": 80 }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": { "awslogs-group": "/ecs/solarsage-web", "awslogs-region": "<region>", "awslogs-stream-prefix": "web" }
    }
  }]
}
```

### 3. Service + ALB
- Create an ECS service (desired count 2 for HA) in private subnets.
- ALB in public subnets; HTTPS listener with an **ACM** certificate; target group health check `GET /` (200).
- Security groups: ALB allows 443 from the internet; tasks allow 80 only from the ALB SG.

### 4. DNS & TLS
- Route53 alias record → ALB. ACM cert validated via DNS.

### 5. Autoscaling
- Target tracking on ALB request count or CPU. Static serving scales cheaply.

### 6. CI/CD
- Pipeline: build image → push to ECR → `aws ecs update-service --force-new-deployment`. Rolling deploy with ALB draining.

### 7. Backend
Unchanged — Supabase CLI deploys DB/functions; secrets via `supabase secrets`.

## Cost/complexity reality check
ECS Fargate + ALB has a fixed monthly floor (ALB ~$16+/mo before traffic) to serve files a CDN would serve for cents. Choose ECS only if it fits existing org tooling. See the comparison in [managed-hosting.md](managed-hosting.md).
