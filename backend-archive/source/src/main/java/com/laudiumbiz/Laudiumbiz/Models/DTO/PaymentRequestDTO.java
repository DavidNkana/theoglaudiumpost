    /*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import java.time.LocalDateTime;
import java.util.List;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Data transfer object for creating or updating payment transactions with PayFast or EFT
 *
 * TYPE: Request DTO
 *
 * USED BY: PaymentController - POST /api/v1/payments/create, PUT /api/v1/payments/{id}
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class PaymentRequestDTO {
    String payment_id;

    String pf_payment_id;

    Integer user_id;
    
    Integer business_id;

    String payment_method;
    
    String status;
    
    String eft_reference;
    
    Double eft_amount;
    
    Double amount_gross;

    Double amount_fee;

    Double amount_net;

    String currency = "ZAR";

    String item_name;

    String item_description;

    String customer_email;

    String customer_name;
    
    String image;
    
    LocalDateTime date;
    
    List<String> images;
    
    String ad_description;
    String click_url;
    LocalDateTime start_date;
    LocalDateTime end_date;
    String placement_info;
    Integer placement_id;
    Boolean design_help;

    public String getPayment_id() {
        return payment_id;
    }

    public String getPf_payment_id() {
        return pf_payment_id;
    }

    public Integer getUser_id() {
        return user_id;
    }
    
    public Integer getBusiness_id() {
        return business_id;
    }

    public String getStatus() {
        return status;
    }

    public Double getAmount_gross() {
        return amount_gross;
    }

    public Double getAmount_fee() {
        return amount_fee;
    }

    public Double getAmount_net() {
        return amount_net;
    }

    public String getCurrency() {
        return currency;
    }

    public String getItem_name() {
        return item_name;
    }

    public String getItem_description() {
        return item_description;
    }

    public String getCustomer_email() {
        return customer_email;
    }

    public String getCustomer_name() {
        return customer_name;
    }

    public String getAd_description() {
        return ad_description;
    }

    public String getClick_url() {
        return click_url;
    }

    public LocalDateTime getStart_date() {
        return start_date;
    }

    public LocalDateTime getEnd_date() {
        return end_date;
    }

    public String getPlacement_info() {
        return placement_info;
    }

    public Integer getPlacement_id() {
        return placement_id;
    }

    public String getImage() {
        return image;
    }

    public String getPayment_method() {
        return payment_method;
    }

    public String getEft_reference() {
        return eft_reference;
    }

    public Double getEft_amount() {
        return eft_amount;
    }

    public List<String> getImages() {
        return images;
    }

    public Boolean getDesign_help() {
        return design_help;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }
    
}
