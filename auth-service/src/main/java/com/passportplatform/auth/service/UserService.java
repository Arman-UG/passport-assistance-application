package com.passportplatform.auth.service;

import com.passportplatform.auth.dto.CreateAgentRequest;
import com.passportplatform.auth.dto.RegisterRequest;
import com.passportplatform.auth.entity.User;
import com.passportplatform.auth.entity.enums.AccountStatus;
import com.passportplatform.auth.entity.enums.Role;
import com.passportplatform.auth.exception.DuplicateEmailException;
import com.passportplatform.auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final Argon2PasswordService passwordService;

    public UserService(UserRepository userRepository, Argon2PasswordService passwordService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
    }

    public String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public Optional<User> findByEmailNormalized(String emailNormalized) {
        return userRepository.findByEmailNormalized(emailNormalized);
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmailNormalized(normalizeEmail(email));
    }

    @Transactional
    public User createCustomer(RegisterRequest req) {
        String normalizedEmail = normalizeEmail(req.email());

        if (userRepository.existsByEmailNormalized(normalizedEmail)) {
            throw new DuplicateEmailException("An account with this email address already exists.");
        }

        String passwordHash = passwordService.hashPassword(req.password());

        User user = new User(
            req.fullName().trim(),
            req.email().trim(),
            normalizedEmail,
            passwordHash,
            Role.CUSTOMER, // HARDCODED: Public registration NEVER allows AGENT or ADMIN
            null
        );

        // In dev or by policy, active upon registration (email verification flow can activate)
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setEmailVerified(true);

        return userRepository.save(user);
    }

    @Transactional
    public User createAgentOrAdmin(CreateAgentRequest req, UUID createdBy) {
        String normalizedEmail = normalizeEmail(req.email());

        if (userRepository.existsByEmailNormalized(normalizedEmail)) {
            throw new DuplicateEmailException("An account with this email address already exists.");
        }

        Role assignedRole = req.role();
        if (assignedRole == null || assignedRole == Role.CUSTOMER) {
            throw new IllegalArgumentException("Cannot create CUSTOMER via administrative provisioning. Must be AGENT or ADMIN.");
        }

        String passwordHash = passwordService.hashPassword(req.password());

        User user = new User(
            req.fullName().trim(),
            req.email().trim(),
            normalizedEmail,
            passwordHash,
            assignedRole,
            createdBy
        );

        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setEmailVerified(true);

        return userRepository.save(user);
    }

    @Transactional
    public void updateUser(User user) {
        userRepository.save(user);
    }
}
