package com.laudiumbiz.Laudiumbiz.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Handles authentication errors and returns appropriate error responses.
 * This is called when an unauthenticated user tries to access a protected resource.
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationEntryPoint.class);
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public void commence(HttpServletRequest request,
                       HttpServletResponse response,
                       AuthenticationException authException) throws IOException {

    logger.error("Unauthorized access attempt: {}", authException.getMessage());

    // Set response status and content type
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);

    // Create error response body
    Map<String, Object> errorDetails = new HashMap<>();
    errorDetails.put("timestamp", System.currentTimeMillis());
    errorDetails.put("status", HttpServletResponse.SC_UNAUTHORIZED);
    errorDetails.put("error", "Unauthorized");
    errorDetails.put("message", "Authentication required to access this resource");
    errorDetails.put("path", request.getRequestURI());

    // Check for specific error scenarios
    final String expired = (String) request.getAttribute("expired");
    if (expired != null) {
      errorDetails.put("message", "JWT token has expired");
      errorDetails.put("expired", true);
    }

    final String invalid = (String) request.getAttribute("invalid");
    if (invalid != null) {
      errorDetails.put("message", "Invalid JWT token");
      errorDetails.put("invalid", true);
    }

    // Write error response
    response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
  }
}