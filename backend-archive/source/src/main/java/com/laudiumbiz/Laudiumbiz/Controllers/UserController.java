/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Logic.UserLogic;
import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author Imran
 */

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final UserLogic logic;

    // Get all users
//    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
//    public ResponseEntity<?> getAllUsers() {
//        try {
//            var users = logic.getUsers();
//            return ResponseEntity.ok().body(gson.toJson(users));
//
//        } catch (Exception ex) {
//            Logger.getLogger(UserController.class.getName()).log(Level.SEVERE, null, ex);
//            return errorHandler.getError(ex);
//            // return ResponseEntity.noContent();
//        }
//    }

    @GetMapping(path = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> authenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Handle the case where authentication is null (no authenticated user)
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }
        
        var currentUser = authentication.getPrincipal();
        return ResponseEntity.ok().body(currentUser);
    }

}