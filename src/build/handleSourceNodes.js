const factory = require('../api/factory');

module.exports = async () => {
  const API = factory.inst();
  await API.build();
};