# VSRUN LIVE — frontend Next.js.
#
# Trois étapes, pour que l'image finale ne contienne que ce qui sert à servir :
# ni sources, ni dépendances de construction, ni cache npm.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Les variables NEXT_PUBLIC_ sont figées dans le bundle au moment de la
# construction : le navigateur doit connaître l'adresse du serveur WebSocket, et
# rien ne la lui transmettra à l'exécution. Elles sont donc des arguments de
# construction, et l'image produite vaut pour un domaine donné.
#
# Aucune n'est un secret : la clé Reverb est un identifiant public, qui
# n'autorise que les canaux publics. Les canaux privés passent par une
# autorisation serveur.
ARG NEXT_PUBLIC_REVERB_APP_KEY
ARG NEXT_PUBLIC_REVERB_HOST
ARG NEXT_PUBLIC_REVERB_PORT=443
ARG NEXT_PUBLIC_REVERB_SCHEME=https

ENV NEXT_PUBLIC_REVERB_APP_KEY=$NEXT_PUBLIC_REVERB_APP_KEY
ENV NEXT_PUBLIC_REVERB_HOST=$NEXT_PUBLIC_REVERB_HOST
ENV NEXT_PUBLIC_REVERB_PORT=$NEXT_PUBLIC_REVERB_PORT
ENV NEXT_PUBLIC_REVERB_SCHEME=$NEXT_PUBLIC_REVERB_SCHEME

# `next build` télécharge les polices Google et les fige dans le bundle : la
# construction a besoin du réseau, l'exécution non. C'est voulu — aucun
# spectateur en tribune ne dépendra d'un service tiers.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Ne pas tourner en root : le conteneur est exposé au web par le proxy.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
