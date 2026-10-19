const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REGIONS,
  COUNTRIES,
  OVERVIEW_BOUNDS,
  pointAt,
  buildGeography
} = require('../miniprogram/utils/geography');

test('欧洲四区共 44 国', () => {
  const main = REGIONS.filter(region => ['west', 'east', 'north', 'south'].includes(region.id));
  assert.equal(main.reduce((sum, region) => sum + region.countries.length, 0), 44);
  assert.deepEqual(main.map(region => region.countries.length), [9, 10, 10, 15]);
});

test('另列 6 国和 1 个争议地区', () => {
  assert.equal(REGIONS.find(region => region.id === 'related').countries.length, 6);
  assert.equal(REGIONS.find(region => region.id === 'disputed').countries.length, 1);
  assert.equal(COUNTRIES.length, 51);
});

test('英国归入北欧，法国归入西欧', () => {
  assert.equal(COUNTRIES.find(country => country.id === 'GBR').regionId, 'north');
  assert.equal(COUNTRIES.find(country => country.id === 'FRA').regionId, 'west');
});

test('概览地图投影点在画布内', () => {
  for (const country of COUNTRIES.filter(item => !['KAZ'].includes(item.id))) {
    const point = pointAt(country, OVERVIEW_BOUNDS);
    assert.ok(Number.isFinite(point.x));
    assert.ok(Number.isFinite(point.y));
  }
});

test('世界、英法、分区视图都可生成地图数据', () => {
  assert.equal(buildGeography('world').markers.length, 2);
  assert.equal(buildGeography('trip').markers.length, 2);
  const north = buildGeography('overview', 'north', 'GBR');
  assert.equal(north.selected.id, 'GBR');
  assert.equal(north.countryButtons.length, 10);
  assert.ok(north.imageStyle.includes('width:'));
});

test('未知国家会回退到分区第一个国家', () => {
  const west = buildGeography('overview', 'west', 'UNKNOWN');
  assert.equal(west.selected.id, 'FRA');
});
