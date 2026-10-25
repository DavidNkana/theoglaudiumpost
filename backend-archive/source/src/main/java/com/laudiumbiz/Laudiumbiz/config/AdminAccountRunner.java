package com.laudiumbiz.Laudiumbiz.config;

import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Bootstrap admin account setup.
 *
 * Safe, idempotent runner that creates or updates an admin user on startup:
 * - New admin: creates if ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD are set and user does not exist
 * - Force reset: if ADMIN_FORCE_RESET=true and user exists, updates password/name/role from env vars
 *
 * No password is ever logged. The password is only stored encoded in the database.
 *
 * Usage (environment variables):
 *   ADMIN_EMAIL=info@example.com
 *   ADMIN_NAME=Admin User
 *   ADMIN_PASSWORD=your-secure-password
 *   ADMIN_FORCE_RESET=true   (optional, default false - forces update of existing user)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountRunner implements CommandLineRunner {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        String adminEmail = System.getenv("ADMIN_EMAIL");
        String adminName = System.getenv("ADMIN_NAME");
        String adminPassword = System.getenv("ADMIN_PASSWORD");
        String forceReset = System.getenv("ADMIN_FORCE_RESET");

        // All three core vars must be set to activate
        if (adminEmail == null || adminEmail.isBlank()
                || adminName == null || adminName.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {
            log.info("Admin account bootstrap skipped: ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD env vars must all be set");
            return;
        }

        // Check if user already exists
        var existingUser = userRepository.findByEmail(adminEmail);

        if (existingUser.isPresent()) {
            // User exists - handle force reset or skip
            boolean doForceReset = Boolean.parseBoolean(forceReset);
            if (!doForceReset) {
                log.info("Admin account bootstrap skipped: user with email {} already exists (set ADMIN_FORCE_RESET=true to update)", adminEmail);
                return;
            }

            // Force reset: update existing user
            User user = existingUser.get();
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setName(adminName);
            user.setRole_id(1);  // Ensure admin role
            user.setUpdated_at(LocalDateTime.now());

            userRepository.save(user);
            log.info("Admin account force-reset successful for email: {}, role_id: 1, name: {}", adminEmail, adminName);
            return;
        }

        // Create new admin user with role_id = 1 (admin)
        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setName(adminName);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setRole_id(1);
        admin.setCreated_at(LocalDateTime.now());
        admin.setUpdated_at(LocalDateTime.now());

        userRepository.save(admin);
        log.info("Admin account created successfully for email: {}", adminEmail);
    }
}
