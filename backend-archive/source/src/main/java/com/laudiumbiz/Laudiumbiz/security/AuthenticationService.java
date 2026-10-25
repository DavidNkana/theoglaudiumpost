package com.laudiumbiz.Laudiumbiz.security;


import com.laudiumbiz.Laudiumbiz.Models.DB.Role;
import com.laudiumbiz.Laudiumbiz.Models.DTO.UserDto;
import com.laudiumbiz.Laudiumbiz.Repositories.RoleRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;
import com.laudiumbiz.Laudiumbiz.security.dto.AuthenticationResponse;
import com.laudiumbiz.Laudiumbiz.security.dto.LoginRequest;
import com.laudiumbiz.Laudiumbiz.security.dto.SignupRequest;
import com.laudiumbiz.Laudiumbiz.security.jwt.JwtTokenProvider;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.laudiumbiz.Laudiumbiz.Models.DB.User;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 *
 * @author Imran
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtTokenProvider tokenProvider;
  private final UserDetailsService userDetailsService;
  private final UserRepository userRepository;
  private final RoleRepository roleRepository;

  public AuthenticationResponse signup(SignupRequest request) throws Exception {
    log.debug("Registering new user with email: {}", request.email());

    Optional<User> existingUser = userRepository.findByEmail(request.email());
    if (existingUser.isPresent()) {
      throw new IllegalArgumentException("User with email " + request.email() + " already exists");
    }

    User user = new User();
    user.setName(request.name());
    user.setEmail(request.email());

    if (request.role() != null) {
      Optional<Role> role = roleRepository.findByName(request.role());
      role.ifPresent(r -> user.setRole_id(r.getId()));
    } else {
      Optional<Role> defaultRole = roleRepository.findByName("general_user");
      defaultRole.ifPresent(r -> user.setRole_id(r.getId()));
    }
    final User userToSave = user;
    user.setPassword(passwordEncoder.encode(request.password()));
    User savedUser = userRepository.save(userToSave);

    var userDetails = userDetailsService.loadUserByUsername(request.email());
    var token = tokenProvider.generateToken(userDetails);
    var refreshToken = tokenProvider.generateRefreshToken(userDetails);

    log.debug("User registered successfully with email: {}", request.email());
    return AuthenticationResponse.builder()
                                 .token(token)
                                 .tokenType("Bearer")
                                 .refreshToken(refreshToken)
                                 .expiresIn(tokenProvider.getExpirationTime())
                                 .user(UserDto.fromEntity(savedUser))
                                 .build();
  }

  public AuthenticationResponse authenticate(LoginRequest request) throws Exception {
    log.debug("Authenticating user with email: {}", request.email());
    try {
      var authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password())
      );
      SecurityContextHolder.getContext().setAuthentication(authentication);
      var token = tokenProvider.generateToken(authentication);
      var userDetails = (LauduimUserDetails) authentication.getPrincipal();
      var refreshToken = tokenProvider.generateRefreshToken(userDetails);
      return AuthenticationResponse.builder()
                                   .token(token)
                                   .tokenType("Bearer")
                                   .refreshToken(refreshToken)
                                   .expiresIn(tokenProvider.getExpirationTime())
                                   .user(UserDto.fromEntity(userDetails.getUser()))
                                   .build();


    } catch (BadCredentialsException e) {
      log.error("Invalid credentials for user: {}", request.email());
      throw new BadCredentialsException("Invalid email or password", e);
    }
  }

  public AuthenticationResponse refreshToken(String refreshToken) throws Exception {
    log.info("Refreshing access token");

    // Validate refresh token
    if (!tokenProvider.validateToken(refreshToken)) {
      throw new IllegalArgumentException("Invalid refresh token");
    }

    // Extract username from refresh token
    String username = tokenProvider.extractUsername(refreshToken);

    // Load user details
    LauduimUserDetails userDetails = (LauduimUserDetails) userDetailsService.loadUserByUsername(username);

    // Generate new access token
    String newAccessToken = tokenProvider.generateToken(userDetails);

    // Load full user details
    Optional<User> userOpt = userRepository.findByEmail(username);
    User user = userOpt.orElseThrow(() -> new Error("User not found"));

    return AuthenticationResponse.builder()
                                 .token(newAccessToken)
                                 .refreshToken(refreshToken)
                                 .tokenType("Bearer")
                                 .expiresIn(tokenProvider.getExpirationTime())
                                 .user(UserDto.fromEntity(user))
                                 .build();
  }

  /**
   * Logout user (client-side should remove tokens)
   */
  public void logout() {
    SecurityContextHolder.clearContext();
    log.info("User logged out successfully");
  }

  /**
   * Get currently authenticated user
   */
  public User getCurrentUser() throws Exception {
    var authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }

    var userDetails = (LauduimUserDetails) authentication.getPrincipal();
    return userDetails.getUser();
  }

  /**
   * Check if user has a specific role
   */
  public boolean hasRole(String role) {
    var authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      return false;
    }

    return authentication.getAuthorities().stream()
                         .anyMatch(authority -> authority.getAuthority()
                                                         .toUpperCase()
                                                         .equals("ROLE_" + role.toUpperCase())
                         );
  }
}