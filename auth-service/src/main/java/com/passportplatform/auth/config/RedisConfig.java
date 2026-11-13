package com.passportplatform.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Redis configuration: Lettuce connection factory with TLS/URL support and a String-keyed RedisTemplate.
 */
@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.url:}")
    private String redisUrl;

    @Value("${spring.data.redis.host:localhost}")
    private String host;

    @Value("${spring.data.redis.port:6379}")
    private int port;

    @Value("${spring.data.redis.password:}")
    private String password;

    @Value("${spring.data.redis.ssl.enabled:false}")
    private boolean sslEnabled;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = parseRedisConfiguration(redisUrl, host, port, password);
        boolean useSsl = isSslRequired(redisUrl, sslEnabled);

        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientConfig =
                LettuceClientConfiguration.builder();
        if (useSsl) {
            clientConfig.useSsl();
        }

        return new LettuceConnectionFactory(config, clientConfig.build());
    }

    public static RedisStandaloneConfiguration parseRedisConfiguration(
            String redisUrl,
            String fallbackHost,
            int fallbackPort,
            String fallbackPassword) {
        if (redisUrl != null && !redisUrl.isBlank()) {
            URI uri = URI.create(redisUrl);
            String uriHost = (uri.getHost() != null && !uri.getHost().isBlank()) ? uri.getHost() : fallbackHost;
            int uriPort = uri.getPort() > 0 ? uri.getPort() : 6379;
            RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(uriHost, uriPort);

            String rawUserInfo = uri.getRawUserInfo();
            if (rawUserInfo != null && !rawUserInfo.isBlank()) {
                String[] parts = rawUserInfo.split(":", 2);
                String rawUsername = parts.length > 1 ? parts[0] : null;
                String rawPassword = parts.length > 1 ? parts[1] : parts[0];

                if (rawUsername != null && !rawUsername.isBlank() && !"default".equalsIgnoreCase(rawUsername)) {
                    config.setUsername(decodeUriComponent(rawUsername));
                }
                if (rawPassword != null && !rawPassword.isBlank()) {
                    config.setPassword(RedisPassword.of(decodeUriComponent(rawPassword)));
                }
            }
            return config;
        } else {
            RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(fallbackHost, fallbackPort);
            if (fallbackPassword != null && !fallbackPassword.isBlank()) {
                config.setPassword(RedisPassword.of(fallbackPassword));
            }
            return config;
        }
    }

    public static boolean isSslRequired(String redisUrl, boolean sslEnabled) {
        if (sslEnabled) {
            return true;
        }
        if (redisUrl != null && !redisUrl.isBlank()) {
            try {
                URI uri = URI.create(redisUrl);
                if ("rediss".equalsIgnoreCase(uri.getScheme())) {
                    return true;
                }
            } catch (Exception ignored) {}
            return redisUrl.regionMatches(true, 0, "rediss://", 0, 9);
        }
        return false;
    }

    private static String decodeUriComponent(String s) {
        if (s == null) return null;
        // Protect literal '+' from being converted to space by URLDecoder
        return URLDecoder.decode(s.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer serializer = new StringRedisSerializer();
        template.setKeySerializer(serializer);
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(serializer);
        template.setHashValueSerializer(serializer);
        template.afterPropertiesSet();
        return template;
    }
}
