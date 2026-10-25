package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.CategoryOrTagRequest;
import com.laudiumbiz.Laudiumbiz.Models.DB.Tag;
import com.laudiumbiz.Laudiumbiz.Repositories.TagRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * PURPOSE: Encapsulates all data-access logic for article tags so that
 * TagController performs no direct repository access.
 *
 * KEY METHODS:
 * - getAllTags(): Retrieve all tags
 * - createTag(CategoryOrTagRequest): Persist a new tag
 * - updateTag(Integer, CategoryOrTagRequest): Update an existing tag
 * - softDeleteTag(Integer): Soft delete a tag by setting is_deleted = true
 *
 * DEPENDENCIES:
 * - TagRepository: JPA repository for tag operations
 */
@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    public Tag createTag(CategoryOrTagRequest payload) {
        Tag tag = new Tag();
        tag.setName(payload.getName());
        tag.setSlug(payload.getSlug());
        tag.setIs_deleted(payload.getIsDeleted());

        return tagRepository.save(tag);
    }

    public Tag updateTag(Integer id, CategoryOrTagRequest payload) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new Error("Tag not found with id: " + id));
        tag.setName(payload.getName());
        tag.setSlug(payload.getSlug());
        tag.setIs_deleted(payload.getIsDeleted());

        return tagRepository.save(tag);
    }

    public void softDeleteTag(Integer id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new Error("Tag not found with id: " + id));
        tag.setIs_deleted(true);
        tagRepository.save(tag);
    }
}
