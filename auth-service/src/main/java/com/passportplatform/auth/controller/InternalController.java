package com.passportplatform.auth.controller;

import com.passportplatform.auth.dto.TokenValidationResponse;
import com.passportplatform.auth.entity.User;
import com.passportplatform.auth.service.AuthService;
import com.passportplatform.auth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal")
public class InternalController {

    private final AuthService authService;
    private final UserService userService;

    public InternalController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @GetMapping("/validate")
    public ResponseEntity<TokenValidationResponse> validateToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.ok(new TokenValidationResponse(false, null, null, null));
        }

        String token = authHeader.substring(7);
        TokenValidationResponse response = authService.validateToken(token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserInfo(@PathVariable UUID userId) {
        return userService.findById(userId)
            .map(u -> ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail(),
                "role", u.getRole().name(),
                "accountStatus", u.getAccountStatus().name()
            )))
            .orElse(ResponseEntity.notFound().build());
    }
}
