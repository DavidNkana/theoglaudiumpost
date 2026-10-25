/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import lombok.Data;

/**
 *
 * @author issai
 */
@Data
public class Placement {
    Integer id;

    String location;

    String description;

    Double fee;

    String fee_type, billing_unit;

    String status;
    String aspect_ratio;

    Boolean is_rotating;

    Integer image_id;
}
