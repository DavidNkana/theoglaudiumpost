package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.SourceArticles;
import com.laudiumbiz.Laudiumbiz.Repositories.ArticlesRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.SourceArticlesRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * PURPOSE: Owns all database access for the AI article-generation endpoints (ChatGPT, Gemini, Grok)
 * so those controllers perform no direct repository access. Wraps the ArticlesRepository,
 * SourceArticlesRepository and MediaRepository lookups/saves used when generating and persisting
 * draft articles from source articles.
 *
 * KEY METHODS:
 * - findSourceArticle / findArticle: Optional lookups by id.
 * - saveArticle / saveSourceArticle: Persist and return the managed entity.
 * - saveMedia: Persist a Media row for a Cloudinary image url and return it (with generated id).
 *
 * INTEGRATIONS: None (internal database persistence service backed by the three repositories).
 */
@Service
public class AiArticlePersistenceService {

    private final ArticlesRepository articlesRepository;
    private final SourceArticlesRepository sourceArticlesRepository;
    private final MediaRepository mediaRepository;

    public AiArticlePersistenceService(
            ArticlesRepository articlesRepository,
            SourceArticlesRepository sourceArticlesRepository,
            MediaRepository mediaRepository) {
        this.articlesRepository = articlesRepository;
        this.sourceArticlesRepository = sourceArticlesRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Look up a SourceArticles row by id.
     *
     * @param id the source article id
     * @return Optional containing the SourceArticles if found, otherwise empty
     */
    public Optional<SourceArticles> findSourceArticle(Integer id) {
        return sourceArticlesRepository.findById(id);
    }

    /**
     * Look up an Articles row by id.
     *
     * @param id the article id
     * @return Optional containing the Articles if found, otherwise empty
     */
    public Optional<Articles> findArticle(Integer id) {
        return articlesRepository.findById(id);
    }

    /**
     * Persist an Articles entity (insert or update) and return the managed instance.
     *
     * @param article the article to save
     * @return the saved Articles (with generated id when newly inserted)
     */
    public Articles saveArticle(Articles article) {
        return articlesRepository.save(article);
    }

    /**
     * Persist a SourceArticles entity (insert or update) and return the managed instance.
     *
     * @param source the source article to save
     * @return the saved SourceArticles
     */
    public SourceArticles saveSourceArticle(SourceArticles source) {
        return sourceArticlesRepository.save(source);
    }

    /**
     * Persist a Media row for the given (already-uploaded) image url and return it
     * with its generated id populated.
     *
     * @param fileUrl the uploaded image url to store on the Media row
     * @return the saved Media (with generated id)
     */
    public Media saveMedia(String fileUrl) {
        Media media = new Media();
        media.setFile(fileUrl);
        return mediaRepository.save(media);
    }
}
