package dev.javabase.learningapi.web;

import jakarta.validation.constraints.NotNull;

public record CompletionRequest(@NotNull Boolean completed) {
}
