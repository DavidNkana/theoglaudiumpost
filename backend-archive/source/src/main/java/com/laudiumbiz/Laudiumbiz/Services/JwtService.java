package com.laudiumbiz.Laudiumbiz.Services;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.laudiumbiz.Laudiumbiz.Models.DB.User;

import java.util.HashMap;
import java.util.Map;

/**
 * PURPOSE: Placeholder service for JWT functionality that has been removed from the application.
 * Maintained to preserve backward compatibility and prevent breaking existing dependencies.
 * All methods return placeholder values and do not perform actual JWT operations.
 *
 * KEY METHODS:
 * - extractUsername(String token): Returns placeholder username
 * - generateToken(User userDetails): Returns placeholder token
 * - isTokenValid(String token, UserDetails userDetails): Always returns false
 * - getExpirationTime(): Returns placeholder expiration time
 *
 * INTEGRATIONS: None (deprecated placeholder service)
 *
 * @deprecated JWT authentication has been removed from the application
 * @author Imran
 */
@Service
public class JwtService {

    public String extractUsername(String token) {
        // No longer extracts username from token
        return "placeholder";
    }

    public String generateToken(User userDetails) {
        // No longer generates tokens
        return "placeholder-token";
    }

    public String generateToken(Map<String, Object> extraClaims, User userDetails) {
        // No longer generates tokens
        return "placeholder-token";
    }

    public long getExpirationTime() {
        // Return a placeholder expiration time
        return 3600; // 1 hour
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        // No longer validates tokens
        return false;
    }
}
