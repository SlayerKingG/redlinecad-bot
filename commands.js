const { fbGet, fbSet, fbPush, getFirstServerId, getServerData, getServerEntries } = require('./firebase');

// ─── Embeds ───────────────────────────────────────────────────────
function errorEmbed(msg) {
  return { embeds: [{ title: 'Error', color: 0xff3333, description: msg, footer: { text: 'RedLineCAD' } }], ephemeral: true };
}

function successEmbed(title, fields, color = 0xcc0000) {
  return {
    embeds: [{
      title,
      color,
      fields,
      footer: { text: 'RedLineCAD • ' + new Date().toLocaleString() }
    }],
    ephemeral: true
  };
}

// ─── /civilian ────────────────────────────────────────────────────
async function cmdCivilian(interaction) {
  const name = interaction.options.getString('name');
  const civs = await getServerData('civilians');
  const found = civs.filter(c => c.name?.toLowerCase().includes(name.toLowerCase()));
  if (!found.length) return interaction.reply(errorEmbed('No civilian found matching: **' + name + '**'));
  const c = found[0];
  return interaction.reply(successEmbed('Civilian Record', [
    { name: 'Name',    value: c.name    || 'N/A', inline: true },
    { name: 'DOB',     value: c.dob     || 'N/A', inline: true },
    { name: 'Gender',  value: c.gender  || 'N/A', inline: true },
    { name: 'Phone',   value: c.phone   || 'N/A', inline: true },
    { name: 'Address', value: c.address || 'N/A', inline: true },
    { name: 'Flags',   value: c.flags   || 'None',inline: true },
  ], 0xcc0000));
}

// ─── /plate ───────────────────────────────────────────────────────
async function cmdPlate(interaction) {
  const plate = interaction.options.getString('plate').toUpperCase().trim();
  const vehs  = await getServerData('vehicles');
  const v     = vehs.find(x => x.plate?.toUpperCase() === plate);
  if (!v) return interaction.reply(errorEmbed('No vehicle found with plate: **' + plate + '**'));
  return interaction.reply(successEmbed('Vehicle Lookup', [
    { name: 'Plate',   value: v.plate   || 'N/A', inline: true },
    { name: 'Owner',   value: v.owner   || 'N/A', inline: true },
    { name: 'Vehicle', value: (v.year||'') + ' ' + (v.color||'') + ' ' + (v.model||''), inline: true },
    { name: 'VIN',     value: v.vin     || 'N/A', inline: true },
    { name: 'Flags',   value: v.flags   || 'None',inline: true },
  ], 0x1a6fff));
}

// ─── /fine ────────────────────────────────────────────────────────
async function cmdFine(interaction) {
  const player  = interaction.options.getString('player');
  const amount  = interaction.options.getNumber('amount');
  const reason  = interaction.options.getString('reason');
  const officer = interaction.member?.displayName || interaction.user.username;

  const srvId = await getFirstServerId();
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const fine = {
    id: Date.now(), name: player, amount,
    reason, officer, status: 'Unpaid',
    issuedAt: new Date().toISOString()
  };
  await fbPush('servers/' + srvId + '/fines', fine);

  return interaction.reply(successEmbed('Fine Issued', [
    { name: 'Player',  value: player,                 inline: true },
    { name: 'Amount',  value: '$' + amount.toLocaleString(), inline: true },
    { name: 'Reason',  value: reason,                 inline: true },
    { name: 'Officer', value: officer,                inline: true },
    { name: 'Status',  value: 'Unpaid',               inline: true },
  ], 0xff8800));
}

