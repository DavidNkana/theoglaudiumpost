package com.laudiumbiz.Laudiumbiz;

import com.laudiumbiz.Laudiumbiz.Controllers.BusinessDashboardController;
import com.laudiumbiz.Laudiumbiz.Controllers.CategoryController;
import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import com.laudiumbiz.Laudiumbiz.Repositories.CategoryRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Services.CategoryService;
import com.laudiumbiz.Laudiumbiz.Services.BusinessDashboardService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.junit.jupiter.api.*;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.lang.reflect.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class JdbcResourceClosureRegressionTest {
    private CountingDataSource dataSource;
    private ExecutorService executor;

    @BeforeEach
    void setUp() {
        dataSource = new CountingDataSource();
        new LaudiumJdbcUtil().setDataSource(dataSource);
        executor = Executors.newSingleThreadExecutor();
    }

    @AfterEach
    void tearDown() throws Exception {
        executor.shutdownNow();
        executor.awaitTermination(2, TimeUnit.SECONDS);
    }

    @Test
    void categoryArticlesEndpointReturnsAllJdbcConnectionsToPool() {
        Category category = new Category();
        category.setId(7);
        category.setName("News");
        category.setSlug("news");
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        when(categoryRepository.findAll()).thenReturn(List.of(category));
        CategoryService categoryService = new CategoryService(categoryRepository);
        CategoryController controller = new CategoryController(executor, new ErrorHandlig(), categoryService);

        for (int i = 0; i < 5; i++) {
            ResponseEntity<?> response = controller.articles("news", 0, 10);
            assertEquals(200, response.getStatusCode().value());
            assertEquals(0, dataSource.activeConnections(),
                    "CategoryController.articles must close count and article CustomRs resources on call " + i);
        }
    }

    @Test
    void businessDashboardEndpointsReturnAllJdbcConnectionsToPool() throws Exception {
        BusinessDashboardService dashboardService = new BusinessDashboardService(mock(PaymentRepository.class));
        BusinessDashboardController controller = new BusinessDashboardController(executor, new ErrorHandlig(), dashboardService);

        assertEquals(200, controller.getStats(1).get(2, TimeUnit.SECONDS).getStatusCode().value());
        assertEquals(0, dataSource.activeConnections(),
                "BusinessDashboardController.getStats must close its CustomRs resource");

        assertEquals(200, controller.getClicksAndImpressionsOverTime(1).get(2, TimeUnit.SECONDS).getStatusCode().value());
        assertEquals(0, dataSource.activeConnections(),
                "BusinessDashboardController.getClicksAndImpressionsOverTime must close its CustomRs resource");

        assertEquals(200, controller.getSpendOverTime(1).get(2, TimeUnit.SECONDS).getStatusCode().value());
        assertEquals(0, dataSource.activeConnections(),
                "BusinessDashboardController.getSpendOverTime must close its CustomRs resource");

        assertEquals(200, controller.getSpendPerPlacement(1).get(2, TimeUnit.SECONDS).getStatusCode().value());
        assertEquals(0, dataSource.activeConnections(),
                "BusinessDashboardController.getSpendPerPlacement must close its CustomRs resource");
    }

    private static final class CountingDataSource implements DataSource {
        private final AtomicInteger activeConnections = new AtomicInteger();
        int activeConnections() { return activeConnections.get(); }
        @Override public Connection getConnection() { activeConnections.incrementAndGet(); return proxy(Connection.class, new ConnectionHandler(this)); }
        @Override public Connection getConnection(String username, String password) { return getConnection(); }
        void closeConnection() { activeConnections.decrementAndGet(); }
        @Override public PrintWriter getLogWriter() { return null; }
        @Override public void setLogWriter(PrintWriter out) { }
        @Override public void setLoginTimeout(int seconds) { }
        @Override public int getLoginTimeout() { return 0; }
        @Override public Logger getParentLogger() throws SQLFeatureNotSupportedException { throw new SQLFeatureNotSupportedException(); }
        @Override public <T> T unwrap(Class<T> iface) throws SQLException { throw new SQLException("unwrap unsupported"); }
        @Override public boolean isWrapperFor(Class<?> iface) { return false; }
    }

    private static final class ConnectionHandler implements InvocationHandler {
        private final CountingDataSource dataSource;
        private boolean closed;
        ConnectionHandler(CountingDataSource dataSource) { this.dataSource = dataSource; }
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "createStatement" -> proxy(Statement.class, new StatementHandler(null));
                case "prepareStatement" -> proxy(PreparedStatement.class, new StatementHandler(String.valueOf(args[0])));
                case "close" -> { if (!closed) { closed = true; dataSource.closeConnection(); } yield null; }
                case "isClosed" -> closed;
                case "setCatalog", "setAutoCommit", "commit", "rollback" -> null;
                case "toString" -> "CountingConnection";
                default -> defaultValue(method.getReturnType());
            };
        }
    }

    private static final class StatementHandler implements InvocationHandler {
        private final String preparedSql;
        private boolean closed;
        StatementHandler(String preparedSql) { this.preparedSql = preparedSql; }
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "executeQuery" -> resultSet(preparedSql != null ? preparedSql : String.valueOf(args[0]));
                case "executeUpdate" -> 1;
                case "getGeneratedKeys" -> resultSet("generated_keys");
                case "setObject", "setString", "setInt", "setLong", "setDouble", "setBoolean" -> null;
                case "close" -> { closed = true; yield null; }
                case "isClosed" -> closed;
                case "toString" -> "CountingStatement";
                default -> defaultValue(method.getReturnType());
            };
        }
    }

    private static ResultSet resultSet(String sql) {
        return proxy(ResultSet.class, new ResultSetHandler(rowsFor(sql)));
    }

    private static final class ResultSetHandler implements InvocationHandler {
        private final List<Map<String, Object>> rows;
        private int index = -1;
        private boolean wasNull;
        private boolean closed;
        ResultSetHandler(List<Map<String, Object>> rows) { this.rows = rows; }
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "next" -> ++index < rows.size();
                case "close" -> { closed = true; yield null; }
                case "isClosed" -> closed;
                case "wasNull" -> wasNull;
                case "getString" -> stringValue(column(args));
                case "getInt" -> intValue(column(args));
                case "getLong" -> longValue(column(args));
                case "getDouble" -> doubleValue(column(args));
                case "getBoolean" -> booleanValue(column(args));
                case "toString" -> "CountingResultSet";
                default -> defaultValue(method.getReturnType());
            };
        }
        private Object column(Object[] args) {
            Object value = rows.get(index).get(String.valueOf(args[0]));
            wasNull = value == null;
            return value;
        }
        private String stringValue(Object value) { return value == null ? null : String.valueOf(value); }
        private int intValue(Object value) { return value instanceof Number number ? number.intValue() : 0; }
        private long longValue(Object value) { return value instanceof Number number ? number.longValue() : 0L; }
        private double doubleValue(Object value) { return value instanceof Number number ? number.doubleValue() : 0.0D; }
        private boolean booleanValue(Object value) { return value instanceof Boolean bool && bool; }
    }

    private static List<Map<String, Object>> rowsFor(String sql) {
        String lowerSql = sql.toLowerCase();
        if (lowerSql.contains("count(*)") || lowerSql.contains("count(1)")) {
            Map<String, Object> row = new HashMap<>();
            row.put("total", 0L);
            row.put("COUNT(*)", 0L);
            row.put("total_articles", 0L);
            row.put("published_count", 0L);
            row.put("draft_count", 0L);
            return List.of(row);
        }
        if (lowerSql.contains("as total_spent") || lowerSql.contains("as total_clicks") || lowerSql.contains(" as ctr")) {
            Map<String, Object> row = new HashMap<>();
            row.put("total_spent", 0.0D);
            row.put("total_ads", 0L);
            row.put("total_clicks", 0L);
            row.put("ctr", 0.0D);
            return List.of(row);
        }
        if (lowerSql.contains("generated_keys")) {
            Map<String, Object> row = new HashMap<>();
            row.put("1", "1");
            return List.of(row);
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class[]{type}, handler);
    }

    private static Object defaultValue(Class<?> type) {
        if (type == boolean.class) return false;
        if (type == byte.class) return (byte) 0;
        if (type == short.class) return (short) 0;
        if (type == int.class) return 0;
        if (type == long.class) return 0L;
        if (type == float.class) return 0F;
        if (type == double.class) return 0D;
        if (type == char.class) return '\0';
        return null;
    }
}
