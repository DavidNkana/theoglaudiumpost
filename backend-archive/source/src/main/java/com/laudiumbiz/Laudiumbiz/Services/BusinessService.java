package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.Businesses;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Models.BusinessDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.BusinessesRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.CampaignsRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PURPOSE: Centralizes all data access for business accounts so that
 * {@code BusinessController} performs no repository or raw-SQL operations.
 *
 * Holds constructor-injected repositories and uses {@link LaudiumJdbcUtil}
 * static helpers for the raw, dynamically-built SELECT queries. SQL strings,
 * parameters, and response shapes are preserved exactly as they were in the
 * controller.
 */
@Service
public class BusinessService {

  private final BusinessesRepository businessesRepository;
  private final UserRepository userRepository;
  private final AdRepository adRepository;
  private final CampaignsRepository campaignsRepository;
  private final PaymentRepository paymentRepository;
  private final PasswordEncoder passwordEncoder;

  public BusinessService(
      BusinessesRepository businessesRepository,
      UserRepository userRepository,
      AdRepository adRepository,
      CampaignsRepository campaignsRepository,
      PaymentRepository paymentRepository,
      PasswordEncoder passwordEncoder) {
    this.businessesRepository = businessesRepository;
    this.userRepository = userRepository;
    this.adRepository = adRepository;
    this.campaignsRepository = campaignsRepository;
    this.paymentRepository = paymentRepository;
    this.passwordEncoder = passwordEncoder;
  }

