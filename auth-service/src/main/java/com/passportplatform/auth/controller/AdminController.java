package com.passportplatform.auth.controller;

import com.passportplatform.auth.dto.CreateAgentRequest;
import com.passportplatform.auth.entity.User;
import com.passportplatform.auth.entity.enums.AccountStatus;
import com.passportplatform.auth.repository.UserRepository;
import com.passportplatform.auth.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final UserRepository userRepository;

    public AdminController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createAgentOrAdmin(
            @Valid @RequestBody CreateAgentRequest request,
            @AuthenticationPrincipal Claims claims) {
        UUID adminId = claims != null ? UUID.fromString(claims.getSubject()) : null;
        User user = userService.createAgentOrAdmin(request, adminId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", user.getId(),
            "fullName", user.getFullName(),
            "email", user.getEmail(),
            "role", user.getRole().name(),
            "message", "Account successfully created"
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<Page<User>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<User> users = userRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, Math.min(size, 100)));
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status field is required"));
        }

        return userRepository.findById(userId)
            .map(u -> {
                u.setAccountStatus(AccountStatus.valueOf(statusStr.toUpperCase()));
                userRepository.save(u);
                return ResponseEntity.ok(Map.of("message", "User status updated to " + u.getAccountStatus()));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
