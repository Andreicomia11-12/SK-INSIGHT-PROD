const sendEmail = require("./sendEmail");

module.exports = async function sendRejectionEmail({
  to,
  username,
  rejectionReason,
}) {
  const subject = "Educational Assistance Application Rejected";
  const html = `
    <p>Dear ${username},</p>
    <p>Your application for Educational Assistance has been <b>rejected</b> for the following reason:</p>
    <blockquote>${rejectionReason}</blockquote>
    <p>If you have questions, please contact us.</p>
  `;
  await sendEmail(to, subject, html);
};
