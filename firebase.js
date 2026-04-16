const axios = require('axios');

const FIREBASE_URL = process.env.FIREBASE_URL;

async function fbGet(path) {
  try {
    const resp = await axios.get(FIREBASE_URL + '/' + path + '.json');
    return resp.data;
  } catch(e) {
    console.error('fbGet error:', e.message);
    return null;
  }
}

async function fbSet(path, data) {
  try {
    await axios.put(FIREBASE_URL + '/' + path + '.json', data);
    return true;
  } catch(e) {
    console.error('fbSet error:', e.message);
    return false;
  }
}

async function fbPush(path, data) {
  try {
    const resp = await axios.post(FIREBASE_URL + '/' + path + '.json', data);
    return resp.data;
  } catch(e) {
    console.error('fbPush error:', e.message);
    return null;
  }
}

async function getFirstServerId() {
  const servers = await fbGet('servers');
  if (!servers) return null;
  return Object.keys(servers)[0];
}

async function getServerData(collection) {
  const srvId = await getFirstServerId();
  if (!srvId) return [];
  const data = await fbGet('servers/' + srvId + '/' + collection);
  return data ? Object.values(data) : [];
}

async function getServerEntries(collection) {
  const srvId = await getFirstServerId();
  if (!srvId) return { srvId: null, entries: [] };
  const data = await fbGet('servers/' + srvId + '/' + collection);
  return { srvId, entries: data ? Object.entries(data) : [] };
}

module.exports = { fbGet, fbSet, fbPush, getFirstServerId, getServerData, getServerEntries };
