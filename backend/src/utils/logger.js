const log = (type, msg) => {
  console.log(`[${type}] ${msg}`);
};

const errorLog = (type, msg, err) => {
  console.error(`[${type}] ❌ ${msg}`, err ? err.message || err : '');
};

module.exports = { log, errorLog };
