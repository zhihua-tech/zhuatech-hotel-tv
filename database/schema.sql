-- 上海如静知华信息科技有限公司 https://www.zhuatech.cn/
-- 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
CREATE DATABASE IF NOT EXISTS zhuatech_hotel_tv DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE zhuatech_hotel_tv;
CREATE TABLE hotel_property (id VARCHAR(32) PRIMARY KEY, code VARCHAR(64) UNIQUE NOT NULL, name VARCHAR(128) NOT NULL, city VARCHAR(64) NOT NULL, brand VARCHAR(64), service_sla_minutes INT NOT NULL, status VARCHAR(24) NOT NULL, created_at DATETIME(3) NOT NULL);
CREATE TABLE hotel_room (id VARCHAR(32) PRIMARY KEY, property_id VARCHAR(32) NOT NULL, room_number VARCHAR(32) NOT NULL, floor INT, room_type VARCHAR(64), status VARCHAR(24) NOT NULL, created_at DATETIME(3) NOT NULL, UNIQUE KEY uk_property_room(property_id,room_number));
CREATE TABLE tv_device (id VARCHAR(32) PRIMARY KEY, room_id VARCHAR(32) UNIQUE NOT NULL, serial_no VARCHAR(128) UNIQUE NOT NULL, model VARCHAR(64), app_version VARCHAR(32), status VARCHAR(24), token_hash VARCHAR(128), last_heartbeat_at DATETIME(3), created_at DATETIME(3) NOT NULL);
CREATE TABLE tv_content (id VARCHAR(32) PRIMARY KEY, title VARCHAR(255) NOT NULL, content_type VARCHAR(24) NOT NULL, uri VARCHAR(1024) NOT NULL, language VARCHAR(16), audience JSON, start_at DATETIME(3), end_at DATETIME(3), status VARCHAR(24), created_at DATETIME(3));
CREATE TABLE guest_stay (id VARCHAR(32) PRIMARY KEY, room_id VARCHAR(32) NOT NULL, guest_display_name VARCHAR(64), language VARCHAR(16), check_in_at DATETIME(3), expected_check_out_at DATETIME(3), check_out_at DATETIME(3), status VARCHAR(24));
CREATE TABLE guest_service_order (id VARCHAR(32) PRIMARY KEY, stay_id VARCHAR(32) NOT NULL, room_id VARCHAR(32) NOT NULL, category VARCHAR(64), description VARCHAR(512), priority VARCHAR(16), status VARCHAR(24), assignee VARCHAR(64), due_at DATETIME(3), accepted_at DATETIME(3), completed_at DATETIME(3), result VARCHAR(512));
CREATE TABLE playback_session (id VARCHAR(32) PRIMARY KEY, device_id VARCHAR(32) NOT NULL, content_id VARCHAR(32) NOT NULL, room_id VARCHAR(32) NOT NULL, progress_seconds INT, status VARCHAR(24), started_at DATETIME(3));
CREATE TABLE emergency_broadcast (id VARCHAR(32) PRIMARY KEY, title VARCHAR(255), message TEXT, severity VARCHAR(16), target_device_ids JSON, status VARCHAR(24), created_at DATETIME(3));
CREATE TABLE audit_event (id VARCHAR(32) PRIMARY KEY, actor VARCHAR(64), action VARCHAR(64), resource_id VARCHAR(64), detail JSON, occurred_at DATETIME(3));
