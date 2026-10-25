package com.laudiumbiz.Laudiumbiz.Utils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Pure JDBC utility for raw, parameterized database operations.
 * Uses Spring's DataSource (HikariCP) for connection management.
 */
@Component
public class LaudiumJdbcUtil {

    private static DataSource dataSource;
    private static String DB_NAME = "laudium";

    @Autowired
    public void setDataSource(DataSource ds) {
        LaudiumJdbcUtil.dataSource = ds;
    }

    public static String getDbName() {
        return DB_NAME;
    }

    public static void setDbName(String db) {
        DB_NAME = db;
    }

    private static Connection getConnection() throws SQLException {
        Connection con = dataSource.getConnection();
        con.setCatalog(DB_NAME);
        return con;
    }

    /**
     * Execute a raw SELECT query and return a CustomRs.
     */
    public static CustomRs getSelectRaw(String sql) throws SQLException {
        Connection con = getConnection();
        try {
            Statement stmt = con.createStatement();
            ResultSet rs = stmt.executeQuery(sql);
            return new CustomRs(rs) {
                @Override
                public void close() throws SQLException {
                    rs.close();
                    stmt.close();
                    con.close();
                }
            };
        } catch (SQLException e) {
            con.close();
            throw e;
        }
    }

    /**
     * Execute a raw SELECT query with prepared statement parameters.
     */
    public static CustomRs getSelectRawPrepared(String sql, Object... params) throws SQLException {
        Connection con = getConnection();
        try {
            PreparedStatement ps = con.prepareStatement(sql);
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            ResultSet rs = ps.executeQuery();
            return new CustomRs(rs) {
                @Override
                public void close() throws SQLException {
                    rs.close();
                    ps.close();
                    con.close();
                }
            };
        } catch (SQLException e) {
            con.close();
            throw e;
        }
    }

    /**
     * Execute an INSERT/UPDATE/DELETE with raw SQL.
     */
    public static String getInsertRaw(String sql) throws SQLException {
        Connection con = getConnection();
        try {
            Statement stmt = con.createStatement();
            int affected = stmt.executeUpdate(sql, Statement.RETURN_GENERATED_KEYS);
            String result = String.valueOf(affected);
            if (affected > 0) {
                ResultSet keys = stmt.getGeneratedKeys();
                if (keys != null && keys.next()) {
                    result = keys.getString(1);
                    keys.close();
                }
            }
            stmt.close();
            con.close();
            return result;
        } catch (SQLException e) {
            con.close();
            throw e;
        }
    }

    /**
     * Execute an INSERT/UPDATE/DELETE with prepared statement.
     */
    public static String getInsertRawPrepared(String sql, Object... params) throws SQLException {
        Connection con = getConnection();
        try {
            PreparedStatement ps = con.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            int affected = ps.executeUpdate();
            String result = String.valueOf(affected);
            if (affected > 0) {
                ResultSet keys = ps.getGeneratedKeys();
                if (keys != null && keys.next()) {
                    result = keys.getString(1);
                    keys.close();
                }
            }
            ps.close();
            con.close();
            return result;
        } catch (SQLException e) {
            con.close();
            throw e;
        }
    }

    /**
     * Select and map results using a row mapper function.
     */
    public static <T> List<T> select(String sql, Function<CustomRs, T> mapper) throws SQLException {
        List<T> results = new ArrayList<>();
        CustomRs rs = getSelectRaw(sql);
        try {
            while (rs.next()) {
                results.add(mapper.apply(rs));
            }
            return results;
        } finally {
            rs.close();
        }
    }

    /**
     * Select and map results with prepared statement.
     */
    public static <T> List<T> selectPrepared(String sql, Function<CustomRs, T> mapper, Object... params) throws SQLException {
        List<T> results = new ArrayList<>();
        CustomRs rs = getSelectRawPrepared(sql, params);
        try {
            while (rs.next()) {
                results.add(mapper.apply(rs));
            }
            return results;
        } finally {
            rs.close();
        }
    }

    /**
     * Execute a query and consume each row with the mapper.
     */
    public static void selectAndConsume(String sql, java.util.function.Consumer<CustomRs> consumer) throws SQLException {
        CustomRs rs = getSelectRaw(sql);
        try {
            while (rs.next()) {
                consumer.accept(rs);
            }
        } finally {
            rs.close();
        }
    }

    /**
     * Get the underlying DataSource for callers that need direct JDBC access.
     */
    public static DataSource getDataSource() {
        return dataSource;
    }
}