require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('='.repeat(50));
  console.log('📧 Testing Email Configuration');
  console.log('='.repeat(50));
  console.log('\nCurrent settings:');
  console.log('HOST:', process.env.EMAIL_HOST);
  console.log('PORT:', process.env.EMAIL_PORT);
  console.log('USER:', process.env.EMAIL_USER);
  console.log('PASSWORD:', process.env.EMAIL_PASSWORD ? 
    `${process.env.EMAIL_PASSWORD.substring(0, 4)}****${process.env.EMAIL_PASSWORD.substring(process.env.EMAIL_PASSWORD.length - 4)} (${process.env.EMAIL_PASSWORD.length} chars)` : 
    '❌ NOT SET');
  console.log('FROM:', process.env.EMAIL_FROM);
  console.log('\n');

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  try {
    // Verify connection
    console.log('Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('Step 2: Sending test email...');
    const testEmail = process.env.EMAIL_USER; // Send to yourself
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: testEmail,
      subject: '✅ Congressional Award Tracker - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #28a745;">✅ Email Test Successful!</h2>
          <p>If you received this email, your email configuration is working correctly.</p>
          <hr>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.EMAIL_HOST}</li>
            <li>Port: ${process.env.EMAIL_PORT}</li>
            <li>From: ${process.env.EMAIL_USER}</li>
            <li>Time: ${new Date().toLocaleString()}</li>
          </ul>
          <hr>
          <p style="color: #666;">This is a test email from Congressional Award Tracker system.</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log(`\n📬 Check your inbox: ${testEmail}`);
    console.log('(Also check Spam/Junk folder if not in inbox)\n');
    console.log('='.repeat(50));
    console.log('✅ Email service is working correctly!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    
    if (error.message.includes('Invalid login')) {
      console.error('❌ Wrong password or username');
      console.error('   → Use Gmail app-specific password');
      console.error('   → Enable 2-Factor Authentication first');
      console.error('   → Generate password at: https://myaccount.google.com/apppasswords');
    } else if (error.message.includes('timeout')) {
      console.error('❌ Connection timeout');
      console.error('   → Check firewall settings');
      console.error('   → Try port 465 with secure:true');
    } else {
      console.error('❌ Other error - check configuration');
    }
    
    console.error('\n' + '='.repeat(50));
  }
}

testEmail();