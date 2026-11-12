package ru.vsu.partner;

public record PartnerAssignedEvent(String orderId, String partnerId, String partnerName) {}