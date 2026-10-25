package com.laudiumbiz.Laudiumbiz;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

public class ServletInitializer extends SpringBootServletInitializer {

    public static Boolean production = true;
    public static Boolean BLOCK_STOCK = false;

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(LaudiumbizApplication.class);
    }

}