# Server Hardening (AWS EC2) & Secrets Management

> Scope reminder: on EC2, the only workload is **Nginx serving static `dist/`**. There is **no Node/PM2 process** for SolarSage (the backend is Supabase). The Node/PM2 section is included per the spec and applies **only if** you later add a custom Node service.

## Linux hardening (Ubuntu 22.04)

### Non-root user + SSH keys only
```bash
adduser deploy && usermod -aG sudo deploy
# copy your public key:
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# put key in /home/deploy/.ssh/authorized_keys ; chmod 600
```
`/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
AllowUsers deploy
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 20
```
```bash
sudo systemctl restart ssh
```

### UFW firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH         # or: ufw allow 22/tcp (better: restrict to your IP)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Fail2Ban (SSH brute-force)
```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
[sshd]
enabled = true
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
sudo systemctl enable --now fail2ban
```

### General
- `unattended-upgrades` for security patches; `sudo apt update && apt upgrade` regularly.
- Disable unused services; mount `/tmp` `noexec,nosuid` if feasible; enable auditd.

## Nginx hardening

### TLS (Mozilla "intermediate")
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:MozSSL:10m;
ssl_stapling on; ssl_stapling_verify on;
```
Use Certbot for the cert (see [aws-ec2.md](../deployment/aws-ec2.md)).

### Security headers + hide version
```nginx
server_tokens off;
# include the add_header block from docs/security/security-headers.md
```

### Rate limiting at the edge
```nginx
limit_req_zone $binary_remote_addr zone=spa:10m rate=20r/s;
server {
  location / {
    limit_req zone=spa burst=40 nodelay;
    try_files $uri $uri/ /index.html;
  }
}
```
This is a coarse front-line limit; the fine-grained per-user/route limits live in the edge functions ([rate-limiting.md](rate-limiting.md)).

### Reverse-proxy protections (only if proxying an API)
```nginx
proxy_hide_header X-Powered-By;
client_max_body_size 12m;          # matches the 10 MB upload cap + overhead
proxy_read_timeout 30s;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Node.js hardening (only if a custom Node service is added)
- Run as the non-root `deploy` user; never as root.
- **PM2**: `pm2 start app.js -i max --max-memory-restart 512M`; `pm2 startup` + `pm2 save`.
- Graceful shutdown: handle `SIGTERM`/`SIGINT`, drain the server, then exit.
- Set `NODE_ENV=production`; set explicit `--max-old-space-size`.
- Never log secrets; load config from env / Secrets Manager (below).

## Secrets management

### Inventory
| Secret | Where it must live | Where it must NEVER be |
|--------|--------------------|------------------------|
| `OPENAI_API_KEY` | Supabase function secrets | client bundle, git |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (auto) / function env | client bundle, git |
| `ALLOWED_ORIGINS` | Supabase function secrets | — (not secret, but env-managed) |
| Supabase **anon** key | client bundle (public by design) | — |
| DB credentials | managed by Supabase | app code |

### Strategy
1. **No hardcoded secrets in git.** Verified: the only key in source is the **public anon key** ([client.ts](../../src/integrations/supabase/client.ts)); service-role and OpenAI keys are read from env in the functions via `requireEnv` (fail-fast). `.env*` is gitignored; `.env.example` ships placeholders only.
2. **Supabase secrets** for function env: `supabase secrets set OPENAI_API_KEY=… ALLOWED_ORIGINS=…`.
3. **If self-hosting any Node service on AWS**: store secrets in **AWS Secrets Manager** (rotation) or **SSM Parameter Store** (SecureString); grant the instance an IAM role with least-privilege `secretsmanager:GetSecretValue` and fetch at boot — never bake into the AMI or env files on disk.
4. **Rotation**: rotate `OPENAI_API_KEY` and the service-role key before go-live (they may have been shared in dev) and on any suspected exposure.

### Verify no secrets committed
```bash
git grep -nE "sk-[A-Za-z0-9]|service_role|SERVICE_ROLE_KEY" -- . ':!docs' ':!*.md'
# should return nothing but the public anon JWT in client.ts
```

## Post-hardening checklist
- [ ] SSH: keys only, root disabled, Fail2Ban active
- [ ] UFW: only 22/80/443 (22 ideally IP-restricted)
- [ ] TLS A+ (ssllabs), HSTS preload
- [ ] All security headers present (securityheaders.com A+)
- [ ] Nginx `limit_req` enabled, `server_tokens off`
- [ ] Secrets in Supabase/Secrets Manager, none in git, rotated
- [ ] Auto security updates enabled
