/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Other/SQLTemplate.sql to edit this template
 */
/**
 * Author:  Malumbo
 * Created: Oct 09, 2025
 */
-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.4.2-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.6.0.6765
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for laudium_test_db
CREATE DATABASE IF NOT EXISTS `laudium_test_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `laudium_test_db`;

-- Dumping structure for table laudium_test_db.ads
CREATE TABLE IF NOT EXISTS `ads` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) NOT NULL,
  `placement_id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `click_url` varchar(255) DEFAULT NULL,
  `placement_date` datetime DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `status` enum('pending','active','paused','expired') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(4) DEFAULT 0,
  `impressions` bigint(20) DEFAULT 0,
  `clicks` bigint(20) DEFAULT 0,
  `image_id` bigint(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `placement_info` varchar(100) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `payment_status` enum('pending','succesful','failed','cancelled') DEFAULT 'pending',
  `payment_id` bigint(20) DEFAULT NULL,
  `business_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_id` (`campaign_id`),
  KEY `placement_id` (`placement_id`),
  KEY `ads_ibfk_3_idx` (`image_id`),
  KEY `ads_ibfk_4_idx` (`payment_id`),
  KEY `ads_ibfk_5_idx` (`business_id`),
  CONSTRAINT `ads_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`),
  CONSTRAINT `ads_ibfk_2` FOREIGN KEY (`placement_id`) REFERENCES `ad_placements` (`id`),
  CONSTRAINT `ads_ibfk_3` FOREIGN KEY (`image_id`) REFERENCES `media` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ads_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE SET NULL,
  CONSTRAINT `ads_ibfk_5` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.ad_placements
