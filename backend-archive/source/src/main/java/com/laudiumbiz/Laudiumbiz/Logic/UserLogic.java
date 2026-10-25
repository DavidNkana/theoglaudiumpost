/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Logic;


import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.laudiumbiz.Laudiumbiz.Models.Gson.UserPojo;
import com.laudiumbiz.Laudiumbiz.Repositories.UserRepository;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import java.util.List;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

/**
 *
 * @author User
 */
@Service
public class UserLogic {

    private final UserRepository userRepository;

    public UserLogic(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(UserPojo request) throws Exception {
        User user = new User();
        BeanUtils.copyProperties(request, user);
        user = userRepository.save(user);
        return user;
    }


    public List<User> getUsers() throws Exception {
        return userRepository.findAll();
    }


    public User getUserById(String id) throws Exception {
        return userRepository.findById(Integer.parseInt(id))
            .orElseThrow(() -> new Error("User not found with id: " + id));
    }

    // Update user
    public User updateUser(UserPojo request) throws Exception {
        User user = new User();
        BeanUtils.copyProperties(request, user);
        user = userRepository.save(user);
        return user;
    }

    // Delete user - uses raw SQL for hard delete
    public void deleteUser(String id) throws Exception {
        String sql = "DELETE FROM laudium_biz_db WHERE id = ?";
        LaudiumJdbcUtil.getInsertRawPrepared(sql, id);
    }

}