// ─── /pay ─────────────────────────────────────────────────────────
async function cmdPay(interaction) {
  const player = interaction.options.getString('player');
  const { srvId, entries } = await getServerEntries('fines');
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const entry = entries.find(([k,v]) =>
    v.name?.toLowerCase() === player.toLowerCase() && v.status === 'Unpaid'
  );
  if (!entry) return interaction.reply(errorEmbed('No unpaid fines found for **' + player + '**'));

  const [key, fine] = entry;
  fine.status = 'Paid';
  fine.paidAt = new Date().toISOString();
  await fbSet('servers/' + srvId + '/fines/' + key, fine);

  return interaction.reply(successEmbed('Fine Paid', [
    { name: 'Player', value: player,                          inline: true },
    { name: 'Amount', value: '$' + fine.amount.toLocaleString(), inline: true },
    { name: 'Reason', value: fine.reason,                    inline: true },
    { name: 'Status', value: 'Paid',                         inline: true },
  ], 0x00cc66));
}

// ─── /balance ─────────────────────────────────────────────────────
async function cmdBalance(interaction) {
  const player = interaction.options.getString('player');
  const srvId  = await getFirstServerId();
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const balData   = await fbGet('servers/' + srvId + '/balances');
  const bals      = balData ? Object.values(balData) : [];
  const bal       = bals.find(b => b.name?.toLowerCase() === player.toLowerCase());

  const finesData = await fbGet('servers/' + srvId + '/fines');
  const fines     = finesData ? Object.values(finesData) : [];
  const unpaid    = fines.filter(f => f.name?.toLowerCase() === player.toLowerCase() && f.status === 'Unpaid');
  const unpaidTotal = unpaid.reduce((a,f) => a + (f.amount||0), 0);

  return interaction.reply(successEmbed('Balance Check', [
    { name: 'Player',       value: player,                                  inline: true },
    { name: 'Bank Balance', value: '$' + (bal?.amount||0).toLocaleString(), inline: true },
    { name: 'Unpaid Fines', value: '$' + unpaidTotal.toLocaleString(),      inline: true },
    { name: 'Fine Count',   value: String(unpaid.length),                   inline: true },
  ], 0x00cc66));
}

// ─── /dispatch ────────────────────────────────────────────────────
async function cmdDispatch(interaction) {
  const title    = interaction.options.getString('title');
  const location = interaction.options.getString('location');
  const priority = interaction.options.getString('priority') || 'Medium';

  const srvId = await getFirstServerId();
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const call = {
    id: Date.now(), title, location, priority,
    code: 'Discord Dispatch', status: 'Pending',
    assignedUnitId: null, assignedCallsign: null,
    notes: [{ ts: new Date().toISOString(), text: 'Dispatched via Discord by ' + interaction.user.username }],
    createdAt: new Date().toISOString(), closedAt: null
  };
  await fbPush('servers/' + srvId + '/calls', call);

  const prioColors = { High: 0xff2020, Medium: 0xffaa00, Low: 0x00cc66 };
  return interaction.reply(successEmbed('Call Dispatched', [
    { name: 'Call',     value: title,    inline: true },
    { name: 'Location', value: location, inline: true },
    { name: 'Priority', value: priority, inline: true },
    { name: 'Status',   value: 'Pending',inline: true },
  ], prioColors[priority] || 0xffaa00));
}

// ─── /status ─────────────────────────────────────────────────────
async function cmdStatus(interaction) {
  const callsign = interaction.options.getString('callsign');
  const status   = interaction.options.getString('status');

  const { srvId, entries } = await getServerEntries('units');
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const entry = entries.find(([k,v]) => v.callsign?.toLowerCase() === callsign.toLowerCase());
  if (!entry) return interaction.reply(errorEmbed('Unit **' + callsign + '** not found.'));

  const [key, unit] = entry;
  unit.status = status;
  await fbSet('servers/' + srvId + '/units/' + key, unit);

  const statusColors = { '10-8':0x00cc66, '10-7':0x888888, 'Busy':0xffaa00, 'On Scene':0x1a6fff, 'En Route':0x1a6fff };
  return interaction.reply(successEmbed('Unit Status Updated', [
    { name: 'Callsign',   value: callsign,          inline: true },
    { name: 'Officer',    value: unit.name || 'N/A',inline: true },
    { name: 'New Status', value: status,            inline: true },
    { name: 'Department', value: unit.department||'N/A', inline: true },
  ], statusColors[status] || 0xcc0000));
}