  /**
   * Raw-SQL paginated/filtered listing of non-deleted businesses.
   * Returns the response map (businesses + optional pagination) to be serialized by the caller.
   */
  public Map<String, Object> listBusinesses(
      int page, Integer size, String search, Long category, String status, String type) throws Exception {
    StringBuilder q = new StringBuilder("SELECT * FROM businesses WHERE is_deleted != 1");
    List<Object> params = new ArrayList<>();

    if (search != null && !search.isBlank()) {
      q.append(" AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      String likeSearch = "%" + search + "%";
      params.add(likeSearch);
      params.add(likeSearch);
      params.add(likeSearch);
    }

    if (status != null && !status.isBlank()) {
      q.append(" AND status = ?");
      params.add(status);
    }

    // Count
    String countQ = q.toString().replace("SELECT *", "SELECT COUNT(*)");
    long total = 0;
    try (CustomRs countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray())) {
      if (countRs.next()) {
        total = countRs.getLong("COUNT(*)");
      }
    }

    // Paginated results
    int limit = (size != null && size != 0) ? size : 100;
    int offset = page * limit;
    q.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.add(limit);
    params.add(offset);

    List<Businesses> businesses = new ArrayList<>();
    try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray())) {
      while (rs.next()) {
        Businesses b = new Businesses();
        b.setId(rs.getInt("id"));
        b.setName(rs.getString("name"));
        b.setEmail(rs.getString("email"));
        b.setPhone(rs.getString("phone"));
        b.setLocation(rs.getString("location"));
        b.setStatus(rs.getString("status"));
        b.setUser_id(rs.getInt("user_id"));
        b.setIs_deleted(rs.getInt("is_deleted") != 0);
        businesses.add(b);
      }
    }

    Map<String, Object> response = new HashMap<>();
    response.put("businesses", businesses);

    if (size != null && size != 0) {
      response.put("total", total);
      response.put("page", page);
      response.put("size", size);
      response.put("totalPages", (int) Math.ceil((double) total / size));
    }
    return response;
  }

  /**
   * Fetch a single business by id, or {@code null} if not found.
   */
  public Businesses getBusinessById(String id) {
    return businessesRepository.findById(Integer.valueOf(id)).orElse(null);
  }

  /**
   * Create a User (role 4) and an associated Business from the DTO.
   */
  public Businesses createBusiness(BusinessDTO dto) {
    User user = new User();
    user.setName(dto.getName());
    user.setEmail(dto.getEmail());
    user.setPassword(passwordEncoder.encode(dto.getPassword()));
    user.setRole_id(4);
    user = userRepository.save(user);

    Businesses business = new Businesses();
    business.setName(dto.getName());
    business.setEmail(dto.getEmail());
    business.setPhone(dto.getPhone());
    business.setLocation(dto.getLocation());
    business.setUser_id(user.getId());
    return businessesRepository.save(business);
  }

  /**
   * Update an existing business from the DTO. Throws if not found.
   */
  public Businesses updateBusiness(Integer id, BusinessDTO dto) throws Exception {
    Businesses business = businessesRepository.findById(id).orElseThrow(() -> new Exception("Business not found"));
    business.setName(dto.getName());
    business.setEmail(dto.getEmail());
    business.setPhone(dto.getPhone());
    business.setLocation(dto.getLocation());
    business.setIs_deleted(dto.getIsDeleted());
    businessesRepository.save(business);
    return business;
  }

  /**
   * Soft-delete a business (sets is_deleted = true). Throws if not found.
   */
  public void deleteBusiness(Integer id) throws Exception {
    Businesses business = businessesRepository.findById(id).orElseThrow(() -> new Exception("Business not found"));
    business.setIs_deleted(true);
    businessesRepository.save(business);
  }

  /**
   * Ads for the business owned by the given user email.
   */
  public List<Ad> getAdsForUserEmail(String userEmail) throws Exception {
    Businesses biz = businessesRepository.findByEmail(userEmail).orElse(null);
    if (biz == null) {
      throw new Exception("Business Not Found");
    }
    return adRepository.findByBusinessIdAndIsDeletedFalseOrderByCreatedAtDesc(biz.getId());
  }

  /**
   * Campaigns for the business owned by the given user email.
   */
  public List<Campaigns> getCampaignsForUserEmail(String userEmail) throws Exception {
    Businesses biz = businessesRepository.findByEmail(userEmail).orElse(null);
    if (biz == null) {
      throw new Exception("Business Not Found");
    }
    return campaignsRepository.findByBusiness_id(biz.getId());
  }

  /**
   * Raw-SQL paginated/filtered listing of payments for a business.
   * Returns the response map (payments + pagination) to be serialized by the caller.
   */
  public Map<String, Object> listPayments(
      Integer businessId, int page, int size, String search, String status) throws Exception {
    int offset = page * size;
    StringBuilder q = new StringBuilder("SELECT * FROM payments WHERE business_id = ?");
    List<Object> params = new ArrayList<>();
    params.add(businessId);

    if (status != null && !status.isBlank()) {
      q.append(" AND status = ?");
      params.add(status);
    }

    if (search != null && !search.isBlank()) {
      q.append(" AND (payment_id LIKE ? OR payment_method LIKE ?)");
      String likeSearch = "%" + search + "%";
      params.add(likeSearch);
      params.add(likeSearch);
    }

    String countQ = q.toString().replace("SELECT *", "SELECT COUNT(*)");
    long total = 0;
    try (CustomRs countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray())) {
      if (countRs.next()) {
        total = countRs.getLong("COUNT(*)");
      }
    }

    q.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.add(size);
    params.add(offset);

    List<Payment> payments = new ArrayList<>();
    try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray())) {
      while (rs.next()) {
        Payment p = new Payment();
        p.setId(rs.getInt("id"));
        p.setPayment_id(rs.getString("payment_id"));
        p.setStatus(rs.getString("status"));
        p.setAmount_gross(rs.getDouble("amount_gross"));
        p.setBusiness_id(rs.getInt("business_id"));
        payments.add(p);
      }
    }

    Map<String, Object> response = new HashMap<>();
    response.put("payments", payments);
    response.put("total", total);
    response.put("page", page);
    response.put("size", size);
    response.put("totalPages", (int) Math.ceil((double) total / size));

    return response;
  }
}
