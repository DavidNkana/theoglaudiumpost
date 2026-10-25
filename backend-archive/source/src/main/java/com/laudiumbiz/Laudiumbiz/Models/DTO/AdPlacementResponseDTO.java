/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.DB.AdPlacement;
import com.laudiumbiz.Laudiumbiz.Models.DB.Placement;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import lombok.Data;

/**
 *
 * @author Imran Issa
 */

/**
 * PURPOSE: Data transfer object for returning ad placement configuration details
 *
 * TYPE: Response DTO
 *
 * USED BY: AdPlacementController - GET /api/v1/ad-placements, GET /api/v1/ad-placements/{id}
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
@Data
public class AdPlacementResponseDTO {

    Integer id;
    String name;
    String location;
    String description;
    Double width;
    Double height;
    Double fee;
    String dimensions;
    String fee_type;
    String billing_unit;
    String aspect_ratio;
    String status;
    Integer image_id;
    String image;
    Boolean is_rotating;

    public AdPlacementResponseDTO(Placement entity) {
        this.id = entity.getId();
        this.name = Utils.formatSeparatedString(entity.getLocation(), "_");
        this.location = entity.getLocation();
        this.description = entity.getDescription();
        this.aspect_ratio = entity.getAspect_ratio();
        this.image_id = entity.getImage_id();
        this.fee = entity.getFee();
        this.fee_type = entity.getFee_type();
        this.billing_unit = entity.getBilling_unit();
        this.status = entity.getStatus();
        this.is_rotating = entity.getIs_rotating();
    }
    
    
    public AdPlacementResponseDTO(AdPlacement entity) {
        this.id = entity.getId();
        this.name = Utils.formatSeparatedString(entity.getLocation(), "_");
        this.location = entity.getLocation();
        this.description = entity.getDescription();
        this.aspect_ratio = entity.getAspect_ratio();
        this.image_id = entity.getImage_id();
        this.fee = entity.getFee();
        this.fee_type = entity.getFee_type();
        this.billing_unit = entity.getBilling_unit();
        this.status = entity.getStatus();
        this.is_rotating = entity.getIs_rotating();
        this.image = (entity.getImage() != null) ? entity.getImage().getFile() : null;
    }
}
