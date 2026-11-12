package ru.vsu.partner;

public record OrderCreatedEvent(String orderId, String customerId, double totalAmount) {}