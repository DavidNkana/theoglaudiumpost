package com.laudiumbiz.Laudiumbiz.Controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller for the home page and navigation to Swagger UI
 * 
 * @author Junie
 */
@Controller
public class HomeController {

    /**
     * Serves the home page when the root URL is accessed
     * 
     * @return The name of the view to render (home.html)
     */
    @GetMapping("/")
    public String home() {
        return "home";
    }
    
    /**
     * Redirects to the Swagger UI documentation
     * 
     * @return A redirect to the Swagger UI path
     */
    @GetMapping("/swagger")
    public String swagger() {
        return "redirect:/swagger-ui.html";
    }
}