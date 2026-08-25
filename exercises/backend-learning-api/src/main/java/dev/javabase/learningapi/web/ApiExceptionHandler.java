package dev.javabase.learningapi.web;

import dev.javabase.learningapi.service.LearningNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(LearningNoteService.NoteNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(LearningNoteService.NoteNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(exception.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiError> handleInvalidInput() {
        return ResponseEntity.badRequest().body(new ApiError("completed 必須是布林值。"));
    }

    public record ApiError(String message) {
    }
}
