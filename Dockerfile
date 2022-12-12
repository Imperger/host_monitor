FROM node:19-alpine3.15 as build

WORKDIR /build

COPY . .

RUN npm i && \
    npm run build




FROM node:19-alpine3.15

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /build/out .
COPY --from=build /build/node_modules node_modules

ENTRYPOINT ["node", "index"]