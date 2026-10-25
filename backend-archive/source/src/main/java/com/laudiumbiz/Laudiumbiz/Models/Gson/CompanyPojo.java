/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.Gson;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 *
 * @author User
 */
@Valid
public class CompanyPojo {
    @NotNull
    @NotBlank        
    String companyname;
    
    @NotNull
    @Valid
    UserPojo user;

    public String getCompanyname() {
        return companyname;
    }

    public void setCompanyname(String companyname) {
        this.companyname = companyname;
    }

    public UserPojo getUser() {
        return user;
    }

    public void setUser(UserPojo user) {
        this.user = user;
    }
    
    
}
