/******************************************/
/*   DatabaseName = frances-allen         */
/*   TableName = dict_noun                */
/******************************************/
CREATE TABLE `dict_noun` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '雪花ID',
  `create_time` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建时间',
  `update_time` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '更新时间',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序值，数值越大越靠前',
  `random_int` int NOT NULL AUTO_INCREMENT COMMENT '随机值，自增',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '名词',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '描述',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_noun_random_int` (`random_int`),
  UNIQUE KEY `uk_dict_noun_name` (`name`),
  KEY `idx_dict_noun_sort` (`sort_order` DESC),
  KEY `idx_dict_noun_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='名词词典表'
;
