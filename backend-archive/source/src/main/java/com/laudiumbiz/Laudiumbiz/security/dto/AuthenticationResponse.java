package com.laudiumbiz.Laudiumbiz.security.dto;

import com.laudiumbiz.Laudiumbiz.Models.DTO.UserDto;
import lombok.Builder;

@Builder
public record AuthenticationResponse(String token, String refreshToken, String tokenType, Long expiresIn, UserDto user) {
}
