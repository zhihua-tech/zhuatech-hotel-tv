/** 上海如静知华信息科技有限公司 https://www.zhuatech.cn/ 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { HotelTvService } from '../src/domain.js';

function fixture() {
  const service = new HotelTvService();
  const hotel = service.createProperty({ code: 'H1', name: '测试酒店', city: '上海', serviceSlaMinutes: 10 });
  const room = service.createRoom({ propertyId: hotel.id, number: '801' });
  const tv = service.pairDevice({ roomId: room.id, serial: 'TV001' });
  return { service, hotel, room, tv };
}

test('入住、电视播放和退房形成完整闭环', () => {
  const { service, room, tv } = fixture();
  const content = service.publishContent({ title: '欢迎片', uri: 'https://example.invalid/a.mp4' });
  const stay = service.checkIn({ roomId: room.id, guestName: '张三', expectedCheckOutAt: new Date(Date.now() + 86400_000).toISOString() });
  assert.equal(stay.guestDisplayName, '张**');
  assert.equal(service.startPlayback({ deviceId: tv.id, contentId: content.id }).status, 'playing');
  service.checkOut(stay.id);
  assert.equal(service.rooms.get(room.id).status, 'vacant');
  assert.throws(() => service.startPlayback({ deviceId: tv.id, contentId: content.id }), /空房/);
});

test('客需服务只允许按顺序接单和完成', () => {
  const { service, room } = fixture();
  const stay = service.checkIn({ roomId: room.id, guestName: '李四', expectedCheckOutAt: new Date(Date.now() + 86400_000).toISOString() });
  const order = service.requestService({ stayId: stay.id, category: '清洁', description: '需要打扫' });
  assert.throws(() => service.transitionService(order.id, 'complete', { result: '完成' }), /不允许/);
  service.transitionService(order.id, 'accept', { assignee: '客房部01' });
  const done = service.transitionService(order.id, 'complete', { result: '已完成' });
  assert.equal(done.status, 'completed');
});

test('设备与房间唯一配对且内容有效期受控', () => {
  const { service, room } = fixture();
  assert.throws(() => service.pairDevice({ roomId: room.id, serial: 'TV002' }), /已经配对/);
  assert.throws(() => service.publishContent({ title: '失效内容', uri: 'x', startAt: '2026-02-02T00:00:00Z', endAt: '2026-01-01T00:00:00Z' }), /结束时间/);
});

test('紧急广播准确覆盖全部在线电视', () => {
  const { service, hotel } = fixture();
  const room = service.createRoom({ propertyId: hotel.id, number: '802' });
  service.pairDevice({ roomId: room.id, serial: 'TV002' });
  const broadcast = service.emergencyBroadcast({ title: '消防演练', message: '请按指引疏散' });
  assert.equal(broadcast.targetDeviceIds.length, 2);
  assert.equal(service.dashboard().metrics.onlineDevices, 2);
});
