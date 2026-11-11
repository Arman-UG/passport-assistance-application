package com.passportplatform.auth.startup;

import com.passportplatform.auth.entity.User;
import com.passportplatform.auth.entity.enums.AccountStatus;
import com.passportplatform.auth.entity.enums.Role;
import com.passportplatform.auth.repository.UserRepository;
import com.passportplatform.auth.service.Argon2PasswordService;
import com.passportplatform.auth.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final UserService userService;
    private final Argon2PasswordService passwordService;

    @Value("${admin.bootstrap-email:}")
    private String bootstrapEmail;

    @Value("${admin.bootstrap-password:}")
    private String bootstrapPassword;

    public AdminBootstrapRunner(
            UserRepository userRepository,
            UserService userService,
            Argon2PasswordService passwordService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordService = passwordService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (bootstrapEmail == null || bootstrapEmail.isBlank() ||
            bootstrapPassword == null || bootstrapPassword.isBlank()) {
            return;
        }

        String normalized = userService.normalizeEmail(bootstrapEmail);
        Optional<User> existing = userRepository.findByEmailNormalized(normalized);

        if (existing.isEmpty()) {
            String hash = passwordService.hashPassword(bootstrapPassword);
            User admin = new User(
                "System Administrator",
                bootstrapEmail.trim(),
                normalized,
                hash,
                Role.ADMIN,
                null
            );
            admin.setAccountStatus(AccountStatus.ACTIVE);
            admin.setEmailVerified(true);
            userRepository.save(admin);

            log.warn("=================================================================");
            log.warn("SECURITY WARNING: Admin bootstrap account created for {}", bootstrapEmail);
            log.warn("Change this password immediately in production!");
            log.warn("=================================================================");
        }
    }
}
