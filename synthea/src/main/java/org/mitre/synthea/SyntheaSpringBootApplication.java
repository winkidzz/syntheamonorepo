package org.mitre.synthea;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

@OpenAPIDefinition(
    info = @Info(
        title = "Synthea API",
        version = "1.0",
        description = "API documentation for Synthea Spring Boot application"
    )
)
@SpringBootApplication
public class SyntheaSpringBootApplication {
    public static void main(String[] args) {
        SpringApplication.run(SyntheaSpringBootApplication.class, args);
    }
} 