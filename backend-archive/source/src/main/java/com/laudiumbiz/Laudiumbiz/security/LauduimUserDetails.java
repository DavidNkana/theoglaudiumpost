package com.laudiumbiz.Laudiumbiz.security;

import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class LauduimUserDetails implements UserDetails {
  @Getter
  private final User user;
  private final List<GrantedAuthority> authorities;

  public LauduimUserDetails(User user){
    this.user = user;
    if(user.getRole() != null && user.getRole().getName() != null){
      this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));
    }else{
      this.authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }
  }
  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  @Override
  public String getPassword() {
    return user.getPassword();
  }


  @Override
  public String getUsername() {
    return user.getEmail();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
