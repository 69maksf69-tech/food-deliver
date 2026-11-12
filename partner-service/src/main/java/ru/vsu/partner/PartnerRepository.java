package ru.vsu.partner;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface PartnerRepository extends MongoRepository<Partner, String> {
    Optional<Partner> findFirstByActiveTrue();
}