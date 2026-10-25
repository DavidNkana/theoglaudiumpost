# Vue (Vite) frontend test image for k3s PR environments.
# Build:
#   docker build -f Dockerfile.vue \
#     --build-arg PROJECT=<sanitized-project> --build-arg PR_ID=$(PR_ID) \
#     -t <registry>/<project>-frontend:$(Build.SourceVersion) .
# Then the frontend-test pipeline POSTs /provision { component:"frontend", image:... }.

FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_TEST_API_BASE_URL=
ENV VITE_TEST_API_BASE_URL=$VITE_TEST_API_BASE_URL
COPY . .
RUN npm ci && npm run build            # outputs dist/

FROM nginx:1.27-alpine
ARG NGINX_CONF=nginx.conf
ARG PROJECT=laudium-post
ARG PR_ID=integration
COPY --from=build /app/dist /usr/share/nginx/html
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
RUN if [ "$NGINX_CONF" = "nginx.conf" ]; then \
      sed -i "s/__PROJECT__/${PROJECT}/g; s/__PR_ID__/${PR_ID}/g" /etc/nginx/conf.d/default.conf; \
    fi
EXPOSE 8080
