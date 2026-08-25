package dev.javabase.learningapi.service;

import dev.javabase.learningapi.model.LearningNote;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class LearningNoteService {
    private final List<LearningNote> notes = new CopyOnWriteArrayList<>(List.of(
            new LearningNote(1, "環境準備", false),
            new LearningNote(2, "變數與資料型別", false),
            new LearningNote(3, "條件與迴圈", false)
    ));

    public List<LearningNote> findAll() {
        return List.copyOf(notes);
    }

    public LearningNote findById(long id) {
        return notes.stream()
                .filter(note -> note.id() == id)
                .findFirst()
                .orElseThrow(() -> new NoteNotFoundException(id));
    }

    public LearningNote setCompletion(long id, boolean completed) {
        LearningNote current = findById(id);
        LearningNote updated = new LearningNote(current.id(), current.title(), completed);
        notes.replaceAll(note -> note.id() == id ? updated : note);
        return updated;
    }

    public static final class NoteNotFoundException extends RuntimeException {
        public NoteNotFoundException(long id) {
            super("找不到筆記：" + id);
        }
    }
}
