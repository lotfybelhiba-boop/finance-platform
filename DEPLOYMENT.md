# 🚀 Guide de Déploiement : Mynds Finance sur VPS OVH

Ce document détaille les étapes pour déployer l'application **Mynds Finance** (Frontend Vite + Backend Node.js/PostgreSQL) sur un serveur VPS OVH sous Ubuntu/Debian.

---

## 1. Préparation du Serveur
Connectez-vous à votre VPS via SSH :
```bash
ssh root@votre_ip_vps
```

Mettez à jour le système et installez les outils de base :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

---

## 2. Installation de Node.js et PM2
Installez Node.js (Version 20+ recommandée) :
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Installez **PM2** pour gérer les processus en arrière-plan :
```bash
sudo npm install -g pm2
```

---

## 3. Installation et Configuration de PostgreSQL
Installez PostgreSQL :
```bash
sudo apt install -y postgresql postgresql-contrib
```

Créez la base de données et l'utilisateur :
```bash
sudo -u postgres psql
```
Dans l'invite PostgreSQL :
```sql
CREATE DATABASE mynds_finance;
CREATE USER mynds_user WITH PASSWORD 'votre_mot_de_passe_robuste';
GRANT ALL PRIVILEGES ON DATABASE mynds_finance TO mynds_user;
\q
```

---

## 4. Déploiement de l'Application
Clonez votre dépôt GitHub :
```bash
git clone https://github.com/lotfybelhiba-boop/finance-platform.git
cd finance-platform
```

### A. Configuration du Backend
```bash
cd server
npm install
```

Créez le fichier `.env` :
```bash
nano .env
```
Ajoutez les variables suivantes :
```env
DATABASE_URL="postgresql://mynds_user:votre_mot_de_passe_robuste@localhost:5432/mynds_finance?schema=public"
PORT=5000
NODE_ENV=production
```

Initialisez la base de données avec Prisma :
```bash
npx prisma migrate deploy
npx prisma generate
```

Lancez le serveur avec PM2 :
```bash
pm2 start src/server.js --name "mynds-backend"
pm2 save
```

### B. Configuration du Frontend
```bash
cd ..
npm install
```

Créez le fichier `.env` (si nécessaire pour pointer vers l'API du VPS) :
```bash
nano .env
```
Exemple : `VITE_API_URL=https://api.votre-domaine.com`

Générez le build de production :
```bash
npm run build
```
Les fichiers statiques seront dans le dossier `dist/`.

---

## 5. Configuration de Nginx (Serveur Web & Reverse Proxy)
Installez Nginx :
```bash
sudo apt install -y nginx
```

Créez une configuration pour votre site :
```bash
sudo nano /etc/nginx/sites-available/mynds-finance
```

Copiez ce modèle (remplacez `votre-domaine.com`) :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Frontend (Fichiers statiques)
    location / {
        root /root/finance-platform/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API (Reverse Proxy)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez la configuration et redémarrez Nginx :
```bash
sudo ln -s /etc/nginx/sites-available/mynds-finance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Sécurisation avec SSL (HTTPS)
Installez Certbot :
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Générez le certificat :
```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## 7. Maintenance Utile
*   **Logs Backend :** `pm2 logs mynds-backend`
*   **Redémarrer :** `pm2 restart mynds-backend`
*   **Mise à jour du code :** 
    ```bash
    git pull
    npm run build (pour le frontend)
    pm2 restart mynds-backend (pour le backend)
    ```

---
*Document généré par Antigravity pour Lotfi Belhiba.*
