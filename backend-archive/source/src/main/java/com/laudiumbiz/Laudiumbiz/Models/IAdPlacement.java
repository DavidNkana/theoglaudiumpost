/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import java.time.LocalDateTime;

/**
 *
 * @author issai
 */
public interface IAdPlacement {
    Integer getId();
    void setId(Integer id);

    String getLocation();
    void setLocation(String location);

    String getDescription();
    void setDescription(String description);

    Double getFee();
    void setFee(Double fee);

    String getFee_type();
    void setFee_type(String fee_type);

    String getBilling_unit();
    void setBilling_unit(String billing_unit);

    String getStatus();
    void setStatus(String status);

    String getAspect_ratio();
    void setAspect_ratio(String aspect_ratio);

    Boolean getIs_rotating();
    void setIs_rotating(Boolean is_rotating);

    Integer getImage_id();
    void setImage_id(Integer image_id);

    LocalDateTime getCreated_at();
    void setCreated_at(LocalDateTime created_at);

    LocalDateTime getUpdated_at();
    void setUpdated_at(LocalDateTime updated_at);
}
