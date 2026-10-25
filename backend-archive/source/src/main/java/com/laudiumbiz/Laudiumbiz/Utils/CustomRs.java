package com.laudiumbiz.Laudiumbiz.Utils;

import java.sql.*;
import java.time.LocalDateTime;

/**
 * Wraps a JDBC ResultSet with convenience methods for column access.
 * Used throughout the codebase for custom query result handling.
 */
public class CustomRs implements AutoCloseable {
    private final ResultSet rs;

    public CustomRs(ResultSet rs) {
        this.rs = rs;
    }

    public boolean next() throws SQLException {
        return rs.next();
    }

    @Override
    public void close() throws SQLException {
        rs.close();
    }

    public String getString(String column) throws SQLException {
        String val = rs.getString(column);
        return rs.wasNull() ? null : val;
    }

    public Integer getInt(String column) throws SQLException {
        int val = rs.getInt(column);
        return rs.wasNull() ? null : val;
    }

    public Long getLong(String column) throws SQLException {
        long val = rs.getLong(column);
        return rs.wasNull() ? null : val;
    }

    public Boolean getBoolean(String column) throws SQLException {
        boolean val = rs.getBoolean(column);
        return rs.wasNull() ? null : val;
    }

    public Double getDouble(String column) throws SQLException {
        double val = rs.getDouble(column);
        return rs.wasNull() ? null : val;
    }

    public Timestamp getTimestamp(String column) throws SQLException {
        return rs.getTimestamp(column);
    }

    public LocalDateTime getLocalDateTime(String column) throws SQLException {
        Timestamp ts = rs.getTimestamp(column);
        return ts != null ? ts.toLocalDateTime() : null;
    }

    /**
     * Count total rows in the result set.
     * NOTE: This iterates through all remaining rows to count them.
     * The caller has already consumed rs.next() if this is called after an initial next().
     */
    public long resultSize() throws SQLException {
        long count = 1; // already consumed one row via next() in the caller
        while (rs.next()) {
            count++;
        }
        return count;
    }

    public ResultSet getResultSet() {
        return rs;
    }

    public boolean isClosed() throws SQLException {
        return rs.isClosed();
    }
}