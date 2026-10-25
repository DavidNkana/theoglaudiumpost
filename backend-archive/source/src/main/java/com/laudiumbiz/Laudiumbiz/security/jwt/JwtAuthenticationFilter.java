package com.laudiumbiz.Laudiumbiz.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter that intercepts HTTP requests to validate JWT tokens.
 * Extends OncePerRequestFilter to ensure it's executed once per request.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtTokenProvider tokenProvider;
  private final UserDetailsService userDetailsService;

  public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserDetailsService userDetailsService) {
    this.tokenProvider = tokenProvider;
    this.userDetailsService = userDetailsService;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain) throws ServletException, IOException {
    try {
      // Extract JWT token from request
      String jwt = getTokenFromRequest(request);
      // Validate token and set authentication
      if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
        String username = tokenProvider.extractUsername(jwt);

        // Load user details
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        // Create authentication token
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
            );

        // Set additional details
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        // Set authentication in security context
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }
    } catch (Exception ex) {
      logger.error("Could not set user authentication in security context", ex);
    }

    // Continue filter chain
    filterChain.doFilter(request, response);
  }


  /**
   * Extract JWT token from the Authorization header
   */
  private String getTokenFromRequest(HttpServletRequest request) {
    String bearerToken = request.getHeader(AUTHORIZATION_HEADER);

    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
      return bearerToken.substring(BEARER_PREFIX.length());
    }

    return null;
  }

  /**
   * Determine if this filter should not be applied to a specific request
   */
  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();

    // Skip filter on async dispatches
    if (request.getDispatcherType() == jakarta.servlet.DispatcherType.ASYNC) {
      return true;
    }

    boolean skip = path.contains("/api/v1/auth/") ||
        path.contains("/swagger-ui") ||
        path.contains("/api-docs") ||
        path.contains("/api/v1/public") ||
        path.contains("/api/v1/articles");
    return skip;
  }
}