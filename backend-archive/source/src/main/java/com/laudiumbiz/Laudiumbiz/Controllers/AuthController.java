/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import java.util.HashMap;
import java.util.Map;
import com.laudiumbiz.Laudiumbiz.security.dto.AuthenticationResponse;
import com.laudiumbiz.Laudiumbiz.security.dto.LoginRequest;
import com.laudiumbiz.Laudiumbiz.security.dto.RefreshTokenRequest;
import com.laudiumbiz.Laudiumbiz.security.dto.SignupRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.security.AuthenticationService;

/**
 *
 * @author Imran
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin (origins = "*", maxAge = 3600)
@Tag (name = "Authentication", description = "Authentication management APIs")
public class AuthController {

  private final AuthenticationService authenticationService;

  public AuthController(AuthenticationService authenticationService) {
    this.authenticationService = authenticationService;
  }

  /**
   * Register a new user
   */
  @PostMapping("/signup")
  @Operation (summary = "Register a new user", description = "Create a new user account")
  @ApiResponses (value = {
      @ApiResponse (responseCode = "201", description = "User registered successfully"),
      @ApiResponse(responseCode = "400", description = "Invalid input or user already exists"),
      @ApiResponse(responseCode = "500", description = "Internal server error")
  })
  public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest signupRequest) {
    try {
      log.info("Signup request received for email: {}", signupRequest.email());

      AuthenticationResponse response = authenticationService.signup(signupRequest);

      return ResponseEntity.status(HttpStatus.CREATED).body(response);

    } catch (IllegalArgumentException e) {
      log.error("Signup failed - validation error: {}", e.getMessage());
      return ResponseEntity.badRequest().body(createErrorResponse("Validation Error", e.getMessage()));
    } catch (Exception e) {
      log.error("Signup failed for email: {}", signupRequest.email(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                           .body(createErrorResponse("Registration Failed", "An error occurred during registration"));
    }
  }

  /**
   * Authenticate user and get JWT token
   */
  @PostMapping("/login")
  @Operation(summary = "Authenticate user", description = "Login with email and password to get JWT token")
  @ApiResponses(value = {
      @ApiResponse(responseCode = "200", description = "Authentication successful"),
      @ApiResponse(responseCode = "401", description = "Invalid credentials"),
      @ApiResponse(responseCode = "500", description = "Internal server error")
  })
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
    try {
      log.info("Login request received for email: {}", loginRequest.email());

      AuthenticationResponse response = authenticationService.authenticate(loginRequest);

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("Login failed for email: {}", loginRequest.email(), e);
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                           .body(createErrorResponse("Authentication Failed", "Invalid email or password"));
    }
  }

  /**
   * Refresh access token
   */
  @PostMapping("/refresh-token")
  @Operation(summary = "Refresh access token", description = "Get a new access token using refresh token")
  @ApiResponses(value = {
      @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
      @ApiResponse(responseCode = "401", description = "Invalid refresh token"),
      @ApiResponse(responseCode = "500", description = "Internal server error")
  })
  public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
    try {
      log.info("Token refresh request received");

      AuthenticationResponse response = authenticationService.refreshToken(refreshTokenRequest.refreshToken());

      return ResponseEntity.ok(response);

    } catch (IllegalArgumentException e) {
      log.error("Token refresh failed: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                           .body(createErrorResponse("Token Refresh Failed", e.getMessage()));
    } catch (Exception e) {
      log.error("Token refresh failed", e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                           .body(createErrorResponse("Token Refresh Failed", "An error occurred during token refresh"));
    }
  }

  /**
   * Logout current user
   */
  @PostMapping("/logout")
  @PreAuthorize ("isAuthenticated()")
  @Operation(summary = "Logout user", description = "Logout the current authenticated user")
  @ApiResponses(value = {
      @ApiResponse(responseCode = "200", description = "Logout successful"),
      @ApiResponse(responseCode = "401", description = "Unauthorized")
  })
  public ResponseEntity<?> logout() {
    try {
      authenticationService.logout();

      Map<String, String> response = new HashMap<>();
      response.put("message", "Logout successful");

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("Logout failed", e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                           .body(createErrorResponse("Logout Failed", "An error occurred during logout"));
    }
  }

  /**
   * Get current authenticated user
   */
  @GetMapping("/me")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Get current user", description = "Get details of the currently authenticated user")
  @ApiResponses(value = {
      @ApiResponse(responseCode = "200", description = "User details retrieved successfully"),
      @ApiResponse(responseCode = "401", description = "Unauthorized")
  })
  public ResponseEntity<?> getCurrentUser() {
    try {
      User currentUser = authenticationService.getCurrentUser();

      if (currentUser == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                             .body(createErrorResponse("Unauthorized", "User not authenticated"));
      }

      return ResponseEntity.ok(currentUser);

    } catch (Exception e) {
      log.error("Failed to get current user", e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                           .body(createErrorResponse("Error", "Failed to retrieve user details"));
    }
  }

  /**
   * Validate JWT token
   */
  @GetMapping("/validate-token")
  @Operation(summary = "Validate token", description = "Check if the provided JWT token is valid")
  @ApiResponses(value = {
      @ApiResponse(responseCode = "200", description = "Token is valid"),
      @ApiResponse(responseCode = "401", description = "Token is invalid or expired")
  })
  public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
    try {
      // Token validation is handled by JwtAuthenticationFilter
      // If this endpoint is reached, the token is valid

      Map<String, Object> response = new HashMap<>();
      response.put("valid", true);
      response.put("message", "Token is valid");

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("Token validation failed", e);
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                           .body(createErrorResponse("Invalid Token", "Token validation failed"));
    }
  }

  /**
   * Create error response
   */
  private Map<String, Object> createErrorResponse(String error, String message) {
    Map<String, Object> errorResponse = new HashMap<>();
    errorResponse.put("error", error);
    errorResponse.put("message", message);
    errorResponse.put("timestamp", System.currentTimeMillis());
    return errorResponse;
  }
}
