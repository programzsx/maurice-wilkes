# Maurice Wilkes

名词词典应用。收集人名、物品名，以及一切可以被命名和重新认识的名词。

## 目录

- `server/`：FastAPI 后端，端口 `8010`
- `web/`：React 前端，开发端口 `5180`
- `aibase/dba-sql/`：数据库建表 SQL
- `aibase/sre-deploy/`：阿里云 ECS 部署脚本
- `docs/`：设计与部署说明

## 本地启动

后端：

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

前端：

```bash
cd web
npm install
npm run dev
```

访问：

- Web: `http://localhost:5180`
- API: `http://localhost:8010`
- Docs: `http://localhost:8010/docs`

## 核心表

默认部署数据库沿用参考项目可访问的 `frances-allen`，核心表为 `dict_noun`。

- 基础字段：`id`、`create_time`、`update_time`
- 统计字段：`sort_order`、`random_int`
- 业务字段：`name`、`description`

## 部署

在项目根目录执行：

```bash
bash aibase/sre-deploy/deploy.sh
```

默认部署到阿里云 ECS `8.160.174.178`：

- 后端服务：`maurice-wilkes.service`，监听 `8010`
- 前端站点：Nginx 监听 `5180`
