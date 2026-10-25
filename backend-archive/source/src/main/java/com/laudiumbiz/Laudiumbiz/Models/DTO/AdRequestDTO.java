/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

/**
 *
 * @author Imran
 */
@Data
public class AdRequestDTO {

    Integer payment_id;

    Integer business_id;

    Integer placement_id;

    String title;

    String description;

    String imageUrl;

    String videoUrl;

    String videoBase64;  // Base64 encoded video for upload to Cloudinary

    Status status;

    String payment_status;

    String clickUrl;

    String imageBase64;

    String placement_info;

    Double total_cost;

//    Boolean is_deleted;
    LocalDateTime placementDate, expiryDate;

    List<Integer> tags;

    PaymentInfo payment_info;

    List<String> images;

    public enum Status {
        pending, active, expired
    }

}
