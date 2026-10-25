package com.laudiumbiz.Laudiumbiz.Services;

import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

/**
 * PURPOSE: Provides Google Cloud Platform authentication and access token management.
 * Handles service account authentication for accessing Google Cloud APIs.
 *
 * KEY METHODS:
 * - getAccessToken(): Retrieves a valid OAuth2 access token for Google Cloud Platform APIs
 *
 * INTEGRATIONS: Google Cloud Platform OAuth2 API using service account credentials
 */
@Service
public class GoogleAuthService {

    private static final String[] SCOPES = {
        "https://www.googleapis.com/auth/cloud-platform"
    };
    
    private static final String SERVICE_ACCOUNT_FILE = "lyt-soft-b1d4dd639399.json";

    public String getAccessToken() throws IOException {
        ClassPathResource resource = new ClassPathResource(SERVICE_ACCOUNT_FILE);
        InputStream inputStream = resource.getInputStream();
        
        GoogleCredentials credentials = GoogleCredentials
            .fromStream(inputStream)
            .createScoped(Arrays.asList(SCOPES));

        credentials.refreshIfExpired();

        return credentials.getAccessToken().getTokenValue();
    }
}