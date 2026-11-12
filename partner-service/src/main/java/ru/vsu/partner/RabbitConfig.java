package ru.vsu.partner;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    @Bean
    public TopicExchange ordersExchange() {
        return new TopicExchange("orders", true, false);
    }

    @Bean
    public TopicExchange partnersExchange() {
        return new TopicExchange("partners", true, false);
    }

    @Bean
    public Queue partnerOrderCreatedQueue() {
        return new Queue("partner.order.created.queue", true);
    }

    @Bean
    public Binding partnerOrderCreatedBinding(Queue partnerOrderCreatedQueue,
                                              TopicExchange ordersExchange) {
        return BindingBuilder.bind(partnerOrderCreatedQueue)
                .to(ordersExchange).with("order.created");
    }
}