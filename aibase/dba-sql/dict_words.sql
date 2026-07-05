/******************************************/
/*   DatabaseName = frances-allen         */
/*   Tables = dict_* 十二词性词典表        */
/******************************************/

CREATE TABLE `dict_noun` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '雪花ID',
  `create_time` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建时间',
  `update_time` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '更新时间',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序值，数值越大越靠前',
  `random_int` int NOT NULL COMMENT '随机值，应用层顺序自增',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '词条名称',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '描述',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_noun_random_int` (`random_int`),
  UNIQUE KEY `uk_dict_noun_name` (`name`),
  KEY `idx_dict_noun_sort` (`sort_order` DESC),
  KEY `idx_dict_noun_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='名词表';

CREATE TABLE `dict_verb` LIKE `dict_noun`;
ALTER TABLE `dict_verb` COMMENT='动词表';

CREATE TABLE `dict_adjective` LIKE `dict_noun`;
ALTER TABLE `dict_adjective` COMMENT='形容词表';

CREATE TABLE `dict_numeral` LIKE `dict_noun`;
ALTER TABLE `dict_numeral` COMMENT='数词表';

CREATE TABLE `dict_classifier` LIKE `dict_noun`;
ALTER TABLE `dict_classifier` COMMENT='量词表';

CREATE TABLE `dict_pronoun` LIKE `dict_noun`;
ALTER TABLE `dict_pronoun` COMMENT='代词表';

CREATE TABLE `dict_adverb` LIKE `dict_noun`;
ALTER TABLE `dict_adverb` COMMENT='副词表';

CREATE TABLE `dict_preposition` LIKE `dict_noun`;
ALTER TABLE `dict_preposition` COMMENT='介词表';

CREATE TABLE `dict_conjunction` LIKE `dict_noun`;
ALTER TABLE `dict_conjunction` COMMENT='连词表';

CREATE TABLE `dict_particle` LIKE `dict_noun`;
ALTER TABLE `dict_particle` COMMENT='助词表';

CREATE TABLE `dict_interjection` LIKE `dict_noun`;
ALTER TABLE `dict_interjection` COMMENT='叹词表';

CREATE TABLE `dict_onomatopoeia` LIKE `dict_noun`;
ALTER TABLE `dict_onomatopoeia` COMMENT='拟声词表';
