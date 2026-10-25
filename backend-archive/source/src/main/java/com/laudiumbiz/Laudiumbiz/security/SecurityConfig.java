package com.laudiumbiz.Laudiumbiz.security;

import com.laudiumbiz.Laudiumbiz.security.jwt.JwtAuthenticationEntryPoint;
import com.laudiumbiz.Laudiumbiz.security.jwt.JwtAuthenticationFilter;
import com.laudiumbiz.Laudiumbiz.security.jwt.JwtTokenProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Main security configuration class for the application.
 * Configures authentication, authorization, CORS, and JWT filter chain.
 *
 * @author Refactored Security Configuration
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final UserDetailsService userDetailsService;
  private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

  public SecurityConfig(
      JwtTokenProvider tokenProvider,
      JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
      UserDetailsService userDetailsService) {
    this.jwtAuthenticationFilter = new JwtAuthenticationFilter(tokenProvider,userDetailsService);
    this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    this.userDetailsService = userDetailsService;
  }

  @PostConstruct
  public void init() {
    SecurityContextHolder.setStrategyName(
        SecurityContextHolder.MODE_INHERITABLETHREADLOCAL
    );
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        // Disable CSRF for stateless JWT authentication
        .csrf(AbstractHttpConfigurer::disable)
        // Disable form login and HTTP Basic authentication
        .formLogin(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        // Configure CORS
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // Configure authorization rules
        // NOTE: Order matters! More specific rules must come before general rules
        .authorizeHttpRequests(auth -> auth
            // Public endpoints
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/api/v1/auth/**").permitAll()
            .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
            .requestMatchers("/api/v1/public/**").permitAll()
            // Public article endpoints - POST list/feed is public, create requires auth
            .requestMatchers(HttpMethod.POST, "/api/v1/articles").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/articles/feed").permitAll()
            // Admin-only endpoints
            .requestMatchers("/api/v1/admin/**").hasRole("admin")
            // Authenticated endpoints
            .requestMatchers("/api/v1/articles/create").authenticated()
            .requestMatchers("/api/v1/users/**").authenticated()
            // Business endpoints - GET list is public, everything else requires auth
            .requestMatchers(HttpMethod.GET, "/api/v1/businesses").permitAll()
            .requestMatchers("/api/v1/businesses/**").authenticated()
            .anyRequest().permitAll()
        )
        // Configure exception handling
        .exceptionHandling(exception -> exception
            .authenticationEntryPoint(jwtAuthenticationEntryPoint)
        )
        // Configure session management
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        )
        // Add JWT filter
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .securityContext(context -> context
            .requireExplicitSave(false)
        )
        .build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // Configure allowed origins using patterns to support credentials with wildcards
    configuration.setAllowedOriginPatterns(Arrays.asList(
        // Existing explicit origins you already had
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://192.168.1.220:5173",
        "http://192.168.1.220:5174",
        "https://testlaudium.netlify.app",
        "https://laudium.abc.co.zm",

        // LaudiumBiz primary domain and any subdomains (any port)
        "https://laudiumbiz.co.za",
        "https://laudiumbiz.co.za:*",
        "https://*.laudiumbiz.co.za",
        "https://*.laudiumbiz.co.za:*",

        // LaudiumPost primary domain and www subdomain — for public homepage API calls
        // NOTE: Narrowed from wildcard subdomains. Only explicit domains needed.
        // If additional subdomains are needed (e.g. staging), add them explicitly.
        "https://laudiumpost.co.za",
        "https://www.laudiumpost.co.za",

        // Local development (any or no port)
        "http://localhost",
        "https://localhost",
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1",
        "https://127.0.0.1",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
        "http://0.0.0.0",
        "https://0.0.0.0",
        "http://0.0.0.0:*",
        "https://0.0.0.0:*",

        // LAN devices (any 192.168.x.x, any port)
        "http://192.168.*.*:*",
        "https://192.168.*.*:*"
        // Optionally add other private ranges such as 10.x.x.x or 172.16-31.x.x
    ));

    // Configure allowed methods
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

    // Configure allowed headers
    configuration.setAllowedHeaders(List.of("*"));

    // Configure exposed headers (useful for pagination, etc.)
    configuration.setExposedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "X-Total-Count",
        "X-Page-Number",
        "X-Page-Size"
    ));

    // Allow credentials
    configuration.setAllowCredentials(true);

    // Set max age for preflight requests
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);

    return source;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
    authProvider.setUserDetailsService(userDetailsService);
    authProvider.setPasswordEncoder(passwordEncoder());
    return authProvider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }
}