CREATE TABLE IF NOT EXISTS `ad_placements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `location` enum('home_banner','in_article_top','in_article_mid','in_article_bottom','video_preroll','sidebar','sidebar_top','sidebar_bottom','pop_up') DEFAULT 'in_article_top',
  `description` varchar(255) DEFAULT NULL,
  `image_id` bigint(20) DEFAULT NULL,
  `width` decimal(10,1) DEFAULT NULL,
  `height` decimal(10,1) DEFAULT NULL,
  `fee` decimal(10,2) NOT NULL DEFAULT 10.00,
  `fee_type` enum('FIXED','CPM') NOT NULL,
  `is_rotating` tinyint(1) DEFAULT 0,
  `billing_unit` enum('DAY','WEEK','MONTH') DEFAULT 'MONTH',
  `created_at` datetime DEFAULT current_timestamp(),
  `status` enum('active','inactive','deleted') DEFAULT 'active',
  `aspect_ratio` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_image_id_idx` (`image_id`),
  CONSTRAINT `fk_image_id` FOREIGN KEY (`image_id`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.ad_tags
CREATE TABLE IF NOT EXISTS `ad_tags` (
  `ad_id` bigint(20) NOT NULL,
  `tag_id` bigint(20) NOT NULL,
  PRIMARY KEY (`ad_id`,`tag_id`),
  KEY `fk_ad_tags_tag` (`tag_id`),
  CONSTRAINT `fk_ad_tags_ad` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ad_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.announcements
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `image_id` bigint(20) DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `status` enum('draft','pending','published','archived','rejected') DEFAULT 'draft',
  `priority` enum('low','medium','high') DEFAULT 'low',
  `is_featured` tinyint(1) DEFAULT 0,
  `is_urgent` tinyint(1) DEFAULT 0,
  `publish_date` datetime DEFAULT NULL,
  `expire_date` datetime DEFAULT NULL,
  `slug` varchar(500) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `content` longtext DEFAULT NULL,
  `priority_order` tinyint(4) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `image_id` (`image_id`),
  KEY `author_id` (`author_id`),
  FULLTEXT KEY `idx_search` (`title`,`description`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `announcement_categories` (`id`),
  CONSTRAINT `announcements_ibfk_2` FOREIGN KEY (`image_id`) REFERENCES `media` (`id`),
  CONSTRAINT `announcements_ibfk_3` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.announcement_categories
CREATE TABLE IF NOT EXISTS `announcement_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color_code` varchar(7) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.articles
CREATE TABLE IF NOT EXISTS `articles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `summary` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `category_id` bigint(20) DEFAULT NULL,
  `status` enum('draft','published','scheduled') NOT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived` tinyint(4) DEFAULT 1,
  `cover_id` bigint(20) DEFAULT NULL,
  `thumbnail_id` bigint(20) DEFAULT NULL,
  `article_type` enum('featured','popular','top') DEFAULT NULL,
  `audio_url` varchar(1024) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `author_id` (`author_id`),
  KEY `fk_cover_image` (`cover_id`),
  KEY `fk_thumbnail_image` (`thumbnail_id`),
  CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `articles_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cover_image` FOREIGN KEY (`cover_id`) REFERENCES `media` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_thumbnail_image` FOREIGN KEY (`thumbnail_id`) REFERENCES `media` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.article_metrics
CREATE TABLE IF NOT EXISTS `article_metrics` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `article_id` bigint(20) DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `avg_time_spent` float DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `article_id` (`article_id`),
  CONSTRAINT `article_metrics_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.article_tags
CREATE TABLE IF NOT EXISTS `article_tags` (
  `article_id` bigint(20) NOT NULL,
  `tag_id` bigint(20) NOT NULL,
  PRIMARY KEY (`article_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `article_tags_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.businesses
CREATE TABLE IF NOT EXISTS `businesses` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(4) DEFAULT 0,
  `location` varchar(255) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `user_id_idx` (`user_id`),
  CONSTRAINT `user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.campaigns
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `business_id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_recurring` tinyint(1) DEFAULT 0,
  `transaction_ref` varchar(100) NOT NULL,
  `budget` decimal(10,2) DEFAULT NULL,
  `payment_status` enum('pending','paid','failed') DEFAULT 'pending',
  `status` enum('pending','active','completed','cancelled') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(4) DEFAULT 0,
  `payment_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `campaigns_ibfk_2_idx` (`payment_id`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `is_deleted` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for view laudium_test_db.category_with_notice_count
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `category_with_notice_count` (
	`id` INT(11) NOT NULL,
	`name` VARCHAR(100) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`description` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`is_active` TINYINT(1) NULL,
	`announcements` BIGINT(21) NOT NULL
) ENGINE=MyISAM;

-- Dumping structure for table laudium_test_db.content_suggestions
CREATE TABLE IF NOT EXISTS `content_suggestions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `source_platform` enum('twitter','facebook','tiktok','whatsapp') DEFAULT NULL,
  `content_snippet` text DEFAULT NULL,
  `category_id` bigint(20) DEFAULT NULL,
  `suggested_on` datetime DEFAULT current_timestamp(),
  `used_in_article_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `used_in_article_id` (`used_in_article_id`),
  CONSTRAINT `content_suggestions_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `content_suggestions_ibfk_2` FOREIGN KEY (`used_in_article_id`) REFERENCES `articles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.media
CREATE TABLE IF NOT EXISTS `media` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `file` longtext NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `payment_id` varchar(100) NOT NULL,
  `pf_payment_id` varchar(100) DEFAULT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `amount_gross` double(10,2) NOT NULL,
  `amount_fee` double(10,2) DEFAULT NULL,
  `amount_net` double(10,2) DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ZAR',
  `item_name` varchar(255) DEFAULT NULL,
  `item_description` text DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.prompts
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `content` longtext NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.push_logs
CREATE TABLE IF NOT EXISTS `push_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `audience` varchar(100) DEFAULT NULL,
  `status` enum('sent','failed') DEFAULT NULL,
  `onesignal_response` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.refresh_tokens
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `idx_refresh_token_user_id` (`user_id`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.source_articles
CREATE TABLE IF NOT EXISTS `source_articles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(512) DEFAULT NULL,
  `url` varchar(1024) DEFAULT NULL,
  `platform` varchar(100) DEFAULT NULL,
  `timestamp_text` varchar(100) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `summary` longtext DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `share_count` int(11) DEFAULT NULL,
  `comment_count` int(11) DEFAULT NULL,
  `hashtags_json` text DEFAULT NULL,
  `additional_data_json` text DEFAULT NULL,
  `provider` varchar(64) DEFAULT NULL,
  `raw_ai_result` longtext DEFAULT NULL,
  `processing_status` varchar(32) DEFAULT 'NEW',
  `bad_result` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_source_articles_url` (`url`(255)),
  KEY `idx_source_articles_slug` (`slug`),
  KEY `idx_source_articles_provider` (`provider`),
  KEY `idx_source_articles_processing_status` (`processing_status`),
  KEY `idx_source_articles_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=377 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.submissions
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `submitted_by` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `media_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reviewed_by` bigint(20) DEFAULT NULL,
  `converted_to_article_id` bigint(20) DEFAULT NULL,
  `submitted_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table laudium_test_db.tags
CREATE TABLE IF NOT EXISTS `tags` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for view laudium_test_db.top_pop_ids
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `top_pop_ids` (
	`id` BIGINT(20) NULL,
	`article_type` ENUM('featured','popular','top') NULL COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for table laudium_test_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` bigint(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `category_with_notice_count`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `category_with_notice_count` AS select `categories`.`id` AS `id`,`categories`.`name` AS `name`,`categories`.`description` AS `description`,`categories`.`is_active` AS `is_active`,count(`announcements`.`id`) AS `announcements` from (`announcement_categories` `categories` left join `announcements` on((`categories`.`id` = `announcements`.`category_id`))) group by `categories`.`id`,`categories`.`name`,`categories`.`description`,`categories`.`is_active` order by count(`announcements`.`id`) desc ;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `top_pop_ids`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `top_pop_ids` AS select `ranked`.`id` AS `id`,`ranked`.`article_type` AS `article_type` from (select `articles`.`id` AS `id`,`articles`.`article_type` AS `article_type`,row_number() OVER (PARTITION BY `articles`.`article_type` ORDER BY `articles`.`created_at` desc )  AS `rn` from `articles` where ((`articles`.`article_type` in ('top','popular','featured')) and (`articles`.`status` = 'published') and (`articles`.`scheduled_for` <= now()))) `ranked` where (((`ranked`.`article_type` in ('top','popular')) and (`ranked`.`rn` <= 10)) or ((`ranked`.`article_type` = 'featured') and (`ranked`.`rn` <= 3))) ;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;



-- SOURCE ARTICLES TABLE (stores AI-sourced articles and raw payloads)
CREATE TABLE IF NOT EXISTS source_articles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- Core fields mirroring SourceArticle
    title VARCHAR(512),
    url VARCHAR(1024),
    platform VARCHAR(100),
    timestamp_text VARCHAR(100),
    author VARCHAR(255),
    summary LONGTEXT,
    slug VARCHAR(255),
    type VARCHAR(100),
    share_count INT,
    comment_count INT,

    -- JSON-serialized as TEXT
    hashtags_json TEXT,
    additional_data_json TEXT,

    -- Provider and raw AI result
    provider VARCHAR(64),
    raw_ai_result LONGTEXT,

    -- Processing flags
    processing_status VARCHAR(32) DEFAULT 'NEW',
    bad_result TINYINT(1) DEFAULT 0,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Helpful indexes
    KEY idx_source_articles_url (url(255)),
    KEY idx_source_articles_slug (slug),
    KEY idx_source_articles_provider (provider),
    KEY idx_source_articles_processing_status (processing_status),
    KEY idx_source_articles_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
