package com.laudiumbiz.Laudiumbiz.Models.DB;

/**
 *
 * @author Imran
 */

public class RegisterUserRequest {
    private String email;
    private String password;
    private String fullName;

    public String getEmail() {
        return email;
    }

    public RegisterUserRequest setEmail(String email) {
        this.email = email;
        return this;
    }

    public String getPassword() {
        return password;
    }

    public RegisterUserRequest setPassword(String password) {
        this.password = password;
        return this;
    }

    public String getFullName() {
        return fullName;
    }

    public RegisterUserRequest setFullName(String fullName) {
        this.fullName = fullName;
        return this;
    }

    @Override
    public String toString() {
        return "RegisterUserDto{" +
                "email='" + email + '\'' +
                ", password='" + password + '\'' +
                ", fullName='" + fullName + '\'' +
                '}';
    }
}