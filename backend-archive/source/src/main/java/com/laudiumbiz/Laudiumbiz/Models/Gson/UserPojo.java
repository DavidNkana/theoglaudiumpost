/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.Gson;

import com.laudiumbiz.Laudiumbiz.Models.LocalIDModel.localidModel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 *
 * @author User
 */
public class UserPojo extends localidModel{
    @NotNull()
    @NotBlank()
    String name;
    
    @NotNull()
    @NotBlank()
    String email;
    
    String password;
    
    Integer role_id;
    
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    
    public String getEmail() {
        return email;
    }

    public void setEmail(String name) {
        this.name = name;
    }
    
    
    public Integer getRole() {
        return role_id;
    }

    public void setRole(Integer role_id) {
        this.role_id = role_id;
    }
    
    
    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
