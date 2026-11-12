package ru.vsu.partner;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedListener {

    private final PartnerRepository repository;
    private final RabbitTemplate rabbitTemplate;

    public OrderCreatedListener(PartnerRepository repository,
                                RabbitTemplate rabbitTemplate) {
        this.repository = repository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = "partner.order.created.queue")
    public void handle(OrderCreatedEvent event) {
        Partner partner = repository.findFirstByActiveTrue().orElseGet(() -> {
            Partner p = new Partner();
            p.setName("Default Partner");
            p.setType("restaurant");
            p.setActive(true);
            return repository.save(p);
        });

        rabbitTemplate.convertAndSend(
                "partners",
                "partner.assigned",
                new PartnerAssignedEvent(event.orderId(), partner.getId(), partner.getName())
        );
    }
}