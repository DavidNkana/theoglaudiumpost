/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.security;

import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 *
 * @author Imran
 */

@Slf4j
@Service
public class LauduimUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
      log.debug("Loading user by email: {}", email);
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null || user.getId() == null) {
                throw new UsernameNotFoundException("User not found with email: " + email);
            }
            return new LauduimUserDetails(user);

        } catch (Exception e) {
            throw new UsernameNotFoundException("User not found with email: " + email);
        }

    }

    public UserDetails getUserById(String id)  throws UsernameNotFoundException {
      log.debug("Loading user by id: {}", id);
      try {
        User user = userRepository.findById(Integer.valueOf(id)).orElse(null);
        if (user == null || user.getId() == null) {
          throw new UsernameNotFoundException("User not found with id: " + id);
        }
        return new LauduimUserDetails(user);

      } catch (Exception e) {
        throw new UsernameNotFoundException("User not found with id: " + id);
      }

    }
}