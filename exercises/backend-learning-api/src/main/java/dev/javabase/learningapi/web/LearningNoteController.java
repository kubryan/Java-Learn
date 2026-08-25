package dev.javabase.learningapi.web;

import dev.javabase.learningapi.model.LearningNote;
import dev.javabase.learningapi.service.LearningNoteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class LearningNoteController {
    private final LearningNoteService service;

    public LearningNoteController(LearningNoteService service) {
        this.service = service;
    }

    @GetMapping
    public List<LearningNote> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public LearningNote findById(@PathVariable long id) {
        return service.findById(id);
    }

    @PatchMapping("/{id}/completion")
    public ResponseEntity<LearningNote> setCompletion(
            @PathVariable long id,
            @Valid @RequestBody CompletionRequest request
    ) {
        return ResponseEntity.ok(service.setCompletion(id, request.completed()));
    }
}
