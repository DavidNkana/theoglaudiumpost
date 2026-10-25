package com.laudiumbiz.Laudiumbiz.Models;

import lombok.Data;

/**
 * This class has been modified as part of removing JWT authentication from the application.
 * It no longer contains JWT token information.
 * 
 * @author Imran
 */
@Data
public class LoginResponse {
    // User information fields could be added here if needed
    private String message;
    
    public LoginResponse() {
        this.message = "Authentication successful";
    }
    
    public LoginResponse(String message) {
        this.message = message;
    }
}
