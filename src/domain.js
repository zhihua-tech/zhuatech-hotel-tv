/**
 * 上海如静知华信息科技有限公司 https://www.zhuatech.cn/
 * 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
 */
import crypto from 'node:crypto';

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
const clone = (value) => structuredClone(value);
const required = (value, name) => {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(`${name}不能为空`);
  return String(value).trim();
};

/**
 * 酒店智慧电视领域服务，覆盖客房、电视终端、住客、内容、客需工单、播放与紧急广播。
 * 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
 */
export class HotelTvService {
  /** 初始化酒店电视领域状态。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  constructor(seed = {}) {
    for (const key of ['properties', 'rooms', 'devices', 'contents', 'stays', 'serviceOrders', 'playbacks', 'broadcasts']) {
      this[key] = new Map((seed[key] || []).map((item) => [item.id, item]));
    }
    this.audit = seed.audit || [];
  }

  /** 新建酒店并配置品牌与服务时限。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  createProperty(input, actor = 'admin') {
    const code = required(input.code, '酒店编码');
    if ([...this.properties.values()].some((item) => item.code === code)) throw new Error('酒店编码已存在');
    const property = { id: uid('htl'), code, name: required(input.name, '酒店名称'), city: required(input.city, '城市'), brand: input.brand || '独立酒店', serviceSlaMinutes: Number(input.serviceSlaMinutes || 20), status: 'active', createdAt: now() };
    this.properties.set(property.id, property);
    this.#record(actor, 'PROPERTY_CREATED', property.id, { code });
    return clone(property);
  }

  /** 建立客房档案并校验房号唯一。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  createRoom(input, actor = 'frontdesk') {
    if (!this.properties.has(input.propertyId)) throw new Error('酒店不存在');
    const number = required(input.number, '房号');
    if ([...this.rooms.values()].some((item) => item.propertyId === input.propertyId && item.number === number)) throw new Error('房号已存在');
    const room = { id: uid('room'), propertyId: input.propertyId, number, floor: Number(input.floor || 1), type: input.type || '大床房', status: 'vacant', createdAt: now() };
    this.rooms.set(room.id, room);
    this.#record(actor, 'ROOM_CREATED', room.id, { number });
    return clone(room);
  }

  /** 配对客房电视并发放可轮换的设备令牌。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  pairDevice(input, actor = 'engineer') {
    const room = this.rooms.get(input.roomId);
    if (!room) throw new Error('客房不存在');
    if ([...this.devices.values()].some((item) => item.roomId === room.id)) throw new Error('客房已经配对电视');
    const serial = required(input.serial, '设备序列号');
    if ([...this.devices.values()].some((item) => item.serial === serial)) throw new Error('设备序列号已存在');
    const device = { id: uid('tv'), roomId: room.id, serial, model: input.model || 'Android TV', appVersion: input.appVersion || '1.0.0', status: 'online', token: crypto.randomBytes(18).toString('hex'), lastHeartbeatAt: now(), createdAt: now() };
    this.devices.set(device.id, device);
    this.#record(actor, 'DEVICE_PAIRED', device.id, { roomId: room.id });
    return clone(device);
  }

  /** 发布带有效期、语言和受众范围的电视内容。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  publishContent(input, actor = 'content-operator') {
    const type = input.type || 'video';
    if (!['video', 'image', 'web', 'notice'].includes(type)) throw new Error('内容类型不支持');
    const startAt = input.startAt || now();
    const endAt = input.endAt || new Date(Date.now() + 30 * 86400_000).toISOString();
    if (Date.parse(endAt) <= Date.parse(startAt)) throw new Error('内容结束时间必须晚于开始时间');
    const content = { id: uid('cnt'), title: required(input.title, '内容标题'), type, uri: required(input.uri, '内容地址'), language: input.language || 'zh-CN', audience: input.audience || ['all'], startAt, endAt, status: 'published', createdAt: now() };
    this.contents.set(content.id, content);
    this.#record(actor, 'CONTENT_PUBLISHED', content.id, { type });
    return clone(content);
  }

  /** 办理入住并生成电视欢迎会话，住客姓名仅保留脱敏展示值。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  checkIn(input, actor = 'frontdesk') {
    const room = this.rooms.get(input.roomId);
    if (!room || room.status !== 'vacant') throw new Error('客房不可办理入住');
    const name = required(input.guestName, '住客姓名');
    const stay = { id: uid('stay'), roomId: room.id, guestDisplayName: `${name.slice(0, 1)}**`, language: input.language || 'zh-CN', checkInAt: now(), expectedCheckOutAt: required(input.expectedCheckOutAt, '预计离店时间'), status: 'checked-in', createdAt: now() };
    if (Date.parse(stay.expectedCheckOutAt) <= Date.now()) throw new Error('预计离店时间无效');
    room.status = 'occupied';
    this.stays.set(stay.id, stay);
    this.#record(actor, 'GUEST_CHECKED_IN', stay.id, { roomId: room.id });
    return clone(stay);
  }

  /** 办理退房并清除电视端住客会话。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  checkOut(stayId, actor = 'frontdesk') {
    const stay = this.stays.get(stayId);
    if (!stay || stay.status !== 'checked-in') throw new Error('在住房单不存在');
    stay.status = 'checked-out';
    stay.checkOutAt = now();
    this.rooms.get(stay.roomId).status = 'vacant';
    this.#record(actor, 'GUEST_CHECKED_OUT', stay.id, { roomId: stay.roomId });
    return clone(stay);
  }

  /** 接收电视心跳与应用版本，恢复在线状态。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  heartbeat(deviceId, input = {}) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('电视终端不存在');
    device.status = 'online';
    device.lastHeartbeatAt = now();
    if (input.appVersion) device.appVersion = input.appVersion;
    if (input.freeStorageMb !== undefined) device.freeStorageMb = Number(input.freeStorageMb);
    return clone(device);
  }

  /** 从电视发起客需服务并生成受SLA约束的工单。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  requestService(input, actor = 'guest-tv') {
    const stay = this.stays.get(input.stayId);
    if (!stay || stay.status !== 'checked-in') throw new Error('当前客房没有有效入住');
    const property = this.properties.get(this.rooms.get(stay.roomId).propertyId);
    const order = { id: uid('svc'), stayId: stay.id, roomId: stay.roomId, category: required(input.category, '服务类型'), description: required(input.description, '服务说明'), priority: input.priority || 'normal', status: 'pending', assignee: null, dueAt: new Date(Date.now() + property.serviceSlaMinutes * 60_000).toISOString(), createdAt: now() };
    this.serviceOrders.set(order.id, order);
    this.#record(actor, 'SERVICE_REQUESTED', order.id, { category: order.category });
    return clone(order);
  }

  /** 接单或完成客需工单，严格执行状态流转。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  transitionService(orderId, action, input = {}, actor = 'service-center') {
    const order = this.serviceOrders.get(orderId);
    if (!order) throw new Error('服务工单不存在');
    if (action === 'accept' && order.status === 'pending') {
      order.status = 'processing'; order.assignee = required(input.assignee, '处理人'); order.acceptedAt = now();
    } else if (action === 'complete' && order.status === 'processing') {
      order.status = 'completed'; order.result = required(input.result, '完成结果'); order.completedAt = now();
    } else throw new Error('工单状态不允许该操作');
    this.#record(actor, `SERVICE_${action.toUpperCase()}`, order.id, { status: order.status });
    return clone(order);
  }

  /** 记录受入住态与内容有效期约束的播放会话。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  startPlayback(input, actor = 'guest-tv') {
    const device = this.devices.get(input.deviceId);
    const content = this.contents.get(input.contentId);
    if (!device || device.status !== 'online') throw new Error('电视终端不可用');
    if (!content || content.status !== 'published' || Date.parse(content.startAt) > Date.now() || Date.parse(content.endAt) < Date.now()) throw new Error('内容当前不可播放');
    const room = this.rooms.get(device.roomId);
    if (room.status !== 'occupied') throw new Error('空房禁止建立住客播放会话');
    const playback = { id: uid('play'), deviceId: device.id, contentId: content.id, roomId: room.id, progressSeconds: 0, status: 'playing', startedAt: now() };
    this.playbacks.set(playback.id, playback);
    this.#record(actor, 'PLAYBACK_STARTED', playback.id, { contentId: content.id });
    return clone(playback);
  }

  /** 创建紧急广播并生成所有在线电视的待执行指令。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  emergencyBroadcast(input, actor = 'duty-manager') {
    const targets = [...this.devices.values()].filter((item) => item.status === 'online').map((item) => item.id);
    const broadcast = { id: uid('brd'), title: required(input.title, '广播标题'), message: required(input.message, '广播内容'), severity: input.severity || 'critical', targetDeviceIds: targets, status: 'issued', createdAt: now() };
    this.broadcasts.set(broadcast.id, broadcast);
    this.#record(actor, 'EMERGENCY_BROADCAST_ISSUED', broadcast.id, { targetCount: targets.length });
    return clone(broadcast);
  }

  /** 汇总设备健康、入住、内容和客需服务指标。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  dashboard() {
    const devices = [...this.devices.values()];
    const orders = [...this.serviceOrders.values()];
    return { metrics: { rooms: this.rooms.size, occupied: [...this.rooms.values()].filter((x) => x.status === 'occupied').length, devices: devices.length, onlineDevices: devices.filter((x) => x.status === 'online').length, activeContent: [...this.contents.values()].filter((x) => x.status === 'published').length, pendingServices: orders.filter((x) => x.status !== 'completed').length }, rooms: [...this.rooms.values()], devices, contents: [...this.contents.values()], serviceOrders: orders.slice(-20).reverse(), broadcasts: [...this.broadcasts.values()].slice(-10).reverse(), audit: this.audit.slice(-30).reverse() };
  }

  /** 导出本地持久化快照。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  dump() {
    const data = { audit: this.audit };
    for (const key of ['properties', 'rooms', 'devices', 'contents', 'stays', 'serviceOrders', 'playbacks', 'broadcasts']) data[key] = [...this[key].values()];
    return data;
  }

  /** 写入不可变审计事件。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  #record(actor, action, resourceId, detail) {
    this.audit.push({ id: uid('aud'), actor, action, resourceId, detail, occurredAt: now() });
  }
}

/** 构造可直接运行的酒店电视演示数据。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
export function createDemoService() {
  const service = new HotelTvService();
  const property = service.createProperty({ code: 'SH-DEMO', name: '知华云栖酒店', city: '上海', serviceSlaMinutes: 15 });
  const room = service.createRoom({ propertyId: property.id, number: '1208', floor: 12, type: '行政大床房' });
  const room2 = service.createRoom({ propertyId: property.id, number: '1210', floor: 12, type: '豪华双床房' });
  const tv = service.pairDevice({ roomId: room.id, serial: 'ZH-TV-1208', model: '65寸商用电视' });
  service.pairDevice({ roomId: room2.id, serial: 'ZH-TV-1210', model: '55寸商用电视' });
  const content = service.publishContent({ title: '上海城市漫游', type: 'video', uri: 'https://media.example.invalid/shanghai.mp4' });
  const stay = service.checkIn({ roomId: room.id, guestName: '张先生', expectedCheckOutAt: new Date(Date.now() + 2 * 86400_000).toISOString() });
  service.startPlayback({ deviceId: tv.id, contentId: content.id });
  service.requestService({ stayId: stay.id, category: '客房用品', description: '补充两瓶饮用水' });
  return service;
}
