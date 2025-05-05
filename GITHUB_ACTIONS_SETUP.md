# Configuration des Workflows GitHub Actions

Ce document explique comment configurer les secrets et variables d'environnement nécessaires pour les workflows GitHub Actions du projet Archive1V.

## Variables d'environnement à configurer

Les workflows GitHub Actions utilisent des variables d'environnement qui doivent être configurées dans les paramètres du dépôt GitHub. Voici les variables à configurer:

### Pour l'environnement de staging

| Nom de la variable       | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `URL_TO_ARCHIVE_STAGING` | URL du site web staging à archiver                |
| `S3_BUCKET_NAME_STAGING` | Nom du bucket S3 pour l'environnement de staging  |
| `YEAR`                   | Année en cours pour l'archivage (ex: "2024-2025") |

### Pour l'environnement de production

| Nom de la variable    | Description                                         |
| --------------------- | --------------------------------------------------- |
| `URL_TO_ARCHIVE_PROD` | URL du site web de production à archiver            |
| `S3_BUCKET_NAME_PROD` | Nom du bucket S3 pour l'environnement de production |

## Secrets à configurer

Les workflows GitHub Actions utilisent également des secrets qui doivent être configurés dans les paramètres du dépôt GitHub. Voici les secrets à configurer:

### Pour l'environnement de staging

| Nom du secret                   | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `ADMIN_USERNAME_STAGING`        | Nom d'utilisateur admin pour l'environnement staging |
| `ADMIN_PASSWORD_STAGING`        | Mot de passe admin pour l'environnement staging      |
| `AWS_ACCESS_KEY_ID_STAGING`     | Clé d'accès AWS pour l'environnement staging         |
| `AWS_SECRET_ACCESS_KEY_STAGING` | Clé secrète AWS pour l'environnement staging         |

### Pour l'environnement de production

| Nom du secret                | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `ADMIN_USERNAME_PROD`        | Nom d'utilisateur admin pour l'environnement de production |
| `ADMIN_PASSWORD_PROD`        | Mot de passe admin pour l'environnement de production      |
| `AWS_ACCESS_KEY_ID_PROD`     | Clé d'accès AWS pour l'environnement de production         |
| `AWS_SECRET_ACCESS_KEY_PROD` | Clé secrète AWS pour l'environnement de production         |

## Comment configurer ces variables et secrets

1. Dans votre dépôt GitHub, allez dans **Settings** > **Secrets and variables** > **Actions**
2. Pour ajouter des secrets (informations sensibles):
   - Cliquez sur l'onglet "Secrets"
   - Cliquez sur "New repository secret"
   - Ajoutez le nom et la valeur du secret
3. Pour ajouter des variables (informations non sensibles):
   - Cliquez sur l'onglet "Variables"
   - Cliquez sur "New repository variable"
   - Ajoutez le nom et la valeur de la variable

## Exécution des workflows

Pour exécuter l'un des workflows:

1. Dans votre dépôt GitHub, allez dans l'onglet **Actions**
2. Sélectionnez le workflow que vous souhaitez exécuter ("Archive Staging" ou "Archive Production")
3. Cliquez sur "Run workflow"
4. Sélectionnez la branche sur laquelle exécuter le workflow (généralement main)
5. Cliquez sur "Run workflow" pour démarrer l'exécution

## Développement en local

Pour le développement en local, vous pouvez basculer entre les environnements de staging et de production en utilisant les commandes:

```
# Pour utiliser l'environnement de staging
yarn use:staging

# Pour utiliser l'environnement de production
yarn use:prod

# Pour vérifier l'environnement actuel
yarn env:check
```

Ces commandes mettent à jour la variable `CURRENT_ENV` dans le fichier `.env`, qui détermine quelles variables d'environnement sont utilisées lors de l'exécution locale.
