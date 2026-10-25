package com.laudiumbiz.Laudiumbiz.Models.DTO;


import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import lombok.extern.slf4j.Slf4j;

import java.sql.ResultSet;
import java.sql.SQLException;

@Slf4j
public record UserDto(
    Integer id,
    String name,
    String email,
    Integer businessId,
    Role role,
    Business business
) {

  public record Role(Integer id, String name) {
  }

  public record Business(Integer id, String name, String email, String phone, String website, String location) {
  }
//name: string, email: string, phone: string, website: string, location: string

  public static UserDto fromEntity(User user) {
    try {
      String sql = """
          SELECT
               u.id,
               u.name,
               u.email,
               u.role_id,
               r.name AS role_name,
               b.id AS business_id,
               b.`name` AS business_name,
               b.email AS business_email,
               b.phone AS business_phone,
               b.website AS business_website,
               b.location AS business_location
               FROM users u
               LEFT JOIN businesses b ON b.user_id = u.id
               LEFT JOIN roles r ON r.id = u.role_id
               WHERE u.id = ?
          """;

      return LaudiumJdbcUtil.selectPrepared(sql, row -> {
        try {
          return new UserDto(
              row.getInt("id"),
              row.getString("name"),
              row.getString("email"),
              row.getString("business_id") != null ? row.getInt("business_id") : null,
              new Role(row.getInt("role_id"), row.getString("role_name")),
              row.getString("business_id") != null
                  ? new Business(
                  row.getInt("business_id"),
                  row.getString("business_name"),
                  row.getString("business_email"),
                  row.getString("business_phone"),
                  row.getString("business_website"),
                  row.getString("business_location")
              )
                  : null
          );
        } catch (SQLException e) {
          throw new RuntimeException(e);
        }
      }, user.getId()).stream().findFirst().orElseThrow();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}