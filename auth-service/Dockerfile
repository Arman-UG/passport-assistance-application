# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn clean package -DskipTests

# ---- Runtime Stage ----
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S ppauth && adduser -S ppauth -G ppauth
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN mkdir -p /app/logs && chown -R ppauth:ppauth /app
USER ppauth
EXPOSE 8080
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
