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
public class Image {
    String id;
    
    String image;

    public Image(String id, String image) {
        this.id = id;
        this.image = image;
    }
    
    
}
