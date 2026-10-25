package com.laudiumbiz.Laudiumbiz.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Architecture gate (AGENTS Multi-Stack Quality Gate Contract — Java).
 *
 * Enforces the controller boundary in the byte-code dependency graph, not by
 * review: controllers stay thin (no direct persistence) and never construct or
 * depend on HTTP clients — external API access belongs in the Services layer
 * (per the API Service Boundary rule).
 *
 * Written as explicit JUnit 5 tests calling rule.check(...) so the rules
 * genuinely execute under the Jupiter engine. This is the seed of the backend
 * ArchUnit ruleset; layering, domain-purity, and no-cycle rules are added as
 * the coverage/architecture build-out proceeds.
 */
class LayeredArchitectureTest {

    private static final JavaClasses PRODUCTION_CLASSES =
        new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.laudiumbiz.Laudiumbiz");

    @Test
    void controllers_must_not_depend_on_repositories() {
        noClasses()
            .that().resideInAPackage("..Controllers..")
            .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
            .check(PRODUCTION_CLASSES);
    }

    @Test
    void controllers_must_not_use_http_clients() {
        noClasses()
            .that().resideInAPackage("..Controllers..")
            .should().dependOnClassesThat()
            .haveFullyQualifiedName("org.springframework.web.client.RestTemplate")
            .orShould().dependOnClassesThat()
            .haveFullyQualifiedName("okhttp3.OkHttpClient")
            .orShould().dependOnClassesThat()
            .resideInAPackage("org.springframework.web.reactive.function.client..")
            .because("external API access must go through the Services layer, not controllers")
            .check(PRODUCTION_CLASSES);
    }
}
