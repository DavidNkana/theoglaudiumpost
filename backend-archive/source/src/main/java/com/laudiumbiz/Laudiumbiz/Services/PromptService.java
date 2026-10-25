package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Prompt;
import com.laudiumbiz.Laudiumbiz.Models.DB.PromptDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.PromptRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * PURPOSE: Encapsulates persistence and lookup operations for {@link Prompt}
 * entities so controllers depend on this service rather than on PromptRepository.
 *
 * KEY METHODS:
 * - getAllPrompts(): returns all prompts.
 * - getPromptByName(String name): returns the prompt with the given name or throws if not found.
 * - createPrompt(PromptDTO payload): builds and persists a new prompt from the payload.
 * - updatePrompt(String id, PromptDTO payload): updates an existing prompt's fields and persists it.
 * - deactivatePrompt(String id): soft-deletes a prompt by setting active to false.
 *
 * @author Imran
 */
@Service
public class PromptService {

    private final PromptRepository promptRepository;

    public PromptService(PromptRepository promptRepository) {
        this.promptRepository = promptRepository;
    }

    public List<Prompt> getAllPrompts() {
        return promptRepository.findAll();
    }

    public Prompt getPromptByName(String name) {
        return promptRepository.findByName(name)
                .orElseThrow(() -> new Error("Prompt not found: " + name));
    }

    public Prompt createPrompt(PromptDTO payload) {
        Prompt prompt = new Prompt();
        prompt.setName(payload.getName());
        prompt.setType(payload.getType());
        prompt.setContent(payload.getContent());
        prompt.setActive(payload.getActive());
        return promptRepository.save(prompt);
    }

    public Prompt updatePrompt(String id, PromptDTO payload) {
        Prompt prompt = promptRepository.findById(Integer.parseInt(id))
                .orElseThrow(() -> new Error("Prompt not found: " + id));
        prompt.setName(payload.getName());
        prompt.setType(payload.getType());
        prompt.setContent(payload.getContent());
        prompt.setActive(payload.getActive());
        return promptRepository.save(prompt);
    }

    public Prompt deactivatePrompt(String id) {
        Prompt prompt = promptRepository.findById(Integer.parseInt(id))
                .orElseThrow(() -> new Error("Prompt not found: " + id));
        prompt.setActive(false);
        return promptRepository.save(prompt);
    }
}
