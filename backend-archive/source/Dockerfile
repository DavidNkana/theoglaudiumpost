# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B 2>/dev/null || true
COPY src ./src
COPY migrations ./migrations
RUN mvn package -DskipTests -B

# Stage 2: Run
FROM eclipse-temurin:21-jre-noble
WORKDIR /app
COPY --from=build /app/target/Laudiumbiz*.war app.war
COPY --from=build /app/migrations ./migrations
ENV SERVER_PORT=8080
ENV SPRING_PROFILES_ACTIVE=pipeline
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.war"]