// ─── /bolo ────────────────────────────────────────────────────────
async function cmdBolo(interaction) {
  const subject     = interaction.options.getString('subject');
  const description = interaction.options.getString('description') || 'No description provided';

  const srvId = await getFirstServerId();
  if (!srvId) return interaction.reply(errorEmbed('No active server found.'));

  const bolo = {
    id: Date.now(), subject, type: 'Person',
    description, active: true,
    issuedAt: new Date().toISOString()
  };
  await fbPush('servers/' + srvId + '/bolos', bolo);

  return interaction.reply(successEmbed('BOLO Issued', [
    { name: 'Subject',     value: subject,     inline: true },
    { name: 'Description', value: description, inline: false },
    { name: 'Status',      value: 'ACTIVE',    inline: true },
  ], 0xff8800));
}

// ─── /units ───────────────────────────────────────────────────────
async function cmdUnits(interaction) {
  const units     = await getServerData('units');
  if (!units.length) return interaction.reply(errorEmbed('No units on duty.'));

  const available = units.filter(u => u.status === '10-8');
  const busy      = units.filter(u => ['Busy','On Scene','En Route'].includes(u.status));
  const offline   = units.filter(u => u.status === '10-7');
  const fmt       = arr => arr.length ? arr.map(u => u.callsign + ' — ' + u.name).join('\n') : 'None';

  return interaction.reply(successEmbed('Active Units', [
    { name: '10-8 Available (' + available.length + ')', value: fmt(available), inline: false },
    { name: 'Busy / On Scene (' + busy.length + ')',     value: fmt(busy),      inline: false },
    { name: '10-7 Offline (' + offline.length + ')',     value: fmt(offline),   inline: false },
  ], 0x1a6fff));
}

// ─── /calls ───────────────────────────────────────────────────────
async function cmdCalls(interaction) {
  const calls  = await getServerData('calls');
  const active = calls.filter(c => c.status !== 'Closed');

  if (!active.length) {
    return interaction.reply({ embeds: [{ title: 'Active Calls', color: 0x00cc66, description: 'No active calls.', footer: { text: 'RedLineCAD' } }], ephemeral: true });
  }

  const fields = active.slice(0, 10).map(c => ({
    name:  '[' + (c.priority||'Med') + '] ' + c.title,
    value: 'Location: ' + c.location + '\nUnit: ' + (c.assignedCallsign||'Unassigned') + ' • ' + c.status,
    inline: false
  }));

  return interaction.reply(successEmbed('Active Calls (' + active.length + ')', fields, 0xcc0000));
}

// ─── /help ────────────────────────────────────────────────────────
async function cmdHelp(interaction) {
  return interaction.reply(successEmbed('RedLineCAD Bot Commands', [
    { name: '/civilian name:',                  value: 'Look up a civilian record',     inline: false },
    { name: '/plate plate:',                    value: 'Look up vehicle by plate',      inline: false },
    { name: '/fine player: amount: reason:',    value: 'Issue a fine to a player',      inline: false },
    { name: '/pay player: amount:',             value: 'Mark a fine as paid',           inline: false },
    { name: '/balance player:',                 value: 'Check a player bank balance',   inline: false },
    { name: '/dispatch title: location: priority:', value: 'Create a dispatch call',    inline: false },
    { name: '/status callsign: status:',        value: 'Update a unit status',          inline: false },
    { name: '/bolo subject: description:',      value: 'Issue a BOLO',                 inline: false },
    { name: '/units',                           value: 'View all active units',         inline: false },
    { name: '/calls',                           value: 'View all active calls',         inline: false },
  ], 0xcc0000));
}

module.exports = {
  cmdCivilian, cmdPlate, cmdFine, cmdPay, cmdBalance,
  cmdDispatch, cmdStatus, cmdBolo, cmdUnits, cmdCalls, cmdHelp
};
