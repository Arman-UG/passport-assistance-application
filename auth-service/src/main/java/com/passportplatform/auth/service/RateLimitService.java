package com.passportplatform.auth.service;

import com.passportplatform.auth.exception.RateLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);

    private final StringRedisTemplate redisTemplate;
    private final int maxAttempts;
    private final int windowMinutes;

    // Local in-memory fallback if Redis is unavailable
    private final ConcurrentHashMap<String, AtomicInteger> localCounters = new ConcurrentHashMap<>();

    public RateLimitService(
            StringRedisTemplate redisTemplate,
            @Value("${rate-limit.login.max-attempts:10}") int maxAttempts,
            @Value("${rate-limit.login.window-minutes:15}") int windowMinutes) {
        this.redisTemplate = redisTemplate;
        this.maxAttempts = maxAttempts;
        this.windowMinutes = windowMinutes;
    }

    public void checkLoginRateLimit(String emailNormalized, String ipAddress) {
        String emailKey = "ratelimit:login:email:" + emailNormalized;
        String ipKey = "ratelimit:login:ip:" + (ipAddress != null ? ipAddress : "unknown");

        checkKey(emailKey, "Too many login attempts for this account. Please wait before trying again.");
        checkKey(ipKey, "Too many login attempts from this network. Please wait before trying again.");
    }

    public void recordLoginFailure(String emailNormalized, String ipAddress) {
        String emailKey = "ratelimit:login:email:" + emailNormalized;
        String ipKey = "ratelimit:login:ip:" + (ipAddress != null ? ipAddress : "unknown");

        incrementKey(emailKey);
        incrementKey(ipKey);
    }

    public void resetLoginAttempts(String emailNormalized) {
        String emailKey = "ratelimit:login:email:" + emailNormalized;
        try {
            redisTemplate.delete(emailKey);
        } catch (Exception e) {
            localCounters.remove(emailKey);
        }
    }

    private void checkKey(String key, String errorMsg) {
        try {
            String val = redisTemplate.opsForValue().get(key);
            if (val != null && Integer.parseInt(val) >= maxAttempts) {
                Long ttl = redisTemplate.getExpire(key);
                long retryAfter = (ttl != null && ttl > 0) ? ttl : (windowMinutes * 60L);
                throw new RateLimitExceededException(errorMsg, retryAfter);
            }
        } catch (RateLimitExceededException rle) {
            throw rle;
        } catch (Exception e) {
            // Redis error: check local fallback
            AtomicInteger count = localCounters.get(key);
            if (count != null && count.get() >= maxAttempts) {
                throw new RateLimitExceededException(errorMsg, windowMinutes * 60L);
            }
        }
    }

    private void incrementKey(String key) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(windowMinutes));
            }
        } catch (Exception e) {
            localCounters.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
        }
    }
}
