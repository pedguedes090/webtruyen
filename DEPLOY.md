# Deployment Guide

## Quick Start (VPS)

### 1. Clone và cài đặt dependencies

```bash
git clone <your-repo> /var/www/comic-app
cd /var/www/comic-app

# Install dependencies cho cả 3 services
cd server && npm install
cd ../image-server && npm install
cd ../client && npm install
```

### 2. Cấu hình Environment

```bash
# Copy templates
cp server/.env.example server/.env
cp image-server/.env.example image-server/.env

# Tạo JWT secrets (dùng cùng 1 giá trị cho ADMIN_JWT_SECRET ở cả 2 file!)
openssl rand -base64 32  # Copy output này
```

**Chỉnh sửa `server/.env`:**
```bash
ADMIN_USERNAME=your_admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=random-string-1
ADMIN_JWT_SECRET=random-string-2    # <-- Copy giá trị này
```

**Chỉnh sửa `image-server/.env`:**
```bash
JWT_SECRET=random-string-2          # <-- Paste cùng giá trị với ADMIN_JWT_SECRET
UPLOAD_DIR=/var/www/comics-images
```

### 3. Build Client

```bash
cd client

# Chỉnh sửa .env.production
# VITE_IMAGE_SERVER_URL=https://img.your-domain.com

npm run build
```

### 4. Start với PM2

```bash
cd /var/www/comic-app

# Tạo logs folder
mkdir -p logs

# Start cả 2 servers
pm2 start ecosystem.config.cjs

# Lưu config để auto-restart
pm2 save
pm2 startup
```

### 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/comic

# Main app
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/comic-app/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Image server (subdomain)
server {
    listen 80;
    server_name img.your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }
}
```

## PM2 Commands

```bash
pm2 status              # Xem trạng thái
pm2 logs                # Xem logs
pm2 restart all         # Restart tất cả
pm2 reload all          # Zero-downtime reload
```

## SSL với Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d img.your-domain.com
```
