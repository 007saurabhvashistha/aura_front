FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared-ui/package.json shared-ui/
COPY apps/web/package.json apps/web/
RUN npm install

COPY . .
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build --workspace @aura/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]