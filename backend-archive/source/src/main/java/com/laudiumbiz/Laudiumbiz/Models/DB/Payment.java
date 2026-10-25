package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Payment entity for PayFast transactions.
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String payment_id;
    private String pf_payment_id;
    private Integer user_id;
    private Integer business_id;
    private String status;
    private Double amount_gross;
    private Double amount_fee;
    private Double amount_net;
    private String currency = "ZAR";
    private String item_name;
    private String item_description;
    private String customer_email;
    private String customer_name;
    private String payment_method;
    private String eft_reference;
    private Double eft_amount;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
    private LocalDateTime completed_at;

    // Relationship - marked transient for now
    @Transient
    private Businesses business;
}