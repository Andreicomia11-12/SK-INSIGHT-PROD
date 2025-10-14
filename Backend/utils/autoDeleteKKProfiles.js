const KKProfile = require("../models/KKProfile");

async function autoDeleteOldProfiles() {
  const cutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await KKProfile.deleteMany({ isDeleted: true, deletedAt: { $lte: cutoff } });
}

module.exports = autoDeleteOldProfiles;