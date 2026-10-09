# LEED Togo

Plateforme d'investissement communautaire pour les Togolais. Les utilisateurs déposent entre 2 000 et 30 000 FCFA, reçoivent 50 % immédiatement, et la mise est doublée en 30 jours. Un système de parrainage crédite 500 FCFA par filleul qui investit.

## Stack

- **Framework** : Next.js 16 (App Router) — `proxy.ts` pour la protection des routes
- **Base de données** : PostgreSQL via [Neon](https://neon.tech) (serverless)
- **ORM** : Prisma 7 avec `@prisma/adapter-neon`
- **Auth** : JWT (`jose`) + passwords hashés (`bcryptjs`), cookie `httpOnly`
- **Validation** : Zod (serveur et client)
- **UI** : React 19, design system CSS maison (`src/styles/globals.css`)

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout, me
│   │   ├── dashboard/     # données agrégées du dashboard
│   │   ├── investments/   # CRUD investissements
│   │   ├── referrals/     # liste des filleuls + stats
│   │   ├── user/          # profil + changement de mot de passe
│   │   └── withdrawals/   # historique + création de retrait
│   ├── auth/              # page connexion / inscription
│   ├── dashboard/         # tableau de bord
│   ├── invest/            # sélection d'un plan
│   ├── referral/          # parrainage
│   ├── settings/          # profil + sécurité
│   └── withdraw/          # retrait
├── components/
│   ├── Sidebar.tsx        # navbar top (desktop + mobile)
│   └── TogoFlag.tsx       # drapeau SVG
├── generated/prisma/      # client Prisma généré (gitignore)
├── lib/
│   ├── api.ts             # helpers fetch côté client
│   ├── auth.ts            # JWT + hash bcrypt
│   ├── format.ts          # fmt(), formatPhone(), formatDate()
│   ├── plans.ts           # source unique des 4 plans + helpers
│   ├── prisma.ts          # singleton PrismaClient avec Neon adapter
│   ├── session.ts         # getCurrentUser() / requireUser()
│   ├── types.ts           # interfaces partagées
│   └── validation.ts      # schémas Zod
├── proxy.ts               # protection des routes (Next.js 16, ≠ middleware)
└── styles/globals.css     # design system complet
prisma/
├── schema.prisma          # modèles User, Investment, Referral, Withdrawal
prisma.config.ts           # connexion Prisma CLI → DATABASE_URL_UNPOOLED
```

## Mise en route

### 1. Variables d'environnement

Copiez `.env.example` en `.env` et remplissez vos valeurs Neon :

```bash
cp .env.example .env
```

```env
# Connexion poolée (application)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"

# Connexion directe (Prisma CLI)
DATABASE_URL_UNPOOLED="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Secret JWT — générez-en un : openssl rand -base64 32
JWT_SECRET="votre-secret-ici"
```

> Dans la console Neon : votre projet → **Connect** → copiez les deux strings (pooled et unpooled).

### 2. Base de données

```bash
# Appliquer le schéma sur votre base Neon
npm run db:push

# (optionnel) Ouvrir Prisma Studio pour inspecter les données
npm run db:studio
```

### 3. Développement

```bash
npm install
npm run dev
```

L'app tourne sur [http://localhost:3000](http://localhost:3000).

### 4. Build

```bash
npm run build
npm start
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrage en mode développement (webpack) |
| `npm run dev:turbo` | Démarrage avec Turbopack |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run db:push` | Synchronise le schéma Prisma → Neon (sans migration) |
| `npm run db:migrate` | Crée une migration Prisma |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run db:studio` | Ouvre Prisma Studio |

## Authentification

- L'inscription/connexion se fait par numéro de téléphone togolais (8 chiffres, sans le +228) + mot de passe
- Un cookie `httpOnly` `leed-session` est posé avec le JWT
- Le fichier `src/proxy.ts` (Next.js 16 — anciennement `middleware.ts`) redirige vers `/auth` si une route protégée est accédée sans session

## Paiements mobiles

L'intégration Flooz/T-Money est à brancher. En attendant, les modales d'investissement simulent un délai de traitement puis appellent l'API qui crée le record en base. Aucun appel externe n'est effectué.

## Ajouter la BD à Neon

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un projet (région proche de l'Afrique de l'Ouest — EU West est la plus proche actuellement)
3. Copier les deux connection strings dans `.env`
4. Lancer `npm run db:push`
