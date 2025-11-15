package knca.signer.example;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class KncaSignerExampleApplicationTest {

    @Test
    void contextLoads() {
        assertNotNull(LocalDateTime.now());
    }

}