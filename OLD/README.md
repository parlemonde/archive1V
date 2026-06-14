# 1Village archive helper

This is a NodeJS tool to archive 1Village activities.
All the details are explained in the wiki : https://github.com/parlemonde/archive1V/wiki

## Configuration

### Variables d'environnement requises

Pour fonctionner correctement, l'application nécessite les variables d'environnement suivantes :

```
# Configuration de l'environnement
CURRENT_ENV=staging    # ou 'prod' pour l'environnement de production
YEAR=2023              # Année de l'archive

# URL du site à archiver
URL_TO_ARCHIVE=https://1village.io

# Identifiants de connexion
ADMIN_USERNAME=username
ADMIN_PASSWORD=password

# Configuration AWS S3
S3_ACCESS_KEY=access_key_id
S3_SECRET_KEY=secret_access_key
S3_BUCKET_NAME=bucket_name
```

### Fichier resources.json

L'application utilise un fichier `resources.json` pour stocker les ressources archivées. Ce fichier doit exister (même vide) avant de lancer l'application.

## Exécution locale

1. **Cloner le dépôt**

   ```bash
   git clone https://github.com/parlemonde/archive1V.git
   cd archive1V
   ```

2. **Installer les dépendances**

   ```bash
   yarn install
   ```

3. **Créer un fichier .env**

   ```bash
   cp .env.example .env
   # Éditer le fichier .env avec vos informations
   ```

4. **Créer le fichier resources.json initial**

   ```bash
   yarn create-resources
   ```

5. **Lancer l'application**

   ```bash
   yarn start
   ```

   Ou utiliser la commande qui crée automatiquement les fichiers nécessaires :

   ```bash
   yarn start:local
   ```

## GitHub Actions

L'application peut être exécutée via GitHub Actions pour l'archivage automatisé.

### Workflow Staging

Le workflow `archive-staging.yml` archive le site dans l'environnement de staging.

### Workflow Production

Le workflow `archive-prod.yml` archive le site dans l'environnement de production.

### Configuration requise

Dans GitHub Actions, configurez les variables et secrets suivants :

#### Variables

- `URL_TO_ARCHIVE_STAGING` et `URL_TO_ARCHIVE_PROD`
- `S3_BUCKET_NAME_STAGING` et `S3_BUCKET_NAME_PROD`
- `YEAR`

#### Secrets

- `ADMIN_USERNAME_STAGING` et `ADMIN_USERNAME_PROD`
- `ADMIN_PASSWORD_STAGING` et `ADMIN_PASSWORD_PROD`
- `AWS_ACCESS_KEY_ID_STAGING` et `AWS_ACCESS_KEY_ID_PROD`
- `AWS_SECRET_ACCESS_KEY_STAGING` et `AWS_SECRET_ACCESS_KEY_PROD`

## Dépannage

### Erreur "resources.json not found"

Assurez-vous que le fichier `resources.json` existe avant de lancer l'application :

```bash
yarn create-resources
```

### Problèmes avec Puppeteer

Dans GitHub Actions, une configuration spéciale est nécessaire pour Puppeteer :

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

Les workflows sont configurés pour installer Chrome automatiquement.
