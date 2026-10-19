const { REGIONS, COUNTRIES } = require('./europe-data');

const OVERVIEW_BOUNDS = { west: -30, east: 58, north: 73, south: 29 };
const TRIP_BOUNDS = { west: -15, east: 18, north: 62, south: 40 };
const WORLD_BOUNDS = { west: -180, east: 180, north: 90, south: -90 };

function getRegion(id) {
  return REGIONS.find(region => region.id === id);
}

function boundsFor(region) {
  if (!region) return OVERVIEW_BOUNDS;
  const lons = region.countries.map(country => country.lon);
  const lats = region.countries.map(country => country.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const midX = (minLon + maxLon) / 2;
  const midY = (minLat + maxLat) / 2;
  const width = Math.max(22, maxLon - minLon + 14, (maxLat - minLat + 12) * 1.6);
  return {
    west: midX - width / 2,
    east: midX + width / 2,
    north: midY + width / 3.2,
    south: midY - width / 3.2
  };
}

function pointAt(country, bounds) {
  return {
    x: 100 * (country.lon - bounds.west) / (bounds.east - bounds.west),
    y: 100 * (bounds.north - country.lat) / (bounds.north - bounds.south)
  };
}

function mapImageStyle(bounds) {
  const lonRange = bounds.east - bounds.west;
  const latRange = bounds.north - bounds.south;
  const width = 360 / lonRange * 100;
  const height = 180 / latRange * 100;
  const left = -(bounds.west + 180) / lonRange * 100;
  const top = -(90 - bounds.north) / latRange * 100;
  const mapHeight = Math.max(340, Math.min(540, Math.round(686 * latRange / lonRange)));
  return {
    mapHeight,
    imageStyle: `width:${width.toFixed(3)}%;height:${height.toFixed(3)}%;left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;`
  };
}

function marker(name, lon, lat, bounds, type = 'label') {
  const point = pointAt({ lon, lat }, bounds);
  return {
    key: `${type}:${name}:${lon}:${lat}`,
    name,
    type,
    style: `left:${point.x.toFixed(3)}%;top:${point.y.toFixed(3)}%;`
  };
}

function buildGeography(view = 'overview', regionId = 'overview', countryId = null) {
  const region = getRegion(regionId);
  const selected = region
    ? region.countries.find(country => country.id === countryId) || region.countries[0]
    : null;
  const world = view === 'world';
  const trip = view === 'trip';
  const bounds = world ? WORLD_BOUNDS : trip ? TRIP_BOUNDS : boundsFor(region);
  let markers = [];

  if (world) {
    markers = [marker('欧洲', 16, 54, bounds), marker('亚洲', 90, 35, bounds)];
  } else if (trip) {
    markers = [
      marker('英国', -0.118668, 51.501941, bounds),
      marker('法国', 2.352992, 48.858092, bounds)
    ];
  } else if (region && selected) {
    markers = region.countries
      .filter(country => country.id !== selected.id)
      .map(country => marker('', country.lon, country.lat, bounds, 'point'));
    markers.push(marker(selected.name, selected.lon, selected.lat, bounds, 'active'));
  } else {
    markers = [
      marker('西欧', 4, 48, bounds),
      marker('东欧', 34, 53, bounds),
      marker('北欧', 14, 65, bounds),
      marker('南欧', 15, 38, bounds)
    ];
  }

  const map = mapImageStyle(bounds);
  return {
    region,
    selected,
    markers,
    mapHeight: map.mapHeight,
    imageStyle: map.imageStyle,
    countryButtons: region ? region.countries.map(country => ({
      ...country,
      selected: selected && country.id === selected.id
    })) : []
  };
}

module.exports = {
  REGIONS,
  COUNTRIES,
  OVERVIEW_BOUNDS,
  TRIP_BOUNDS,
  WORLD_BOUNDS,
  getRegion,
  boundsFor,
  pointAt,
  mapImageStyle,
  buildGeography
};
