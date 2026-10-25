/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import lombok.Data;

/**
 *
 * @author Imran
 */
@Data
public class BusinessDTO {
    private String name;
    private String email;
    private String phone;
    private String location;
    private Boolean isDeleted;
    private String password; 
}