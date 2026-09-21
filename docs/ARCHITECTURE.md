# 架构说明

电视端和运营端通过 HTTP API 访问同一领域服务。演示环境使用 JSON 原子快照降低体验门槛；生产环境可根据 `database/schema.sql` 替换为 MySQL，并在网关层接入 PMS、SSO、对象存储/CDN 与终端证书。领域层独立维护入住、播放和服务工单状态，避免终端直接修改关键数据。

Copyright © 上海如静知华信息科技有限公司 · https://www.zhuatech.cn/
