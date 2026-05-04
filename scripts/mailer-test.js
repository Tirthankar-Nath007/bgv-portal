const nodemailer = require("nodemailer");

async function testSMTP() {
  const transporter = nodemailer.createTransport({
    host: "10.221.0.18",
    port: 25,
    secure: false, // port 25 → no TLS by default
    tls: {
      rejectUnauthorized: false // helpful for internal servers
    }
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    // Send test mail
    const info = await transporter.sendMail({
      from: "exitsupport-UAT@tvscredit.com",
      to: "Tirthankar.Nath@tvscredit.com", // change this
      subject: "SMTP Test Email",
      text: "This is a test email to validate SMTP configuration.",
      html: "<b>This is a test email to validate SMTP configuration.</b>"
    });

    console.log("✅ Email sent successfully");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ SMTP test failed");
    console.error(error);
  }
}

testSMTP();