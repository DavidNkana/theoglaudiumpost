package com.laudiumbiz.Laudiumbiz.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * JWT token provider for generating and validating JWT tokens.
 * Handles token creation, validation, and claim extraction.
 */
@Component
public class JwtTokenProvider {

  private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

  @Value("${jwt.secret-key}")
  private String secretKey;

  @Value("${jwt.expiration}")
  private long jwtExpiration;

  @Value("${jwt.refresh-expiration:604800000}") // 7 days default
  private long refreshExpiration;

  /**
   * Generate JWT token from Authentication object
   */
  public String generateToken(Authentication authentication) {
    UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
    return generateToken(userPrincipal);
  }

  /**
   * Generate JWT token from UserDetails
   */
  public String generateToken(UserDetails userDetails) {
    Map<String, Object> extraClaims = new HashMap<>();

    // Add user authorities/roles to token
    extraClaims.put("authorities", userDetails.getAuthorities()
                                              .stream()
                                              .map(GrantedAuthority::getAuthority)
                                              .collect(Collectors.toList()));

    return buildToken(extraClaims, userDetails.getUsername(), jwtExpiration);
  }

  /**
   * Generate refresh token
   */
  public String generateRefreshToken(UserDetails userDetails) {
    return buildToken(new HashMap<>(), userDetails.getUsername(), refreshExpiration);
  }

  /**
   * Build JWT token with claims
   */
  private String buildToken(Map<String, Object> extraClaims, String username, long expiration) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + expiration);

    return Jwts.builder()
               .setClaims(extraClaims)
               .setSubject(username)
               .setIssuedAt(now)
               .setExpiration(expiryDate)
               .signWith(getSignInKey(), SignatureAlgorithm.HS256)
               .compact();
  }

  /**
   * Extract username from token
   */
  public String extractUsername(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  /**
   * Extract expiration date from token
   */
  public Date extractExpiration(String token) {
    return extractClaim(token, Claims::getExpiration);
  }

  /**
   * Extract a specific claim from token
   */
  public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
    final Claims claims = extractAllClaims(token);
    return claimsResolver.apply(claims);
  }

  /**
   * Extract all claims from token
   */
  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder()
               .setSigningKey(getSignInKey())
               .build()
               .parseClaimsJws(token)
               .getBody();
  }

  /**
   * Validate JWT token
   */
  public boolean validateToken(String token) {
    try {
      Jwts.parserBuilder()
          .setSigningKey(getSignInKey())
          .build()
          .parseClaimsJws(token);
      return true;
    } catch (SecurityException ex) {
      logger.error("Invalid JWT signature: {}", ex.getMessage());
    } catch (MalformedJwtException ex) {
      logger.error("Invalid JWT token: {}", ex.getMessage());
    } catch (ExpiredJwtException ex) {
      logger.error("JWT token is expired: {}", ex.getMessage());
    } catch (UnsupportedJwtException ex) {
      logger.error("JWT token is unsupported: {}", ex.getMessage());
    } catch (IllegalArgumentException ex) {
      logger.error("JWT claims string is empty: {}", ex.getMessage());
    }
    return false;
  }

  /**
   * Validate token against user details
   */
  public boolean validateToken(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
  }

  /**
   * Check if token is expired
   */
  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }

  /**
   * Get signing key for JWT
   */
  private Key getSignInKey() {
    byte[] keyBytes = Decoders.BASE64.decode(secretKey);
    return Keys.hmacShaKeyFor(keyBytes);
  }

  /**
   * Get token expiration time in milliseconds
   */
  public long getExpirationTime() {
    return jwtExpiration;
  }
}