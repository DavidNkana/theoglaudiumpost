/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import lombok.Data;

/**
 *
 * @author Imran Issa
 */

/**
 * PURPOSE: Data transfer object for creating or updating ad placement configurations
 *
 * TYPE: Request DTO
 *
 * USED BY: AdPlacementController - POST /api/v1/ad-placements/create, PUT /api/v1/ad-placements/{id}
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
@Data
public class AdPlacementRequestDTO {

    String location;
    String description;
    String aspectRatio;
//    Double width;
//    Double height;
    Double fee;
    FeeType fee_type;
    BillingUnit billing_unit;
    String imageBase64;
    Status status;
    Boolean rotating;

    public enum Status {
        inactive, active, deleted
    }

    public enum FeeType {
        FIXED, CPM
    }

    public enum BillingUnit {
        DAY, WEEK, MONTH
    }
}
