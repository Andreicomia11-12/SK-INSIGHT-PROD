const LGBTQProfile = require("../models/LGBTQProfile");

async function autoDeleteOldProfiles() {
  const cutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await LGBTQProfile.deleteMany({ isDeleted: true, deletedAt: { $lte: cutoff } });
}

module.exports = autoDeleteOldProfiles;