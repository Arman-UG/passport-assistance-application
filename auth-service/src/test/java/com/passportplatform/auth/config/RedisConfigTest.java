package com.passportplatform.auth.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class RedisConfigTest {

    @Test
    @DisplayName("rediss:// URL activates SSL")
    void redissUrlActivatesSsl() {
        boolean ssl = RedisConfig.isSslRequired("rediss://default:secret@my-redis.render.com:6380", false);
        assertThat(ssl).isTrue();
    }

    @Test
    @DisplayName("redis:// URL does not activate SSL unless ssl.enabled flag is true")
    void redisUrlDoesNotActivateSslByDefault() {
        boolean sslDefault = RedisConfig.isSslRequired("redis://localhost:6379", false);
        assertThat(sslDefault).isFalse();

        boolean sslForced = RedisConfig.isSslRequired("redis://localhost:6379", true);
        assertThat(sslForced).isTrue();
    }

    @Test
    @DisplayName("Missing or empty REDIS_URL respects ssl.enabled flag")
    void emptyRedisUrlRespectsSslFlag() {
        assertThat(RedisConfig.isSslRequired(null, false)).isFalse();
        assertThat(RedisConfig.isSslRequired("", false)).isFalse();
        assertThat(RedisConfig.isSslRequired("   ", false)).isFalse();
        assertThat(RedisConfig.isSslRequired(null, true)).isTrue();
        assertThat(RedisConfig.isSslRequired("", true)).isTrue();
    }

    @Test
    @DisplayName("URL-encoded special characters in password are decoded correctly")
    void urlEncodedPasswordIsDecoded() {
        // Password "P@ss#123!" encoded as "P%40ss%23123%21"
        String redisUrl = "rediss://:P%40ss%23123%21@redis.render.com:6380";
        RedisStandaloneConfiguration config = RedisConfig.parseRedisConfiguration(
                redisUrl, "localhost", 6379, "");

        assertThat(config.getHostName()).isEqualTo("redis.render.com");
        assertThat(config.getPort()).isEqualTo(6380);
        assertThat(config.getPassword()).isEqualTo(RedisPassword.of("P@ss#123!"));
    }

    @Test
    @DisplayName("URL-encoded colon and slashes in password do not break parsing")
    void urlEncodedColonAndPasswordWithSlash() {
        // Password "p://secret:key" encoded as "p%3A%2F%2Fsecret%3Akey"
        String redisUrl = "redis://user:p%3A%2F%2Fsecret%3Akey@redis-host:6379";
        RedisStandaloneConfiguration config = RedisConfig.parseRedisConfiguration(
                redisUrl, "localhost", 6379, "");

        assertThat(config.getHostName()).isEqualTo("redis-host");
        assertThat(config.getPort()).isEqualTo(6379);
        assertThat(config.getUsername()).isEqualTo("user");
        assertThat(config.getPassword()).isEqualTo(RedisPassword.of("p://secret:key"));
    }

    @Test
    @DisplayName("Password with literal plus sign is preserved")
    void passwordWithPlusSignPreserved() {
        String redisUrl = "redis://:My+Secret+Key@redis-host:6379";
        RedisStandaloneConfiguration config = RedisConfig.parseRedisConfiguration(
                redisUrl, "localhost", 6379, "");

        assertThat(config.getPassword()).isEqualTo(RedisPassword.of("My+Secret+Key"));
    }

    @Test
    @DisplayName("Missing/omitted port in Redis URL falls back to 6379")
    void missingPortDefaultsTo6379() {
        String redisUrl = "rediss://default:password@my-redis.render.com";
        RedisStandaloneConfiguration config = RedisConfig.parseRedisConfiguration(
                redisUrl, "localhost", 6379, "");

        assertThat(config.getHostName()).isEqualTo("my-redis.render.com");
        assertThat(config.getPort()).isEqualTo(6379);
        assertThat(config.getPassword()).isEqualTo(RedisPassword.of("password"));
    }

    @Test
    @DisplayName("Empty or missing REDIS_URL cleanly falls back to discrete host/port/password")
    void emptyOrNullRedisUrlFallsBackToDiscreteValues() {
        RedisStandaloneConfiguration configFromNull = RedisConfig.parseRedisConfiguration(
                null, "fallback-host", 6385, "fallback-secret");
        assertThat(configFromNull.getHostName()).isEqualTo("fallback-host");
        assertThat(configFromNull.getPort()).isEqualTo(6385);
        assertThat(configFromNull.getPassword()).isEqualTo(RedisPassword.of("fallback-secret"));

        RedisStandaloneConfiguration configFromBlank = RedisConfig.parseRedisConfiguration(
                "   ", "fallback-host2", 6386, "fallback-secret2");
        assertThat(configFromBlank.getHostName()).isEqualTo("fallback-host2");
        assertThat(configFromBlank.getPort()).isEqualTo(6386);
        assertThat(configFromBlank.getPassword()).isEqualTo(RedisPassword.of("fallback-secret2"));
    }
}
