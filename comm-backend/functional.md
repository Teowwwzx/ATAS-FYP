# ATAS Link - Community Backend Functions List

**核心定位**：大学生生活分享与互助平台 (Lifestyle & Campus Utility)

## 1. 身份与账户 (Identity & Profile)

*用户在社区的“生活面孔”，与专业简历隔离。*

| **子功能 (Sub-function)**       | **详细逻辑 (Logic & Details)**                        | **后端呈现/数据结构 (Backend Representation)**                          |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| **基础注册/登录**                  | 独立的 Auth 系统，支持邮箱/密码。预留 `external_id` 用于未来关联 ATAS。 | `User` 表: `email`, `hashed_password`, `is_verified` (校内邮箱验证)    |
| **生活档案 (Lifestyle Profile)** | 设置昵称、头像、个性签名、性别、入学年份。                             | `Profile` 表: `nickname`, `avatar_url`, `bio`, `enrollment_year` |
| **兴趣标签 (Interest Tags)**     | 用户选择 3-5 个兴趣（如：探店、考研、摄影）。用于冷启动推荐。                 | `user_interests`: Array `["coffee", "coding", "gym"]`           |
| **主页数据看板**                   | 展示“获赞数”、“收藏数”、“关注数”、“粉丝数”。                        | **Redis 缓存计数**，避免每次 `COUNT(*)` 查询数据库。                           |

## 2. 内容发布系统 (UGC - The "Note")

*这是平台的核心。模仿小红书的“笔记”结构，而非 Facebook 的“贴文”。*

| **子功能 (Sub-function)** | **详细逻辑 (Logic & Details)**              | **后端呈现/数据结构 (Backend Representation)**                                                                 |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **多图/视频上传**            | 支持 1-9 张图片或 1 个短视频。支持拖拽排序。              | **Cloudinary 集成**。DB 存 JSON: `[{"url": "...", "w": 1080, "h": 1440, "type": "image"}]`。记录宽高比用于前端瀑布流布局。 |
| **标题与正文**              | **强制标题** (Title is King)。正文支持 Emoji、换行。 | `Post` 表: `title` (VARCHAR 100), `content` (TEXT)。                                                     |
| **话题挂载 (Hashtags)**    | 用户发布时必须选择或创建话题标签。                       | `Tags` 表 (M2M): `#避雷`, `#APU食堂`, `#期末复习`。                                                              |
| **地理位置 (POI)**         | 挂载学校具体地点（如：图书馆 Level 3）。                | `location_name`: "Block B, Level 3", `coordinates`: (Lat, Long)。                                       |
| **发布状态管理**             | 支持“发布”、“存草稿”、“定时发布”。                    | `status`: `published`                                                                                  |

---

## 3. 发现与信息流 (Discovery & Feed)

*解决“看什么”的问题。利用算法和时间序。*

| **子功能 (Sub-function)** | **详细逻辑 (Logic & Details)** | **后端呈现/数据结构 (Backend Representation)**                                                                   |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **瀑布流推荐 (For You)**    | 混合排序：新热度 + 用户兴趣匹配。         | **API**: `GET /feed/recommend?cursor=...` <br> **Logic**: `Score = (Likes*2 + Comments*5) / (TimeDecay)` |
| **最新动态 (Latest)**      | 纯时间倒序，只看本校/关注的人。           | **API**: `GET /feed/latest` (基于 `created_at` 索引)                                                         |
| **话题聚合页**              | 点击 `#避雷`，展示所有打该标签的笔记。      | **API**: `GET /tags/{tag_name}/posts`                                                                    |
| **全局搜索**               | 搜索标题、正文、标签、用户。             | **PGVector / ILIKE**: 支持模糊匹配。                                                                            |

---

## 4. 社交互动 (Social Graph)

*建立连接，产生粘性。*

| **子功能 (Sub-function)** | **详细逻辑 (Logic & Details)**   | **后端呈现/数据结构 (Backend Representation)**                          |
| ---------------------- | ---------------------------- | --------------------------------------------------------------- |
| **点赞 (Like)**          | 双击点赞。高并发动作。                  | **Redis + Async Write-back**: 先写 Redis `INCR`, 异步 Celery 刷入 DB。 |
| **收藏 (Collect)**       | “插眼”、“马住”。收藏夹功能。             | `Collection` 表: 用户可以创建自定义收藏夹（如“美食”、“复习资料”）。                     |
| **评论 (Comment)**       | 支持 **楼中楼** (Reply to reply)。 | `Comment` 表: `parent_id`, `root_id` (用于快速拉取整个对话树)。              |
| **关注 (Follow)**        | 关注博主，获取即时更新。                 | `Follows` 表: `follower_id`, `following_id`。                     |

---

## 5. 校园实用工具 (Campus Utilities)

*这就是“留存钩子”，让平台不仅仅是只有娱乐。*

| **子功能 (Sub-function)** | **详细逻辑 (Logic & Details)** | **后端呈现/数据结构 (Backend Representation)**                          |
| ---------------------- | -------------------------- | --------------------------------------------------------------- |
| **避雷/红榜库 (Wiki)**      | 结构化的“评价”帖。如评价某个教授、某个档口。    | 特殊分类 `category="review"`。增加字段 `rating` (1-5星)。                  |
| **组队/搭子 (Team Up)**    | 发起限时活动（“今晚羽毛球缺2人”）。        | 扩展字段: `event_time`, `max_participants`, `current_participants`。 |
| **闲置交易 (Market)**      | 二手书、宿舍神器转让。                | 扩展字段: `price`, `condition` (9成新), `is_sold`。                    |

---

## 6. 后台自动化与 AI (Infrastructure)

*大厂技术加分项，用户不可见但体验感知极强。*

| **子功能 (Sub-function)**    | **详细逻辑 (Logic & Details)**       | **后端呈现/数据结构 (Backend Representation)**                                      |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| **图片处理 (Media Pipeline)** | 上传后自动生成：原图、缩略图(Feed用)、模糊图(加载占位)。 | **Celery Task**: 调用 Cloudinary API 进行 resize/compression。                   |
| **内容安全 (Moderation)**     | 自动识别敏感词（脏话、广告）、色情图片。             | **AI Hook**: 发帖 `pre-save` 钩子，调用 OpenAI/Groq 快速扫描文本。                        |
| **消息通知 (Notifications)**  | “有人赞了你”、“有人回复了你”。                | **Notification 表**: `type` (like/comment/system), `sender_id`, `target_id`。 |
